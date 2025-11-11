/**
 * MCP Server for Trello Integration
 *
 * This is a Model Context Protocol (MCP) server that provides tools for interacting with Trello.
 * It supports both stdio and HTTP streaming interfaces.
 *
 * For more information about MCP, visit:
 * https://modelcontextprotocol.io
 */

import { fileURLToPath } from "node:url";
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
  const server = new McpServer({
    name: "mcp-trello",
    version: "0.3.1",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
      streaming: true,
    },
  });

  // Create TrelloClient with provided config
  const trelloClient = new TrelloClient(config);

  // Register Trello tools, resources, and prompts
  try {
    trelloClient.registerTrelloResources(server);
    trelloClient.registerTrelloTools(server);
    trelloClient.registerTrelloPrompts(server);
    console.error("[INFO] Successfully registered all Trello tools");
  } catch (error) {
    console.error(
      `[ERROR] Failed to register tools: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }

  return server;
}

// Main function for stdio interface (backwards compatibility)
async function main() {
  // Config will automatically use environment variables
  const server = createServer();

  try {
    // Set up communication with the MCP host using stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("[INFO] MCP Server started successfully");
    console.error("MCP Server running on stdio transport");
  } catch (error) {
    console.error(
      `[ERROR] Failed to start server: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    process.exit(1);
  }
}

// Only run main if this file is executed directly (not imported as a module)
// This allows HTTP servers to import createServer without requiring env vars
// When run via npx or as a binary, process.argv[1] should match this file
const isMainModule = (() => {
  if (!process.argv[1]) return false;

  try {
    const currentFile = fileURLToPath(import.meta.url);
    const execFile = process.argv[1];

    // Normalize paths for comparison
    const normalizePath = (p: string) => p.replace(/\\/g, "/");
    const normalizedCurrent = normalizePath(currentFile);
    const normalizedExec = normalizePath(execFile);

    // Check exact match or if execFile contains the filename
    return (
      normalizedCurrent === normalizedExec ||
      normalizedExec.endsWith("/index.js") ||
      normalizedExec.includes("mcp-trello")
    );
  } catch {
    // Fallback: if execFile contains index.js or mcp-trello, assume main module
    return (
      process.argv[1].includes("index.js") ||
      process.argv[1].includes("mcp-trello")
    );
  }
})();

if (isMainModule) {
  main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
  });
}
