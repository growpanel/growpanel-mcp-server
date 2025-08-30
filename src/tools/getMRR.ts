import { z } from "zod";
import { callApi } from "../utils/api.js";

/**
 * getMRR Tool
 *
 * Description:
 * Retrieves detailed MRR metrics from GrowPanel for a given date range and optional filters.
 * Metrics include MRR, ARR, ARPA, ASP, churn, customer changes, LTV, FX adjustments, and net MRR movements.
 *
 * API Endpoint:
 * https://api.growpanel.io/reports/mrr?filters
 *
 * Available query parameters (filters):
 * - date (yyyyMMdd-yyyyMMdd, optional): Reporting period. Defaults to last 365 days.
 * - interval (string, optional): Reporting interval. Options: day, week, month, quarter, year. Defaults to month.
 * - region (optional): Filter by region. Options: europe, asia, north_america, emea, apac.
 * - currency (optional): Filter by 3-letter currency code, e.g., USD, EUR.
 * - billing_freq (optional): Billing frequency. Options: month, quarter, year, week.
 * - payment_method (optional): Filter by payment method, e.g., visa, mastercard, paypal.
 * - age (optional): Filter by customer age group.
 *
 * All numeric fields are numbers (integers for amounts in cents, floats for percentages)
 */

export const getMRRInput = z.object({
  date: z.string()
    .regex(/^\d{8}-\d{8}$/, "Date must be in format yyyyMMdd-yyyyMMdd")
    .optional()
    .describe("Reporting period in format yyyyMMdd-yyyyMMdd, e.g., 20241128-20250828. Defaults to last 365 days if omitted"),
  interval: z.enum(["day", "week", "month", "quarter", "year"])
    .optional()
    .default("month")
    .describe("Reporting interval. Defaults to 'month'"),
  region: z.enum(["europe", "asia", "north_america", "emea", "apac"])
    .optional()
    .describe("Filter by region (optional)"),
  currency: z.string().length(3)
    .optional()
    .describe("Filter by 3-letter currency code in lower case, e.g., usd, eur (optional)"),
  billing_freq: z.enum(["month", "quarter", "year", "week"])
    .optional()
    .describe("Filter by billing frequency (month, year, quarter, week - optional)"),
  payment_method: z.string()
    .optional()
    .describe("Filter by payment method, e.g., visa, mastercard (optional)"),
  age: z.string()
    .optional()
    .describe("Filter by customer age group (optional)")
});

export const getMRROutput = z.object({
  date: z.string(),
  end_date: z.string(),
  new: z.number(),
  expansion: z.number(),
  contraction: z.number(),
  churn: z.number(),
  reactivation: z.number(),
  mrr_diff: z.number(),
  total_mrr: z.number(),
  total_arr: z.number(),
  total_customers: z.number(),
  arpa: z.number().optional(),
  asp: z.number().optional(),
  ltv: z.number().optional(),
  customer_churn_rate: z.number(),
  mrr_churn_rate: z.number(),
  net_mrr_churn_rate: z.number(),
  fx_adjustment: z.number(),
  customers_diff: z.number(),
  new_customers: z.number(),
  expansion_customers: z.number(),
  contraction_customers: z.number(),
  churn_customers: z.number(),
  reactivation_customers: z.number(),
  segment_entry: z.number(),
  segment_entry_customers: z.number(),
  segment_exit: z.number(),
  segment_exit_customers: z.number(),
  update: z.number().nullable(),
  update_customers: z.number().nullable(),
  customer_change_pct: z.number(),
  mrr_change_pct: z.number(),
  customer_churn_avg: z.number(),
  net_mrr_diff: z.number()
});

// API Response wrapper
const getMRRApiResponse = z.object({
  result: z.array(getMRROutput)
});

export const getMRR = {
  name: "getMRR",
  description: "Retrieve MRR, ARR, ARPA, ASP, churn metrics, customer movements, LTV, FX adjustments, and net MRR movements from GrowPanel",
  input: getMRRInput,
  output: z.object({ content: z.array(z.any()) }), // MCP requires content array
  async run(params: any) {
    console.log("🔧 getMRR.run called with params:", JSON.stringify(params, null, 2));
    
    const parsed = getMRRInput.parse(params);
    const filters: any = { ...parsed };

    // Provide default date if not specified (last 365 days)
    if (!filters.date) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 365);
      const format = (d: Date) =>
        d.toISOString().slice(0, 10).replace(/-/g, "");
      filters.date = `${format(start)}-${format(end)}`;
    }

    console.log("📊 Calling API with filters:", JSON.stringify(filters, null, 2));
    const apiResponse = await callApi("mrr", filters);
    console.log("📈 Raw API response:", JSON.stringify(apiResponse, null, 2));

    // Parse and validate the API response
    const validatedResponse = getMRRApiResponse.parse(apiResponse);
    console.log("✅ Validated response:", JSON.stringify(validatedResponse, null, 2));

    // Format the data for MCP
    const formattedData = validatedResponse.result.map(item => ({
      date: item.date,
      end_date: item.end_date,
      total_mrr: `$${(item.total_mrr / 100).toLocaleString()}`,
      total_arr: `$${(item.total_arr / 100).toLocaleString()}`,
      new: `$${(item.new / 100).toLocaleString()}`,
      expansion: `$${(item.expansion / 100).toLocaleString()}`,
      contraction: `$${(item.contraction / 100).toLocaleString()}`,
      churn: `$${(item.churn / 100).toLocaleString()}`,
      mrr_diff: `$${(item.mrr_diff / 100).toLocaleString()}`,
      net_mrr_diff: `$${(item.net_mrr_diff / 100).toLocaleString()}`,
      total_customers: item.total_customers.toLocaleString(),
      customer_churn_rate: `${item.customer_churn_rate}%`,
      mrr_churn_rate: `${item.mrr_churn_rate}%`,
      net_mrr_churn_rate: `${item.net_mrr_churn_rate}%`,
      arpa: item.arpa ? `$${(item.arpa / 100).toLocaleString()}` : null,
      asp: item.asp ? `$${(item.asp / 100).toLocaleString()}` : null,
      ltv: item.ltv ? `$${(item.ltv / 100).toLocaleString()}` : null,
    }));

    return {
      content: [
        {
          type: "text",
          text: `# MRR Report\n\n${formattedData.map(item => 
            `## ${item.date}\n` +
            `- **Total MRR**: ${item.total_mrr}\n` +
            `- **Total ARR**: ${item.total_arr}\n` +
            `- **MRR Change**: ${item.mrr_diff}\n` +
            `- **Net MRR Change**: ${item.net_mrr_diff}\n` +
            `- **New MRR**: ${item.new}\n` +
            `- **Expansion**: ${item.expansion}\n` +
            `- **Contraction**: ${item.contraction}\n` +
            `- **Churn**: ${item.churn}\n` +
            `- **Total Customers**: ${item.total_customers}\n` +
            `- **Customer Churn Rate**: ${item.customer_churn_rate}\n` +
            `- **MRR Churn Rate**: ${item.mrr_churn_rate}\n` +
            `- **Net MRR Churn Rate**: ${item.net_mrr_churn_rate}\n` +
            (item.arpa ? `- **ARPA**: ${item.arpa}\n` : '') +
            (item.asp ? `- **ASP**: ${item.asp}\n` : '') +
            (item.ltv ? `- **LTV**: ${item.ltv}\n` : '') +
            `\n`
          ).join('')}`
        },
        {
          type: "text",
          text: `Raw data:\n\`\`\`json\n${JSON.stringify(validatedResponse.result, null, 2)}\n\`\`\``
        }
      ]
    };
  }
};