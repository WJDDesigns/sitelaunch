"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createFormAction } from "./form-actions";

interface Props {
  canCreate: boolean;
  formsLimit: number | null;
  prominent?: boolean;
}

export default function CreateFormButton({ canCreate, formsLimit, prominent }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    if (!name.trim()) {
      setError("Form name is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createFormAction(name.trim());
      if (result.ok && result.formId) {
        setShowModal(false);
        setName("");
        router.push(`/dashboard/form/${result.formId}`);
      } else {
        setError(result.error ?? "Failed to create form.");
      }
    });
  }

  if (!canCreate) {
    return (
      <div className="flex items-center gap-3">
        <button
          disabled
          className={`${
            prominent
              ? "px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm opacity-50 cursor-not-allowed"
              : "px-4 py-2 text-xs font-bold text-on-surface-variant/40 border border-outline-variant/15 rounded-lg cursor-not-allowed"
          }`}
          title={`Upgrade to create more forms (limit: ${formsLimit})`}
        >
          <i className="fa-solid fa-lock text-[10px] mr-1.5" />
          {prominent ? "Create form" : "+ New form"}
        </button>
        <Link
          href="/dashboard/billing"
          className="text-xs font-bold text-primary hover:underline"
        >
          Upgrade for more forms
        </Link>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`${
          prominent
            ? "px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] transition-all"
            : "px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-all"
        }`}
      >
        <i className="fa-solid fa-plus text-[10px] mr-1.5" />
        {prominent ? "Create your first form" : "New form"}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-on-surface mb-4">Create new form</h2>
            <label className="block">
              <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                Form name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Web Design Onboarding"
                className="mt-1.5 block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none transition-all duration-200"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </label>
            {error && (
              <div className="mt-2">
                <p className="text-xs text-error">{error}</p>
                {error.includes("Upgrade") && (
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-1 hover:underline"
                  >
                    <i className="fa-solid fa-rocket text-[10px]" />
                    View plans
                  </Link>
                )}
              </div>
            )}
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => { setShowModal(false); setName(""); setError(null); }}
                className="px-4 py-2 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={pending}
                className="px-5 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_20px_rgba(192,193,255,0.3)] disabled:opacity-50 transition-all"
              >
                {pending ? "Creating..." : "Create form"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
