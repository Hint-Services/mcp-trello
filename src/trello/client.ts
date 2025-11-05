import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios, { type AxiosInstance } from "axios";
import { z } from "zod";

import { createTrelloRateLimiters } from "./rate-limiter.js";
import type { TrelloConfig } from "./types.js";

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;

  constructor(private config: TrelloConfig) {
    this.axiosInstance = axios.create({
      baseURL: "https://api.trello.com/1",
      params: {
        key: config.apiKey,
        token: config.token,
      },
    });

    this.rateLimiter = createTrelloRateLimiters();

    // Add rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitForAvailable();
      return config;
    });
  }

  private checkCredentials() {
    if (!this.config.apiKey || !this.config.token) {
      throw new Error(
        "Trello credentials not configured. Please set TRELLO_API_KEY and TRELLO_TOKEN environment variables or provide them in the config. Get your API key from https://trello.com/app-key"
      );
    }
  }

  private async handleRequest<T>(request: () => Promise<T>): Promise<T> {
    this.checkCredentials();
    try {
      return await request();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.handleRequest(request);
        }
        throw new Error(
          `Trello API error: ${error.response?.data?.message ?? error.message}`
        );
      }
      throw error;
    }
  }

  registerTrelloResources(server: McpServer) {
    // Resource for board lists
    server.resource(
      "Board Lists",
      `trello://board/${this.config.boardId}/lists`,
      { mimeType: "application/json", description: "All lists on the board" },
      async () => {
        const lists = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.config.boardId}/lists`
          );
          return response.data;
        });
        return {
          contents: [
            {
              uri: `trello://board/${this.config.boardId}/lists`,
              mimeType: "application/json",
              text: JSON.stringify(lists, null, 2),
            },
          ],
        };
      }
    );

    // Resource for my cards
    server.resource(
      "My Cards",
      "trello://me/cards",
      {
        mimeType: "application/json",
        description: "Cards assigned to the authenticated user",
      },
      async () => {
        const cards = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get("/members/me/cards");
          return response.data;
        });
        return {
          contents: [
            {
              uri: "trello://me/cards",
              mimeType: "application/json",
              text: JSON.stringify(cards, null, 2),
            },
          ],
        };
      }
    );

    // Resource for recent activity
    server.resource(
      "Recent Activity",
      `trello://board/${this.config.boardId}/activity`,
      {
        mimeType: "application/json",
        description: "Recent activity on the board",
      },
      async () => {
        const activity = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.config.boardId}/actions`,
            { params: { limit: 50 } }
          );
          return response.data;
        });
        return {
          contents: [
            {
              uri: `trello://board/${this.config.boardId}/activity`,
              mimeType: "application/json",
              text: JSON.stringify(activity, null, 2),
            },
          ],
        };
      }
    );
  }

  registerTrelloPrompts(server: McpServer) {
    server.prompt(
      "create-task",
      "Create a new Trello task/card with details",
      {
        taskName: z.string().describe("The name/title of the task"),
        listName: z.string().optional().describe("The name of the list (optional)"),
      },
      async ({ taskName, listName }) => {
        const promptText = listName
          ? `Create a new Trello card titled "${taskName}" in the "${listName}" list. Please use the getLists tool to find the correct list ID, then use addCard to create the card.`
          : `Create a new Trello card titled "${taskName}". Please use the getLists tool to find available lists, then use addCard to create the card in an appropriate list.`;

        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: promptText,
              },
            },
          ],
        };
      }
    );

    server.prompt(
      "board-status",
      "Get an overview of the current board status",
      {},
      async () => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please provide a comprehensive overview of the Trello board. Use getLists to see all lists, then getCardsByList for each list to show cards. Also use getRecentActivity to show recent changes.",
              },
            },
          ],
        };
      }
    );

    server.prompt(
      "my-tasks",
      "View all tasks assigned to me",
      {},
      async () => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: "Please show all Trello cards assigned to me using the getMyCards tool. Organize them by due date and highlight any overdue items.",
              },
            },
          ],
        };
      }
    );
  }

  registerTrelloTools(server: McpServer) {
    server.tool(
      "getCardsByList",
      "Get cards by list ID",
      {
        listId: z.string().describe("The ID of the Trello list to get cards from"),
      },
      { readOnlyHint: true },
      async ({ listId }) => {
        const cards = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/lists/${listId}/cards`
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(cards) }],
        };
      }
    );

    server.tool(
      "getLists",
      "Get all lists from the configured board",
      {},
      { readOnlyHint: true },
      async () => {
        const lists = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.config.boardId}/lists`
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(lists) }],
        };
      }
    );

    server.tool(
      "getRecentActivity",
      "Get recent activity from the configured board",
      {
        limit: z
          .number()
          .optional()
          .describe("Maximum number of activity items to return (default: 10)"),
      },
      { readOnlyHint: true },
      async ({ limit = 10 }) => {
        const activity = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.config.boardId}/actions`,
            {
              params: { limit },
            }
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(activity) }],
        };
      }
    );

    server.tool(
      "addCard",
      "Add a new card to a list",
      {
        listId: z.string().describe("The ID of the list to add the card to"),
        name: z.string().describe("The name/title of the card"),
        description: z
          .string()
          .optional()
          .describe("The description/details of the card (optional)"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in ISO 8601 format (e.g., 2024-12-31T23:59:59Z)"),
        labels: z
          .array(z.string())
          .optional()
          .describe("Array of label IDs to add to the card"),
      },
      { destructiveHint: false, idempotentHint: false },
      async ({ listId, name, description, dueDate, labels }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.post("/cards", {
            idList: listId,
            name,
            desc: description,
            due: dueDate,
            idLabels: labels,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card) }],
        };
      }
    );

    server.tool(
      "updateCard",
      "Update an existing card",
      {
        cardId: z.string().describe("The ID of the card to update"),
        name: z.string().optional().describe("New name/title for the card"),
        description: z
          .string()
          .optional()
          .describe("New description/details for the card"),
        labels: z
          .array(z.string())
          .optional()
          .describe("Array of label IDs to set on the card"),
        position: z
          .string()
          .optional()
          .describe("New position: 'top', 'bottom', or a positive number"),
        dueDate: z
          .string()
          .optional()
          .describe("New due date in ISO 8601 format"),
        startDate: z
          .string()
          .optional()
          .describe("New start date in ISO 8601 format"),
      },
      { destructiveHint: false, idempotentHint: true },
      async ({
        cardId,
        name,
        description,
        dueDate,
        labels,
        position,
        startDate,
      }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(`/cards/${cardId}`, {
            name,
            desc: description,
            idLabels: labels,
            pos: position,
            due: dueDate,
            start: startDate,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card) }],
        };
      }
    );

    server.tool(
      "moveCard",
      "Move a card to a different list",
      {
        cardId: z.string().describe("The ID of the card to move"),
        listId: z.string().describe("The ID of the destination list"),
        boardId: z
          .string()
          .optional()
          .describe("The ID of the destination board (if moving to a different board)"),
      },
      { destructiveHint: false, idempotentHint: true },
      async ({ cardId, listId, boardId }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(`/cards/${cardId}`, {
            idList: listId,
            idBoard: boardId,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card) }],
        };
      }
    );

    server.tool(
      "changeCardMembers",
      "Change the members of a card",
      {
        cardId: z.string().describe("The ID of the card to modify"),
        members: z
          .array(z.string())
          .describe("Array of member IDs to assign to the card"),
      },
      { destructiveHint: false, idempotentHint: true },
      async ({ cardId, members }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(`/cards/${cardId}`, {
            idMembers: members.join(","), // comma-separated list of member IDs
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card) }],
        };
      }
    );

    server.tool(
      "archiveCard",
      "Archive a card",
      {
        cardId: z.string().describe("The ID of the card to archive"),
      },
      { destructiveHint: true, idempotentHint: true },
      async ({ cardId }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(`/cards/${cardId}`, {
            closed: true,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card) }],
        };
      }
    );

    server.tool(
      "addList",
      "Add a new list to the configured board",
      {
        name: z.string().describe("The name of the new list"),
      },
      { destructiveHint: false, idempotentHint: false },
      async ({ name }) => {
        const list = await this.handleRequest(async () => {
          const response = await this.axiosInstance.post("/lists", {
            name,
            idBoard: this.config.boardId,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(list) }],
        };
      }
    );

    server.tool(
      "archiveList",
      "Archive a list",
      {
        listId: z.string().describe("The ID of the list to archive"),
      },
      { destructiveHint: true, idempotentHint: true },
      async ({ listId }) => {
        const list = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(
            `/lists/${listId}/closed`,
            {
              value: true,
            }
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(list) }],
        };
      }
    );

    server.tool(
      "getMyCards",
      "Get cards assigned to the authenticated user",
      {},
      { readOnlyHint: true },
      async () => {
        const cards = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get("/members/me/cards");
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(cards) }],
        };
      }
    );
  }
}
