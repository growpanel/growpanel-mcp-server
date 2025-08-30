import { z } from "zod";
import { callApi } from "../utils/api.js";
import { subDays, format } from "date-fns";

/**
 * getLeads Tool
 *
 * Description:
 * Retrieves lead, trial, and conversion metrics from GrowPanel for a given date range and optional filters.
 * Metrics include total leads, trials, converted trials, conversion rates, forecasted conversions, and growth rates.
 *
 * API Endpoint:
 * https://api.growpanel.io/reports/leads
 *
 * Available query parameters (filters):
 * - date (yyyyMMdd-yyyyMMdd, optional): Reporting period. Defaults to last 365 days.
 * - interval (string, optional): Reporting interval. Options: day, week, month, quarter, year. Defaults to month.
 * - region (optional): Filter by region. Options: europe, asia, north_america, emea, apac.
 * - currency (optional): Filter by 3-letter currency code, e.g., USD, EUR.
 * - payment_method (optional): Filter by payment method, e.g., visa, mastercard, paypal.
 * - age (optional): Filter by customer age group.
 *
 * Output fields (per period):
 * - date: reporting period (yyyyMMdd)
 * - leads: number of leads
 * - leads_percent_change: % change in leads from previous period
 * - trials: number of trials started
 * - trials_percent_change: % change in trials from previous period
 * - converted: number of trials converted to paying customers
 * - lead_to_trial_rate: % of leads that became trials
 * - lead_to_trial_rate_percent_change: % change from previous period
 * - trial_to_paid_rate: % of trials that became paid
 * - trial_to_paid_rate_percent_change: % change from previous period
 * - lead_to_paid_rate: % of leads that became paid
 * - lead_to_paid_rate_percent_change: % change from previous period
 * - lead_to_paid_days: average days from lead to paid
 * - trial_to_paid_days: average days from trial to paid
 * - conversions_forecast: optional forecasted conversions
 * - trial_to_paid_rate_forecast: optional forecasted trial-to-paid %
 * - growthRate1..growthRate4: various growth metrics
 */

export const getLeadsInput = z.object({
  date: z.string()
    .regex(/^\d{8}-\d{8}$/, "Date must be in format yyyyMMdd-yyyyMMdd")
    .optional()
    .describe("Reporting period in format yyyyMMdd-yyyyMMdd. Defaults to last 365 days if omitted"),
  interval: z.enum(["day", "week", "month", "quarter", "year"])
    .optional()
    .default("month")
    .describe("Reporting interval. Defaults to 'month'"),
  region: z.enum(["europe", "asia", "north_america", "emea", "apac"])
    .optional()
    .describe("Filter by region (optional)"),
  currency: z.string().length(3)
    .optional()
    .describe("Filter by 3-letter currency code, e.g., usd, eur (optional)"),
  payment_method: z.string()
    .optional()
    .describe("Filter by payment method, e.g., visa, mastercard (optional)"),
  age: z.string()
    .optional()
    .describe("Filter by customer age group (optional)")
});

export const getLeadsOutput = z.object({
  date: z.string(),
  leads: z.number(),
  leads_percent_change: z.number(),
  trials: z.number(),
  trials_percent_change: z.number(),
  converted: z.number(),
  lead_to_trial_rate: z.number(),
  lead_to_trial_rate_percent_change: z.number(),
  trial_to_paid_rate: z.number(),
  trial_to_paid_rate_percent_change: z.number(),
  lead_to_paid_rate: z.number(),
  lead_to_paid_rate_percent_change: z.number(),
  lead_to_paid_days: z.number(),
  trial_to_paid_days: z.number(),
  conversions_forecast: z.number().nullable(),
  trial_to_paid_rate_forecast: z.number().nullable(),
  growthRate1: z.number().nullable(),
  growthRate2: z.number().nullable(),
  growthRate3: z.number().nullable(),
  growthRate4: z.number().nullable()
});

export const getLeads = {
  name: "getLeads",
  description: "Retrieve lead, trial, and conversion metrics from GrowPanel, including conversion rates, trial stats, and forecasts",
  input: getLeadsInput,
  output: z.object({ content: z.array(z.any()) }),
  async run(params: any) {
    const parsed = getLeadsInput.parse(params);
    const filters: any = { ...parsed };

    // Default to last 365 days if no date provided
    if (!filters.date) {
      const end = new Date();
      const start = subDays(end, 365);
      filters.date = `${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}`;
    }

    const apiResponse = await callApi("leads", filters);

    // Just return the API response as-is, no validation needed
    return {
        content: [{
          type: "text",
          text: JSON.stringify(apiResponse, null, 2)
        }]
      };
  }
};
