import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "http";

import { getMRR } from "./tools/getMRR.js";
import { getLeads } from "./tools/getLeads.js";
import { getCohorts } from "./tools/getCohorts.js";

// Helper to wrap tool output into MCP content format
function wrapTool(toolFn: (params: any) => Promise<any>) {
  return async (params: any) => {
    try {
      console.log(`🔄 Running tool with params:`, JSON.stringify(params, null, 2));
      const result = await toolFn(params);
      console.log(`🎯 Tool result:`, JSON.stringify(result, null, 2));

      // The tool should already return { content: [...] } format
      if (result && result.content) {
        return result;
      }

      // Fallback: convert result to proper MCP content format
      if (Array.isArray(result)) {
        return {
          content: result.map((item: any) => ({
            type: "text" as const,
            text: typeof item === 'string' ? item : JSON.stringify(item, null, 2)
          }))
        };
      }

      return {
        content: [{
          type: "text" as const,
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }]
      };
    } catch (error) {
      console.error(`💥 Tool execution error:`, error);
      throw error;
    }
  };
}

// Create MCP server
const server = new Server(
  {
    name: "GrowPanel MCP Server",
    version: "1.0.0",
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
    tools: [
      {
        name: getMRR.name,
        description: getMRR.description || "Get Monthly Recurring Revenue data",
        inputSchema: getMRR.input.shape,
      },
      {
        name: getLeads.name,
        description: getLeads.description || "Get leads data",
        inputSchema: getLeads.input.shape,
      },
      {
        name: getCohorts.name,
        description: getCohorts.description || "Get cohorts data",
        inputSchema: getCohorts.input.shape,
      },
    ],
  };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case getMRR.name:
      return await wrapTool(getMRR.run)(args);
    case getLeads.name:
      return await wrapTool(getLeads.run)(args);
    case getCohorts.name:
      return await wrapTool(getCohorts.run)(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Create HTTP server for handling requests
const httpServer = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/events') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const message = JSON.parse(body);
        
        // Handle JSON-RPC message directly
        let response;
        
        if (message.method === 'tools/list') {
          const tools = [
            {
              name: getMRR.name,
              description: getMRR.description || "Get Monthly Recurring Revenue data",
              inputSchema: {
                type: "object",
                properties: {
                  date: { type: "string", description: "Date filter" },
                  interval: { 
                    type: "string", 
                    enum: ["day", "week", "month", "quarter", "year"],
                    default: "month",
                    description: "Time interval for data aggregation"
                  },
                  region: { 
                    type: "string", 
                    enum: ["europe", "asia", "north_america", "emea", "apac"],
                    description: "Regional filter"
                  },
                  currency: { type: "string", description: "Currency code" },
                  billing_freq: { 
                    type: "string", 
                    enum: ["week", "month", "quarter", "year"],
                    description: "Billing frequency filter"
                  },
                  payment_method: { type: "string", description: "Payment method filter" },
                  age: { type: "string", description: "Customer age filter" }
                },
                required: []
              },
            },
            {
              name: getLeads.name,
              description: getLeads.description || "Get leads data",
              inputSchema: {
                type: "object",
                properties: {
                  date: { type: "string", description: "Date filter" },
                  interval: { 
                    type: "string", 
                    enum: ["day", "week", "month", "quarter", "year"],
                    default: "month",
                    description: "Time interval for data aggregation"
                  },
                  region: { 
                    type: "string", 
                    enum: ["europe", "asia", "north_america", "emea", "apac"],
                    description: "Regional filter"
                  },
                  currency: { type: "string", description: "Currency code" },
                  payment_method: { type: "string", description: "Payment method filter" },
                  age: { type: "string", description: "Customer age filter" }
                },
                required: []
              },
            },
            {
              name: getCohorts.name,
              description: getCohorts.description || "Get cohorts data",
              inputSchema: {
                type: "object",
                properties: {
                  date: { type: "string", description: "Date filter" },
                  interval: { 
                    type: "string", 
                    enum: ["day", "week", "month", "quarter", "year"],
                    default: "month",
                    description: "Time interval for data aggregation"
                  },
                  region: { 
                    type: "string", 
                    enum: ["europe", "asia", "north_america", "emea", "apac"],
                    description: "Regional filter"
                  },
                  currency: { type: "string", description: "Currency code" },
                  billing_freq: { 
                    type: "string", 
                    enum: ["week", "month", "quarter", "year"],
                    description: "Billing frequency filter"
                  },
                  payment_method: { type: "string", description: "Payment method filter" },
                  age: { type: "string", description: "Customer age filter" }
                },
                required: []
              },
            },
          ];
          
          response = {
            jsonrpc: "2.0",
            id: message.id,
            result: { tools }
          };
        } else if (message.method === 'tools/call') {
          try {
            const { name, arguments: args } = message.params;
            console.log(`🔧 Tool call: ${name} with args:`, JSON.stringify(args, null, 2));
            
            let result;
            switch (name) {
              case getMRR.name:
                console.log(`📊 Calling ${getMRR.name}...`);
                result = await wrapTool(getMRR.run)(args);
                break;
              case getLeads.name:
                console.log(`📈 Calling ${getLeads.name}...`);
                result = await wrapTool(getLeads.run)(args);
                break;
              case getCohorts.name:
                console.log(`👥 Calling ${getCohorts.name}...`);
                result = await wrapTool(getCohorts.run)(args);
                break;
              default:
                console.log(`❌ Unknown tool: ${name}`);
                response = {
                  jsonrpc: "2.0",
                  id: message.id,
                  error: { code: -32601, message: `Unknown tool: ${name}` }
                };
            }
            
            if (!response) {
              console.log(`✅ Tool result:`, JSON.stringify(result, null, 2));
              response = {
                jsonrpc: "2.0",
                id: message.id,
                result
              };
            }
          } catch (toolError) {
            console.error(`💥 Tool execution error:`, toolError);
            response = {
              jsonrpc: "2.0",
              id: message.id,
              error: { 
                code: -32603, 
                message: "Internal error", 
                data: toolError instanceof Error ? toolError.message : String(toolError)
              }
            };
          }
        } else {
          response = {
            jsonrpc: "2.0",
            id: message.id,
            error: { code: -32601, message: "Method not found" }
          };
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        
      } catch (error) {
        console.error(`💥 JSON parsing error:`, error);
        const errorResponse = {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error", data: error instanceof Error ? error.message : String(error) }
        };
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      }
    });
  } else if (req.method === 'GET' && req.url === '/events') {
    // Handle SSE connection for real-time clients
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    
    const transport = new SSEServerTransport('/events', res);
    server.connect(transport);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`✅ GrowPanel MCP server running at http://localhost:${PORT}/events`);
});

// Also support stdio transport for direct MCP connections
if (process.argv.includes('--stdio')) {
  const stdioTransport = new StdioServerTransport();
  server.connect(stdioTransport);
  console.log('✅ GrowPanel MCP server running on stdio');
}