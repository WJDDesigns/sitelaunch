import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema } from "@/lib/forms";

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
    const partnerName = partner?.name || "SiteLaunch";

    // Build HTML for PDF
    let stepsHtml = "";
    if (schema) {
      for (const step of schema.steps) {
        let fieldsHtml = "";
        for (const f of step.fields) {
          if (f.type === "heading") continue;
          if (f.type === "file" || f.type === "files") {
            fieldsHtml += `
              <tr>
                <td style="padding:10px 14px;font-size:12px;color:#888;vertical-align:top;width:35%;border-bottom:1px solid #f0f0f0;">${escapeHtml(f.label)}</td>
                <td style="padding:10px 14px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;"><em style="color:#999;">See attachments</em></td>
              </tr>`;
            continue;
          }
          const v = data[f.id];
          let display = "—";
          if (v !== undefined && v !== null && v !== "") {
            display = String(v);
            // Pretty-print repeater JSON
            if (f.type === "repeater" && display.startsWith("[")) {
              try {
                const entries = JSON.parse(display) as Record<string, string>[];
                display = entries
                  .map((e, i) => `Entry ${i + 1}: ${Object.entries(e).map(([k, val]) => `${k}: ${val}`).join(", ")}`)
                  .join("\n");
              } catch { /* keep raw */ }
            }
          }
          fieldsHtml += `
            <tr>
              <td style="padding:10px 14px;font-size:12px;color:#888;vertical-align:top;width:35%;border-bottom:1px solid #f0f0f0;">${escapeHtml(f.label)}</td>
              <td style="padding:10px 14px;font-size:13px;color:#333;white-space:pre-wrap;border-bottom:1px solid #f0f0f0;">${escapeHtml(display)}</td>
            </tr>`;
        }
        stepsHtml += `
          <div style="margin-bottom:28px;">
            <h2 style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#999;margin:0 0 12px 0;padding-bottom:8px;border-bottom:2px solid ${primaryColor}22;">${escapeHtml(step.title)}</h2>
            <table style="width:100%;border-collapse:collapse;">${fieldsHtml}</table>
          </div>`;
      }
    }

    const submittedDate = sub.submitted_at
      ? new Date(sub.submitted_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : `Draft (started ${new Date(sub.created_at).toLocaleDateString()})`;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(clientName)} - Submission</title>
  <style>
    @page { margin: 40px 50px; size: A4; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; margin: 0; padding: 0; line-height: 1.5; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:24px;margin-bottom:24px;border-bottom:2px solid ${primaryColor};">
    <div>
      <h1 style="font-size:24px;font-weight:800;margin:0;color:#111;">${escapeHtml(clientName)}</h1>
      <p style="font-size:13px;color:#666;margin:4px 0 0 0;">${escapeHtml(sub.client_email || "—")} &middot; ${escapeHtml(partnerName)}</p>
    </div>
    <div style="text-align:right;">
      <div style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${primaryColor};background:${primaryColor}15;border:1px solid ${primaryColor}30;">${sub.status}</div>
      <p style="font-size:11px;color:#999;margin:6px 0 0 0;">${submittedDate}</p>
    </div>
  </div>

  <!-- Metadata -->
  <div style="background:#f8f9fa;border-radius:8px;padding:14px 18px;margin-bottom:28px;">
    <table style="width:100%;font-size:12px;">
      <tr>
        <td style="color:#888;padding:3px 0;">Submission ID</td>
        <td style="text-align:right;font-family:monospace;color:#666;padding:3px 0;">${sub.id}</td>
      </tr>
      <tr>
        <td style="color:#888;padding:3px 0;">Partner</td>
        <td style="text-align:right;color:#666;padding:3px 0;">${escapeHtml(partnerName)}</td>
      </tr>
    </table>
  </div>

  <!-- Responses -->
  ${stepsHtml}

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #eee;text-align:center;">
    <p style="font-size:10px;color:#bbb;text-transform:uppercase;letter-spacing:2px;">Generated by SiteLaunch &middot; ${new Date().toLocaleDateString()}</p>
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
