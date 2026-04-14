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
  | "package";

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
  /** Highlight / badge text, e.g. "Most Popular" */
  badge?: string;
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
}

export interface FormSchema {
  steps: StepDef[];
}

export function mergeSchema(base: FormSchema, overrides: Record<string, unknown>): FormSchema {
  // Phase 2a: overrides are a no-op. Phase 2b will merge per-field label/visibility tweaks.
  void overrides;
  return base;
}

export function validateStepData(
  step: StepDef,
  data: Record<string, unknown>,
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  for (const f of step.fields) {
    // File fields are validated separately (upload state lives in submission_files).
    if (f.type === "file" || f.type === "files") continue;
    // Heading fields are display-only, never validated.
    if (f.type === "heading") continue;
    const v = data[f.id];
    // Package fields store selected package id — validated as required if set.
    if (f.type === "package") {
      if (f.required && (!v || v === "")) errors[f.id] = "Please select a package";
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
