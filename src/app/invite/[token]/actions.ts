"use server";

import { acceptPartnerInvite } from "@/lib/partner-invites";

export async function acceptInviteAction(
  token: string,
  fullName: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  return acceptPartnerInvite({ token, fullName, password });
}
