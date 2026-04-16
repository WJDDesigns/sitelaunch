import { NextResponse } from "next/server";
import { getSubmissionsCsvData } from "../actions";
import type { FormSchema } from "@/lib/forms";

function escapeCsv(val: string): string {
  // Prevent CSV injection: prefix formula-triggering characters with apostrophe
  if (val.length > 0 && "=+@-".includes(val[0])) {
    val = "'" + val;
  }
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export async function GET() {
  try {
    const submissions = await getSubmissionsCsvData();

    // Collect all unique field IDs + labels across all schemas
    const fieldMap = new Map<string, string>(); // fieldId -> label
    for (const sub of submissions) {
      const pf = Array.isArray(sub.partner_forms) ? sub.partner_forms[0] : sub.partner_forms;
      const tpl = pf && (Array.isArray(pf.form_templates) ? pf.form_templates[0] : pf.form_templates);
      const schema = tpl?.schema as FormSchema | undefined;
      if (!schema) continue;
      for (const step of schema.steps) {
        for (const f of step.fields) {
          if (f.type === "heading" || f.type === "file" || f.type === "files") continue;
          if (!fieldMap.has(f.id)) fieldMap.set(f.id, f.label);
        }
      }
    }

    const fieldIds = Array.from(fieldMap.keys());
    const fieldLabels = Array.from(fieldMap.values());

    // CSV header
    const headers = [
      "Submission ID",
      "Client Name",
      "Client Email",
      "Partner",
      "Status",
      "Submitted At",
      "Created At",
      ...fieldLabels,
    ];

    const rows: string[][] = [headers];

    for (const sub of submissions) {
      const partner = Array.isArray(sub.partners) ? sub.partners[0] : sub.partners;
      const data = (sub.data as Record<string, unknown>) ?? {};

      const row: string[] = [
        sub.id,
        sub.client_name ?? "",
        sub.client_email ?? "",
        partner?.name ?? "",
        sub.status,
        sub.submitted_at ?? "",
        sub.created_at,
        ...fieldIds.map((fid) => {
          const v = data[fid];
          if (v === undefined || v === null) return "";
          return String(v);
        }),
      ];

      rows.push(row);
    }

    const csv = rows.map((r) => r.map(escapeCsv).join(",")).join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
