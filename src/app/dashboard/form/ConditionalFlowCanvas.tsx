"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { FormSchema, StepDef, FieldDef, ShowCondition } from "@/lib/forms";

/* ── Constants ───────────────────────────────────────────── */

const OPERATOR_LABELS: Record<string, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "∋",
  not_empty: "≠ ∅",
  is_empty: "= ∅",
  greater_than: ">",
  less_than: "<",
};

const OPERATOR_FULL: Record<string, string> = {
  equals: "Equals",
  not_equals: "Does not equal",
  contains: "Contains",
  not_empty: "Is not empty",
  is_empty: "Is empty",
  greater_than: "Greater than",
  less_than: "Less than",
};

const SOURCE_PALETTE = [
  "#696cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#4ade80",
];

/* ── Types ───────────────────────────────────────────────── */

interface BlockNode {
  id: string;
  kind: "source" | "target";
  label: string;
  fieldType?: string;
  stepIdx: number;
  stepTitle?: string;
  targetType?: "field" | "step";
  condition?: ShowCondition;
}

interface Wire {
  sourceId: string;
  targetId: string;
  targetType: "field" | "step";
  operator: string;
  value?: string;
}

/* ── Main Component ──────────────────────────────────────── */

export default function ConditionalFlowCanvas({
  schema,
  onChange,
}: {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
}) {
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Build source blocks (fields that can trigger conditions)
  const { sourceBlocks, targetBlocks, wires, sourceFields, allFields } = useMemo(() => {
    const sources: BlockNode[] = [];
    const targets: BlockNode[] = [];
    const wires: Wire[] = [];
    const sourceFields: FieldDef[] = [];
    const allFields: (FieldDef & { stepIdx: number })[] = [];
    const seenSourceIds = new Set<string>();

    schema.steps.forEach((step, si) => {
      // Step-level condition
      if (step.showCondition?.fieldId) {
        if (!seenSourceIds.has(step.showCondition.fieldId)) seenSourceIds.add(step.showCondition.fieldId);
        targets.push({
          id: `step_${step.id}`,
          kind: "target",
          label: step.title,
          stepIdx: si,
          targetType: "step",
          condition: step.showCondition,
        });
        wires.push({
          sourceId: step.showCondition.fieldId,
          targetId: `step_${step.id}`,
          targetType: "step",
          operator: step.showCondition.operator,
          value: step.showCondition.value,
        });
      }

      step.fields.forEach((field) => {
        allFields.push({ ...field, stepIdx: si });
        if (field.type !== "heading" && field.type !== "file" && field.type !== "files") {
          sourceFields.push(field);
        }
        if (field.showCondition?.fieldId) {
          if (!seenSourceIds.has(field.showCondition.fieldId)) seenSourceIds.add(field.showCondition.fieldId);
          targets.push({
            id: field.id,
            kind: "target",
            label: field.label,
            fieldType: field.type,
            stepIdx: si,
            targetType: "field",
            condition: field.showCondition,
          });
          wires.push({
            sourceId: field.showCondition.fieldId,
            targetId: field.id,
            targetType: "field",
            operator: field.showCondition.operator,
            value: field.showCondition.value,
          });
        }
      });
    });

    // Build source blocks from fields that are referenced
    const activeSourceIds = [...seenSourceIds];
    activeSourceIds.forEach((id) => {
      const f = allFields.find((af) => af.id === id);
      if (f) {
        sources.push({
          id: f.id,
          kind: "source",
          label: f.label,
          fieldType: f.type,
          stepIdx: f.stepIdx,
        });
      }
    });

    return { sourceBlocks: sources, targetBlocks: targets, wires, sourceFields, allFields };
  }, [schema]);

  const fieldById = useCallback(
    (id: string) => allFields.find((f) => f.id === id),
    [allFields],
  );

  // Color map for sources
  const sourceColors = useMemo(() => {
    const map: Record<string, string> = {};
    sourceBlocks.forEach((s, i) => {
      map[s.id] = SOURCE_PALETTE[i % SOURCE_PALETTE.length];
    });
    return map;
  }, [sourceBlocks]);

  // Group wires by source
  const wiresBySource = useMemo(() => {
    const map: Record<string, Wire[]> = {};
    wires.forEach((w) => {
      (map[w.sourceId] ||= []).push(w);
    });
    return map;
  }, [wires]);

  // Available targets (no condition yet)
  const availableTargets = useMemo(() => {
    const targets: { id: string; type: "field" | "step"; label: string; stepIdx: number }[] = [];
    schema.steps.forEach((step, si) => {
      if (!step.showCondition?.fieldId) {
        targets.push({ id: `step_${step.id}`, type: "step", label: step.title, stepIdx: si });
      }
      step.fields.forEach((f) => {
        if (!f.showCondition?.fieldId && f.type !== "heading") {
          targets.push({ id: f.id, type: "field", label: f.label, stepIdx: si });
        }
      });
    });
    return targets;
  }, [schema, wires]);

  /* ── Schema mutation helpers ──────────────────────────── */

  function updateCondition(targetId: string, targetType: "field" | "step", condition: ShowCondition) {
    const updated = JSON.parse(JSON.stringify(schema)) as FormSchema;
    if (targetType === "step") {
      const stepId = targetId.replace("step_", "");
      const step = updated.steps.find((s) => s.id === stepId);
      if (step) step.showCondition = condition;
    } else {
      for (const step of updated.steps) {
        const field = step.fields.find((f) => f.id === targetId);
        if (field) { field.showCondition = condition; break; }
      }
    }
    onChange(updated);
  }

  function removeCondition(targetId: string, targetType: "field" | "step") {
    const updated = JSON.parse(JSON.stringify(schema)) as FormSchema;
    if (targetType === "step") {
      const stepId = targetId.replace("step_", "");
      const step = updated.steps.find((s) => s.id === stepId);
      if (step) delete step.showCondition;
    } else {
      for (const step of updated.steps) {
        const field = step.fields.find((f) => f.id === targetId);
        if (field) { delete field.showCondition; break; }
      }
    }
    onChange(updated);
  }

  /* ── Drag-to-connect ─────────────────────────────────── */

  function handleSourceDragStart(sourceId: string, e: React.MouseEvent) {
    e.preventDefault();
    setDraggingFrom(sourceId);
    setDragPos({ x: e.clientX, y: e.clientY });

    const handleMove = (ev: MouseEvent) => setDragPos({ x: ev.clientX, y: ev.clientY });
    const handleUp = () => {
      setDraggingFrom(null);
      setDragPos(null);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }

  function handleDropOnTarget(targetId: string, targetType: "field" | "step") {
    if (!draggingFrom) return;
    updateCondition(targetId, targetType, {
      fieldId: draggingFrom,
      operator: "equals",
      value: "",
    });
    setDraggingFrom(null);
    setDragPos(null);
    setEditingTarget(targetId);
  }

  const hasRules = wires.length > 0;

  return (
    <div className="h-full flex flex-col bg-surface" ref={canvasRef}>
      {/* Top bar */}
      <div className="shrink-0 px-6 py-3 border-b border-outline-variant/10 bg-surface-container-low/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-headline font-bold text-on-surface tracking-tight">
              <i className="fa-solid fa-diagram-project text-primary mr-2" />
              Smart Conditions
            </h2>
            <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
              Drag from trigger blocks to targets, or click to add rules. Both views sync automatically.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
              {wires.length} rule{wires.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowAddPanel(true)}
              className="px-3 py-1.5 text-xs font-bold text-on-primary bg-primary rounded-lg hover:shadow-[0_0_12px_rgba(105,108,248,0.3)] transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-plus text-[10px]" />
              Add Rule
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Main canvas */}
        <div className="flex-1 overflow-auto p-6">
          {!hasRules && !showAddPanel ? (
            <EmptyState onAdd={() => setShowAddPanel(true)} />
          ) : (
            <div className="space-y-5">
              {/* Visual block flow */}
              {sourceBlocks.map((source) => {
                const color = sourceColors[source.id] ?? "#696cf8";
                const conns = wiresBySource[source.id] ?? [];

                return (
                  <div key={source.id} className="relative">
                    {/* Source block */}
                    <div className="flex items-start gap-6">
                      <div
                        ref={(el) => { nodeRefs.current[source.id] = el; }}
                        className="w-64 shrink-0 rounded-2xl border-2 bg-surface-container-lowest overflow-hidden"
                        style={{ borderColor: color + "40" }}
                      >
                        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color + "08" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px]" style={{ backgroundColor: color + "20", color }}>
                            <i className="fa-solid fa-bolt" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">{source.label}</p>
                            <p className="text-[10px] text-on-surface-variant/60">
                              Trigger · Step {source.stepIdx + 1}
                            </p>
                          </div>
                          {/* Drag handle for creating new connections */}
                          <button
                            onMouseDown={(e) => handleSourceDragStart(source.id, e)}
                            className="w-7 h-7 rounded-full flex items-center justify-center cursor-crosshair hover:scale-110 transition-transform"
                            style={{ backgroundColor: color + "20", color }}
                            title="Drag to a target to create a connection"
                          >
                            <i className="fa-solid fa-circle-dot text-[9px]" />
                          </button>
                        </div>
                      </div>

                      {/* Wire + target blocks */}
                      <div className="flex-1 space-y-2 pt-1">
                        {conns.map((wire) => {
                          const target = targetBlocks.find((t) => t.id === wire.targetId);
                          if (!target) return null;
                          const isEditing = editingTarget === wire.targetId;

                          return (
                            <div key={wire.targetId} className="flex items-center gap-3">
                              {/* Wire line with condition badge */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <div className="w-8 h-px" style={{ backgroundColor: color + "40" }} />
                                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-md whitespace-nowrap" style={{ backgroundColor: color + "15", color }}>
                                  {OPERATOR_LABELS[wire.operator] ?? wire.operator}
                                  {wire.value ? ` "${wire.value}"` : ""}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <div className="w-4 h-px" style={{ backgroundColor: color + "40" }} />
                                  <i className="fa-solid fa-caret-right text-[10px]" style={{ color: color + "60" }} />
                                </div>
                              </div>

                              {/* Target block */}
                              <div
                                ref={(el) => { nodeRefs.current[wire.targetId] = el; }}
                                className={`flex-1 max-w-xs rounded-xl border-2 px-4 py-2.5 flex items-center gap-3 group cursor-pointer transition-all ${
                                  isEditing ? "border-primary/40 bg-primary/5 shadow-sm" : "border-outline-variant/15 bg-surface-container hover:border-primary/20"
                                }`}
                                onClick={() => setEditingTarget(isEditing ? null : wire.targetId)}
                              >
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                                  target.targetType === "step"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-primary/10 text-primary"
                                }`}>
                                  <i className={`fa-solid ${target.targetType === "step" ? "fa-layer-group" : "fa-eye"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-on-surface truncate">{target.label}</p>
                                  <p className="text-[9px] text-on-surface-variant/50">
                                    {target.targetType === "step" ? "Show entire step" : `Show field in step ${target.stepIdx + 1}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setEditingTarget(wire.targetId); }}
                                    className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 text-[9px]"
                                  ><i className="fa-solid fa-pen" /></button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); removeCondition(wire.targetId, wire.targetType); }}
                                    className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error/10 text-[9px]"
                                  ><i className="fa-solid fa-trash" /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Drop zone when dragging */}
              {draggingFrom && (
                <div className="mt-4 p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/[0.03]">
                  <p className="text-xs text-primary font-bold mb-3">
                    <i className="fa-solid fa-circle-dot text-[10px] mr-1.5" />
                    Drop on a target to connect — or choose one:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableTargets.map((t) => (
                      <button
                        key={t.id}
                        onMouseUp={() => handleDropOnTarget(t.id, t.type)}
                        onClick={() => handleDropOnTarget(t.id, t.type)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/15 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[8px] ${
                          t.type === "step" ? "bg-amber-500/15 text-amber-400" : "bg-primary/10 text-primary"
                        }`}>
                          <i className={`fa-solid ${t.type === "step" ? "fa-layer-group" : "fa-eye"}`} />
                        </div>
                        <span className="text-[11px] text-on-surface truncate">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 border-l border-outline-variant/10 bg-surface-container-low/20 overflow-y-auto hidden lg:block">
          <div className="p-5 space-y-5">
            {/* Form structure */}
            <div>
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Form Structure</h3>
              <div className="space-y-2">
                {schema.steps.map((step, si) => (
                  <div key={step.id} className="rounded-xl bg-surface-container p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-md bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">{si + 1}</span>
                      <span className="text-xs font-semibold text-on-surface truncate flex-1">{step.title}</span>
                      {step.showCondition?.fieldId && (
                        <i className="fa-solid fa-eye text-[8px] text-amber-400" title="Conditional" />
                      )}
                    </div>
                    <div className="space-y-0.5 ml-7">
                      {step.fields.map((f) => (
                        <div key={f.id} className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/70">
                          {f.showCondition?.fieldId ? (
                            <i className="fa-solid fa-eye text-[7px] text-amber-400" />
                          ) : sourceBlocks.find((s) => s.id === f.id) ? (
                            <i className="fa-solid fa-bolt text-[7px]" style={{ color: sourceColors[f.id] ?? "#696cf8" }} />
                          ) : (
                            <i className="fa-solid fa-circle text-[4px] text-on-surface-variant/30" />
                          )}
                          <span className="truncate">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="border-t border-outline-variant/10 pt-4">
              <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">How it works</h3>
              <div className="space-y-2 text-[11px] text-on-surface-variant/60 leading-relaxed">
                <p>
                  <i className="fa-solid fa-bolt text-primary text-[9px] mr-1.5" />
                  <strong className="text-on-surface-variant/80">Drag</strong> from a trigger's dot to create connections.
                </p>
                <p>
                  <i className="fa-solid fa-eye text-amber-400 text-[9px] mr-1.5" />
                  <strong className="text-on-surface-variant/80">Targets</strong> show/hide based on trigger answers.
                </p>
                <p>
                  <i className="fa-solid fa-pen text-tertiary text-[9px] mr-1.5" />
                  <strong className="text-on-surface-variant/80">Click</strong> any target block to edit its condition.
                </p>
                <p>
                  <i className="fa-solid fa-arrows-left-right text-primary text-[9px] mr-1.5" />
                  <strong className="text-on-surface-variant/80">Syncs</strong> with field settings — edit either view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editingTarget && (() => {
        const target = targetBlocks.find((t) => t.id === editingTarget);
        if (!target?.condition) return null;
        return (
          <EditRuleModal
            target={target}
            sourceFields={sourceFields}
            condition={target.condition}
            onSave={(condition) => {
              updateCondition(target.id, target.targetType!, condition);
              setEditingTarget(null);
            }}
            onClose={() => setEditingTarget(null)}
            fieldById={fieldById}
          />
        );
      })()}

      {/* Add rule panel */}
      {showAddPanel && (
        <AddRuleModal
          availableTargets={availableTargets}
          sourceFields={sourceFields}
          onAdd={(targetId, targetType, condition) => {
            updateCondition(targetId, targetType, condition);
            setShowAddPanel(false);
          }}
          onClose={() => setShowAddPanel(false)}
          fieldById={fieldById}
        />
      )}
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <i className="fa-solid fa-diagram-project text-3xl text-primary" />
      </div>
      <h3 className="text-xl font-headline font-bold text-on-surface mb-2">
        No conditional logic yet
      </h3>
      <p className="text-sm text-on-surface-variant/60 mb-6 leading-relaxed">
        Make your form smart — show or hide fields and entire steps based on how your client answers.
        Drag from trigger blocks or click the button below to create your first rule.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:shadow-[0_0_20px_rgba(105,108,248,0.3)] transition-all flex items-center gap-2"
      >
        <i className="fa-solid fa-plus text-xs" />
        Create First Rule
      </button>
    </div>
  );
}

/* ── Add Rule Modal ──────────────────────────────────────── */

function AddRuleModal({
  availableTargets,
  sourceFields,
  onAdd,
  onClose,
  fieldById,
}: {
  availableTargets: { id: string; type: "field" | "step"; label: string; stepIdx: number }[];
  sourceFields: FieldDef[];
  onAdd: (targetId: string, targetType: "field" | "step", condition: ShowCondition) => void;
  onClose: () => void;
  fieldById: (id: string) => (FieldDef & { stepIdx: number }) | undefined;
}) {
  const [sourceId, setSourceId] = useState("");
  const [operator, setOperator] = useState<ShowCondition["operator"]>("equals");
  const [value, setValue] = useState("");
  const [targetId, setTargetId] = useState("");

  const selectedSource = sourceId ? sourceFields.find((f) => f.id === sourceId) : null;
  const hasOptions = selectedSource && ["select", "radio", "checkbox"].includes(selectedSource.type);
  const needsValue = operator !== "not_empty" && operator !== "is_empty";
  const selectedTarget = targetId ? availableTargets.find((t) => t.id === targetId) : null;

  function handleCreate() {
    if (!sourceId || !targetId || !selectedTarget) return;
    onAdd(targetId, selectedTarget.type, { fieldId: sourceId, operator, value: needsValue ? value : undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-lg shadow-2xl space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">
            <i className="fa-solid fa-plus text-primary text-xs mr-2" />
            New Conditional Rule
          </h3>
          <button onClick={onClose} className="text-on-surface-variant/60 hover:text-on-surface"><i className="fa-solid fa-xmark" /></button>
        </div>

        {/* Step 1: trigger */}
        <div>
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold mr-1.5">1</span>
            When this field...
          </label>
          <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setValue(""); }} className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
            <option value="">Select a trigger field...</option>
            {sourceFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>

        {/* Step 2: condition */}
        {sourceId && (
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold mr-1.5">2</span>
              Matches this condition...
            </label>
            <div className="flex gap-2">
              <select value={operator} onChange={(e) => setOperator(e.target.value as ShowCondition["operator"])} className="flex-1 px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
                {Object.entries(OPERATOR_FULL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {needsValue && (hasOptions ? (
                <select value={value} onChange={(e) => setValue(e.target.value)} className="flex-1 px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
                  <option value="">Select value...</option>
                  {(selectedSource!.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value..." className="flex-1 px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none" />
              ))}
            </div>
          </div>
        )}

        {/* Step 3: target */}
        {sourceId && (
          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-primary text-[8px] font-bold mr-1.5">3</span>
              Then show...
            </label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
              <option value="">Select a field or step...</option>
              <optgroup label="Steps">
                {availableTargets.filter((t) => t.type === "step").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
              <optgroup label="Fields">
                {availableTargets.filter((t) => t.type === "field").map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            </select>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!sourceId || !targetId || (needsValue && !value)}
          className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-primary/20"
        >
          <i className="fa-solid fa-check text-xs mr-2" />
          Create Rule
        </button>
      </div>
    </div>
  );
}

/* ── Edit Rule Modal ─────────────────────────────────────── */

function EditRuleModal({
  target,
  sourceFields,
  condition,
  onSave,
  onClose,
  fieldById,
}: {
  target: BlockNode;
  sourceFields: FieldDef[];
  condition: ShowCondition;
  onSave: (c: ShowCondition) => void;
  onClose: () => void;
  fieldById: (id: string) => (FieldDef & { stepIdx: number }) | undefined;
}) {
  const [sourceId, setSourceId] = useState(condition.fieldId);
  const [operator, setOperator] = useState(condition.operator);
  const [value, setValue] = useState(condition.value ?? "");

  const selectedSource = sourceId ? sourceFields.find((f) => f.id === sourceId) : null;
  const hasOptions = selectedSource && ["select", "radio", "checkbox"].includes(selectedSource.type);
  const needsValue = operator !== "not_empty" && operator !== "is_empty";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container rounded-2xl border border-outline-variant/15 p-6 w-full max-w-md shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">
            <i className="fa-solid fa-pen text-primary text-xs mr-2" />
            Edit Rule for &ldquo;{target.label}&rdquo;
          </h3>
          <button onClick={onClose} className="text-on-surface-variant/60 hover:text-on-surface"><i className="fa-solid fa-xmark" /></button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Trigger field</label>
          <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setValue(""); }} className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
            {sourceFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Operator</label>
            <select value={operator} onChange={(e) => setOperator(e.target.value as ShowCondition["operator"])} className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
              {Object.entries(OPERATOR_FULL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {needsValue && (
            <div className="flex-1">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Value</label>
              {hasOptions ? (
                <select value={value} onChange={(e) => setValue(e.target.value)} className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface focus:ring-1 focus:ring-primary/40 outline-none">
                  <option value="">Select...</option>
                  {(selectedSource!.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Value..." className="w-full px-4 py-2.5 text-sm bg-surface-container-lowest border-0 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/40 outline-none" />
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onSave({ fieldId: sourceId, operator, value: needsValue ? value : undefined })}
          disabled={!sourceId || (needsValue && !value)}
          className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm disabled:opacity-40 transition-all"
        >
          Save Rule
        </button>
      </div>
    </div>
  );
}
