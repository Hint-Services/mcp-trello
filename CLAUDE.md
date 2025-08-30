# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with HTTP streaming interface and hot reloading
- `npm run dev:stdio` - Start development with TypeScript watch mode and MCP inspector (legacy)
- `npm run watch` - TypeScript watch mode only
- `npm run inspector` - Run MCP inspector for debugging tools

### Build Commands
- `npm run build` - Build HTTP streaming version (default)
- `npm run build:http` - Build HTTP streaming version using Smithery
- `npm run build:stdio` - Build stdio version for backwards compatibility

### Deployment
- `npm start` - Start HTTP streaming server (default)
- `npm run start:http` - Start HTTP streaming server
- `npm run start:stdio` - Start stdio server (backwards compatibility)

### Quality Assurance
- `npm run lint` - Lint code with Biome
- `npm run lint:fix` - Lint and auto-fix issues
- `npm run format` - Check code formatting with Biome
- `npm run format:fix` - Format code with Biome

### Testing/Debugging
- `npm run debug` - Start server with Node.js inspector
- `npm run debug:watch` - Debug mode with TypeScript watch
- `npm run logs` - Tail Claude MCP logs


## Architecture

This is a Model Context Protocol (MCP) server that provides Trello integration tools for AI assistants. It supports both HTTP streaming and stdio interfaces. The architecture follows a clean separation of concerns:

### Core Components

**Main Server (`src/index.ts`)**
- Exports factory function for HTTP streaming interface
- Maintains backwards compatibility with stdio transport
- Environment variable validation for Trello credentials
- Configuration schema using Zod for type safety
- Graceful shutdown handling for both interfaces

**Trello Client (`src/trello/client.ts`)**
- Axios-based HTTP client with built-in rate limiting
- Tool registration method that defines all available Trello operations
- Error handling with retry logic for rate limits
- Type-safe API interactions using Zod schemas

**Rate Limiting (`src/trello/rate-limiter.ts`)**
- Implements Trello's rate limits (300 requests/10s per API key, 100/10s per token)
- Token bucket algorithm for request throttling

**Type Definitions (`src/trello/types.ts`)**
- TypeScript interfaces for Trello API entities (cards, lists, actions, etc.)
- Configuration interfaces for client setup

### Available Tools

The server exposes these tools for Trello interaction:
- Card management: `getCardsByList`, `getMyCards`, `addCard`, `updateCard`, `moveCard`, `archiveCard`, `changeCardMembers`
- List management: `getLists`, `addList`, `archiveList`
- Board information: `getRecentActivity`

## Environment Variables

Required for operation:
- `trelloApiKey` - Trello API key from https://trello.com/app-key
- `trelloToken` - Trello token generated using API key
- `trelloBoardId` - Target board ID from Trello board URL

## Build System

- **TypeScript**: ES2020 target with Node16 module resolution
- **Biome**: Linting and formatting with strict rules (no explicit any, unused variables as errors)
- **Smithery**: HTTP streaming interface bundler
- **Outputs**: 
  - `build/` directory with TypeScript compilation and type declarations (stdio)
  - `.smithery/index.cjs` bundled version for HTTP streaming
- **Entry Points**: 
  - `build/index.js` (stdio executable)
  - `.smithery/index.cjs` (HTTP streaming)