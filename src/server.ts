import dotenv from 'dotenv';
dotenv.config();

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';
import { scaleMoneyFields } from './money_scale.js';

const server = new Server(
    {
        name: 'GrowPanel MCP Server',
        version: '2.1.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
        })),
    };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const tool = tools.find((t) => t.name === name);
    if (!tool) {
        throw new Error(`Unknown tool: ${name}. Available tools: ${tools.map((t) => t.name).join(', ')}`);
    }

    try {
        const raw = await tool.handler(args || {});

        // Pre-scale monetary fields (cents → display units) so the AI client
        // doesn't quote raw cents as if they were dollars. CSV/text returns
        // pass through untouched.
        const result = typeof raw === 'string' ? raw : scaleMoneyFields(raw);

        const text = typeof result === 'string'
            ? result
            : JSON.stringify(result, null, 2);

        return {
            content: [{ type: 'text' as const, text }],
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text' as const, text: `Error: ${message}` }],
            isError: true,
        };
    }
});

// Start stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('GrowPanel MCP server running on stdio');
}

main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
});
