"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { updateEmailTemplateAction, sendTestTemplateAction } from "./actions";

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  html_body: string;
  description: string | null;
  variables: string[];
  updated_at: string;
  created_at: string;
}

export default function EmailTemplatesEditor({
  templates,
}: {
  templates: EmailTemplate[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {templates.map((t) => (
        <AccordionItem
          key={t.id}
          template={t}
          isOpen={openId === t.id}
          onToggle={() => setOpenId(openId === t.id ? null : t.id)}
        />
      ))}
    </div>
  );
}

function AccordionItem({
  template,
  isOpen,
  onToggle,
}: {
  template: EmailTemplate;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [htmlBody, setHtmlBody] = useState(template.html_body);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, startSaving] = useTransition();
  const [testing, startTesting] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const isDirty = subject !== template.subject || htmlBody !== template.html_body;

  const insertVariable = useCallback(
    (varName: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const placeholder = `{{${varName}}}`;
      const before = htmlBody.slice(0, start);
      const after = htmlBody.slice(end);
      const newValue = before + placeholder + after;
      setHtmlBody(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + placeholder.length;
      });
    },
    [htmlBody],
  );

  function handleSave() {
    setMessage(null);
    startSaving(async () => {
      const result = await updateEmailTemplateAction(template.id, subject, htmlBody);
      if (result.ok) {
        setMessage({ type: "success", text: "Template saved successfully." });
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to save." });
      }
    });
  }

  function handleSendTest() {
    setMessage(null);
    startTesting(async () => {
      const result = await sendTestTemplateAction(template.id);
      if (result.ok) {
        setMessage({
          type: "success",
          text: result.error ?? "Test email sent! Check your inbox.",
        });
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to send test email." });
      }
    });
  }

  const updated = new Date(template.updated_at);
  const timeAgo = getTimeAgo(updated);

  return (
    <div
      className={`rounded-2xl border bg-surface-container/50 shadow-xl shadow-black/10 overflow-hidden transition-colors ${
        isOpen
          ? "border-l-2 border-l-primary border-outline-variant/[0.12]"
          : "border-outline-variant/[0.08]"
      }`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-primary/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-envelope text-xs text-primary" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-bold text-on-surface truncate">{template.name}</p>
            <p className="text-xs text-on-surface-variant/60 truncate">
              {template.description} &middot; Updated {timeAgo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-mono text-on-surface-variant/40 bg-surface-container-high/40 px-2 py-1 rounded-lg">
            {template.slug}
          </span>
          <i
            className={`fa-solid fa-chevron-down text-xs text-on-surface-variant/40 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Content */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isOpen ? "2000px" : "0",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-6 pb-6 space-y-5 border-t border-outline-variant/[0.06]">
          {/* Subject */}
          <div className="pt-5">
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full font-mono text-sm bg-surface-container-high/40 border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface placeholder:text-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
              placeholder="Email subject..."
            />
          </div>

          {/* Variables */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
              Available Variables
            </label>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="inline-flex px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-mono cursor-pointer hover:bg-primary/20 transition-colors"
                  title={`Click to insert {{${v}}} at cursor`}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* HTML Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                HTML Body
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                <i className={`fa-solid ${showPreview ? "fa-code" : "fa-eye"} mr-1`} />
                {showPreview ? "Editor" : "Preview"}
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={htmlBody}
              onChange={(e) => setHtmlBody(e.target.value)}
              className="font-mono text-xs bg-surface-container-high/40 border border-outline-variant/10 rounded-xl p-4 text-on-surface w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all resize-y"
              style={{ height: "400px", minHeight: "200px" }}
              spellCheck={false}
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">
                Preview
              </label>
              <iframe
                srcDoc={previewHtml(htmlBody)}
                title="Email preview"
                className="w-full h-[500px] rounded-xl border border-outline-variant/10 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !isDirty}
              className="bg-primary text-on-primary font-semibold rounded-xl px-6 py-3 text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-floppy-disk mr-2" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendTest}
              disabled={testing}
              className="bg-surface-container-high/60 text-on-surface font-semibold rounded-xl px-6 py-3 text-sm border border-outline-variant/10 hover:bg-surface-container-highest/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {testing ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-paper-plane mr-2" />
                  Send Test Email
                </>
              )}
            </button>

            {isDirty && (
              <span className="text-xs text-amber-400 font-medium">
                <i className="fa-solid fa-circle-exclamation mr-1" />
                Unsaved changes
              </span>
            )}
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-sm px-4 py-3 rounded-xl ${
                message.type === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              <i
                className={`fa-solid ${
                  message.type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
                } mr-2`}
              />
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Rewrite absolute logo URLs to relative paths so the preview iframe
 * can load them from the local Next.js server instead of the production
 * domain (which may not be reachable during development).
 */
function previewHtml(html: string): string {
  return html.replace(
    /https?:\/\/(?:www\.)?mysitelaunch\.com\/(email-logo[^"')\s]*)/g,
    "/$1",
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
