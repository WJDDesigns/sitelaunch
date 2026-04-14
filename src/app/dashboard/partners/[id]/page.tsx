import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ColorInput from "@/components/ColorInput";
import LogoUploadForm from "./LogoUploadForm";
import DeletePartnerButton from "./DeletePartnerButton";
import DomainSetup from "./DomainSetup";
import { updatePartnerAction, uploadLogoAction, deletePartnerAction } from "./actions";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200";

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
  const boundUpload = uploadLogoAction.bind(null, id);
  const storefrontHost = partner.custom_domain || `${partner.slug}.${rootHost}`;

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-8"><div className="max-w-3xl space-y-6">
      <header>
        <Link href="/dashboard/partners" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors">
          <i className="fa-solid fa-arrow-left text-[10px] mr-1" /> Partners
        </Link>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-on-primary text-sm font-bold overflow-hidden"
              style={{ backgroundColor: partner.primary_color || "#696cf8" }}
            >
              {partner.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
              ) : (
                partner.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold font-headline tracking-tight text-on-surface">{partner.name}</h1>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">{storefrontHost}</p>
            </div>
          </div>
          <a
            href={`http://${storefrontHost}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-primary hover:underline"
          >
            View storefront <i className="fa-solid fa-arrow-up-right-from-square text-[10px] ml-1" />
          </a>
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
      <form
        action={boundUpdate}
        className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-5"
      >
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Branding &amp; details</h2>

        <Field label="Name">
          <input
            name="name"
            required
            defaultValue={partner.name}
            disabled={!canEdit}
            className={INPUT_CLS}
          />
        </Field>

        <Field label="Slug" hint="Changing the slug is not supported yet. Contact support if needed.">
          <div className="flex items-center">
            <input
              value={partner.slug}
              disabled
              className={`${INPUT_CLS} rounded-r-none opacity-50`}
            />
            <span className="px-3 py-3 text-sm text-on-surface-variant bg-surface-container-high border-0 rounded-r-xl whitespace-nowrap">
              .{rootHost}
            </span>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Primary color">
            <ColorInput
              name="primary_color"
              defaultValue={partner.primary_color || "#c0c1ff"}
            />
          </Field>
          <Field label="Accent color">
            <ColorInput
              name="accent_color"
              defaultValue={partner.accent_color || "#3cddc7"}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Support email">
            <input
              name="support_email"
              type="email"
              defaultValue={partner.support_email ?? ""}
              disabled={!canEdit}
              className={INPUT_CLS}
            />
          </Field>
          <Field label="Support phone">
            <input
              name="support_phone"
              type="tel"
              defaultValue={partner.support_phone ?? ""}
              disabled={!canEdit}
              className={INPUT_CLS}
            />
          </Field>
        </div>

        <Field
          label="Custom domain"
          hint="Point a CNAME to cname.vercel-dns.com after saving."
        >
          <input
            name="custom_domain"
            defaultValue={partner.custom_domain ?? ""}
            disabled={!canEdit}
            className={INPUT_CLS}
            placeholder="onboard.example.com"
          />
        </Field>

        {canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all"
            >
              Save changes
            </button>
          </div>
        )}
      </form>

      {/* Domain setup instructions — shown when a custom domain is set */}
      {partner.custom_domain && (
        <DomainSetup
          partnerId={id}
          domain={partner.custom_domain}
        />
      )}

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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">{label}</span>
      {hint && <span className="block text-xs text-on-surface-variant/60 mt-0.5 mb-1.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
