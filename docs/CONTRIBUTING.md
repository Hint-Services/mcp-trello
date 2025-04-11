---
title: Contributing to MCP Trello
description: Guidelines for contributing to the MCP Trello project
---

# Contributing to MCP Trello

Thank you for your interest in contributing to MCP Trello! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

We expect all contributors to follow these basic principles:

- Be respectful and inclusive in your communication
- Focus on constructive feedback
- Respect the time and effort of maintainers and other contributors
- Help create a positive environment for everyone

## Getting Started

### Development Environment

We recommend using VS Code with the Dev Containers extension for the best development experience:

1. Clone the repository
2. Open in VS Code with Dev Containers
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Build the project:
   ```bash
   pnpm run build
   ```

### Development Scripts

- **Build**: `pnpm run build` - Compiles TypeScript and sets permissions
- **Watch mode**: `pnpm run watch` - Automatically recompiles on changes
- **Debug mode**: `pnpm run inspector` - Runs with inspector for debugging

## Development Workflow

1. **Set Up Your Environment**

   ```bash
   # Clone the repository
   git clone https://github.com/your-username/mcp-trello.git
   cd mcp-trello

   # Install dependencies
   pnpm install

   # Build the project
   pnpm run build
   ```

2. **Development Scripts**

   - Build the project: `pnpm run build`
   - Watch mode for development: `pnpm run watch`
   - Debug mode with inspector: `pnpm run inspector`

3. **Testing Your Changes**

   - Write unit tests for new functionality
   - Run the test suite: `pnpm test`
   - Ensure all existing tests pass
   - Add new test cases for bug fixes

4. **Code Style**

   - Follow TypeScript best practices
   - Use ESLint and Prettier for code formatting
   - Maintain consistent error handling patterns
   - Document new functions and types

5. **Making Changes**

   - Create a feature branch: `git checkout -b feature/your-feature`
   - Make your changes with clear commit messages
   - Keep commits focused and atomic
   - Update documentation as needed

6. **Testing with AI Platforms**

   ### Testing with Cursor

   1. Build your development version:

      ```bash
      pnpm run build
      ```

   2. Configure in Cursor:

      - Open Cursor settings
      - Navigate to Features > MCP
      - Add a new MCP server with these settings:
        - Transport: stdio
        - Name: mcp-trello-dev (or your preferred name)
        - Command: `node /path/to/your/mcp-trello/build/index.js`

   3. Testing:
      - Open a new Cursor window
      - Use the AI features to test your tools
      - Check the debug console for errors
      - Verify tool responses match expectations

   ### Testing with Claude

   1. Build your development version:

      ```bash
      pnpm run build
      ```

   2. Configure Claude Desktop:

      - Create or update your Claude config file:
        ```json
        {
          "mcpServers": {
            "mcp-trello": {
              "command": "node",
              "args": ["/path/to/your/mcp-trello/build/index.js"],
              "env": {
                "trelloApiKey": "your-api-key",
                "trelloToken": "your-token",
                "trelloBoardId": "your-board-id"
              }
            }
          }
        }
        ```

   3. Testing:
      - Start Claude Desktop
      - Use the chat interface to test your tools
      - Verify responses and error handling
      - Check logs for any issues

   ### Using the Inspector

   The inspector is a powerful tool for debugging:

   ```bash
   pnpm run inspector
   ```

   This provides:

   - Real-time request/response monitoring
   - Tool execution tracing
   - Schema validation feedback
   - Performance metrics

7. **Submitting Changes**
   - Push your changes: `git push origin feature/your-feature`
   - Create a Pull Request with:
     - Clear description of changes
     - Test results
     - Documentation updates
     - Any breaking changes noted
   - Respond to review feedback
   - Update your PR as needed

## Pull Request Process

1. Ensure your code follows the project's coding standards
2. Include tests for new functionality
3. Update documentation as needed
4. Ensure all CI checks pass
5. Wait for a maintainer to review your pull request
6. Address any feedback from the review
7. Once approved, a maintainer will merge your pull request

