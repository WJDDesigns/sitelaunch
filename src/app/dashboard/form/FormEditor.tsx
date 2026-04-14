"use client";

import { useState, useCallback, useRef } from "react";
import type { FormSchema, StepDef, FieldDef, FieldType, PackageConfig, PackageOption, PackageFeature, PackageRule } from "@/lib/forms";
import { saveFormSchemaAction } from "./actions";

/* ── Field type catalogue ──────────────────────────────────── */

interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  group: "standard" | "advanced";
}

const FIELD_CATALOGUE: FieldTypeInfo[] = [
  { type: "text", label: "Short Text", icon: "fa-font", group: "standard" },
  { type: "textarea", label: "Long Text", icon: "fa-align-left", group: "standard" },
  { type: "email", label: "Email", icon: "fa-envelope", group: "standard" },
  { type: "tel", label: "Phone", icon: "fa-phone", group: "standard" },
  { type: "number", label: "Number", icon: "fa-hashtag", group: "standard" },
  { type: "select", label: "Dropdown", icon: "fa-caret-down", group: "standard" },
  { type: "radio", label: "Radio Choice", icon: "fa-circle-dot", group: "standard" },
  { type: "checkbox", label: "Checkbox", icon: "fa-square-check", group: "standard" },
  { type: "date", label: "Date Picker", icon: "fa-calendar", group: "standard" },
  { type: "url", label: "URL", icon: "fa-link", group: "advanced" },
  { type: "color", label: "Color Picker", icon: "fa-palette", group: "advanced" },
  { type: "address", label: "Address", icon: "fa-location-dot", group: "advanced" },
  { type: "heading", label: "Section Heading", icon: "fa-heading", group: "advanced" },
  { type: "file", label: "File Upload", icon: "fa-paperclip", group: "advanced" },
  { type: "files", label: "Multi-File", icon: "fa-folder-open", group: "advanced" },
  { type: "package", label: "Package Selector", icon: "fa-box-open", group: "advanced" },
];

function iconFor(type: FieldType) {
  return FIELD_CATALOGUE.find((c) => c.type === type)?.icon ?? "fa-question";
}
function labelFor(type: FieldType) {
  return FIELD_CATALOGUE.find((c) => c.type === type)?.label ?? type;
}

/** Render a Font Awesome icon */
function FaIcon({ name, className }: { name: string; className?: string }) {
  return <i className={`fa-solid ${name} ${className ?? ""}`} />;
}

/* ── Helpers ───────────────────────────────────────────────── */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function makeField(type: FieldType, label: string): FieldDef {
  const base: FieldDef = { id: `field_${uid()}`, type, label, required: false };
  if (type === "select" || type === "radio") base.options = ["Option 1", "Option 2"];
  if (type === "checkbox") base.options = [];
  if (type === "textarea") base.rows = 4;
  if (type === "color") base.placeholder = "#c0c1ff";
  if (type === "heading") base.content = "";
  if (type === "package") {
    base.packageConfig = {
      packages: [
        { id: `pkg_${uid()}`, name: "Basic", price: 0, description: "Get started for free" },
        { id: `pkg_${uid()}`, name: "Pro", price: 149, description: "For growing businesses", badge: "Most Popular" },
        { id: `pkg_${uid()}`, name: "Enterprise", price: 399, description: "Full power, unlimited scale" },
      ],
      features: [
        { label: "Pages", values: {} },
        { label: "Custom Domain", values: {} },
      ],
      rules: [],
    };
    // Pre-fill feature values for the default packages
    const pkgs = base.packageConfig.packages;
    base.packageConfig.features[0].values = { [pkgs[0].id]: "Up to 5", [pkgs[1].id]: "Up to 20", [pkgs[2].id]: "Unlimited" };
    base.packageConfig.features[1].values = { [pkgs[0].id]: false, [pkgs[1].id]: true, [pkgs[2].id]: true };
  }
  return base;
}

function makeStep(): StepDef {
  return { id: `step_${uid()}`, title: "New Step", description: "", fields: [] };
}

