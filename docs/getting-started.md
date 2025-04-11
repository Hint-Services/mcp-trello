---
title: Getting Started with MCP Trello
description: How to get started using the MCP Trello server
---

# Getting Started with MCP Trello

This guide will help you set up and start using the MCP Trello server with your AI agents.

## Prerequisites

Before you begin, make sure you have:

1. A Trello account
2. Trello API key and token
3. Node.js v18 or later
4. npm v7 or later

## Obtaining Trello Credentials

1. Visit [https://trello.com/app-key](https://trello.com/app-key) while logged into your Trello account
2. Copy your API Key from the page
3. Click "Token" to generate a token with appropriate permissions
4. Copy the generated token
5. Find your board ID from the URL of your Trello board: `https://trello.com/b/{BOARD_ID}/board-name`

## Installation

### Using Smithery (Recommended)

Smithery provides the easiest way to install and configure MCP Trello:

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

If you prefer to install manually:

```bash
npm install @Hint-Services/mcp-trello
```

## Configuration

### Environment Variables

Create a `.env` file in your project root with the following variables:

```
TRELLO_API_KEY=your_api_key
TRELLO_TOKEN=your_token
TRELLO_BOARD_ID=your_board_id
```

### MCP Settings File

Add the Trello server to your MCP settings file:

```json
{
  "mcpServers": {
    "trello": {
      "command": "npx",
      "args": ["-y", "@Hint-Services/mcp-trello"],
      "env": {
        "TRELLO_API_KEY": "${TRELLO_API_KEY}",
        "TRELLO_TOKEN": "${TRELLO_TOKEN}",
        "TRELLO_BOARD_ID": "${TRELLO_BOARD_ID}"
      }
    }
  }
}
```

## Using with AI Agents

Once configured, your AI agent can use the Trello tools through the MCP interface. Here are some example prompts:

### For Claude

```
You have access to a Trello board through the MCP Trello tools.
Please help me manage my board by:
1. Showing me all the lists
2. Showing cards in the "To Do" list
3. Adding a new card to the "To Do" list
```

### For GPT

```
You have access to a Trello board through function calls.
First, get all lists by calling the get_lists function.
Then, get cards from a list by calling get_cards_by_list_id with the list ID.
You can add new cards with add_card_to_list.
```

## Basic Workflow Examples

### Managing Tasks

```typescript
// Get all lists
const lists = await mcp.invoke("trello", "get_lists", {});

// Find the "To Do" list
const todoList = lists.find((list) => list.name === "To Do");

// Add a new task
await mcp.invoke("trello", "add_card_to_list", {
  listId: todoList.id,
  name: "Complete project documentation",
  description: "Finish writing all documentation files for the project",
});

// Get all cards in the To Do list
const todoCards = await mcp.invoke("trello", "get_cards_by_list_id", {
  listId: todoList.id,
});

// Mark a task as complete (by moving to Done list)
const doneList = lists.find((list) => list.name === "Done");
const taskToComplete = todoCards.find(
  (card) => card.name === "Complete project documentation"
);

await mcp.invoke("trello", "update_card_details", {
  cardId: taskToComplete.id,
  idList: doneList.id,
});
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify your API key and token are correct and have appropriate permissions
2. **Rate Limiting**: If you encounter rate limit errors, consider implementing retry logic with exponential backoff
3. **Board ID Errors**: Ensure you're using the correct board ID from your Trello board URL

### Getting Help

If you encounter any issues, please open an issue on the GitHub repository or join our community Discord for support.
