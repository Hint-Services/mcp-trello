[![smithery badge](https://smithery.ai/badge/@Hint-Services/mcp-trello)](https://smithery.ai/server/@Hint-Services/mcp-trello)

# MCP Trello

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

## Features

- **Full Trello Board Integration**: Interact with cards, lists, and board activities
- **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)
- **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions
- **Input Validation**: Robust validation for all API inputs using Zod schemas
- **Error Handling**: Graceful error handling with informative messages

## Core Components

- **MCP Servers**: These servers act as bridges, exposing APIs, databases, and code libraries to external AI hosts. By implementing an MCP server in TypeScript, developers can share data sources or computational logic in a standardized way using JSON-RPC 2.0.
- **MCP Clients**: These are the consumer-facing side of MCP, communicating with servers to query data or perform actions. MCP clients use TypeScript SDKs, ensuring type-safe interactions and uniform approach to tool usage.
- **MCP Hosts**: Systems such as Claude, Cursor, Windsurf, Cline, and other TypeScript-based platforms coordinate requests between servers and clients, ensuring seamless data flow. A single MCP server can thus be accessed by multiple AI hosts without custom integrations.

## Available Tools

MCP Trello provides the following tools for interacting with Trello:

### Card Management

- **getCardsByList**: Fetch all cards from a specific list
- **getMyCards**: Fetch all cards assigned to the current user
- **addCard**: Add a new card to a specified list
- **updateCard**: Update an existing card's details (name, description, due dates, labels, position)
- **moveCard**: Move a card to a different list or board
- **archiveCard**: Send a card to the archive
- **changeCardMembers**: Add or remove members from a card

### List Management

- **getLists**: Retrieve all lists from the configured board
- **addList**: Add a new list to the board
- **archiveList**: Send a list to the archive

### Board Information

- **getRecentActivity**: Fetch recent activity on the board

## Project Structure

```
mcp-trello/
├── src/
│   ├── index.ts          # Main entry point
│   └── trello/           # Trello API integration
│       ├── client.ts     # Trello client implementation
│       ├── rate-limiter.ts # Rate limiting functionality
│       └── types.ts      # TypeScript type definitions
├── docs/                 # Documentation
├── package.json          # Project configuration
└── tsconfig.json         # TypeScript configuration
```

## Installation

### Using Smithery

The easiest way to install MCP Trello is using Smithery:

```bash
# For Claude
npx -y @smithery/cli install @Hint-Services/mcp-trello --client claude

# For Cursor
npx -y @smithery/cli install @Hint-Services/mcp-trello --client cursor

# For Windsurf
npx -y @smithery/cli install @Hint-Services/mcp-trello --client windsurf

# For Cline
npx -y @smithery/cli install @Hint-Services/mcp-trello --client cline

# For TypeScript
npx -y @smithery/cli install @Hint-Services/mcp-trello --client typescript
```

### Manual Installation

```bash
pnpm add @Hint-Services/mcp-trello
```

## Configuration

Add the server to your MCP settings file with the following configuration:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@Hint-Services/mcp-trello"],
      "env": {
        "trelloApiKey": "your-api-key",
        "trelloToken": "your-token",
        "trelloBoardId": "your-board-id"
      }
    }
  }
}
```

### Required Environment Variables

- `trelloApiKey`: Your Trello API key (get from https://trello.com/app-key)
- `trelloToken`: Your Trello token (generate using your API key)
- `trelloBoardId`: ID of the Trello board to interact with (found in board URL)

## For Developers

If you're interested in contributing to this project or developing your own tools with this server, please see the [Development Guide](docs/development.md).

## Learn More

For further information on the MCP ecosystem, refer to:

- [Model Context Protocol Documentation](https://modelcontextprotocol.io): Detailed coverage of MCP architecture, design principles, and more advanced usage examples.
- [Smithery - MCP Server Registry](https://smithery.ai/docs): Guidelines for publishing your tools to Smithery and best practices for their registry.
- [MCP TypeScript SDK Documentation](https://modelcontextprotocol.io/typescript): Comprehensive documentation of the TypeScript SDK.
- [MCP Security Guidelines](https://modelcontextprotocol.io/security): Detailed security best practices and recommendations.

## About Hint Services

> "The future is already here, it's just unevenly distributed"
>
> - William Gibson, Author

Hint Services is a boutique consultancy with a mission to develop and expand how user interfaces leverage artificial intelligence technology. We architect ambition at the intersection of AI and User Experience, founded and led by Ben Hofferber.

We offer specialized AI workshops for design teams looking to embrace AI tools without becoming developers. [Learn more about our training and workshops](https://hint.services/training-workshops).