/* ── Drag payload types ────────────────────────────────────── */

type DragPayload =
  | { kind: "palette"; fieldType: FieldType; label: string }
  | { kind: "field"; sourceStepId: string; fieldId: string };

/* ── Input classes ─────────────────────────────────────────── */

const INPUT_CLS =
  "block w-full px-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none transition-all";

/* ── Main editor ───────────────────────────────────────────── */

export default function FormEditor({ initialSchema, onOpenTemplates }: { initialSchema: FormSchema; onOpenTemplates?: () => void }) {
  const [schema, setSchema] = useState<FormSchema>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(schema.steps.map((s) => s.id)),
  );
  /* Mobile panel toggle: "palette" | "canvas" | "settings" */
  const [mobilePanel, setMobilePanel] = useState<"palette" | "canvas" | "settings">("canvas");

  const dragPayload = useRef<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{ stepId: string; index: number } | null>(null);

  const updateSteps = useCallback((fn: (steps: StepDef[]) => StepDef[]) => {
    setSchema((prev) => ({ steps: fn([...prev.steps]) }));
    setMessage(null);
  }, []);

  const selectedStep = schema.steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedField = selectedStep?.fields.find((f) => f.id === selectedFieldId) ?? null;

  function selectField(stepId: string, fieldId: string) {
    setSelectedStepId(stepId);
    setSelectedFieldId(fieldId);
    setMobilePanel("settings");
  }
  function clearSelection() {
    setSelectedStepId(null);
    setSelectedFieldId(null);
    setMobilePanel("canvas");
  }

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
      const j = i + dir;
      if (i < 0 || j < 0 || j >= steps.length) return steps;
      [steps[i], steps[j]] = [steps[j], steps[i]];
      return steps;
    });
  }
  function updateStepMeta(stepId: string, patch: Partial<StepDef>) {
    updateSteps((steps) => steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  }
  function toggleStep(stepId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      next.has(stepId) ? next.delete(stepId) : next.add(stepId);
      return next;
    });
  }

  function insertField(stepId: string, index: number, field: FieldDef) {
    updateSteps((steps) =>
      steps.map((s) => {
        if (s.id !== stepId) return s;
        const fields = [...s.fields];
        fields.splice(index, 0, field);
        return { ...s, fields };
      }),
    );
  }
  function removeField(stepId: string, fieldId: string) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId ? { ...s, fields: s.fields.filter((f) => f.id !== fieldId) } : s,
      ),
    );
    if (selectedFieldId === fieldId) clearSelection();
  }
  function updateField(stepId: string, fieldId: string, patch: Partial<FieldDef>) {
    updateSteps((steps) =>
      steps.map((s) =>
        s.id === stepId
          ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) }
          : s,
      ),
    );
  }

  /* ── Drag handlers ─────────────────────────────────────── */
  function startDragPalette(type: FieldType, label: string) {
    dragPayload.current = { kind: "palette", fieldType: type, label };
  }
  function startDragField(stepId: string, fieldId: string) {
    dragPayload.current = { kind: "field", sourceStepId: stepId, fieldId };
  }
  function handleDragOverField(e: React.DragEvent, stepId: string, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ stepId, index });
  }
  function handleDragOverStep(e: React.DragEvent, stepId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const step = schema.steps.find((s) => s.id === stepId);
    setDropTarget({ stepId, index: step?.fields.length ?? 0 });
  }
  function handleDragEnd() {
    dragPayload.current = null;
    setDropTarget(null);
  }
  function handleDrop(e: React.DragEvent, stepId: string, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragPayload.current;
    if (!payload) return;

    if (payload.kind === "palette") {
      const field = makeField(payload.fieldType, payload.label);
      insertField(stepId, index, field);
      selectField(stepId, field.id);
    } else {
      const sourceStep = schema.steps.find((s) => s.id === payload.sourceStepId);
      const field = sourceStep?.fields.find((f) => f.id === payload.fieldId);
      if (!field) return;

      let adjustedIndex = index;
      if (payload.sourceStepId === stepId) {
        const oldIndex = sourceStep!.fields.findIndex((f) => f.id === payload.fieldId);
        if (oldIndex < index) adjustedIndex--;
      }

      setSchema((prev) => {
        const steps = prev.steps.map((s) => {
          if (s.id === payload.sourceStepId) {
            return { ...s, fields: s.fields.filter((f) => f.id !== payload.fieldId) };
          }
          return s;
        }).map((s) => {
          if (s.id === stepId) {
            const fields = [...s.fields];
            const insertAt = payload.sourceStepId === stepId
              ? Math.min(adjustedIndex, fields.length)
              : Math.min(index, fields.length);
            fields.splice(insertAt, 0, field);
            return { ...s, fields };
          }
          return s;
        });
        return { steps };
      });
      selectField(stepId, field.id);
    }

    dragPayload.current = null;
    setDropTarget(null);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await saveFormSchemaAction(JSON.stringify(schema));
    setSaving(false);
    setMessage(result.ok ? { kind: "ok", text: "Form saved!" } : { kind: "err", text: result.error ?? "Save failed." });
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Top bar with title + save ──────────────────────── */}
      <div className="shrink-0 px-6 py-4 border-b border-outline-variant/10 bg-surface-container-low/50 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-headline font-bold tracking-tight text-on-surface truncate">Form editor</h1>
          <p className="text-xs text-on-surface-variant hidden sm:block">Customize the onboarding form your clients fill out.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {message && (
            <span className={`text-xs font-medium hidden sm:block ${message.kind === "ok" ? "text-tertiary" : "text-error"}`}>
              {message.text}
            </span>
          )}
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/20 rounded-lg hover:text-primary hover:border-primary/30 transition-all whitespace-nowrap hidden sm:block"
            >
              Templates
            </button>
          )}
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] disabled:opacity-60 transition-all whitespace-nowrap"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
        </div>
      </div>

      {/* ── Mobile panel switcher (visible < lg) ──────────── */}
      <div className="lg:hidden shrink-0 flex border-b border-outline-variant/10 bg-surface-container-low/30">
        {(["palette", "canvas", "settings"] as const).map((panel) => (
          <button
            key={panel}
            onClick={() => setMobilePanel(panel)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors ${
              mobilePanel === panel
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant/60 hover:text-on-surface-variant"
            }`}
          >
            {panel === "palette" ? "Fields" : panel === "canvas" ? "Canvas" : "Settings"}
          </button>
        ))}
      </div>

      {/* ── Three-pane layout ──────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT: Field Library */}
        <div className={`
          w-full lg:w-64 xl:w-72 shrink-0 bg-surface-container-low/50 overflow-y-auto border-r border-outline-variant/10
          ${mobilePanel === "palette" ? "block" : "hidden"} lg:block
        `}>
          <div className="p-5">
            <FieldPalette onDragStart={startDragPalette} onClickAdd={(type, label) => {
              const target = schema.steps.find((s) => expandedSteps.has(s.id)) ?? schema.steps[0];
              if (!target) return;
              const field = makeField(type, label);
              insertField(target.id, target.fields.length, field);
              selectField(target.id, field.id);
            }} />
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className={`
          flex-1 min-w-0 bg-surface overflow-y-auto
          ${mobilePanel === "canvas" ? "block" : "hidden"} lg:block
        `}>
          <div className="p-6 md:p-8 lg:p-10 flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-6">
              {schema.steps.map((step, si) => {
                const isExpanded = expandedSteps.has(step.id);
                return (
                  <div key={step.id} className="relative flex flex-col items-center">
                    <div className="w-full bg-surface-container border border-outline-variant/15 rounded-2xl shadow-lg shadow-black/10 overflow-hidden">
                      {/* Step header */}
                      <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4">
                        <button onClick={() => toggleStep(step.id)} className="text-on-surface-variant hover:text-on-surface text-sm w-5 shrink-0">
                          <i className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"} text-[10px]`} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-on-primary font-bold shrink-0">
                          {si + 1}
                        </div>
                        <input
                          value={step.title}
                          onChange={(e) => updateStepMeta(step.id, { title: e.target.value })}
                          className="text-sm font-bold text-on-surface bg-transparent border-none outline-none flex-1 min-w-0"
                          placeholder="Step title"
                        />
                        <span className="text-xs text-on-surface-variant/60 whitespace-nowrap shrink-0 hidden sm:inline">
                          {step.fields.length} field{step.fields.length !== 1 ? "s" : ""}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button disabled={si === 0} onClick={() => moveStep(step.id, -1)} className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30"><i className="fa-solid fa-arrow-up text-xs" /></button>
                          <button disabled={si === schema.steps.length - 1} onClick={() => moveStep(step.id, 1)} className="p-1 text-on-surface-variant hover:text-on-surface disabled:opacity-30"><i className="fa-solid fa-arrow-down text-xs" /></button>
                          <button disabled={schema.steps.length <= 1} onClick={() => removeStep(step.id)} className="p-1 text-on-surface-variant hover:text-error disabled:opacity-30 ml-0.5"><i className="fa-solid fa-xmark text-xs" /></button>
                        </div>
                      </div>

                      {/* Step body */}
                      {isExpanded && (
                        <div
                          className="px-4 sm:px-6 pb-5 space-y-2"
                          onDragOver={(e) => handleDragOverStep(e, step.id)}
                          onDrop={(e) => handleDrop(e, step.id, step.fields.length)}
                        >
                          <input
                            value={step.description ?? ""}
                            onChange={(e) => updateStepMeta(step.id, { description: e.target.value })}
                            placeholder="Step description (optional)"
                            className="w-full text-xs text-on-surface-variant bg-transparent border-none outline-none mb-2"
                          />

                          {step.fields.length === 0 && !dropTarget && (
                            <div className="text-center py-8 text-sm text-on-surface-variant border-2 border-dashed border-outline-variant/20 rounded-xl">
                              Drag a field here or click one from the panel
                            </div>
                          )}

                          {step.fields.map((field, fi) => {
                            const isSelected = selectedStepId === step.id && selectedFieldId === field.id;
                            const isDropBefore = dropTarget?.stepId === step.id && dropTarget?.index === fi;

                            return (
                              <div key={field.id}>
                                {isDropBefore && (
                                  <div className="h-0.5 bg-primary rounded-full mx-2 my-1" />
                                )}
                                <div
                                  draggable
                                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; startDragField(step.id, field.id); }}
                                  onDragOver={(e) => handleDragOverField(e, step.id, fi)}
                                  onDrop={(e) => handleDrop(e, step.id, fi)}
                                  onDragEnd={handleDragEnd}
                                  onClick={() => selectField(step.id, field.id)}
                                  className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
                                    isSelected
                                      ? "bg-primary/10 border border-primary/40"
                                      : "bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high"
                                  }`}
                                >
                                  <div className="text-on-surface-variant/40 hover:text-on-surface-variant cursor-grab select-none shrink-0"><i className="fa-solid fa-grip-vertical text-[10px]" /></div>
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                                    isSelected ? "bg-primary/20 text-primary" : "bg-surface-container-highest text-primary"
                                  }`}>
                                    <FaIcon name={iconFor(field.type)} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-on-surface truncate">{field.label}</div>
                                    <div className="text-xs text-on-surface-variant/60 truncate">
                                      {labelFor(field.type)}
                                      {field.required && <span className="ml-1 text-tertiary font-medium">&middot; Required</span>}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeField(step.id, field.id); }}
                                    className="p-1 text-on-surface-variant/40 hover:text-error text-sm transition-colors shrink-0"
                                  >
                                    <i className="fa-solid fa-xmark text-xs" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {dropTarget?.stepId === step.id && dropTarget?.index === step.fields.length && step.fields.length > 0 && (
                            <div className="h-0.5 bg-primary rounded-full mx-2 my-1" />
                          )}
                        </div>
                      )}
                    </div>
                    {/* Connector line */}
                    {si < schema.steps.length - 1 && (
                      <div className="h-6 w-0.5 bg-gradient-to-b from-primary/60 to-transparent" />
                    )}
                  </div>
                );
              })}

              {/* Add step */}
              <button
                onClick={addStep}
                className="w-full h-16 border-2 border-dashed border-outline-variant/20 rounded-2xl flex items-center justify-center gap-2 group hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                  <i className="fa-solid fa-plus text-sm" />
                </div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Add Step</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Settings / Field Inspector */}
        <div className={`
          w-full lg:w-72 xl:w-80 shrink-0 bg-surface-container-low/50 overflow-y-auto border-l border-outline-variant/10
          ${mobilePanel === "settings" ? "block" : "hidden"} lg:block
        `}>
          <div className="p-5">
            {selectedField && selectedStep ? (
              <FieldSettingsPanel
                field={selectedField}
                onUpdate={(patch) => updateField(selectedStepId!, selectedFieldId!, patch)}
                onClose={clearSelection}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Quick Info</div>
                <div className="glass-panel rounded-xl p-4 border border-outline-variant/10">
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Click a field on the canvas to edit its settings here. Drag fields from the left panel to add them to steps.
                  </p>
                </div>
                <div className="glass-panel rounded-xl p-4 border border-outline-variant/10 space-y-2">
                  <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Summary</div>
                  <div className="text-sm text-on-surface">
                    {schema.steps.length} step{schema.steps.length !== 1 ? "s" : ""} &middot;{" "}
                    {schema.steps.reduce((n, s) => n + s.fields.length, 0)} total fields
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Field palette ─────────────────────────────────────────── */

function FieldPalette({ onDragStart, onClickAdd }: {
  onDragStart: (type: FieldType, label: string) => void;
  onClickAdd: (type: FieldType, label: string) => void;
}) {
  const standard = FIELD_CATALOGUE.filter((f) => f.group === "standard");
  const advanced = FIELD_CATALOGUE.filter((f) => f.group === "advanced");

  return (
    <div>
      <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Field Types</h3>
      <div className="space-y-2">
        {standard.map((f) => (
          <button
            key={f.type}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(f.type, f.label); }}
            onClick={() => onClickAdd(f.type, f.label)}
            className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant/10 cursor-grab hover:border-primary/40 hover:bg-surface-container-high transition-all flex items-center gap-3 group"
          >
            <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors text-sm shrink-0">
              <FaIcon name={f.icon} />
            </div>
            <span className="text-sm font-medium text-on-surface truncate">{f.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 mb-3">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Advanced</h3>
      </div>
      <div className="space-y-2">
        {advanced.map((f) => (
          <button
            key={f.type}
            draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(f.type, f.label); }}
            onClick={() => onClickAdd(f.type, f.label)}
            className="w-full p-2.5 bg-surface-container rounded-xl border border-outline-variant/10 cursor-grab hover:border-primary/40 hover:bg-surface-container-high transition-all flex items-center gap-3 group"
          >
            <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors text-sm shrink-0">
              <FaIcon name={f.icon} />
            </div>
            <span className="text-sm font-medium text-on-surface truncate">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Field settings panel ──────────────────────────────────── */

function FieldSettingsPanel({ field, onUpdate, onClose }: {
  field: FieldDef;
  onUpdate: (patch: Partial<FieldDef>) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FaIcon name={iconFor(field.type)} className="text-primary text-lg" />
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex-1">Field Settings</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 transition-colors"><i className="fa-solid fa-xmark text-xs" /></button>
      </div>
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Labels &amp; Content</div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Field Label</span>
              <input value={field.label} onChange={(e) => onUpdate({ label: e.target.value })} className={INPUT_CLS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Field Type</span>
              <select value={field.type} onChange={(e) => onUpdate({ type: e.target.value as FieldType })} className={INPUT_CLS}>
                {FIELD_CATALOGUE.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Helper Text</span>
              <textarea value={field.hint ?? ""} onChange={(e) => onUpdate({ hint: e.target.value || undefined })} placeholder="Appears below the field" rows={2} className={INPUT_CLS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Placeholder</span>
              <input value={field.placeholder ?? ""} onChange={(e) => onUpdate({ placeholder: e.target.value || undefined })} placeholder="Placeholder text..." className={INPUT_CLS} />
            </label>
          </div>
        </section>

        {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {field.type === "checkbox" ? "Checkbox Options" : "Choices"}
            </div>
            <textarea value={(field.options ?? []).join("\n")} onChange={(e) => onUpdate({ options: e.target.value.split("\n").filter((l) => l.trim()) })} rows={5} placeholder="One option per line" className={`${INPUT_CLS} font-mono`} />
            {field.type === "checkbox" && (
              <label className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-on-surface-variant">Max selections</span>
                <input type="number" min={0} max={50} value={field.maxSelections ?? 0} onChange={(e) => onUpdate({ maxSelections: Number(e.target.value) || 0 })} placeholder="0 = unlimited" className="w-20 px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none" />
              </label>
            )}
          </section>
        )}

        {field.type === "heading" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Heading Content</div>
            <textarea value={field.content ?? ""} onChange={(e) => onUpdate({ content: e.target.value || undefined })} placeholder="Additional description text shown below the heading..." rows={4} className={INPUT_CLS} />
          </section>
        )}

        {field.type === "textarea" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Appearance</div>
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-on-surface-variant">Rows</span>
              <input type="number" min={2} max={20} value={field.rows ?? 4} onChange={(e) => onUpdate({ rows: Number(e.target.value) || 4 })} className="w-16 px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none" />
            </label>
          </section>
        )}

        {(field.type === "file" || field.type === "files") && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">File Settings</div>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Allowed types</span>
              <input value={field.accept ?? ""} onChange={(e) => onUpdate({ accept: e.target.value || undefined })} placeholder="e.g. image/*,.pdf,.doc" className={INPUT_CLS} />
            </label>
          </section>
        )}

        {field.type === "package" && field.packageConfig && (
          <PackageSettingsPanel config={field.packageConfig} onUpdate={(cfg) => onUpdate({ packageConfig: cfg })} />
        )}

        <section className="space-y-3">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Logic &amp; Rules</div>
          <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
            <span className="text-xs font-medium text-on-surface">Required Field</span>
            <label className="relative cursor-pointer">
              <input type="checkbox" checked={!!field.required} onChange={(e) => onUpdate({ required: e.target.checked })} className="sr-only peer" />
              <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
            </label>
          </div>
        </section>

        <div className="pt-4">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 py-3 bg-error-container/20 text-error rounded-xl font-bold text-xs uppercase tracking-widest border border-error/20 hover:bg-error-container/40 transition-all"
          >
            Delete Component
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Package settings panel (inside field inspector) ──────── */

function PackageSettingsPanel({ config, onUpdate }: {
  config: PackageConfig;
  onUpdate: (cfg: PackageConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<"packages" | "features" | "rules">("packages");

  function updatePackage(pkgId: string, patch: Partial<PackageOption>) {
    onUpdate({
      ...config,
      packages: config.packages.map((p) => (p.id === pkgId ? { ...p, ...patch } : p)),
    });
  }

  function addPackage() {
    const newPkg: PackageOption = { id: `pkg_${uid()}`, name: "New Package", price: 0, description: "" };
    onUpdate({ ...config, packages: [...config.packages, newPkg] });
  }

  function removePackage(pkgId: string) {
    if (config.packages.length <= 1) return;
    const packages = config.packages.filter((p) => p.id !== pkgId);
    // Clean up feature values and rules referencing this package
    const features = config.features.map((f) => {
      const values = { ...f.values };
      delete values[pkgId];
      return { ...f, values };
    });
    const rules = config.rules.filter((r) => r.recommendedPackageId !== pkgId);
    onUpdate({ ...config, packages, features, rules });
  }

  function addFeature() {
    const newFeature: PackageFeature = {
      label: "New Feature",
      values: Object.fromEntries(config.packages.map((p) => [p.id, false])),
    };
    onUpdate({ ...config, features: [...config.features, newFeature] });
  }

  function removeFeature(idx: number) {
    onUpdate({ ...config, features: config.features.filter((_, i) => i !== idx) });
  }

  function updateFeatureLabel(idx: number, label: string) {
    onUpdate({
      ...config,
      features: config.features.map((f, i) => (i === idx ? { ...f, label } : f)),
    });
  }

  function updateFeatureValue(featureIdx: number, pkgId: string, value: boolean | string) {
    onUpdate({
      ...config,
      features: config.features.map((f, i) => {
        if (i !== featureIdx) return f;
        return { ...f, values: { ...f.values, [pkgId]: value } };
      }),
    });
  }

  function addRule() {
    const newRule: PackageRule = {
      fieldId: "",
      operator: "equals",
      value: "",
      recommendedPackageId: config.packages[0]?.id ?? "",
    };
    onUpdate({ ...config, rules: [...config.rules, newRule] });
  }

  function removeRule(idx: number) {
    onUpdate({ ...config, rules: config.rules.filter((_, i) => i !== idx) });
  }

  function updateRule(idx: number, patch: Partial<PackageRule>) {
    onUpdate({
      ...config,
      rules: config.rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
    });
  }

  const tabs = [
    { key: "packages" as const, label: "Packages", icon: "fa-box-open" },
    { key: "features" as const, label: "Features", icon: "fa-list-check" },
    { key: "rules" as const, label: "Rules", icon: "fa-wand-magic-sparkles" },
  ];

  return (
    <section className="space-y-3">
      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Package Configuration</div>

      {/* Tabs */}
      <div className="flex bg-surface-container rounded-lg p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
              activeTab === t.key
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant/50 hover:text-on-surface-variant"
            }`}
          >
            <i className={`fa-solid ${t.icon} text-[9px]`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Packages tab */}
      {activeTab === "packages" && (
        <div className="space-y-3">
          {config.packages.map((pkg) => (
            <div key={pkg.id} className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/10">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={pkg.name}
                  onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                  className={`${INPUT_CLS} text-xs font-bold`}
                  placeholder="Package name"
                />
                <button
                  onClick={() => removePackage(pkg.id)}
                  disabled={config.packages.length <= 1}
                  className="p-1 text-on-surface-variant/40 hover:text-error disabled:opacity-30 shrink-0"
                >
                  <i className="fa-solid fa-trash text-[10px]" />
                </button>
              </div>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="text-[10px] text-on-surface-variant mb-0.5 block">Price/mo ($)</span>
                  <input
                    type="number"
                    min={0}
                    value={pkg.price}
                    onChange={(e) => updatePackage(pkg.id, { price: Number(e.target.value) || 0 })}
                    className={`${INPUT_CLS} text-xs`}
                  />
                </label>
                <label className="flex-1">
                  <span className="text-[10px] text-on-surface-variant mb-0.5 block">Badge</span>
                  <input
                    value={pkg.badge ?? ""}
                    onChange={(e) => updatePackage(pkg.id, { badge: e.target.value || undefined })}
                    placeholder="e.g. Popular"
                    className={`${INPUT_CLS} text-xs`}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] text-on-surface-variant mb-0.5 block">Description</span>
                <input
                  value={pkg.description ?? ""}
                  onChange={(e) => updatePackage(pkg.id, { description: e.target.value || undefined })}
                  placeholder="Short tagline..."
                  className={`${INPUT_CLS} text-xs`}
                />
              </label>
            </div>
          ))}
          <button
            onClick={addPackage}
            className="w-full py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Package
          </button>
        </div>
      )}

      {/* Features tab */}
      {activeTab === "features" && (
        <div className="space-y-3">
          <p className="text-[10px] text-on-surface-variant/60">Define features that differ across packages. Use text for custom values or toggle for checkmarks.</p>
          {config.features.map((feature, fi) => (
            <div key={fi} className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/10">
              <div className="flex items-center gap-2">
                <input
                  value={feature.label}
                  onChange={(e) => updateFeatureLabel(fi, e.target.value)}
                  className={`${INPUT_CLS} text-xs font-bold flex-1`}
                  placeholder="Feature name"
                />
                <button onClick={() => removeFeature(fi)} className="p-1 text-on-surface-variant/40 hover:text-error shrink-0">
                  <i className="fa-solid fa-trash text-[10px]" />
                </button>
              </div>
              {config.packages.map((pkg) => {
                const val = feature.values[pkg.id];
                const isText = typeof val === "string";
                return (
                  <div key={pkg.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-on-surface-variant/60 w-16 truncate shrink-0">{pkg.name}</span>
                    <select
                      value={isText ? "text" : val ? "yes" : "no"}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "text") updateFeatureValue(fi, pkg.id, "");
                        else updateFeatureValue(fi, pkg.id, v === "yes");
                      }}
                      className="text-[10px] bg-surface-container-highest/50 border-0 rounded px-1.5 py-1 text-on-surface outline-none"
                    >
                      <option value="yes">✓ Yes</option>
                      <option value="no">✗ No</option>
                      <option value="text">Custom</option>
                    </select>
                    {isText && (
                      <input
                        value={val}
                        onChange={(e) => updateFeatureValue(fi, pkg.id, e.target.value)}
                        placeholder="e.g. Up to 10"
                        className="flex-1 text-[10px] bg-surface-container-highest/50 border-0 rounded px-2 py-1 text-on-surface outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          <button
            onClick={addFeature}
            className="w-full py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Feature
          </button>
        </div>
      )}

      {/* Rules tab */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          <p className="text-[10px] text-on-surface-variant/60">
            Recommend a package based on answers from previous steps. Rules are evaluated top to bottom — first match wins.
          </p>

          <label className="block">
            <span className="text-[10px] text-on-surface-variant mb-0.5 block">Default recommendation (if no rules match)</span>
            <select
              value={config.defaultPackageId ?? ""}
              onChange={(e) => onUpdate({ ...config, defaultPackageId: e.target.value || undefined })}
              className={`${INPUT_CLS} text-xs`}
            >
              <option value="">None</option>
              {config.packages.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>

          {config.rules.map((rule, ri) => (
            <div key={ri} className="bg-surface-container rounded-xl p-3 space-y-2 border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Rule {ri + 1}</span>
                <button onClick={() => removeRule(ri)} className="p-1 text-on-surface-variant/40 hover:text-error">
                  <i className="fa-solid fa-trash text-[10px]" />
                </button>
              </div>
              <label className="block">
                <span className="text-[10px] text-on-surface-variant mb-0.5 block">Field ID to check</span>
                <input
                  value={rule.fieldId}
                  onChange={(e) => updateRule(ri, { fieldId: e.target.value })}
                  placeholder="e.g. field_abc123"
                  className={`${INPUT_CLS} text-xs font-mono`}
                />
              </label>
              <div className="flex gap-2">
                <label className="flex-1">
                  <span className="text-[10px] text-on-surface-variant mb-0.5 block">Operator</span>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(ri, { operator: e.target.value as PackageRule["operator"] })}
                    className={`${INPUT_CLS} text-xs`}
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                  </select>
                </label>
                <label className="flex-1">
                  <span className="text-[10px] text-on-surface-variant mb-0.5 block">Value</span>
                  <input
                    value={rule.value}
                    onChange={(e) => updateRule(ri, { value: e.target.value })}
                    className={`${INPUT_CLS} text-xs`}
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-[10px] text-on-surface-variant mb-0.5 block">Recommend package</span>
                <select
                  value={rule.recommendedPackageId}
                  onChange={(e) => updateRule(ri, { recommendedPackageId: e.target.value })}
                  className={`${INPUT_CLS} text-xs`}
                >
                  {config.packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          <button
            onClick={addRule}
            className="w-full py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Rule
          </button>
        </div>
      )}
    </section>
  );
}
