import Link from "next/link";
import { requireSuperadmin } from "@/lib/auth";
import { createPartnerAction } from "./actions";
import ColorInput from "@/components/ColorInput";

const INPUT_CLS =
  "block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none";

export default async function NewPartnerPage() {
  await requireSuperadmin();
  const rootHost = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "mysitelaunch.com").replace(/:\d+$/, "");

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <Link href="/dashboard/partners" className="text-xs text-slate-500 hover:text-slate-900">
          ← Partners
        </Link>
        <h1 className="text-3xl font-bold tracking-tight mt-1">New partner</h1>
        <p className="text-sm text-slate-600 mt-1">
          Create a new partner tenant. They&apos;ll get their own subdomain and branding.
        </p>
      </header>

      <form
        action={createPartnerAction}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5"
      >
        <Field label="Name" hint="Displayed to their clients.">
          <input name="name" required autoFocus className={INPUT_CLS} placeholder="POP Marketing" />
        </Field>

        <Field
          label="Slug"
          hint="Used for their subdomain. Lowercase letters, numbers, hyphens only."
        >
          <div className="flex items-center">
            <input
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className={`${INPUT_CLS} rounded-r-none`}
              placeholder="pop"
            />
            <span className="px-3 py-2 text-sm text-slate-500 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg whitespace-nowrap">
              .{rootHost}
            </span>
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Primary color">
            <ColorInput name="primary_color" defaultValue="#2563eb" />
          </Field>
          <Field label="Accent color">
            <ColorInput name="accent_color" defaultValue="#f97316" />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Support email" hint="Shown on their onboarding pages.">
            <input
              name="support_email"
              type="email"
              className={INPUT_CLS}
              placeholder="hello@popmarketing.com"
            />
          </Field>
          <Field label="Support phone">
            <input
              name="support_phone"
              type="tel"
              className={INPUT_CLS}
              placeholder="555-123-4567"
            />
          </Field>
        </div>

        <Field
          label="Custom domain (optional)"
          hint="Partner can point a CNAME here later."
        >
          <input
            name="custom_domain"
            className={INPUT_CLS}
            placeholder="onboard.popmarketing.com"
          />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/dashboard/partners"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create partner
          </button>
        </div>
      </form>
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
