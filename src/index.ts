/**
 * MCP Server Starter Template
 *
 * This is a reference implementation of a Model Context Protocol (MCP) server.
 * It demonstrates best practices for:
 * - Server initialization and configuration
 * - Tool registration and management
 * - Error handling and logging
 * - Resource cleanup
 *
 * For more information about MCP, visit:
 * https://modelcontextprotocol.io
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TrelloClient } from "./trello/client.js";

const apiKey = process.env.trelloApiKey;
const token = process.env.trelloToken;
const boardId = process.env.trelloBoardId;

if (!apiKey || !token || !boardId) {
  throw new Error(
    "env trelloApiKey, trelloToken, and trelloBoardId environment variables are required"
  );
}

const trelloClient = new TrelloClient({ apiKey, token, boardId });

/**
 * Create a new MCP server instance with full capabilities
 */
const server = new McpServer({
  name: "mcp-trello",
  version: "0.1.1",
  capabilities: {
    tools: {},
    resources: {},
    prompts: {},
    streaming: true,
  },
});

/**
 * Helper function to send log messages to the client
 */
function logMessage(level: "info" | "warn" | "error", message: string) {
  console.error(`[${level.toUpperCase()}] ${message}`);
}

/**
 * Set up error handling for the server
 */
process.on("uncaughtException", (error: Error) => {
  logMessage("error", `Uncaught error: ${error.message}`);
  console.error("Server error:", error);
});

// Register example tools
try {
  trelloClient.registerTrelloTools(server);
  logMessage("info", "Successfully registered all tools");
} catch (error) {
  logMessage(
    "error",
    `Failed to register tools: ${
      error instanceof Error ? error.message : "Unknown error"
    }`
  );
  process.exit(1);
}

/**
 * Set up proper cleanup on process termination
 */
async function cleanup() {
  try {
    await server.close();
    logMessage("info", "Server shutdown completed");
  } catch (error) {
    logMessage(
      "error",
      `Error during shutdown: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    process.exit(0);
  }
}

// Handle termination signals
process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

/**
 * Main server startup function
 */
async function main() {
  try {
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

// Start the server
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
