/**
 * MCP Server for Trello Integration
 *
 * This is a Model Context Protocol (MCP) server that provides tools for interacting with Trello.
 * It supports both stdio and HTTP streaming interfaces.
 *
 * For more information about MCP, visit:
 * https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TrelloClient } from "./trello/client.js";

// Configuration schema for HTTP streaming interface
export const configSchema = z.object({
  apiKey: z.string().describe("Trello API key from https://trello.com/app-key"),
  token: z.string().describe("Trello token generated using your API key"),
  boardId: z
    .string()
    .describe("ID of the Trello board to interact with (found in board URL)"),
});

// Factory function for HTTP streaming interface
export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "mcp-trello",
    version: "0.2.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      streaming: true,
    },
  });

  // Initialize Trello client and register tools
  const trelloClient = new TrelloClient(config);
  trelloClient.registerTrelloTools(server);

  return server;
}

/**
 * Helper function to send log messages to the client
 */
function logMessage(level: "info" | "warn" | "error", message: string) {
  console.error(`[${level.toUpperCase()}] ${message}`);
}

// Main function for stdio interface (backwards compatibility)
async function main() {
  // Environment variable validation
  const apiKey = process.env.trelloApiKey;
  const token = process.env.trelloToken;
  const boardId = process.env.trelloBoardId;

  if (!apiKey || !token || !boardId) {
    console.error(
      "Environment variables trelloApiKey, trelloToken, and trelloBoardId are required"
    );
  }

  try {
    const server = createServer({
      config: {
        apiKey: apiKey ?? "",
        token: token ?? "",
        boardId: boardId ?? "",
      },
    });

    // Set up communication with the MCP host using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logMessage("info", "MCP Server started successfully");
    console.error("MCP Server running on stdio transport");
  } catch (error) {
    logMessage(
      "error",
      `Failed to start server: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
