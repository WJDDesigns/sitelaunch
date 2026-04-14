"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormSchema } from "@/lib/forms";
import FormEditor from "./FormEditor";
import FormPreview from "./FormPreview";
import TemplatePicker from "./TemplatePicker";

export default function FormEditorShell({
  initialSchema,
  hasForm,
  publicUrl,
  primaryColor,
}: {
  initialSchema: FormSchema | null;
  hasForm: boolean;
  publicUrl: string | null;
  primaryColor: string;
}) {
  const router = useRouter();
  const [showTemplates, setShowTemplates] = useState(!hasForm);
  const [mode, setMode] = useState<"editor" | "preview">("editor");
  const [liveSchema, setLiveSchema] = useState<FormSchema | null>(initialSchema);
  const [copied, setCopied] = useState(false);

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
    <div className="flex flex-col h-screen">
      {/* Top toolbar with preview toggle + public link */}
      <div className="shrink-0 px-4 sm:px-6 py-2.5 border-b border-outline-variant/10 bg-surface-container-low/30 flex items-center justify-between gap-3">
        {/* Left: mode toggle */}
        <div className="flex items-center gap-1 bg-surface-container rounded-lg p-0.5">
          <button
            onClick={() => setMode("editor")}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
              mode === "editor"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            <i className="fa-solid fa-pen-ruler text-[10px] mr-1.5" />
            Editor
          </button>
          <button
            onClick={() => {
              setMode("preview");
              setLiveSchema(initialSchema);
            }}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all ${
              mode === "preview"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/60 hover:text-on-surface"
            }`}
          >
            <i className="fa-solid fa-eye text-[10px] mr-1.5" />
            Preview
          </button>
        </div>

        {/* Right: public link */}
        {publicUrl && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-on-surface-variant/60 hidden md:inline truncate max-w-[200px] lg:max-w-xs">
              {publicUrl.replace(/^https?:\/\//, "")}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-all whitespace-nowrap"
            >
              <i className={`fa-solid ${copied ? "fa-check" : "fa-link"} text-[10px]`} />
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/20 rounded-lg hover:border-primary/30 hover:text-primary transition-all whitespace-nowrap"
            >
              <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
              <span className="hidden sm:inline">Open</span>
            </a>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0">
        {mode === "editor" ? (
          <FormEditor
            initialSchema={initialSchema}
            onOpenTemplates={() => setShowTemplates(true)}
          />
        ) : (
          <div className="h-full overflow-y-auto">
            <FormPreview schema={initialSchema} primaryColor={primaryColor} />
          </div>
        )}
      </div>
    </div>
  );
}
