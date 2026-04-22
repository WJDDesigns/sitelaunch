"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FormSchema } from "@/lib/forms";
import { toggleFormActiveAction } from "./form-actions";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import TemplatePicker from "./TemplatePicker";
import ConditionalFlowCanvas from "./ConditionalFlowCanvas";

export default function FormEditorShell({
  initialSchema,
  hasForm,
  publicUrl,
  primaryColor,
  formId,
  formName,
  isActive: initialIsActive,
  hasAI,
  hasPaymentGateway,
  settingsSlot,
  sendToSlot,
}: {
  initialSchema: FormSchema | null;
  hasForm: boolean;
  publicUrl: string | null;
  primaryColor: string;
  formId?: string;
  formName?: string;
  isActive?: boolean;
  hasAI?: boolean;
  hasPaymentGateway?: boolean;
  settingsSlot?: React.ReactNode;
  sendToSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [showTemplates, setShowTemplates] = useState(!hasForm);
  const [mode, setMode] = useState<"editor" | "preview" | "logic" | "send-to">("editor");
  const [liveSchema, setLiveSchema] = useState<FormSchema | null>(initialSchema);
  const [copied, setCopied] = useState(false);
  const [isActive, setIsActive] = useState(initialIsActive ?? true);
  const [publishing, startPublish] = useTransition();
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  function handleTemplateDone() {
    setShowTemplates(false);
    router.refresh();
  }

  function handleCopyLink() {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTogglePublish() {
    if (!formId) return;
    setPublishMsg(null);
    startPublish(async () => {
      const result = await toggleFormActiveAction(formId, !isActive);
      if (result.ok) {
        setIsActive(!isActive);
        router.refresh();
      } else {
        setPublishMsg(result.error ?? "Failed.");
        setTimeout(() => setPublishMsg(null), 3000);
      }
    });
  }

  if (showTemplates) {
    return (
      <TemplatePicker
        mode={hasForm ? "modal" : "chooser"}
        onDone={handleTemplateDone}
      />
    );
  }

  if (!initialSchema) {
    return (
      <TemplatePicker mode="chooser" onDone={handleTemplateDone} />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Top toolbar — responsive */}
      <div className="shrink-0 px-2 sm:px-4 md:px-6 py-2 border-b border-outline-variant/10 bg-surface-container-low/30 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: back link + mode toggle */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {formId && (
            <Link href="/dashboard/forms" className="text-xs text-on-surface-variant/60 hover:text-primary transition-colors shrink-0 flex items-center gap-1.5">
              <i className="fa-solid fa-arrow-left text-[10px]" />
              <span className="hidden sm:inline">Back to Forms</span>
            </Link>
          )}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-surface-container rounded-lg p-0.5">
            <button
              onClick={() => setMode("editor")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                mode === "editor"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
              title="Editor"
            >
              <i className="fa-solid fa-pen-ruler text-[10px] sm:mr-1.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
            <button
              onClick={() => setMode("logic")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                mode === "logic"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
              title="Logic"
            >
              <i className="fa-solid fa-diagram-project text-[10px] sm:mr-1.5" />
              <span className="hidden sm:inline">Logic</span>
            </button>
            <button
              onClick={() => setMode("send-to")}
              className={`px-2 sm:px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                mode === "send-to"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
              title="Send To"
            >
              <i className="fa-solid fa-paper-plane text-[10px] sm:mr-1.5" />
              <span className="hidden sm:inline">Send To</span>
            </button>
            <button
              onClick={() => {
                setMode("preview");
                setLiveSchema(initialSchema);
              }}
              className={`px-2 sm:px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
                mode === "preview"
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
              title="Preview"
            >
              <i className="fa-solid fa-eye text-[10px] sm:mr-1.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>
        </div>

        {/* Right: status → link → copy link → notifications → settings (cog) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {publishMsg && (
            <span className="text-[10px] text-error font-medium hidden sm:inline">{publishMsg}</span>
          )}
          {/* Status dropdown */}
          {formId && (
            <div className="relative">
              <select
                value={isActive ? "published" : "draft"}
                onChange={(e) => {
                  const wantActive = e.target.value === "published";
                  if (wantActive !== isActive) handleTogglePublish();
                }}
                disabled={publishing}
                className={`appearance-none pl-5 sm:pl-6 pr-6 sm:pr-8 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full border cursor-pointer focus:outline-none transition-all disabled:opacity-60 ${
                  isActive
                    ? "text-tertiary bg-tertiary/10 border-tertiary/20"
                    : "text-on-surface-variant/60 bg-surface-container-high border-outline-variant/15"
                }`}
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <i className={`fa-solid ${isActive ? "fa-circle-check" : "fa-circle-pause"} text-[8px] absolute left-1.5 sm:left-2 top-1/2 -translate-y-1/2 pointer-events-none ${isActive ? "text-tertiary" : "text-on-surface-variant/60"}`} />
              <i className="fa-solid fa-chevron-down text-[7px] absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40" />
            </div>
          )}
          {/* Link URL + Copy Link */}
          {publicUrl && isActive && (
            <>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-on-surface-variant/60 hidden lg:inline truncate max-w-[200px] xl:max-w-xs hover:text-primary transition-colors"
                title="Open form in new tab"
              >
                {publicUrl.replace(/^https?:\/\//, "")}
                <i className="fa-solid fa-arrow-up-right-from-square text-[8px] ml-1.5 opacity-40" />
              </a>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all whitespace-nowrap"
                title={publicUrl}
              >
                <i className={`fa-solid ${copied ? "fa-check" : "fa-link"} text-[10px]`} />
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Link"}</span>
              </button>
            </>
          )}
          {/* Settings slot (notifications button + settings cog) */}
          {settingsSlot}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {mode === "editor" ? (
          <FormEditor
            initialSchema={initialSchema}
            onOpenTemplates={() => setShowTemplates(true)}
            formId={formId}
            hasAI={hasAI}
            hasPaymentGateway={hasPaymentGateway}
          />
        ) : mode === "logic" ? (
          <ConditionalFlowCanvas
            schema={liveSchema ?? initialSchema}
            onChange={(updated) => {
              setLiveSchema(updated);
              // Auto-save via the same action the editor uses
              if (formId) {
                import("./actions").then(({ saveFormSchemaAction }) => {
                  saveFormSchemaAction(JSON.stringify(updated), formId);
                });
              }
            }}
          />
        ) : mode === "send-to" ? (
          sendToSlot ?? (
            <div className="h-full flex items-center justify-center text-sm text-on-surface-variant/60">
              Save your form first to configure send-to options.
            </div>
          )
        ) : (
          <div className="h-full overflow-y-auto">
            <FormPreview schema={liveSchema ?? initialSchema} primaryColor={primaryColor} />
          </div>
        )}
      </div>
    </div>
  );
}
