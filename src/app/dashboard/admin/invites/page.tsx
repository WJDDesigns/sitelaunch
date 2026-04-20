import { requireSuperadmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlans } from "@/lib/plans";
import Link from "next/link";
import InvitesManager from "./InvitesManager";

export default async function AdminInvitesPage() {
  await requireSuperadmin();
  const admin = createAdminClient();

  const [{ data: invites }, plans] = await Promise.all([
    admin
      .from("agency_invites")
      .select("id, email, name, coupon_code, status, expires_at, created_at, accepted_at")
      .order("created_at", { ascending: false })
      .limit(200),
    getPlans(),
  ]);

  const paidPlans = plans
    .filter((p) => p.priceMonthly > 0)
    .map((p) => ({ slug: p.slug, name: p.name, priceMonthly: p.priceMonthly }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
      <header>
        <Link
          href="/dashboard/admin"
          className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Platform
        </Link>
        <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface mt-2">
          Agency Invitations
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Invite agency owners to try linqme with an exclusive coupon code.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatPill
          label="Total Sent"
          value={(invites ?? []).length}
          icon="fa-paper-plane"
          color="text-primary"
        />
        <StatPill
          label="Pending"
          value={(invites ?? []).filter((i) => i.status === "pending").length}
          icon="fa-clock"
          color="text-amber-400"
        />
        <StatPill
          label="Accepted"
          value={(invites ?? []).filter((i) => i.status === "accepted").length}
          icon="fa-check-circle"
          color="text-emerald-400"
        />
        <StatPill
          label="Revoked"
          value={(invites ?? []).filter((i) => i.status === "revoked").length}
          icon="fa-ban"
          color="text-red-400"
        />
      </div>

      <InvitesManager
        invites={(invites ?? []) as { id: string; email: string; name: string | null; coupon_code: string; status: string; expires_at: string; created_at: string; accepted_at: string | null }[]}
        plans={paidPlans}
      />
    </div>
  );
}

function StatPill({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="rounded-xl border border-outline-variant/[0.08] bg-surface-container/50 p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg bg-surface-container-high/40 flex items-center justify-center ${color}`}>
        <i className={`fa-solid ${icon} text-sm`} />
      </div>
      <div>
        <p className="text-xl font-bold font-headline text-on-surface">{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/50 font-label">{label}</p>
      </div>
    </div>
  );
}
