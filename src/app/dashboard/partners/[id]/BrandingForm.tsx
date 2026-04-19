"use client";

import { useTransition, useState } from "react";
import ColorInput from "@/components/ColorInput";

interface Partner {
  name: string;
  slug: string;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
}

interface Props {
  partner: Partner;
  rootHost: string;
  canEdit: boolean;
  updateAction: (formData: FormData) => Promise<void | { ok: boolean; error?: string }>;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200";

export default function BrandingForm({ partner, rootHost, canEdit, updateAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateAction(formData);
        setMsg("Branding saved!");
      } catch {
        setMsg("Failed to save.");
      }
    });
  }

  return (
    <form
      action={handleSubmit}
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

      {canEdit && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {msg && (
            <span className={`text-xs font-medium ${msg.includes("saved") ? "text-tertiary" : "text-error"}`}>
              {msg}
            </span>
          )}
          <button
            type="submit"
            disabled={pending}
            className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] disabled:opacity-50 transition-all"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
        </div>
      )}
    </form>
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
