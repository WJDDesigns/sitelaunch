/**
 * Shared utility for formatting structured field values into readable strings.
 * Used by: entry detail page, PDF export, CSV export, Google Sheets sync, email notifications.
 */

import type { FieldDef } from "@/lib/forms";

/**
 * Format a raw field value into a human-readable string.
 * Handles all structured/complex field types that store JSON objects.
 */
export function formatFieldValue(
  value: unknown,
  field: FieldDef,
): string {
  if (value === null || value === undefined || value === "") return "";

  const parsed = parseValue(value);

  switch (field.type) {
    case "timeline": {
      const td = parsed as Record<string, unknown> | null;
      if (!td || typeof td !== "object") break;
      const parts: string[] = [];
      const milestoneLabels = new Map((field.timelineConfig?.milestones ?? []).map((m) => [m.id, m.label]));
      if (td.startDate) parts.push(`Start: ${formatDate(td.startDate as string)}`);
      if (td.milestones && typeof td.milestones === "object") {
        for (const [id, date] of Object.entries(td.milestones as Record<string, string>)) {
          parts.push(`${milestoneLabels.get(id) ?? id}: ${formatDate(date)}`);
        }
      }
      if (td.endDate) parts.push(`Deadline: ${formatDate(td.endDate as string)}`);
      if (td.blackoutDates && Array.isArray(td.blackoutDates)) {
        for (const b of td.blackoutDates as { start: string; end: string }[]) {
          parts.push(`Blackout: ${formatDate(b.start)} -- ${formatDate(b.end)}`);
        }
      }
      return parts.join("; ") || String(value);
    }

    case "budget_allocator": {
      const alloc = parsed as Record<string, number> | null;
      if (!alloc || typeof alloc !== "object" || Array.isArray(alloc)) break;
      const channelLabels = new Map((field.budgetAllocatorConfig?.channels ?? []).map((c) => [c.id, c.label]));
      const currency = field.budgetAllocatorConfig?.currency ?? "$";
      const total = Object.values(alloc).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
      const parts = Object.entries(alloc).map(([id, amt]) => {
        const label = channelLabels.get(id) ?? id;
        const pct = total > 0 ? Math.round(((typeof amt === "number" ? amt : 0) / total) * 100) : 0;
        return `${label}: ${currency}${(typeof amt === "number" ? amt : 0).toLocaleString()} (${pct}%)`;
      });
      parts.push(`Total: ${currency}${total.toLocaleString()}`);
      return parts.join("; ");
    }

    case "feature_selector": {
      const raw = String(value);
      const selectedIds = raw.split("||").filter(Boolean);
      const featureLabelsMap = new Map((field.featureSelectorConfig?.features ?? []).map((ft) => [ft.id, ft.name]));
      return selectedIds.map((id) => featureLabelsMap.get(id) ?? id).join(", ");
    }

    case "package": {
      const pkgId = String(value);
      const pkg = (field.packageConfig?.packages ?? []).find((p) => p.id === pkgId);
      if (pkg) {
        const currency = field.budgetAllocatorConfig?.currency ?? "$";
        return pkg.hidePrice ? pkg.name : `${pkg.name} (${currency}${pkg.price}/mo)`;
      }
      return pkgId;
    }

    case "rating": {
      const stars = Number(value) || 0;
      const maxStars = field.ratingConfig?.maxStars ?? 5;
      return `${stars} / ${maxStars}`;
    }

    case "toggle": {
      return String(value) === "yes" ? "Yes" : "No";
    }

    case "social_handles": {
      const handles = (Array.isArray(parsed) ? parsed : []) as { platform: string; handle: string }[];
      if (handles.length === 0) break;
      return handles.map((h) => `${capitalize(h.platform)}: ${h.handle}`).join(", ");
    }

    case "address": {
      const addr = parsed as Record<string, string> | null;
      if (!addr || typeof addr !== "object" || Array.isArray(addr)) break;
      const parts = [addr.street, [addr.city, addr.state, addr.zip].filter(Boolean).join(", ")].filter(Boolean);
      if (addr.country && addr.country !== "US") parts.push(addr.country);
      return parts.join(", ") || String(value);
    }

    case "approval": {
      const appr = parsed as Record<string, unknown> | null;
      if (!appr || typeof appr !== "object") break;
      const parts: string[] = [];
      parts.push(appr.approved ? "Approved" : "Not Approved");
      if (appr.fullName) parts.push(`Name: ${appr.fullName}`);
      if (appr.timestamp) parts.push(`Date: ${formatDate(appr.timestamp as string)}`);
      return parts.join("; ");
    }

    case "checkbox": {
      const raw = String(value);
      if (raw.includes("||")) {
        return raw.split("||").filter(Boolean).join(", ");
      }
      return raw;
    }

    case "matrix":
    case "questionnaire": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const questionLabels = new Map<string, string>();
      if (field.type === "matrix" && field.matrixConfig) {
        field.matrixConfig.rows.forEach((r) => questionLabels.set(r, r));
      }
      if (field.type === "questionnaire" && field.questionnaireConfig) {
        field.questionnaireConfig.questions.forEach((q) => questionLabels.set(q.id, q.text));
      }
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, answer]) => `${questionLabels.get(key) ?? key}: ${String(answer)}`)
        .join("; ");
    }

    case "name": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const nd = parsed as Record<string, string>;
      const parts = [nd.prefix, nd.first, nd.middle, nd.last, nd.suffix].filter(Boolean);
      if (parts.length > 0) return parts.join(" ");
      break;
    }

    case "repeater": {
      if (!Array.isArray(parsed)) break;
      const subLabels = new Map((field.repeaterConfig?.subFields ?? []).map((sf) => [sf.id, sf.label]));
      return (parsed as Record<string, unknown>[])
        .map((entry, i) => {
          const fields = Object.entries(entry)
            .map(([key, val]) => `${subLabels.get(key) ?? key}: ${val ?? "--"}`)
            .join(", ");
          return `Entry ${i + 1}: ${fields}`;
        })
        .join("; ");
    }

    case "property_details": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const pd = parsed as Record<string, string>;
      const labels: Record<string, string> = {
        property_type: "Property Type", bedrooms: "Bedrooms", bathrooms: "Bathrooms",
        sqft: "Sq Ft", lot_size: "Lot Size", year_built: "Year Built",
        parking: "Parking", stories: "Stories", price: "Price",
      };
      return Object.entries(pd)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([key, val]) => `${labels[key] ?? capitalize(key.replace(/_/g, " "))}: ${formatPropertyValue(key, val)}`)
        .join(", ");
    }

    case "insurance_info": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const ins = parsed as Record<string, string>;
      const labels: Record<string, string> = {
        provider: "Provider", plan_type: "Plan Type", policy_number: "Policy #",
        group_number: "Group #", subscriber_name: "Subscriber", subscriber_dob: "DOB",
        relationship: "Relationship", provider_other: "Other Provider",
      };
      return Object.entries(ins)
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([key, val]) => `${labels[key] ?? capitalize(key.replace(/_/g, " "))}: ${val}`)
        .join(", ");
    }

    case "guest_rsvp": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const rsvp = parsed as Record<string, string>;
      const parts: string[] = [];
      if (rsvp.attending) parts.push(`Attending: ${capitalize(rsvp.attending)}`);
      if (rsvp.meal) parts.push(`Meal: ${rsvp.meal}`);
      if (rsvp.dietary) parts.push(`Dietary: ${rsvp.dietary.replace(/\|\|/g, ", ")}`);
      if (rsvp.plus_ones) parts.push(`Plus Ones: ${rsvp.plus_ones}`);
      if (rsvp.notes) parts.push(`Notes: ${rsvp.notes}`);
      return parts.join(", ");
    }

    case "room_selector": {
      const raw = String(value);
      const selectedIds = raw.split("||").filter(Boolean);
      const roomLabels = new Map((field.roomSelectorConfig?.rooms ?? []).map((r) => [r.id, r.name]));
      return selectedIds.map((id) => roomLabels.get(id) ?? id).join(", ");
    }

    case "loan_calculator": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const loan = parsed as Record<string, string>;
      const currency = field.loanCalculatorConfig?.currency ?? "$";
      const parts: string[] = [];
      if (loan.loanAmount) parts.push(`Amount: ${currency}${Number(loan.loanAmount).toLocaleString()}`);
      if (loan.interestRate) parts.push(`Rate: ${loan.interestRate}%`);
      if (loan.termMonths) parts.push(`Term: ${loan.termMonths} months`);
      return parts.join(", ");
    }

    case "case_intake": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const ci = parsed as Record<string, string>;
      const parts: string[] = [];
      if (ci.case_type) parts.push(`Case Type: ${ci.case_type}`);
      if (ci.jurisdiction) parts.push(`Jurisdiction: ${ci.jurisdiction}`);
      if (ci.date_of_incident) parts.push(`Date of Incident: ${formatDate(ci.date_of_incident)}`);
      if (ci.opposing_party) parts.push(`Opposing Party: ${ci.opposing_party}`);
      if (ci.description) parts.push(`Description: ${ci.description}`);
      return parts.join(", ");
    }

    case "donation_tier": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const dt = parsed as Record<string, string>;
      const currency = field.donationTierConfig?.currency ?? "$";
      const tiers = field.donationTierConfig?.tiers ?? [];
      const parts: string[] = [];
      if (dt.selectedTier) {
        const tier = tiers.find((t) => t.id === dt.selectedTier);
        parts.push(tier ? `${tier.label} (${currency}${tier.amount})` : dt.selectedTier);
      }
      if (dt.customAmount) parts.push(`Custom: ${currency}${Number(dt.customAmount).toLocaleString()}`);
      if (dt.frequency) parts.push(`Frequency: ${capitalize(dt.frequency)}`);
      return parts.join(", ");
    }

    case "volunteer_signup": {
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) break;
      const vs = parsed as Record<string, string>;
      const parts: string[] = [];
      if (vs.days) parts.push(`Days: ${vs.days.replace(/\|\|/g, ", ")}`);
      if (vs.timeSlots) parts.push(`Times: ${vs.timeSlots.replace(/\|\|/g, ", ")}`);
      if (vs.skills) parts.push(`Skills: ${vs.skills.replace(/\|\|/g, ", ")}`);
      if (vs.frequency) parts.push(`Frequency: ${capitalize(vs.frequency)}`);
      if (vs.notes) parts.push(`Notes: ${vs.notes}`);
      return parts.join(", ");
    }

    case "cause_selector": {
      const raw = String(value);
      const selectedIds = raw.split("||").filter(Boolean);
      const causeLabels = new Map((field.causeSelectorConfig?.causes ?? []).map((c) => [c.id, c.name]));
      return selectedIds.map((id) => causeLabels.get(id) ?? id).join(", ");
    }

    case "chained_select": {
      try {
        const cs = typeof value === "string" ? JSON.parse(value) : value;
        if (typeof cs === "object" && cs !== null) {
          const values = Object.keys(cs)
            .sort()
            .map((k) => cs[k])
            .filter(Boolean);
          return values.join(" > ");
        }
      } catch { /* fall through */ }
      return String(value);
    }

    case "calculated": {
      const cfg = field.calculatedFieldConfig;
      const n = parseFloat(String(value));
      if (isNaN(n)) return String(value);
      const decimals = cfg?.decimalPlaces ?? 2;
      if (cfg?.format === "currency") return `${cfg.currencySymbol ?? "$"}${n.toFixed(decimals)}`;
      if (cfg?.format === "percent") return `${n.toFixed(decimals)}%`;
      return n.toFixed(decimals);
    }

    default:
      break;
  }

  // Generic fallback for any remaining object/array values
  if (typeof value === "object" && value !== null) {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    }
    return JSON.stringify(value);
  }

  return String(value);
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function parseValue(value: unknown): unknown {
  if (typeof value === "object" && value !== null) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try { return JSON.parse(trimmed); } catch { /* ignore */ }
    }
  }
  return null;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function formatPropertyValue(key: string, val: string): string {
  if (key === "property_type") return capitalize(val.replace(/_/g, " "));
  if (key === "price" || key === "sqft" || key === "lot_size") {
    const num = Number(val);
    if (!isNaN(num)) return key === "price" ? `$${num.toLocaleString()}` : num.toLocaleString();
  }
  return val;
}
