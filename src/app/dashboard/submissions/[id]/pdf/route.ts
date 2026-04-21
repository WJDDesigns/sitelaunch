import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema, FieldDef } from "@/lib/forms";
import { formatFieldValue } from "@/lib/format-field-value";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireSession();
    const supabase = await createClient();

    const { data: sub, error } = await supabase
      .from("submissions")
      .select(
        `id, status, data, client_name, client_email, submitted_at, created_at,
         partners ( id, name, slug, primary_color, logo_url ),
         partner_forms ( id, form_templates ( schema ) )`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
    const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
    const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
    const schema = tpl?.schema as FormSchema | undefined;
    const data = (sub.data as Record<string, unknown>) ?? {};
    const primaryColor = partner?.primary_color || "#696cf8";
    const clientName = sub.client_name || "Untitled Submission";
    const partnerName = partner?.name || "linqme";

    // Build HTML for PDF
    let stepsHtml = "";
    if (schema) {
      for (const step of schema.steps) {
        let fieldsHtml = "";
        for (const f of step.fields) {
          if (f.type === "heading" || f.type === "captcha") continue;
          if (f.type === "file" || f.type === "files") {
            fieldsHtml += `
              <tr>
                <td class="label-cell">${escapeHtml(f.label)}</td>
                <td class="value-cell"><em style="color:#999;">See attachments</em></td>
              </tr>`;
            continue;
          }
          const v = data[f.id];
          let display = "\u2014";
          if (v !== undefined && v !== null && v !== "") {
            display = formatFieldValue(v, f as FieldDef);
          }
          fieldsHtml += `
            <tr>
              <td class="label-cell">${escapeHtml(f.label)}</td>
              <td class="value-cell">${escapeHtml(display)}</td>
            </tr>`;
        }
        stepsHtml += `
          <div class="step-section">
            <h2 class="step-title">${escapeHtml(step.title)}</h2>
            <table class="fields-table">${fieldsHtml}</table>
          </div>`;
      }
    }

    const submittedDate = sub.submitted_at
      ? new Date(sub.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : `Draft (started ${new Date(sub.created_at).toLocaleDateString()})`;

    const statusColors: Record<string, string> = {
      submitted: "#3b82f6", in_review: "#f59e0b", complete: "#10b981",
      archived: "#6b7280", draft: "#6b7280",
    };
    const statusColor = statusColors[sub.status as string] ?? primaryColor;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(clientName)} - Submission</title>
  <style>
    @page { margin: 48px 56px; size: A4; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      color: #1a1a2e; margin: 0; padding: 0; line-height: 1.6; font-size: 13px;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }

    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 3px solid ${primaryColor}; }
    .header h1 { font-size: 22px; font-weight: 800; margin: 0; color: #111; letter-spacing: -0.3px; }
    .header .subtitle { font-size: 12px; color: #666; margin: 4px 0 0 0; }
    .header .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${statusColor}; background: ${statusColor}15; border: 1px solid ${statusColor}30; }
    .header .date { font-size: 11px; color: #999; margin: 8px 0 0 0; }

    .meta-box { background: #f7f8fa; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px; border: 1px solid #eef0f2; }
    .meta-box table { width: 100%; font-size: 12px; border-collapse: collapse; }
    .meta-box td { padding: 4px 0; }
    .meta-box .meta-label { color: #888; width: 140px; }
    .meta-box .meta-value { text-align: right; color: #555; font-family: 'SF Mono', Monaco, monospace; font-size: 11px; }

    .step-section { margin-bottom: 32px; page-break-inside: avoid; }
    .step-title { font-size: 10px; text-transform: uppercase; letter-spacing: 2.5px; color: #888; margin: 0 0 14px 0; padding-bottom: 10px; border-bottom: 2px solid ${primaryColor}20; font-weight: 700; }

    .fields-table { width: 100%; border-collapse: collapse; }
    .label-cell { padding: 10px 16px; font-size: 12px; color: #777; vertical-align: top; width: 35%; border-bottom: 1px solid #f0f1f3; font-weight: 500; }
    .value-cell { padding: 10px 16px; font-size: 13px; color: #222; white-space: pre-wrap; border-bottom: 1px solid #f0f1f3; line-height: 1.5; word-break: break-word; }

    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { font-size: 9px; color: #bbb; text-transform: uppercase; letter-spacing: 2.5px; margin: 0; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${escapeHtml(clientName)}</h1>
      <p class="subtitle">${escapeHtml(sub.client_email || "\u2014")} &middot; ${escapeHtml(partnerName)}</p>
    </div>
    <div style="text-align:right;">
      <div class="status-badge">${sub.status.replace("_", " ")}</div>
      <p class="date">${submittedDate}</p>
    </div>
  </div>

  <div class="meta-box">
    <table>
      <tr>
        <td class="meta-label">Submission ID</td>
        <td class="meta-value">${sub.id}</td>
      </tr>
      <tr>
        <td class="meta-label">Partner</td>
        <td class="meta-value" style="font-family:inherit;">${escapeHtml(partnerName)}</td>
      </tr>
    </table>
  </div>

  ${stepsHtml}

  <div class="footer">
    <p>Generated by linqme &middot; ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
  </div>
</body>
</html>`;

    const safeName = clientName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${safeName}-submission.html"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
