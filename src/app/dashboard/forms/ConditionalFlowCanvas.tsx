"use client";

import { useState, useMemo, useCallback } from "react";
import type { FormSchema, FieldDef, ShowCondition } from "@/lib/forms";

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

const RULE_COLORS = [
  "#696cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#a78bfa", "#fb923c", "#2dd4bf", "#e879f9", "#4ade80",
];

/* ── Types ───────────────────────────────────────────────── */

interface ConditionClause {
  fieldId: string;
  operator: string;
  value?: string;
}

interface Rule {
  id: string;
  targetId: string;
  targetType: "field" | "step";
  targetLabel: string;
  targetStepIdx: number;
  /** Primary condition */
  primaryCondition: ConditionClause;
  /** Extra conditions (OR/AND) */
  extraConditions: ConditionClause[];
  /** Combinator for multiple conditions */
  combinator: "and" | "or";
  /** Action type */
  action: "show" | "hide";
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

    function conditionToRule(
      id: string,
      targetId: string,
      targetType: "field" | "step",
      targetLabel: string,
      targetStepIdx: number,
      condition: ShowCondition,
    ) {
      r.push({
        id,
        targetId,
        targetType,
        targetLabel,
        targetStepIdx,
        primaryCondition: {
          fieldId: condition.fieldId,
          operator: condition.operator,
          value: condition.value,
        },
        extraConditions: (condition.extraConditions ?? []).map((ec) => ({
          fieldId: ec.fieldId,
          operator: ec.operator,
          value: ec.value,
        })),
        combinator: condition.combinator ?? "or",
        action: condition.action ?? "show",
      });
    }

