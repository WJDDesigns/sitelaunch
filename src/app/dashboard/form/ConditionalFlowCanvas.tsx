"use client";

import { useState, useMemo, useCallback } from "react";
import type { FormSchema, StepDef, FieldDef, ShowCondition } from "@/lib/forms";

/* ── Constants ───────────────────────────────────────────── */

const OPERATOR_FULL: Record<string, string> = {
  equals: "Is equal to",
  not_equals: "Is not equal to",
  contains: "Contains",
  not_empty: "Is not empty",
  is_empty: "Is empty",
  greater_than: "Is greater than",
  less_than: "Is less than",
};

const ACTION_LABELS: Record<string, string> = {
  show: "Show",
  hide: "Hide",
  skip_to: "Skip to",
};

const RULE_COLORS = [
  "#696cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#4ade80",
];

/* ── Types ───────────────────────────────────────────────── */

interface Rule {
  id: string;
  targetId: string;
  targetType: "field" | "step";
  targetLabel: string;
  targetStepIdx: number;
  sourceFieldId: string;
  sourceLabel: string;
  sourceStepIdx: number;
  operator: string;
  value?: string;
  action: "show" | "hide" | "skip_to";
}

/* ── Main Component ──────────────────────────────────────── */

export default function ConditionalFlowCanvas({
  schema,
  onChange,
}: {
  schema: FormSchema;
  onChange: (schema: FormSchema) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);

  /* ── Derived data ─────────────────────────────────────── */

  const allFields = useMemo(() => {
    const fields: (FieldDef & { stepIdx: number; stepTitle: string })[] = [];
    schema.steps.forEach((step, si) => {
      step.fields.forEach((f) => fields.push({ ...f, stepIdx: si, stepTitle: step.title }));
    });
    return fields;
  }, [schema]);

  const sourceFields = useMemo(
    () => allFields.filter((f) => f.type !== "heading" && f.type !== "file" && f.type !== "files"),
    [allFields],
  );

  const fieldById = useCallback(
    (id: string) => allFields.find((f) => f.id === id),
    [allFields],
  );

  // Build rules from existing conditions
  const rules: Rule[] = useMemo(() => {
    const r: Rule[] = [];
    schema.steps.forEach((step, si) => {
      if (step.showCondition?.fieldId) {
        const src = fieldById(step.showCondition.fieldId);
        r.push({
          id: `rule_step_${step.id}`,
          targetId: `step_${step.id}`,
          targetType: "step",
          targetLabel: step.title,
          targetStepIdx: si,
          sourceFieldId: step.showCondition.fieldId,
          sourceLabel: src?.label ?? "Unknown field",
          sourceStepIdx: src?.stepIdx ?? 0,
          operator: step.showCondition.operator,
          value: step.showCondition.value,
          action: "show",
        });
      }
      step.fields.forEach((field) => {
        if (field.showCondition?.fieldId) {
          const src = fieldById(field.showCondition.fieldId);
          r.push({
            id: `rule_field_${field.id}`,
            targetId: field.id,
            targetType: "field",
            targetLabel: field.label,
            targetStepIdx: si,
            sourceFieldId: field.showCondition.fieldId,
            sourceLabel: src?.label ?? "Unknown field",
            sourceStepIdx: src?.stepIdx ?? 0,
            operator: field.showCondition.operator,
            value: field.showCondition.value,
            action: "show",
          });
        }
      });
    });
    return r;
  }, [schema, fieldById]);

  // Group rules by source field
  const rulesBySource = useMemo(() => {
    const map: Record<string, Rule[]> = {};
    rules.forEach((r) => {
      (map[r.sourceFieldId] ||= []).push(r);
    });
    return map;
  }, [rules]);

  const sourceIds = useMemo(() => Object.keys(rulesBySource), [rulesBySource]);

  // Available targets (fields/steps without a condition)
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
  }, [schema]);

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

  /* ── Toggle collapse ──────────────────────────────────── */

  function toggleGroup(sourceId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      return next;
    });
  }

  const hasRules = rules.length > 0;

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Top bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-outline-variant/10 bg-surface-container-low/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-headline font-bold text-on-surface tracking-tight">
              <i className="fa-solid fa-code-branch text-primary mr-2" />
              Display Logic
            </h2>
            <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
              Control which fields and steps appear based on user answers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider">
              {rules.length} rule{rules.length !== 1 ? "s" : ""}
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

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
          {!hasRules && !showAddPanel ? (
            <EmptyState onAdd={() => setShowAddPanel(true)} />
          ) : (
            <>
              {/* Rule groups by trigger field */}
              {sourceIds.map((sourceId, gi) => {
                const groupRules = rulesBySource[sourceId];
                const source = fieldById(sourceId);
                const isCollapsed = collapsedGroups.has(sourceId);
                const color = RULE_COLORS[gi % RULE_COLORS.length];

                return (
                  <div
                    key={sourceId}
                    className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container overflow-hidden shadow-lg shadow-black/10"
                  >
                    {/* Group header — trigger field */}
                    <button
                      onClick={() => toggleGroup(sourceId)}
                      className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-surface-container-high/30 transition-colors"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs shrink-0"
                        style={{ backgroundColor: color + "15", color }}
                      >
                        <i className="fa-solid fa-bolt" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-bold text-on-surface truncate">
                          {source?.label ?? "Unknown field"}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/50">
                          Step {(source?.stepIdx ?? 0) + 1} &middot; {groupRules.length} rule{groupRules.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <i className={`fa-solid fa-chevron-${isCollapsed ? "right" : "down"} text-[10px] text-on-surface-variant/40`} />
                    </button>

                    {/* Rules list */}
                    {!isCollapsed && (
                      <div className="border-t border-outline-variant/[0.06]">
                        {groupRules.map((rule, ri) => (
                          <RuleCard
                            key={rule.id}
                            rule={rule}
                            index={ri}
                            color={color}
                            isEditing={editingRule === rule.id}
                            sourceFields={sourceFields}
                            allFields={allFields}
                            schema={schema}
                            onEdit={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                            onUpdate={(condition) => {
                              updateCondition(
                                rule.targetType === "step" ? rule.targetId : rule.targetId,
                                rule.targetType,
                                condition,
                              );
                              setEditingRule(null);
                            }}
                            onDelete={() => removeCondition(rule.targetId, rule.targetType)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Hint for more rules */}
              {hasRules && (
                <button
                  onClick={() => setShowAddPanel(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-outline-variant/15 text-xs font-bold text-on-surface-variant/50 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-plus text-[10px]" />
                  Add another rule
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add rule panel */}
      {showAddPanel && (
        <AddRulePanel
          availableTargets={availableTargets}
          sourceFields={sourceFields}
          schema={schema}
          fieldById={fieldById}
          onAdd={(targetId, targetType, condition) => {
            updateCondition(targetId, targetType, condition);
            setShowAddPanel(false);
          }}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}

/* ── Rule Card ───────────────────────────────────────────── */

function RuleCard({
  rule,
  index,
  color,
  isEditing,
  sourceFields,
  allFields,
  schema,
  onEdit,
  onUpdate,
  onDelete,
}: {
  rule: Rule;
  index: number;
  color: string;
  isEditing: boolean;
  sourceFields: (FieldDef & { stepIdx: number; stepTitle: string })[];
  allFields: (FieldDef & { stepIdx: number; stepTitle: string })[];
  schema: FormSchema;
  onEdit: () => void;
  onUpdate: (condition: ShowCondition) => void;
  onDelete: () => void;
}) {
  const [editSourceId, setEditSourceId] = useState(rule.sourceFieldId);
  const [editOperator, setEditOperator] = useState(rule.operator);
  const [editValue, setEditValue] = useState(rule.value ?? "");

  const selectedSource = sourceFields.find((f) => f.id === editSourceId);
  const hasOptions = selectedSource && ["select", "radio", "checkbox"].includes(selectedSource.type);
  const needsValue = editOperator !== "not_empty" && editOperator !== "is_empty";

  function handleSave() {
    onUpdate({
      fieldId: editSourceId,
      operator: editOperator as ShowCondition["operator"],
      value: needsValue ? editValue : undefined,
    });
  }

  // Reset edit state when editing starts
  const handleEdit = () => {
    setEditSourceId(rule.sourceFieldId);
    setEditOperator(rule.operator);
    setEditValue(rule.value ?? "");
    onEdit();
  };

  return (
    <div className={`px-4 sm:px-5 py-3.5 ${index > 0 ? "border-t border-outline-variant/[0.04]" : ""} transition-colors ${isEditing ? "bg-primary/[0.02]" : "hover:bg-surface-container-high/20"}`}>
      {/* Rule header */}
      <div className="flex items-start gap-3">
        {/* Number badge */}
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
          style={{ backgroundColor: color + "15", color }}
        >
          {index + 1}
        </div>

        {/* Rule content */}
        <div className="flex-1 min-w-0">
          {!isEditing ? (
            /* ── Read mode ──────────────────────────────── */
            <div className="space-y-2">
              {/* IF row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 shrink-0 w-6">IF</span>
                <span className="text-xs text-on-surface font-medium">{rule.sourceLabel}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-mono">
                  {OPERATOR_FULL[rule.operator] ?? rule.operator}
                </span>
                {rule.value && (
                  <span className="text-xs font-medium text-primary">&ldquo;{rule.value}&rdquo;</span>
                )}
              </div>

              {/* THEN row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary/70 shrink-0 w-6">THEN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-tertiary/10 text-tertiary font-bold uppercase tracking-wider">
                  {ACTION_LABELS[rule.action]}
                </span>
                <div className="flex items-center gap-1.5">
                  <i className={`fa-solid ${rule.targetType === "step" ? "fa-layer-group" : "fa-eye"} text-[9px] text-on-surface-variant/50`} />
                  <span className="text-xs text-on-surface font-medium">{rule.targetLabel}</span>
                  <span className="text-[10px] text-on-surface-variant/40">
                    ({rule.targetType === "step" ? "Step" : "Field"} &middot; Step {rule.targetStepIdx + 1})
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ── Edit mode ──────────────────────────────── */
            <div className="space-y-3">
              {/* IF condition editor */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-primary/70 block mb-1.5">IF this field...</label>
                <select
                  value={editSourceId}
                  onChange={(e) => { setEditSourceId(e.target.value); setEditValue(""); }}
                  className="w-full px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                >
                  {sourceFields.map((f) => (
                    <option key={f.id} value={f.id}>{f.label} (Step {f.stepIdx + 1})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1.5">Condition</label>
                  <select
                    value={editOperator}
                    onChange={(e) => setEditOperator(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                  >
                    {Object.entries(OPERATOR_FULL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                {needsValue && (
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-1.5">Value</label>
                    {hasOptions ? (
                      <select
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                      >
                        <option value="">Select...</option>
                        {(selectedSource!.options ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="Enter value..."
                        className="w-full px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-on-surface-variant/40 border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* THEN display (read-only target for now) */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary/70">THEN</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-tertiary/10 text-tertiary font-bold uppercase tracking-wider">Show</span>
                <span className="text-xs text-on-surface">{rule.targetLabel}</span>
              </div>

              {/* Save/Cancel */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!editSourceId || (needsValue && !editValue)}
                  className="px-4 py-1.5 text-xs font-bold text-on-primary bg-primary rounded-lg disabled:opacity-40 transition-all"
                >
                  Save
                </button>
                <button
                  onClick={onEdit}
                  className="px-4 py-1.5 text-xs font-bold text-on-surface-variant border border-outline-variant/15 rounded-lg hover:bg-surface-container-high/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleEdit}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-primary hover:bg-primary/10 transition-all"
              title="Edit rule"
            >
              <i className="fa-solid fa-pen text-[10px]" />
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/50 hover:text-error hover:bg-error/10 transition-all"
              title="Delete rule"
            >
              <i className="fa-solid fa-trash text-[10px]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────── */

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-6 sm:px-8 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
        <i className="fa-solid fa-code-branch text-2xl sm:text-3xl text-primary" />
      </div>
      <h3 className="text-lg sm:text-xl font-headline font-bold text-on-surface mb-2">
        No display logic yet
      </h3>
      <p className="text-sm text-on-surface-variant/60 mb-6 leading-relaxed">
        Create rules to show or hide fields and steps based on how your clients answer.
        For example, show a &ldquo;Budget&rdquo; field only when the client selects &ldquo;Enterprise&rdquo; as their plan.
      </p>
      <button
        onClick={onAdd}
        className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:shadow-[0_0_20px_rgba(105,108,248,0.3)] transition-all flex items-center gap-2"
      >
        <i className="fa-solid fa-plus text-xs" />
        Create First Rule
      </button>

      {/* How it works */}
      <div className="mt-10 pt-8 border-t border-outline-variant/10 w-full text-left">
        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 text-center">How display logic works</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <i className="fa-solid fa-bolt text-primary text-sm" />
            </div>
            <p className="text-[11px] text-on-surface font-bold mb-0.5">Pick a trigger</p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">Choose which field&apos;s answer controls visibility</p>
          </div>
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container">
            <div className="w-10 h-10 rounded-xl bg-tertiary/10 flex items-center justify-center mb-2">
              <i className="fa-solid fa-sliders text-tertiary text-sm" />
            </div>
            <p className="text-[11px] text-on-surface font-bold mb-0.5">Set a condition</p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">Define the operator and value to match</p>
          </div>
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
              <i className="fa-solid fa-eye text-amber-400 text-sm" />
            </div>
            <p className="text-[11px] text-on-surface font-bold mb-0.5">Choose the target</p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">Select which field or step to show or hide</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Rule Panel ──────────────────────────────────────── */

function AddRulePanel({
  availableTargets,
  sourceFields,
  schema,
  fieldById,
  onAdd,
  onClose,
}: {
  availableTargets: { id: string; type: "field" | "step"; label: string; stepIdx: number }[];
  sourceFields: (FieldDef & { stepIdx: number; stepTitle: string })[];
  schema: FormSchema;
  fieldById: (id: string) => (FieldDef & { stepIdx: number; stepTitle: string }) | undefined;
  onAdd: (targetId: string, targetType: "field" | "step", condition: ShowCondition) => void;
  onClose: () => void;
}) {
  const [sourceId, setSourceId] = useState("");
  const [operator, setOperator] = useState<string>("equals");
  const [value, setValue] = useState("");
  const [targetId, setTargetId] = useState("");

  const selectedSource = sourceId ? sourceFields.find((f) => f.id === sourceId) : null;
  const hasOptions = selectedSource && ["select", "radio", "checkbox"].includes(selectedSource.type);
  const needsValue = operator !== "not_empty" && operator !== "is_empty";
  const selectedTarget = targetId ? availableTargets.find((t) => t.id === targetId) : null;

  const canCreate = sourceId && targetId && selectedTarget && (!needsValue || value);

  function handleCreate() {
    if (!sourceId || !targetId || !selectedTarget) return;
    onAdd(targetId, selectedTarget.type, {
      fieldId: sourceId,
      operator: operator as ShowCondition["operator"],
      value: needsValue ? value : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-container rounded-t-2xl sm:rounded-2xl border border-outline-variant/15 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface-container px-5 pt-5 pb-3 border-b border-outline-variant/[0.06] z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface">
              <i className="fa-solid fa-plus text-primary text-xs mr-2" />
              New Display Logic Rule
            </h3>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high/50">
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant/50 mt-1">
            Show or hide a field/step based on another field&apos;s answer.
          </p>
        </div>

        <div className="p-5 space-y-5">
          {/* IF section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 rounded-md bg-primary/10">IF</span>
              <span className="text-[11px] text-on-surface-variant/60">When this field&apos;s answer matches...</span>
            </div>

            {/* Source field */}
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1.5">Trigger Field</label>
              <select
                value={sourceId}
                onChange={(e) => { setSourceId(e.target.value); setValue(""); }}
                className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
              >
                <option value="">Select a field...</option>
                {schema.steps.map((step, si) => (
                  <optgroup key={step.id} label={`Step ${si + 1}: ${step.title}`}>
                    {sourceFields
                      .filter((f) => f.stepIdx === si)
                      .map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Operator + value */}
            {sourceId && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1.5">Condition</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                  >
                    {Object.entries(OPERATOR_FULL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                {needsValue && (
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1.5">Value</label>
                    {hasOptions ? (
                      <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                      >
                        <option value="">Select...</option>
                        {(selectedSource!.options ?? []).map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="e.g. Enterprise"
                        className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-on-surface-variant/30 border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          {sourceId && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/10" />
              <i className="fa-solid fa-arrow-down text-[10px] text-on-surface-variant/30" />
              <div className="flex-1 h-px bg-outline-variant/10" />
            </div>
          )}

          {/* THEN section */}
          {sourceId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary px-2 py-0.5 rounded-md bg-tertiary/10">THEN</span>
                <span className="text-[11px] text-on-surface-variant/60">Show this field or step</span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest block mb-1.5">Target</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                >
                  <option value="">Select a field or step...</option>
                  {schema.steps.map((step, si) => {
                    const stepTargets = availableTargets.filter((t) => t.stepIdx === si);
                    if (stepTargets.length === 0) return null;
                    return (
                      <optgroup key={step.id} label={`Step ${si + 1}: ${step.title}`}>
                        {stepTargets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.type === "step" ? `[Entire Step] ${t.label}` : t.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {selectedTarget && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-tertiary/[0.05] border border-tertiary/10">
                  <i className={`fa-solid ${selectedTarget.type === "step" ? "fa-layer-group text-amber-400" : "fa-eye text-primary"} text-xs`} />
                  <span className="text-xs text-on-surface">
                    {selectedTarget.type === "step" ? "Entire step" : "Field"}: <strong>{selectedTarget.label}</strong>
                  </span>
                  <span className="text-[10px] text-on-surface-variant/40 ml-auto">Step {selectedTarget.stepIdx + 1}</span>
                </div>
              )}
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm disabled:opacity-30 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-check text-xs" />
            Create Rule
          </button>
        </div>
      </div>
    </div>
  );
}
