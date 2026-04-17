"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { FormSchema, StepDef, FieldDef, FieldType, PackageConfig, PackageOption, PackageFeature, PackageRule, PackageLayout, RepeaterConfig, RepeaterSubField, ShowCondition, AssetCollectionConfig, AssetCategory, SiteStructureConfig, FeatureSelectorConfig, FeatureOption, GoalBuilderConfig, GoalOption, GoalRefinement, ApprovalConfig } from "@/lib/forms";
import { PROVIDER_META, type CloudProvider } from "@/lib/cloud/providers";
import CloudDestinationButton from "@/components/CloudDestinationButton";
import { saveFormSchemaAction } from "./actions";

/* ── Field type catalogue ──────────────────────────────────── */

type FieldCategory = "general" | "web_design" | "marketing" | "smart" | "layout";

interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  group: "standard" | "advanced";
  category: FieldCategory;
  description?: string;
}

const FIELD_CATEGORIES: { id: FieldCategory; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "fa-grip" },
  { id: "smart", label: "Smart Fields", icon: "fa-wand-magic-sparkles" },
  { id: "web_design", label: "Web Design", icon: "fa-globe" },
  { id: "marketing", label: "Marketing", icon: "fa-bullhorn" },
  { id: "layout", label: "Layout & Logic", icon: "fa-table-cells" },
];

const FIELD_CATALOGUE: FieldTypeInfo[] = [
  // General
  { type: "text", label: "Short Text", icon: "fa-font", group: "standard", category: "general", description: "Single-line text input" },
  { type: "textarea", label: "Long Text", icon: "fa-align-left", group: "standard", category: "general", description: "Multi-line text area" },
  { type: "email", label: "Email", icon: "fa-envelope", group: "standard", category: "general", description: "Email with validation" },
  { type: "tel", label: "Phone", icon: "fa-phone", group: "standard", category: "general", description: "Phone number input" },
  { type: "number", label: "Number", icon: "fa-hashtag", group: "standard", category: "general", description: "Numeric input" },
  { type: "select", label: "Dropdown", icon: "fa-caret-down", group: "standard", category: "general", description: "Single-choice dropdown" },
  { type: "radio", label: "Radio Choice", icon: "fa-circle-dot", group: "standard", category: "general", description: "Single-choice radio buttons" },
  { type: "checkbox", label: "Checkbox", icon: "fa-square-check", group: "standard", category: "general", description: "Multi-choice checkboxes" },
  { type: "date", label: "Date Picker", icon: "fa-calendar", group: "standard", category: "general", description: "Date selector" },
  { type: "url", label: "URL", icon: "fa-link", group: "advanced", category: "general", description: "Website URL with validation" },
  { type: "color", label: "Color Picker", icon: "fa-palette", group: "advanced", category: "general", description: "Hex color selector" },
  { type: "address", label: "Address", icon: "fa-location-dot", group: "advanced", category: "general", description: "Multi-line address" },
  { type: "file", label: "File Upload", icon: "fa-paperclip", group: "advanced", category: "general", description: "Single file upload" },
  { type: "files", label: "Multi-File", icon: "fa-folder-open", group: "advanced", category: "general", description: "Multiple file uploads" },
  // Smart Fields
  { type: "asset_collection", label: "Asset Collection", icon: "fa-images", group: "advanced", category: "smart", description: "Collect logos, colors, fonts & docs" },
  { type: "goal_builder", label: "Goal Builder", icon: "fa-bullseye", group: "advanced", category: "smart", description: "Interactive goal picker with refinements" },
  { type: "approval", label: "Approval / Sign-off", icon: "fa-signature", group: "advanced", category: "smart", description: "Digital signature & scope approval" },
  { type: "package", label: "Package Selector", icon: "fa-box-open", group: "advanced", category: "smart", description: "Pricing & package comparison" },
  // Web Design
  { type: "site_structure", label: "Site Structure", icon: "fa-sitemap", group: "advanced", category: "web_design", description: "Visual sitemap builder" },
  { type: "feature_selector", label: "Feature Selector", icon: "fa-puzzle-piece", group: "advanced", category: "web_design", description: "Toggle features with price impact" },
  { type: "repeater", label: "Repeater / Pages", icon: "fa-layer-group", group: "advanced", category: "web_design", description: "Repeatable entry groups" },
  // Marketing (placeholder — existing fields that fit)
  // Layout & Logic
  { type: "heading", label: "Section Heading", icon: "fa-heading", group: "advanced", category: "layout", description: "Display-only section header" },
  { type: "consent", label: "Consent / Terms", icon: "fa-file-contract", group: "advanced", category: "layout", description: "Agreement with checkbox" },
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
  if (type === "repeater") {
    base.repeaterConfig = {
      subFields: [
        { id: `sf_${uid()}`, type: "select", label: "Page Type", required: true, options: ["Home", "About Us", "Services", "Contact", "Blog", "Portfolio/Gallery", "FAQ", "Testimonials", "Team", "Pricing", "Shop/Products", "Custom Page"] },
        { id: `sf_${uid()}`, type: "textarea", label: "What is the main purpose of this page?", required: true, placeholder: "What should visitors learn, feel, or do on this page?", rows: 3 },
        { id: `sf_${uid()}`, type: "text", label: "Primary Call-to-Action", placeholder: 'e.g. "Schedule a consultation"' },
      ],
      minEntries: 1,
      maxEntries: 20,
      addButtonLabel: "Add Page",
      entryLabel: "Page",
    };
    base.label = "Which pages will your site have?";
  }
  if (type === "consent") {
    base.label = "Terms & Conditions";
    base.required = true;
    base.consentText = "Please read and agree to our terms and conditions before proceeding.\n\nBy submitting this form you acknowledge that the information provided is accurate and complete to the best of your knowledge.";
    base.consentCheckboxLabel = "I have read and agree to the terms above";
  }
  if (type === "asset_collection") {
    base.label = "Brand Assets";
    base.assetCollectionConfig = {
      categories: ["logos", "colors", "fonts", "documents", "images"],
      maxFiles: 50,
      allowCloudConnect: true,
    };
  }
  if (type === "site_structure") {
    base.label = "Website Structure";
    base.siteStructureConfig = {
      starterPages: [
        { id: `pg_${uid()}`, name: "Home" },
        { id: `pg_${uid()}`, name: "About" },
        { id: `pg_${uid()}`, name: "Services" },
        { id: `pg_${uid()}`, name: "Contact" },
      ],
      maxPages: 30,
      allowNesting: true,
    };
  }
  if (type === "feature_selector") {
    base.label = "What features do you need?";
    base.featureSelectorConfig = {
      features: [
        { id: `ft_${uid()}`, name: "Contact Form", description: "Let visitors reach out", icon: "fa-envelope", complexity: "Simple", priceImpact: "Included", category: "Core" },
        { id: `ft_${uid()}`, name: "Blog / News", description: "Publish articles and updates", icon: "fa-newspaper", complexity: "Medium", priceImpact: "+$300", category: "Content" },
        { id: `ft_${uid()}`, name: "E-commerce / Shop", description: "Sell products online", icon: "fa-cart-shopping", complexity: "Complex", priceImpact: "+$1,500", category: "Commerce" },
        { id: `ft_${uid()}`, name: "Booking System", description: "Schedule appointments", icon: "fa-calendar-check", complexity: "Medium", priceImpact: "+$500", category: "Core" },
        { id: `ft_${uid()}`, name: "Members Area", description: "Gated content for members", icon: "fa-users", complexity: "Complex", priceImpact: "+$800", category: "Commerce" },
        { id: `ft_${uid()}`, name: "Photo Gallery", description: "Showcase images and portfolios", icon: "fa-images", complexity: "Simple", priceImpact: "+$200", category: "Content" },
      ],
      maxSelections: 0,
      showPriceImpact: true,
      showComplexity: true,
    };
  }
  if (type === "goal_builder") {
    base.label = "What are your primary goals?";
    base.goalBuilderConfig = {
      goals: [
        {
          id: `goal_${uid()}`, label: "Generate Leads", icon: "fa-magnet",
          refinements: [
            { id: `ref_${uid()}`, label: "Monthly lead target", type: "select", options: ["Under 50", "50-200", "200-500", "500+"] },
            { id: `ref_${uid()}`, label: "Monthly budget", type: "range", min: 500, max: 10000, step: 500, prefix: "$" },
          ],
        },
        {
          id: `goal_${uid()}`, label: "Sell Products / Services", icon: "fa-cart-shopping",
          refinements: [
            { id: `ref_${uid()}`, label: "Monthly revenue target", type: "select", options: ["Under $5K", "$5K-$25K", "$25K-$100K", "$100K+"] },
            { id: `ref_${uid()}`, label: "Number of products", type: "select", options: ["1-10", "11-50", "51-200", "200+"] },
          ],
        },
        {
          id: `goal_${uid()}`, label: "Build Brand Awareness", icon: "fa-bullhorn",
          refinements: [
            { id: `ref_${uid()}`, label: "Target audience size", type: "select", options: ["Local", "Regional", "National", "International"] },
            { id: `ref_${uid()}`, label: "Timeline", type: "select", options: ["1-3 months", "3-6 months", "6-12 months", "Ongoing"] },
          ],
        },
      ],
      allowMultiple: false,
    };
  }
  if (type === "approval") {
    base.label = "Approve & Sign Off";
    base.required = true;
    base.approvalConfig = {
      scopeText: "Please review the information above and confirm everything is accurate. By signing below, you approve the project scope as described.",
      requireSignature: true,
      requireFullName: true,
      approveLabel: "I Approve",
    };
  }
  return base;
}