    schema.steps.forEach((step, si) => {
      if (step.showCondition?.fieldId) {
        conditionToRule(`rule_step_${step.id}`, `step_${step.id}`, "step", step.title, si, step.showCondition);
      }
      step.fields.forEach((field) => {
        if (field.showCondition?.fieldId) {
          conditionToRule(`rule_field_${field.id}`, field.id, "field", field.label, si, field.showCondition);
        }
      });
    });
    return r;
  }, [schema]);

  // Group rules by the primary trigger field
  const rulesBySource = useMemo(() => {
    const map: Record<string, Rule[]> = {};
    rules.forEach((r) => {
      const key = r.primaryCondition.fieldId;
      (map[key] ||= []).push(r);
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

  function saveRule(
    targetId: string,
    targetType: "field" | "step",
    primary: ConditionClause,
    extras: ConditionClause[],
    combinator: "and" | "or",
    action: "show" | "hide",
  ) {
    const condition: ShowCondition = {
      fieldId: primary.fieldId,
      operator: primary.operator as ShowCondition["operator"],
      value: primary.value,
      extraConditions: extras.length > 0 ? extras : undefined,
      combinator: extras.length > 0 ? combinator : undefined,
      action: action !== "show" ? action : undefined,
    };

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
                    {/* Group header */}
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
                            schema={schema}
                            fieldById={fieldById}
                            onEdit={() => setEditingRule(editingRule === rule.id ? null : rule.id)}
                            onSave={(primary, extras, combinator, action) => {
                              saveRule(rule.targetId, rule.targetType, primary, extras, combinator, action);
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
          onAdd={(targetId, targetType, primary, extras, combinator, action) => {
            saveRule(targetId, targetType, primary, extras, combinator, action);
            setShowAddPanel(false);
          }}
          onClose={() => setShowAddPanel(false)}
        />
      )}
    </div>
  );
}

/* ── Condition Row (reused in RuleCard + AddRulePanel) ──── */

function ConditionRow({
  clause,
  index,
  sourceFields,
  fieldById,
  onChange,
  onRemove,
}: {
  clause: ConditionClause;
  index: number;
  sourceFields: (FieldDef & { stepIdx: number; stepTitle: string })[];
  fieldById: (id: string) => (FieldDef & { stepIdx: number; stepTitle: string }) | undefined;
  onChange: (c: ConditionClause) => void;
  onRemove?: () => void;
}) {
  const selectedSource = sourceFields.find((f) => f.id === clause.fieldId);
  const hasOptions = selectedSource && ["select", "radio", "checkbox"].includes(selectedSource.type);
  const needsValue = clause.operator !== "not_empty" && clause.operator !== "is_empty";

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-2">
        {/* Field selector */}
        <select
          value={clause.fieldId}
          onChange={(e) => onChange({ ...clause, fieldId: e.target.value, value: "" })}
          className="w-full px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
        >
          <option value="">Select a field...</option>
          {sourceFields.map((f) => (
            <option key={f.id} value={f.id}>{f.label} (Step {f.stepIdx + 1})</option>
          ))}
        </select>

        {/* Operator + value row */}
        {clause.fieldId && (
          <div className="flex gap-2">
            <select
              value={clause.operator}
              onChange={(e) => onChange({ ...clause, operator: e.target.value })}
              className="flex-1 px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
            >
              {Object.entries(OPERATOR_FULL).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            {needsValue && (
              hasOptions ? (
                <select
                  value={clause.value ?? ""}
                  onChange={(e) => onChange({ ...clause, value: e.target.value })}
                  className="flex-1 px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                >
                  <option value="">Select...</option>
                  {(selectedSource!.options ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={clause.value ?? ""}
                  onChange={(e) => onChange({ ...clause, value: e.target.value })}
                  placeholder="Enter value..."
                  className="flex-1 px-3 py-2 text-sm bg-surface-container-lowest rounded-xl text-on-surface placeholder:text-on-surface-variant/30 border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                />
              )
            )}
          </div>
        )}
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-all mt-1.5 shrink-0"
          title="Remove condition"
        >
          <i className="fa-solid fa-xmark text-[10px]" />
        </button>
      )}
    </div>
  );
}

/* ── Combinator Pill ─────────────────────────────────────── */

function CombinatorToggle({
  value,
  onChange,
}: {
  value: "and" | "or";
  onChange: (v: "and" | "or") => void;
}) {
  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex items-center rounded-lg bg-surface-container-high/50 p-0.5">
        <button
          onClick={() => onChange("or")}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
            value === "or"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant/60 hover:text-on-surface"
          }`}
        >
          OR
        </button>
        <button
          onClick={() => onChange("and")}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
            value === "and"
              ? "bg-primary text-on-primary shadow-sm"
              : "text-on-surface-variant/60 hover:text-on-surface"
          }`}
        >
          AND
        </button>
      </div>
    </div>
  );
}

/* ── Condition Read View ─────────────────────────────────── */

