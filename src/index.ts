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
// All fields are optional - can use environment variables as fallbacks
export const configSchema = z
  .object({
    apiKey: z
      .string()
      .optional()
      .describe(
        "Trello API key from https://trello.com/app-key (falls back to TRELLO_API_KEY env var)"
      ),
    token: z
      .string()
      .optional()
      .describe(
        "Trello token generated using your API key (falls back to TRELLO_TOKEN env var)"
      ),
    boardId: z
      .string()
      .optional()
      .describe(
        "ID of the Trello board to interact with (falls back to TRELLO_BOARD_ID env var). Optional for user-specific operations."
      ),
  })
  .default({});

// Factory function for HTTP streaming interface
export default function createServer({
  config = {},
}: {
  config?: z.infer<typeof configSchema>;
} = {}) {
  // Merge config with environment variables (config takes precedence)
  const finalConfig = {
    apiKey: config?.apiKey ?? process.env.TRELLO_API_KEY ?? "",
    token: config?.token ?? process.env.TRELLO_TOKEN ?? "",
    boardId: config?.boardId ?? process.env.TRELLO_BOARD_ID ?? "",
  };

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

  // Initialize Trello client and register resources, tools, and prompts
  const trelloClient = new TrelloClient(finalConfig);
  trelloClient.registerTrelloResources(server);
  trelloClient.registerTrelloTools(server);
  trelloClient.registerTrelloPrompts(server);
  // Must call addToolAnnotations AFTER registering tools (SDK 1.17.4 compatibility)
  (trelloClient as any).addToolAnnotations(server);

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
  // Support both old and new environment variable names
  const apiKey =
    process.env.TRELLO_API_KEY ??
    process.env.trelloApiKey ??
    process.env.apiKey;
  const token =
    process.env.TRELLO_TOKEN ?? process.env.trelloToken ?? process.env.token;
  const boardId =
    process.env.TRELLO_BOARD_ID ??
    process.env.trelloBoardId ??
    process.env.boardId;

  if (!apiKey || !token) {
    console.error(
      "Warning: TRELLO_API_KEY and TRELLO_TOKEN environment variables not set. Tools will fail until credentials are provided."
    );
  }

  try {
    const server = createServer({
      config: {
        apiKey,
        token,
        boardId,
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
