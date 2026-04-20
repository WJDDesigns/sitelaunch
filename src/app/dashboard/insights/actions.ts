"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

/* ── Widget type definitions ──────────────────────────────── */

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "radar";
export type WidgetType = "number" | "chart" | "table";
export type WidgetSize = "sm" | "md" | "lg" | "xl";
export type WidgetOrientation = "landscape" | "portrait";
export type AggregateFunction = "count" | "sum" | "avg" | "min" | "max" | "unique";

export interface WidgetDataSource {
  /** Which form to pull data from (null = all forms) */
  formId: string | null;
  /** Which field key to aggregate on */
  fieldKey: string;
  /** Human-readable field label */
  fieldLabel: string;
  /** Aggregate function */
  aggregate: AggregateFunction;
  /** For charts: optional groupBy field */
  groupByField?: string;
  groupByLabel?: string;
  /** Optional status filter */
  statusFilter?: string[];
  /** Time range in days (0 = all time) */
  timeRangeDays: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  chartType?: ChartType;
  title: string;
  size: WidgetSize;
  orientation: WidgetOrientation;
  dataSource: WidgetDataSource;
  /** Grid position */
  order: number;
  /** Color accent for the widget */
  color?: string;
}

export interface InsightDashboard {
  id: string;
  partner_id: string;
  name: string;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}

/* ── Actions ──────────────────────────────────────────────── */

export async function getDashboard(): Promise<InsightDashboard | null> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("insight_dashboards")
    .select("id, partner_id, name, widgets, created_at, updated_at")
    .eq("partner_id", account.id)
    .eq("name", "My Dashboard")
    .maybeSingle();

  return data as InsightDashboard | null;
}

