"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import {
  getAllCacheStats,
  flushAllCaches,
  flushCacheByName,
  setCacheEnabled,
  type CacheStats,
} from "@/lib/cache-manager";

interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function getCacheStatsAction(): Promise<CacheStats[]> {
  await requireSuperadmin();
  return getAllCacheStats();
}

export async function flushAllCachesAction(): Promise<ActionResult> {
  await requireSuperadmin();
  flushAllCaches();
  revalidatePath("/dashboard/admin/speed");
  return { ok: true };
}

export async function flushCacheAction(name: string): Promise<ActionResult> {
  await requireSuperadmin();
  const ok = flushCacheByName(name);
  if (!ok) return { ok: false, error: "Cache not found." };
  revalidatePath("/dashboard/admin/speed");
  return { ok: true };
}

export async function toggleCacheAction(
  name: string,
  enabled: boolean,
): Promise<ActionResult> {
  await requireSuperadmin();
  const ok = setCacheEnabled(name, enabled);
  if (!ok) return { ok: false, error: "Cache not found." };
  revalidatePath("/dashboard/admin/speed");
  return { ok: true };
}

/**
 * Trigger a full revalidation of all dashboard pages.
 */
export async function revalidateAllAction(): Promise<ActionResult> {
  await requireSuperadmin();
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
