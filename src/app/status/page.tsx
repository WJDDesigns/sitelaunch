import { createAdminClient } from "@/lib/supabase/admin";
import StatusPageClient from "./StatusPageClient";

export const revalidate = 60; // Revalidate every 60 seconds

interface StatusUpdate {
  id: string;
  title: string;
  message: string;
  severity: string;
  component: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

const COMPONENTS = [
  { key: "platform", label: "Platform", icon: "fa-server" },
  { key: "api", label: "API", icon: "fa-code" },
  { key: "database", label: "Database", icon: "fa-database" },
  { key: "storage", label: "File Storage", icon: "fa-cloud" },
  { key: "authentication", label: "Authentication", icon: "fa-lock" },
  { key: "email", label: "Email Delivery", icon: "fa-envelope" },
  { key: "forms", label: "Form Submissions", icon: "fa-file-lines" },
];

function getOverallStatus(updates: StatusUpdate[]) {
  const active = updates.filter((u) => !u.is_resolved);
  if (active.length === 0) return "operational";
  if (active.some((u) => u.severity === "major_outage")) return "major_outage";
  if (active.some((u) => u.severity === "partial_outage")) return "partial_outage";
  if (active.some((u) => u.severity === "degraded")) return "degraded";
  if (active.some((u) => u.severity === "maintenance")) return "maintenance";
  return "operational";
}

function getComponentStatus(componentKey: string, updates: StatusUpdate[]) {
  const active = updates.filter((u) => !u.is_resolved && u.component === componentKey);
  if (active.length === 0) return "operational";
  // Return the worst severity
  const severityOrder = ["major_outage", "partial_outage", "degraded", "maintenance", "info"];
  for (const sev of severityOrder) {
    if (active.some((u) => u.severity === sev)) return sev;
  }
  return "operational";
}

export default async function StatusPage() {
  const admin = createAdminClient();

  // Get last 30 days of status updates
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: updates } = await admin
    .from("status_updates")
    .select("id, title, message, severity, component, is_resolved, resolved_at, created_at")
    .gte("created_at", thirtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  const statusUpdates = (updates ?? []) as StatusUpdate[];
  const overallStatus = getOverallStatus(statusUpdates);

  const componentStatuses = COMPONENTS.map((c) => ({
    ...c,
    status: getComponentStatus(c.key, statusUpdates),
  }));

  const activeIncidents = statusUpdates.filter((u) => !u.is_resolved);
  const resolvedIncidents = statusUpdates.filter((u) => u.is_resolved);

  return (
    <StatusPageClient
      overallStatus={overallStatus}
      components={componentStatuses}
      activeIncidents={activeIncidents}
      resolvedIncidents={resolvedIncidents}
    />
  );
}
