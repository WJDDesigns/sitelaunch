"use client";

import { useState, useMemo, useEffect } from "react";
import type { FormSchema, FieldDef } from "@/lib/forms";
import { evaluateCondition, getEffectiveColSpan } from "@/lib/forms";
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
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  // Filter steps and fields by conditions using preview data
  const visibleSteps = useMemo(
    () => schema.steps.filter((s) => evaluateCondition(s.showCondition, previewData)),
    [schema.steps, previewData],
  );
  const safeIdx = Math.min(stepIdx, Math.max(0, visibleSteps.length - 1));
  const step = visibleSteps[safeIdx];
  const visibleFields = useMemo(
    () => step?.fields.filter((f) => evaluateCondition(f.showCondition, previewData)) ?? [],
    [step, previewData],
  );
  const lightBg = isLightColor(primaryColor);

  // Count conditions in the schema
  const conditionCount = useMemo(() => {
    let count = 0;
    schema.steps.forEach((s) => {
      if (s.showCondition?.fieldId) count++;
      s.fields.forEach((f) => { if (f.showCondition?.fieldId) count++; });
    });
    return count;
  }, [schema]);

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
                      {Math.round(((Math.max(0, safeIdx)) / visibleSteps.length) * 100)}%
                    </span>
                  </div>
                  <div className="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 ease-out rounded-full"
                      style={{
                        width: `${(safeIdx / visibleSteps.length) * 100}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                </div>

                {/* Step list */}
                <nav className="flex-1 px-3 py-3 space-y-0.5">
                  {visibleSteps.map((s, i) => {
                    const isCurrent = i === safeIdx;
                    const isCompleted = i < safeIdx;
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
                    Step {safeIdx + 1} of {visibleSteps.length}
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
                    {visibleSteps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => goToStep(i)}
                        className="h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: i === safeIdx ? "24px" : "8px",
                          backgroundColor: i <= safeIdx ? primaryColor : "var(--color-outline-variant)",
                          opacity: i <= safeIdx ? 1 : 0.3,
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
                {/* Conditions active banner */}
                {conditionCount > 0 && (
                  <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    <i className="fa-solid fa-bolt text-[9px]" />
                    {conditionCount} conditional rule{conditionCount !== 1 ? "s" : ""} active — interact with fields below to test logic
                  </div>
                )}

                <div className="grid grid-cols-4 gap-x-4 gap-y-5">
                  {visibleFields.map((field) => {
                    const colSpan = getEffectiveColSpan(field);
                    const colCls = colSpan === 1 ? "col-span-1"
                      : colSpan === 2 ? "col-span-2"
                      : colSpan === 3 ? "col-span-3"
                      : "col-span-4";
                    return (
                      <div key={field.id} className={colCls}>
                        <PreviewField
                          field={field}
                          primaryColor={primaryColor}
                          isPhone={isPhone}
                          previewValue={previewData[field.id]}
                          onPreviewChange={(v) => setPreviewData((prev) => ({ ...prev, [field.id]: v }))}
                        />
                      </div>
                    );
                  })}

                  {visibleFields.length === 0 && (
                    <div className="text-center py-8 text-sm text-on-surface-variant/40 border-2 border-dashed border-outline-variant/20 rounded-xl">
                      {step?.fields.length === 0 ? "This step has no fields yet." : "All fields on this step are hidden by conditions."}
                    </div>
                  )}
                </div>

                {/* Navigation buttons */}
                <div className={`flex items-center justify-between mt-8 pt-5 border-t border-on-surface/10 ${isPhone ? "gap-3" : ""}`}>
                  <button
                    onClick={() => goToStep(Math.max(0, safeIdx - 1))}
                    disabled={safeIdx === 0}
                    className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface disabled:opacity-0 transition-all text-sm uppercase tracking-widest font-label"
                  >
                    <i className="fa-solid fa-chevron-left text-xs" /> {!isPhone && "Previous"}
                  </button>
                  <button
                    onClick={() => goToStep(Math.min(visibleSteps.length - 1, safeIdx + 1))}
                    disabled={safeIdx === visibleSteps.length - 1}
                    className={`flex items-center gap-2 font-headline font-bold rounded-xl shadow-[0_10px_30px_rgba(192,193,255,0.2)] hover:shadow-[0_15px_40px_rgba(192,193,255,0.35)] hover:-translate-y-1 transition-all disabled:opacity-60 ${
                      isPhone ? "px-5 py-3 text-sm flex-1 justify-center" : "px-8 py-3.5"
                    }`}
                    style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}
                  >
                    {safeIdx === visibleSteps.length - 1 ? (
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

function PreviewField({ field, primaryColor, isPhone, previewValue, onPreviewChange }: {
  field: FieldDef; primaryColor: string; isPhone: boolean;
  previewValue?: unknown; onPreviewChange?: (v: unknown) => void;
}) {
  const [value, setValue] = useState<string>((typeof previewValue === "string" ? previewValue : "") || "");
  const [selectedPkg, setSelectedPkg] = useState<string>("");
  const [checkedOptions, setCheckedOptions] = useState<Set<string>>(new Set());

  // Sync value changes up for condition evaluation
  useEffect(() => {
    onPreviewChange?.(value);
  }, [value]);
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

  /* Package selector — interactive with layout support */
  if (field.type === "package" && field.packageConfig) {
    const cfg = field.packageConfig;
    const recommendedId = cfg.defaultPackageId ?? null;
    const layout = cfg.layout ?? "cards";
    const cols = cfg.columns ?? "auto";

    const colsClass = isPhone ? "grid-cols-1"
      : cols === "auto"
        ? cfg.packages.length === 1 ? "grid-cols-1"
          : cfg.packages.length === 2 ? "grid-cols-2"
          : cfg.packages.length >= 3 ? "grid-cols-1 lg:grid-cols-3"
          : "grid-cols-1"
        : cols === 1 ? "grid-cols-1"
        : cols === 2 ? "grid-cols-1 sm:grid-cols-2"
        : cols === 3 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

    const renderPriceP = (pkg: typeof cfg.packages[0], size: "lg" | "sm" = "lg") => {
      const cls = size === "lg" ? "text-2xl font-extrabold font-headline" : "text-lg font-extrabold font-headline";
      if (pkg.hidePrice) return <span className={cls} style={{ color: primaryColor }}>{pkg.priceLabel || "Custom"}</span>;
      if (pkg.price === 0) return <span className={`${cls} text-on-surface`}>Free</span>;
      return <div className="flex items-baseline gap-1"><span className={`${cls} text-on-surface`}>${pkg.price}</span><span className="text-xs text-on-surface-variant/60">/mo</span></div>;
    };

    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}
          {field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}

        {/* Cards */}
        {layout === "cards" && (
          <div className={`grid gap-4 ${colsClass}`}>
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button key={pkg.id} type="button" onClick={() => setSelectedPkg(pkg.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${isSelected ? "shadow-lg scale-[1.02]" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"}`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08", boxShadow: `0 8px 25px ${primaryColor}20` } : undefined}>
                  {isRecommended && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}><i className="fa-solid fa-wand-magic-sparkles text-[8px] mr-1" />Recommended</div>}
                  {pkg.badge && !isRecommended && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-surface-container-highest text-on-surface-variant whitespace-nowrap border border-outline-variant/20">{pkg.badge}</div>}
                  <div className="mb-3 mt-1">
                    <h3 className="text-lg font-bold text-on-surface font-headline">{pkg.name}</h3>
                    {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                    {pkg.longDescription && <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{pkg.longDescription}</p>}
                  </div>
                  <div className="mb-4">{renderPriceP(pkg)}</div>
                  {pkg.featureList && pkg.featureList.length > 0 && <div className="space-y-1.5 mb-3">{pkg.featureList.map((f, fi) => <div key={fi} className="flex items-start gap-2 text-xs"><i className="fa-solid fa-check mt-0.5 shrink-0" style={{ color: primaryColor }} /><span className="text-on-surface">{f}</span></div>)}</div>}
                  {cfg.features.length > 0 && !cfg.showFeaturesTable && <div className="space-y-2 pt-3 border-t border-outline-variant/15">{cfg.features.map((feat, fi) => { const val = feat.values[pkg.id]; const inc = val === true || (typeof val === "string" && val !== ""); return <div key={fi} className="flex items-center gap-2 text-xs">{val === false ? <i className="fa-solid fa-xmark text-on-surface-variant/30 w-4 text-center" /> : <i className="fa-solid fa-check w-4 text-center" style={{ color: primaryColor }} />}<span className={inc ? "text-on-surface" : "text-on-surface-variant/40 line-through"}>{feat.label}{typeof val === "string" && val && <span className="ml-1 font-semibold" style={{ color: primaryColor }}>({val})</span>}</span></div>; })}</div>}
                  <div className="mt-4 flex items-center justify-center py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all" style={isSelected ? { backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" } : { backgroundColor: "transparent", border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>{isSelected ? <><i className="fa-solid fa-check text-[10px] mr-1.5" /> Selected</> : "Select"}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Horizontal */}
        {layout === "horizontal" && (
          <div className="space-y-4">
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button key={pkg.id} type="button" onClick={() => setSelectedPkg(pkg.id)}
                  className={`relative w-full text-left rounded-2xl border-2 transition-all duration-200 overflow-hidden ${isSelected ? "shadow-lg" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"}`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : undefined}>
                  {/* Top section */}
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center" style={isSelected ? { borderColor: primaryColor } : { borderColor: "var(--color-outline-variant)" }}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-on-surface font-headline">{pkg.name}</h3>
                        {isRecommended && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>Recommended</span>}
                        {pkg.badge && !isRecommended && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-surface-container-highest text-on-surface-variant border border-outline-variant/20">{pkg.badge}</span>}
                      </div>
                      {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{pkg.description}</p>}
                    </div>
                    <div className="shrink-0">{renderPriceP(pkg, "sm")}</div>
                  </div>
                  {pkg.longDescription && <div className="px-4 pb-3 -mt-1 pl-[3.25rem]"><p className="text-sm text-on-surface-variant leading-relaxed">{pkg.longDescription}</p></div>}
                  {pkg.featureList && pkg.featureList.length > 0 && (
                    <div className="border-t border-outline-variant/15 mx-4 py-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-[2rem]">
                        {pkg.featureList.map((f, fi) => <div key={fi} className="flex items-start gap-2 text-xs"><i className="fa-solid fa-check w-4 text-center mt-0.5 shrink-0" style={{ color: primaryColor }} /><span className="text-on-surface">{f}</span></div>)}
                      </div>
                    </div>
                  )}
                  {cfg.features.length > 0 && !cfg.showFeaturesTable && (
                    <div className="border-t border-outline-variant/15 mx-4 py-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-[2rem]">
                        {cfg.features.map((feat, fi) => { const val = feat.values[pkg.id]; const inc = val === true || (typeof val === "string" && val !== ""); return <div key={fi} className="flex items-center gap-2 text-xs">{val === false ? <i className="fa-solid fa-xmark text-on-surface-variant/30 w-4 text-center" /> : <i className="fa-solid fa-check w-4 text-center" style={{ color: primaryColor }} />}<span className={inc ? "text-on-surface" : "text-on-surface-variant/40 line-through"}>{feat.label}{typeof val === "string" && val && <span className="ml-1 font-semibold" style={{ color: primaryColor }}>({val})</span>}</span></div>; })}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Compact */}
        {layout === "compact" && (
          <div className={`grid gap-4 ${colsClass}`}>
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button key={pkg.id} type="button" onClick={() => setSelectedPkg(pkg.id)}
                  className={`relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ${isSelected ? "shadow-md" : "border-outline-variant/30 hover:border-primary/40 bg-surface-container-lowest"}`}
                  style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : undefined}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-on-surface font-headline">{pkg.name}</h3>
                    {isRecommended && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}><i className="fa-solid fa-star text-[7px] mr-0.5" />Best</span>}
                    {pkg.badge && !isRecommended && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-surface-container-highest text-on-surface-variant border border-outline-variant/15">{pkg.badge}</span>}
                  </div>
                  <div className="mb-2">{renderPriceP(pkg, "sm")}</div>
                  {pkg.description && <p className="text-xs text-on-surface-variant/60 mb-3">{pkg.description}</p>}
                  {pkg.featureList && pkg.featureList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {pkg.featureList.map((f, fi) => <span key={fi} className="text-[10px] px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant"><i className="fa-solid fa-check text-[8px] mr-1" style={{ color: primaryColor }} />{f}</span>)}
                    </div>
                  )}
                  <div className="flex items-center justify-center py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={isSelected ? { backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" } : { border: "1px solid var(--color-outline-variant)", color: "var(--color-on-surface-variant)" }}>
                    {isSelected ? <><i className="fa-solid fa-check text-[9px] mr-1" /> Selected</> : "Select"}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        {layout === "list" && (
          <div className="border-2 border-outline-variant/20 rounded-2xl overflow-hidden divide-y divide-outline-variant/15">
            {cfg.packages.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              const isRecommended = recommendedId === pkg.id;
              return (
                <button key={pkg.id} type="button" onClick={() => setSelectedPkg(pkg.id)}
                  className={`w-full text-left flex items-center gap-4 px-5 py-4 transition-all duration-200 ${isSelected ? "" : "hover:bg-surface-container-lowest/50"}`}
                  style={isSelected ? { backgroundColor: primaryColor + "0A" } : undefined}>
                  <div className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                    style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor } : { borderColor: "var(--color-outline-variant)" }}>
                    {isSelected && <i className="fa-solid fa-check text-[9px]" style={{ color: lightBg ? "#1a1c25" : "#ffffff" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-on-surface text-sm">{pkg.name}</span>
                      {isRecommended && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase" style={{ backgroundColor: primaryColor, color: lightBg ? "#1a1c25" : "#ffffff" }}>Recommended</span>}
                      {pkg.badge && !isRecommended && <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-surface-container-highest text-on-surface-variant/70">{pkg.badge}</span>}
                    </div>
                    {pkg.description && <p className="text-xs text-on-surface-variant/60 mt-0.5 truncate">{pkg.description}</p>}
                  </div>
                  <div className="shrink-0">{renderPriceP(pkg, "sm")}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Features comparison table */}
        {cfg.showFeaturesTable && cfg.features.length > 0 && (
          <div className="mt-4 border-2 border-outline-variant/15 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-outline-variant/15"><th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3">Feature</th>{cfg.packages.map((p) => <th key={p.id} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-3 py-3">{p.name}</th>)}</tr></thead>
              <tbody className="divide-y divide-outline-variant/10">
                {cfg.features.map((feat, fi) => <tr key={fi}><td className="px-4 py-2.5 text-xs text-on-surface">{feat.label}</td>{cfg.packages.map((p) => { const v = feat.values[p.id]; return <td key={p.id} className="px-3 py-2.5 text-center">{v === false || v === undefined ? <i className="fa-solid fa-xmark text-on-surface-variant/30" /> : v === true ? <i className="fa-solid fa-check" style={{ color: primaryColor }} /> : <span className="text-xs font-semibold" style={{ color: primaryColor }}>{v}</span>}</td>; })}</tr>)}
              </tbody>
            </table>
          </div>
        )}
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

  /* Site Structure Builder — preview */
  if (field.type === "site_structure" && field.siteStructureConfig) {
    const cfg = field.siteStructureConfig;
    const starterPages = cfg.starterPages ?? [
      { id: "1", name: "Home" },
      { id: "2", name: "About" },
      { id: "3", name: "Services" },
      { id: "4", name: "Contact" },
    ];
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}
        <div className="rounded-2xl border-2 border-outline-variant/20 overflow-hidden bg-surface-container-lowest">
          {/* Mock nav preview */}
          <div className="px-4 py-3 border-b border-outline-variant/15 bg-surface-container/30">
            <div className="inline-flex items-center gap-4 text-xs text-on-surface-variant/60">
              <i className="fa-solid fa-bars text-sm" style={{ color: primaryColor }} />
              {starterPages.slice(0, 5).map((p) => (
                <span key={p.id} className="font-medium hover:text-on-surface transition-colors cursor-default">{p.name}</span>
              ))}
            </div>
          </div>
          {/* Pages list */}
          <div className="p-3 space-y-1.5">
            {starterPages.map((page, i) => (
              <div key={page.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/10">
                <i className="fa-solid fa-grip-vertical text-[10px] text-on-surface-variant/30" />
                <span className="text-sm text-on-surface flex-1">{page.name}</span>
                <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-wider">Page {i + 1}</span>
              </div>
            ))}
          </div>
          <div className="px-3 pb-3">
            <button type="button" className="w-full py-2.5 rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-widest transition-all hover:opacity-80"
              style={{ borderColor: primaryColor + "40", color: primaryColor }}>
              <i className="fa-solid fa-plus text-[10px] mr-1.5" />Add Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Feature Selector — preview */
  if (field.type === "feature_selector" && field.featureSelectorConfig) {
    const cfg = field.featureSelectorConfig;
    const categories = [...new Set(cfg.features.map((f) => f.category || "Features"))];
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}
        {cfg.maxSelections ? <p className="text-xs text-on-surface-variant/40 mb-3 ml-1">Select up to {cfg.maxSelections}</p> : null}
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              {categories.length > 1 && <h4 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2 ml-1">{cat}</h4>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cfg.features.filter((f) => (f.category || "Features") === cat).map((feat) => (
                  <div key={feat.id}
                    className="flex items-start gap-3 p-3.5 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest cursor-pointer hover:border-primary/30 transition-all">
                    {feat.icon && <i className={`fa-solid ${feat.icon} text-base mt-0.5`} style={{ color: primaryColor }} />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-on-surface">{feat.name}</span>
                        {cfg.showComplexity && feat.complexity && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant/60">{feat.complexity}</span>}
                      </div>
                      {feat.description && <p className="text-xs text-on-surface-variant/60 mt-0.5">{feat.description}</p>}
                      {cfg.showPriceImpact && feat.priceImpact && <span className="text-[10px] font-bold mt-1 inline-block" style={{ color: primaryColor }}>{feat.priceImpact}</span>}
                    </div>
                    <div className="w-5 h-5 rounded border-2 border-outline-variant/30 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Goal Builder — preview */
  if (field.type === "goal_builder" && field.goalBuilderConfig) {
    const cfg = field.goalBuilderConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}
        {cfg.allowMultiple && <p className="text-xs text-on-surface-variant/40 mb-3 ml-1">Select all that apply</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cfg.goals.map((goal) => (
            <div key={goal.id}
              className="flex items-center gap-3 p-4 rounded-xl border-2 border-outline-variant/20 bg-surface-container-lowest cursor-pointer hover:border-primary/30 transition-all">
              {goal.icon && <i className={`fa-solid ${goal.icon} text-lg`} style={{ color: primaryColor }} />}
              <span className="text-sm font-semibold text-on-surface">{goal.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Approval / Sign-off — preview */
  if (field.type === "approval" && field.approvalConfig) {
    const cfg = field.approvalConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-4">
          {cfg.scopeText && (
            <div className="max-h-56 overflow-y-auto rounded-xl border-2 border-outline-variant/20 p-4 text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap bg-surface-container-lowest/50">
              {cfg.scopeText}
            </div>
          )}
          {cfg.requireFullName && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Full Name</label>
              <input type="text" placeholder="Type your full legal name" className={INPUT_CLS} style={focusRing} readOnly />
            </div>
          )}
          {cfg.requireSignature && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Signature</label>
              <div className="relative rounded-xl border-2 border-outline-variant/20 overflow-hidden bg-white/95" style={{ height: 120 }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <i className="fa-solid fa-signature text-2xl mb-1" style={{ color: "#d1d5db" }} />
                  <span className="text-xs" style={{ color: "#9ca3af" }}>Sign here with mouse or finger</span>
                </div>
                <div className="absolute bottom-4 left-6 right-6 border-b" style={{ borderColor: "rgba(0,0,0,0.1)" }} />
              </div>
            </div>
          )}
          <button type="button"
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-sm border-2 flex items-center justify-center gap-2 transition-all"
            style={{ borderColor: primaryColor, color: primaryColor }}>
            <i className="fa-solid fa-circle text-base" />
            {cfg.approveLabel || "I Approve"}
          </button>
        </div>
      </div>
    );
  }

  /* Asset Collection — preview */
  if (field.type === "asset_collection" && field.assetCollectionConfig) {
    const cfg = field.assetCollectionConfig;
    const cats = cfg.categories ?? ["logos", "colors", "fonts", "documents", "images"];
    const catIcons: Record<string, string> = { logos: "fa-star", colors: "fa-palette", fonts: "fa-font", documents: "fa-file-lines", images: "fa-images", other: "fa-folder" };
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-3 ml-1">{field.hint}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cats.map((cat) => (
            <div key={cat} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-outline-variant/25 bg-surface-container-lowest/50 cursor-pointer hover:border-primary/30 transition-all">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                <i className={`fa-solid ${catIcons[cat] || "fa-folder"} text-lg`} style={{ color: primaryColor }} />
              </div>
              <span className="text-xs font-semibold text-on-surface capitalize">{cat}</span>
              <span className="text-[10px] text-on-surface-variant/50">Drop files here</span>
            </div>
          ))}
        </div>
        {cfg.maxFiles && <p className="text-xs text-on-surface-variant/40 mt-2 ml-1">Max {cfg.maxFiles} files total</p>}
      </div>
    );
  }

  /* Brand Style Picker — preview */
  if (field.type === "brand_style" && field.brandStyleConfig) {
    const cfg = field.brandStyleConfig;
    const getDarkest = (palette: string[]) => {
      let d = palette[0] ?? "#333", min = Infinity;
      for (const c of palette) { const h = c.replace("#",""); const b = parseInt(h.substring(0,2),16)*0.299+parseInt(h.substring(2,4),16)*0.587+parseInt(h.substring(4,6),16)*0.114; if(b<min){min=b;d=c;} }
      return d;
    };
    const getLightest = (palette: string[]) => {
      let l = palette[palette.length-1] ?? "#f5f5f5", max = -1;
      for (const c of palette) { const h = c.replace("#",""); const b = parseInt(h.substring(0,2),16)*0.299+parseInt(h.substring(2,4),16)*0.587+parseInt(h.substring(4,6),16)*0.114; if(b>max){max=b;l=c;} }
      return l;
    };
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cfg.styles.map((style) => {
            const darkest = getDarkest(style.palette);
            const lightest = getLightest(style.palette);
            return (
              <div key={style.id} className="rounded-xl border-2 border-outline-variant/30 p-3 bg-surface-container hover:border-primary/30 transition-all cursor-pointer">
                <div className="rounded-lg overflow-hidden mb-2.5 border border-outline-variant/30" style={{ height: 64 }}>
                  <div className="h-4 flex items-center px-2 gap-1" style={{ backgroundColor: style.palette[0] ?? "#333" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.5)" }} />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
                    <div className="ml-auto text-[6px] font-bold" style={{ color: "rgba(255,255,255,0.8)", fontFamily: style.fontFamily }}>Logo</div>
                  </div>
                  <div className="px-2 py-1.5" style={{ backgroundColor: lightest }}>
                    <div className="h-1 w-3/4 rounded-full mb-1" style={{ backgroundColor: darkest, opacity: 0.7 }} />
                    <div className="h-1 w-1/2 rounded-full mb-1" style={{ backgroundColor: darkest, opacity: 0.4 }} />
                    <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: darkest, opacity: 0.25 }} />
                  </div>
                </div>
                <div className="flex rounded-md overflow-hidden mb-2" style={{ height: 6 }}>
                  {style.palette.map((color, i) => <div key={i} className="flex-1" style={{ backgroundColor: color }} />)}
                </div>
                <p className="text-sm font-semibold text-on-surface">{style.name}</p>
                {style.fontFamily && <p className="text-[10px] text-on-surface-variant mt-0.5"><i className="fa-solid fa-font mr-1" />{style.fontFamily}</p>}
                {style.description && <p className="text-xs text-on-surface-variant/70 mt-1 leading-relaxed">{style.description}</p>}
              </div>
            );
          })}
        </div>
        {cfg.allowMultiple && <p className="text-xs text-on-surface-variant/40 mt-2 ml-1">Select multiple styles</p>}
      </div>
    );
  }

  /* Competitor Analyzer — preview */
  if (field.type === "competitor_analyzer" && field.competitorAnalyzerConfig) {
    const cfg = field.competitorAnalyzerConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        {cfg.autoFetch && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold mb-3"
            style={{ backgroundColor: primaryColor + "15", color: primaryColor }}>
            <i className="fa-solid fa-wand-magic-sparkles text-[9px]" />Auto-analysis enabled
          </div>
        )}
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 mb-2">
          <div className="flex items-center gap-2">
            <input type="url" placeholder={cfg.placeholder || "https://competitor-website.com"} className={INPUT_CLS} style={focusRing} readOnly />
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
              <i className="fa-solid fa-note-sticky text-xs text-on-surface-variant/40" />
            </div>
          </div>
        </div>
        <button type="button" className="w-full py-2.5 rounded-xl border-2 border-dashed text-sm font-semibold flex items-center justify-center gap-2 transition-all"
          style={{ borderColor: primaryColor + "40", color: primaryColor }}>
          <i className="fa-solid fa-plus text-xs" />Add Competitor
          {cfg.maxCompetitors && <span className="text-[10px] font-normal opacity-60">(0/{cfg.maxCompetitors})</span>}
        </button>
      </div>
    );
  }

  /* Timeline Selector — preview */
  if (field.type === "timeline" && field.timelineConfig) {
    const cfg = field.timelineConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-3">
          {(cfg.showStartDate || cfg.showEndDate) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cfg.showStartDate && (
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">
                    <i className="fa-solid fa-play mr-1 text-[9px]" style={{ color: "#4caf50" }} />Project Start
                  </label>
                  <input type="date" className={INPUT_CLS} style={focusRing} readOnly />
                </div>
              )}
              {cfg.showEndDate && (
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1 ml-1">
                    <i className="fa-solid fa-flag-checkered mr-1 text-[9px]" style={{ color: "#f44336" }} />Project Deadline
                  </label>
                  <input type="date" className={INPUT_CLS} style={focusRing} readOnly />
                </div>
              )}
            </div>
          )}
          {cfg.milestones && cfg.milestones.length > 0 && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
                <i className="fa-solid fa-diamond mr-1" style={{ color: primaryColor }} />Milestones
              </p>
              <div className={
                cfg.milestoneColumns === 3 ? "grid grid-cols-1 sm:grid-cols-3 gap-3" :
                cfg.milestoneColumns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" :
                "space-y-2.5"
              }>
                {cfg.milestones.map((m) => (
                  <div key={m.id}>
                    <label className="block text-xs text-on-surface mb-1 ml-0.5">
                      {m.label}{m.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
                    </label>
                    <input type="date" className={INPUT_CLS} style={focusRing} readOnly />
                  </div>
                ))}
              </div>
            </div>
          )}
          {cfg.allowBlackoutDates && (
            <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                <i className="fa-solid fa-ban mr-1 text-error/70" />Blackout Periods
              </p>
              <button type="button" className="text-xs font-semibold flex items-center gap-1.5" style={{ color: primaryColor }}>
                <i className="fa-solid fa-plus text-[9px]" />Add Blackout Period
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Budget Allocator — preview */
  if (field.type === "budget_allocator" && field.budgetAllocatorConfig) {
    const cfg = field.budgetAllocatorConfig;
    const currency = cfg.currency ?? "$";
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        {cfg.mode === "constrained" && cfg.totalBudget && cfg.totalBudget > 0 && (
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                <i className="fa-solid fa-wallet mr-1" style={{ color: primaryColor }} />Total Budget
              </span>
              <span className="text-sm font-bold" style={{ color: primaryColor }}>{currency}{cfg.totalBudget.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-highest" />
          </div>
        )}
        <div className="space-y-3">
          {cfg.channels.map((ch) => {
            const defaultPct = ch.defaultValue && cfg.totalBudget ? (ch.defaultValue / cfg.totalBudget) * 100 : 25;
            return (
              <div key={ch.id} className="rounded-xl border border-outline-variant/30 bg-surface-container p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {ch.icon && <i className={`${ch.icon} text-sm`} style={{ color: primaryColor }} />}
                    <span className="text-xs font-semibold text-on-surface">{ch.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: primaryColor }}>
                    {cfg.showAsPercentage ? `${Math.round(defaultPct)}%` : `${currency}${(ch.defaultValue ?? 0).toLocaleString()}`}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-container-highest">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(defaultPct, 100)}%`, backgroundColor: primaryColor, opacity: 0.6 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* Address (structured) -- preview */
  if (field.type === "address" && field.addressConfig?.mode) {
    const addrFields = field.addressConfig.fields ?? ["street", "street2", "city", "state", "zip", "country"];
    const placeholders: Record<string, string> = { street: "123 Main St", street2: "Apt, Suite, Unit", city: "City", state: "State", zip: "ZIP Code", country: "Country" };
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        {field.addressConfig.mode === "autocomplete" && (
          <p className="text-[10px] text-primary/70 mb-2 ml-1"><i className="fa-solid fa-magnifying-glass-location mr-1" />Google Places autocomplete enabled</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {addrFields.map((fld) => {
            const isFullWidth = fld === "street" || fld === "street2";
            return (
              <div key={fld} className={isFullWidth ? "sm:col-span-2" : ""}>
                <input type="text" readOnly placeholder={placeholders[fld]} className={INPUT_CLS} style={focusRing} />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* Country / State Picker -- preview */
  if (field.type === "country_state") {
    const isStateOnly = field.countryStateConfig?.stateOnly;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        {isStateOnly ? (
          <select className={INPUT_CLS} style={focusRing} defaultValue="">
            <option value="">Select state/province...</option>
          </select>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={INPUT_CLS} style={focusRing} defaultValue="">
              <option value="">Select country...</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
            </select>
            <select className={INPUT_CLS} style={focusRing} defaultValue="">
              <option value="">Select state/province...</option>
            </select>
          </div>
        )}
      </div>
    );
  }

  /* Matrix / Grid — preview */
  if (field.type === "matrix" && field.matrixConfig) {
    const cfg = field.matrixConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="overflow-x-auto rounded-xl border-2 border-outline-variant/20">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant/15">
                <th className="text-left text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-4 py-3" />
                {cfg.columns.map((col) => (
                  <th key={col} className="text-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-3 py-3">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {cfg.rows.map((row) => (
                <tr key={row}>
                  <td className="px-4 py-3 text-sm font-medium text-on-surface whitespace-nowrap">{row}</td>
                  {cfg.columns.map((col) => (
                    <td key={col} className="px-3 py-3 text-center">
                      <div className={`w-5 h-5 ${cfg.multiSelect ? "rounded" : "rounded-full"} border-2 border-outline-variant/30 inline-block`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* Questionnaire / Scoring — preview */
  if (field.type === "questionnaire" && field.questionnaireConfig) {
    const cfg = field.questionnaireConfig;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="space-y-4">
          {cfg.questions.map((q, qi) => (
            <div key={q.id} className="rounded-xl border border-outline-variant/20 p-4 bg-surface-container-lowest/50">
              <p className="text-sm font-semibold text-on-surface mb-3">
                <span className="text-xs font-bold mr-2 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">{qi + 1}</span>
                {q.text}
              </p>
              <div className="space-y-1.5">
                {q.answers.map((a) => (
                  <div key={a.label} className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg">
                    <div className="w-4 h-4 rounded-full border-2 border-outline-variant/30 shrink-0" />
                    <span className="text-sm text-on-surface flex-1">{a.label}</span>
                    {cfg.showScore && <span className="text-[10px] font-bold text-on-surface-variant/40">{a.score} pts</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* Rating / Stars — interactive preview */
  if (field.type === "rating") {
    const maxStars = field.ratingConfig?.maxStars ?? 5;
    const allowHalf = field.ratingConfig?.allowHalf ?? false;
    const currentVal = Number(value) || 0;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxStars }, (_, i) => {
            const starVal = i + 1;
            const halfVal = i + 0.5;
            const isFull = currentVal >= starVal;
            const isHalf = allowHalf && !isFull && currentVal >= halfVal;
            return (
              <button key={i} type="button" className="relative text-2xl transition-transform hover:scale-110 focus:outline-none" onClick={() => {
                if (allowHalf) {
                  if (currentVal === starVal) setValue(String(halfVal));
                  else if (currentVal === halfVal) setValue("");
                  else setValue(String(starVal));
                } else {
                  setValue(currentVal === starVal ? "" : String(starVal));
                }
              }}>
                <i className={`fa-solid fa-star ${isFull ? "" : isHalf ? "opacity-0" : "opacity-20"}`} style={isFull ? { color: primaryColor } : undefined} />
                {isHalf && <i className="fa-solid fa-star-half-stroke absolute inset-0" style={{ color: primaryColor }} />}
              </button>
            );
          })}
          {currentVal > 0 && <span className="text-sm font-bold ml-2" style={{ color: primaryColor }}>{currentVal}</span>}
        </div>
      </div>
    );
  }

  /* Yes/No Toggle — interactive preview */
  if (field.type === "toggle") {
    const isYes = value === "yes";
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <button type="button" onClick={() => setValue(isYes ? "no" : "yes")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 w-full"
          style={value ? { borderColor: primaryColor, backgroundColor: primaryColor + "08" } : { borderColor: "var(--color-outline-variant)" }}>
          <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isYes ? "" : "bg-surface-container-highest"}`}
            style={isYes ? { backgroundColor: primaryColor } : undefined}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${isYes ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </div>
          <span className="text-sm font-semibold text-on-surface">{isYes ? "Yes" : value === "no" ? "No" : "Select..."}</span>
        </button>
      </div>
    );
  }

  /* Slider / Range — interactive preview */
  if (field.type === "slider" && field.sliderConfig) {
    const cfg = field.sliderConfig;
    const numVal = Number(value) || cfg.min;
    const pct = ((numVal - cfg.min) / (cfg.max - cfg.min)) * 100;
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className="px-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-on-surface-variant">{cfg.min}{cfg.unit}</span>
            {cfg.showValue !== false && <span className="text-lg font-bold" style={{ color: primaryColor }}>{numVal}{cfg.unit}</span>}
            <span className="text-xs text-on-surface-variant">{cfg.max}{cfg.unit}</span>
          </div>
          <div className="relative">
            <div className="h-2 rounded-full bg-surface-container-highest" />
            <div className="absolute top-0 left-0 h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: primaryColor }} />
            <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={numVal}
              onChange={(e) => setValue(e.target.value)}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: "8px" }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white shadow-md pointer-events-none"
              style={{ left: `calc(${pct}% - 10px)`, borderColor: primaryColor }} />
          </div>
        </div>
      </div>
    );
  }

  /* Social Media Handles — interactive preview */
  if (field.type === "social_handles" && field.socialHandlesConfig) {
    const allPlatforms = [
      { id: "instagram", label: "Instagram", icon: "fa-brands fa-instagram", prefix: "@" },
      { id: "facebook", label: "Facebook", icon: "fa-brands fa-facebook", prefix: "" },
      { id: "x", label: "X / Twitter", icon: "fa-brands fa-x-twitter", prefix: "@" },
      { id: "linkedin", label: "LinkedIn", icon: "fa-brands fa-linkedin", prefix: "" },
      { id: "tiktok", label: "TikTok", icon: "fa-brands fa-tiktok", prefix: "@" },
      { id: "youtube", label: "YouTube", icon: "fa-brands fa-youtube", prefix: "" },
      { id: "pinterest", label: "Pinterest", icon: "fa-brands fa-pinterest", prefix: "" },
      { id: "threads", label: "Threads", icon: "fa-brands fa-threads", prefix: "@" },
    ];
    const enabledPlatforms = allPlatforms.filter((p) => field.socialHandlesConfig!.platforms?.includes(p.id as never));
    return (
      <div>
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1.5 ml-1">
          {field.label}{field.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </label>
        {field.hint && <p className="text-xs text-on-surface-variant/60 mb-2 ml-1">{field.hint}</p>}
        <div className={field.socialHandlesConfig!.columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-2"}>
          {enabledPlatforms.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
                <i className={`${p.icon} text-lg`} style={{ color: primaryColor }} />
              </div>
              <div className="flex-1 relative">
                {p.prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant/40">{p.prefix}</span>}
                <input placeholder={p.label} className={INPUT_CLS} style={{ ...focusRing, paddingLeft: p.prefix ? "1.75rem" : undefined }} readOnly />
              </div>
            </div>
          ))}
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
