"use client";

import { useState, useCallback, useRef } from "react";
import type { FormSchema, StepDef, FieldDef, FieldType } from "@/lib/forms";
import { saveFormSchemaAction } from "./actions";

/* ------------------------------------------------------------------ */
/*  Field type catalogue (shown in the right panel palette)           */
/* ------------------------------------------------------------------ */

interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  group: "standard" | "advanced";
}

const FIELD_CATALOGUE: FieldTypeInfo[] = [
  { type: "text", label: "Single Line Text", icon: "Aa", group: "standard" },
  { type: "textarea", label: "Paragraph Text", icon: "¶", group: "standard" },
  { type: "email", label: "Email", icon: "@", group: "standard" },
  { type: "tel", label: "Phone", icon: "☎", group: "standard" },
  { type: "number", label: "Number", icon: "#", group: "standard" },
  { type: "select", label: "Dropdown", icon: "▾", group: "standard" },
  { type: "checkbox", label: "Checkbox", icon: "☑", group: "standard" },
  { type: "url", label: "URL", icon: "🔗", group: "advanced" },
  { type: "file", label: "File Upload", icon: "📎", group: "advanced" },
  { type: "files", label: "Multi-File Upload", icon: "📁", group: "advanced" },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeField(type: FieldType, label: string): FieldDef {
  const base: FieldDef = { id: `field_${uid()}`, type, label, required: false };
  if (type === "select") base.options = ["Option 1", "Option 2"];
  if (type === "textarea") base.rows = 4;
  return base;
}

function makeStep(): StepDef {
  return {
    id: `step_${uid()}`,
    title: "New Step",
    description: "",
    fields: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Main editor                                                        */
/* ------------------------------------------------------------------ */

export default function FormEditor({
  initialSchema,
}: {
  initialSchema: FormSchema;
}) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Selection state: which field is being edited in the right panel
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Which step is expanded in the left pane
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(schema.steps.map((s) => s.id)),
  );

  // Drag state for adding fields from palette
  const dragTypeRef = useRef<FieldType | null>(null);

  const updateSteps = useCallback((fn: (steps: StepDef[]) => StepDef[]) => {
    setSchema((prev) => ({ steps: fn([...prev.steps]) }));
    setMessage(null);
  }, []);

  // Resolve the selected field
  const selectedStep = schema.steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedField = selectedStep?.fields.find((f) => f.id === selectedFieldId) ?? null;

  function selectField(stepId: string, fieldId: string) {
    setSelectedStepId(stepId);
    setSelectedFieldId(fieldId);
  }

  function clearSelection() {
    setSelectedStepId(null);
    setSelectedFieldId(null);
  }

  // --- Step operations ---
  function addStep() {
    const s = makeStep();
    updateSteps((steps) => [...steps, s]);
    setExpandedSteps((prev) => new Set(prev).add(s.id));
  }

  function removeStep(stepId: string) {
    if (schema.steps.length <= 1) return;
    updateSteps((steps) => steps.filter((s) => s.id !== stepId));
    if (selectedStepId === stepId) clearSelection();
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

  function updateStepMeta(stepId: string, patch: Partial<StepDef>) {
    updateSteps((steps) =>
      steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)),
    );
  }

  function toggleStepExpanded(stepId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  }

  // --- Field operations ---
  function addFieldToStep(stepId: string, type: FieldType, label: string) {
    const field = makeField(type, label);
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId ? { ...s, fields: [...s.fields, field] } : s,
      ),
    );
    selectField(stepId, field.id);
  }

  function removeField(stepId: string, fieldId: string) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId
          ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
          : s,
      ),
    );
    if (selectedFieldId === fieldId) clearSelection();
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

  function updateField(stepId: string, fieldId: string, patch: Partial<FieldDef>) {
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

  // --- Drag/drop from palette ---
  function handleDragStart(type: FieldType) {
    dragTypeRef.current = type;
  }

  function handleDropOnStep(stepId: string) {
    const type = dragTypeRef.current;
    if (!type) return;
    const info = FIELD_CATALOGUE.find((c) => c.type === type);
    addFieldToStep(stepId, type, info?.label ?? "New field");
    dragTypeRef.current = null;
  }

  // --- Save ---
  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await saveFormSchemaAction(JSON.stringify(schema));
    setSaving(false);
    if (result.ok) {
      setMessage({ kind: "ok", text: "Form saved!" });
    } else {
      setMessage({ kind: "err", text: result.error ?? "Save failed." });
    }
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* ============================================================ */}
      {/* LEFT PANE — Form structure / preview                         */}
      {/* ============================================================ */}
      <div className="flex-1 space-y-4">
        {schema.steps.map((step, si) => {
          const isExpanded = expandedSteps.has(step.id);
          return (
            <div
              key={step.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add("ring-2", "ring-blue-300");
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove("ring-2", "ring-blue-300");
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("ring-2", "ring-blue-300");
                handleDropOnStep(step.id);
              }}
            >
              {/* Step header bar */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200">
                <button
                  onClick={() => toggleStepExpanded(step.id)}
                  className="text-slate-400 hover:text-slate-700 text-sm w-5"
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                    {si + 1}
                  </span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStepMeta(step.id, { title: e.target.value })}
                    className="text-sm font-semibold text-slate-900 bg-transparent border-none outline-none flex-1 min-w-0"
                    placeholder="Step title"
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {step.fields.length} field{step.fields.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    disabled={si === 0}
                    onClick={() => moveStep(step.id, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-sm"
                    title="Move step up"
                  >
                    ↑
                  </button>
                  <button
                    disabled={si === schema.steps.length - 1}
                    onClick={() => moveStep(step.id, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-sm"
                    title="Move step down"
                  >
                    ↓
                  </button>
                  <button
                    disabled={schema.steps.length <= 1}
                    onClick={() => removeStep(step.id)}
                    className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 text-sm ml-1"
                    title="Delete step"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Step body — field list */}
              {isExpanded && (
                <div className="p-3 space-y-1.5">
                  {step.description !== undefined && (
                    <input
                      value={step.description}
                      onChange={(e) =>
                        updateStepMeta(step.id, { description: e.target.value })
                      }
                      placeholder="Step description (optional)"
                      className="w-full text-xs text-slate-500 bg-transparent border-none outline-none mb-2 px-1"
                    />
                  )}

                  {step.fields.length === 0 && (
                    <div className="text-center py-8 text-sm text-slate-400">
                      Drag a field from the right panel, or click a field type to add it here.
                    </div>
                  )}

                  {step.fields.map((field, fi) => {
                    const isSelected =
                      selectedStepId === step.id && selectedFieldId === field.id;
                    return (
                      <div
                        key={field.id}
                        onClick={() => selectField(step.id, field.id)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                          isSelected
                            ? "bg-blue-50 border-2 border-blue-500 shadow-sm"
                            : "bg-white border border-slate-200 hover:border-slate-400 hover:shadow-sm"
                        }`}
                      >
                        {/* Field type icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                            isSelected
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {FIELD_CATALOGUE.find((c) => c.type === field.type)
                            ?.icon ?? "?"}
                        </div>

                        {/* Label + type */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {field.label}
                          </div>
                          <div className="text-xs text-slate-400">
                            {FIELD_CATALOGUE.find((c) => c.type === field.type)
                              ?.label ?? field.type}
                            {field.required && (
                              <span className="ml-1 text-amber-600 font-medium">
                                · Required
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reorder / delete */}
                        <div
                          className="flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            disabled={fi === 0}
                            onClick={() => moveField(step.id, field.id, -1)}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                          >
                            ↑
                          </button>
                          <button
                            disabled={fi === step.fields.length - 1}
                            onClick={() => moveField(step.id, field.id, 1)}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 text-xs"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeField(step.id, field.id)}
                            className="p-1 text-slate-400 hover:text-red-500 text-xs ml-0.5"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Bottom bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={addStep}
            className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:border-slate-400 hover:bg-slate-50"
          >
            + Add Step
          </button>

          <div className="flex items-center gap-3">
            {message && (
              <span
                className={
                  message.kind === "ok"
                    ? "text-sm text-emerald-600 font-medium"
                    : "text-sm text-red-600 font-medium"
                }
              >
                {message.text}
              </span>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Form"}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANE — Field palette or field settings                  */}
      {/* ============================================================ */}
      <div className="w-80 shrink-0">
        <div className="sticky top-8 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {selectedField && selectedStep ? (
            /* -------- Field settings panel -------- */
            <FieldSettingsPanel
              field={selectedField}
              onUpdate={(patch) =>
                updateField(selectedStepId!, selectedFieldId!, patch)
              }
              onClose={clearSelection}
            />
          ) : (
            /* -------- Add fields palette -------- */
            <FieldPalette
              onAdd={(type, label) => {
                // Add to first expanded step, or first step
                const targetStep =
                  schema.steps.find((s) => expandedSteps.has(s.id)) ??
                  schema.steps[0];
                if (targetStep) addFieldToStep(targetStep.id, type, label);
              }}
              onDragStart={handleDragStart}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Field palette (right pane, when nothing is selected)               */
/* ================================================================== */

function FieldPalette({
  onAdd,
  onDragStart,
}: {
  onAdd: (type: FieldType, label: string) => void;
  onDragStart: (type: FieldType) => void;
}) {
  const standardFields = FIELD_CATALOGUE.filter((f) => f.group === "standard");
  const advancedFields = FIELD_CATALOGUE.filter((f) => f.group === "advanced");

  return (
    <div>
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="text-sm font-semibold text-slate-900">Add Fields</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Click or drag onto a step
        </p>
      </div>

      <div className="p-3">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 px-1 mb-2">
          Standard Fields
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {standardFields.map((f) => (
            <button
              key={f.type}
              type="button"
              draggable
              onDragStart={() => onDragStart(f.type)}
              onClick={() => onAdd(f.type, f.label)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors text-left cursor-grab active:cursor-grabbing"
            >
              <span className="text-base w-6 text-center">{f.icon}</span>
              <span className="text-xs font-medium text-slate-700 leading-tight">
                {f.label}
              </span>
            </button>
          ))}
        </div>

        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 px-1 mb-2">
          Advanced Fields
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {advancedFields.map((f) => (
            <button
              key={f.type}
              type="button"
              draggable
              onDragStart={() => onDragStart(f.type)}
              onClick={() => onAdd(f.type, f.label)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors text-left cursor-grab active:cursor-grabbing"
            >
              <span className="text-base w-6 text-center">{f.icon}</span>
              <span className="text-xs font-medium text-slate-700 leading-tight">
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Field settings panel (right pane, when a field is selected)        */
/* ================================================================== */

function FieldSettingsPanel({
  field,
  onUpdate,
  onClose,
}: {
  field: FieldDef;
  onUpdate: (patch: Partial<FieldDef>) => void;
  onClose: () => void;
}) {
  const typeInfo = FIELD_CATALOGUE.find((c) => c.type === field.type);

  return (
    <div>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{typeInfo?.icon ?? "?"}</span>
          <h3 className="text-sm font-semibold text-slate-900">
            Field Settings
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-sm p-1"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* General section */}
        <section>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3">
            General
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Field Label
              </span>
              <input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Field Type
              </span>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({ type: e.target.value as FieldType })
                }
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 bg-white"
              >
                {FIELD_CATALOGUE.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Placeholder
              </span>
              <input
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  onUpdate({ placeholder: e.target.value || undefined })
                }
                placeholder="Placeholder text..."
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Hint / Help Text
              </span>
              <input
                value={field.hint ?? ""}
                onChange={(e) =>
                  onUpdate({ hint: e.target.value || undefined })
                }
                placeholder="Appears below the field"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </label>
          </div>
        </section>

        {/* Type-specific settings */}
        {field.type === "select" && (
          <section>
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3">
              Choices
            </div>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Options (one per line)
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
                rows={5}
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 font-mono"
              />
            </label>
          </section>
        )}

        {field.type === "textarea" && (
          <section>
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3">
              Appearance
            </div>
            <label className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Rows</span>
              <input
                type="number"
                min={2}
                max={20}
                value={field.rows ?? 4}
                onChange={(e) =>
                  onUpdate({ rows: Number(e.target.value) || 4 })
                }
                className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-lg outline-none"
              />
            </label>
          </section>
        )}

        {(field.type === "file" || field.type === "files") && (
          <section>
            <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3">
              File Settings
            </div>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                Allowed types
              </span>
              <input
                value={field.accept ?? ""}
                onChange={(e) =>
                  onUpdate({ accept: e.target.value || undefined })
                }
                placeholder="e.g. image/*,.pdf,.doc"
                className="mt-1 block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
            </label>
          </section>
        )}

        {/* Rules section */}
        <section>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mb-3">
            Rules
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onUpdate({ required: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Required</span>
          </label>
        </section>
      </div>
    </div>
  );
}
