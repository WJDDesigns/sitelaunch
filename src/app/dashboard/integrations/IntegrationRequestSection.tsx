"use client";

import { useState, useTransition } from "react";
import {
  submitIntegrationRequestAction,
  removeIntegrationRequestAction,
} from "./actions";

interface ExistingRequest {
  integration_name: string;
  created_at: string;
}

interface Props {
  existingRequests: ExistingRequest[];
}

export default function IntegrationRequestSection({
  existingRequests,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [requests, setRequests] = useState(existingRequests);
  const [isOpen, setIsOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setMsg(null);
    startTransition(async () => {
      try {
        const result = await submitIntegrationRequestAction(
          name.trim(),
          description.trim() || undefined,
        );
        setMsg({ text: result.message, ok: true });
        setRequests((prev) => [
          ...prev,
          { integration_name: name.trim().toLowerCase(), created_at: new Date().toISOString() },
        ]);
        setName("");
        setDescription("");
        // Auto-close form after success
        setTimeout(() => setIsOpen(false), 1500);
      } catch (err) {
        setMsg({
          text: err instanceof Error ? err.message : "Failed to submit",
          ok: false,
        });
      }
    });
  }

  function handleRemove(integrationName: string) {
    startTransition(async () => {
      await removeIntegrationRequestAction(integrationName);
      setRequests((prev) =>
        prev.filter((r) => r.integration_name !== integrationName),
      );
    });
  }

  return (
    <div className="mt-10 pt-8 border-t border-outline-variant/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <i className="fa-solid fa-lightbulb text-primary text-sm" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-on-surface">
              Request an Integration
            </h3>
            <p className="text-xs text-on-surface-variant/60">
              Don&apos;t see what you need? Let us know and we&apos;ll prioritize it.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setMsg(null);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-primary border border-primary/20 rounded-xl hover:bg-primary/5 transition-all"
        >
          <i className={`fa-solid ${isOpen ? "fa-times" : "fa-plus"} text-[10px]`} />
          {isOpen ? "Close" : "Request"}
        </button>
      </div>

      {/* Expandable form */}
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-outline-variant/15 bg-surface-container/50 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="space-y-3">
            <div>
              <label
                htmlFor="req-name"
                className="block text-xs font-bold text-on-surface-variant mb-1.5"
              >
                Integration Name <span className="text-error">*</span>
              </label>
              <input
                id="req-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HubSpot, Mailchimp, Zapier..."
                maxLength={100}
                required
                className="w-full px-3.5 py-2.5 text-sm bg-surface-container-highest/50 border border-outline-variant/15 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="req-desc"
                className="block text-xs font-bold text-on-surface-variant mb-1.5"
              >
                What would you use it for?{" "}
                <span className="font-normal text-on-surface-variant/50">(optional)</span>
              </label>
              <textarea
                id="req-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your use case..."
                rows={2}
                maxLength={500}
                className="w-full px-3.5 py-2.5 text-sm bg-surface-container-highest/50 border border-outline-variant/15 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-5 py-2.5 text-xs font-bold text-on-primary bg-primary rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <i className="fa-solid fa-spinner animate-spin text-[10px]" />
                  Submitting...
                </span>
              ) : (
                "Submit Request"
              )}
            </button>
            {msg && (
              <span
                className={`text-xs font-medium ${msg.ok ? "text-tertiary" : "text-error"}`}
              >
                <i
                  className={`fa-solid ${msg.ok ? "fa-check-circle" : "fa-exclamation-circle"} mr-1`}
                />
                {msg.text}
              </span>
            )}
          </div>
        </form>
      )}

      {/* Existing requests */}
      {requests.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2">
            Your Requests
          </p>
          <div className="flex flex-wrap gap-2">
            {requests.map((r) => (
              <span
                key={r.integration_name}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/[0.06] border border-primary/10 text-xs font-medium text-on-surface group"
              >
                {r.integration_name}
                <button
                  type="button"
                  onClick={() => handleRemove(r.integration_name)}
                  className="text-on-surface-variant/30 hover:text-error transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove request"
                >
                  <i className="fa-solid fa-times text-[8px]" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
