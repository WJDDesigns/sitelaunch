"use client";

import { useState } from "react";
import type { FormSchema, FieldDef } from "@/lib/forms";
import { isLightColor } from "@/lib/color-utils";

type DeviceSize = "desktop" | "tablet" | "phone";

interface Props {
  schema: FormSchema;
  primaryColor: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-base bg-surface-container-lowest border-2 border-outline-variant/20 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 outline-none transition-all duration-200";

export default function FormPreview({ schema, primaryColor }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [device, setDevice] = useState<DeviceSize>("desktop");
  const step = schema.steps[stepIdx];
  const lightBg = isLightColor(primaryColor);

  if (!step) {
    return (
      <div className="text-center py-12 text-on-surface-variant/60 text-sm">
        No steps to preview. Add some fields first.
      </div>
    );
  }

  function goToStep(idx: number) {
    setVisitedSteps((prev) => new Set(prev).add(idx));
    setStepIdx(idx);
  }

  const DEVICE_SIZES: { key: DeviceSize; label: string; icon: string; width: string }[] = [
    { key: "desktop", label: "Desktop", icon: "fa-desktop", width: "100%" },
    { key: "tablet", label: "Tablet", icon: "fa-tablet-screen-button", width: "768px" },
    { key: "phone", label: "Phone", icon: "fa-mobile-screen-button", width: "375px" },
  ];

  const isPhone = device === "phone";
  const isTablet = device === "tablet";
  const frameWidth = DEVICE_SIZES.find((d) => d.key === device)!.width;

  return (
    <div className="flex flex-col h-full">
      {/* Device toggle bar */}
      <div className="shrink-0 flex items-center justify-center gap-1 py-2 bg-surface-container-low/30 border-b border-outline-variant/10">
        {DEVICE_SIZES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDevice(d.key)}
            title={d.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              device === d.key
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-on-surface/5"
            }`}
          >
            <i className={`fa-solid ${d.icon} text-[11px]`} />
            <span className="hidden sm:inline">{d.label}</span>
          </button>
        ))}
      </div>

      {/* Preview frame */}
      <div className="flex-1 overflow-auto bg-surface-container-highest/30 flex justify-center py-4">
        <div
          className={`bg-background transition-all duration-300 overflow-hidden flex flex-col ${
            device !== "desktop"
              ? "rounded-2xl border-2 border-outline-variant/20 shadow-2xl shadow-black/20 my-2"
              : ""
          }`}
          style={{
            width: frameWidth,
            maxWidth: "100%",
            height: device !== "desktop" ? "calc(100% - 16px)" : "100%",
          }}
        >
          {/* Phone status bar mockup */}
          {isPhone && (
            <div className="shrink-0 flex items-center justify-between px-6 py-1.5 bg-surface-container">
              <span className="text-[10px] font-bold text-on-surface-variant/60">9:41</span>
              <div className="flex items-center gap-1.5 text-on-surface-variant/60">
                <i className="fa-solid fa-signal text-[8px]" />
                <i className="fa-solid fa-wifi text-[8px]" />
                <i className="fa-solid fa-battery-full text-[8px]" />
              </div>
            </div>
          )}

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar — hidden on phone */}
            {!isPhone && (
              <aside className={`${isTablet ? "w-[200px]" : "w-[240px]"} shrink-0 border-r border-outline-variant/15 bg-surface-container/50 flex flex-col overflow-y-auto`}>
                {/* Fake partner branding */}
                <div className="px-5 pt-6 pb-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="font-bold text-xs" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }}>P</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface font-headline truncate">Preview Mode</span>
                  </div>
                </div>

                {/* Progress */}
                <div className="px-5 pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">Progress</span>
                    <span className="text-[10px] font-bold font-headline" style={{ color: primaryColor }}>
                      {Math.round(((Math.max(0, stepIdx)) / schema.steps.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${(stepIdx / schema.steps.length) * 100}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                </div>

                {/* Step list */}
                <nav className="flex-1 px-3 py-3 space-y-0.5">
                  {schema.steps.map((s, i) => {
                    const isCurrent = i === stepIdx;
                    const isCompleted = i < stepIdx;
                    const isVisited = visitedSteps.has(i);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goToStep(i)}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-all duration-200 ${
                          isCurrent
                            ? "bg-surface-container-high"
                            : isVisited
                            ? "hover:bg-surface-container-high/60 cursor-pointer"
                            : "opacity-50 cursor-pointer hover:opacity-70"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                            isCompleted
                              ? ""
                              : isCurrent
                              ? "ring-2 ring-offset-1 ring-offset-surface-container/50"
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
                            <i className="fa-solid fa-check text-[8px]" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }} />
                          ) : (
                            <span
                              className={`text-[10px] font-bold ${isCurrent ? "" : "text-on-surface-variant/60"}`}
                              style={isCurrent ? { color: primaryColor } : undefined}
                            >
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs truncate ${
                            isCurrent
                              ? "text-on-surface font-semibold"
                              : isCompleted
                              ? "text-on-surface-variant"
                              : "text-on-surface-variant/60"
                          }`}
                        >
                          {s.title}
                        </span>
                        {isCurrent && (
                          <div className="w-1 h-1 rounded-full shrink-0 ml-auto" style={{ backgroundColor: primaryColor }} />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="px-5 py-3 border-t border-outline-variant/10">
                  <p className="text-[9px] text-on-surface-variant/40 uppercase tracking-widest">
                    Step {stepIdx + 1} of {schema.steps.length}
                  </p>
                </div>
              </aside>
            )}

            {/* Main content */}
            <main className="flex-1 overflow-y-auto min-w-0">
              {/* Phone top bar */}
              {isPhone && (
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-outline-variant/10 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <span className="font-bold text-[8px]" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }}>P</span>
                    </div>
                    <span className="text-xs font-bold text-on-surface truncate">Preview</span>
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1.5">
                    {schema.steps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => goToStep(i)}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === stepIdx ? "24px" : "8px",
                          backgroundColor: i <= stepIdx ? primaryColor : "var(--color-outline-variant)",
                          opacity: i <= stepIdx ? 1 : 0.3,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className={`mx-auto ${isPhone ? "px-4 py-5 max-w-full" : isTablet ? "px-6 py-6 max-w-xl" : "px-8 py-8 max-w-2xl"}`}>
                {/* Step header */}
                <div className="mb-6">
                  <h2 className={`font-headline font-extrabold text-on-surface tracking-tight ${isPhone ? "text-xl" : "text-2xl"}`}>
                    {step.title}
                  </h2>
                  {step.description && (
                    <p className="text-on-surface-variant mt-1.5 text-sm leading-relaxed">{step.description}</p>
                  )}
                </div>

                {/* Fields */}
                <div className="space-y-5">
                  {step.fields.map((field) => (
                    <PreviewField key={field.id} field={field} primaryColor={primaryColor} isPhone={isPhone} />
                  ))}

                  {step.fields.length === 0 && (
                    <div className="text-center py-8 text-sm text-on-surface-variant/40 border-2 border-dashed border-outline-variant/20 rounded-xl">
                      This step has no fields yet.
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className={`flex items-center justify-between mt-8 pt-5 border-t border-on-surface/10 ${isPhone ? "gap-3" : ""}`}>
                  <button
                    onClick={() => goToStep(Math.max(0, stepIdx - 1))}
                    disabled={stepIdx === 0}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface disabled:opacity-0 transition-all text-sm uppercase tracking-widest font-label"
                  >
                    <i className="fa-solid fa-chevron-left text-xs" /> {!isPhone && "Previous"}
                  </button>
                  <button
                    onClick={() => goToStep(Math.min(schema.steps.length - 1, stepIdx + 1))}
                    disabled={stepIdx === schema.steps.length - 1}
                    className={`flex items-center gap-2 font-headline font-bold rounded-xl shadow-[0_10px_30px_rgba(192,193,255,0.2)] hover:shadow-[0_15px_40px_rgba(192,193,255,0.35)] hover:-translate-y-1 transition-all disabled:opacity-60 ${
                      isPhone ? "px-5 py-3 text-sm flex-1 justify-center" : "px-8 py-3.5"
                    }`}
                    style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
                  >
                    {stepIdx === schema.steps.length - 1 ? (
                      <>Submit <i className="fa-solid fa-check text-xs ml-1" /></>
                    ) : (
                      <>Next Step <i className="fa-solid fa-chevron-right text-xs ml-1" /></>
                    )}
                  </button>
                </div>
              </div>
            </main>
          </div>

          {/* Phone home indicator */}
          {isPhone && (
            <div className="shrink-0 flex justify-center py-2 bg-background">
              <div className="w-28 h-1 rounded-full bg-on-surface-variant/20" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Interactive preview field ───────────────────────────────── */

function PreviewField({ field, primaryColor, isPhone }: { field: FieldDef; primaryColor: string; isPhone: boolean }) {
  const [value, setValue] = useState<string>("");
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(new Set());
  const lightBg = isLightColor(primaryColor);
  const focusRing = { "--tw-ring-color": primaryColor + "66" } as React.CSSProperties;

  /* Heading fields are display-only */
  if (field.type === "heading") {
    return (
      <div className="py-4 border-b border-on-surface-variant/20">
        <h3 className="text-lg font-headline font-bold text-on-surface">{field.label}</h3>
        {field.content && <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{field.content}</p>}
        {field.hint && <p className="text-xs text-on-surface-variant/60 mt-1">{field.hint}</p>}
      </div>
    );
  }

  /* Package selector — already interactive */
  if (field.type === "package" && field.packageConfig) {
    const cfg = field.packageConfig;
    const recommendedId = cfg.defaultPackageId ?? null;

    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

        <div className={`grid gap-4 ${isPhone ? "grid-cols-1" : cfg.packages.length === 2 ? "grid-cols-2" : cfg.packages.length >= 3 ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
          {cfg.packages.map((pkg) => {
            const isSelected = selectedPkg === pkg.id;
            const isRecommended = recommendedId === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPkg(pkg.id)}
                className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  isSelected
                    ? "shadow-lg scale-[1.02]"
                    : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"
                }`}
                style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08", boxShadow: `0 8px 25px ${primaryColor}20` } : undefined}
              >
                {isRecommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-[8px] mr-1" />
                    Recommended
                  </div>
                )}
                {pkg.badge && !isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-highest text-on-surface-variant whitespace-nowrap border border-outline-variant/20">
                    {pkg.badge}
                  </div>
                )}

                <div className="mb-3 mt-1">
                  <h3 className="text-lg font-bold text-on-surface font-headline">{pkg.name}</h3>
                  {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                  {pkg.longDescription && (
                    <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{pkg.longDescription}</p>
                  )}
                </div>

                <div className="mb-4">
                  {pkg.hidePrice ? (
                    <span className="text-2xl font-extrabold font-headline" style={{ color: primaryColor }}>
                      {pkg.priceLabel || "Custom"}
                    </span>
                  ) : pkg.price === 0 ? (
                    <span className="text-2xl font-extrabold text-on-surface font-headline">Free</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-on-surface font-headline">${pkg.price}</span>
                      <span className="text-xs text-on-surface-variant/60">/mo</span>
                    </div>
                  )}
                </div>

                {/* Feature list */}
                {pkg.featureList && pkg.featureList.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {pkg.featureList.map((feat, fi) => (
                      <div key={fi} className="flex items-start gap-2 text-xs">
                        <i className="fa-solid fa-check mt-0.5 shrink-0" style={{ color: primaryColor }} />
                        <span className="text-on-surface">{feat}</span>
                      </div>
                    ))}
                  </div>
                )}

                {cfg.features.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-outline-variant/15">
                    {cfg.features.map((feat, fi) => {
                      const val = feat.values[pkg.id];
                      const isIncluded = val === true || (typeof val === "string" && val !== "");
                      return (
                        <div key={fi} className="flex items-center gap-2 text-xs">
                          {val === false ? (
                            <i className="fa-solid fa-xmark text-on-surface-variant/30 w-4 text-center" />
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

                <div className="mt-4 flex items-center justify-center py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all" style={isSelected ? { backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" } : { backgroundColor: "transparent", border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
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
      </div>
    );
  }

  /* Repeater — show structure with interactive add button */
  if (field.type === "repeater" && field.repeaterConfig) {
    const cfg = field.repeaterConfig;
    const summaryFields = cfg.subFields.filter((sf) => !sf.showWhen).slice(0, 3);
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                {summaryFields.map((sf) => (
                  <th key={sf.id} className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3">{sf.label}</th>
                ))}
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={summaryFields.length + 1} className="px-6 py-8 text-center text-sm text-on-surface-variant/60">
                  No {cfg.entryLabel?.toLowerCase() || "entries"} yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <button
          type="button"
          className="mt-3 px-5 py-2.5 font-bold rounded-xl text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
        >
          <i className="fa-solid fa-plus text-xs mr-1.5" />
          {cfg.addButtonLabel || `Add ${cfg.entryLabel || "Entry"}`}
        </button>
      </div>
    );
  }

  /* Consent field */
  if (field.type === "consent") {
    const isChecked = value === "yes";
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-3">
          <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-outline-variant/20 p-4 text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-lowest/50">
            {field.consentText || "No agreement text provided."}
          </div>
          <label
            className="flex items-start gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200"
            style={isChecked ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setValue(e.target.checked ? "yes" : "")}
              className="h-5 w-5 rounded mt-0.5 shrink-0"
              style={{ accentColor: primaryColor }}
            />
            <span className="text-sm text-on-surface">
              {field.consentCheckboxLabel || "I have read and agree to the terms above"}
            </span>
          </label>
        </div>
      </div>
    );
  }

  /* All other fields — fully interactive */
  return (
    <div>
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
        {field.label}
        {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </label>
      {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}

      {field.type === "textarea" || field.type === "address" ? (
        <textarea
          rows={field.rows ?? 4}
          placeholder={field.placeholder || (field.type === "address" ? "Street address, City, State, ZIP" : undefined)}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT_CLS}
          style={focusRing}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT_CLS}
          style={focusRing}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "radio" ? (
        <div className="space-y-2">
          {(field.options ?? []).map((o) => {
            const isSelected = value === o;
            return (
              <label
                key={o}
                className="flex items-center gap-3 py-3 px-4 rounded-xl border-2 text-sm text-on-surface cursor-pointer transition-all duration-200"
                style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}
              >
                <input
                  type="radio"
                  name={`preview-${field.id}`}
                  value={o}
                  checked={isSelected}
                  onChange={() => setValue(o)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                  style={isSelected ? { borderColor: primaryColor } : { borderColor: "var(--color-outline-variant)" }}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                  )}
                </div>
                {o}
              </label>
            );
          })}
        </div>
      ) : field.type === "checkbox" && field.options && field.options.length > 0 ? (
        <div className="space-y-2">
          {field.options.map((o) => {
            const isChecked = checkedOptions.has(o);
            return (
              <label
                key={o}
                className="flex items-center gap-3 py-3 px-4 rounded-xl border-2 text-sm text-on-surface cursor-pointer transition-all duration-200"
                style={isChecked ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    setCheckedOptions((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) {
                        if (field.maxSelections && field.maxSelections > 0 && next.size >= field.maxSelections) return prev;
                        next.add(o);
                      } else {
                        next.delete(o);
                      }
                      return next;
                    });
                  }}
                  className="h-4 w-4 rounded shrink-0"
                  style={{ accentColor: primaryColor }}
                />
                {o}
              </label>
            );
          })}
          {field.maxSelections && field.maxSelections > 0 && (
            <p className="text-xs text-on-surface-variant/60 ml-1">Select up to {field.maxSelections}</p>
          )}
        </div>
      ) : field.type === "checkbox" ? (
        <label
          className="flex items-center gap-3 cursor-pointer py-3 px-4 rounded-xl border-2 transition-all duration-200"
          style={value === "yes" ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}
        >
          <input
            type="checkbox"
            checked={value === "yes"}
            onChange={(e) => setValue(e.target.checked ? "yes" : "")}
            className="h-5 w-5 rounded"
            style={{ accentColor: primaryColor }}
          />
          <span className="text-sm text-on-surface">{field.placeholder || "Yes"}</span>
        </label>
      ) : field.type === "color" ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || field.placeholder || "#c0c1ff"}
            onChange={(e) => setValue(e.target.value)}
            className="w-12 h-12 rounded-xl border-0 cursor-pointer bg-transparent"
          />
          <input
            placeholder={field.placeholder || "#c0c1ff"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`${INPUT_CLS} flex-1`}
            style={focusRing}
          />
        </div>
      ) : field.type === "date" ? (
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${INPUT_CLS} dark:[color-scheme:dark]`}
          style={focusRing}
        />
      ) : field.type === "file" || field.type === "files" ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest/50 cursor-pointer hover:border-primary/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
            <i className="fa-solid fa-cloud-arrow-up text-3xl" style={{ color: primaryColor }} />
          </div>
          <p className="text-sm font-semibold text-on-surface font-headline">Click or drag to upload</p>
          <p className="text-xs text-on-surface-variant/60">Max 50 MB per file</p>
        </div>
      ) : (
        <input
          type={field.type === "email" ? "email" : field.type === "tel" ? "tel" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={INPUT_CLS}
          style={focusRing}
        />
      )}
    </div>
  );
}
