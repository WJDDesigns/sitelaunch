import Link from "next/link";
import { requireSession, getVisiblePartners } from "@/lib/auth";
import ImpersonateButton from "./ImpersonateButton";

export default async function PartnersListPage() {
  const session = await requireSession();
  const partners = await getVisiblePartners();

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">Partners</h1>
          <p className="text-on-surface-variant mt-1">
            {session.role === "superadmin"
              ? "All partners on the platform."
              : "Partners you belong to."}
          </p>
        </div>
        {session.role === "superadmin" && (
          <Link
            href="/dashboard/partners/new"
            className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all"
          >
            + New partner
          </Link>
        )}
      </header>

      <div className="bg-surface-container rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
        {partners.length === 0 ? (
          <div className="p-8 text-sm text-on-surface-variant text-center">
            No partners yet.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 px-8 py-5 text-[10px] uppercase tracking-widest text-on-surface-variant/70 font-bold border-b border-outline-variant/10">
              <div className="col-span-4">Name</div>
              <div className="col-span-3">Slug</div>
              <div className="col-span-4">Domain</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-outline-variant/5">
              {partners.map((p) => (
                <div key={p.id} className="grid grid-cols-12 px-8 py-5 items-center hover:bg-white/[0.02] transition-colors group">
                  <div className="col-span-4 flex items-center gap-3">
                    {p.logo_url ? (
                      <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.logo_url} alt="" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-primary text-xs font-bold"
                        style={{ backgroundColor: p.primary_color || "#696cf8" }}
                      >
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-on-surface group-hover:text-primary transition-colors">{p.name}</span>
                  </div>
                  <div className="col-span-3 font-mono text-xs text-on-surface-variant">{p.slug}</div>
                  <div className="col-span-4 text-sm text-on-surface-variant">
                    {p.custom_domain || `${p.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-3">
                    {session.role === "superadmin" && (
                      <ImpersonateButton partnerId={p.id} />
                    )}
                    <Link
                      href={`/dashboard/partners/${p.id}`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      Manage <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
