"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type StatusSeverity = "operational" | "degraded" | "partial_outage" | "major_outage" | "maintenance" | "info";
export type StatusComponent = "platform" | "api" | "database" | "storage" | "authentication" | "email" | "forms";

export interface StatusUpdateRow {
  id: string;
  title: string;
  message: string;
  severity: StatusSeverity;
  component: StatusComponent;
  is_resolved: boolean;
  resolved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createStatusUpdateAction(data: {
  title: string;
  message: string;
  severity: StatusSeverity;
  component: StatusComponent;
}): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!data.title.trim()) return { ok: false, error: "Title is required." };
  if (!data.message.trim()) return { ok: false, error: "Message is required." };

  const admin = createAdminClient();
  const { error } = await admin.from("status_updates").insert({
    title: data.title.trim(),
    message: data.message.trim(),
    severity: data.severity,
    component: data.component,
    created_by: session.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/status");
  return { ok: true };
}

export async function resolveStatusUpdateAction(id: string): Promise<ActionResult> {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("status_updates")
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/status");
  return { ok: true };
}

export async function deleteStatusUpdateAction(id: string): Promise<ActionResult> {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("status_updates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/status");
  return { ok: true };
}

export async function getStatusUpdates(): Promise<StatusUpdateRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("status_updates")
    .select("id, title, message, severity, component, is_resolved, resolved_at, created_by, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as StatusUpdateRow[];
}
