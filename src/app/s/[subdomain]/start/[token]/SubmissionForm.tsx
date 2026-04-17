"use client";

import { useState, useTransition, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import type { FormSchema, FieldDef, UploadedFile, PackageRule, RepeaterSubField } from "@/lib/forms";
import { evaluateCondition } from "@/lib/forms";
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
  partnerId?: string;
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
  saveStep, submit, uploadFile, deleteFile, partnerId,
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

  // Compute visible steps based on conditions evaluated against current data
  const visibleSteps = useMemo(
    () => schema.steps.filter((s) => evaluateCondition(s.showCondition, data)),
    [schema.steps, data],
  );

  const step = visibleSteps[stepIdx];
  const isLast = stepIdx === visibleSteps.length - 1;
  const progress = ((stepIdx) / visibleSteps.length) * 100;
  const lightBg = isLightColor(primaryColor);

  // Compute visible fields for current step based on conditions
  const visibleFields = useMemo(
    () => step?.fields.filter((f) => evaluateCondition(f.showCondition, data)) ?? [],
    [step, data],
  );

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
        animateTransition(() => setStepIdx((i) => Math.min(visibleSteps.length - 1, i + 1)));
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
        const nextIdx = visibleSteps.findIndex((s) => s.id === res.nextStepId);
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
                <Image src={partnerLogoUrl} alt={partnerName} width={160} height={40} className="h-8 w-auto object-contain" draggable={false} />
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
            <span className="text-xs font-bold font-headline" style={{ color: primaryColor }}>{Math.round(((completedSteps.size) / visibleSteps.length) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-700 ease-out rounded-full"
              style={{
                width: `${(completedSteps.size / visibleSteps.length) * 100}%`,
                backgroundColor: primaryColor,
              }}
            />
          </div>
        </div>

        {/* Step list */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {visibleSteps.map((s, i) => {
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
            Step {stepIdx + 1} of {visibleSteps.length}
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
                <Image src={partnerLogoUrl} alt={partnerName} width={120} height={32} className="h-6 w-auto object-contain" draggable={false} />
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
            {stepIdx + 1}/{visibleSteps.length}
          </span>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-1.5 px-4 pb-3">
          {visibleSteps.map((_, i) => {
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
            {visibleFields.map((f, i) =>
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
                  <CelestialField field={f} value={data[f.id]} error={errors[f.id]} onChange={(v) => updateField(f.id, v)} primaryColor={primaryColor} allData={data} partnerId={partnerId} />
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
                    <button type="button" onClick={() => removeEntry(ei)} className="text-xs text-on-surface-variant/40 hover:text-error" aria-label="Delete entry">
                      <i className="fa-solid fa-trash text-[10px]" aria-hidden="true" />
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
              <button type="button" onClick={closeEditor} className="text-on-surface-variant/40 hover:text-on-surface p-1" aria-label="Close editor">
                <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
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


/* ââ Site Structure Field ââ standalone component with drag-drop tree + menu preview */
function SiteStructureField({ field, value, error, onChange, primaryColor }: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string;
}) {
  const cfg = field.siteStructureConfig!;
  type PageEntry = { id: string; name: string; depth: number; offMenu?: boolean };
  type TreeNode = PageEntry & { children: TreeNode[] };
  const INPUT_CLS = "w-full rounded-xl border-2 border-outline-variant bg-surface-container-lowest/50 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 transition-all duration-200 focus:outline-none";
  const focusRing = { "--tw-ring-color": primaryColor + "60" } as React.CSSProperties;
  const errBorder = error ? "var(--color-error)" : "";
  const pages: PageEntry[] = (() => {
    try {
      if (typeof value === "string" && value) { const p = JSON.parse(value); return Array.isArray(p) ? p : []; }
      if (Array.isArray(value)) return value as PageEntry[];
      return (cfg.starterPages ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name, depth: 0, offMenu: false }));
    } catch { return []; }
  })();
  const uid = () => Math.random().toString(36).slice(2, 10);
  const update = (next: PageEntry[]) => onChange(JSON.stringify(next));
  const canAdd = !cfg.maxPages || pages.length < cfg.maxPages;
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const toTree = (list: PageEntry[]): TreeNode[] => {
    const roots: TreeNode[] = [];
    const stack: TreeNode[] = [];
    for (const p of list) {
      const node: TreeNode = { ...p, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].depth >= p.depth) stack.pop();
      if (stack.length === 0) roots.push(node);
      else stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
    return roots;
  };
  const canIndent = (i: number) => i > 0 && pages[i].depth <= pages[i - 1].depth;
  const canOutdent = (i: number) => pages[i].depth > 0;
  const indent = (i: number) => { if (!canIndent(i)) return; const n = [...pages]; n[i] = { ...n[i], depth: n[i].depth + 1 }; update(n); };
  const outdent = (i: number) => { if (!canOutdent(i)) return; const n = [...pages]; n[i] = { ...n[i], depth: n[i].depth - 1 }; update(n); };
  const handleDrop = (from: number, to: number) => { if (from === to) return; const n = [...pages]; const [m] = n.splice(from, 1); n.splice(to, 0, m); update(n); };
  const tree = toTree(pages);
  const renderMenuItems = (nodes: TreeNode[]) => nodes.filter(n => !n.offMenu).map(node => {
    const kids = (node.children || []).filter(c => !c.offMenu);
    return (
      <div key={node.id} className="relative group/mi">
        <div className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-surface-container-high transition-colors flex items-center gap-1 cursor-default whitespace-nowrap"
          style={{ color: node.name ? "var(--color-on-surface)" : "var(--color-on-surface-variant)" }}>
          {node.name || "Untitled"}
          {kids.length > 0 && <i className="fa-solid fa-chevron-down text-[8px] text-on-surface-variant/50 ml-0.5" />}
        </div>
        {kids.length > 0 && (
          <div className="hidden group-hover/mi:block absolute top-full left-0 mt-0.5 bg-surface-container-high rounded-lg shadow-xl border border-outline-variant/30 py-1 z-10 min-w-[130px]">
            {kids.map(c => (
              <div key={c.id} className="px-3 py-1.5 text-xs text-on-surface-variant hover:bg-surface-container transition-colors whitespace-nowrap">
                {c.name || "Untitled"}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  });
  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
      <div className="rounded-xl border-2 p-3 mb-3" style={{ borderColor: primaryColor + "30", backgroundColor: primaryColor + "05" }}>
        <div className="flex items-center gap-1.5 mb-2">
          <i className="fa-solid fa-desktop text-xs" style={{ color: primaryColor }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primaryColor }}>Navigation Preview</span>
        </div>
        <div className="bg-surface-container rounded-lg p-1.5 inline-flex items-center gap-0.5 flex-wrap min-h-[2.5rem]">
          {tree.filter(n => !n.offMenu).length > 0 ? renderMenuItems(tree) : (
            <span className="text-xs text-on-surface-variant/40 italic px-2">Add pages to preview navigation</span>
          )}
        </div>
        {pages.some(p => p.offMenu) && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-on-surface-variant/40"><i className="fa-solid fa-eye-slash text-[8px] mr-1" />Off-menu:</span>
            {pages.filter(p => p.offMenu).map(p => (
              <span key={p.id} className="text-[10px] text-on-surface-variant/40 bg-surface-container px-1.5 py-0.5 rounded">{p.name || "Untitled"}</span>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1">
        {pages.map((page, i) => (
          <div key={page.id} draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
            onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) handleDrop(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            className={`flex items-center gap-1.5 py-1 rounded-lg transition-all group/row ${dragIdx !== null && overIdx === i && dragIdx !== i ? "ring-2 ring-current" : ""}`}
            style={{ paddingLeft: page.depth * 24 + 4, paddingRight: 4, ...(dragIdx !== null && overIdx === i && dragIdx !== i ? { color: primaryColor } : {}) }}>
            <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 px-0.5 shrink-0">
              <i className="fa-solid fa-grip-vertical text-[10px]" />
            </div>
            {page.depth > 0 && <i className="fa-solid fa-turn-up fa-rotate-90 text-[10px] text-on-surface-variant/25 shrink-0" />}
            <input value={page.name}
              onChange={(e) => { const n = [...pages]; n[i] = { ...n[i], name: e.target.value }; update(n); }}
              placeholder={page.depth > 0 ? "Subpage name" : "Page name (e.g. About Us)"}
              className={INPUT_CLS + " flex-1 !py-2 !text-sm"} style={{ ...focusRing, borderColor: errBorder }} />
            <div className="flex shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
              <button type="button" onClick={() => outdent(i)} disabled={!canOutdent(i)}
                className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Outdent">
                <i className="fa-solid fa-outdent text-[10px]" />
              </button>
              <button type="button" onClick={() => indent(i)} disabled={!canIndent(i)}
                className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface-variant disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Indent (make child page)">
                <i className="fa-solid fa-indent text-[10px]" />
              </button>
            </div>
            <button type="button" onClick={() => { const n = [...pages]; n[i] = { ...n[i], offMenu: !n[i].offMenu }; update(n); }}
              className="p-1 rounded-lg shrink-0 transition-all" title={page.offMenu ? "Hidden from nav" : "Shown in nav"}
              style={{ color: page.offMenu ? "var(--color-on-surface-variant)" : primaryColor, opacity: page.offMenu ? 0.35 : 0.7 }}>
              <i className={`fa-solid ${page.offMenu ? "fa-eye-slash" : "fa-eye"} text-[10px]`} />
            </button>
            <button type="button" onClick={() => update(pages.filter((_, j) => j !== i))}
              className="p-1 rounded-lg text-on-surface-variant/30 hover:text-error hover:bg-error/10 transition-all shrink-0 opacity-0 group-hover/row:opacity-100">
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
        ))}
      </div>
      {canAdd && (
        <button type="button" onClick={() => update([...pages, { id: uid(), name: "", depth: 0, offMenu: false }])}
          className="w-full mt-3 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 hover:shadow-sm"
          style={{ borderColor: primaryColor + "40", color: primaryColor }}>
          <i className="fa-solid fa-plus text-xs" /> Add Page
        </button>
      )}
      <div className="flex items-center justify-between mt-1.5 ml-1 gap-2">
        {cfg.maxPages && cfg.maxPages > 0 ? (
          <p className="text-xs text-on-surface-variant/60">{pages.length} / {cfg.maxPages} pages</p>
        ) : <div />}
        <p className="text-[10px] text-on-surface-variant/40 text-right">
          Drag to reorder Â· <i className="fa-solid fa-indent text-[8px]" /> nest as child Â· <i className="fa-solid fa-eye-slash text-[8px]" /> hide from nav
        </p>
      </div>
      {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
    </div>
  );
}

/* ââ Signature Pad Canvas ââ draw-to-sign like DocuSign */
function SignaturePadCanvas({ value, onChange, primaryColor }: {
  value: string; onChange: (dataUrl: string) => void; primaryColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.scale(dpr, dpr); ctxRef.current = ctx; }
      if (value && ctx) {
        const img = document.createElement('img');
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = value;
      }
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ("touches" in e) { const t = e.touches[0] || e.changedTouches[0]; return { x: t.clientX - rect.left, y: t.clientY - rect.top }; }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); drawing.current = true; last.current = getPos(e);
    const ctx = ctxRef.current;
    if (ctx) { ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); }
  };
  const onDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return; e.preventDefault();
    const ctx = ctxRef.current; const pos = getPos(e);
    if (ctx && last.current) {
      const mid = { x: (last.current.x + pos.x) / 2, y: (last.current.y + pos.y) / 2 };
      ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
      ctx.stroke(); ctx.beginPath(); ctx.moveTo(mid.x, mid.y);
    }
    last.current = pos;
  };
  const endDraw = () => {
    if (!drawing.current) return; drawing.current = false; last.current = null;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };
  const clear = () => {
    const canvas = canvasRef.current; const ctx = ctxRef.current;
    if (canvas && ctx) { const r = canvas.getBoundingClientRect(); ctx.clearRect(0, 0, r.width * (window.devicePixelRatio || 1), r.height * (window.devicePixelRatio || 1)); onChange(""); }
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-on-surface-variant">Signature</label>
        <button type="button" onClick={clear} className="text-[10px] font-semibold px-2 py-0.5 rounded-md hover:bg-surface-container transition-colors" style={{ color: primaryColor }}>
          Clear
        </button>
      </div>
      <div className="relative rounded-xl border-2 overflow-hidden" style={{ borderColor: primaryColor + "30", backgroundColor: "rgba(255,255,255,0.97)" }}>
        <canvas ref={canvasRef} className="w-full touch-none" style={{ height: 150, cursor: "crosshair" }}
          onMouseDown={startDraw} onMouseMove={onDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={onDraw} onTouchEnd={endDraw} />
        {!value && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
            <i className="fa-solid fa-signature text-2xl mb-1" style={{ color: "#d1d5db" }} />
            <span className="text-xs" style={{ color: "#9ca3af" }}>Sign here with mouse or finger</span>
          </div>
        )}
        <div className="absolute bottom-4 left-6 right-6 border-b" style={{ borderColor: "rgba(0,0,0,0.1)" }} />
      </div>
    </div>
  );
}
/* ── Phase 2 Field Renderers ──────────────────────────────── */

function BrandStyleField({ field, value, error, onChange, primaryColor }: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string;
}) {
  const cfg = field.brandStyleConfig!;
  const str = (value as string) ?? "";
  const selected = cfg.allowMultiple ? (str ? str.split("||") : []) : (str ? [str] : []);

  const toggle = (id: string) => {
    if (cfg.allowMultiple) {
      const next = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
      onChange(next.join("||"));
    } else {
      onChange(selected.includes(id) ? "" : id);
    }
  };

  const getDarkest = (palette: string[]) => {
    let darkest = palette[0] ?? "#333";
    let minBrightness = Infinity;
    for (const c of palette) {
      const hex = c.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      if (brightness < minBrightness) { minBrightness = brightness; darkest = c; }
    }
    return darkest;
  };

  const getLightest = (palette: string[]) => {
    let lightest = palette[palette.length - 1] ?? "#f5f5f5";
    let maxBrightness = -1;
    for (const c of palette) {
      const hex = c.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const brightness = r * 0.299 + g * 0.587 + b * 0.114;
      if (brightness > maxBrightness) { maxBrightness = brightness; lightest = c; }
    }
    return lightest;
  };

  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cfg.styles.map((style) => {
          const isSelected = selected.includes(style.id);
          const darkest = getDarkest(style.palette);
          const lightest = getLightest(style.palette);
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => toggle(style.id)}
              className="relative rounded-xl border-2 p-3 text-left transition-all duration-200 hover:shadow-md"
              style={{
                borderColor: isSelected ? primaryColor : "var(--color-outline-variant)",
                backgroundColor: isSelected ? primaryColor + "10" : "var(--color-surface-container)",
              }}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <i className="fa-solid fa-check text-[10px] text-white" />
                </div>
              )}
              {/* Mini preview tile */}
              <div className="rounded-lg overflow-hidden mb-2.5 border border-outline-variant/30" style={{ height: 64 }}>
                <div className="h-4 flex items-center px-2 gap-1" style={{ backgroundColor: style.palette[0] ?? "#333" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.5)" }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
                  <div className="ml-auto text-[6px] font-bold" style={{ color: "rgba(255,255,255,0.8)", fontFamily: style.fontFamily }}>Logo</div>
                </div>
                <div className="px-2 py-1.5" style={{ backgroundColor: lightest }}>
                  <div className="h-1 w-3/4 rounded-full mb-1" style={{ backgroundColor: darkest, opacity: 0.7 }} />
                  <div className="h-1 w-1/2 rounded-full mb-1" style={{ backgroundColor: darkest, opacity: 0.4 }} />
                  <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: darkest, opacity: 0.25 }} />
                </div>
              </div>
              {/* Color palette strip */}
              <div className="flex rounded-md overflow-hidden mb-2" style={{ height: 6 }}>
                {style.palette.map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color }} />
                ))}
              </div>
              <p className="text-sm font-semibold text-on-surface">{style.name}</p>
              {style.fontFamily && (
                <p className="text-[10px] text-on-surface-variant mt-0.5" style={{ fontFamily: style.fontFamily }}>
                  <i className="fa-solid fa-font mr-1" />{style.fontFamily}
                </p>
              )}
              {style.description && (
                <p className="text-xs text-on-surface-variant/70 mt-1 leading-relaxed">{style.description}</p>
              )}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
    </div>
  );
}

function CompetitorAnalyzerField({ field, value, error, onChange, primaryColor, partnerId }: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string; partnerId?: string;
}) {
  const cfg = field.competitorAnalyzerConfig!;
  type AnalysisResult = { title?: string | null; description?: string | null; headings?: string[]; navLinks?: string[]; techStack?: string[]; socialLinks?: string[]; features?: Record<string, boolean>; aiSnapshot?: string | null; fetchedAt?: string };
  type CompetitorEntry = { url: string; notes?: string; analysis?: AnalysisResult };
  const entries: CompetitorEntry[] = (() => {
    try {
      if (typeof value === "string" && value) { const p = JSON.parse(value); return Array.isArray(p) ? p : []; }
      return [];
    } catch { return []; }
  })();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const debounceRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const update = (next: CompetitorEntry[]) => onChange(JSON.stringify(next));
  const canAdd = !cfg.maxCompetitors || entries.length < cfg.maxCompetitors;

  const fetchAnalysis = useCallback(async (url: string, idx: number) => {
    // Auto-prepend https:// if no protocol
    let finalUrl = url.trim();
    if (finalUrl && !finalUrl.match(/^https?:\/\//i)) {
      finalUrl = "https://" + finalUrl;
    }
    try {
      new URL(finalUrl);
    } catch {
      setAnalyzeError("Please enter a valid URL (e.g. https://example.com)");
      return;
    }
    setAnalyzeError(null);
    setAnalyzing(idx);
    try {
      const res = await fetch("/api/competitor-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, partnerId }),
      });
      if (res.ok) {
        const data = await res.json();
        // Re-parse current value to get latest entries
        let current: CompetitorEntry[] = [];
        try {
          const raw = typeof value === "string" && value ? JSON.parse(value) : [];
          current = Array.isArray(raw) ? raw : [];
        } catch { current = []; }
        if (current[idx]) {
          const next = current.map((e, i) => i === idx ? { ...e, analysis: { title: data.title, description: data.description, headings: data.headings, navLinks: data.navLinks, techStack: data.techStack, socialLinks: data.socialLinks, features: data.features, aiSnapshot: data.aiSnapshot, fetchedAt: data.fetchedAt } } : e);
          onChange(JSON.stringify(next));
        }
      } else {
        const errData = await res.json().catch(() => null);
        setAnalyzeError(errData?.error || `Analysis failed (${res.status})`);
      }
    } catch {
      setAnalyzeError("Could not reach the analysis service. Please try again.");
    }
    setAnalyzing(null);
  }, [value, onChange]);

  const addEntry = () => {
    if (!canAdd) return;
    update([...entries, { url: "", notes: "" }]);
  };

  const removeEntry = (idx: number) => {
    const next = entries.filter((_, i) => i !== idx);
    update(next);
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateEntry = (idx: number, patch: Partial<CompetitorEntry>) => {
    const next = entries.map((e, i) => (i === idx ? { ...e, ...patch } : e));
    update(next);
    // Auto-fetch on URL change with debounce
    if (cfg.autoFetch && patch.url !== undefined) {
      if (debounceRef.current[idx]) clearTimeout(debounceRef.current[idx]);
      const url = patch.url;
      if (url && url.length > 3) {
        debounceRef.current[idx] = setTimeout(() => fetchAnalysis(url, idx), 1200);
      }
    }
  };

  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
      {cfg.autoFetch && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold mb-3"
          style={{ backgroundColor: primaryColor + "15", color: primaryColor }}>
          <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />
          Auto-analysis enabled
        </div>
      )}
      <div className="space-y-2.5">
        {entries.map((entry, idx) => (
          <div key={idx} className="rounded-xl border border-outline-variant/50 bg-surface-container p-3 transition-all duration-200">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <input
                  type="url"
                  placeholder={cfg.placeholder || "https://competitor-website.com"}
                  value={entry.url}
                  onChange={(e) => updateEntry(idx, { url: e.target.value })}
                  className={INPUT_CLS}
                  style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
                />
              </div>
              <button type="button"
                onClick={() => entry.url && fetchAnalysis(entry.url, idx)}
                disabled={analyzing === idx || !entry.url}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ color: primaryColor }}
                title="Analyze site">
                <i className={`fa-solid ${analyzing === idx ? "fa-spinner fa-spin" : "fa-magnifying-glass-chart"} text-xs`} />
              </button>
              <button type="button" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                title="Toggle notes">
                <i className={`fa-solid fa-note-sticky text-xs ${expandedIdx === idx ? "opacity-100" : "opacity-40"}`} />
              </button>
              <button type="button" onClick={() => removeEntry(idx)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-error/60 hover:text-error hover:bg-error/10 transition-colors"
                title="Remove">
                <i className="fa-solid fa-trash-can text-xs" />
              </button>
            </div>
            {/* Analysis results */}
            {entry.analysis && (entry.analysis.title || entry.analysis.description || entry.analysis.aiSnapshot) && (
              <div className="mt-2.5 rounded-lg p-3 border border-outline-variant/30 space-y-2.5" style={{ backgroundColor: primaryColor + "08" }}>
                {/* Header */}
                <div className="flex items-center gap-1.5">
                  <i className="fa-solid fa-chart-line text-[9px]" style={{ color: primaryColor }} />
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                    {entry.analysis.aiSnapshot ? "AI Competitive Snapshot" : "Site Analysis"}
                  </span>
                </div>

                {/* Basic info */}
                {entry.analysis.title && <p className="text-xs font-semibold text-on-surface">{entry.analysis.title}</p>}
                {entry.analysis.description && <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2">{entry.analysis.description}</p>}

                {/* Tech stack & social pills */}
                {((entry.analysis.techStack && entry.analysis.techStack.length > 0) || (entry.analysis.socialLinks && entry.analysis.socialLinks.length > 0)) && (
                  <div className="flex flex-wrap gap-1">
                    {entry.analysis.techStack?.slice(0, 6).map((tech, i) => (
                      <span key={`t-${i}`} className="text-[9px] px-1.5 py-0.5 rounded-md font-medium" style={{ backgroundColor: primaryColor + "18", color: primaryColor }}>{tech}</span>
                    ))}
                    {entry.analysis.socialLinks?.map((s, i) => (
                      <span key={`s-${i}`} className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">{s}</span>
                    ))}
                  </div>
                )}

                {/* Feature badges */}
                {entry.analysis.features && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(entry.analysis.features)
                      .filter(([, v]) => v)
                      .map(([key]) => {
                        const labels: Record<string, string> = {
                          contactForm: "Contact Form",
                          callToAction: "CTA",
                          liveChat: "Live Chat",
                          blog: "Blog",
                          testimonials: "Testimonials",
                          video: "Video",
                          mobileResponsive: "Mobile Ready",
                        };
                        return (
                          <span key={key} className="text-[9px] px-1.5 py-0.5 rounded-md bg-tertiary/10 text-tertiary font-medium flex items-center gap-0.5">
                            <i className="fa-solid fa-check text-[7px]" />
                            {labels[key] ?? key}
                          </span>
                        );
                      })}
                  </div>
                )}

                {/* AI Snapshot */}
                {entry.analysis.aiSnapshot && (
                  <div className="pt-2 border-t border-outline-variant/20">
                    <div className="text-[11px] text-on-surface leading-relaxed whitespace-pre-line [&>p]:mb-1.5"
                      dangerouslySetInnerHTML={{
                        __html: entry.analysis.aiSnapshot
                          .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-on-surface font-semibold">$1</strong>')
                      }}
                    />
                  </div>
                )}

                {/* Nav links */}
                {!entry.analysis.aiSnapshot && entry.analysis.navLinks && entry.analysis.navLinks.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.analysis.navLinks.slice(0, 6).map((link, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant">{link}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
            {expandedIdx === idx && (
              <div className="mt-2.5">
                <textarea
                  placeholder="Notes about this competitor..."
                  value={entry.notes ?? ""}
                  onChange={(e) => updateEntry(idx, { notes: e.target.value })}
                  rows={2}
                  className={INPUT_CLS}
                  style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      {canAdd && (
        <button type="button" onClick={addEntry}
          className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all duration-200 hover:shadow-sm flex items-center justify-center gap-2"
          style={{ borderColor: primaryColor + "40", color: primaryColor }}>
          <i className="fa-solid fa-plus text-xs" />
          Add Competitor
          {cfg.maxCompetitors && <span className="text-[10px] font-normal opacity-60">({entries.length}/{cfg.maxCompetitors})</span>}
        </button>
      )}
      {analyzeError && <p className="text-xs text-error mt-2 flex items-center gap-1.5"><i className="fa-solid fa-triangle-exclamation text-[10px]" />{analyzeError}</p>}
      {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
    </div>
  );
}

function TimelineField({ field, value, error, onChange, primaryColor }: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string;
}) {
  const cfg = field.timelineConfig!;
  type TimelineData = { startDate?: string; endDate?: string; milestones: Record<string, string>; blackoutDates: { start: string; end: string }[] };
  const data: TimelineData = (() => {
    try {
      if (typeof value === "string" && value) return JSON.parse(value);
      return { milestones: {}, blackoutDates: [] };
    } catch { return { milestones: {}, blackoutDates: [] }; }
  })();

  const update = (patch: Partial<TimelineData>) => {
    onChange(JSON.stringify({ ...data, ...patch }));
  };

  const setMilestone = (id: string, date: string) => {
    update({ milestones: { ...data.milestones, [id]: date } });
  };

  const addBlackout = () => {
    update({ blackoutDates: [...data.blackoutDates, { start: "", end: "" }] });
  };

  const removeBlackout = (idx: number) => {
    update({ blackoutDates: data.blackoutDates.filter((_, i) => i !== idx) });
  };

  const updateBlackout = (idx: number, patch: Partial<{ start: string; end: string }>) => {
    update({ blackoutDates: data.blackoutDates.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });
  };

  // Collect all dates for the timeline preview
  const allDates: { label: string; date: string; color: string }[] = [];
  if (data.startDate) allDates.push({ label: "Start", date: data.startDate, color: "#4caf50" });
  if (cfg.milestones) {
    cfg.milestones.forEach((m) => {
      if (data.milestones[m.id]) allDates.push({ label: m.label, date: data.milestones[m.id], color: primaryColor });
    });
  }
  if (data.endDate) allDates.push({ label: "Deadline", date: data.endDate, color: "#f44336" });
  allDates.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}

      <div className="space-y-3">
        {/* Start / End dates */}
        {(cfg.showStartDate || cfg.showEndDate) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cfg.showStartDate && (
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">
                  <i className="fa-solid fa-play mr-1 text-[9px]" style={{ color: "#4caf50" }} />Project Start
                </label>
                <input type="date" value={data.startDate ?? ""} min={cfg.minDate}
                  onChange={(e) => update({ startDate: e.target.value })}
                  className={INPUT_CLS}
                  style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties} />
              </div>
            )}
            {cfg.showEndDate && (
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">
                  <i className="fa-solid fa-flag-checkered mr-1 text-[9px]" style={{ color: "#f44336" }} />Project Deadline
                </label>
                <input type="date" value={data.endDate ?? ""} min={cfg.minDate}
                  onChange={(e) => update({ endDate: e.target.value })}
                  className={INPUT_CLS}
                  style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties} />
              </div>
            )}
          </div>
        )}

        {/* Milestones */}
        {cfg.milestones && cfg.milestones.length > 0 && (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
              <i className="fa-solid fa-diamond mr-1" style={{ color: primaryColor }} />Milestones
            </p>
            <div className="space-y-2.5">
              {cfg.milestones.map((m) => (
                <div key={m.id}>
                  <label className="block text-xs text-on-surface mb-1 ml-0.5">
                    {m.label}
                    {m.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
                  </label>
                  <input type="date" value={data.milestones[m.id] ?? ""} min={cfg.minDate}
                    onChange={(e) => setMilestone(m.id, e.target.value)}
                    className={INPUT_CLS}
                    style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Blackout dates */}
        {cfg.allowBlackoutDates && (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
              <i className="fa-solid fa-ban mr-1 text-error/70" />Blackout Periods
            </p>
            <div className="space-y-2">
              {data.blackoutDates.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="date" value={b.start} min={cfg.minDate}
                    onChange={(e) => updateBlackout(idx, { start: e.target.value })}
                    className={INPUT_CLS + " flex-1"}
                    style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties} />
                  <span className="text-[10px] text-on-surface-variant font-medium">to</span>
                  <input type="date" value={b.end} min={b.start || cfg.minDate}
                    onChange={(e) => updateBlackout(idx, { end: e.target.value })}
                    className={INPUT_CLS + " flex-1"}
                    style={{ "--tw-ring-color": primaryColor + "66" } as React.CSSProperties} />
                  <button type="button" onClick={() => removeBlackout(idx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-error/60 hover:text-error hover:bg-error/10 transition-colors flex-shrink-0"
                    title="Remove">
                    <i className="fa-solid fa-trash-can text-xs" />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addBlackout}
              className="mt-2 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              style={{ color: primaryColor }}>
              <i className="fa-solid fa-plus text-[9px]" />Add Blackout Period
            </button>
          </div>
        )}

        {/* Timeline preview bar */}
        {allDates.length >= 2 && (
          <div className="rounded-xl border border-outline-variant/50 bg-surface-container p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              <i className="fa-solid fa-timeline mr-1" style={{ color: primaryColor }} />Timeline Preview
            </p>
            <div className="relative h-2 rounded-full bg-surface-container-highest">
              {allDates.map((d, i) => {
                const pct = allDates.length === 1 ? 50 : (i / (allDates.length - 1)) * 100;
                return (
                  <div key={i} className="absolute -translate-x-1/2 group/dot" style={{ left: `${pct}%` }}>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-surface -mt-[3px]" style={{ backgroundColor: d.color }} />
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-on-surface-variant font-medium">
                      {d.label}
                    </div>
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-on-surface-variant/60">
                      {d.date}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-6" /> {/* spacer for labels */}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
    </div>
  );
}

function BudgetAllocatorField({ field, value, error, onChange, primaryColor }: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string;
}) {
  const cfg = field.budgetAllocatorConfig!;
  const currency = cfg.currency ?? "$";
  const isConstrained = cfg.mode === "constrained";
  const totalBudget = cfg.totalBudget ?? 0;

  const allocation: Record<string, number> = (() => {
    try {
      if (typeof value === "string" && value) return JSON.parse(value);
      if (typeof value === "object" && value !== null && !Array.isArray(value)) return value as Record<string, number>;
      const init: Record<string, number> = {};
      cfg.channels.forEach((ch) => { init[ch.id] = ch.defaultValue ?? 0; });
      return init;
    } catch {
      const init: Record<string, number> = {};
      cfg.channels.forEach((ch) => { init[ch.id] = ch.defaultValue ?? 0; });
      return init;
    }
  })();

  const [localAlloc, setLocalAlloc] = useState<Record<string, number>>(allocation);

  // Sync local state if external value changes
  useEffect(() => {
    try {
      if (typeof value === "string" && value) {
        const parsed = JSON.parse(value);
        setLocalAlloc(parsed);
      }
    } catch { /* ignore */ }
  }, [value]);

  const totalAllocated = Object.values(localAlloc).reduce((s, v) => s + v, 0);

  const handleSliderChange = (channelId: string, newVal: number) => {
    let next: Record<string, number>;

    if (isConstrained && totalBudget > 0) {
      const oldVal = localAlloc[channelId] ?? 0;
      const delta = newVal - oldVal;
      const otherIds = cfg.channels.filter((c) => c.id !== channelId).map((c) => c.id);
      const otherTotal = otherIds.reduce((s, id) => s + (localAlloc[id] ?? 0), 0);

      next = { ...localAlloc, [channelId]: newVal };

      if (otherTotal > 0 && delta !== 0) {
        const redistribute = -delta;
        otherIds.forEach((id) => {
          const proportion = (localAlloc[id] ?? 0) / otherTotal;
          next[id] = Math.max(0, Math.round((localAlloc[id] ?? 0) + redistribute * proportion));
        });
      }
    } else {
      next = { ...localAlloc, [channelId]: newVal };
    }

    setLocalAlloc(next);
    onChange(JSON.stringify(next));
  };

  const getMax = (channelId: string) => {
    if (isConstrained && totalBudget > 0) return totalBudget;
    return cfg.maxPerChannel ?? 100000;
  };

  return (
    <div className="group">
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}

      {/* Total budget indicator (constrained mode) */}
      {isConstrained && totalBudget > 0 && (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container p-3 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
              <i className="fa-solid fa-wallet mr-1" style={{ color: primaryColor }} />Total Budget
            </span>
            <span className="text-sm font-bold" style={{ color: totalAllocated > totalBudget ? "var(--color-error)" : primaryColor }}>
              {currency}{totalAllocated.toLocaleString()} / {currency}{totalBudget.toLocaleString()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((totalAllocated / totalBudget) * 100, 100)}%`,
                backgroundColor: totalAllocated > totalBudget ? "var(--color-error)" : primaryColor,
              }} />
          </div>
          {totalAllocated > totalBudget && (
            <p className="text-[10px] text-error mt-1 font-medium">
              <i className="fa-solid fa-triangle-exclamation mr-1" />Over budget by {currency}{(totalAllocated - totalBudget).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Channel sliders */}
      <div className="space-y-3">
        {cfg.channels.map((ch) => {
          const val = localAlloc[ch.id] ?? 0;
          const max = getMax(ch.id);
          const pct = max > 0 ? (val / max) * 100 : 0;
          const displayVal = cfg.showAsPercentage && isConstrained && totalBudget > 0
            ? `${Math.round((val / totalBudget) * 100)}%`
            : `${currency}${val.toLocaleString()}`;

          return (
            <div key={ch.id} className="rounded-xl border border-outline-variant/50 bg-surface-container p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {ch.icon && <i className={`${ch.icon} text-sm`} style={{ color: primaryColor }} />}
                  <span className="text-xs font-semibold text-on-surface">{ch.label}</span>
                </div>
                <span className="text-sm font-bold tabular-nums" style={{ color: primaryColor }}>{displayVal}</span>
              </div>
              <input
                type="range"
                min={0}
                max={max}
                step={max > 1000 ? 100 : max > 100 ? 10 : 1}
                value={val}
                onChange={(e) => handleSliderChange(ch.id, Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${primaryColor} ${pct}%, var(--color-surface-container-highest) ${pct}%)`,
                  accentColor: primaryColor,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Visual bar chart summary */}
      {cfg.channels.length > 1 && totalAllocated > 0 && (
        <div className="rounded-xl border border-outline-variant/50 bg-surface-container p-3 mt-3">
          <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
            <i className="fa-solid fa-chart-bar mr-1" style={{ color: primaryColor }} />Allocation Overview
          </p>
          <div className="space-y-1.5">
            {cfg.channels.map((ch) => {
              const val = localAlloc[ch.id] ?? 0;
              const barPct = totalAllocated > 0 ? (val / totalAllocated) * 100 : 0;
              return (
                <div key={ch.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-on-surface-variant w-20 truncate">{ch.label}</span>
                  <div className="flex-1 h-3 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${barPct}%`, backgroundColor: primaryColor, opacity: 0.5 + (barPct / 200) }} />
                  </div>
                  <span className="text-[10px] text-on-surface-variant tabular-nums w-10 text-right">{Math.round(barPct)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
    </div>
  );
}

function CelestialField({
  field, value, error, onChange, primaryColor, allData, partnerId,
}: {
  field: FieldDef; value: unknown; error?: string; onChange: (v: unknown) => void; primaryColor: string; allData: Record<string, unknown>; partnerId?: string;
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
    const layout = cfg.layout ?? "cards";
    const cols = cfg.columns ?? "auto";
    const lightBg = isLightColor(primaryColor);

    // Resolve grid columns class
    const colsClass =
      cols === "auto"
        ? cfg.packages.length === 1 ? "grid-cols-1"
          : cfg.packages.length === 2 ? "grid-cols-1 sm:grid-cols-2"
          : cfg.packages.length === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : cols === 1 ? "grid-cols-1"
        : cols === 2 ? "grid-cols-1 sm:grid-cols-2"
        : cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

    /* Price helper */
    const renderPrice = (pkg: typeof cfg.packages[0], size: "lg" | "sm" = "lg") => {
      const cls = size === "lg" ? "text-2xl font-extrabold font-headline" : "text-lg font-extrabold font-headline";
      if (pkg.hidePrice) return <span className={cls} style={{ color: primaryColor }}>{pkg.priceLabel || "Custom"}</span>;
      if (pkg.price === 0) return <span className={`${cls} text-on-surface`}>Free</span>;
      return (
        <div className="flex items-baseline gap-1">
          <span className={`${cls} text-on-surface`}>${pkg.price}</span>
          <span className="text-xs text-on-surface-variant/60">/mo</span>
        </div>
      );
    };

    /* Feature check icon */
    const renderFeatureIcon = (val: boolean | string | undefined) => {
      if (val === false || val === undefined) return <i className="fa-solid fa-xmark text-on-surface-variant/30 w-4 text-center shrink-0" />;
      return <i className="fa-solid fa-check w-4 text-center shrink-0" style={{ color: primaryColor }} />;
    };

    /* Selection button */
    const renderSelectBtn = (isSelected: boolean, size: "lg" | "sm" = "lg") => (
      <div
        className={`flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${size === "lg" ? "py-2 mt-4" : "py-1.5 px-4 shrink-0"}`}
        style={isSelected ? { backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" } : { backgroundColor: "transparent", border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}
      >
        {isSelected ? <><i className="fa-solid fa-check text-[10px] mr-1.5" /> Selected</> : "Select"}
      </div>
    );

    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

        {/* ─── Cards layout (default) ─── */}
        {layout === "cards" && (
          <div className={`grid gap-4 ${colsClass}`}>
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange(pkg.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected ? "shadow-lg scale-[1.02]" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"
                  }`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08", boxShadow: `0 8px 25px ${primaryColor}20` } : undefined}
                >
                  {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>
                      <i className="fa-solid fa-wand-magic-sparkles text-[8px] mr-1" />Recommended
                    </div>
                  )}
                  {pkg.badge && !isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-highest text-on-surface-variant whitespace-nowrap border border-outline-variant/20">{pkg.badge}</div>
                  )}
                  <div className="mb-3 mt-1">
                    <h3 className="text-lg font-bold text-on-surface font-headline">{pkg.name}</h3>
                    {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                    {pkg.longDescription && <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{pkg.longDescription}</p>}
                  </div>
                  <div className="mb-4">{renderPrice(pkg)}</div>
                  {pkg.featureList && pkg.featureList.length > 0 && (
                    <div className="space-y-1.5 mb-4">
                      {pkg.featureList.map((feat, fi) => (
                        <div key={fi} className="flex items-start gap-2 text-xs">
                          <i className="fa-solid fa-check w-4 text-center mt-0.5 shrink-0" style={{ color: primaryColor }} />
                          <span className="text-on-surface">{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {cfg.features.length > 0 && !cfg.showFeaturesTable && (
                    <div className="space-y-2 pt-3 border-t border-outline-variant/15">
                      {cfg.features.map((feat, fi) => {
                        const val = feat.values[pkg.id];
                        const isIncluded = val === true || (typeof val === "string" && val !== "");
                        return (
                          <div key={fi} className="flex items-center gap-2 text-xs">
                            {renderFeatureIcon(val)}
                            <span className={isIncluded ? "text-on-surface" : "text-on-surface-variant/40 line-through"}>
                              {feat.label}{typeof val === "string" && val && <span className="ml-1 font-semibold" style={{ color: primaryColor }}>({val})</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {renderSelectBtn(isSelected)}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Horizontal layout ─── */}
        {layout === "horizontal" && (
          <div className="space-y-4">
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange(pkg.id)}
                  className={`relative w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected ? "shadow-lg" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"
                  }`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08", boxShadow: `0 8px 25px ${primaryColor}20` } : undefined}
                >
                  {/* Top section: radio + name + price */}
                  <div className="flex items-center gap-4 p-4 sm:p-5">
                    {/* Radio indicator */}
                    <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center" style={isSelected ? { borderColor: primaryColor } : { borderColor: "var(--color-outline-variant)" }}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-on-surface font-headline">{pkg.name}</h3>
                        {isRecommended && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>
                            Recommended
                          </span>
                        )}
                        {pkg.badge && !isRecommended && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-surface-container-highest text-on-surface-variant border border-outline-variant/20">{pkg.badge}</span>
                        )}
                      </div>
                      {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                    </div>

                    {/* Price */}
                    <div className="shrink-0 text-right">{renderPrice(pkg, "sm")}</div>
                  </div>

                  {/* Long description */}
                  {pkg.longDescription && (
                    <div className="px-5 pb-3 -mt-1 pl-14 sm:pl-[3.75rem]">
                      <p className="text-sm text-on-surface-variant leading-relaxed">{pkg.longDescription}</p>
                    </div>
                  )}

                  {/* Feature list */}
                  {pkg.featureList && pkg.featureList.length > 0 && (
                    <div className="border-t border-outline-variant/15 mx-4 sm:mx-5 py-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-10 sm:pl-[2.25rem]">
                        {pkg.featureList.map((f, fi) => (
                          <div key={fi} className="flex items-start gap-2 text-xs">
                            <i className="fa-solid fa-check w-4 text-center mt-0.5 shrink-0" style={{ color: primaryColor }} />
                            <span className="text-on-surface">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comparison features */}
                  {cfg.features.length > 0 && !cfg.showFeaturesTable && (
                    <div className={`border-t border-outline-variant/15 mx-4 sm:mx-5 py-3 ${!(pkg.featureList && pkg.featureList.length > 0) ? "" : ""}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-10 sm:pl-[2.25rem]">
                        {cfg.features.map((feat, fi) => {
                          const val = feat.values[pkg.id];
                          const isIncluded = val === true || (typeof val === "string" && val !== "");
                          return (
                            <div key={fi} className="flex items-center gap-2 text-xs">
                              {renderFeatureIcon(val)}
                              <span className={isIncluded ? "text-on-surface" : "text-on-surface-variant/40 line-through"}>
                                {feat.label}{typeof val === "string" && val && <span className="ml-1 font-semibold" style={{ color: primaryColor }}>({val})</span>}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Compact layout ─── */}
        {layout === "compact" && (
          <div className={`grid gap-4 ${colsClass}`}>
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange(pkg.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                    isSelected ? "shadow-md" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"
                  }`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : undefined}
                >
                  {/* Header: name + badges */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-on-surface font-headline">{pkg.name}</h3>
                    {isRecommended && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>
                        <i className="fa-solid fa-star text-[7px] mr-0.5" />Best
                      </span>
                    )}
                    {pkg.badge && !isRecommended && (
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-surface-container-highest text-on-surface-variant border border-outline-variant/15">{pkg.badge}</span>
                    )}
                  </div>
                  {/* Price */}
                  <div className="mb-2">{renderPrice(pkg, "sm")}</div>
                  {/* Tagline */}
                  {pkg.description && <p className="text-xs text-on-surface-variant/60 mb-3">{pkg.description}</p>}
                  {/* Feature pills */}
                  {pkg.featureList && pkg.featureList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {pkg.featureList.map((f, fi) => (
                        <span key={fi} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
                          <i className="fa-solid fa-check text-[8px] mr-1" style={{ color: primaryColor }} />{f}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Select button */}
                  <div className="flex items-center justify-center py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={isSelected ? { backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" } : { border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}
                  >
                    {isSelected ? <><i className="fa-solid fa-check text-[9px] mr-1" /> Selected</> : "Select"}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── List layout ─── */}
        {layout === "list" && (
          <div className="border-2 border-outline-variant/20 rounded-2xl overflow-hidden divide-y divide-outline-variant/15">
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkgId === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => onChange(pkg.id)}
                  className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-all duration-200 ${
                    isSelected ? "" : "hover:bg-surface-container-lowest/50"
                  }`}
                  style={isSelected ? { backgroundColor: primaryColor + "0A" } : undefined}
                >
                  {/* Check circle */}
                  <div
                    className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                    style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor } : { borderColor: "var(--color-outline-variant)" }}
                  >
                    {isSelected && <i className="fa-solid fa-check text-[9px]" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }} />}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-sm">{pkg.name}</span>
                      {isRecommended && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>Recommended</span>
                      )}
                      {pkg.badge && !isRecommended && (
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-surface-container-highest text-on-surface-variant/70">{pkg.badge}</span>
                      )}
                    </div>
                    {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5 truncate">{pkg.description}</p>}
                  </div>

                  {/* Price */}
                  <div className="shrink-0">{renderPrice(pkg, "sm")}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Features comparison table (opt-in) ─── */}
        {cfg.showFeaturesTable && cfg.features.length > 0 && (
          <div className="mt-6 border-2 border-outline-variant/15 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3">Feature</th>
                  {cfg.packages.map((pkg) => (
                    <th key={pkg.id} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-3 py-3">{pkg.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {cfg.features.map((feat, fi) => (
                  <tr key={fi}>
                    <td className="px-4 py-2.5 text-xs text-on-surface">{feat.label}</td>
                    {cfg.packages.map((pkg) => {
                      const val = feat.values[pkg.id];
                      return (
                        <td key={pkg.id} className="px-3 py-2.5 text-center">
                          {val === false || val === undefined ? (
                            <i className="fa-solid fa-xmark text-on-surface-variant/30" />
                          ) : val === true ? (
                            <i className="fa-solid fa-check" style={{ color: primaryColor }} />
                          ) : (
                            <span className="text-xs font-semibold" style={{ color: primaryColor }}>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

  /* Multi-option checkbox (when field has options array) */

  /* ââ Site Structure Builder ââ */
  if (field.type === "site_structure" && field.siteStructureConfig) {
    return <SiteStructureField field={field} value={value} error={error} onChange={onChange} primaryColor={primaryColor} />;
  }


  /* ââ Asset Collection ââ */
  if (field.type === "asset_collection" && field.assetCollectionConfig) {
    const cfg = field.assetCollectionConfig;
    const catIcons: Record<string, string> = { logos: "fa-swatchbook", colors: "fa-palette", fonts: "fa-font", documents: "fa-file-lines", images: "fa-images", other: "fa-folder-open" };
    const catLabels: Record<string, string> = { logos: "Logos", colors: "Brand Colors", fonts: "Fonts", documents: "Documents", images: "Images", other: "Other" };
    type AssetData = Record<string, string[]>;
    const assets: AssetData = (() => {
      try { return typeof value === "string" && value ? JSON.parse(value) : typeof value === "object" && value ? value as AssetData : {}; }
      catch { return {}; }
    })();
    const categories = cfg.categories ?? ["logos", "colors", "fonts", "documents", "images"];
    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const icon = catIcons[cat] || "fa-folder";
            const label = catLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
            const count = (assets[cat] ?? []).length;
            return (
              <label key={cat} className="relative flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md"
                style={{ borderColor: count > 0 ? primaryColor : "var(--color-outline-variant)", backgroundColor: count > 0 ? primaryColor + "08" : "transparent" }}>
                <i className={`fa-solid ${icon} text-xl`} style={{ color: count > 0 ? primaryColor : "var(--color-on-surface-variant)" }} />
                <span className="text-xs font-semibold text-on-surface">{label}</span>
                {count > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: primaryColor + "20", color: primaryColor }}>{count} file{count !== 1 ? "s" : ""}</span>}
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                  const files = Array.from(e.target.files ?? []).map(f => f.name);
                  const next = { ...assets, [cat]: [...(assets[cat] ?? []), ...files] };
                  onChange(JSON.stringify(next));
                  e.target.value = "";
                }} />
              </label>
            );
          })}
        </div>
        {cfg.maxFiles && cfg.maxFiles > 0 && (
          <p className="text-xs text-on-surface-variant/60 mt-1.5 ml-1">Max {cfg.maxFiles} files total</p>
        )}
        {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
      </div>
    );
  }

  /* ââ Feature Selector ââ */
  if (field.type === "feature_selector" && field.featureSelectorConfig) {
    const cfg = field.featureSelectorConfig;
    const selected: string[] = (() => {
      try { return typeof value === "string" && value ? value.split("||").filter(Boolean) : Array.isArray(value) ? value as string[] : []; }
      catch { return []; }
    })();
    const toggle = (fid: string) => {
      const next = selected.includes(fid) ? selected.filter(s => s !== fid) : [...selected, fid];
      onChange(next.join("||"));
    };
    const features = cfg.features ?? [];
    const atMax = cfg.maxSelections && cfg.maxSelections > 0 && selected.length >= cfg.maxSelections;
    const complexityColors: Record<string, string> = { Simple: "#4caf50", Medium: "#ff9800", Complex: "#f44336" };
    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((feat) => {
            const isSelected = selected.includes(feat.id);
            const disabled = !isSelected && !!atMax;
            return (
              <button key={feat.id} type="button" disabled={disabled}
                onClick={() => !disabled && toggle(feat.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}`}
                style={{ borderColor: isSelected ? primaryColor : "var(--color-outline-variant)", backgroundColor: isSelected ? primaryColor + "08" : "transparent" }}>
                <div className="flex items-start gap-3">
                  {feat.icon && <i className={`fa-solid ${feat.icon} text-lg mt-0.5`} style={{ color: isSelected ? primaryColor : "var(--color-on-surface-variant)" }} />}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-on-surface">{feat.name}</div>
                    {feat.description && <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{feat.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {cfg.showComplexity && feat.complexity && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: (complexityColors[feat.complexity] ?? "#888") + "20", color: complexityColors[feat.complexity] ?? "#888" }}>
                          {feat.complexity}
                        </span>
                      )}
                      {cfg.showPriceImpact && feat.priceImpact && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">{feat.priceImpact}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                    style={{ borderColor: isSelected ? primaryColor : "var(--color-outline-variant)", backgroundColor: isSelected ? primaryColor : "transparent" }}>
                    {isSelected && <i className="fa-solid fa-check text-[10px] text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {cfg.maxSelections && cfg.maxSelections > 0 && (
          <p className="text-xs text-on-surface-variant/60 mt-1.5 ml-1">{selected.length} / {cfg.maxSelections} selected</p>
        )}
        {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
      </div>
    );
  }

  /* ââ Goal Builder ââ */
  if (field.type === "goal_builder" && field.goalBuilderConfig) {
    const cfg = field.goalBuilderConfig;
    type GoalData = { goalId: string; refinements: Record<string, string | number> };
    const goalData: GoalData[] = (() => {
      try { return typeof value === "string" && value ? JSON.parse(value) : Array.isArray(value) ? value as GoalData[] : []; }
      catch { return []; }
    })();
    const goals = cfg.goals ?? [];
    const isGoalSelected = (gid: string) => goalData.some(g => g.goalId === gid);
    const toggleGoal = (gid: string) => {
      if (isGoalSelected(gid)) {
        onChange(JSON.stringify(goalData.filter(g => g.goalId !== gid)));
      } else {
        if (!cfg.allowMultiple) {
          onChange(JSON.stringify([{ goalId: gid, refinements: {} }]));
        } else {
          onChange(JSON.stringify([...goalData, { goalId: gid, refinements: {} }]));
        }
      }
    };
    const updateRefinement = (gid: string, refId: string, val: string | number) => {
      const next = goalData.map(g => g.goalId === gid ? { ...g, refinements: { ...g.refinements, [refId]: val } } : g);
      onChange(JSON.stringify(next));
    };
    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-3">
          {goals.map((goal) => {
            const sel = isGoalSelected(goal.id);
            const gd = goalData.find(g => g.goalId === goal.id);
            return (
              <div key={goal.id} className="rounded-xl border-2 transition-all duration-200 overflow-hidden"
                style={{ borderColor: sel ? primaryColor : "var(--color-outline-variant)", backgroundColor: sel ? primaryColor + "06" : "transparent" }}>
                <button type="button" onClick={() => toggleGoal(goal.id)}
                  className="w-full flex items-center gap-3 p-4 text-left cursor-pointer">
                  {goal.icon && <i className={`fa-solid ${goal.icon} text-xl`} style={{ color: sel ? primaryColor : "var(--color-on-surface-variant)" }} />}
                  <span className="flex-1 font-semibold text-sm text-on-surface">{goal.label}</span>
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                    style={{ borderColor: sel ? primaryColor : "var(--color-outline-variant)", backgroundColor: sel ? primaryColor : "transparent" }}>
                    {sel && <i className="fa-solid fa-check text-[10px] text-white" />}
                  </div>
                </button>
                {sel && goal.refinements && goal.refinements.length > 0 && (
                  <div className="px-4 pb-4 pt-1 space-y-3 border-t" style={{ borderColor: primaryColor + "20" }}>
                    {goal.refinements.map((ref) => (
                      <div key={ref.id}>
                        <label className="block text-xs font-medium text-on-surface-variant mb-1">{ref.label}</label>
                        {ref.type === "select" ? (
                          <select value={(gd?.refinements[ref.id] as string) ?? ""} onChange={(e) => updateRefinement(goal.id, ref.id, e.target.value)}
                            className={INPUT_CLS} style={focusRing}>
                            <option value="">Select...</option>
                            {(ref.options ?? []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : ref.type === "range" ? (
                          <div className="flex items-center gap-3">
                            <input type="range" min={ref.min ?? 0} max={ref.max ?? 100} step={ref.step ?? 1}
                              value={(gd?.refinements[ref.id] as number) ?? ref.min ?? 0}
                              onChange={(e) => updateRefinement(goal.id, ref.id, +e.target.value)}
                              className="flex-1 accent-current" style={{ color: primaryColor }} />
                            <span className="text-sm font-semibold min-w-[3rem] text-right" style={{ color: primaryColor }}>
                              {ref.prefix ?? ""}{(gd?.refinements[ref.id] as number) ?? ref.min ?? 0}{ref.suffix ?? ""}
                            </span>
                          </div>
                        ) : (
                          <input type="text" value={(gd?.refinements[ref.id] as string) ?? ""} placeholder={ref.placeholder}
                            onChange={(e) => updateRefinement(goal.id, ref.id, e.target.value)}
                            className={INPUT_CLS} style={focusRing} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!cfg.allowMultiple && <p className="text-xs text-on-surface-variant/60 mt-1.5 ml-1">Select one primary goal</p>}
        {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
      </div>
    );
  }

  /* ââ Approval / Sign-off ââ */
  if (field.type === "approval" && field.approvalConfig) {
    const cfg = field.approvalConfig;
    type ApprovalData = { approved: boolean; signature?: string; fullName?: string; timestamp?: string };
    const data: ApprovalData = (() => {
      try { return typeof value === "string" && value ? JSON.parse(value) : typeof value === "object" && value ? value as ApprovalData : { approved: false }; }
      catch { return { approved: false }; }
    })();
    const updateApproval = (patch: Partial<ApprovalData>) => onChange(JSON.stringify({ ...data, ...patch }));
    return (
      <div className="group">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-4">
          {cfg.scopeText && (
            <div className="max-h-56 overflow-y-auto rounded-xl border-2 p-4 text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-lowest/50 custom-scrollbar"
              style={{ borderColor: errBorder || "var(--color-outline-variant)" }}>
              {cfg.scopeText}
            </div>
          )}
          {cfg.requireFullName && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Full Name</label>
              <input type="text" value={data.fullName ?? ""} placeholder="Type your full legal name"
                onChange={(e) => updateApproval({ fullName: e.target.value })}
                className={INPUT_CLS} style={{ ...focusRing, borderColor: errBorder }} />
            </div>
          )}
          {cfg.requireSignature && (
            <SignaturePadCanvas
              value={data.signature ?? ""}
              onChange={(sig: string) => updateApproval({ signature: sig })}
              primaryColor={primaryColor}
            />
          )}
          <button type="button"
            onClick={() => updateApproval({ approved: !data.approved, timestamp: !data.approved ? new Date().toISOString() : undefined })}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${data.approved ? "text-white shadow-lg" : "border-2"}`}
            style={data.approved
              ? { backgroundColor: primaryColor }
              : { borderColor: primaryColor, color: primaryColor }}>
            <i className={`fa-solid ${data.approved ? "fa-check-circle" : "fa-circle"} text-base`} />
            {data.approved ? "Approved" : (cfg.approveLabel || "I Approve")}
          </button>
        </div>
        {error && <p className="text-sm text-error mt-1.5 sl-fade-up flex items-center gap-1.5"><i className="fa-solid fa-circle-exclamation text-xs flex-shrink-0" />{error}</p>}
      </div>
    );
  }

  /* ── Brand Style Picker ── */
  if (field.type === "brand_style" && field.brandStyleConfig) {
    return <BrandStyleField field={field} value={value} error={error} onChange={onChange} primaryColor={primaryColor} />;
  }

  /* ── Competitor Analyzer ── */
  if (field.type === "competitor_analyzer" && field.competitorAnalyzerConfig) {
    return <CompetitorAnalyzerField field={field} value={value} error={error} onChange={onChange} primaryColor={primaryColor} partnerId={partnerId} />;
  }

  /* ── Timeline Selector ── */
  if (field.type === "timeline" && field.timelineConfig) {
    return <TimelineField field={field} value={value} error={error} onChange={onChange} primaryColor={primaryColor} />;
  }

  /* ── Budget Allocator ── */
  if (field.type === "budget_allocator" && field.budgetAllocatorConfig) {
    return <BudgetAllocatorField field={field} value={value} error={error} onChange={onChange} primaryColor={primaryColor} />;
  }

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

      ) : field.type === "consent" ? (
        <div className="space-y-3">
          {/* Scrollable agreement text */}
          <div
            className="max-h-48 overflow-y-auto rounded-xl border-2 p-4 text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-lowest/50 custom-scrollbar"
            style={{ borderColor: errBorder || "var(--color-outline-variant)" }}
          >
            {field.consentText || "No agreement text provided."}
          </div>
          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200" style={str === "yes" ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
            <input
              name={field.id}
              type="checkbox"
              checked={str === "yes"}
              onChange={(e) => onChange(e.target.checked ? "yes" : "")}
              className="h-5 w-5 rounded mt-0.5 shrink-0"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-on-surface">
              {field.consentCheckboxLabel || "I have read and agree to the terms above"}
            </span>
          </label>
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
