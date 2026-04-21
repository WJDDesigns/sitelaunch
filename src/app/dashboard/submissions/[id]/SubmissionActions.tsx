"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  updateSubmissionStatusAction,
  deleteSubmissionAction,
  getResendIntegrationInfo,
  resendSubmissionAction,
} from "../actions";
import type { ResendIntegrationInfo } from "../actions";

const STATUSES = ["draft", "submitted", "in_review", "complete", "archived"] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-surface-container-high text-on-surface-variant",
  submitted: "bg-primary/10 text-primary border border-primary/20",
  in_review: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  complete: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  archived: "bg-surface-container-high text-on-surface-variant/60",
};

interface Props {
  submissionId: string;
  currentStatus: string;
}

export default function SubmissionActions({ submissionId, currentStatus }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resend modal state
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    return () => {
      if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
    };
  }, []);

  function flashMsg(text: string, duration = 3000) {
    setMsg(text);
    if (msgTimerRef.current !== null) clearTimeout(msgTimerRef.current);
    msgTimerRef.current = setTimeout(() => setMsg(null), duration);
  }

  function handleStatusChange(status: string) {
    setMsg(null);
    startTransition(async () => {
      try {
        await updateSubmissionStatusAction(
          submissionId,
          status as "draft" | "submitted" | "in_review" | "complete" | "archived",
        );
        flashMsg("Status updated.");
        router.refresh();
      } catch (e) {
        flashMsg((e as Error).message);
      }
    });
  }

  function handleDelete() {
    setMsg(null);
    startTransition(async () => {
      try {
        await deleteSubmissionAction(submissionId);
        router.replace("/dashboard/submissions");
      } catch (e) {
        flashMsg((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status dropdown */}
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={pending}
        className={`appearance-none px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter cursor-pointer border-0 outline-none disabled:opacity-50 ${
          STATUS_STYLES[currentStatus] ?? STATUS_STYLES.draft
        }`}
      >
        {STATUSES.map((st) => (
          <option key={st} value={st}>
            {st.replace("_", " ")}
          </option>
        ))}
      </select>

      {/* Resend */}
      <button
        onClick={() => setShowResend(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:text-primary transition-all"
      >
        <i className="fa-solid fa-paper-plane text-[10px]" />
        Resend
      </button>

      {/* PDF export */}
      <a
        href={`/dashboard/submissions/${submissionId}/pdf`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-xl hover:border-primary/30 hover:text-primary transition-all"
      >
        <i className="fa-solid fa-file-pdf text-[10px]" />
        Export PDF
      </a>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-error font-bold">Delete this submission?</span>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="px-3 py-1.5 text-xs font-bold bg-error text-on-error rounded-lg disabled:opacity-50"
          >
            {pending ? "Deleting..." : "Confirm"}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-on-surface-variant/60 hover:text-on-surface"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-error/70 hover:text-error border border-error/15 rounded-xl hover:border-error/30 transition-all"
        >
          <i className="fa-solid fa-trash text-[10px]" />
          Delete
        </button>
      )}

      {/* Feedback */}
      {msg && (
        <span className={`text-xs font-bold ${
          msg.includes("updated") || msg.includes("Sent") ? "text-tertiary" : "text-error"
        }`}>
          {msg}
        </span>
      )}

      {/* Resend Modal */}
      {showResend && (
        <ResendModal
          submissionId={submissionId}
          onClose={() => setShowResend(false)}
          onSuccess={(summary) => {
            setShowResend(false);
            flashMsg(summary, 5000);
          }}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * Resend Modal
 * ────────────────────────────────────────────────────────────────────── */

function ResendModal({
  submissionId,
  onClose,
  onSuccess,
}: {
  submissionId: string;
  onClose: () => void;
  onSuccess: (summary: string) => void;
}) {
  const [info, setInfo] = useState<ResendIntegrationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Options
  const [sendEmail, setSendEmail] = useState(true);
  const [emailMode, setEmailMode] = useState<"default" | "override">("default");
  const [emailOverride, setEmailOverride] = useState("");
  const [sendWebhooks, setSendWebhooks] = useState(false);
  const [sendSheets, setSendSheets] = useState(false);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Load integration info on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getResendIntegrationInfo(submissionId)
      .then((data) => {
        if (cancelled) return;
        setInfo(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError((err as Error).message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [submissionId]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
    },
    [onClose],
  );

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend() {
    if (!sendEmail && !sendWebhooks && !sendSheets) return;
    setSending(true);
    setError(null);

    try {
      const result = await resendSubmissionAction(submissionId, {
        sendEmail,
        emailOverride: sendEmail && emailMode === "override" ? emailOverride.trim() : undefined,
        sendWebhooks,
        sendSheets,
      });

      if (result.ok) {
        onSuccess(`Sent: ${result.sent.join(", ")}`);
      } else {
        const successPart = result.sent.length > 0 ? `Sent: ${result.sent.join(", ")}. ` : "";
        setError(`${successPart}Errors: ${result.errors.join("; ")}`);
        setSending(false);
      }
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  const nothingSelected = !sendEmail && !sendWebhooks && !sendSheets;
  const hasWebhooks = (info?.webhooks ?? []).length > 0;
  const hasSheets = info?.hasSheets ?? false;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-surface-container rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md border border-outline-variant/15 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <i className="fa-solid fa-paper-plane text-primary text-xs" />
            </div>
            <h2 className="text-base font-bold text-on-surface font-headline">Resend Entry</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-highest/50 transition-all"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <i className="fa-solid fa-circle-notch fa-spin text-primary text-lg" />
            </div>
          ) : error && !info ? (
            <p className="text-sm text-error">{error}</p>
          ) : info ? (
            <>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Re-fire this entry through its notification flows. Choose which channels to resend to.
              </p>

              {/* Email Notification */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-primary"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-envelope text-xs text-primary" />
                      <span className="text-sm font-semibold text-on-surface">Email Notification</span>
                    </div>
                    <p className="text-xs text-on-surface-variant/60 mt-0.5">
                      {info.defaultEmails.length > 0
                        ? `Default: ${info.defaultEmails.join(", ")}`
                        : "No default emails configured"}
                    </p>
                  </div>
                </label>

                {sendEmail && (
                  <div className="ml-7 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emailMode"
                        checked={emailMode === "default"}
                        onChange={() => setEmailMode("default")}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      <span className="text-xs font-medium text-on-surface">
                        Send to default recipients
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="emailMode"
                        checked={emailMode === "override"}
                        onChange={() => setEmailMode("override")}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      <span className="text-xs font-medium text-on-surface">
                        Send to a different email (testing)
                      </span>
                    </label>
                    {emailMode === "override" && (
                      <input
                        type="email"
                        value={emailOverride}
                        onChange={(e) => setEmailOverride(e.target.value)}
                        placeholder="test@example.com"
                        className="ml-5 block w-[calc(100%-1.25rem)] px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary outline-none"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-outline-variant/10" />

              {/* Webhooks */}
              <label className={`flex items-start gap-3 ${hasWebhooks ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
                <input
                  type="checkbox"
                  checked={sendWebhooks}
                  onChange={(e) => setSendWebhooks(e.target.checked)}
                  disabled={!hasWebhooks}
                  className="mt-0.5 w-4 h-4 rounded accent-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-bolt text-xs text-amber-400" />
                    <span className="text-sm font-semibold text-on-surface">Webhooks</span>
                    {hasWebhooks && (
                      <span className="text-[10px] font-bold text-on-surface-variant/50 bg-surface-container-highest/50 px-1.5 py-0.5 rounded">
                        {info.webhooks.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">
                    {hasWebhooks
                      ? info.webhooks.map((w) => w.name || w.provider).join(", ")
                      : "No webhooks configured for this form"}
                  </p>
                </div>
              </label>

              {/* Google Sheets */}
              <label className={`flex items-start gap-3 ${hasSheets ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
                <input
                  type="checkbox"
                  checked={sendSheets}
                  onChange={(e) => setSendSheets(e.target.checked)}
                  disabled={!hasSheets}
                  className="mt-0.5 w-4 h-4 rounded accent-primary"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <i className="fa-solid fa-table text-xs text-emerald-400" />
                    <span className="text-sm font-semibold text-on-surface">Google Sheets</span>
                    {hasSheets && (
                      <span className="text-[10px] font-bold text-on-surface-variant/50 bg-surface-container-highest/50 px-1.5 py-0.5 rounded">
                        {info.sheetsFeeds.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5">
                    {hasSheets
                      ? info.sheetsFeeds.map((s) => `${s.spreadsheetName} / ${s.sheetName}`).join(", ")
                      : "No Google Sheets feeds configured"}
                  </p>
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 text-xs text-error">
                  {error}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        {!loading && info && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || nothingSelected || (sendEmail && emailMode === "override" && !emailOverride.trim())}
              className="px-5 py-2.5 text-xs font-bold rounded-xl transition-all disabled:opacity-40 flex items-center gap-2 bg-primary text-on-primary hover:shadow-lg hover:shadow-primary/20"
            >
              {sending ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-[10px]" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane text-[10px]" />
                  Resend
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
