# GrowPanel MCP Server

MCP server for [GrowPanel](https://growpanel.io) subscription analytics. Connects AI assistants (Claude, Cursor, Windsurf, etc.) to your GrowPanel data via the Model Context Protocol.

**14 tools** covering reports, customers, plans, settings, webhooks, billing, team, and more. Plus a generic API passthrough that automatically supports new API features.

## Installation

```bash
npm install -g growpanel-mcp-server
```

## Configuration

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
    "mcpServers": {
        "growpanel": {
            "command": "growpanel-mcp",
            "env": {
                "GROWPANEL_API_KEY": "your-api-key-here"
            }
        }
    }
}
```

### Cursor / Other MCP Clients

Most MCP clients support a similar configuration. Set the command to `growpanel-mcp` and provide the `GROWPANEL_API_KEY` environment variable.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GROWPANEL_API_KEY` | Your GrowPanel API key (required) | — |
| `GROWPANEL_API_URL` | API base URL | `https://api.growpanel.io` |

For backward compatibility, `GROWPANEL_API_TOKEN` is also accepted.

Get your API key at [app.growpanel.io](https://app.growpanel.io) → Settings → API Keys.

## Available Tools

### Analytics

| Tool | Description |
|------|-------------|
| `get_report` | Fetch any analytics report by name (mrr, summary, cohort, leads, cashflow, etc.) |

The `get_report` tool accepts any report name — new reports added to the API work automatically.

**Known reports:** mrr, mrr-table, summary, cmrr-summary, movement-table, map, cohort, leads, leads-table, leads-days, leads-summary, transactions, transactions-table, transactions-detail, transactions-summary, invoices-detail, churn-scheduled, churn-scheduled-movements, churn-scheduled-summary, customer-concentration, cashflow-failed-payments, cashflow-failed-payments-summary, cashflow-refunds, cashflow-refunds-table, cashflow-failure-rate, cashflow-outstanding-unpaid, custom-variables

### Customers & Plans

| Tool | Description |
|------|-------------|
| `list_customers` | List customers with MRR and subscription details |
| `get_customer` | Get detailed info for a specific customer |
| `resync_customer` | Trigger a data resync from the payment provider |
| `list_plans` | List all subscription plans and plan groups |

### Data Management

| Tool | Description |
|------|-------------|
| `manage_data` | CRUD operations on customers, plans, plan-groups, data-sources, invoices |
| `export_csv` | Export customers or MRR movements as CSV |

### Settings & Integrations

| Tool | Description |
|------|-------------|
| `manage_settings` | Get/update account and integration settings |
| `manage_webhooks` | Manage webhook subscriptions (list, create, delete, verify, sample) |

### Account Management

| Tool | Description |
|------|-------------|
| `manage_account` | Get, update, or delete the account |
| `manage_billing` | Billing details, invoices, subscriptions, payment methods |
| `manage_team` | Team members: list, invite, edit roles, remove |
| `manage_api_keys` | API key management: list, create, update, delete |

### Generic Passthrough

| Tool | Description |
|------|-------------|
| `api_request` | Call any API endpoint directly (method + path + params/body) |

The `api_request` tool supports any API endpoint. New features added to the GrowPanel API are immediately available through this tool without needing an MCP server update.

## Example Prompts

Once connected, you can ask your AI assistant:

- "What's my current MRR?"
- "Show me MRR trends for the last 6 months"
- "List my top customers by revenue"
- "What's my churn rate?"
- "Show me the cohort retention analysis"
- "How many leads converted this quarter?"
- "List all my webhook subscriptions"
- "What are my current settings?"

## Self-Updating Architecture

The MCP server uses the same dynamic architecture as the [GrowPanel CLI](https://www.npmjs.com/package/growpanel-cli):

- **`get_report`** accepts any report name and passes it through to `/reports/<name>`. New reports work automatically.
- **`api_request`** can call any API endpoint. New API features work on day one.
- Named tools (`manage_data`, `manage_settings`, etc.) provide better descriptions for AI understanding, but the passthrough ensures nothing is missed.

## Development

```bash
npm install
npm run dev          # Run from source via tsx
npm run build        # Compile TypeScript
npm run typecheck    # Type checking only
npm start            # Run built version
```

## Requirements

- Node.js 20+
- GrowPanel account with API key

## License

MIT
