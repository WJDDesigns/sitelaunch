"use client";

import { useState, useCallback } from "react";
import type { FormSchema, StepDef, FieldDef, FieldType } from "@/lib/forms";
import { saveFormSchemaAction } from "./actions";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file", label: "File upload" },
  { value: "files", label: "Multiple files" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function newField(): FieldDef {
  const id = `field_${uid()}`;
  return { id, type: "text", label: "New field", required: false };
}

function newStep(): StepDef {
  const id = `step_${uid()}`;
  return { id, title: "New step", description: "", fields: [newField()] };
}

export default function FormEditor({
  initialSchema,
}: {
  initialSchema: FormSchema;
}) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(
    schema.steps[0]?.id ?? null,
  );

  const updateSteps = useCallback(
    (fn: (steps: StepDef[]) => StepDef[]) => {
      setSchema((prev) => ({ steps: fn([...prev.steps]) }));
      setMessage(null);
    },
    [],
  );

  // --- Step operations ---
  function addStep() {
    const s = newStep();
    updateSteps((steps) => [...steps, s]);
    setExpandedStep(s.id);
  }

  function removeStep(stepId: string) {
    if (schema.steps.length <= 1) return;
    updateSteps((steps) => steps.filter((s) => s.id !== stepId));
    if (expandedStep === stepId) setExpandedStep(null);
  }

  function moveStep(stepId: string, dir: -1 | 1) {
    updateSteps((steps) => {
      const i = steps.findIndex((s) => s.id === stepId);
      if (i < 0) return steps;
      const j = i + dir;
      if (j < 0 || j >= steps.length) return steps;
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return steps;
    });
  }

  function updateStep(stepId: string, patch: Partial<StepDef>) {
    updateSteps((steps) =>
      steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    );
  }

  // --- Field operations ---
  function addField(stepId: string) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId ? { ...s, fields: [...s.fields, newField()] } : s,
      ),
    );
  }

  function removeField(stepId: string, fieldId: string) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s,
      ),
    );
  }

  function moveField(stepId: string, fieldId: string, dir: -1 | 1) {
    updateSteps((steps) =>
      steps.map((s) => {
        if (s.id !== stepId) return s;
        const fields = [...s.fields];
        const i = fields.findIndex((f) => f.id === fieldId);
        if (i < 0) return s;
        const j = i + dir;
        if (j < 0 || j >= fields.length) return s;
        [fields[i], fields[j]] = [fields[j], fields[i]];
        return { ...s, fields };
      }),
    );
  }

  function updateField(
    stepId: string,
    fieldId: string,
    patch: Partial<FieldDef>,
  ) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId
          ? {
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...patch } : f,
              ),
            }
          : s,
      ),
    );
  }

  // --- Save ---
  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await saveFormSchemaAction(JSON.stringify(schema));
    setSaving(false);
    if (result.ok) {
      setMessage({ kind: "ok", text: "Saved!" });
    } else {
      setMessage({ kind: "err", text: result.error ?? "Save failed." });
    }
  }

  return (
    <div className="space-y-4">
      {schema.steps.map((step, si) => {
        const isOpen = expandedStep === step.id;
        return (
          <div
            key={step.id}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
          >
            {/* Step header */}
            <div
              className="flex items-center gap-2 px-5 py-3 cursor-pointer hover:bg-slate-50"
              onClick={() => setExpandedStep(isOpen ? null : step.id)}
            >
              <span className="text-xs font-bold text-slate-400 w-6">
                {si + 1}
              </span>
              <span className="flex-1 text-sm font-semibold text-slate-900">
                {step.title || "Untitled step"}
              </span>
              <span className="text-xs text-slate-400">
                {step.fields.length} field{step.fields.length !== 1 && "s"}
              </span>
              <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  disabled={si === 0}
                  onClick={() => moveStep(step.id, -1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={si === schema.steps.length - 1}
                  onClick={() => moveStep(step.id, 1)}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={schema.steps.length <= 1}
                  onClick={() => removeStep(step.id)}
                  className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                  title="Remove step"
                >
                  ✕
                </button>
              </div>
              <span className="text-slate-400 text-xs ml-1">
                {isOpen ? "▾" : "▸"}
              </span>
            </div>

            {/* Step body */}
            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                {/* Step meta */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">
                      Step title
                    </span>
                    <input
                      value={step.title}
                      onChange={(e) =>
                        updateStep(step.id, { title: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-slate-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">
                      Description{" "}
                      <span className="text-slate-400">(optional)</span>
                    </span>
                    <input
                      value={step.description ?? ""}
                      onChange={(e) =>
                        updateStep(step.id, { description: e.target.value })
                      }
                      className="mt-1 block w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-slate-500"
                    />
                  </label>
                </div>

                {/* Fields */}
                <div className="space-y-2">
                  {step.fields.map((field, fi) => (
                    <FieldRow
                      key={field.id}
                      field={field}
                      index={fi}
                      total={step.fields.length}
                      onUpdate={(patch) =>
                        updateField(step.id, field.id, patch)
                      }
                      onMove={(dir) => moveField(step.id, field.id, dir)}
                      onRemove={() => removeField(step.id, field.id)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => addField(step.id)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  + Add field
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add step + save */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={addStep}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          + Add step
        </button>

        <div className="flex items-center gap-3">
          {message && (
            <span
              className={
                message.kind === "ok"
                  ? "text-xs text-emerald-700"
                  : "text-xs text-red-700"
              }
            >
              {message.text}
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save form"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Field editor row ---

function FieldRow({
  field,
  index,
  total,
  onUpdate,
  onMove,
  onRemove,
}: {
  field: FieldDef;
  index: number;
  total: number;
  onUpdate: (patch: Partial<FieldDef>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[10px] font-bold text-slate-400 w-5 text-center">
          {index + 1}
        </span>
        <span className="flex-1 text-xs font-medium text-slate-800 truncate">
          {field.label}
        </span>
        <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
          {field.type}
        </span>
        {field.required && (
          <span className="text-[10px] text-amber-600 font-medium">req</span>
        )}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-400 hover:text-slate-700 text-xs"
        >
          {expanded ? "▾" : "✎"}
        </button>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 text-red-400 hover:text-red-600 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-slate-200 px-3 py-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Label
              </span>
              <input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Type
              </span>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({ type: e.target.value as FieldType })
                }
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500 bg-white"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Placeholder
              </span>
              <input
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  onUpdate({ placeholder: e.target.value || undefined })
                }
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500"
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={!!field.required}
                onChange={(e) => onUpdate({ required: e.target.checked })}
                className="h-3.5 w-3.5"
              />
              Required
            </label>
            {field.type === "textarea" && (
              <label className="flex items-center gap-1.5 text-xs text-slate-700">
                Rows
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={field.rows ?? 4}
                  onChange={(e) =>
                    onUpdate({ rows: Number(e.target.value) || 4 })
                  }
                  className="w-14 px-1 py-0.5 text-xs border border-slate-300 rounded outline-none"
                />
              </label>
            )}
          </div>

          {field.type === "select" && (
            <label className="block">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Options{" "}
                <span className="normal-case text-slate-400">
                  (one per line)
                </span>
              </span>
              <textarea
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onUpdate({
                    options: e.target.value
                      .split("\n")
                      .filter((l) => l.trim()),
                  })
                }
                rows={4}
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500 font-mono"
              />
            </label>
          )}

          {(field.type === "file" || field.type === "files") && (
            <label className="block">
              <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                Accept{" "}
                <span className="normal-case text-slate-400">
                  (e.g. image/*,.pdf)
                </span>
              </span>
              <input
                value={field.accept ?? ""}
                onChange={(e) =>
                  onUpdate({ accept: e.target.value || undefined })
                }
                className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
              Hint text{" "}
              <span className="normal-case text-slate-400">(optional)</span>
            </span>
            <input
              value={field.hint ?? ""}
              onChange={(e) =>
                onUpdate({ hint: e.target.value || undefined })
              }
              className="mt-0.5 block w-full px-2 py-1 text-xs border border-slate-300 rounded outline-none focus:border-slate-500"
            />
          </label>
        </div>
      )}
    </div>
  );
}
