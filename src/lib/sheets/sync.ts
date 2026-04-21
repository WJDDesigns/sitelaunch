/* ── Google Sheets sync ───────────────────────────────────────────────
 * Called fire-and-forget after form submission to append a row
 * to each enabled Google Sheets feed for that form.
 * ─────────────────────────────────────────────────────────────────── */

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/cloud/encryption";
import { appendRow, refreshSheetsToken } from "./google-sheets";
import { encryptToken } from "@/lib/cloud/encryption";
import { formatFieldValue } from "@/lib/format-field-value";
import type { FormSchema, FieldDef } from "@/lib/forms";

interface SheetsFeed {
  id: string;
  spreadsheet_id: string;
  sheet_name: string;
  field_map: { fieldId: string; column: string }[] | null;
}

/**
 * Append submission data to all enabled Google Sheets feeds for the form.
 */
export async function fireSheetsSync(submissionId: string): Promise<void> {
  const admin = createAdminClient();

  // Load submission
  const { data: sub, error: subErr } = await admin
    .from("submissions")
    .select("id, partner_id, partner_form_id, data, client_email, client_name, submitted_at")
    .eq("id", submissionId)
    .maybeSingle();

  if (subErr || !sub) {
    console.error("[sheets-sync] submission not found:", subErr?.message ?? submissionId);
    return;
  }

  // Get enabled feeds for this form
  const { data: feeds, error: feedErr } = await admin
    .from("sheets_feeds")
    .select("id, spreadsheet_id, sheet_name, field_map")
    .eq("partner_form_id", sub.partner_form_id)
    .eq("partner_id", sub.partner_id)
    .eq("is_enabled", true);

  if (feedErr || !feeds || feeds.length === 0) return;

  // Load form schema for field order + formatting
  const { data: pf } = await admin
    .from("partner_forms")
    .select("form_templates ( schema )")
    .eq("id", sub.partner_form_id)
    .maybeSingle();

  const tplRaw = pf?.form_templates;
  const tplObj = Array.isArray(tplRaw) ? tplRaw[0] : tplRaw;
  const schema = (tplObj?.schema as FormSchema) ?? null;

  // Get tokens -- try dedicated sheets_connections first, fall back to cloud_integrations google_drive
  const { data: sheetsConn } = await admin
    .from("sheets_connections")
    .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("partner_id", sub.partner_id)
    .maybeSingle();

  const conn = sheetsConn ?? (await admin
    .from("cloud_integrations")
    .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at")
    .eq("partner_id", sub.partner_id)
    .eq("provider", "google_drive")
    .maybeSingle()).data;

  if (!conn) {
    console.error("[sheets-sync] no sheets/drive connection for partner:", sub.partner_id);
    return;
  }

  const table = sheetsConn ? "sheets_connections" : "cloud_integrations";

  // Decrypt + possibly refresh the token
  let accessToken = decryptToken(conn.access_token_encrypted);
  const refreshToken = decryptToken(conn.refresh_token_encrypted);

  if (conn.token_expires_at && new Date(conn.token_expires_at) <= new Date()) {
    try {
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
    } catch (err) {
      console.error("[sheets-sync] token refresh failed:", err);
      return;
    }
  }

  const rawData = (sub.data ?? {}) as Record<string, unknown>;

  // Build schema-aligned fields list for auto-map
  const allFields: FieldDef[] = schema?.steps?.flatMap((s) => s.fields) ?? [];

  // Sync to each feed concurrently
  await Promise.allSettled(
    (feeds as SheetsFeed[]).map(async (feed) => {
      try {
        let values: (string | number | boolean | null)[];

        if (feed.field_map && feed.field_map.length > 0) {
          // Mapped fields -- in the order defined by field_map
          values = feed.field_map.map((m) => {
            const field = allFields.find((f) => f.id === m.fieldId);
            const val = rawData[m.fieldId];
            if (field && val !== undefined && val !== null && val !== "") {
              return formatFieldValue(val, field);
            }
            return formatCellValue(val);
          });
        } else {
          // Auto-map: "Submitted At" + each schema field in order
          // This matches the header order used in FormSendToPanel.tsx:
          // ["Submitted At", ...schema.steps.flatMap(s => s.fields.map(f => f.label))]
          values = [sub.submitted_at ?? new Date().toISOString()];
          for (const field of allFields) {
            const val = rawData[field.id];
            if (val === undefined || val === null || val === "") {
              values.push("");
            } else {
              values.push(formatFieldValue(val, field));
            }
          }
        }

        await appendRow(accessToken, feed.spreadsheet_id, feed.sheet_name, values);
      } catch (err) {
        console.error(`[sheets-sync] failed for feed ${feed.id}:`, err);
      }
    }),
  );
}

function formatCellValue(val: unknown): string | number | boolean | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") return val;
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}
