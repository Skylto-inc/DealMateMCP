# DealMate MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to the DealMate microservices codebase.

## What it does

This MCP server indexes and serves source code, configuration files, and documentation from all DealMate microservices, allowing AI assistants to understand your entire system architecture and provide contextual assistance.

## Services included

- **dealmate-ai-engine** - AI-powered coupon aggregation and processing
- **dealmate-auth-api** - Authentication and authorization service
- **dealmate-catalog-service** - Product catalog management
- **dealmate-comparison-engine** - Price comparison algorithms
- **dealmate-dealbot** - Automated deal discovery bot
- **dealmate-fraud-detection** - Fraud detection and prevention
- **dealmate-insights** - Analytics and insights service
- **dealmate-recommendations** - Personalized recommendation engine
- **dealmate-scraping-engine** - Web scraping service
- **dealmate-web-ui** - Frontend web application
- And 7 more services...

## Quick Start

1. **Start the server (auto-detect runtime):**
   ```bash
   # Using npm (if Node.js available)
   npm start
   
   # Or directly with launchers
   node start-server.js     # Node.js launcher
   python start-server.py   # Python launcher
   ./start-server.sh        # Unix/Linux
   start-server.bat         # Windows
   ```

2. **Start with specific runtime:**
   ```bash
   # Force Node.js
   MCP_RUNTIME=node npm start
   
   # Force Python
   MCP_RUNTIME=python npm start
   
   # Or use direct commands
   npm run start:node
   npm run start:python
   ```

3. **Configure your AI client** to use:
   - **Transport**: STDIO
   - **Command**: `node start-server.js` (or `python start-server.py`)
   - **Working Directory**: This repository root

## Configuration

Environment variables in `.env`:
- `MCP_CONTEXT_PATH` - Path to microservices (default: `./context-index`)
- `MCP_RUNTIME` - Server runtime preference (`auto`, `node`, `python`)

### Runtime Selection

The server automatically detects available runtimes:
- **auto** (default): Prefers Node.js, falls back to Python
- **node**: Forces Node.js runtime (requires Node.js installed)
- **python**: Forces Python runtime (requires Python 3.x installed)

Both implementations provide identical MCP functionality.

## Architecture

The server provides:
- **Resources**: Access to source files, configs, and docs from all services
- **Tools**: Query service overviews and get detailed service information
- **Context**: Full codebase understanding for AI assistants

## Supported File Types

- Source code: `.rs`, `.py`, `.js`, `.ts`
- Configuration: `Cargo.toml`, `package.json`, `requirements.txt`
- Documentation: `README.md`, `.yml`, `.yaml`
- Containers: `Dockerfile`