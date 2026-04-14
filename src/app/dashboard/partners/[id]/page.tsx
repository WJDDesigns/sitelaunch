import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ColorInput from "@/components/ColorInput";
import LogoUploadForm from "./LogoUploadForm";
import DeletePartnerButton from "./DeletePartnerButton";
import { updatePartnerAction, uploadLogoAction, deletePartnerAction } from "./actions";

const INPUT_CLS =
  "block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none";

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

  // Determine if current user can edit
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

  // Bind partnerId into the server actions
  const boundUpdate = updatePartnerAction.bind(null, id);
  const boundUpload = uploadLogoAction.bind(null, id);

  const storefrontHost = partner.custom_domain || `${partner.slug}.${rootHost}`;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <Link href="/dashboard/partners" className="text-xs text-slate-500 hover:text-slate-900">
          ← Partners
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold overflow-hidden"
              style={{ backgroundColor: partner.primary_color || "#2563eb" }}
            >
              {partner.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={partner.logo_url} alt="" className="w-full h-full object-contain" />
              ) : (
                partner.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{partner.name}</h1>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{storefrontHost}</p>
            </div>
          </div>
          <a
            href={`http://${storefrontHost}${storefrontHost.includes(":") ? "" : ""}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            View storefront ↗
          </a>
        </div>
      </header>

      {/* Logo */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Logo</h2>
        {canEdit ? (
          <LogoUploadForm
            currentLogoUrl={partner.logo_url ?? null}
            uploadAction={boundUpload}
          />
        ) : (
          <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            {partner.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">No logo</span>
            )}
          </div>
        )}
      </section>

      {/* Branding + details form */}
      <form
        action={boundUpdate}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
      >
        <h2 className="text-sm font-semibold text-slate-900">Branding &amp; details</h2>

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
              className={`${INPUT_CLS} rounded-r-none bg-slate-50 text-slate-500`}
            />
            <span className="px-3 py-2 text-sm text-slate-500 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg whitespace-nowrap">
              .{rootHost}
            </span>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Primary color">
            <ColorInput
              name="primary_color"
              defaultValue={partner.primary_color || "#2563eb"}
            />
          </Field>
          <Field label="Accent color">
            <ColorInput
              name="accent_color"
              defaultValue={partner.accent_color || "#f97316"}
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
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Save changes
            </button>
          </div>
        )}
      </form>

      {/* Danger zone (superadmin) */}
      {session.role === "superadmin" && (
        <section className="bg-white rounded-2xl border border-red-200 p-6">
          <h2 className="text-sm font-semibold text-red-700 mb-1">Danger zone</h2>
          <p className="text-xs text-slate-600 mb-3">
            Deleting a partner removes all their forms, submissions, and members. This cannot be undone.
          </p>
          <DeletePartnerButton
            partnerId={id}
            partnerName={partner.name}
            deleteAction={deletePartnerAction}
          />
        </section>
      )}
    </div>
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="block text-xs text-slate-500 mt-0.5 mb-1.5">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}
