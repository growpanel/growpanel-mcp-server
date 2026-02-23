# GrowPanel MCP Server

## What This Is

MCP server providing AI assistants access to the GrowPanel subscription analytics API. Published on npm as `growpanel-mcp-server`. Uses stdio transport.

## Build & Run

```bash
npm install
npm run build        # tsc → dist/
npm run dev          # Run from source via tsx
npm start            # Run built version
npm run typecheck    # tsc --noEmit
```

## Architecture

### Dynamic Tools

The server uses dynamic/generic handlers so new API endpoints work automatically:

- `get_report` → calls `/reports/<name>` (any report name accepted)
- `manage_data` → calls `/data/<resource>` (CRUD with action routing)
- `api_request` → raw passthrough to any API endpoint

### File Structure

```
src/
  server.ts    MCP server entry point, stdio transport, tool dispatch
  api.ts       Generic API client (any path, any method, Bearer auth)
  tools.ts     All 14 tool definitions with handlers
```

### Key Patterns

- **Tool dispatch**: tools array with name/description/inputSchema/handler — server.ts iterates to find matching tool
- **API client**: generic callApi() with method/path/params/body — not locked to any prefix
- **Response unwrapping**: all handlers call `unwrap()` to extract `{ result: ... }` payloads
- **Error handling**: try/catch in server.ts returns `{ isError: true }` MCP responses
- **Auth**: `GROWPANEL_API_KEY` or `GROWPANEL_API_TOKEN` env var → Bearer token

### Adding a New Tool

Add an entry to the `tools` array in `src/tools.ts`:

```typescript
{
    name: 'my_tool',
    description: 'What this tool does',
    inputSchema: {
        type: 'object',
        properties: {
            param1: { type: 'string', description: 'Description' },
        },
        required: ['param1'],
    },
    handler: async (params) => {
        const data = await callApi({ method: 'GET', path: `/some/path/${params.param1}` });
        return unwrap(data);
    },
},
```

No other files need changes — the server auto-discovers tools from the array.

### Conventions

- 4-space indentation, single quotes
- ESM with `.js` extensions in imports
- All async/await
- Errors logged to stderr, tool output via MCP content response
