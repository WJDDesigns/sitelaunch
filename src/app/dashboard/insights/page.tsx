import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import dynamic from "next/dynamic";
const InsightsDashboard = dynamic(() => import("./InsightsDashboard"), { ssr: false });
import type { InsightDashboard } from "./actions";

export default async function InsightsPage() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);

  if (!account) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10 py-8">
        <h1 className="text-3xl font-headline font-bold tracking-tight text-on-surface">Insights</h1>
        <p className="text-sm text-on-surface-variant mt-2">No workspace found.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  // Load ALL dashboard configs for this partner (all tabs)
  const { data: dashboards } = await admin
    .from("insight_dashboards")
    .select("*")
    .eq("partner_id", account.id);

  // Build a map: tabKey → widgets
  const dashboardMap: Record<string, InsightDashboard> = {};
  for (const d of (dashboards ?? []) as InsightDashboard[]) {
    if (d.name === "My Dashboard") {
      dashboardMap["all"] = d;
    } else if (d.name.startsWith("form:")) {
      dashboardMap[d.name.replace("form:", "")] = d;
    }
  }

  // Load forms + field schemas for widget editor
  const { data: forms } = await admin
    .from("partner_forms")
    .select("id, name, slug, schema")
    .eq("partner_id", account.id)
    .order("name");

  const formList = (forms ?? []).map((f) => ({
    id: f.id as string,
    name: f.name as string,
    slug: f.slug as string,
  }));

  // Build field map
  const fieldMap: Record<string, { key: string; label: string; type: string }[]> = {};
  for (const form of forms ?? []) {
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

  // Load submission data
  const { data: submissions } = await admin
    .from("submissions")
    .select("id, status, client_name, client_email, created_at, submitted_at, form_slug, partner_form_id, data")
    .eq("partner_id", account.id)
    .order("created_at", { ascending: false })
    .limit(2000);

  return (
    <InsightsDashboard
      dashboardMap={dashboardMap}
      forms={formList}
      fieldMap={fieldMap}
      submissions={(submissions ?? []) as Record<string, unknown>[]}
    />
  );
}