function ConditionReadView({
  clause,
  fieldById,
}: {
  clause: ConditionClause;
  fieldById: (id: string) => (FieldDef & { stepIdx: number; stepTitle: string }) | undefined;
}) {
  const source = fieldById(clause.fieldId);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-on-surface font-medium">{source?.label ?? "Unknown"}</span>
      <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant font-mono">
        {OPERATOR_FULL[clause.operator] ?? clause.operator}
      </span>
      {clause.value && (
        <span className="text-xs font-medium text-primary">&ldquo;{clause.value}&rdquo;</span>
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
  schema,
  fieldById,
  onEdit,
  onSave,
  onDelete,
}: {
  rule: Rule;
  index: number;
  color: string;
  isEditing: boolean;
  sourceFields: (FieldDef & { stepIdx: number; stepTitle: string })[];
  schema: FormSchema;
  fieldById: (id: string) => (FieldDef & { stepIdx: number; stepTitle: string }) | undefined;
  onEdit: () => void;
  onSave: (primary: ConditionClause, extras: ConditionClause[], combinator: "and" | "or", action: "show" | "hide") => void;
  onDelete: () => void;
}) {
  const [editPrimary, setEditPrimary] = useState<ConditionClause>(rule.primaryCondition);
  const [editExtras, setEditExtras] = useState<ConditionClause[]>(rule.extraConditions);
  const [editCombinator, setEditCombinator] = useState<"and" | "or">(rule.combinator);
  const [editAction, setEditAction] = useState<"show" | "hide">(rule.action);

  function handleEdit() {
    setEditPrimary(rule.primaryCondition);
    setEditExtras([...rule.extraConditions]);
    setEditCombinator(rule.combinator);
    setEditAction(rule.action);
    onEdit();
  }

  function handleSave() {
    onSave(editPrimary, editExtras, editCombinator, editAction);
  }

  function addExtraCondition() {
    setEditExtras([...editExtras, { fieldId: "", operator: "equals", value: "" }]);
  }

  function updateExtra(idx: number, clause: ConditionClause) {
    const next = [...editExtras];
    next[idx] = clause;
    setEditExtras(next);
  }

  function removeExtra(idx: number) {
    setEditExtras(editExtras.filter((_, i) => i !== idx));
  }

  const allConditions = [rule.primaryCondition, ...rule.extraConditions];
  const hasMultiple = allConditions.length > 1;

  return (
    <div className={`px-4 sm:px-5 py-3.5 ${index > 0 ? "border-t border-outline-variant/[0.04]" : ""} transition-colors ${isEditing ? "bg-primary/[0.02]" : "hover:bg-surface-container-high/20"}`}>
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
              {/* IF row(s) */}
              {allConditions.map((clause, ci) => (
                <div key={ci}>
                  {ci === 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-primary/70 shrink-0 w-6">IF</span>
                      <ConditionReadView clause={clause} fieldById={fieldById} />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 ml-6 my-1">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          rule.combinator === "or" ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {rule.combinator.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap ml-6">
                        <ConditionReadView clause={clause} fieldById={fieldById} />
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* THEN row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary/70 shrink-0 w-6">THEN</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                  rule.action === "hide"
                    ? "bg-error/10 text-error"
                    : "bg-tertiary/10 text-tertiary"
                }`}>
                  {rule.action === "hide" ? "Hide" : "Show"}
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
              {/* IF label */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 rounded-md bg-primary/10">IF</span>
                <span className="text-[11px] text-on-surface-variant/50">condition{editExtras.length > 0 ? "s" : ""} match...</span>
              </div>

              {/* Primary condition */}
              <ConditionRow
                clause={editPrimary}
                index={0}
                sourceFields={sourceFields}
                fieldById={fieldById}
                onChange={setEditPrimary}
              />

              {/* Extra conditions with combinator toggles */}
              {editExtras.map((extra, ei) => (
                <div key={ei}>
                  <CombinatorToggle value={editCombinator} onChange={setEditCombinator} />
                  <ConditionRow
                    clause={extra}
                    index={ei + 1}
                    sourceFields={sourceFields}
                    fieldById={fieldById}
                    onChange={(c) => updateExtra(ei, c)}
                    onRemove={() => removeExtra(ei)}
                  />
                </div>
              ))}

              {/* Add condition button */}
              <button
                onClick={addExtraCondition}
                className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                <i className="fa-solid fa-plus text-[9px]" />
                Add Condition
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-outline-variant/10" />
                <i className="fa-solid fa-arrow-down text-[10px] text-on-surface-variant/30" />
                <div className="flex-1 h-px bg-outline-variant/10" />
              </div>

              {/* THEN action */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary px-2 py-0.5 rounded-md bg-tertiary/10">THEN</span>
                <select
                  value={editAction}
                  onChange={(e) => setEditAction(e.target.value as "show" | "hide")}
                  className="px-3 py-1.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                >
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </select>
                <span className="text-xs text-on-surface">{rule.targetLabel}</span>
                <span className="text-[10px] text-on-surface-variant/40">
                  ({rule.targetType === "step" ? "Step" : "Field"})
                </span>
              </div>

              {/* Save/Cancel */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!editPrimary.fieldId}
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
            <p className="text-[11px] text-on-surface font-bold mb-0.5">Set conditions</p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">Use OR / AND to combine multiple conditions</p>
          </div>
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
              <i className="fa-solid fa-eye text-amber-400 text-sm" />
            </div>
            <p className="text-[11px] text-on-surface font-bold mb-0.5">Choose the action</p>
            <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">Show or hide a field/step when conditions match</p>
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
  onAdd: (targetId: string, targetType: "field" | "step", primary: ConditionClause, extras: ConditionClause[], combinator: "and" | "or", action: "show" | "hide") => void;
  onClose: () => void;
}) {
  const [primary, setPrimary] = useState<ConditionClause>({ fieldId: "", operator: "equals", value: "" });
  const [extras, setExtras] = useState<ConditionClause[]>([]);
  const [combinator, setCombinator] = useState<"and" | "or">("or");
  const [action, setAction] = useState<"show" | "hide">("show");
  const [targetId, setTargetId] = useState("");

  const selectedTarget = targetId ? availableTargets.find((t) => t.id === targetId) : null;
  const needsValue = primary.operator !== "not_empty" && primary.operator !== "is_empty";
  const canCreate = primary.fieldId && targetId && selectedTarget && (!needsValue || primary.value);

  function addExtraCondition() {
    setExtras([...extras, { fieldId: "", operator: "equals", value: "" }]);
  }

  function updateExtra(idx: number, clause: ConditionClause) {
    const next = [...extras];
    next[idx] = clause;
    setExtras(next);
  }

  function removeExtra(idx: number) {
    setExtras(extras.filter((_, i) => i !== idx));
  }

  function handleCreate() {
    if (!canCreate || !selectedTarget) return;
    // Filter out empty extras
    const validExtras = extras.filter((e) => e.fieldId);
    onAdd(targetId, selectedTarget.type, primary, validExtras, combinator, action);
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
        </div>

        <div className="p-5 space-y-4">
          {/* IF section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 rounded-md bg-primary/10">IF</span>
              <span className="text-[11px] text-on-surface-variant/60">When these conditions match...</span>
            </div>

            {/* Primary condition */}
            <ConditionRow
              clause={primary}
              index={0}
              sourceFields={sourceFields}
              fieldById={fieldById}
              onChange={setPrimary}
            />

            {/* Extra conditions */}
            {extras.map((extra, ei) => (
              <div key={ei}>
                <CombinatorToggle value={combinator} onChange={setCombinator} />
                <ConditionRow
                  clause={extra}
                  index={ei + 1}
                  sourceFields={sourceFields}
                  fieldById={fieldById}
                  onChange={(c) => updateExtra(ei, c)}
                  onRemove={() => removeExtra(ei)}
                />
              </div>
            ))}

            {/* Add condition button */}
            {primary.fieldId && (
              <button
                onClick={addExtraCondition}
                className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
              >
                <i className="fa-solid fa-plus text-[9px]" />
                Add Condition
              </button>
            )}
          </div>

          {/* Divider */}
          {primary.fieldId && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-outline-variant/10" />
              <i className="fa-solid fa-arrow-down text-[10px] text-on-surface-variant/30" />
              <div className="flex-1 h-px bg-outline-variant/10" />
            </div>
          )}

          {/* THEN section */}
          {primary.fieldId && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-tertiary px-2 py-0.5 rounded-md bg-tertiary/10">THEN</span>
              </div>

              {/* Action selector */}
              <div className="flex items-center gap-2">
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as "show" | "hide")}
                  className="px-3 py-2.5 text-sm bg-surface-container-lowest rounded-xl text-on-surface border-0 focus:ring-1 focus:ring-primary/40 outline-none"
                >
                  <option value="show">Show</option>
                  <option value="hide">Hide</option>
                </select>
                <span className="text-xs text-on-surface-variant/60">this field or step:</span>
              </div>

              {/* Target selector */}
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
