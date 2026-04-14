import Link from "next/link";
import { requireSession, getVisiblePartners } from "@/lib/auth";

export default async function PartnersListPage() {
  const session = await requireSession();
  const partners = await getVisiblePartners();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-sm text-slate-600 mt-1">
            {session.role === "superadmin"
              ? "All partners on the platform."
              : "Partners you belong to."}
          </p>
        </div>
        {session.role === "superadmin" && (
          <Link
            href="/dashboard/partners/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + New partner
          </Link>
        )}
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-8 text-sm text-slate-500 text-center">
            No partners yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-5 py-3 font-medium">Name</th>
                <th className="text-left px-5 py-3 font-medium">Slug</th>
                <th className="text-left px-5 py-3 font-medium">Domain</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: p.primary_color || "#2563eb" }}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600 font-mono text-xs">{p.slug}</td>
                  <td className="px-5 py-3 text-slate-600">
                    {p.custom_domain || `${p.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/dashboard/partners/${p.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium text-xs"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
