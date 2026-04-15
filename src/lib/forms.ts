// Form schema types shared between server and client components.

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "url"
  | "number"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "color"
  | "heading"
  | "address"
  | "file"
  | "files"
  | "package"
  | "repeater"
  | "consent";

/* ── Package Selector types ─────────────────────────────── */

export interface PackageFeature {
  /** Feature label shown in the grid, e.g. "Custom Domain" */
  label: string;
  /** Value per package keyed by package id — true/false for checkmarks, or a string for text */
  values: Record<string, boolean | string>;
}

export interface PackageOption {
  id: string;
  name: string;
  /** Monthly price in dollars (0 for free) */
  price: number;
  /** Short tagline, e.g. "Best for small teams" */
  description?: string;
  /** Longer paragraph description for the package */
  longDescription?: string;
  /** Highlight / badge text, e.g. "Most Popular" */
  badge?: string;
  /** Feature bullet points shown as a checkmark list */
  featureList?: string[];
  /** Hide the price on this package (e.g. for "Custom" packages) */
  hidePrice?: boolean;
  /** Custom label shown instead of price when hidePrice is true, e.g. "Custom" or "Contact Us" */
  priceLabel?: string;
}

/** A rule that recommends a package based on a prior answer */
export interface PackageRule {
  /** Field ID from a previous step to evaluate */
  fieldId: string;
  /** Operator for comparison */
  operator: "equals" | "contains" | "greater_than" | "less_than";
  /** Value to compare against */
  value: string;
  /** Package ID to recommend when this rule matches */
  recommendedPackageId: string;
}

export interface PackageConfig {
  packages: PackageOption[];
  features: PackageFeature[];
  rules: PackageRule[];
  /** Default package ID to recommend if no rules match */
  defaultPackageId?: string;
}

/* ── Repeater (nested entries) types ────────────────────── */

/** A sub-field inside a repeater entry */
export interface RepeaterSubField {
  id: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox" | "file" | "files" | "email" | "tel" | "url" | "number" | "date";
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
  hint?: string;
  accept?: string;
  /** Show this sub-field only when another sub-field matches a value */
  showWhen?: {
    /** ID of the sub-field to check */
    fieldId: string;
    /** Show when that field equals one of these values */
    values: string[];
  };
}

export interface RepeaterConfig {
  subFields: RepeaterSubField[];
  /** Minimum entries required (default 0) */
  minEntries?: number;
  /** Maximum entries allowed (default unlimited) */
  maxEntries?: number;
  /** Label for the "Add" button, e.g. "Add Page" */
  addButtonLabel?: string;
  /** Singular noun for each entry, e.g. "Page" */
  entryLabel?: string;
  /** Column headers shown in the summary table */
  summaryFields?: string[];
}

/** Condition to show/hide a field or step based on another field's value */
export interface ShowCondition {
  /** ID of the field to evaluate (from any step) */
  fieldId: string;
  /** Comparison operator */
  operator: "equals" | "not_equals" | "contains" | "not_empty" | "is_empty";
  /** Value to compare against (not used for not_empty / is_empty) */
  value?: string;
}

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
  accept?: string;
  hint?: string;
  /** For heading fields — rich text / description content */
  content?: string;
  /** For checkbox fields — max selections allowed */
  maxSelections?: number;
  /** For package fields — full package configuration */
  packageConfig?: PackageConfig;
  /** For repeater fields — sub-fields and entry config */
  repeaterConfig?: RepeaterConfig;
  /** For consent fields — the scrollable agreement text (plain text or HTML) */
  consentText?: string;
  /** For consent fields — label next to the checkbox, e.g. "I agree to the terms above" */
  consentCheckboxLabel?: string;
  /** Show this field only when the condition is met */
  showCondition?: ShowCondition;
}

export interface UploadedFile {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
}

export interface StepDef {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
  /** Show this step/page only when the condition is met */
  showCondition?: ShowCondition;
}

export interface FormSchema {
  steps: StepDef[];
}

/**
 * Evaluate a show condition against the current form data.
 * Returns true if the field/step should be visible.
 */
export function evaluateCondition(
  condition: ShowCondition | undefined,
  allData: Record<string, unknown>,
): boolean {
  if (!condition || !condition.fieldId) return true;

  const raw = allData[condition.fieldId];
  const fieldVal = raw === undefined || raw === null ? "" : String(raw);

  switch (condition.operator) {
    case "equals":
      return fieldVal === (condition.value ?? "");
    case "not_equals":
      return fieldVal !== (condition.value ?? "");
    case "contains":
      return fieldVal.toLowerCase().includes((condition.value ?? "").toLowerCase());
    case "not_empty":
      return fieldVal.trim() !== "";
    case "is_empty":
      return fieldVal.trim() === "";
    default:
      return true;
  }
}

export function mergeSchema(base: FormSchema, overrides: Record<string, unknown>): FormSchema {
  // Phase 2a: overrides are a no-op. Phase 2b will merge per-field label/visibility tweaks.
  void overrides;
  return base;
}

export function validateStepData(
  step: StepDef,
  data: Record<string, unknown>,
  /** All form data across steps, used to evaluate field-level conditions */
  allData?: Record<string, unknown>,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const f of step.fields) {
    // Skip hidden fields — they should not be validated
    if (f.showCondition && !evaluateCondition(f.showCondition, allData ?? data)) continue;
    // File fields are validated separately (upload state lives in submission_files).
    if (f.type === "file" || f.type === "files") continue;
    // Heading fields are display-only, never validated.
    if (f.type === "heading") continue;
    const v = data[f.id];
    // Repeater entries are validated inline — the component handles required sub-fields.
    if (f.type === "repeater") {
      if (f.required && f.repeaterConfig?.minEntries) {
        try {
          const entries = typeof v === "string" ? JSON.parse(v || "[]") : (Array.isArray(v) ? v : []);
          if (entries.length < f.repeaterConfig.minEntries) {
            errors[f.id] = `At least ${f.repeaterConfig.minEntries} ${f.repeaterConfig.entryLabel?.toLowerCase() || "entry"}(s) required`;
          }
        } catch { /* malformed JSON — let it pass */ }
      }
      continue;
    }
    // Package fields store selected package id — validated as required if set.
    if (f.type === "package") {
      if (f.required && (!v || v === "")) errors[f.id] = "Please select a package";
      continue;
    }
    // Consent fields must be checked ("yes") when required.
    if (f.type === "consent") {
      if (f.required && v !== "yes") errors[f.id] = "You must agree to continue";
      continue;
    }
    if (f.required) {
      if (v === undefined || v === null || v === "") {
        errors[f.id] = "Required";
        continue;
      }
    }
    if (v === undefined || v === null || v === "") continue;
    if (f.type === "email" && typeof v === "string") {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errors[f.id] = "Invalid email";
    }
    if (f.type === "url" && typeof v === "string") {
      try {
        new URL(v);
      } catch {
        errors[f.id] = "Invalid URL";
      }
    }
    if (f.type === "number" && typeof v === "string") {
      if (Number.isNaN(Number(v))) errors[f.id] = "Must be a number";
    }
    if (f.type === "color" && typeof v === "string") {
      if (!/^#[0-9a-f]{3,8}$/i.test(v)) errors[f.id] = "Invalid hex color";
    }
    if (f.type === "date" && typeof v === "string") {
      if (Number.isNaN(Date.parse(v))) errors[f.id] = "Invalid date";
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}
