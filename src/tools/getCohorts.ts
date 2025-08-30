import { z } from "zod";
import { callApi } from "../utils/api.js";
import { subDays, format } from "date-fns";

/**
 * getCohorts Tool
 *
 * Description:
 * Retrieves cohort analysis metrics from GrowPanel for a given date range and optional filters.
 * Includes initial MRR and customers for each cohort group, and retention/churn metrics over periods.
 *
 * API Endpoint:
 * https://api.growpanel.io/reports/cohorts
 *
 * Available query parameters (filters):
 * - date (yyyyMMdd-yyyyMMdd, optional): Reporting period. Defaults to last 365 days.
 * - interval (string, optional): Reporting interval. Options: day, week, month, quarter, year. Defaults to month.
 * - region (optional): Filter by region. Options: europe, asia, north_america, emea, apac.
 * - currency (optional): Filter by 3-letter currency code, e.g., USD, EUR.
 * - billing_freq (optional): month, quarter, year, week
 * - payment_method (optional)
 * - age (optional)
 *
 * Output fields:
 * - list: array of cohort items
 *   - cohort_group: start date of cohort
 *   - initial_mrr: MRR at cohort start
 *   - initial_customers: number of customers at cohort start
 *   - periods: array of objects for each period after cohort start
 *     - customers_change: net change in customers
 *     - mrr_retained: MRR retained
 *     - customers_retained: customers retained
 *     - mrr_retention: % of MRR retained
 *     - customer_retention: % of customers retained
 *     - mrr_retention_relative: % MRR retained relative to previous period
 *     - customer_retention_relative: % customers retained relative to previous period
 *     - mrr_churn: % MRR lost
 *     - customer_churn: % customers lost
 *     - mrr_churn_relative: % MRR lost relative to previous period
 *     - customer_churn_relative: % customers lost relative to previous period
 */

const cohortPeriodSchema = z.object({
  customers_change: z.number(),
  mrr_retained: z.number(),
  customers_retained: z.number(),
  mrr_retention: z.number(),
  customer_retention: z.number(),
  mrr_retention_relative: z.number(),
  customer_retention_relative: z.number(),
  mrr_churn: z.number(),
  customer_churn: z.number(),
  mrr_churn_relative: z.number(),
  customer_churn_relative: z.number()
});

const cohortItemSchema = z.object({
  cohort_group: z.string(),
  initial_mrr: z.number(),
  initial_customers: z.number(),
  periods: cohortPeriodSchema.array()
});

export const getCohortsInput = z.object({
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
  billing_freq: z.enum(["month", "quarter", "year", "week"])
    .optional()
    .describe("Billing frequency (optional)"),
  payment_method: z.string()
    .optional()
    .describe("Filter by payment method (optional)"),
  age: z.string()
    .optional()
    .describe("Filter by customer age group (optional)")
});

export const getCohortsOutput = z.object({
  list: cohortItemSchema.array()
});

export const getCohorts = {
  name: "getCohorts",
  description: "Retrieve cohort metrics from GrowPanel, including MRR and customer retention/churn over periods",
  input: getCohortsInput,
  output: z.object({ content: z.array(z.any()) }),
  async run(params: any) {
    const parsed = getCohortsInput.parse(params);
    const filters: any = { ...parsed };

    // Default date to last 365 days if omitted
    if (!filters.date) {
      const end = new Date();
      const start = subDays(end, 365);
      filters.date = `${format(start, "yyyyMMdd")}-${format(end, "yyyyMMdd")}`;
    }

    const apiResponse = await callApi("cohort", filters);

    // Just return the API response as-is, no validation needed
    return {
        content: [{
          type: "text",
          text: JSON.stringify(apiResponse, null, 2)
        }]
      };
  }
};
