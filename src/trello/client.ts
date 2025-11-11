import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import axios, { type AxiosInstance } from "axios";
import { z } from "zod";

import { createTrelloRateLimiters } from "./rate-limiter.js";
import type { TrelloConfig } from "./types.js";

export class TrelloClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter;
  private boardId: string | undefined;

  constructor(private config: TrelloConfig) {
    // Use provided credentials or fall back to environment variables
    const apiKey = config.apiKey || process.env.TRELLO_API_KEY;
    const token = config.token || process.env.TRELLO_TOKEN;
    this.boardId = config.boardId || process.env.TRELLO_BOARD_ID;

    if (!apiKey || !token) {
      throw new Error(
        "Trello credentials are required. Provide them via config or set TRELLO_API_KEY and TRELLO_TOKEN environment variables. " +
          "Get your API key from https://trello.com/app-key"
      );
    }

    this.axiosInstance = axios.create({
      baseURL: "https://api.trello.com/1",
      params: {
        key: apiKey,
        token: token,
      },
    });

    this.rateLimiter = createTrelloRateLimiters();

    // Add rate limiting interceptor
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.waitForAvailable();
      return config;
    });
  }

  private async handleRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // Rate limit exceeded, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.handleRequest(request);
        }
        // Include more error details for debugging
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data ||
          error.message;
        const url = error.config?.url || "unknown";
        throw new Error(
          `Trello API error (${error.response?.status}): ${errorMessage} [URL: ${url}]`
        );
      }
      throw error;
    }
  }

  registerTrelloResources(server: McpServer) {
    // Only register board-specific resources if boardId is configured
    if (this.boardId) {
      // Resource for board lists
      server.resource(
        "Board Lists",
        `trello://board/${this.boardId}/lists`,
        { mimeType: "application/json", description: "All lists on the board" },
        async () => {
          const lists = await this.handleRequest(async () => {
            const response = await this.axiosInstance.get(
              `/boards/${this.boardId}/lists`
            );
            return response.data;
          });
          return {
            contents: [
              {
                uri: `trello://board/${this.boardId}/lists`,
                mimeType: "application/json",
                text: JSON.stringify(lists, null, 2),
              },
            ],
          };
        }
      );

      // Resource for recent activity
      server.resource(
        "Recent Activity",
        `trello://board/${this.boardId}/activity`,
        {
          mimeType: "application/json",
          description: "Recent activity on the board",
        },
        async () => {
          const activity = await this.handleRequest(async () => {
            const response = await this.axiosInstance.get(
              `/boards/${this.boardId}/actions`,
              { params: { limit: 50 } }
            );
            return response.data;
          });
          return {
            contents: [
              {
                uri: `trello://board/${this.boardId}/activity`,
                mimeType: "application/json",
                text: JSON.stringify(activity, null, 2),
              },
            ],
          };
        }
      );
    }

    // Resource for my cards (works without boardId)
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
  }

  registerTrelloPrompts(server: McpServer) {
    server.prompt(
      "create-task",
      "Create a new Trello task/card with details",
      {
        taskName: z.string().describe("The name/title of the task"),
        listName: z
          .string()
          .optional()
          .describe("The name of the list (optional)"),
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

    server.prompt("my-tasks", "View all tasks assigned to me", {}, async () => {
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
    });

    server.prompt(
      "card-discussion",
      "View a card with all its comments and discussion",
      {
        cardId: z.string().describe("The ID of the card to view"),
      },
      async ({ cardId }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please retrieve the card "${cardId}" using the getCard tool with includeComments set to true. Show the card details and format all comments in a readable discussion format with timestamps and authors.`,
              },
            },
          ],
        };
      }
    );

    server.prompt(
      "comment-on-card",
      "Add a comment to a specific card",
      {
        cardId: z.string().describe("The ID of the card to comment on"),
        comment: z.string().describe("The comment text to add"),
      },
      async ({ cardId, comment }) => {
        return {
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Please add the following comment to card "${cardId}" using the addComment tool: "${comment}"`,
              },
            },
          ],
        };
      }
    );
  }

  registerTrelloTools(server: McpServer) {
    server.tool(
      "getMyBoards",
      "Get all boards for the authenticated user (useful for finding board IDs)",
      {},
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      async () => {
        const boards = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get("/members/me/boards");
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(boards, null, 2) }],
        };
      }
    );

    server.tool(
      "getCard",
      "Get a specific card by ID with optional comments",
      {
        cardId: z.string().describe("The ID of the card to retrieve"),
        includeComments: z
          .boolean()
          .optional()
          .describe("Whether to include comments on the card (default: false)"),
      },
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      async ({ cardId, includeComments = false }) => {
        const card = await this.handleRequest(async () => {
          const params = includeComments
            ? { actions: "commentCard" }
            : undefined;
          const response = await this.axiosInstance.get(`/cards/${cardId}`, {
            params,
          });
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(card, null, 2) }],
        };
      }
    );

    server.tool(
      "getCardsByList",
      "Get cards by list ID",
      {
        listId: z
          .string()
          .describe("The ID of the Trello list to get cards from"),
      },
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
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
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      async () => {
        const lists = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.boardId}/lists`
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
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      async ({ limit = 10 }) => {
        const activity = await this.handleRequest(async () => {
          const response = await this.axiosInstance.get(
            `/boards/${this.boardId}/actions`,
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
      { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      async ({ listId, name, description, dueDate, labels }) => {
        const card = await this.handleRequest(async () => {
          const response = await this.axiosInstance.post("/cards", null, {
            params: {
              idList: listId,
              name,
              desc: description,
              due: dueDate,
              idLabels: labels?.join(","),
            },
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
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
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
          .describe(
            "The ID of the destination board (if moving to a different board)"
          ),
      },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
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
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
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
      { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
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
      { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      async ({ name }) => {
        if (!this.boardId) {
          throw new Error(
            "Board ID is not configured. Please set TRELLO_BOARD_ID environment variable or provide boardId in the configuration."
          );
        }

        // Validate board ID format (should be 24 characters)
        if (this.boardId.length !== 24) {
          throw new Error(
            `Invalid board ID format: "${this.boardId}" (${this.boardId.length} characters). Trello board IDs must be 24 characters long. If you're using the short URL (like 'HIhpH6Zp'), please use the getMyBoards tool to find the full board ID.`
          );
        }

        const list = await this.handleRequest(async () => {
          const response = await this.axiosInstance.post("/lists", null, {
            params: {
              name,
              idBoard: this.boardId,
            },
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
      { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
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
      "addComment",
      "Add a comment to a card",
      {
        cardId: z.string().describe("The ID of the card to comment on"),
        text: z.string().describe("The text content of the comment"),
      },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      async ({ cardId, text }) => {
        const comment = await this.handleRequest(async () => {
          const response = await this.axiosInstance.post(
            `/cards/${cardId}/actions/comments`,
            null,
            { params: { text } }
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(comment, null, 2) }],
        };
      }
    );

    server.tool(
      "updateComment",
      "Update the text of an existing comment",
      {
        cardId: z.string().describe("The ID of the card"),
        commentId: z
          .string()
          .describe("The ID of the comment action to update"),
        text: z.string().describe("The new text content for the comment"),
      },
      { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      async ({ cardId, commentId, text }) => {
        const comment = await this.handleRequest(async () => {
          const response = await this.axiosInstance.put(
            `/cards/${cardId}/actions/${commentId}/comments`,
            null,
            { params: { text } }
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(comment, null, 2) }],
        };
      }
    );

    server.tool(
      "deleteComment",
      "Delete a comment from a card",
      {
        cardId: z.string().describe("The ID of the card"),
        commentId: z
          .string()
          .describe("The ID of the comment action to delete"),
      },
      { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
      async ({ cardId, commentId }) => {
        const result = await this.handleRequest(async () => {
          const response = await this.axiosInstance.delete(
            `/cards/${cardId}/actions/${commentId}/comments`
          );
          return response.data;
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
    );

    server.tool(
      "getMyCards",
      "Get cards assigned to the authenticated user",
      {},
      { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
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
