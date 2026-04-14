import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import LogoUploadForm from "./LogoUploadForm";
import BrandingForm from "./BrandingForm";
import DeletePartnerButton from "./DeletePartnerButton";
import DomainSetup from "./DomainSetup";
import WhiteLabelSection from "./WhiteLabelSection";
import { updatePartnerAction, updateWhiteLabelAction, uploadLogoAction, savePartnerDomainAction, deletePartnerAction } from "./actions";
import ImpersonateButton from "../ImpersonateButton";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await requireSession();
  const supabase = await createClient();

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
    canEdit = membership?.role === "partner_owner";
  }

  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");
  const boundUpdate = updatePartnerAction.bind(null, id);
  const boundWhiteLabel = updateWhiteLabelAction.bind(null, id);
  const boundUpload = uploadLogoAction.bind(null, id);
  const boundDomain = savePartnerDomainAction.bind(null, id);
  const storefrontHost = partner.custom_domain || `${partner.slug}.${rootHost}`;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8"><div className="max-w-3xl space-y-6">
      <header>
        <Link href="/dashboard/partners" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Partners
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {partner.logo_url ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
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
              href={`http://${storefrontHost}`}
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
          <div className="w-20 h-20 rounded-xl bg-surface-container-high flex items-center justify-center overflow-hidden">
            {partner.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-on-surface-variant/40">No logo</span>
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

      {/* Danger zone */}
      {canEdit && (
        <section className="glass-panel rounded-2xl border border-error/20 p-6">
          <h2 className="text-xs font-bold text-error uppercase tracking-widest mb-1">Danger zone</h2>
          <p className="text-xs text-on-surface-variant mb-3">
            Deleting a partner removes all their forms, submissions, and members. This cannot be undone.
          </p>
          <DeletePartnerButton
            partnerId={id}
            partnerName={partner.name}
            deleteAction={deletePartnerAction}
          />
        </section>
      )}
    </div></div>
  );
}
