import { callApi, unwrap, filterParams } from './api.js';

interface ToolDef {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
    handler: (params: Record<string, any>) => Promise<unknown>;
}

const KNOWN_REPORTS = [
    'mrr', 'mrr-table', 'mrr-table-subtypes', 'summary', 'cmrr-summary',
    'movement-table', 'map', 'cohort',
    'leads', 'leads-table', 'leads-days', 'leads-summary',
    'transactions', 'transactions-table', 'transactions-detail', 'transactions-summary',
    'invoices-detail',
    'churn-scheduled', 'churn-scheduled-movements', 'churn-scheduled-summary',
    'customer-concentration',
    'cashflow-failed-payments', 'cashflow-failed-payments-summary',
    'cashflow-failed-payments-detail', 'cashflow-failed-payments-table',
    'cashflow-refunds', 'cashflow-refunds-table', 'cashflow-refunds-detail',
    'cashflow-failure-rate', 'cashflow-failure-rate-summary',
    'cashflow-outstanding-unpaid',
    'custom-variables',
];

const REPORT_FILTER_PROPERTIES = {
    date: { type: 'string', description: 'Date range in yyyyMMdd-yyyyMMdd format (e.g., 20240101-20241231)' },
    interval: { type: 'string', enum: ['day', 'week', 'month', 'quarter', 'year'], description: 'Aggregation interval (default: month)' },
    currency: { type: 'string', description: 'Filter by currency code (e.g., usd, eur)' },
    region: { type: 'string', description: 'Filter by region' },
    plan: { type: 'string', description: 'Filter by plan group ID' },
    country: { type: 'string', description: 'Filter by ISO country code' },
    data_source: { type: 'string', description: 'Filter by data source ID' },
    breakdown: { type: 'string', description: 'Group results by: plan, currency, billing_freq, etc.' },
};

