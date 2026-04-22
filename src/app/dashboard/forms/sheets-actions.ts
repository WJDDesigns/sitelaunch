"use server";

import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/cloud/encryption";
import { refreshSheetsToken, createSpreadsheet } from "@/lib/sheets/google-sheets";

/* ── Helpers ──────────────────────────────────────────────────────── */

async function getAccessToken(partnerId: string): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Try dedicated sheets_connections first
  const { data: sheetsConn } = await admin
    .from("sheets_connections")
    .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("partner_id", partnerId)
    .maybeSingle();

  if (sheetsConn) {
    return resolveToken(admin, sheetsConn, "sheets_connections");
  }

  // 2. Fall back to cloud_integrations google_drive (includes spreadsheets scope)
  const { data: driveConn } = await admin
    .from("cloud_integrations")
    .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("partner_id", partnerId)
    .eq("provider", "google_drive")
    .maybeSingle();

  if (driveConn) {
    return resolveToken(admin, driveConn, "cloud_integrations");
  }

  return null;
}

async function resolveToken(
  admin: ReturnType<typeof createAdminClient>,
  conn: { id: string; access_token_encrypted: string; refresh_token_encrypted: string; token_expires_at: string | null },
  table: "sheets_connections" | "cloud_integrations",
): Promise<string | null> {
  let accessToken = decryptToken(conn.access_token_encrypted);

  if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
    try {
      const refreshToken = decryptToken(conn.refresh_token_encrypted);
      const refreshed = await refreshSheetsToken(refreshToken);
      accessToken = refreshed.accessToken;
      await admin
        .from(table)
        .update({
          access_token_encrypted: encryptToken(refreshed.accessToken),
          token_expires_at: refreshed.expiresIn
            ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
            : null,
        })
        .eq("id", conn.id);
    } catch {
      return null;
    }
  }

  return accessToken;
}

/* ── Actions ──────────────────────────────────────────────────────── */

export async function createSheetsFeedAction(
  formId: string,
  data: {
    spreadsheetId?: string;
    spreadsheetName?: string;
    sheetName?: string;
    fieldMap?: { fieldId: string; column: string }[] | null;
    createNew?: boolean;
    newTitle?: string;
    headers?: string[];
  },
): Promise<{ ok: boolean; error?: string; id?: string; spreadsheetUrl?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account" };

  let spreadsheetId = data.spreadsheetId ?? "";
  let spreadsheetName = data.spreadsheetName ?? "";

  // Create a new spreadsheet if requested
  if (data.createNew && data.newTitle) {
    const accessToken = await getAccessToken(account.id);
    if (!accessToken) return { ok: false, error: "Google Sheets not connected. Connect it first in Integrations." };

    try {
      const headers = data.headers ?? ["Submitted At", "Name", "Email"];
      const sheet = await createSpreadsheet(accessToken, data.newTitle, headers);
      spreadsheetId = sheet.id;
      spreadsheetName = sheet.name;
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Failed to create spreadsheet" };
    }
  }

  if (!spreadsheetId) return { ok: false, error: "Spreadsheet ID is required." };

  const admin = createAdminClient();
  const { data: feed, error } = await admin
    .from("sheets_feeds")
    .insert({
      partner_id: account.id,
      partner_form_id: formId,
      spreadsheet_id: spreadsheetId,
      spreadsheet_name: spreadsheetName,
      sheet_name: data.sheetName ?? (data.createNew ? "Submissions" : "Sheet1"),
      field_map: data.fieldMap ?? null,
      is_enabled: true,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    id: feed.id,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

export async function updateSheetsFeedAction(
  feedId: string,
  formId: string,
  data: {
    sheetName?: string;
    fieldMap?: { fieldId: string; column: string }[] | null;
    isEnabled?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account" };

  const admin = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.sheetName !== undefined) update.sheet_name = data.sheetName;
  if (data.fieldMap !== undefined) update.field_map = data.fieldMap;
  if (data.isEnabled !== undefined) update.is_enabled = data.isEnabled;

  const { error } = await admin
    .from("sheets_feeds")
    .update(update)
    .eq("id", feedId)
    .eq("partner_id", account.id)
    .eq("partner_form_id", formId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteSheetsFeedAction(
  feedId: string,
  formId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) return { ok: false, error: "No account" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("sheets_feeds")
    .delete()
    .eq("id", feedId)
    .eq("partner_id", account.id)
    .eq("partner_form_id", formId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
