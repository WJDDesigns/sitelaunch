import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  submitted: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  complete: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-400",
};

export default async function SubmissionsListPage() {
  await requireSession();
  const supabase = await createClient();

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      `id, status, client_name, client_email, submitted_at, created_at,
       partners ( id, name, slug, primary_color )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = submissions ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
        <p className="text-sm text-slate-600 mt-1">
          Onboarding responses from clients.
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">
            No submissions yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Client</th>
                <th className="text-left px-5 py-3 font-medium">Partner</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => {
                const partner = Array.isArray(s.partners) ? s.partners[0] : s.partners;
                const when = s.submitted_at || s.created_at;
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-900">
                        {s.client_name || "—"}
                      </div>
                      <div className="text-xs text-slate-500">{s.client_email || "no email yet"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: partner?.primary_color || "#2563eb" }}
                        >
                          {partner?.name?.slice(0, 1).toUpperCase() ?? "?"}
                        </div>
                        <span className="text-slate-700">{partner?.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          STATUS_STYLES[s.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {when ? new Date(when).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/submissions/${s.id}`}
                        className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