export const tools: ToolDef[] = [
    // ─── Analytics (core) ────────────────────────────────────────────
    {
        name: 'get_report',
        description: `Fetch any GrowPanel analytics report by name. This is the primary tool for subscription analytics.\n\nKnown reports: ${KNOWN_REPORTS.join(', ')}\n\nAny report name is accepted — new API reports work automatically without MCP server updates.\n\nAll monetary values are in the account's base currency. The response includes a \`currency\` field indicating which currency is used (e.g., "usd", "eur", "dkk").`,
        inputSchema: {
            type: 'object',
            properties: {
                name: { type: 'string', description: 'Report name (e.g., mrr, summary, cohort, leads, cashflow-failed-payments)' },
                ...REPORT_FILTER_PROPERTIES,
            },
            required: ['name'],
        },
        handler: async (params) => {
            const { name, ...filters } = params;
            const data = await callApi({ method: 'GET', path: `/reports/${name}`, params: filterParams(filters) });
            return data;
        },
    },

    // ─── Customers ───────────────────────────────────────────────────
    {
        name: 'list_customers',
        description: 'List all customers with their subscription details and MRR. Supports pagination.',
        inputSchema: {
            type: 'object',
            properties: {
                date: { type: 'string', description: 'Date range in yyyyMMdd-yyyyMMdd format' },
                limit: { type: 'string', description: 'Maximum number of results (default: 100)' },
                offset: { type: 'string', description: 'Pagination offset' },
            },
        },
        handler: async (params) => {
            const data = await callApi({ method: 'GET', path: '/customers', params: filterParams(params) });
            return unwrap(data);
        },
    },
    {
        name: 'get_customer',
        description: 'Get detailed information for a specific customer by ID, including MRR, plans, and subscription history.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Customer ID' },
            },
            required: ['id'],
        },
        handler: async (params) => {
            const data = await callApi({ method: 'GET', path: `/customers/${params.id}` });
            return unwrap(data);
        },
    },
    {
        name: 'resync_customer',
        description: 'Trigger a data resync for a specific customer from the payment provider. Admin/owner only.',
        inputSchema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Customer ID to resync' },
            },
            required: ['id'],
        },
        handler: async (params) => {
            const data = await callApi({ method: 'POST', path: `/customers/${params.id}/resync` });
            return unwrap(data);
        },
    },

    // ─── Plans ───────────────────────────────────────────────────────
    {
        name: 'list_plans',
        description: 'List all subscription plans with their plan groups, pricing, and customer counts.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
        handler: async () => {
            const data = await callApi({ method: 'GET', path: '/plans' });
            return unwrap(data);
        },
    },

    // ─── Data CRUD ───────────────────────────────────────────────────
    {
        name: 'manage_data',
        description: `Generic CRUD operations on data resources.\n\nResources: customers, plans, plan-groups, data-sources, invoices\n\nStandard actions: list, get, create, update, delete\nData source actions: reset, connect, full-import, progress, abort\nPlan group actions: delete-multiple, ai-suggest, merge`,
        inputSchema: {
            type: 'object',
            properties: {
                resource: { type: 'string', enum: ['customers', 'plans', 'plan-groups', 'data-sources', 'invoices'], description: 'Resource type' },
                action: {
                    type: 'string',
                    enum: ['list', 'get', 'create', 'update', 'delete', 'reset', 'connect', 'full-import', 'progress', 'abort', 'delete-multiple', 'ai-suggest', 'merge'],
                    description: 'Operation to perform',
                },
                id: { type: 'string', description: 'Resource ID (required for get, update, delete, and data-source special actions)' },
                body: { type: 'object', description: 'Request body (for create, update, and special actions)' },
                data_source: { type: 'string', description: 'Filter by data source ID (for list action)' },
            },
            required: ['resource', 'action'],
        },
        handler: async (params) => {
            const { resource, action, id, body, data_source } = params;
            let data: unknown;

            switch (action) {
                case 'list':
                    data = await callApi({ method: 'GET', path: `/data/${resource}`, params: filterParams({ data_source }) });
                    break;
                case 'get':
                    data = await callApi({ method: 'GET', path: `/data/${resource}/${id}` });
                    break;
                case 'create':
                    data = await callApi({ method: 'POST', path: `/data/${resource}`, body });
                    break;
                case 'update':
                    data = await callApi({ method: 'PUT', path: `/data/${resource}/${id}`, body });
                    break;
                case 'delete':
                    data = await callApi({ method: 'DELETE', path: `/data/${resource}/${id}` });
                    break;
                // Data source special actions
                case 'reset':
                case 'connect':
                case 'full-import':
                case 'abort':
                    data = await callApi({ method: 'POST', path: `/data/${resource}/${id}/${action}`, body });
                    break;
                case 'progress':
                    data = await callApi({ method: 'GET', path: `/data/${resource}/${id}/progress` });
                    break;
                // Plan group special actions
                case 'delete-multiple':
                case 'ai-suggest':
                case 'merge':
                    data = await callApi({ method: 'POST', path: `/data/${resource}/${action}`, body });
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            return unwrap(data);
        },
    },

    // ─── Exports ─────────────────────────────────────────────────────
    {
        name: 'export_csv',
        description: 'Export data as CSV. Available exports: customers (all customers with details) and mrr-movements (all MRR changes).',
        inputSchema: {
            type: 'object',
            properties: {
                type: { type: 'string', enum: ['customers', 'mrr-movements'], description: 'Export type' },
                date: { type: 'string', description: 'Date range in yyyyMMdd-yyyyMMdd format' },
            },
            required: ['type'],
        },
        handler: async (params) => {
            const { type, date } = params;
            const filename = type === 'mrr-movements' ? 'mrr-movements.csv' : 'customers.csv';
            const data = await callApi({ method: 'GET', path: `/exports/${filename}`, params: filterParams({ date }) });
            return data;
        },
    },

    // ─── Settings ────────────────────────────────────────────────────
    {
        name: 'manage_settings',
        description: `Get or update account settings and integration settings.\n\nFor general settings: action=get or action=update with body.\nFor integration settings: set the integration parameter.\n\nIntegrations: notifications, stripe, hubspot, webhook, slack, teams, looker-studio`,
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['get', 'update'], description: 'get to read settings, update to modify' },
                integration: {
                    type: 'string',
                    enum: ['notifications', 'stripe', 'hubspot', 'webhook', 'slack', 'teams', 'looker-studio'],
                    description: 'Integration name (omit for general account settings)',
                },
                body: { type: 'object', description: 'Settings to update (required for update action)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, integration, body } = params;
            const path = integration ? `/settings/${integration}` : '/settings';

            let data: unknown;
            if (action === 'get') {
                data = await callApi({ method: 'GET', path });
            } else {
                // Use PUT for notifications, POST for everything else
                const method = integration === 'notifications' ? 'PUT' : 'POST';
                data = await callApi({ method, path, body });
            }
            return unwrap(data);
        },
    },

    // ─── Webhooks ────────────────────────────────────────────────────
    {
        name: 'manage_webhooks',
        description: 'Manage webhook subscriptions for real-time event notifications.',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['list', 'get', 'create', 'delete', 'verify', 'sample'], description: 'Webhook operation' },
                id: { type: 'string', description: 'Webhook ID (for get/delete)' },
                event: { type: 'string', description: 'Event type name (for sample, e.g., customer.created)' },
                body: { type: 'object', description: 'Webhook configuration (for create: url, events array)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, id, event, body } = params;
            let data: unknown;

            switch (action) {
                case 'list':
                    data = await callApi({ method: 'GET', path: '/integrations/webhooks' });
                    break;
                case 'get':
                    data = await callApi({ method: 'GET', path: `/integrations/webhooks/${id}` });
                    break;
                case 'create':
                    data = await callApi({ method: 'POST', path: '/integrations/webhooks', body });
                    break;
                case 'delete':
                    data = await callApi({ method: 'DELETE', path: `/integrations/webhooks/${id}` });
                    break;
                case 'verify':
                    data = await callApi({ method: 'GET', path: '/integrations/verify' });
                    break;
                case 'sample':
                    data = await callApi({ method: 'GET', path: `/integrations/sample/${event}` });
                    break;
                default:
                    throw new Error(`Unknown webhook action: ${action}`);
            }
            return unwrap(data);
        },
    },

    // ─── Account ─────────────────────────────────────────────────────
    {
        name: 'manage_account',
        description: 'Get, update, or delete the GrowPanel account.',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['get', 'update', 'delete'], description: 'Account operation' },
                body: { type: 'object', description: 'Account data to update (for update action)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, body } = params;
            let data: unknown;

            switch (action) {
                case 'get':
                    data = await callApi({ method: 'GET', path: '/account' });
                    break;
                case 'update':
                    data = await callApi({ method: 'POST', path: '/account', body });
                    break;
                case 'delete':
                    data = await callApi({ method: 'DELETE', path: '/account' });
                    break;
                default:
                    throw new Error(`Unknown account action: ${action}`);
            }
            return unwrap(data);
        },
    },

    // ─── Billing ─────────────────────────────────────────────────────
    {
        name: 'manage_billing',
        description: 'Manage billing, subscriptions, invoices, and payment methods.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: [
                        'details', 'invoices', 'portal', 'subscribe', 'check_vat',
                        'address', 'setup', 'preview_change', 'change_plan',
                        'undo_cancellation', 'delete_card',
                    ],
                    description: 'Billing operation',
                },
                body: { type: 'object', description: 'Request body (for subscribe, address, preview_change, change_plan)' },
                card_id: { type: 'string', description: 'Card ID (for delete_card action)' },
                vat_number: { type: 'string', description: 'VAT number (for check_vat action)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, body, card_id, vat_number } = params;
            let data: unknown;

            switch (action) {
                case 'details':
                    data = await callApi({ method: 'GET', path: '/account/billing' });
                    break;
                case 'invoices':
                    data = await callApi({ method: 'GET', path: '/account/billing/invoices' });
                    break;
                case 'portal':
                    data = await callApi({ method: 'GET', path: '/account/billing/portal' });
                    break;
                case 'subscribe':
                    data = await callApi({ method: 'POST', path: '/account/billing/subscribe', body });
                    break;
                case 'check_vat':
                    data = await callApi({ method: 'GET', path: '/account/billing/check-vat', params: filterParams({ vat_number }) });
                    break;
                case 'address':
                    data = await callApi({ method: 'POST', path: '/account/billing/address', body });
                    break;
                case 'setup':
                    data = await callApi({ method: 'POST', path: '/account/billing/setup' });
                    break;
                case 'preview_change':
                    data = await callApi({ method: 'POST', path: '/account/billing/preview-change', body });
                    break;
                case 'change_plan':
                    data = await callApi({ method: 'POST', path: '/account/billing/change-plan', body });
                    break;
                case 'undo_cancellation':
                    data = await callApi({ method: 'POST', path: '/account/billing/undo-cancellation' });
                    break;
                case 'delete_card':
                    data = await callApi({ method: 'DELETE', path: `/account/billing/cards/${card_id}` });
                    break;
                default:
                    throw new Error(`Unknown billing action: ${action}`);
            }
            return unwrap(data);
        },
    },

    // ─── Team ────────────────────────────────────────────────────────
    {
        name: 'manage_team',
        description: 'Manage team members: list, edit roles, remove, invite, and manage invitations.',
        inputSchema: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['list', 'edit', 'remove', 'invite', 'revoke_invite', 'resend_invite'],
                    description: 'Team operation',
                },
                user_id: { type: 'string', description: 'User ID (for edit/remove)' },
                email: { type: 'string', description: 'Email address (for revoke_invite/resend_invite)' },
                body: { type: 'object', description: 'Request body (for edit: role; for invite: email, role)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, user_id, email, body } = params;
            let data: unknown;

            switch (action) {
                case 'list':
                    data = await callApi({ method: 'GET', path: '/account/team' });
                    break;
                case 'edit':
                    data = await callApi({ method: 'PUT', path: `/account/team/${user_id}`, body });
                    break;
                case 'remove':
                    data = await callApi({ method: 'DELETE', path: `/account/team/${user_id}` });
                    break;
                case 'invite':
                    data = await callApi({ method: 'POST', path: '/account/team/invite', body });
                    break;
                case 'revoke_invite':
                    data = await callApi({ method: 'DELETE', path: `/account/team/invites/${email}` });
                    break;
                case 'resend_invite':
                    data = await callApi({ method: 'POST', path: `/account/team/resend/${email}` });
                    break;
                default:
                    throw new Error(`Unknown team action: ${action}`);
            }
            return unwrap(data);
        },
    },

    // ─── API Keys ────────────────────────────────────────────────────
    {
        name: 'manage_api_keys',
        description: 'Manage API keys: list, create, update, and delete.',
        inputSchema: {
            type: 'object',
            properties: {
                action: { type: 'string', enum: ['list', 'create', 'update', 'delete'], description: 'API key operation' },
                id: { type: 'string', description: 'API key ID (for update/delete)' },
                body: { type: 'object', description: 'API key data (for create/update: name, permissions)' },
            },
            required: ['action'],
        },
        handler: async (params) => {
            const { action, id, body } = params;
            let data: unknown;

            switch (action) {
                case 'list':
                    data = await callApi({ method: 'GET', path: '/account/api-keys' });
                    break;
                case 'create':
                    data = await callApi({ method: 'POST', path: '/account/api-keys', body });
                    break;
                case 'update':
                    data = await callApi({ method: 'PUT', path: `/account/api-keys/${id}`, body });
                    break;
                case 'delete':
                    data = await callApi({ method: 'DELETE', path: `/account/api-keys/${id}` });
                    break;
                default:
                    throw new Error(`Unknown api-keys action: ${action}`);
            }
            return unwrap(data);
        },
    },

    // ─── Generic Passthrough ─────────────────────────────────────────
    {
        name: 'api_request',
        description: 'Generic API passthrough for any GrowPanel API endpoint. Use this for endpoints not covered by other tools, or when new API features are added. Any valid API path works — this tool makes the MCP server automatically support new features.',
        inputSchema: {
            type: 'object',
            properties: {
                method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
                path: { type: 'string', description: 'API path starting with / (e.g., /reports/mrr, /data/customers)' },
                params: {
                    type: 'object',
                    description: 'Query parameters as key-value pairs (for GET requests)',
                    additionalProperties: { type: 'string' },
                },
                body: { type: 'object', description: 'Request body (for POST/PUT requests)' },
            },
            required: ['method', 'path'],
        },
        handler: async (params) => {
            const { method, path, params: queryParams, body } = params;
            const data = await callApi({
                method,
                path,
                params: queryParams ? filterParams(queryParams) : undefined,
                body,
            });
            return unwrap(data);
        },
    },
];
