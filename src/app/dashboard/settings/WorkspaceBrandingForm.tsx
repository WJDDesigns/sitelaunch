"use client";

import { useTransition, useState } from "react";
import ColorInput from "@/components/ColorInput";
import { updateWorkspaceSettingsAction } from "./actions";

interface WorkspaceData {
  name: string;
  slug: string;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  custom_domain: string | null;
}

interface Props {
  workspace: WorkspaceData;
  rootHost: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200";

export default function WorkspaceBrandingForm({ workspace, rootHost }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [slugValue, setSlugValue] = useState(workspace.slug);

  function handleSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateWorkspaceSettingsAction(formData);
        setMsg("Settings saved!");
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to save.";
        setMsg(message);
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="glass-panel rounded-2xl border border-outline-variant/15 p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
          Workspace branding
        </h2>
        <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
          Your client-facing identity
        </span>
      </div>

      <Field label="Business name">
        <input
          name="name"
          required
          defaultValue={workspace.name}
          className={INPUT_CLS}
        />
      </Field>

      <Field
        label="Subdomain"
        hint="This is the subdomain clients visit for your onboarding forms."
      >
        <div className="flex items-center">
          <input
            name="slug"
            required
            value={slugValue}
            onChange={(e) => setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            className={`${INPUT_CLS} rounded-r-none`}
            placeholder="your-company"
          />
          <span className="px-3 py-3 text-sm text-on-surface-variant bg-surface-container-high border-0 rounded-r-xl whitespace-nowrap">
            .{rootHost}
          </span>
        </div>
      </Field>

      <Field
        label="Custom domain"
        hint="Point a CNAME to cname.vercel-dns.com after saving."
      >
        <input
          name="custom_domain"
          defaultValue={workspace.custom_domain ?? ""}
          className={INPUT_CLS}
          placeholder="onboard.yourdomain.com"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Primary color">
          <ColorInput
            name="primary_color"
            defaultValue={workspace.primary_color || "#c0c1ff"}
          />
        </Field>
        <Field label="Accent color">
          <ColorInput
            name="accent_color"
            defaultValue={workspace.accent_color || "#3cddc7"}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Support email">
          <input
            name="support_email"
            type="email"
            defaultValue={workspace.support_email ?? ""}
            className={INPUT_CLS}
            placeholder="support@yourdomain.com"
          />
        </Field>
        <Field label="Support phone">
          <input
            name="support_phone"
            type="tel"
            defaultValue={workspace.support_phone ?? ""}
            className={INPUT_CLS}
            placeholder="(555) 123-4567"
          />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {msg && (
          <span
            className={`text-xs font-medium ${
              msg.includes("saved") ? "text-tertiary" : "text-error"
            }`}
          >
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
      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
        {label}
      </span>
      {hint && (
        <span className="block text-xs text-on-surface-variant/60 mt-0.5 mb-1.5">
          {hint}
        </span>
      )}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
