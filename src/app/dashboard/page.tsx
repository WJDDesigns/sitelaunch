import Link from "next/link";
import { cookies } from "next/headers";
import { requireSession, getVisiblePartners, getCurrentAccount } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import InsightsDashboard from "./insights/InsightsDashboardLazy";
import type { InsightDashboard } from "./insights/actions";

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
  // Filter out the user's own root account -- only show sub-partners (same as Partners page)
  const partners = account
    ? allPartners.filter((p) => p.id !== account.id)
    : allPartners;

  const supabase = await createClient();
  const { count: submissionCount } = await supabase
    .from("submissions")
    .select("id", { count: "exact", head: true });

  // ── Onboarding checklist data ──
  const cookieStore = await cookies();
  const checklistDismissed =
    cookieStore.get("sl_onboarding_dismissed")?.value === "1";

  let hasLogo = false;
  let hasBrandColors = false;
  let hasCustomForm = false;
  let hasMfa = false;
  const hasSubmissions = (submissionCount ?? 0) > 0;

  const admin = createAdminClient();

  if (account && !checklistDismissed) {
    // Partner branding checks
    const { data: partner } = await admin
      .from("partners")
      .select("logo_url, primary_color")
      .eq("id", account.id)
      .maybeSingle();

    hasLogo = !!partner?.logo_url;
    hasBrandColors = !!partner?.primary_color;

    // Form customization check -- has at least one form
    const { count: formCount } = await admin
      .from("partner_forms")
      .select("id", { count: "exact", head: true })
      .eq("partner_id", account.id);

    hasCustomForm = (formCount ?? 0) > 0;

    // MFA check -- profile.mfa_enabled
    const { data: profile } = await admin
      .from("profiles")
      .select("mfa_enabled")
      .eq("id", session.userId)
      .maybeSingle();

    hasMfa = profile?.mfa_enabled === true;
  }

  // ── Insights data ──
  let dashboardMap: Record<string, InsightDashboard> = {};
  let formList: { id: string; name: string; slug: string }[] = [];
  let fieldMap: Record<string, { key: string; label: string; type: string }[]> = {};
  let submissions: Record<string, unknown>[] = [];

  if (account) {
    const [
      { data: dashboards },
      { data: forms },
      { data: subs },
    ] = await Promise.all([
      admin
        .from("insight_dashboards")
        .select("*")
        .eq("partner_id", account.id)
        .limit(50),
      admin
        .from("partner_forms")
        .select("id, name, slug, schema")
        .eq("partner_id", account.id)
        .order("name"),
      admin
        .from("submissions")
        .select("id, status, client_name, client_email, created_at, submitted_at, form_slug, partner_form_id, data")
        .eq("partner_id", account.id)
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

    for (const d of (dashboards ?? []) as InsightDashboard[]) {
      if (d.name === "My Dashboard") {
        dashboardMap["all"] = d;
      } else if (d.name.startsWith("form:")) {
        dashboardMap[d.name.replace("form:", "")] = d;
      }
    }

    formList = (forms ?? []).map((f) => ({
      id: f.id as string,
      name: f.name as string,
      slug: f.slug as string,
    }));

    for (const form of forms ?? []) {
      const schema = form.schema as { steps?: { fields?: { key: string; label: string; type: string }[] }[] } | null;
      const fields: { key: string; label: string; type: string }[] = [];
      if (schema?.steps) {
        for (const step of schema.steps) {
          for (const field of step.fields ?? []) {
            if (field.type !== "heading" && field.type !== "consent" && field.type !== "captcha") {
              fields.push({ key: field.key, label: field.label, type: field.type });
            }
          }
        }
      }
      fieldMap[form.id as string] = fields;
    }

    submissions = (subs ?? []) as Record<string, unknown>[];
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8 space-y-8">
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

      {/* Onboarding checklist */}
      {account && (
        <OnboardingChecklist
          hasLogo={hasLogo}
          hasBrandColors={hasBrandColors}
          hasCustomForm={hasCustomForm}
          hasSubmissions={hasSubmissions}
          hasMfa={hasMfa}
          dismissed={checklistDismissed}
        />
      )}

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
        <QuickAction href="/dashboard/entries" icon="fa-inbox" label="Entries" />
        <QuickAction href="/dashboard/settings" icon="fa-gear" label="Settings" />
        {session.role === "superadmin" && (
          <QuickAction href="/dashboard/partners/new" icon="fa-plus" label="New Partner" />
        )}
      </div>

      {/* Insights widgets */}
      {account && (
        <section className="animate-fade-up delay-3">
          <InsightsDashboard
            dashboardMap={dashboardMap}
            forms={formList}
            fieldMap={fieldMap}
            submissions={submissions}
          />
        </section>
      )}

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
