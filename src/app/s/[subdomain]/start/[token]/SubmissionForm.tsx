"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import type { FormSchema, FieldDef, UploadedFile, PackageRule, RepeaterSubField } from "@/lib/forms";
import { isLightColor } from "@/lib/color-utils";
import FileField from "./FileField";

interface Props {
  schema: FormSchema;
  initialData: Record<string, unknown>;
  initialFiles: Record<string, UploadedFile[]>;
  primaryColor: string;
  partnerName: string;
  partnerLogoUrl: string | null;
  saveStep: (
    stepId: string,
    formData: FormData,
  ) => Promise<{ errors?: Record<string, string>; nextStepId?: string; done?: boolean }>;
  submit: () => Promise<void>;
  uploadFile: (fieldId: string, formData: FormData) => Promise<UploadedFile>;
  deleteFile: (fileId: string) => Promise<void>;
}

/* ── animation styles ──────────────────────────────────────── */
const STYLE_ID = "sl-celestial-styles";
function ensureStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes sl-fade-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes sl-fade-out { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-30px); } }
    @keyframes sl-fade-in  { from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
    @keyframes sl-check    { 0%{ transform:scale(0); } 60%{ transform:scale(1.2); } 100%{ transform:scale(1); } }
    .sl-fade-up   { animation: sl-fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both; }
    .sl-fade-out  { animation: sl-fade-out 0.3s ease-in both; }
    .sl-fade-in   { animation: sl-fade-in 0.45s cubic-bezier(0.22,1,0.36,1) both; }
    .sl-check     { animation: sl-check 0.4s cubic-bezier(0.22,1,0.36,1) both; }
    .sl-d1 { animation-delay:0.05s; } .sl-d2 { animation-delay:0.1s; }
    .sl-d3 { animation-delay:0.15s; } .sl-d4 { animation-delay:0.2s; } .sl-d5 { animation-delay:0.25s; }
  `;
  document.head.appendChild(style);
}

const GREETINGS = [
  "Great, let\u2019s keep going!",
  "You\u2019re doing great \u2014 next up:",
  "Almost there, just a few more things.",
  "Nice! Here\u2019s what\u2019s next.",
  "Perfect, moving right along.",
];

const INPUT_CLS =
  "block w-full px-4 py-3 text-base bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all duration-200";


export default function SubmissionForm({
  schema, initialData, initialFiles, primaryColor,
  partnerName, partnerLogoUrl,
  saveStep, submit, uploadFile, deleteFile,
}: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [transitioning, setTransitioning] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const logoClickRef = useRef(0);
  const logoTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { ensureStyles(); }, []);

  const step = schema.steps[stepIdx];
  const isLast = stepIdx === schema.steps.length - 1;
  const progress = ((stepIdx) / schema.steps.length) * 100;
  const lightBg = isLightColor(primaryColor);

  useEffect(() => {
    if (transitioning) return;
    const timer = setTimeout(() => {
      containerRef.current?.querySelector<HTMLElement>(
        "input:not([type=hidden]):not([type=checkbox]), textarea, select"
      )?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, [stepIdx, transitioning]);

  function updateField(id: string, v: unknown) {
    setData((prev) => ({ ...prev, [id]: v }));
    if (errors[id]) setErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function handleLogoClick() {
    logoClickRef.current += 1;
    clearTimeout(logoTimerRef.current);
    if (logoClickRef.current >= 10) {
      logoClickRef.current = 0;
      setDevMode((prev) => !prev);
    } else {
      logoTimerRef.current = setTimeout(() => { logoClickRef.current = 0; }, 2000);
    }
  }

  const animateTransition = useCallback((cb: () => void) => {
    setTransitioning(true);
    setTimeout(() => { cb(); setTimeout(() => setTransitioning(false), 50); }, 300);
  }, []);

  function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    // Dev mode: skip validation, just move to next step
    if (devMode) {
      setErrors({});
      setCompletedSteps((prev) => new Set(prev).add(stepIdx));
      if (isLast) {
        setShowDone(true);
      } else {
        animateTransition(() => setStepIdx((i) => Math.min(schema.steps.length - 1, i + 1)));
      }
      return;
    }

    startTransition(async () => {
      const res = await saveStep(step.id, fd);
      if (res.errors) { setErrors(res.errors); return; }
      setErrors({});
      // Mark step completed
      setCompletedSteps((prev) => new Set(prev).add(stepIdx));
      if (res.done) {
        startSubmit(async () => { await submit(); setShowDone(true); });
      } else if (res.nextStepId) {
        const nextIdx = schema.steps.findIndex((s) => s.id === res.nextStepId);
        if (nextIdx >= 0) animateTransition(() => setStepIdx(nextIdx));
      }
    });
  }

  function goToStep(idx: number) {
    if (idx === stepIdx) return;
    // Dev mode allows navigating to any step
    if (!devMode && !completedSteps.has(idx)) return;
    animateTransition(() => setStepIdx(idx));
  }

  /* Done screen */
  if (showDone) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center space-y-6 sl-fade-up">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center sl-check" style={{ backgroundColor: primaryColor + "18" }}>
            <i className="fa-solid fa-check text-3xl" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">All done!</h1>
          <p className="text-on-surface-variant text-lg">Thanks for submitting everything. We&apos;ll take it from here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen" ref={containerRef}>
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-[300px] lg:w-[340px] shrink-0 border-r border-outline-variant/15 bg-surface-container/50 sticky top-0 h-screen overflow-y-auto">
        {/* Partner branding */}
        <div className="px-6 pt-8 pb-6 border-b border-outline-variant/10">
          <div className="flex items-center gap-3 cursor-default select-none" onClick={handleLogoClick}>
            {partnerLogoUrl ? (
              <div className="h-10 rounded-xl flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partnerLogoUrl} alt={partnerName} className="h-8 w-auto object-contain" draggable={false} />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="font-bold text-lg" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }}>
                  {partnerName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-base font-bold text-on-surface font-headline tracking-tight">{partnerName}</span>
            {devMode && (
              <span className="ml-auto text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                dev
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Progress</span>
            <span className="text-xs font-bold font-headline" style={{ color: primaryColor }}>{Math.round(((completedSteps.size) / schema.steps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-700 ease-out rounded-full"
              style={{
                width: `${(completedSteps.size / schema.steps.length) * 100}%`,
                backgroundColor: primaryColor,
              }}
            />
          </div>
        </div>

        {/* Step list */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {schema.steps.map((s, i) => {
            const isCurrent = i === stepIdx;
            const isCompleted = completedSteps.has(i);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(i)}
                disabled={!devMode && !isCompleted && !isCurrent}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group ${
                  isCurrent
                    ? "bg-surface-container-high"
                    : isCompleted || devMode
                    ? "hover:bg-surface-container-high/60 cursor-pointer"
                    : "opacity-50 cursor-default"
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isCompleted
                      ? ""
                      : isCurrent
                      ? "ring-2 ring-offset-2 ring-offset-surface-container/50"
                      : "bg-surface-container-highest"
                  }`}
                  style={
                    isCompleted
                      ? { backgroundColor: primaryColor }
                      : isCurrent
                      ? { backgroundColor: primaryColor + "18", "--tw-ring-color": primaryColor } as React.CSSProperties
                      : undefined
                  }
                >
                  {isCompleted ? (
                    <i className="fa-solid fa-check text-xs" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }} />
                  ) : (
                    <span
                      className={`text-xs font-bold ${isCurrent ? "" : "text-on-surface-variant/60"}`}
                      style={isCurrent ? { color: primaryColor } : undefined}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>

                {/* Step title */}
                <div className="min-w-0 flex-1">
                  <span
                    className={`text-sm font-medium block truncate ${
                      isCurrent
                        ? "text-on-surface font-semibold"
                        : isCompleted
                        ? "text-on-surface-variant"
                        : "text-on-surface-variant/60"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>

                {/* Active indicator */}
                {isCurrent && (
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-6 py-4 border-t border-outline-variant/10">
          <p className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest">
            Step {stepIdx + 1} of {schema.steps.length}
          </p>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-outline-variant/15">
        {/* Partner row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2.5 min-w-0 cursor-default select-none" onClick={handleLogoClick}>
            {partnerLogoUrl ? (
              <div className="h-8 flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={partnerLogoUrl} alt={partnerName} className="h-6 w-auto object-contain" draggable={false} />
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                <span className="font-bold text-sm" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }}>
                  {partnerName.slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-sm font-bold text-on-surface font-headline truncate">{partnerName}</span>
            {devMode && (
              <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0">
                dev
              </span>
            )}
          </div>
          <span className="text-xs font-bold font-headline shrink-0 ml-2" style={{ color: primaryColor }}>
            {stepIdx + 1}/{schema.steps.length}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {schema.steps.map((_, i) => {
            const isCompleted = completedSteps.has(i);
            const isCurrent = i === stepIdx;
            return (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  flex: isCurrent ? 3 : 1,
                  backgroundColor: isCompleted
                    ? primaryColor
                    : isCurrent
                    ? primaryColor
                    : "var(--color-surface-container-highest, rgba(255,255,255,0.1))",
                  opacity: isCompleted || isCurrent ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0">
        <div className="max-w-3xl mx-auto px-5 md:px-10 py-8 md:py-14">
          {/* Step header */}
          <div className={`mb-8 md:mb-10 ${transitioning ? "sl-fade-out" : "sl-fade-in"}`}>
            {stepIdx > 0 && (
              <p className="text-sm font-medium mb-2 sl-fade-up" style={{ color: primaryColor }}>
                {GREETINGS[stepIdx % GREETINGS.length]}
              </p>
            )}
            <h1 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface sl-fade-up sl-d1 max-w-2xl leading-tight">
              {step.title}
            </h1>
            {step.description && (
              <p className="text-on-surface-variant mt-2 md:mt-3 text-base md:text-lg leading-relaxed sl-fade-up sl-d2 max-w-xl">
                {step.description}
              </p>
            )}
          </div>

          {/* Fields */}
          <form onSubmit={handleNext} className={`space-y-6 ${transitioning ? "sl-fade-out" : "sl-fade-in"}`}>
            {step.fields.map((f, i) =>
              f.type === "file" || f.type === "files" ? (
                <div key={f.id} className={`sl-fade-up sl-d${Math.min(i + 2, 5)}`}>
                  <FileField field={f} initialFiles={initialFiles[f.id] ?? []} upload={uploadFile} remove={deleteFile} primaryColor={primaryColor} />
                </div>
              ) : f.type === "repeater" && f.repeaterConfig ? (
                <div key={f.id} className={`sl-fade-up sl-d${Math.min(i + 2, 5)}`}>
                  <RepeaterField field={f} value={data[f.id]} error={errors[f.id]} onChange={(v) => updateField(f.id, v)} primaryColor={primaryColor} />
                </div>
              ) : (
                <div key={f.id} className={`sl-fade-up sl-d${Math.min(i + 2, 5)}`}>
                  <CelestialField field={f} value={data[f.id]} error={errors[f.id]} onChange={(v) => updateField(f.id, v)} primaryColor={primaryColor} allData={data} />
                </div>
              ),
            )}

            {/* Nav */}
            <div className="flex items-center justify-between pt-6 md:pt-8 sl-fade-up sl-d5">
              <button
                type="button"
                onClick={() => animateTransition(() => setStepIdx((i) => Math.max(0, i - 1)))}
                disabled={stepIdx === 0 || pending || submitting || transitioning}
                className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface disabled:opacity-0 transition-all text-sm uppercase tracking-widest font-label"
              >
                <i className="fa-solid fa-chevron-left text-sm" />
                Previous
              </button>
              <button
                type="submit"
                disabled={pending || submitting || transitioning}
                className="group px-8 md:px-10 py-3.5 md:py-4 font-headline font-bold rounded-xl shadow-[0_10px_30px_rgba(192,193,255,0.2)] hover:shadow-[0_15px_40px_rgba(192,193,255,0.35)] hover:-translate-y-1 transition-all flex items-center gap-3 disabled:opacity-60"
                style={{ backgroundColor: primaryColor, color: isLightColor(primaryColor) ? "#1a1c25" : "#ffffff" }}
              >
                {submitting ? (
                  <><Spinner /> Submitting...</>
                ) : pending ? (
                  <><Spinner /> Saving...</>
                ) : isLast ? (
                  <>Submit <i className="fa-solid fa-check text-sm ml-1" /></>
                ) : (
                  <>Next Step <i className="fa-solid fa-chevron-right text-sm ml-1 transition-transform group-hover:translate-x-0.5" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Spinner() {
  return <i className="fa-solid fa-spinner fa-spin text-sm" />;
}

/* ── Repeater field (nested entries like pages) ───────────── */

type RepeaterEntry = Record<string, string>;

function RepeaterField({
  field, value, error, onChange, primaryColor,
}: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string;
}) {
  const cfg = field.repeaterConfig!;
  const lightBg = isLightColor(primaryColor);

  // Parse entries from stored value (JSON string or array)
  const entries: RepeaterEntry[] = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) {
      try { return JSON.parse(value); } catch { return []; }
    }
    return [];
  })();

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<RepeaterEntry>({});

  const atMax = cfg.maxEntries && cfg.maxEntries > 0 && entries.length >= cfg.maxEntries;

  function openNew() {
    setDraft({});
    setEditingIdx(-1); // -1 = new entry
  }
  function openEdit(idx: number) {
    setDraft({ ...entries[idx] });
    setEditingIdx(idx);
  }
  function closeEditor() {
    setEditingIdx(null);
    setDraft({});
  }
  function saveEntry() {
    // Validate required sub-fields
    for (const sf of cfg.subFields) {
      if (sf.required && !draft[sf.id]?.trim()) return;
      // Skip validation for conditionally hidden fields
      if (sf.showWhen) {
        const depVal = draft[sf.showWhen.fieldId] ?? "";
        if (!sf.showWhen.values.includes(depVal)) continue;
        if (sf.required && !draft[sf.id]?.trim()) return;
      }
    }
    let next: RepeaterEntry[];
    if (editingIdx === -1) {
      next = [...entries, draft];
    } else {
      next = entries.map((e, i) => (i === editingIdx ? draft : e));
    }
    onChange(JSON.stringify(next));
    closeEditor();
  }
  function removeEntry(idx: number) {
    const next = entries.filter((_, i) => i !== idx);
    onChange(JSON.stringify(next));
    if (editingIdx === idx) closeEditor();
  }

  function isSubFieldVisible(sf: RepeaterSubField): boolean {
    if (!sf.showWhen) return true;
    const depVal = draft[sf.showWhen.fieldId] ?? "";
    return sf.showWhen.values.includes(depVal);
  }

  // Summary columns: first 3 non-hidden text-like sub-fields
  const summaryFields = cfg.subFields.filter((sf) => !sf.showWhen).slice(0, 3);

  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

      {cfg.maxEntries && cfg.maxEntries > 0 && (
        <div className="mb-3 px-4 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            You can add up to <strong>{cfg.maxEntries}</strong> {cfg.entryLabel?.toLowerCase() || "entries"}{" "}
            based on your package.
          </p>
        </div>
      )}

      {/* Entries table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
        {entries.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                {summaryFields.map((sf) => (
                  <th key={sf.id} className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3">
                    {sf.label}
                  </th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, ei) => (
                <tr key={ei} className="border-b border-outline-variant/10 last:border-0 hover:bg-on-surface/[0.02] transition-colors">
                  {summaryFields.map((sf) => (
                    <td key={sf.id} className="px-4 py-3 text-on-surface truncate max-w-[200px]">
                      {entry[sf.id] || <span className="text-on-surface-variant/30">—</span>}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(ei)} className="text-xs text-primary hover:underline mr-2">Edit</button>
                    <button type="button" onClick={() => removeEntry(ei)} className="text-xs text-on-surface-variant/40 hover:text-error">
                      <i className="fa-solid fa-trash text-[10px]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {entries.length === 0 && editingIdx === null && (
          <div className="px-6 py-8 text-center text-sm text-on-surface-variant/60">
            There are no {cfg.entryLabel?.toLowerCase() || "entries"}.
          </div>
        )}

        {/* Inline editor */}
        {editingIdx !== null && (
          <div className="border-t border-outline-variant/15 bg-surface-container-low/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-widest">
                {editingIdx === -1 ? `New ${cfg.entryLabel || "Entry"}` : `Edit ${cfg.entryLabel || "Entry"} ${editingIdx + 1}`}
              </h4>
              <button type="button" onClick={closeEditor} className="text-on-surface-variant/40 hover:text-on-surface p-1">
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            </div>

            {cfg.subFields.map((sf) => {
              if (!isSubFieldVisible(sf)) return null;
              const val = draft[sf.id] ?? "";
              return (
                <div key={sf.id}>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1 ml-0.5">
                    {sf.label}
                    {sf.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
                  </label>
                  {sf.hint && <p className="text-[10px] text-on-surface-variant/60 mb-1 ml-0.5">{sf.hint}</p>}

                  {sf.type === "textarea" ? (
                    <textarea
                      value={val}
                      onChange={(e) => setDraft((d) => ({ ...d, [sf.id]: e.target.value }))}
                      placeholder={sf.placeholder}
                      rows={sf.rows ?? 3}
                      className="block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all"
                      style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
                    />
                  ) : sf.type === "select" ? (
                    <select
                      value={val}
                      onChange={(e) => setDraft((d) => ({ ...d, [sf.id]: e.target.value }))}
                      className="block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 outline-none transition-all"
                      style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
                    >
                      <option value="">Select...</option>
                      {(sf.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : sf.type === "radio" ? (
                    <div className="space-y-1.5">
                      {(sf.options ?? []).map((o) => (
                        <label key={o} className="flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all cursor-pointer" style={val === o ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
                          <input type="radio" name={`${field.id}_${sf.id}`} value={o} checked={val === o} onChange={() => setDraft((d) => ({ ...d, [sf.id]: o }))} className="h-3.5 w-3.5" style={{ accentColor: primaryColor }} />
                          <span className="text-sm text-on-surface">{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type={sf.type === "email" ? "email" : sf.type === "tel" ? "tel" : sf.type === "url" ? "url" : sf.type === "number" ? "number" : sf.type === "date" ? "date" : "text"}
                      value={val}
                      onChange={(e) => setDraft((d) => ({ ...d, [sf.id]: e.target.value }))}
                      placeholder={sf.placeholder}
                      className="block w-full px-4 py-3 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all"
                      style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
                    />
                  )}
                </div>
              );
            })}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={saveEntry}
                className="px-6 py-2.5 font-bold rounded-xl text-sm transition-all"
                style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
              >
                {editingIdx === -1 ? `Save ${cfg.entryLabel || "Entry"}` : "Update"}
              </button>
              <button type="button" onClick={closeEditor} className="px-4 py-2.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add button */}
      {editingIdx === null && (
        <button
          type="button"
          onClick={openNew}
          disabled={!!atMax}
          className="mt-3 px-5 py-2.5 font-bold rounded-xl text-sm transition-all disabled:opacity-40"
          style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
        >
          <i className="fa-solid fa-plus text-xs mr-1.5" />
          {cfg.addButtonLabel || `Add ${cfg.entryLabel || "Entry"}`}
        </button>
      )}

      {error && (
        <p className="text-sm text-error mt-2 sl-fade-up flex items-center gap-1.5">
          <i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function evaluatePackageRules(
  rules: PackageRule[],
  allData: Record<string, unknown>,
  defaultId?: string,
): string | null {
  for (const rule of rules) {
    const fieldVal = String(allData[rule.fieldId] ?? "");
    if (!fieldVal) continue;
    let match = false;
    switch (rule.operator) {
      case "equals": match = fieldVal === rule.value; break;
      case "contains": match = fieldVal.toLowerCase().includes(rule.value.toLowerCase()); break;
      case "greater_than": match = Number(fieldVal) > Number(rule.value); break;
      case "less_than": match = Number(fieldVal) < Number(rule.value); break;
    }
    if (match) return rule.recommendedPackageId;
  }
  return defaultId ?? null;
}

function CelestialField({
  field, value, error, onChange, primaryColor, allData,
}: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string; allData: Record<string, unknown>;
}) {
  const str = (value as string) ?? "";
  const focusRing = { "--tw-ring-color": primaryColor + "66" } as React.CSSProperties;
  const errBorder = error ? "#ffb4ab" : undefined;

  /* Heading fields are display-only — no input */
  if (field.type === "heading") {
    return (
      <div className="py-4 border-b border-on-surface-variant/20">
        <h3 className="text-lg font-bold text-on-surface font-headline">{field.label}</h3>
        {field.content && <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{field.content}</p>}
        {field.hint && <p className="text-xs text-on-surface-variant/60 mt-1">{field.hint}</p>}
      </div>
    );
  }

  /* Package selector */
  if (field.type === "package" && field.packageConfig) {
    const cfg = field.packageConfig;
    const selectedPkgId = (value as string) ?? "";
    const recommendedId = evaluatePackageRules(cfg.rules, allData, cfg.defaultPackageId);

    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

        {/* Package cards */}
        <div className={`grid gap-4 grid-cols-1 ${cfg.packages.length === 2 ? "sm:grid-cols-2" : cfg.packages.length >= 3 ? "sm:grid-cols-2 lg:grid-cols-3" : ""}`}>
          {cfg.packages.map((pkg) => {
            const isSelected = selectedPkgId === pkg.id;
            const isRecommended = recommendedId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onChange(pkg.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "shadow-lg scale-[1.02]"
                    : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08", boxShadow: `0 8px 25px ${primaryColor}20` } : undefined}
              >
                {/* Recommended badge */}
                {isRecommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: primaryColor, color: isLightColor(primaryColor) ? "#1a1c25" : "#ffffff" }}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[8px] mr-1" />
                    Recommended
                  </div>
                )}
                {/* Package badge */}
                {pkg.badge && !isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-highest text-on-surface-variant whitespace-nowrap border border-outline-variant/20">
                    {pkg.badge}
                  </div>
                )}

                <div className="mb-3 mt-1">
                  <h3 className="text-lg font-bold text-on-surface font-headline">{pkg.name}</h3>
                  {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                </div>

                <div className="mb-4">
                  {pkg.price === 0 ? (
                    <span className="text-2xl font-extrabold text-on-surface font-headline">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-on-surface font-headline">${pkg.price}</span>
                      <span className="text-xs text-on-surface-variant/60">/mo</span>
                    </div>
                  )}
                </div>

                {/* Feature list for this package */}
                {cfg.features.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-outline-variant/15">
                    {cfg.features.map((feat, fi) => {
                      const val = feat.values[pkg.id];
                      const isIncluded = val === true || (typeof val === "string" && val !== "");
                      return (
                        <div key={fi} className="flex items-center gap-2 text-xs">
                          {val === false ? (
                            <i className="fa-solid fa-xmark text-on-surface-variant/30 w-4 text-center" />
                          ) : val === true ? (
                            <i className="fa-solid fa-check w-4 text-center" style={{ color: primaryColor }} />
                          ) : (
                            <i className="fa-solid fa-check w-4 text-center" style={{ color: primaryColor }} />
                          )}
                          <span className={isIncluded ? "text-on-surface" : "text-on-surface-variant/40 line-through"}>
                            {feat.label}
                            {typeof val === "string" && val && (
                              <span className="ml-1 font-semibold" style={{ color: primaryColor }}>({val})</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selection indicator */}
                <div className="mt-4 flex items-center justify-center py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all" style={isSelected ? { backgroundColor: primaryColor, color: isLightColor(primaryColor) ? "#1a1c25" : "#ffffff" } : { backgroundColor: "transparent", border: `1px solid var(--color-outline-variant)`, color: "var(--color-on-surface-variant)" }}>
                  {isSelected ? (
                    <><i className="fa-solid fa-check text-[10px] mr-1.5" /> Selected</>
                  ) : (
                    "Select"
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="text-sm text-error mt-2 sl-fade-up flex items-center gap-1.5">
            <i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  /* Multi-option checkbox (when field has options array) */
  const isMultiCheckbox = field.type === "checkbox" && field.options && field.options.length > 0;
  /* Parse multi-checkbox value as array */
  const checkedValues: string[] = isMultiCheckbox
    ? (Array.isArray(value) ? value as string[] : typeof value === "string" && value ? value.split("||") : [])
    : [];

  return (
    <div className="group">
      <label htmlFor={field.id} className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}

      {field.type === "textarea" ? (
        <textarea id={field.id} name={field.id} required={field.required} placeholder={field.placeholder} rows={field.rows ?? 3} value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} style={{ ...focusRing, borderColor: errBorder }} />

      ) : field.type === "select" ? (
        <select id={field.id} name={field.id} required={field.required} value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} style={focusRing}>
          <option value="">Select...</option>
          {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>

      ) : field.type === "radio" ? (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200" style={str === opt ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
              <input type="radio" name={field.id} value={opt} checked={str === opt} onChange={() => onChange(opt)} className="h-4 w-4" style={{ accentColor: primaryColor }} />
              <span className="text-sm text-on-surface">{opt}</span>
            </label>
          ))}
        </div>

      ) : isMultiCheckbox ? (
        <div className="space-y-2">
          {(field.options ?? []).map((opt) => {
            const isChecked = checkedValues.includes(opt);
            const atMax = field.maxSelections && field.maxSelections > 0 && checkedValues.length >= field.maxSelections && !isChecked;
            return (
              <label key={opt} className={`flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200 ${atMax ? "opacity-40 cursor-not-allowed" : ""}`} style={isChecked ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
                <input type="checkbox" value={opt} checked={isChecked} disabled={!!atMax} onChange={() => {
                  const next = isChecked ? checkedValues.filter((v) => v !== opt) : [...checkedValues, opt];
                  onChange(next.join("||"));
                }} className="h-4 w-4 rounded" style={{ accentColor: primaryColor }} />
                <span className="text-sm text-on-surface">{opt}</span>
              </label>
            );
          })}
          {field.maxSelections && field.maxSelections > 0 && (
            <p className="text-xs text-on-surface-variant/60 ml-1">Select up to {field.maxSelections}</p>
          )}
        </div>

      ) : field.type === "checkbox" ? (
        <label htmlFor={field.id} className="flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200" style={value ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
          <input id={field.id} name={field.id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked ? "yes" : "")} className="h-5 w-5 rounded" style={{ accentColor: primaryColor }} />
          <span className="text-sm text-on-surface">{field.placeholder || "Yes"}</span>
        </label>

      ) : field.type === "date" ? (
        <input id={field.id} name={field.id} required={field.required} type="date" value={str} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLS} dark:[color-scheme:dark]`} style={{ ...focusRing, borderColor: errBorder }} />

      ) : field.type === "color" ? (
        <div className="flex items-center gap-3">
          <input type="color" value={str || "#c0c1ff"} onChange={(e) => onChange(e.target.value)} className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent" />
          <input id={field.id} name={field.id} required={field.required} placeholder={field.placeholder || "#c0c1ff"} value={str} onChange={(e) => onChange(e.target.value)} className={`${INPUT_CLS} flex-1`} style={{ ...focusRing, borderColor: errBorder }} />
        </div>

      ) : field.type === "address" ? (
        <textarea id={field.id} name={field.id} required={field.required} placeholder={field.placeholder || "Street address, City, State, ZIP"} rows={3} value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} style={{ ...focusRing, borderColor: errBorder }} />

      ) : (
        <input
          id={field.id} name={field.id} required={field.required} placeholder={field.placeholder}
          type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
          value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}
          style={{ ...focusRing, borderColor: errBorder }}
        />
      )}

      {error && (
        <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5">
          <i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
