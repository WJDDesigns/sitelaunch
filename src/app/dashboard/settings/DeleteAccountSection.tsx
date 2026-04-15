"use client";

import { useState, useTransition } from "react";
import { deleteAccountAction } from "./actions";

interface Props {
  workspaceName: string;
}

export default function DeleteAccountSection({ workspaceName }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const expectedPhrase = `delete ${workspaceName}`;
  const isMatch = confirmation.trim().toLowerCase() === expectedPhrase.toLowerCase();

  function handleDelete() {
    if (!isMatch) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction(confirmation);
      if (result.ok) {
        // Account deleted — redirect to home
        window.location.href = "/";
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <section className="rounded-2xl border-2 border-error/20 bg-error/[0.03] p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
            <i className="fa-solid fa-triangle-exclamation text-error" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-error uppercase tracking-widest">
              Danger Zone
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Permanently delete your workspace, all forms, submissions, billing data, and your account.
              This action cannot be undone.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-error border-2 border-error/30 rounded-xl hover:bg-error/10 hover:border-error/50 transition-all"
            >
              <i className="fa-solid fa-trash text-[10px] mr-2" />
              Delete Account
            </button>
          </div>
        </div>
      </section>

      {/* Confirmation modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!pending) setShowModal(false); }}
        >
          <div
            className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-md shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <i className="fa-solid fa-triangle-exclamation text-error" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface">Delete account</h2>
                <p className="text-xs text-on-surface-variant/60">This is permanent and irreversible</p>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-error/[0.06] border border-error/15 rounded-xl p-4 space-y-2">
              <p className="text-sm text-on-surface leading-relaxed">
                This will permanently delete:
              </p>
              <div className="text-sm text-on-surface-variant space-y-1 ml-1">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-xmark text-error text-[10px]" />
                  Your workspace <span className="font-bold text-on-surface">{workspaceName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-xmark text-error text-[10px]" />
                  All forms and submissions
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-xmark text-error text-[10px]" />
                  All uploaded files and data
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-xmark text-error text-[10px]" />
                  Your subscription and billing history
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-xmark text-error text-[10px]" />
                  Your user account and login
                </div>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-2">
                Type <span className="text-error font-mono select-all">delete {workspaceName}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => { setConfirmation(e.target.value); setError(null); }}
                placeholder={`delete ${workspaceName}`}
                disabled={pending}
                autoComplete="off"
                autoFocus
                className="w-full px-4 py-3 text-sm bg-surface-container-lowest border-2 border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/30 focus:border-error/50 focus:ring-0 outline-none transition-all disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-error font-medium">
                <i className="fa-solid fa-circle-exclamation text-[10px] mr-1" />
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => { setShowModal(false); setConfirmation(""); setError(null); }}
                disabled={pending}
                className="flex-1 py-3 text-sm font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:bg-surface-container-high/50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!isMatch || pending}
                className="flex-1 py-3 text-sm font-bold text-on-primary bg-error rounded-xl hover:bg-error/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fa-solid fa-spinner fa-spin text-xs" />
                    Deleting...
                  </span>
                ) : (
                  <span>
                    <i className="fa-solid fa-trash text-[10px] mr-1.5" />
                    Delete permanently
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