## Coding Standards

### TypeScript Implementation

We follow strict TypeScript practices:

- Use proper typing for all functions and variables
- Use async/await for asynchronous operations
- Follow the existing code structure and patterns

### Tool Implementation

When implementing new tools, follow this pattern:

```typescript
import { z } from "zod";

// Define strict schema for input validation
const AddCardSchema = z
  .object({
    listId: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    position: z.string().optional(),
    due: z.string().optional(),
    dueComplete: z.boolean().optional(),
  })
  .strict();

// Register tool with the server
server.tool("addCard", AddCardSchema.shape, async (params) => {
  try {
    // Implement rate limiting
    await rateLimiter.checkLimit();

    // Implement tool logic
    const result = await trelloClient.addCard(params);

    // Return formatted response
    return {
      content: [
        {
          type: "text",
          text: `Card "${params.name}" created successfully`,
        },
        {
          type: "text",
          text: `Card ID: ${result.id}`,
        },
      ],
    };
  } catch (error) {
    // Handle errors properly
    logger.error(error);

    return {
      content: [
        {
          type: "text",
          text: "Failed to create card. Please check your inputs and try again.",
        },
      ],
      isError: true,
    };
  }
});
```

### Security Best Practices

All contributions must follow these security guidelines:

1. **Input Validation**:

   - Always validate input parameters using Zod schemas
   - Implement strict type checking
   - Sanitize user inputs before processing
   - Use the `strict()` option in schemas to prevent extra properties

2. **Error Handling**:

   - Never expose internal error details to clients
   - Implement proper error boundaries
   - Log errors securely
   - Return user-friendly error messages

3. **Resource Management**:

   - Implement proper cleanup procedures
   - Handle process termination signals
   - Close connections and free resources
   - Implement timeouts for long-running operations

4. **API Security**:
   - Use secure transport protocols
   - Implement rate limiting
   - Store sensitive data securely
   - Use environment variables for configuration

## Testing

- Write unit tests for all new functionality
- Ensure existing tests continue to pass
- Test edge cases and error handling
- For Trello API interactions, use mocks to avoid actual API calls in tests

## Documentation

- Update API documentation for any changes to existing tools
- Add documentation for new tools
- Keep the README up to date
- Include examples for new functionality

## Testing Best Practices

1. **Unit Testing**

   ```typescript
   describe("Trello Card Tools", () => {
     let server: McpServer;

     beforeEach(() => {
       server = new McpServer({
         name: "test-server",
         version: "1.0.0",
       });
       // Mock the Trello client for testing
       const mockTrelloClient = {
         addCard: jest
           .fn()
           .mockResolvedValue({ id: "card123", name: "Test Card" }),
       };
       registerCardTools(server, mockTrelloClient);
     });

     test("adds card correctly", async () => {
       const result = await server.executeTool("addCard", {
         listId: "list123",
         name: "Test Card",
         description: "Test Description",
       });
       expect(result.content[0].text).toContain("created successfully");
     });
   });
   ```

2. **Integration Testing**

   - Test with actual Trello API (use test board)
   - Verify rate limiting behavior
   - Test error handling scenarios
   - Check response formatting

3. **Error Handling Tests**

   ```typescript
   test("handles API errors gracefully", async () => {
     // Mock failure
     mockTrelloClient.addCard.mockRejectedValue(new Error("API Error"));

     const result = await server.executeTool("addCard", {
       listId: "invalid",
       name: "Test Card",
     });
     expect(result.isError).toBe(true);
     expect(result.content[0].text).toContain("Failed to create card");
   });
   ```

4. **Performance Testing**
   - Test with large data sets
   - Verify memory usage
   - Check response times
   - Test concurrent requests

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT license.

## Questions?

If you have questions about contributing, please open an issue in the repository or contact the maintainers directly.

Thank you for contributing to MCP Trello!
