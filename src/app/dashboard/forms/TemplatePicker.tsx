"use client";

import { useState, useEffect, useTransition } from "react";
import type { FormSchema } from "@/lib/forms";
import type { TemplateInfo } from "./template-actions";
import {
  listTemplatesAction,
  applyTemplateAction,
  startBlankFormAction,
  saveAsTemplateAction,
} from "./template-actions";

/* ── Category metadata ─────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  "web-design": "Web Design",
  general: "General",
  marketing: "Marketing",
  consulting: "Consulting",
  ecommerce: "E-Commerce",
};

/* ── Main component ────────────────────────────────────────── */

export default function TemplatePicker({
  mode,
  onDone,
}: {
  /** "chooser" = full-page chooser (no form yet); "modal" = overlay from existing editor */
  mode: "chooser" | "modal";
  onDone: () => void;
}) {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "predefined" | "mine">("all");

  /* Save-as-template modal state */
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDesc, setSaveDesc] = useState("");
  const [saveCat, setSaveCat] = useState("general");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    listTemplatesAction().then((t) => {
      setTemplates(t);
      setLoading(false);
    });
  }, []);

  const predefined = templates.filter((t) => t.is_predefined);
  const mine = templates.filter((t) => !t.is_predefined);
  const filtered =
    filter === "predefined" ? predefined : filter === "mine" ? mine : templates;

  /* Group by category */
  const grouped = new Map<string, TemplateInfo[]>();
  for (const t of filtered) {
    const cat = t.category || "general";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(t);
  }

  function handleApply(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await applyTemplateAction(id);
      if (!res.ok) {
        setError(res.error ?? "Failed to apply template.");
      } else {
        onDone();
      }
    });
  }

  function handleBlank() {
    setError(null);
    startTransition(async () => {
      const res = await startBlankFormAction();
      if (!res.ok) {
        setError(res.error ?? "Failed to create blank form.");
      } else {
        onDone();
      }
    });
  }

  function handleSaveAsTemplate() {
    setSaveMsg(null);
    startTransition(async () => {
      const res = await saveAsTemplateAction(saveName, saveDesc, saveCat);
      if (!res.ok) {
        setSaveMsg(res.error ?? "Failed to save template.");
      } else {
        setSaveMsg("Template saved!");
        setSaveName("");
        setSaveDesc("");
        setShowSave(false);
        // Refresh list
        const t = await listTemplatesAction();
        setTemplates(t);
      }
    });
  }

  const selected = templates.find((t) => t.id === selectedId);

  return (
    <div className={mode === "chooser" ? "flex flex-col h-screen" : "flex flex-col h-full"}>
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-outline-variant/10 bg-surface-container-low/50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-headline font-bold tracking-tight text-on-surface">
              {mode === "chooser" ? "Choose a Template" : "Template Library"}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {mode === "chooser"
                ? "Pick a starting point or start from scratch."
                : "Apply a template or save your current form."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {mode === "modal" && (
              <button
                onClick={() => setShowSave(true)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-all"
              >
                Save as Template
              </button>
            )}
            {mode === "modal" && (
              <button
                onClick={onDone}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mt-4">
          {(["all", "predefined", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface-variant"
              }`}
            >
              {f === "all" ? "All" : f === "predefined" ? "Predefined" : "My Templates"}
              {f === "mine" && mine.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-surface-container-highest px-1.5 py-0.5 rounded-full">
                  {mine.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-on-surface-variant">
            Loading templates...
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Start blank card */}
            <button
              onClick={handleBlank}
              disabled={pending}
              className="w-full p-6 border-2 border-dashed border-outline-variant/30 rounded-2xl hover:border-primary/40 transition-all text-center group cursor-pointer"
            >
              <div className="w-12 h-12 mx-auto rounded-xl bg-surface-container-high flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors text-on-surface-variant group-hover:text-primary">
                <i className="fa-solid fa-plus text-lg" />
              </div>
              <div className="text-sm font-bold text-on-surface">Start from Scratch</div>
              <div className="text-xs text-on-surface-variant mt-1">
                Begin with a blank form and build your own steps and fields.
              </div>
            </button>

            {/* Template groups */}
            {[...grouped.entries()].map(([cat, tpls]) => (
              <div key={cat}>
                <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tpls.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedId(selectedId === t.id ? null : t.id)}
                      className={`p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        selectedId === t.id
                          ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                          : "border-outline-variant/15 bg-surface-container hover:border-primary/30 hover:bg-surface-container-high"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shrink-0">
                          <i className={`fa-solid ${t.icon || "fa-file-lines"} text-lg`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-on-surface truncate">{t.name}</div>
                          <div className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                            {t.description || "No description"}
                          </div>
                        </div>
                      </div>
                      {/* Badge */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          t.is_predefined
                            ? "bg-tertiary/15 text-tertiary"
                            : "bg-primary/15 text-primary"
                        }`}>
                          {t.is_predefined ? "Predefined" : "Custom"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60">
                          {(t.schema as FormSchema).steps.length} steps &middot;{" "}
                          {(t.schema as FormSchema).steps.reduce((n, s) => n + s.fields.length, 0)} fields
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filtered.length === 0 && !loading && (
              <div className="text-center py-12 text-on-surface-variant">
                {filter === "mine"
                  ? "You haven't saved any templates yet. Build a form and save it as a template!"
                  : "No templates found."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar — preview + apply */}
      {selectedId && selected && (
        <div className="shrink-0 border-t border-outline-variant/10 bg-surface-container-low/50 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm font-bold text-on-surface truncate flex items-center gap-2">
                <i className={`fa-solid ${selected.icon || "fa-file-lines"} text-primary`} />
                {selected.name}
              </div>
              <div className="text-xs text-on-surface-variant">
                {(selected.schema as FormSchema).steps.map((s) => s.title).join(" → ")}
              </div>
            </div>
            <button
              onClick={() => handleApply(selectedId)}
              disabled={pending}
              className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] disabled:opacity-60 transition-all whitespace-nowrap"
            >
              {pending ? "Applying..." : "Use This Template"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="shrink-0 px-6 py-3 bg-error-container/20 text-error text-xs text-center">
          {error}
        </div>
      )}

      {/* Save-as-template modal */}
      {showSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-md mx-4 space-y-4">
            <h3 className="text-lg font-headline font-bold text-on-surface">Save as Template</h3>
            <p className="text-xs text-on-surface-variant">
              Save your current form as a reusable template you can apply to future projects.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Template Name</span>
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="My Custom Onboarding"
                  className="block w-full px-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Description</span>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder="Brief description of this template..."
                  rows={2}
                  className="block w-full px-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Category</span>
                <select
                  value={saveCat}
                  onChange={(e) => setSaveCat(e.target.value)}
                  className="block w-full px-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface focus:ring-1 focus:ring-primary/50 outline-none"
                >
                  <option value="general">General</option>
                  <option value="web-design">Web Design</option>
                  <option value="marketing">Marketing</option>
                  <option value="consulting">Consulting</option>
                  <option value="ecommerce">E-Commerce</option>
                </select>
              </label>
            </div>
            {saveMsg && <p className="text-xs text-error">{saveMsg}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSave(false)}
                className="text-sm text-on-surface-variant/60 hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={pending || !saveName.trim()}
                className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] disabled:opacity-60 transition-all"
              >
                {pending ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
