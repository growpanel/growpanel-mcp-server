# GrowPanel MCP Server

This MCP server lets AI assistants (Claude, Cursor, etc.) access your GrowPanel SaaS analytics data via natural language.

  INSTALLATION
  ------------
  1) Install globally:
     npm install -g growpanel-mcp-server

  2) Set your GrowPanel API token (Bearer):
     export GROWPANEL_API_TOKEN=sk_live_xxx

  3) Run the server:
     growpanel-mcp

  4) Connect your MCP client to:
     http://localhost:3000/mcp

  TOOLS AVAILABLE
  ---------------
  - getMRR     : MRR, ARR, ARPA, ASP, churn metrics, LTV
  - getLeads   : leads, trials, trial conversion
  - getCohorts : cohort analyses

  NOTES
  -----
  - Requires Node.js 18+ (uses global fetch).
  - The server is local-first and uses your Bearer token to access https://api.growpanel.io.
  - Filters are passed as query params per GrowPanel API (e.g., date=YYYYMMDD-YYYYMMDD, region=...).
  