export async function saveDashboardWidgets(widgets: Widget[], tabKey = "all"): Promise<void> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No workspace");

  const admin = createAdminClient();
  const name = tabKey === "all" ? "My Dashboard" : `form:${tabKey}`;

  // Upsert — create if first time, update if exists
  const { error } = await admin
    .from("insight_dashboards")
    .upsert(
      {
        partner_id: account.id,
        name,
        widgets: JSON.parse(JSON.stringify(widgets)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partner_id,name" },
    );

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/insights");
}

/** Fetch aggregated data for all widgets in one go */
export async function fetchInsightsData(
  widgets: Widget[],
): Promise<Record<string, unknown>> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return {};

  const admin = createAdminClient();

  // Load all submissions with their data
  const { data: allSubmissions } = await admin
    .from("submissions")
    .select("id, status, client_name, client_email, created_at, submitted_at, form_slug, partner_form_id, data")
    .eq("partner_id", account.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  const submissions = allSubmissions ?? [];

  // Load form field definitions so we can label things
  const { data: forms } = await admin
    .from("partner_forms")
    .select("id, name, slug, schema")
    .eq("partner_id", account.id);

  const formList = forms ?? [];

  const results: Record<string, unknown> = {};

  for (const widget of widgets) {
    const ds = widget.dataSource;

    // Filter by form
    let filtered = submissions;
    if (ds.formId) {
      filtered = filtered.filter((s) => s.partner_form_id === ds.formId);
    }

    // Filter by status
    if (ds.statusFilter && ds.statusFilter.length > 0) {
      filtered = filtered.filter((s) => ds.statusFilter!.includes(s.status as string));
    }

    // Filter by time range
    if (ds.timeRangeDays > 0) {
      const cutoff = new Date(Date.now() - ds.timeRangeDays * 86400000).toISOString();
      filtered = filtered.filter((s) => (s.created_at as string) >= cutoff);
    }

    // Extract field values
    const values: unknown[] = [];
    for (const sub of filtered) {
      const data = (sub.data ?? {}) as Record<string, unknown>;
      if (ds.fieldKey === "__count") {
        values.push(1);
      } else if (ds.fieldKey === "__status") {
        values.push(sub.status);
      } else if (ds.fieldKey === "__client_name") {
        values.push(sub.client_name);
      } else if (ds.fieldKey === "__client_email") {
        values.push(sub.client_email);
      } else if (ds.fieldKey === "__created_at") {
        values.push(sub.created_at);
      } else if (ds.fieldKey === "__submitted_at") {
        values.push(sub.submitted_at);
      } else {
        values.push(data[ds.fieldKey] ?? null);
      }
    }

    if (widget.type === "number") {
      results[widget.id] = computeAggregate(values, ds.aggregate);
    } else if (widget.type === "chart") {
      // Group values
      const groupValues: unknown[] = [];
      if (ds.groupByField) {
        for (const sub of filtered) {
          const data = (sub.data ?? {}) as Record<string, unknown>;
          if (ds.groupByField === "__status") {
            groupValues.push(sub.status);
          } else if (ds.groupByField === "__created_at") {
            // Group by date
            groupValues.push((sub.created_at as string)?.slice(0, 10));
          } else if (ds.groupByField === "__submitted_at") {
            groupValues.push((sub.submitted_at as string)?.slice(0, 10));
          } else {
            groupValues.push(data[ds.groupByField] ?? "Unknown");
          }
        }
      } else {
        // If no group-by, group by the field value itself (for pie/donut)
        for (const v of values) {
          groupValues.push(v ?? "Unknown");
        }
      }

      const grouped = groupBy(values, groupValues, ds.aggregate);
      results[widget.id] = grouped;
    } else if (widget.type === "table") {
      // Return raw rows
      const rows = filtered.slice(0, 100).map((sub) => {
        const data = (sub.data ?? {}) as Record<string, unknown>;
        return {
          client_name: sub.client_name ?? "—",
          client_email: sub.client_email ?? "—",
          status: sub.status,
          created_at: sub.created_at,
          value: ds.fieldKey.startsWith("__")
            ? (sub as Record<string, unknown>)[ds.fieldKey.replace("__", "")] ?? null
            : data[ds.fieldKey] ?? null,
        };
      });
      results[widget.id] = rows;
    }
  }

  // Also return form list and field map for the widget editor
  const fieldMap: Record<string, { key: string; label: string; type: string }[]> = {};
  for (const form of formList) {
    const schema = form.schema as { steps?: { fields?: { key: string; label: string; type: string }[] }[] } | null;
    const fields: { key: string; label: string; type: string }[] = [];
    if (schema?.steps) {
      for (const step of schema.steps) {
        for (const field of step.fields ?? []) {
          if (field.type !== "heading" && field.type !== "consent" && field.type !== "captcha") {
            fields.push({ key: field.key, label: field.label, type: field.type });
          }
        }
      }
    }
    fieldMap[form.id as string] = fields;
  }

  results.__forms = formList.map((f) => ({ id: f.id, name: f.name, slug: f.slug }));
  results.__fieldMap = fieldMap;

  return results;
}

/* ── Helpers ──────────────────────────────────────────────── */

function computeAggregate(values: unknown[], fn: AggregateFunction): number {
  const nonNull = values.filter((v) => v != null);
  switch (fn) {
    case "count":
      return nonNull.length;
    case "sum": {
      let total = 0;
      for (const v of nonNull) {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!isNaN(n)) total += n;
      }
      return total;
    }
    case "avg": {
      let sum = 0;
      let count = 0;
      for (const v of nonNull) {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!isNaN(n)) { sum += n; count++; }
      }
      return count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
    }
    case "min": {
      let m = Infinity;
      for (const v of nonNull) {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!isNaN(n) && n < m) m = n;
      }
      return m === Infinity ? 0 : m;
    }
    case "max": {
      let m = -Infinity;
      for (const v of nonNull) {
        const n = typeof v === "number" ? v : parseFloat(String(v));
        if (!isNaN(n) && n > m) m = n;
      }
      return m === -Infinity ? 0 : m;
    }
    case "unique":
      return new Set(nonNull.map(String)).size;
    default:
      return nonNull.length;
  }
}

function groupBy(
  values: unknown[],
  groupKeys: unknown[],
  aggregate: AggregateFunction,
): { name: string; value: number }[] {
  const groups: Record<string, unknown[]> = {};
  for (let i = 0; i < values.length; i++) {
    const key = String(groupKeys[i] ?? "Unknown");
    if (!groups[key]) groups[key] = [];
    groups[key].push(values[i]);
  }

  return Object.entries(groups)
    .map(([name, vals]) => ({
      name,
      value: computeAggregate(vals, aggregate),
    }))
    .sort((a, b) => b.value - a.value);
}