function makeStep(): StepDef {
  return { id: `step_${uid()}`, title: "New Step", description: "", fields: [] };
}

/* ── Drag payload types ────────────────────────────────────── */

type DragPayload =
  | { kind: "palette"; fieldType: FieldType; label: string }
  | { kind: "field"; sourceStepId: string; fieldId: string }
  | { kind: "step"; stepId: string };

/* ── Input classes ─────────────────────────────────────────── */

const INPUT_CLS =
  "block w-full px-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none transition-all";

/* ── Main editor ───────────────────────────────────────────── */

export default function FormEditor({ initialSchema, onOpenTemplates, formId }: { initialSchema: FormSchema; onOpenTemplates?: () => void; formId?: string }) {
  const [schema, setSchemaRaw] = useState<FormSchema>(initialSchema);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(initialSchema.steps.map((s) => s.id)),
  );
  /* Mobile panel toggle: "palette" | "canvas" | "settings" */
  const [mobilePanel, setMobilePanel] = useState<"palette" | "canvas" | "settings">("canvas");

  const dragPayload = useRef<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<{ stepId: string; index: number } | null>(null);
  const [stepDropTarget, setStepDropTarget] = useState<number | null>(null);

  /* ── Undo / Redo history ───────────────────────────────── */
  const MAX_HISTORY = 50;
  const historyRef = useRef<string[]>([JSON.stringify(initialSchema)]);
  const historyIdxRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const setSchema = useCallback((next: FormSchema | ((prev: FormSchema) => FormSchema)) => {
    setSchemaRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      const json = JSON.stringify(resolved);
      // Only push if actually different from current position
      if (json !== historyRef.current[historyIdxRef.current]) {
        // Truncate any future states (if we undid and then made a new change)
        historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
        historyRef.current.push(json);
        // Cap the history size
        if (historyRef.current.length > MAX_HISTORY) {
          historyRef.current = historyRef.current.slice(-MAX_HISTORY);
        }
        historyIdxRef.current = historyRef.current.length - 1;
      }
      setCanUndo(historyIdxRef.current > 0);
      setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
      return resolved;
    });
  }, []);

  function undo() {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current--;
    const prev = JSON.parse(historyRef.current[historyIdxRef.current]) as FormSchema;
    setSchemaRaw(prev);
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(true);
    setMessage(null);
  }

  function redo() {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current++;
    const next = JSON.parse(historyRef.current[historyIdxRef.current]) as FormSchema;
    setSchemaRaw(next);
    setCanUndo(true);
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1);
    setMessage(null);
  }

  // Keyboard shortcuts: Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z for redo
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
      if (mod && e.key === "y") { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const updateSteps = useCallback((fn: (steps: StepDef[]) => StepDef[]) => {
    setSchema((prev) => ({ steps: fn([...prev.steps]) }));
    setMessage(null);
  }, [setSchema]);

  const selectedStep = schema.steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedField = selectedStep?.fields.find((f) => f.id === selectedFieldId) ?? null;

  function selectField(stepId: string, fieldId: string) {
    setSelectedStepId(stepId);
    setSelectedFieldId(fieldId);
    setMobilePanel("settings");
  }
  function selectStep(stepId: string) {
    setSelectedStepId(stepId);
    setSelectedFieldId(null);
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
  function startDragStep(stepId: string) {
    dragPayload.current = { kind: "step", stepId };
  }
  function handleDragOverStepSlot(e: React.DragEvent, index: number) {
    if (dragPayload.current?.kind !== "step") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setStepDropTarget(index);
  }
  function handleDropStep(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragPayload.current;
    if (!payload || payload.kind !== "step") return;
    updateSteps((steps) => {
      const oldIdx = steps.findIndex((s) => s.id === payload.stepId);
      if (oldIdx < 0) return steps;
      const [moved] = steps.splice(oldIdx, 1);
      const insertAt = oldIdx < index ? index - 1 : index;
      steps.splice(insertAt, 0, moved);
      return steps;
    });
    dragPayload.current = null;
    setStepDropTarget(null);
  }
  function handleDragEnd() {
    dragPayload.current = null;
    setDropTarget(null);
    setStepDropTarget(null);
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
    } else if (payload.kind === "field") {
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

  /* ── Export / Import ────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = JSON.stringify(schema, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-schema-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as FormSchema;
        if (!parsed.steps || !Array.isArray(parsed.steps)) {
          setMessage({ kind: "err", text: "Invalid form schema. Missing steps array." });
          return;
        }
        setSchema(parsed);
        setExpandedSteps(new Set(parsed.steps.map((s) => s.id)));
        clearSelection();
        setMessage({ kind: "ok", text: `Imported ${parsed.steps.length} steps!` });
      } catch {
        setMessage({ kind: "err", text: "Failed to parse JSON file." });
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await saveFormSchemaAction(JSON.stringify(schema), formId);
    setSaving(false);
    setMessage(result.ok ? { kind: "ok", text: "Form saved!" } : { kind: "err", text: result.error ?? "Save failed." });
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Top bar with title + save ──────────────────────── */}
      <div className="shrink-0 px-6 lg:px-8 py-4 border-b border-outline-variant/10 bg-surface-container-low/50 flex items-center justify-between gap-4">
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
          {/* Undo / Redo */}
          <div className="hidden sm:flex items-center gap-1 border-r border-outline-variant/20 pr-3 mr-1">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface-variant transition-colors rounded-lg hover:bg-on-surface/5"
            >
              <i className="fa-solid fa-rotate-left text-sm" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Shift+Z)"
              className="p-2 text-on-surface-variant hover:text-primary disabled:opacity-30 disabled:hover:text-on-surface-variant transition-colors rounded-lg hover:bg-on-surface/5"
            >
              <i className="fa-solid fa-rotate-right text-sm" />
            </button>
          </div>
          {/* Import / Export */}
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/20 rounded-lg hover:text-primary hover:border-primary/30 transition-all whitespace-nowrap hidden sm:flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-import text-[10px]" /> Import
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/20 rounded-lg hover:text-primary hover:border-primary/30 transition-all whitespace-nowrap hidden sm:flex items-center gap-1.5"
          >
            <i className="fa-solid fa-file-export text-[10px]" /> Export
          </button>
          {onOpenTemplates && (
            <button
              onClick={onOpenTemplates}
              className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface-variant border border-outline-variant/20 rounded-lg hover:text-primary hover:border-primary/30 transition-all whitespace-nowrap hidden sm:block"
            >
              Templates
            </button>
          )}
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-primary text-on-primary font-bold rounded-lg text-sm hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] disabled:opacity-60 transition-all whitespace-nowrap"
          >
            {saving ? "Saving..." : "Save"}
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
          <div className="p-6">
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
                const isStepSelected = selectedStepId === step.id && !selectedFieldId;
                const isStepDropBefore = stepDropTarget === si;
                return (
                  <div key={step.id} className="relative flex flex-col items-center">
                    {/* Step drop indicator */}
                    {isStepDropBefore && (
                      <div className="w-full h-1 bg-primary rounded-full mb-2" />
                    )}
                    <div
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; startDragStep(step.id); }}
                      onDragOver={(e) => handleDragOverStepSlot(e, si)}
                      onDrop={(e) => handleDropStep(e, si)}
                      onDragEnd={handleDragEnd}
                      className={`w-full bg-surface-container border rounded-2xl shadow-lg shadow-black/10 overflow-hidden transition-all ${
                        isStepSelected
                          ? "border-primary/40 ring-1 ring-primary/20"
                          : "border-outline-variant/15"
                      }`}
                    >
                      {/* Step header */}
                      <div
                        className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-4 cursor-grab active:cursor-grabbing"
                        onClick={() => selectStep(step.id)}
                      >
                        <div className="text-on-surface-variant/40 hover:text-on-surface-variant select-none shrink-0">
                          <i className="fa-solid fa-grip-vertical text-[10px]" />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); toggleStep(step.id); }} className="text-on-surface-variant hover:text-on-surface text-sm w-5 shrink-0">
                          <i className={`fa-solid ${isExpanded ? "fa-chevron-down" : "fa-chevron-right"} text-[10px]`} />
                        </button>
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-on-primary font-bold shrink-0">
                          {si + 1}
                        </div>
                        <span className="text-sm font-bold text-on-surface flex-1 min-w-0 truncate select-none">
                          {step.title || "Untitled Step"}
                        </span>
                        {step.showCondition?.fieldId && (
                          <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 shrink-0" title="This page has a visibility condition">
                            <i className="fa-solid fa-eye text-[8px] mr-0.5" /> Conditional
                          </span>
                        )}
                        <span className="text-xs text-on-surface-variant/60 whitespace-nowrap shrink-0 hidden sm:inline">
                          {step.fields.length} field{step.fields.length !== 1 ? "s" : ""}
                        </span>
                        <button disabled={schema.steps.length <= 1} onClick={(e) => { e.stopPropagation(); removeStep(step.id); }} className="p-1 text-on-surface-variant hover:text-error disabled:opacity-30 shrink-0" aria-label="Remove step"><i className="fa-solid fa-xmark text-xs" aria-hidden="true" /></button>
                      </div>

                      {/* Step body */}
                      {isExpanded && (
                        <div
                          className="px-4 sm:px-6 pb-5 space-y-2"
                          onDragOver={(e) => handleDragOverStep(e, step.id)}
                          onDrop={(e) => handleDrop(e, step.id, step.fields.length)}
                        >
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
                                      {field.showCondition?.fieldId && <span className="ml-1 text-amber-400 font-medium">&middot; <i className="fa-solid fa-eye text-[9px]" /> Conditional</span>}
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

              {/* Drop zone after last step */}
              {stepDropTarget === schema.steps.length && (
                <div className="w-full h-1 bg-primary rounded-full" />
              )}
              <div
                onDragOver={(e) => handleDragOverStepSlot(e, schema.steps.length)}
                onDrop={(e) => handleDropStep(e, schema.steps.length)}
                className="w-full"
              >
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
        </div>

        {/* RIGHT: Settings / Field Inspector */}
        <div className={`
          w-full lg:w-72 xl:w-80 shrink-0 bg-surface-container-low/50 overflow-y-auto border-l border-outline-variant/10
          ${mobilePanel === "settings" ? "block" : "hidden"} lg:block
        `}>
          <div className="p-6">
            {selectedField && selectedStep ? (
              <FieldSettingsPanel
                field={selectedField}
                onUpdate={(patch) => updateField(selectedStepId!, selectedFieldId!, patch)}
                onClose={clearSelection}
                allFields={schema.steps.flatMap((s) => s.fields)}
              />
            ) : selectedStep && !selectedFieldId ? (
              <StepSettingsPanel
                step={selectedStep}
                onUpdate={(patch) => updateStepMeta(selectedStep.id, patch)}
                onDelete={() => removeStep(selectedStep.id)}
                onClose={clearSelection}
                allFields={schema.steps.flatMap((s) => s.fields)}
                canDelete={schema.steps.length > 1}
              />
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Quick Info</div>
                <div className="glass-panel rounded-xl p-4 border border-outline-variant/10">
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Click a field on the canvas to edit its settings here. Click a page header to configure page settings. Drag fields from the left panel to add them to steps.
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
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FieldCategory | "all">("all");

  const filtered = FIELD_CATALOGUE.filter((f) => {
    const matchesSearch = !search || f.label.toLowerCase().includes(search.toLowerCase()) || (f.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || f.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const grouped = FIELD_CATEGORIES.map((cat) => ({
    ...cat,
    fields: filtered.filter((f) => f.category === cat.id),
  })).filter((g) => g.fields.length > 0);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-xs" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fields..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${activeCategory === "all" ? "bg-primary text-on-primary" : "bg-surface-container-high/50 text-on-surface-variant/60 hover:text-on-surface"}`}
        >
          All
        </button>
        {FIELD_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeCategory === cat.id ? "bg-primary text-on-primary" : "bg-surface-container-high/50 text-on-surface-variant/60 hover:text-on-surface"}`}
          >
            <FaIcon name={cat.icon} className="text-[9px]" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Field list grouped by category */}
      {activeCategory === "all" && !search ? (
        grouped.map((group) => (
          <div key={group.id} className="mb-4">
            <h3 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FaIcon name={group.icon} className="text-[9px]" />
              {group.label}
            </h3>
            <div className="space-y-1.5">
              {group.fields.map((f) => (
                <button
                  key={f.type}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(f.type, f.label); }}
                  onClick={() => onClickAdd(f.type, f.label)}
                  className="w-full p-2 bg-surface-container rounded-xl border border-outline-variant/10 cursor-grab hover:border-primary/40 hover:bg-surface-container-high transition-all flex items-center gap-2.5 group"
                >
                  <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors text-xs shrink-0">
                    <FaIcon name={f.icon} />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <span className="text-sm font-medium text-on-surface block truncate">{f.label}</span>
                    {f.description && <span className="text-[10px] text-on-surface-variant/50 block truncate">{f.description}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-xs text-on-surface-variant/50 text-center py-4">No fields match your search</p>
          )}
          {filtered.map((f) => (
            <button
              key={f.type}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(f.type, f.label); }}
              onClick={() => onClickAdd(f.type, f.label)}
              className="w-full p-2 bg-surface-container rounded-xl border border-outline-variant/10 cursor-grab hover:border-primary/40 hover:bg-surface-container-high transition-all flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors text-xs shrink-0">
                <FaIcon name={f.icon} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <span className="text-sm font-medium text-on-surface block truncate">{f.label}</span>
                {f.description && <span className="text-[10px] text-on-surface-variant/50 block truncate">{f.description}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Field settings panel ──────────────────────────────────── */

function FieldSettingsPanel({ field, onUpdate, onClose, allFields }: {
  field: FieldDef;
  onUpdate: (patch: Partial<FieldDef>) => void;
  onClose: () => void;
  allFields: FieldDef[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <FaIcon name={iconFor(field.type)} className="text-primary text-lg" />
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex-1">Field Settings</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 transition-colors" aria-label="Close field settings"><i className="fa-solid fa-xmark text-xs" aria-hidden="true" /></button>
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

            {/* Cloud storage destination */}
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pt-2">Cloud Storage</div>
            {field.cloudDestination ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-surface-container-highest/30 border border-outline-variant/10">
                <i className={`${PROVIDER_META[field.cloudDestination.provider as CloudProvider]?.icon ?? "fa-solid fa-cloud"} ${PROVIDER_META[field.cloudDestination.provider as CloudProvider]?.color ?? "text-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-on-surface truncate">{field.cloudDestination.folderPath}</div>
                  <div className="text-[10px] text-on-surface-variant/60">{PROVIDER_META[field.cloudDestination.provider as CloudProvider]?.displayName ?? field.cloudDestination.provider}</div>
                </div>
                <button
                  onClick={() => onUpdate({ cloudDestination: undefined })}
                  className="text-error/60 hover:text-error text-xs shrink-0"
                  title="Remove cloud destination"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ) : (
              <CloudDestinationButton
                onSelect={(dest) => onUpdate({ cloudDestination: dest })}
              />
            )}
          </section>
        )}

        {field.type === "package" && field.packageConfig && (
          <PackageSettingsPanel config={field.packageConfig} onUpdate={(cfg) => onUpdate({ packageConfig: cfg })} />
        )}

        {field.type === "repeater" && field.repeaterConfig && (
          <RepeaterSettingsPanel config={field.repeaterConfig} onUpdate={(cfg) => onUpdate({ repeaterConfig: cfg })} />
        )}

        {field.type === "consent" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Consent Configuration</div>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Agreement Text</span>
              <textarea
                value={field.consentText ?? ""}
                onChange={(e) => onUpdate({ consentText: e.target.value })}
                placeholder="Enter the terms, privacy policy, or agreement text that users must read before consenting..."
                rows={8}
                className={INPUT_CLS}
              />
              <span className="text-[9px] text-on-surface-variant/50 mt-0.5 block">This text will appear in a scrollable box. Users must scroll through it before checking the consent box.</span>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Checkbox Label</span>
              <input
                value={field.consentCheckboxLabel ?? ""}
                onChange={(e) => onUpdate({ consentCheckboxLabel: e.target.value || undefined })}
                placeholder='e.g. "I have read and agree to the terms above"'
                className={INPUT_CLS}
              />
            </label>
          </section>
        )}

        {/* ââ Asset Collection Settings ââ */}
        {field.type === "asset_collection" && field.assetCollectionConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Asset Collection</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Files</span>
              <input type="number" min={1} value={field.assetCollectionConfig.maxFiles} onChange={e => onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, maxFiles: +e.target.value } })} className={INPUT_CLS} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Allow Cloud Connect</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.assetCollectionConfig.allowCloudConnect} onChange={e => onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, allowCloudConnect: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Categories</span>
              <div className="space-y-1.5">
                {field.assetCollectionConfig.categories?.map((cat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={cat} onChange={e => { const cats = [...field.assetCollectionConfig!.categories!]; cats[i] = e.target.value as AssetCategory; onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, categories: cats } }); }} className={INPUT_CLS} />
                    <button onClick={() => { const cats = field.assetCollectionConfig!.categories!.filter((_, j) => j !== i); onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, categories: cats } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, categories: [...field.assetCollectionConfig!.categories!, "other" as AssetCategory] } })} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2"><i className="fa-solid fa-plus text-[9px]" /> Add Category</button>
            </div>
          </section>
        )}

        {/* ââ Site Structure Settings ââ */}
        {field.type === "site_structure" && field.siteStructureConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Site Structure</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Pages</span>
              <input type="number" min={1} value={field.siteStructureConfig.maxPages} onChange={e => onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, maxPages: +e.target.value } })} className={INPUT_CLS} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Allow Nesting</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.siteStructureConfig.allowNesting} onChange={e => onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, allowNesting: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Starter Pages</span>
              <div className="space-y-1.5">
                {field.siteStructureConfig.starterPages?.map((page, i) => (
                  <div key={page.id} className="flex items-center gap-2">
                    <input value={page.name} onChange={e => { const pages = [...field.siteStructureConfig!.starterPages!]; pages[i] = { ...pages[i], name: e.target.value }; onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: pages } }); }} className={INPUT_CLS} placeholder="Page name" />
                    <button onClick={() => { const pages = field.siteStructureConfig!.starterPages!.filter((_, j) => j !== i); onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: pages } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: [...field.siteStructureConfig!.starterPages!, { id: uid(), name: "" }] } })} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2"><i className="fa-solid fa-plus text-[9px]" /> Add Starter Page</button>
            </div>
          </section>
        )}

        {/* ââ Feature Selector Settings ââ */}
        {field.type === "feature_selector" && field.featureSelectorConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Feature Selector</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Selections (0 = unlimited)</span>
              <input type="number" min={0} value={field.featureSelectorConfig.maxSelections} onChange={e => onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, maxSelections: +e.target.value } })} className={INPUT_CLS} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Show Price Impact</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.featureSelectorConfig.showPriceImpact} onChange={e => onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, showPriceImpact: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Show Complexity</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.featureSelectorConfig.showComplexity} onChange={e => onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, showComplexity: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Features</span>
              <div className="space-y-2">
                {field.featureSelectorConfig.features?.map((feat, i) => (
                  <div key={feat.id} className="p-2.5 bg-surface-container rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input value={feat.name} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], name: e.target.value }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={INPUT_CLS} placeholder="Feature name" />
                      <button onClick={() => { const features = field.featureSelectorConfig!.features!.filter((_, j) => j !== i); onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0"><i className="fa-solid fa-xmark" /></button>
                    </div>
                    <input value={feat.description} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], description: e.target.value }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={INPUT_CLS} placeholder="Description" />
                    <div className="flex gap-2">
                      <input value={feat.icon} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], icon: e.target.value }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={`${INPUT_CLS} flex-1`} placeholder="Icon (fa-...)" />
                      <input value={feat.category} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], category: e.target.value }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={`${INPUT_CLS} flex-1`} placeholder="Category" />
                    </div>
                    <div className="flex gap-2">
                      <select value={feat.complexity} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], complexity: e.target.value as "Simple" | "Medium" | "Complex" }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={INPUT_CLS}>
                        <option value="Simple">Simple</option>
                        <option value="Medium">Medium</option>
                        <option value="Complex">Complex</option>
                      </select>
                      <input value={feat.priceImpact} onChange={e => { const features = [...field.featureSelectorConfig!.features!]; features[i] = { ...features[i], priceImpact: e.target.value }; onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features } }); }} className={INPUT_CLS} placeholder="Price impact" />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ featureSelectorConfig: { ...field.featureSelectorConfig!, features: [...field.featureSelectorConfig!.features!, { id: uid(), name: "", description: "", icon: "fa-puzzle-piece", complexity: "Simple" as const, priceImpact: "", category: "" }] } })} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2"><i className="fa-solid fa-plus text-[9px]" /> Add Feature</button>
            </div>
          </section>
        )}

        {/* ââ Goal Builder Settings ââ */}
        {field.type === "goal_builder" && field.goalBuilderConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Goal Builder</div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Allow Multiple Goals</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.goalBuilderConfig.allowMultiple} onChange={e => onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, allowMultiple: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Goals</span>
              <div className="space-y-2">
                {field.goalBuilderConfig.goals?.map((goal, gi) => (
                  <div key={goal.id} className="p-2.5 bg-surface-container rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input value={goal.icon} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; goals[gi] = { ...goals[gi], icon: e.target.value }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Icon (fa-...)" style={{ maxWidth: 100 }} />
                      <input value={goal.label} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; goals[gi] = { ...goals[gi], label: e.target.value }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Goal label" />
                      <button onClick={() => { const goals = field.goalBuilderConfig!.goals!.filter((_, j) => j !== gi); onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0"><i className="fa-solid fa-xmark" /></button>
                    </div>
                    <div className="pl-3 border-l border-outline-variant/20 space-y-1.5 mt-1">
                      <span className="text-[10px] font-medium text-on-surface-variant/60 uppercase tracking-wider">Refinements</span>
                      {goal.refinements?.map((ref, ri) => (
                        <div key={ref.id} className="flex items-start gap-2">
                          <div className="flex-1 space-y-1">
                            <input value={ref.label} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], label: e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Refinement label" />
                            <div className="flex gap-1.5">
                              <select value={ref.type} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], type: e.target.value as "select" | "range" | "text" | "number" }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS}>
                                <option value="select">Select</option>
                                <option value="range">Range</option>
                                <option value="text">Text</option>
                              </select>
                              {ref.type === "select" && (
                                <input value={(ref.options || []).join(", ")} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Options (comma-separated)" />
                              )}
                              {ref.type === "range" && (
                                <>
                                  <input type="number" value={ref.min ?? 0} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], min: +e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Min" />
                                  <input type="number" value={ref.max ?? 100} onChange={e => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], max: +e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className={INPUT_CLS} placeholder="Max" />
                                </>
                              )}
                            </div>
                          </div>
                          <button onClick={() => { const goals = [...field.goalBuilderConfig!.goals!]; const refs = goals[gi].refinements!.filter((_, j) => j !== ri); goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0 mt-1"><i className="fa-solid fa-xmark" /></button>
                        </div>
                      ))}
                      <button onClick={() => { const goals = [...field.goalBuilderConfig!.goals!]; goals[gi] = { ...goals[gi], refinements: [...goals[gi].refinements!, { id: uid(), label: "", type: "select" as const, options: [] }] }; onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals } }); }} className="w-full py-1.5 border border-dashed border-outline-variant/20 rounded text-[10px] text-on-surface-variant/60 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1"><i className="fa-solid fa-plus text-[8px]" /> Add Refinement</button>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ goalBuilderConfig: { ...field.goalBuilderConfig!, goals: [...field.goalBuilderConfig!.goals!, { id: uid(), label: "", icon: "fa-bullseye", refinements: [] }] } })} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2"><i className="fa-solid fa-plus text-[9px]" /> Add Goal</button>
            </div>
          </section>
        )}

        {/* ââ Approval / Sign-off Settings ââ */}
        {field.type === "approval" && field.approvalConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Approval / Sign-off</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Scope Text</span>
              <textarea value={field.approvalConfig.scopeText} onChange={e => onUpdate({ approvalConfig: { ...field.approvalConfig!, scopeText: e.target.value } })} className={INPUT_CLS} rows={3} placeholder="Describe what the client is approving..." />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Approve Button Label</span>
              <input value={field.approvalConfig.approveLabel} onChange={e => onUpdate({ approvalConfig: { ...field.approvalConfig!, approveLabel: e.target.value } })} className={INPUT_CLS} placeholder='e.g. "I Approve This Scope"' />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Require Signature</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.approvalConfig.requireSignature} onChange={e => onUpdate({ approvalConfig: { ...field.approvalConfig!, requireSignature: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Require Full Name</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.approvalConfig.requireFullName} onChange={e => onUpdate({ approvalConfig: { ...field.approvalConfig!, requireFullName: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
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
          <ConditionBuilder
            condition={field.showCondition}
            onChange={(c) => onUpdate({ showCondition: c })}
            allFields={allFields}
            excludeFieldId={field.id}
            label="Show field when"
          />
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
  const [activeTab, setActiveTab] = useState<"packages" | "features" | "rules" | "layout">("packages");

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
    { key: "layout" as const, label: "Layout", icon: "fa-table-columns" },
    { key: "rules" as const, label: "Rules", icon: "fa-wand-magic-sparkles" },
  ];

  const [expandedPkg, setExpandedPkg] = useState<string | null>(config.packages[0]?.id ?? null);

  return (
    <section className="space-y-3">
      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Package Configuration</div>

      {/* Icon tabs — compact pill bar */}
      <div className="flex bg-surface-container rounded-lg p-0.5 gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            title={t.label}
            className={`flex-1 flex items-center justify-center gap-1.5 px-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${
              activeTab === t.key
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant/50 hover:text-on-surface-variant"
            }`}
          >
            <i className={`fa-solid ${t.icon} text-[10px]`} />
            <span className="hidden min-[320px]:inline truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Packages tab ── */}
      {activeTab === "packages" && (
        <div className="space-y-1.5">
          {config.packages.map((pkg) => {
            const isOpen = expandedPkg === pkg.id;
            const priceLabel = pkg.hidePrice
              ? (pkg.priceLabel || "Custom")
              : pkg.price === 0 ? "Free" : `$${pkg.price}/mo`;
            return (
              <div key={pkg.id} className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => setExpandedPkg(isOpen ? null : pkg.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-container-highest/20 transition-colors"
                >
                  <i className={`fa-solid fa-chevron-right text-[8px] text-on-surface-variant/40 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  <span className="text-xs font-bold text-on-surface flex-1 truncate">{pkg.name || "Untitled"}</span>
                  <span className="text-[10px] text-on-surface-variant/60 shrink-0">{priceLabel}</span>
                  {pkg.badge && (
                    <span className="text-[8px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold shrink-0">{pkg.badge}</span>
                  )}
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 border-t border-outline-variant/10">
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        value={pkg.name}
                        onChange={(e) => updatePackage(pkg.id, { name: e.target.value })}
                        className={`${INPUT_CLS} text-xs font-bold flex-1`}
                        placeholder="Package name"
                      />
                      <button
                        onClick={() => removePackage(pkg.id)}
                        disabled={config.packages.length <= 1}
                        className="p-1.5 text-on-surface-variant/40 hover:text-error disabled:opacity-30 shrink-0"
                        title="Delete package"
                      >
                        <i className="fa-solid fa-trash text-[10px]" />
                      </button>
                    </div>

                    {/* Price row */}
                    <div className="flex items-center gap-2">
                      {pkg.hidePrice ? (
                        <label className="flex-1">
                          <span className="text-[10px] text-on-surface-variant mb-0.5 block">Price label</span>
                          <input
                            value={pkg.priceLabel ?? ""}
                            onChange={(e) => updatePackage(pkg.id, { priceLabel: e.target.value || undefined })}
                            placeholder="e.g. Custom"
                            className={`${INPUT_CLS} text-xs`}
                          />
                        </label>
                      ) : (
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
                      )}
                      <label className="flex items-center gap-1.5 pt-3 shrink-0 cursor-pointer" title="Hide price on card">
                        <input type="checkbox" checked={!!pkg.hidePrice} onChange={(e) => updatePackage(pkg.id, { hidePrice: e.target.checked })} className="sr-only peer" />
                        <div className="relative w-7 h-3.5 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors">
                          <div className="absolute left-0.5 top-0.5 w-2.5 h-2.5 bg-on-surface-variant rounded-full peer-checked:translate-x-3.5 peer-checked:bg-on-primary transition-all" />
                        </div>
                        <span className="text-[9px] text-on-surface-variant/60">Hide</span>
                      </label>
                    </div>

                    {/* Badge + Tagline in one row */}
                    <div className="flex gap-2">
                      <label className="flex-1 min-w-0">
                        <span className="text-[10px] text-on-surface-variant mb-0.5 block">Badge</span>
                        <input
                          value={pkg.badge ?? ""}
                          onChange={(e) => updatePackage(pkg.id, { badge: e.target.value || undefined })}
                          placeholder="Popular"
                          className={`${INPUT_CLS} text-xs`}
                        />
                      </label>
                      <label className="flex-[2] min-w-0">
                        <span className="text-[10px] text-on-surface-variant mb-0.5 block">Tagline</span>
                        <input
                          value={pkg.description ?? ""}
                          onChange={(e) => updatePackage(pkg.id, { description: e.target.value || undefined })}
                          placeholder="Best for small teams"
                          className={`${INPUT_CLS} text-xs`}
                        />
                      </label>
                    </div>

                    {/* Description */}
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant mb-0.5 block">Description</span>
                      <textarea
                        value={pkg.longDescription ?? ""}
                        onChange={(e) => updatePackage(pkg.id, { longDescription: e.target.value || undefined })}
                        placeholder="Detailed description..."
                        rows={2}
                        className={`${INPUT_CLS} text-xs`}
                      />
                    </label>

                    {/* Feature list */}
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant mb-0.5 block">Features (one per line)</span>
                      <textarea
                        value={(pkg.featureList ?? []).join("\n")}
                        onChange={(e) => updatePackage(pkg.id, { featureList: e.target.value.split("\n").filter((l) => l.trim()) })}
                        placeholder={"5 pages\nCustom domain\n24/7 support"}
                        rows={3}
                        className={`${INPUT_CLS} text-xs font-mono`}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addPackage}
            className="w-full py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Package
          </button>
        </div>
      )}

      {/* ── Features tab — compact grid ── */}
      {activeTab === "features" && (
        <div className="space-y-3">
          <p className="text-[10px] text-on-surface-variant/60">Toggle or set custom values per package.</p>

          {/* Grid table */}
          {config.features.length > 0 && (
            <div className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
              {/* Header row with package names */}
              <div className="flex items-center border-b border-outline-variant/10 bg-surface-container-highest/20">
                <div className="flex-1 px-2.5 py-1.5 text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Feature</div>
                {config.packages.map((pkg) => (
                  <div key={pkg.id} className="w-14 shrink-0 text-center px-1 py-1.5 text-[9px] font-bold text-on-surface-variant truncate" title={pkg.name}>
                    {pkg.name.length > 6 ? pkg.name.slice(0, 6) + "…" : pkg.name}
                  </div>
                ))}
                <div className="w-7 shrink-0" />
              </div>

              {/* Feature rows */}
              {config.features.map((feature, fi) => (
                <div key={fi} className={`flex items-center ${fi < config.features.length - 1 ? "border-b border-outline-variant/5" : ""} group hover:bg-surface-container-highest/10`}>
                  <div className="flex-1 min-w-0 px-2.5 py-1.5">
                    <input
                      value={feature.label}
                      onChange={(e) => updateFeatureLabel(fi, e.target.value)}
                      className="w-full bg-transparent text-[11px] text-on-surface outline-none placeholder:text-on-surface-variant/30"
                      placeholder="Feature name"
                    />
                  </div>
                  {config.packages.map((pkg) => {
                    const val = feature.values[pkg.id];
                    const isText = typeof val === "string";
                    return (
                      <div key={pkg.id} className="w-14 shrink-0 flex items-center justify-center px-0.5">
                        {isText ? (
                          <input
                            value={val}
                            onChange={(e) => updateFeatureValue(fi, pkg.id, e.target.value)}
                            onContextMenu={(e) => { e.preventDefault(); updateFeatureValue(fi, pkg.id, true); }}
                            placeholder="—"
                            className="w-full text-center text-[9px] bg-transparent border-b border-outline-variant/20 text-on-surface outline-none py-0.5 focus:border-primary"
                            title="Right-click to switch to checkmark"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateFeatureValue(fi, pkg.id, !val)}
                            onContextMenu={(e) => { e.preventDefault(); updateFeatureValue(fi, pkg.id, ""); }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              val ? "bg-primary/15 text-primary" : "bg-surface-container-highest/30 text-on-surface-variant/20"
                            }`}
                            title={val ? "Included — right-click for custom text" : "Not included — right-click for custom text"}
                          >
                            <i className={`fa-solid ${val ? "fa-check" : "fa-minus"} text-[8px]`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <div className="w-7 shrink-0 flex items-center justify-center">
                    <button
                      onClick={() => removeFeature(fi)}
                      className="p-0.5 text-on-surface-variant/0 group-hover:text-on-surface-variant/40 hover:!text-error transition-colors"
                      title="Remove feature"
                    >
                      <i className="fa-solid fa-xmark text-[9px]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tip for switching to custom text */}
          {config.features.length > 0 && (
            <p className="text-[9px] text-on-surface-variant/40 leading-snug">
              <i className="fa-solid fa-circle-info text-[8px] mr-1" />
              Right-click a checkmark to switch to custom text. Click again to toggle back.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={addFeature}
              className="flex-1 py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
            >
              <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Feature
            </button>
          </div>

        </div>
      )}

      {/* ── Layout tab ── */}
      {activeTab === "layout" && (
        <div className="space-y-4">
          <p className="text-[10px] text-on-surface-variant/60">Control how package cards are displayed to your clients.</p>

          {/* Display style */}
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Display Style</span>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "cards" as PackageLayout, label: "Cards", icon: "fa-table-cells-large", desc: "Vertical cards in a grid" },
                { value: "horizontal" as PackageLayout, label: "Horizontal", icon: "fa-grip-lines", desc: "Side-by-side comparison rows" },
                { value: "compact" as PackageLayout, label: "Compact", icon: "fa-table-list", desc: "Slim cards, less detail" },
                { value: "list" as PackageLayout, label: "List", icon: "fa-list", desc: "Single-column list" },
              ]).map((opt) => {
                const active = (config.layout ?? "cards") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdate({ ...config, layout: opt.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                      active
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant/15 hover:border-primary/30"
                    }`}
                  >
                    <i className={`fa-solid ${opt.icon} text-sm ${active ? "text-primary" : "text-on-surface-variant/50"}`} />
                    <span className={`text-[10px] font-bold ${active ? "text-primary" : "text-on-surface-variant"}`}>{opt.label}</span>
                    <span className="text-[8px] text-on-surface-variant/50 leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Columns */}
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-2">Columns</span>
            <div className="flex gap-1.5">
              {([
                { value: "auto" as const, label: "Auto" },
                { value: 1 as const, label: "1" },
                { value: 2 as const, label: "2" },
                { value: 3 as const, label: "3" },
                { value: 4 as const, label: "4" },
              ]).map((opt) => {
                const active = (config.columns ?? "auto") === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onUpdate({ ...config, columns: opt.value })}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant/50 hover:text-on-surface-variant"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-on-surface-variant/50 mt-1">Auto fits columns based on the number of packages.</p>
          </div>

          {/* Show features table toggle */}
          <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
            <div>
              <span className="text-xs font-medium text-on-surface block">Features comparison table</span>
              <span className="text-[9px] text-on-surface-variant/50">Show a full comparison grid below the cards</span>
            </div>
            <label className="relative cursor-pointer">
              <input type="checkbox" checked={!!config.showFeaturesTable} onChange={(e) => onUpdate({ ...config, showFeaturesTable: e.target.checked })} className="sr-only peer" />
              <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
            </label>
          </div>
        </div>
      )}

      {/* ── Rules tab ── */}
      {activeTab === "rules" && (
        <div className="space-y-3">
          <p className="text-[10px] text-on-surface-variant/60">
            Recommend a package based on answers from previous steps. First match wins.
          </p>

          <label className="block">
            <span className="text-[10px] text-on-surface-variant mb-0.5 block">Default recommendation</span>
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
            <div key={ri} className="bg-surface-container rounded-xl p-2.5 space-y-1.5 border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Rule {ri + 1}</span>
                <button onClick={() => removeRule(ri)} className="p-1 text-on-surface-variant/40 hover:text-error">
                  <i className="fa-solid fa-trash text-[10px]" />
                </button>
              </div>
              <input
                value={rule.fieldId}
                onChange={(e) => updateRule(ri, { fieldId: e.target.value })}
                placeholder="Field ID"
                className={`${INPUT_CLS} text-xs font-mono`}
              />
              <div className="flex gap-1.5">
                <select
                  value={rule.operator}
                  onChange={(e) => updateRule(ri, { operator: e.target.value as PackageRule["operator"] })}
                  className={`${INPUT_CLS} text-xs flex-1`}
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">&gt;</option>
                  <option value="less_than">&lt;</option>
                </select>
                <input
                  value={rule.value}
                  onChange={(e) => updateRule(ri, { value: e.target.value })}
                  placeholder="Value"
                  className={`${INPUT_CLS} text-xs flex-1`}
                />
              </div>
              <select
                value={rule.recommendedPackageId}
                onChange={(e) => updateRule(ri, { recommendedPackageId: e.target.value })}
                className={`${INPUT_CLS} text-xs`}
              >
                {config.packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
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

/* ── Step settings panel (right pane when step selected) ── */

function StepSettingsPanel({
  step,
  onUpdate,
  onDelete,
  onClose,
  allFields,
  canDelete,
}: {
  step: StepDef;
  onUpdate: (patch: Partial<StepDef>) => void;
  onDelete: () => void;
  onClose: () => void;
  allFields: FieldDef[];
  canDelete: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <i className="fa-solid fa-layer-group text-primary text-lg" />
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex-1">Page Settings</h3>
        <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 transition-colors" aria-label="Close page settings"><i className="fa-solid fa-xmark text-xs" aria-hidden="true" /></button>
      </div>
      <div className="space-y-5">
        <section className="space-y-3">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Page Info</div>
          <label className="block">
            <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Page Title</span>
            <input
              value={step.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className={INPUT_CLS}
              placeholder="Step title"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Description</span>
            <textarea
              value={step.description ?? ""}
              onChange={(e) => onUpdate({ description: e.target.value || undefined })}
              placeholder="Optional description shown below the page title..."
              rows={3}
              className={INPUT_CLS}
            />
          </label>
        </section>

        <section className="space-y-3">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Visibility</div>
          <ConditionBuilder
            condition={step.showCondition}
            onChange={(c) => onUpdate({ showCondition: c })}
            allFields={allFields}
            label="Show page when"
          />
        </section>

        <section className="space-y-3">
          <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Summary</div>
          <div className="glass-panel rounded-xl p-4 border border-outline-variant/10 text-sm text-on-surface">
            {step.fields.length} field{step.fields.length !== 1 ? "s" : ""} on this page
          </div>
        </section>

        {canDelete && (
          <div className="pt-4">
            <button
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 py-3 bg-error-container/20 text-error rounded-xl font-bold text-xs uppercase tracking-widest border border-error/20 hover:bg-error-container/40 transition-all"
            >
              <i className="fa-solid fa-trash text-[10px]" /> Delete Page
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Condition builder (shared by fields and steps) ─────── */

const CONDITION_OPERATORS: { value: ShowCondition["operator"]; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_empty", label: "Is not empty" },
  { value: "is_empty", label: "Is empty" },
];

function ConditionBuilder({
  condition,
  onChange,
  allFields,
  excludeFieldId,
  label,
}: {
  condition?: ShowCondition;
  onChange: (c: ShowCondition | undefined) => void;
  allFields: FieldDef[];
  excludeFieldId?: string;
  label: string;
}) {
  const [open, setOpen] = useState(!!condition?.fieldId);

  // Fields that can be used as condition sources (ones with user input)
  const sourceFields = allFields.filter(
    (f) => f.id !== excludeFieldId && f.type !== "heading" && f.type !== "file" && f.type !== "files",
  );

  const selectedField = condition?.fieldId ? sourceFields.find((f) => f.id === condition.fieldId) : null;
  const hasOptions = selectedField && (selectedField.type === "select" || selectedField.type === "radio" || selectedField.type === "checkbox");
  const needsValue = condition?.operator && condition.operator !== "not_empty" && condition.operator !== "is_empty";

  return (
    <div className="bg-surface-container rounded-xl p-3 border border-outline-variant/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
          <i className="fa-solid fa-eye text-[9px] mr-1 text-amber-400" />
          {label}
        </span>
        <label className="relative cursor-pointer">
          <input
            type="checkbox"
            checked={open}
            onChange={(e) => {
              setOpen(e.target.checked);
              if (!e.target.checked) onChange(undefined);
            }}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-amber-500 transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-white transition-all" />
        </label>
      </div>

      {open && (
        <div className="mt-2 space-y-2">
          <select
            value={condition?.fieldId ?? ""}
            onChange={(e) => {
              if (!e.target.value) {
                onChange(undefined);
                return;
              }
              onChange({ fieldId: e.target.value, operator: condition?.operator ?? "equals", value: condition?.value });
            }}
            className={`${INPUT_CLS} text-xs`}
          >
            <option value="">Select a field...</option>
            {sourceFields.map((f) => (
              <option key={f.id} value={f.id}>{f.label} ({labelFor(f.type)})</option>
            ))}
          </select>

          {condition?.fieldId && (
            <select
              value={condition.operator}
              onChange={(e) => onChange({ ...condition, operator: e.target.value as ShowCondition["operator"] })}
              className={`${INPUT_CLS} text-xs`}
            >
              {CONDITION_OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          )}

          {condition?.fieldId && needsValue && (
            hasOptions ? (
              <select
                value={condition.value ?? ""}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                className={`${INPUT_CLS} text-xs`}
              >
                <option value="">Select a value...</option>
                {(selectedField!.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                value={condition.value ?? ""}
                onChange={(e) => onChange({ ...condition, value: e.target.value })}
                placeholder="Value to match..."
                className={`${INPUT_CLS} text-xs`}
              />
            )
          )}

          {condition?.fieldId && (
            <p className="text-[9px] text-on-surface-variant/50">
              This {label.includes("page") ? "page" : "field"} will be hidden unless the condition is met.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Repeater settings panel ──────────────────────────────── */

const REPEATER_SUB_TYPES: { value: RepeaterSubField["type"]; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "email", label: "Email" },
  { value: "tel", label: "Phone" },
  { value: "url", label: "URL" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "file", label: "File Upload" },
  { value: "files", label: "Multi-File" },
];

function RepeaterSettingsPanel({ config, onUpdate }: {
  config: RepeaterConfig;
  onUpdate: (cfg: RepeaterConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<"fields" | "settings">("fields");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function addSubField() {
    const sf: RepeaterSubField = { id: `sf_${uid()}`, type: "text", label: "New Field" };
    onUpdate({ ...config, subFields: [...config.subFields, sf] });
    setEditingIdx(config.subFields.length);
  }

  function removeSubField(idx: number) {
    const removed = config.subFields[idx];
    // Also clean up any showWhen references to this field
    const subFields = config.subFields
      .filter((_, i) => i !== idx)
      .map((sf) => sf.showWhen?.fieldId === removed.id ? { ...sf, showWhen: undefined } : sf);
    onUpdate({ ...config, subFields });
    if (editingIdx === idx) setEditingIdx(null);
    else if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  }

  function updateSubField(idx: number, patch: Partial<RepeaterSubField>) {
    onUpdate({
      ...config,
      subFields: config.subFields.map((sf, i) => (i === idx ? { ...sf, ...patch } : sf)),
    });
  }

  function moveSubField(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= config.subFields.length) return;
    const subFields = [...config.subFields];
    [subFields[idx], subFields[j]] = [subFields[j], subFields[idx]];
    onUpdate({ ...config, subFields });
    if (editingIdx === idx) setEditingIdx(j);
    else if (editingIdx === j) setEditingIdx(idx);
  }

  const tabs = [
    { key: "fields" as const, label: "Sub-Fields", icon: "fa-list" },
    { key: "settings" as const, label: "Settings", icon: "fa-gear" },
  ];

  return (
    <section className="space-y-3">
      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Repeater Configuration</div>

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

      {activeTab === "fields" && (
        <div className="space-y-2">
          {config.subFields.map((sf, si) => {
            const isEditing = editingIdx === si;
            return (
              <div key={sf.id} className="bg-surface-container rounded-xl border border-outline-variant/10 overflow-hidden">
                {/* Sub-field header */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${isEditing ? "bg-primary/5" : "hover:bg-surface-container-high/60"}`}
                  onClick={() => setEditingIdx(isEditing ? null : si)}
                >
                  <i className={`fa-solid fa-chevron-${isEditing ? "down" : "right"} text-[8px] text-on-surface-variant/50 w-3`} />
                  <span className="text-xs font-medium text-on-surface flex-1 truncate">{sf.label}</span>
                  <span className="text-[9px] text-on-surface-variant/40 uppercase">{sf.type}</span>
                  {sf.required && <span className="text-[9px] text-tertiary font-bold">*</span>}
                  <div className="flex items-center gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveSubField(si, -1); }} disabled={si === 0} className="p-0.5 text-on-surface-variant/40 hover:text-on-surface disabled:opacity-30" aria-label="Move sub-field up"><i className="fa-solid fa-arrow-up text-[8px]" aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); moveSubField(si, 1); }} disabled={si === config.subFields.length - 1} className="p-0.5 text-on-surface-variant/40 hover:text-on-surface disabled:opacity-30" aria-label="Move sub-field down"><i className="fa-solid fa-arrow-down text-[8px]" aria-hidden="true" /></button>
                    <button onClick={(e) => { e.stopPropagation(); removeSubField(si); }} className="p-0.5 text-on-surface-variant/40 hover:text-error ml-1" aria-label="Remove sub-field"><i className="fa-solid fa-trash text-[8px]" aria-hidden="true" /></button>
                  </div>
                </div>

                {/* Sub-field editor */}
                {isEditing && (
                  <div className="px-3 pb-3 space-y-2 border-t border-outline-variant/10 pt-2">
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant mb-0.5 block">Label</span>
                      <input value={sf.label} onChange={(e) => updateSubField(si, { label: e.target.value })} className={`${INPUT_CLS} text-xs`} />
                    </label>
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <span className="text-[10px] text-on-surface-variant mb-0.5 block">Type</span>
                        <select value={sf.type} onChange={(e) => updateSubField(si, { type: e.target.value as RepeaterSubField["type"] })} className={`${INPUT_CLS} text-xs`}>
                          {REPEATER_SUB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </label>
                      <label className="flex items-end gap-1.5 pb-1">
                        <input type="checkbox" checked={!!sf.required} onChange={(e) => updateSubField(si, { required: e.target.checked })} className="accent-primary" />
                        <span className="text-[10px] text-on-surface-variant">Req</span>
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant mb-0.5 block">Placeholder</span>
                      <input value={sf.placeholder ?? ""} onChange={(e) => updateSubField(si, { placeholder: e.target.value || undefined })} className={`${INPUT_CLS} text-xs`} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] text-on-surface-variant mb-0.5 block">Hint</span>
                      <input value={sf.hint ?? ""} onChange={(e) => updateSubField(si, { hint: e.target.value || undefined })} className={`${INPUT_CLS} text-xs`} />
                    </label>

                    {(sf.type === "select" || sf.type === "radio" || sf.type === "checkbox") && (
                      <label className="block">
                        <span className="text-[10px] text-on-surface-variant mb-0.5 block">Options (one per line)</span>
                        <textarea value={(sf.options ?? []).join("\n")} onChange={(e) => updateSubField(si, { options: e.target.value.split("\n").filter((l) => l.trim()) })} rows={4} className={`${INPUT_CLS} text-xs font-mono`} />
                      </label>
                    )}

                    {sf.type === "textarea" && (
                      <label className="flex items-center gap-2">
                        <span className="text-[10px] text-on-surface-variant">Rows</span>
                        <input type="number" min={2} max={10} value={sf.rows ?? 3} onChange={(e) => updateSubField(si, { rows: Number(e.target.value) || 3 })} className="w-14 px-2 py-1 text-xs bg-surface-container-highest/50 border-0 rounded text-on-surface outline-none" />
                      </label>
                    )}

                    {(sf.type === "file" || sf.type === "files") && (
                      <label className="block">
                        <span className="text-[10px] text-on-surface-variant mb-0.5 block">Accepted types</span>
                        <input value={sf.accept ?? ""} onChange={(e) => updateSubField(si, { accept: e.target.value || undefined })} placeholder="e.g. image/*,.pdf" className={`${INPUT_CLS} text-xs`} />
                      </label>
                    )}

                    {/* Conditional visibility */}
                    <div className="pt-1 border-t border-outline-variant/10">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-1">Show When</span>
                      <div className="flex gap-2">
                        <select
                          value={sf.showWhen?.fieldId ?? ""}
                          onChange={(e) => {
                            if (!e.target.value) { updateSubField(si, { showWhen: undefined }); return; }
                            updateSubField(si, { showWhen: { fieldId: e.target.value, values: sf.showWhen?.values ?? [] } });
                          }}
                          className="flex-1 text-[10px] bg-surface-container-highest/50 border-0 rounded px-2 py-1 text-on-surface outline-none"
                        >
                          <option value="">Always visible</option>
                          {config.subFields.filter((_, i) => i !== si).map((other) => (
                            <option key={other.id} value={other.id}>{other.label}</option>
                          ))}
                        </select>
                      </div>
                      {sf.showWhen?.fieldId && (
                        <label className="block mt-1">
                          <span className="text-[9px] text-on-surface-variant/60 block mb-0.5">equals (one per line)</span>
                          <textarea
                            value={(sf.showWhen.values ?? []).join("\n")}
                            onChange={(e) => updateSubField(si, { showWhen: { ...sf.showWhen!, values: e.target.value.split("\n").filter((l) => l.trim()) } })}
                            rows={3}
                            className="w-full text-[10px] bg-surface-container-highest/50 border-0 rounded px-2 py-1 text-on-surface outline-none font-mono"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addSubField}
            className="w-full py-2 border border-dashed border-outline-variant/20 rounded-xl text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
          >
            <i className="fa-solid fa-plus text-[10px] mr-1" /> Add Sub-Field
          </button>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] text-on-surface-variant mb-0.5 block">Entry label (singular)</span>
            <input value={config.entryLabel ?? ""} onChange={(e) => onUpdate({ ...config, entryLabel: e.target.value || undefined })} placeholder="e.g. Page" className={`${INPUT_CLS} text-xs`} />
          </label>
          <label className="block">
            <span className="text-[10px] text-on-surface-variant mb-0.5 block">Add button label</span>
            <input value={config.addButtonLabel ?? ""} onChange={(e) => onUpdate({ ...config, addButtonLabel: e.target.value || undefined })} placeholder="e.g. Add Page" className={`${INPUT_CLS} text-xs`} />
          </label>
          <div className="flex gap-3">
            <label className="flex-1">
              <span className="text-[10px] text-on-surface-variant mb-0.5 block">Min entries</span>
              <input type="number" min={0} max={50} value={config.minEntries ?? 0} onChange={(e) => onUpdate({ ...config, minEntries: Number(e.target.value) || 0 })} className={`${INPUT_CLS} text-xs`} />
            </label>
            <label className="flex-1">
              <span className="text-[10px] text-on-surface-variant mb-0.5 block">Max entries</span>
              <input type="number" min={0} max={100} value={config.maxEntries ?? 0} onChange={(e) => onUpdate({ ...config, maxEntries: Number(e.target.value) || 0 })} className={`${INPUT_CLS} text-xs`} />
            </label>
          </div>
          <p className="text-[9px] text-on-surface-variant/50">Set max to 0 for unlimited entries.</p>
        </div>
      )}
    </section>
  );
}
