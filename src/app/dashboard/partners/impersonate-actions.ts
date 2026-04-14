"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireSuperadmin, IMPERSONATE_COOKIE } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function startImpersonation(partnerId: string) {
  await requireSuperadmin();

  // Verify partner exists
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("id, name")
    .eq("id", partnerId)
    .maybeSingle();

  if (!partner) throw new Error("Partner not found");

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, partnerId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 4, // 4 hours max
  });

  redirect("/dashboard");
}

export async function stopImpersonation() {
  await requireSuperadmin();

  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATE_COOKIE);

  redirect("/dashboard");
}
