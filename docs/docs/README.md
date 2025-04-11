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
npm install @HintServices/mcp-trello
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
        "TRELLO_API_KEY": "your-api-key",
        "TRELLO_TOKEN": "your-token",
        "TRELLO_BOARD_ID": "your-board-id"
      }
    }
  }
}
```

### Required Environment Variables

- `TRELLO_API_KEY`: Your Trello API key (get from https://trello.com/app-key)
- `TRELLO_TOKEN`: Your Trello token (generate using your API key)
- `TRELLO_BOARD_ID`: ID of the Trello board to interact with (found in board URL)

## Available Tools

### get_cards_by_list_id
Fetch all cards from a specific list.

```typescript
{
  name: 'get_cards_by_list_id',
  arguments: {
    listId: string  // ID of the Trello list
  }
}
```

### get_lists
Retrieve all lists from the configured board.

```typescript
{
  name: 'get_lists',
  arguments: {}
}
```

### get_recent_activity
Fetch recent activity on the board.

```typescript
{
  name: 'get_recent_activity',
  arguments: {
    limit?: number  // Optional: Number of activities to fetch (default: 10)
  }
}
```

### add_card_to_list
Add a new card to a specified list.

```typescript
{
  name: 'add_card_to_list',
  arguments: {
    listId: string,       // ID of the list to add the card to
    name: string,         // Name of the card
    description?: string, // Optional: Description of the card
    dueDate?: string,    // Optional: Due date (ISO 8601 format)
    labels?: string[]    // Optional: Array of label IDs
  }
}
```

### update_card_details
Update an existing card's details.

```typescript
{
  name: 'update_card_details',
  arguments: {
    cardId: string,       // ID of the card to update
    name?: string,        // Optional: New name for the card
    description?: string, // Optional: New description
    dueDate?: string,    // Optional: New due date (ISO 8601 format)
    labels?: string[]    // Optional: New array of label IDs
  }
}
```

### archive_card
Send a card to the archive.

```typescript
{
  name: 'archive_card',
  arguments: {
    cardId: string  // ID of the card to archive
  }
}
```

### add_list_to_board
Add a new list to the board.

```typescript
{
  name: 'add_list_to_board',
  arguments: {
    name: string  // Name of the new list
  }
}
```

### archive_list
Send a list to the archive.

```typescript
{
  name: 'archive_list',
  arguments: {
    listId: string  // ID of the list to archive
  }
}
```

### get_my_cards
Fetch all cards assigned to the current user.

```typescript
{
  name: 'get_my_cards',
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
- npm v7 or higher
- VS Code with Dev Containers extension (optional, but recommended)

### Setup

1. Clone the repository
```bash
git clone https://github.com/HintServices/mcp-trello.git
cd mcp-trello
```

2. Install dependencies
```bash
npm install
```

3. Build the project
```bash
npm run build
```

### Running in Development Mode

```bash
npm run watch
```

### Running with Debugging

```bash
npm run inspector
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with the [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
- Uses the [Trello REST API](https://developer.atlassian.com/cloud/trello/rest/)