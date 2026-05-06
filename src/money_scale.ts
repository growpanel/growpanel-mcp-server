// Pre-scale monetary values in tool results before the AI client sees them.
//
// GrowPanel stores most amounts in the smallest currency unit (cents/øre/…),
// so a display value is the raw ÷ 100. A handful of "zero-decimal" currencies
// (JPY, KRW, ISK, VND, HUF, …) have no subunit — the raw value IS the display
// value and must NOT be divided. We detect the containing currency from the
// nearest `currency` key in scope and act accordingly.
//
// Without this, the AI client routinely treats raw cents as dollars and quotes
// numbers ~100× too high. Prompting alone can't be relied on; doing it in the
// tool layer is the robust fix.
//
// Mirrors the same logic used by the hosted MCP server (growpanel-mcp/src/
// helpers/money_scale.js) and the in-app AI chat
// (growpanel-api/src/controllers/chat/v2/tools/_money_scale.js). Keep all
// three in sync if you add new amount fields.

const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif', 'clp', 'djf', 'gnf', 'isk', 'jpy', 'kmf', 'krw', 'mga', 'pyg',
    'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf', 'huf',
]);

const MONEY_EXPLICIT = new Set([
    'new', 'expansion', 'contraction', 'churn', 'reactivation',
    'mrr_diff', 'net_mrr_diff', 'fx_adjustment', 'total_mrr', 'total_arr',
    'arpa', 'asp', 'ltv',
    'net_amount', 'month_sub', 'year_sub', 'one_time', 'metered',
    'discount', 'refund', 'tax', 'fee', 'fx_loss',
    'failed_amount', 'recovered', 'still_unpaid', 'churned',
    'scheduled_churn_mrr',
    'cmrr_current', 'cmrr_30', 'cmrr_60', 'cmrr_180', 'cmrr_365',
    'mrr', 'amount', 'original_amount',
    'total_paid_customer_currency', 'total_paid_base_currency',
    'source_mrr',
    'mrr_change', 'mrr_change_base_currency', 'mrr_change_customer_currency',
]);

const NOT_MONEY_RE = /(_count|_counts|_customers?|_rate|_rates|_pct|_percent|_percentage|_days|_num|_ratio|_change_pct|_diff_pct|_id)$/i;

const MONEY_HINT_RE =
    /^(mrr|arr|cmrr|ltv|arpa|asp|cac|gmv|revenue|amount|paid|charged|refunded|collected|owed|earned|invoiced|billed|churned|recovered|discount|fee|tax|gross|net)_|_(mrr|arr|ltv|amount|paid|charged|refunded|collected|revenue|owed|earned|invoiced|billed|churned|recovered|fee|tax|discount|gross|net)(_|$)/i;

const looksLikeMoneyKey = (key: string): boolean => {
    if (!key) return false;
    if (MONEY_EXPLICIT.has(key)) return true;
    if (NOT_MONEY_RE.test(key)) return false;
    return MONEY_HINT_RE.test(key);
};

const isZeroDecimal = (code: unknown): boolean =>
    typeof code === 'string' && ZERO_DECIMAL_CURRENCIES.has(code.trim().toLowerCase());

const scaleNumber = (n: number): number => {
    if (typeof n !== 'number' || !isFinite(n)) return n;
    return Math.round(n) / 100;
};

const walk = (value: unknown, currencyInScope: string | null): unknown => {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map((v) => walk(v, currencyInScope));
    if (typeof value !== 'object') return value;

    const obj = value as Record<string, unknown>;
    const localCurrency =
        typeof obj.currency === 'string' ? (obj.currency as string) : currencyInScope;
    const skip = isZeroDecimal(localCurrency);

    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (looksLikeMoneyKey(k) && typeof v === 'number' && !skip) {
            out[k] = scaleNumber(v);
        } else if (v && typeof v === 'object') {
            out[k] = walk(v, localCurrency);
        } else {
            out[k] = v;
        }
    }
    return out;
};

export const scaleMoneyFields = (value: unknown): unknown => walk(value, null);
