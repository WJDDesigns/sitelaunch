import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import LogoUploadForm from "./LogoUploadForm";
import BrandingForm from "./BrandingForm";
import DeletePartnerButton from "./DeletePartnerButton";
import DomainSetup from "./DomainSetup";
import WhiteLabelSection from "./WhiteLabelSection";
import InvitePartnerSection from "./InvitePartnerSection";
import { updatePartnerAction, updateWhiteLabelAction, uploadLogoAction, savePartnerDomainAction, deletePartnerAction } from "./actions";
import { sendPartnerInviteAction, revokePartnerInviteAction, removePartnerMemberAction, toggleFormEditingAction } from "./invite-actions";
import ImpersonateButton from "../ImpersonateButton";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function PartnerDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const session = await requireSession();
  const supabase = await createClient();
  const isAdminView = from === "admin" && session.role === "superadmin";

  const { data: partner, error } = await supabase
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !partner) notFound();

  let canEdit = session.role === "superadmin";
  if (!canEdit) {
    const { data: membership } = await supabase
      .from("partner_members")
      .select("role")
      .eq("partner_id", id)
      .eq("user_id", session.userId)
      .maybeSingle();
    canEdit = !!membership;
  }

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "linqme.io").replace(/:\d+$/, "");
  const boundUpdate = updatePartnerAction.bind(null, id);
  const boundWhiteLabel = updateWhiteLabelAction.bind(null, id);
  const boundUpload = uploadLogoAction.bind(null, id);
  const boundDomain = savePartnerDomainAction.bind(null, id);
  const boundSendInvite = sendPartnerInviteAction.bind(null, id);
  const boundRevokeInvite = revokePartnerInviteAction.bind(null, id);
  const boundRemoveMember = removePartnerMemberAction.bind(null, id);
  const boundToggleFormEditing = toggleFormEditingAction.bind(null, id);
  const storefrontHost = partner.custom_domain || `${partner.slug}.${rootHost}`;

  // Fetch invites and members for this partner
  const admin = createAdminClient();
  const { data: invites } = await admin
    .from("invites")
    .select("id, email, accepted_at, expires_at, created_at")
    .eq("partner_id", id)
    .order("created_at", { ascending: false });

  const { data: memberRows } = await admin
    .from("partner_members")
    .select("user_id, role")
    .eq("partner_id", id);

  // Resolve member profiles
  const memberProfiles = [];
  if (memberRows && memberRows.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", memberRows.map((m) => m.user_id));

    for (const m of memberRows) {
      const p = profiles?.find((pr) => pr.id === m.user_id);
      if (p) {
        memberProfiles.push({
          user_id: m.user_id,
          email: p.email,
          full_name: p.full_name,
          role: m.role,
        });
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-8"><div className="max-w-3xl space-y-6">
      <header>
        <Link href={isAdminView ? "/dashboard/admin/customers" : "/dashboard/partners"} className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> {isAdminView ? "Customers" : "Partners"}
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden">
                <Image src={partner.logo_url} alt="" fill className="object-contain" sizes="40px" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-on-primary text-sm font-bold"
                style={{ backgroundColor: partner.primary_color || "#696cf8" }}
              >
                {partner.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">{partner.name}</h1>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">{storefrontHost}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {session.role === "superadmin" && (
              <ImpersonateButton partnerId={id} size="md" />
            )}
            <a
              href={`https://${storefrontHost}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-primary hover:underline"
            >
              View storefront <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-1" />
            </a>
          </div>
        </div>
      </header>

      {/* Logo */}
      <section className="glass-panel rounded-2xl border border-outline-variant/15 p-6">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Logo</h2>
        {canEdit ? (
          <LogoUploadForm
            currentLogoUrl={partner.logo_url ?? null}
            uploadAction={boundUpload}
          />
        ) : (
          <div className="relative w-20 h-20 rounded-xl bg-surface-container-high overflow-hidden">
            {partner.logo_url ? (
              <Image src={partner.logo_url} alt="Logo" fill className="object-contain" sizes="80px" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-on-surface-variant/40">No logo</span>
            )}
          </div>
        )}
      </section>

      {/* Branding + details form */}
      <BrandingForm partner={partner} rootHost={rootHost} canEdit={canEdit} updateAction={boundUpdate} />

      {/* Custom domain setup */}
      {canEdit && (
        <DomainSetup
          partnerId={id}
          currentDomain={partner.custom_domain ?? null}
          saveAction={boundDomain}
        />
      )}

      {/* White-label branding */}
      <WhiteLabelSection partner={partner} canEdit={canEdit} updateAction={boundWhiteLabel} />

      {/* Partner members & invites */}
      {canEdit && (
        <InvitePartnerSection
          partnerId={id}
          partnerName={partner.name}
          invites={invites ?? []}
          members={memberProfiles}
          sendInviteAction={boundSendInvite}
          revokeInviteAction={boundRevokeInvite}
          removeMemberAction={boundRemoveMember}
          toggleFormEditingAction={boundToggleFormEditing}
          allowFormEditing={partner.allow_partner_form_editing ?? false}
          sectionLabel={isAdminView ? "Customer Members" : undefined}
        />
      )}

      {/* Danger zone */}
      {canEdit && (
        <section className="glass-panel rounded-2xl border border-error/20 p-6">
          <h2 className="text-xs font-bold text-error uppercase tracking-widest mb-1">Danger zone</h2>
          <p className="text-xs text-on-surface-variant mb-3">
            Deleting {isAdminView ? "this customer" : "a partner"} removes all their forms, submissions, and members. This cannot be undone.
          </p>
          <DeletePartnerButton
            partnerId={id}
            partnerName={partner.name}
            deleteAction={deletePartnerAction}
            label={isAdminView ? "Delete customer" : undefined}
            redirectTo={isAdminView ? "/dashboard/admin/customers" : undefined}
          />
        </section>
      )}
    </div></div>
  );
}
