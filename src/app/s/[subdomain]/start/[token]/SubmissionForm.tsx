"use client";

import { useState, useTransition } from "react";
import type { FormSchema, FieldDef } from "@/lib/forms";

interface Props {
  schema: FormSchema;
  initialData: Record<string, unknown>;
  primaryColor: string;
  saveStep: (
    stepId: string,
    formData: FormData,
  ) => Promise<{ errors?: Record<string, string>; nextStepId?: string; done?: boolean }>;
  submit: () => Promise<void>;
}

const INPUT_CLS =
  "block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none";

export default function SubmissionForm({
  schema,
  initialData,
  primaryColor,
  saveStep,
  submit,
}: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [submitting, startSubmit] = useTransition();

  const step = schema.steps[stepIdx];
  const isLast = stepIdx === schema.steps.length - 1;

  function updateField(id: string, v: unknown) {
    setData((prev) => ({ ...prev, [id]: v }));
    if (errors[id]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function handleNext(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveStep(step.id, fd);
      if (res.errors) {
        setErrors(res.errors);
        return;
      }
      setErrors({});
      if (res.done) {
        startSubmit(async () => {
          await submit();
        });
      } else if (res.nextStepId) {
        const nextIdx = schema.steps.findIndex((s) => s.id === res.nextStepId);
        if (nextIdx >= 0) setStepIdx(nextIdx);
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>
            Step {stepIdx + 1} of {schema.steps.length}
          </span>
          <span>{Math.round(((stepIdx + 1) / schema.steps.length) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((stepIdx + 1) / schema.steps.length) * 100}%`,
              backgroundColor: primaryColor,
            }}
          />
        </div>
      </div>

      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{step.title}</h1>
        {step.description && (
          <p className="text-sm text-slate-600 mt-1">{step.description}</p>
        )}
      </header>

      <form onSubmit={handleNext} className="space-y-5">
        {step.fields.map((f) => (
          <FieldRenderer
            key={f.id}
            field={f}
            value={data[f.id]}
            error={errors[f.id]}
            onChange={(v) => updateField(f.id, v)}
          />
        ))}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            disabled={stepIdx === 0 || pending || submitting}
            className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={pending || submitting}
            className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting
              ? "Submitting…"
              : pending
                ? "Saving…"
                : isLast
                  ? "Submit"
                  : "Continue →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
  onChange: (v: unknown) => void;
}) {
  const str = (value as string) ?? "";
  const common = {
    id: field.id,
    name: field.id,
    required: field.required,
    placeholder: field.placeholder,
    className: `${INPUT_CLS} ${error ? "border-red-400" : ""}`,
  };
  return (
    <div>
      <label htmlFor={field.id} className="block text-sm font-medium text-slate-800 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          {...common}
          rows={field.rows ?? 3}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select {...common} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === "checkbox" ? (
        <div className="flex items-center gap-2">
          <input
            id={field.id}
            name={field.id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked ? "yes" : "")}
            className="h-4 w-4 rounded border-slate-300"
          />
        </div>
      ) : (
        <input
          {...common}
          type={
            field.type === "email"
              ? "email"
              : field.type === "tel"
                ? "tel"
                : field.type === "url"
                  ? "url"
                  : field.type === "number"
                    ? "number"
                    : "text"
          }
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
