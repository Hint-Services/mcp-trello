---
title: MCP Trello
description: A Model Context Protocol (MCP) server for interacting with Trello boards
---

# MCP Trello

A Model Context Protocol (MCP) server that provides tools for interacting with Trello boards. This server enables seamless integration with Trello's API while handling rate limiting, type safety, and error handling automatically.

## Features

- **Full Trello Board Integration**: Interact with cards, lists, and board activities
- **Built-in Rate Limiting**: Respects Trello's API limits (300 requests/10s per API key, 100 requests/10s per token)
- **Type-Safe Implementation**: Written in TypeScript with comprehensive type definitions
- **Input Validation**: Robust validation for all API inputs using Zod schemas
- **Error Handling**: Graceful error handling with informative messages

## Installation

### Using Smithery

The easiest way to install MCP Trello is using Smithery:

```bash
# For Claude
npx -y @smithery/cli install @HintServices/mcp-trello --client claude

# For Cursor
npx -y @smithery/cli install @HintServices/mcp-trello --client cursor

# For Windsurf
npx -y @smithery/cli install @HintServices/mcp-trello --client windsurf

# For Cline
npx -y @smithery/cli install @HintServices/mcp-trello --client cline

# For TypeScript
npx -y @smithery/cli install @HintServices/mcp-trello --client typescript
```

### Manual Installation

```bash
pnpm add @HintServices/mcp-trello
```

## Configuration

Add the server to your MCP settings file with the following configuration:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@HintServices/mcp-trello"],
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

## Available Tools

### getCardsByList

Fetch all cards from a specific list.

```typescript
{
  name: 'getCardsByList',
  arguments: {
    listId: string  // ID of the Trello list
  }
}
```

### getLists

Retrieve all lists from the configured board.

```typescript
{
  name: 'getLists',
  arguments: {}
}
```

### getRecentActivity

Fetch recent activity on the board.

```typescript
{
  name: 'getRecentActivity',
  arguments: {
    limit?: number  // Optional: Number of activities to fetch (default: 10)
  }
}
```

### addCard

Add a new card to a specified list.

```typescript
{
  name: 'addCard',
  arguments: {
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
    dueDate?: string,     // Optional: Due date (ISO 8601 format)
    labels?: string[]     // Optional: Array of label IDs
  }
}
```

### updateCard

Update an existing card's details.

```typescript
{
  name: 'updateCard',
  arguments: {
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,     // Optional: New due date (ISO 8601 format)
    startDate?: string,   // Optional: Start date (ISO 8601 format)
    labels?: string[],    // Optional: New array of label IDs
    position?: string     // Optional: Card position ('top', 'bottom', or a number)
  }
}
```

### moveCard

Move a card to a different list or board.

```typescript
{
  name: 'moveCard',
  arguments: {
    cardId: string,     // ID of the card to move
    listId: string,     // ID of the destination list
    boardId?: string    // Optional: ID of the destination board
  }
}
```

### changeCardMembers

Add or remove members from a card.

```typescript
{
  name: 'changeCardMembers',
  arguments: {
    cardId: string,    // ID of the card
    members: string[]  // Array of member IDs to assign to the card
  }
}
```

### archiveCard

Send a card to the archive.

```typescript
{
  name: 'archiveCard',
  arguments: {
    cardId: string  // ID of the card to archive
  }
}
```

### addList

Add a new list to the board.

```typescript
{
  name: 'addList',
  arguments: {
    name: string  // Name of the new list
  }
}
```

### archiveList

Send a list to the archive.

```typescript
{
  name: 'archiveList',
  arguments: {
    listId: string  // ID of the list to archive
  }
}
```

### getMyCards

Fetch all cards assigned to the current user.

```typescript
{
  name: 'getMyCards',
  arguments: {}
}
```

## Rate Limiting

The server implements a token bucket algorithm for rate limiting to comply with Trello's API limits:

- 300 requests per 10 seconds per API key
- 100 requests per 10 seconds per token

Rate limiting is handled automatically, and requests will be queued if limits are reached.

## Error Handling

The server provides detailed error messages for various scenarios:

- Invalid input parameters
- Rate limit exceeded
- API authentication errors
- Network issues
- Invalid board/list/card IDs

## Development

### Prerequisites

- Node.js v18 or higher
- pnpm v7 or higher

### Setup

1. Clone the repository

```bash
git clone https://github.com/HintServices/mcp-trello.git
cd mcp-trello
```

2. Install dependencies

```bash
pnpm install
```

3. Build the project

```bash
pnpm run build
```

### Running in Development Mode

```bash
pnpm run watch
```

### Running with Debugging

```bash
pnpm run inspector
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)
