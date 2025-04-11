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
        throw new Error(
          `Trello API error: ${error.response?.data?.message ?? error.message}`
        );
      }
      throw error;
    }
  }

  registerTrelloTools(server: McpServer) {
    server.tool(
      "getCardsByList",
      "Get cards by list ID",
      {
        listId: z.string(),
      },
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
        limit: z.number().optional(),
      },
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
        listId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        labels: z.array(z.string()).optional(),
      },
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
        name: z.string().optional(),
        description: z.string().optional(),
        cardId: z.string(),
        labels: z.array(z.string()).optional(),
        position: z.string().optional().describe("top, bottom, or a number"),
        dueDate: z.string().optional(),
        startDate: z.string().optional(),
      },
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
        cardId: z.string(),
        listId: z.string(),
        boardId: z.string().optional(),
      },
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
        cardId: z.string(),
        members: z.array(z.string()),
      },
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
        cardId: z.string(),
      },
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
        name: z.string(),
      },
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
        listId: z.string(),
      },
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
