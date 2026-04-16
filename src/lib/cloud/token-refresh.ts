import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, decryptToken } from "./encryption";
import { getProviderClient, type CloudProvider } from "./providers";

/**
 * Get a valid access token for a cloud integration, refreshing if expired.
 * Returns { accessToken, integration } or throws if the integration is missing/broken.
 */
export async function getValidAccessToken(integrationId: string): Promise<{
  accessToken: string;
  integration: {
    id: string;
    partner_id: string;
    provider: CloudProvider;
  };
}> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("cloud_integrations")
    .select("id, partner_id, provider, access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("id", integrationId)
    .maybeSingle();

  if (error || !row) throw new Error("Cloud integration not found");

  const provider = row.provider as CloudProvider;
  const bufferMs = 5 * 60 * 1000; // 5-minute buffer
  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0;
  const isExpired = !expiresAt || Date.now() > expiresAt - bufferMs;

  if (!isExpired) {
    return {
      accessToken: decryptToken(row.access_token_encrypted),
      integration: { id: row.id, partner_id: row.partner_id, provider },
    };
  }

  // Token is expired or about to expire, refresh it
  const refreshToken = decryptToken(row.refresh_token_encrypted);
  const client = await getProviderClient(provider);
  const result = await client.refreshAccessToken(refreshToken);

  // Update the DB with the new tokens
  const updates: Record<string, unknown> = {
    access_token_encrypted: encryptToken(result.accessToken),
  };
  if (result.expiresIn) {
    updates.token_expires_at = new Date(Date.now() + result.expiresIn * 1000).toISOString();
  }
  if (result.refreshToken) {
    updates.refresh_token_encrypted = encryptToken(result.refreshToken);
  }

  await admin.from("cloud_integrations").update(updates).eq("id", row.id);

  return {
    accessToken: result.accessToken,
    integration: { id: row.id, partner_id: row.partner_id, provider },
  };
}

/**
 * Get a valid access token by partner + provider (convenience wrapper).
 */
export async function getValidAccessTokenByPartner(
  partnerId: string,
  provider: CloudProvider,
): Promise<{ accessToken: string; integrationId: string } | null> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("cloud_integrations")
    .select("id")
    .eq("partner_id", partnerId)
    .eq("provider", provider)
    .maybeSingle();

  if (!row) return null;

  const result = await getValidAccessToken(row.id);
  return { accessToken: result.accessToken, integrationId: row.id };
}
