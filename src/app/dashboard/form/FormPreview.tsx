"use client";

import { useState } from "react";
import type { FormSchema, FieldDef } from "@/lib/forms";

interface Props {
  schema: FormSchema;
  primaryColor: string;
}

const INPUT_CLS =
  "block w-full px-4 py-3 text-base bg-[#060e20] border-0 rounded-xl text-[#dae2fd] placeholder:text-[#c7c6cb]/40 focus:ring-1 outline-none transition-all duration-200";

export default function FormPreview({ schema, primaryColor }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = schema.steps[stepIdx];

  if (!step) {
    return (
      <div className="text-center py-12 text-on-surface-variant/60 text-sm">
        No steps to preview. Add some fields first.
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Fake header bar */}
      <div className="px-6 py-5 border-b border-on-surface/10 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <span className="text-on-primary font-bold text-xs">P</span>
          </div>
          <span className="text-sm font-bold text-on-surface font-headline">Preview Mode</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {schema.steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <button
                onClick={() => setStepIdx(i)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                  i === stepIdx
                    ? "text-on-primary shadow-lg"
                    : i < stepIdx
                      ? "text-on-primary opacity-70"
                      : "bg-surface-container-high text-on-surface-variant/40"
                }`}
                style={i <= stepIdx ? { backgroundColor: primaryColor } : undefined}
              >
                {i < stepIdx ? <i className="fa-solid fa-check text-[10px]" /> : i + 1}
              </button>
              {i < schema.steps.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full bg-surface-container-highest">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: i < stepIdx ? "100%" : "0%",
                      backgroundColor: primaryColor,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-6 pb-12 max-w-2xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-headline font-extrabold text-on-surface tracking-tight">
            {step.title}
          </h2>
          {step.description && (
            <p className="text-on-surface-variant mt-1 text-sm">{step.description}</p>
          )}
        </div>

        <div className="space-y-6">
          {step.fields.map((field, fi) => (
            <PreviewField key={field.id} field={field} primaryColor={primaryColor} delay={fi} />
          ))}

          {step.fields.length === 0 && (
            <div className="text-center py-8 text-sm text-on-surface-variant/40 border-2 border-dashed border-outline-variant/20 rounded-xl">
              This step has no fields yet.
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-10 pt-6 border-t border-on-surface/10">
          <button
            onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            disabled={stepIdx === 0}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-on-surface-variant rounded-xl hover:bg-surface-container-high disabled:opacity-30 transition-all"
          >
            <i className="fa-solid fa-chevron-left text-xs" /> Back
          </button>
          <span className="text-xs text-on-surface-variant/40">
            Step {stepIdx + 1} of {schema.steps.length}
          </span>
          <button
            onClick={() => setStepIdx(Math.min(schema.steps.length - 1, stepIdx + 1))}
            disabled={stepIdx === schema.steps.length - 1}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-on-primary rounded-xl disabled:opacity-30 transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            {stepIdx === schema.steps.length - 1 ? "Submit" : "Continue"} <i className="fa-solid fa-chevron-right text-xs" />
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field, primaryColor, delay }: { field: FieldDef; primaryColor: string; delay: number }) {
  if (field.type === "heading") {
    return (
      <div className="pt-2">
        <h3 className="text-lg font-headline font-bold text-on-surface">{field.label}</h3>
        {field.content && <p className="text-sm text-on-surface-variant mt-1">{field.content}</p>}
        {field.hint && <p className="text-xs text-on-surface-variant/60 mt-1">{field.hint}</p>}
      </div>
    );
  }

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
          placeholder={field.placeholder}
          disabled
          className={INPUT_CLS}
        />
      ) : field.type === "select" ? (
        <select disabled className={INPUT_CLS}>
          <option value="">Select...</option>
          {(field.options ?? []).map((o) => <option key={o}>{o}</option>)}
        </select>
      ) : field.type === "radio" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(field.options ?? []).map((o) => (
            <div key={o} className="px-4 py-3 rounded-xl border border-outline-variant/20 bg-[#060e20] text-sm text-[#dae2fd] cursor-default">
              {o}
            </div>
          ))}
        </div>
      ) : field.type === "checkbox" && field.options && field.options.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {field.options.map((o) => (
            <div key={o} className="px-4 py-3 rounded-xl border border-outline-variant/20 bg-[#060e20] text-sm text-[#dae2fd] cursor-default flex items-center gap-2">
              <div className="w-4 h-4 rounded border border-outline-variant/30" />
              {o}
            </div>
          ))}
        </div>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-outline-variant/20 bg-[#060e20]">
          <div className="w-4 h-4 rounded border border-outline-variant/30" />
          <span className="text-sm text-[#dae2fd]">{field.label}</span>
        </div>
      ) : field.type === "color" ? (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border border-outline-variant/20" style={{ backgroundColor: field.placeholder || "#c0c1ff" }} />
          <input disabled value={field.placeholder || "#c0c1ff"} className={`${INPUT_CLS} flex-1`} />
        </div>
      ) : field.type === "date" ? (
        <input type="date" disabled className={INPUT_CLS} style={{ colorScheme: "dark" }} />
      ) : field.type === "file" || field.type === "files" ? (
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 rounded-2xl border-2 border-dashed border-outline-variant/30 bg-[#060e20]/30 cursor-default">
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
          disabled
          className={INPUT_CLS}
        />
      )}
    </div>
  );
}
