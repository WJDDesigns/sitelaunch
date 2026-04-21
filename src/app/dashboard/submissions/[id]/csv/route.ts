import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FormSchema, FieldDef } from "@/lib/forms";
import { formatFieldValue } from "@/lib/format-field-value";

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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
         partners ( id, name ),
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

    const rows: string[][] = [];

    // Header row: meta fields + form fields
    const headers: string[] = ["Submission ID", "Status", "Client Name", "Client Email", "Partner", "Submitted At"];
    const values: string[] = [
      sub.id,
      sub.status,
      sub.client_name || "",
      sub.client_email || "",
      partner?.name || "",
      sub.submitted_at ? new Date(sub.submitted_at).toISOString() : "",
    ];

    if (schema) {
      for (const step of schema.steps) {
        for (const f of step.fields) {
          if (f.type === "heading" || f.type === "captcha") continue;
          headers.push(f.label);
          const v = data[f.id];
          if (v === undefined || v === null || v === "") {
            values.push("");
          } else {
            values.push(formatFieldValue(v, f as FieldDef));
          }
        }
      }
    }

    rows.push(headers);
    rows.push(values);

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const clientName = sub.client_name || "submission";
    const safeName = clientName.replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "-");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeName}-submission.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
