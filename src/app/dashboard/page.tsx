import Link from "next/link";
import { requireSession, getVisiblePartners, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Admin",
  partner_owner: "Owner",
  partner_member: "Member",
  client: "Client",
};

export default async function DashboardOverview() {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const allPartners = await getVisiblePartners();
  // Filter out the user's own root account — only show sub-partners (same as Partners page)
  const partners = account
    ? allPartners.filter((p) => p.id !== account.id)
    : allPartners;

  const supabase = await createClient();
  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true });

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 space-y-8">
      {/* Header */}
      <header className="animate-fade-up">
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">
          {session.role === "superadmin" ? "Overview" : "Your dashboard"}
        </h1>
        <p className="text-on-surface-variant font-body mt-1">
          {session.role === "superadmin"
            ? "Platform-wide view. Manage partners, track submissions, configure settings."
            : "Manage your brand, form, and client submissions."}
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-fade-up delay-1">
        <StatCard
          label="Partners"
          value={partners.length.toString()}
          icon="fa-users"
          gradient="from-primary/15 to-primary/5"
          iconColor="text-primary"
          valueColor="text-primary"
        />
        <StatCard
          label="Submissions"
          value={(submissionCount ?? 0).toString()}
          icon="fa-inbox"
          gradient="from-tertiary/15 to-tertiary/5"
          iconColor="text-tertiary"
          valueColor="text-tertiary"
        />
        <StatCard
          label="Role"
          value={ROLE_LABELS[session.role] ?? session.role}
          icon="fa-shield-halved"
          gradient="from-inverse-primary/10 to-inverse-primary/5"
          iconColor="text-inverse-primary"
          valueColor="text-on-surface"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-up delay-2">
        <QuickAction href="/dashboard/form" icon="fa-pen-ruler" label="Form Builder" />
        <QuickAction href="/dashboard/submissions" icon="fa-inbox" label="Submissions" />
        <QuickAction href="/dashboard/settings" icon="fa-gear" label="Settings" />
        {session.role === "superadmin" && (
          <QuickAction href="/dashboard/partners/new" icon="fa-plus" label="New Partner" />
        )}
      </div>

      {/* Recent partners */}
      <section className="animate-fade-up delay-3 rounded-2xl overflow-hidden border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-outline-variant/[0.06]">
          <h2 className="text-lg font-bold font-headline text-on-surface tracking-tight">Partners</h2>
          {session.role === "superadmin" && (
            <Link
              href="/dashboard/partners/new"
              className="px-4 py-2 bg-primary text-on-primary font-semibold rounded-xl text-xs hover:shadow-[0_0_24px_rgba(var(--color-primary),0.3)] transition-all duration-300"
            >
              <i className="fa-solid fa-plus text-[10px] mr-1.5" />
              New partner
            </Link>
          )}
        </div>

        {partners.length === 0 ? (
          <div className="px-8 py-12 text-sm text-on-surface-variant text-center">
            <i className="fa-solid fa-users text-2xl text-on-surface-variant/20 mb-3 block" />
            No partners yet. {session.role === "superadmin" && "Create one to get started."}
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/[0.05]">
            {partners.slice(0, 5).map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-6 md:px-8 py-4 items-center hover:bg-primary/[0.02] transition-colors duration-300 group">
                <div className="col-span-6 flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-outline-variant/10"
                    style={{
                      backgroundColor: p.primary_color ? `${p.primary_color}15` : undefined,
                      color: p.primary_color || undefined,
                    }}
                  >
                    {p.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface group-hover:text-primary transition-colors duration-300 truncate">{p.name}</p>
                    <p className="text-xs text-on-surface-variant/50 truncate">
                      {p.custom_domain || `${p.slug}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`}
                    </p>
                  </div>
                </div>
                <div className="col-span-3 hidden md:block">
                  <span className="text-xs text-on-surface-variant/50 font-mono bg-surface-container-high/40 px-2 py-0.5 rounded">{p.slug}</span>
                </div>
                <div className="col-span-6 md:col-span-3 text-right">
                  <Link
                    href={`/dashboard/partners/${p.id}`}
                    className="text-xs font-bold text-primary hover:underline transition-all group-hover:translate-x-0.5 inline-block"
                  >
                    Manage <i className="fa-solid fa-arrow-right text-[10px] ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  gradient,
  iconColor,
  valueColor,
}: {
  label: string;
  value: string;
  icon: string;
  gradient: string;
  iconColor: string;
  valueColor: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} border border-outline-variant/[0.06] p-6 group glow-card`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-background/40 flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform duration-500`}>
          <i className={`fa-solid ${icon} text-sm`} />
        </div>
      </div>
      <h3 className={`text-4xl font-extrabold font-headline ${valueColor}`}>
        {value}
      </h3>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-outline-variant/[0.08] bg-surface-container/30 hover:border-primary/20 hover:bg-primary/[0.03] transition-all duration-300 group"
    >
      <i className={`fa-solid ${icon} text-xs text-on-surface-variant/40 group-hover:text-primary transition-colors`} />
      <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">{label}</span>
    </Link>
  );
}
