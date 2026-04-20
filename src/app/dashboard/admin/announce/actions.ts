"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AnnouncementType = "info" | "warning" | "success" | "urgent";
export type AnnouncementAudience = "all" | "partners" | "agency_owners" | "superadmins";

export interface AnnouncementRow {
  id: string;
  title: string;
  message: string;
  icon: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  is_active: boolean;
  scheduled_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface ActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Create a new announcement.
 */
export async function createAnnouncementAction(data: {
  title: string;
  message: string;
  icon: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  scheduledAt: string | null;
  expiresAt: string | null;
}): Promise<ActionResult> {
  const session = await requireSuperadmin();
  if (!data.title.trim()) return { ok: false, error: "Title is required." };
  if (!data.message.trim()) return { ok: false, error: "Message is required." };

  const admin = createAdminClient();
  const { error } = await admin.from("announcements").insert({
    title: data.title.trim(),
    message: data.message.trim(),
    icon: data.icon || "fa-bullhorn",
    type: data.type,
    audience: data.audience,
    is_active: true,
    scheduled_at: data.scheduledAt || null,
    expires_at: data.expiresAt || null,
    created_by: session.userId,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Update an existing announcement.
 */
export async function updateAnnouncementAction(
  id: string,
  data: {
    title: string;
    message: string;
    icon: string;
    type: AnnouncementType;
    audience: AnnouncementAudience;
    isActive: boolean;
    scheduledAt: string | null;
    expiresAt: string | null;
  },
): Promise<ActionResult> {
  await requireSuperadmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("announcements")
    .update({
      title: data.title.trim(),
      message: data.message.trim(),
      icon: data.icon || "fa-bullhorn",
      type: data.type,
      audience: data.audience,
      is_active: data.isActive,
      scheduled_at: data.scheduledAt || null,
      expires_at: data.expiresAt || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Delete an announcement.
 */
export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  await requireSuperadmin();
  const admin = createAdminClient();
  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/admin/announce");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Dismiss an announcement for the current user.
 */
export async function dismissAnnouncementAction(announcementId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const { error } = await supabase.from("announcement_dismissals").insert({
    announcement_id: announcementId,
    user_id: user.id,
  });

  // Ignore unique violation (already dismissed)
  if (error && !error.message.includes("unique")) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Fetch active announcements visible to the current user.
 * Filters by audience, schedule window, and dismissals.
 */
export async function getActiveAnnouncements(
  userId: string,
  userRole: string,
): Promise<AnnouncementRow[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Fetch all active announcements within their schedule window
  const { data: announcements } = await admin
    .from("announcements")
    .select("id, title, message, icon, type, audience, is_active, scheduled_at, expires_at, created_by, created_at")
    .eq("is_active", true)
    .or(`scheduled_at.is.null,scheduled_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order("created_at", { ascending: false });

  if (!announcements || announcements.length === 0) return [];

  // Fetch dismissed IDs for this user
  const { data: dismissals } = await admin
    .from("announcement_dismissals")
    .select("announcement_id")
    .eq("user_id", userId);

  const dismissedIds = new Set((dismissals ?? []).map((d) => d.announcement_id));

  // Filter by audience and dismissals
  return announcements.filter((a) => {
    if (dismissedIds.has(a.id)) return false;

    switch (a.audience) {
      case "all":
        return true;
      case "partners":
        return userRole === "partner_owner" || userRole === "partner_member";
      case "agency_owners":
        return userRole === "partner_owner" || userRole === "superadmin";
      case "superadmins":
        return userRole === "superadmin";
      default:
        return false;
    }
  }) as AnnouncementRow[];
}
