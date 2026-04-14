"use client";

import { useRef, useState, useTransition } from "react";

interface Props {
  currentLogoUrl: string | null;
  uploadAction: (formData: FormData) => Promise<void>;
}

export default function LogoUploadForm({ currentLogoUrl, uploadAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="flex items-center gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            await uploadAction(fd);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          }
        });
      }}
    >
      <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
        {currentLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-contain" />
        ) : (
          <span className="text-xs text-slate-400">No logo</span>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <input
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/svg+xml,image/webp"
          required
          className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {pending ? "Uploading…" : "Upload logo"}
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
        <p className="text-xs text-slate-500">PNG, JPG, SVG, or WebP. Max 5MB.</p>
      </div>
    </form>
  );
}
