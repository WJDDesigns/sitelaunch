import { getInviteByToken } from "@/lib/partner-invites";
import { createAdminClient } from "@/lib/supabase/admin";
import AcceptInviteForm from "./AcceptInviteForm";
import SiteLaunchLogo from "@/components/SiteLaunchLogo";
import Link from "next/link";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />

        <div className="relative w-full max-w-md text-center space-y-6">
          <Link href="/" className="inline-block">
            <SiteLaunchLogo className="h-14 w-auto text-primary mx-auto" ringClassName="text-on-surface/60" />
          </Link>
          <div className="glass-panel rounded-2xl border border-outline-variant/15 p-8">
            <div className="w-14 h-14 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-link-slash text-lg text-error" />
            </div>
            <h1 className="text-xl font-bold font-headline text-on-surface mb-2">
              Invite expired or invalid
            </h1>
            <p className="text-sm text-on-surface-variant/60 mb-6">
              This invitation link is no longer valid. It may have expired or already been used.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] transition-all duration-300"
            >
              Go to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch partner name for display
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("partners")
    .select("name, logo_url, primary_color")
    .eq("id", invite.partner_id)
    .maybeSingle();

  // Check if user already has an account
  const { data: existingUser } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("email", invite.email)
    .maybeSingle();

  const inviterName = invite.invited_by
    ? await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", invite.invited_by)
        .maybeSingle()
        .then((r) => r.data?.full_name || r.data?.email || "Someone")
    : "Someone";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] bg-tertiary/[0.04] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-6 animate-scale-in">
        <Link href="/" className="flex items-center justify-center">
          <SiteLaunchLogo className="h-14 w-auto text-primary" ringClassName="text-on-surface/60" />
        </Link>

        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight font-headline text-on-surface">
            You&rsquo;re invited to join
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3">
            {partner?.logo_url ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: partner?.primary_color || "#696cf8" }}
              >
                {(partner?.name ?? "P")[0].toUpperCase()}
              </div>
            )}
            <span className="text-xl font-bold font-headline text-on-surface">
              {partner?.name ?? "Partner"}
            </span>
          </div>
          <p className="text-sm text-on-surface-variant/60 mt-2">
            Invited by {inviterName as string}
          </p>
        </div>

        <AcceptInviteForm
          token={token}
          email={invite.email}
          existingUser={!!existingUser}
          existingUserName={existingUser?.full_name ?? null}
        />
      </div>
    </main>
  );
}
