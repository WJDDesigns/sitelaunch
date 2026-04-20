/* ── Integration Catalogue ───────────────────────────────────────────
 * Central registry of all integrations available in linqme.
 * Each entry describes how the integration connects (OAuth, API key, etc.)
 * and whether it's ready or coming soon.
 * ─────────────────────────────────────────────────────────────────── */

export type IntegrationCategory =
  | "cloud_storage"
  | "ai"
  | "payments"
  | "crm"
  | "communication"
  | "email_marketing"
  | "productivity"
  | "automation"
  | "security"
  | "address";

export type ConnectionType = "oauth" | "api_key" | "none";
export type IntegrationStatus = "available" | "coming_soon";

export interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  connectionType: ConnectionType;
  /** Provider key used in DB tables (e.g. "google_drive", "openai") */
  providerKey?: string;
  /** Which DB table stores this integration's connection */
  table?: string;
  /** URL for OAuth connect flow */
  connectUrl?: string;
  /** External URL for getting API keys */
  apiKeyUrl?: string;
  apiKeyLabel?: string;
  /** Extra fields needed for connection (besides api key) */
  extraFields?: { key: string; label: string; placeholder: string; type?: "text" | "password" }[];
  /** Model selection for AI providers */
  models?: { value: string; label: string }[];
  /** Popular -- shown in "Popular" filter */
  popular?: boolean;
}

export const CATEGORIES: { id: IntegrationCategory | "all" | "popular"; label: string; icon: string }[] = [
  { id: "all", label: "All Integrations", icon: "fa-solid fa-grid-2" },
  { id: "popular", label: "Popular", icon: "fa-solid fa-fire" },
  { id: "cloud_storage", label: "Cloud Storage", icon: "fa-solid fa-cloud" },
  { id: "ai", label: "AI Providers", icon: "fa-solid fa-brain" },
  { id: "payments", label: "Payments", icon: "fa-solid fa-credit-card" },
  { id: "crm", label: "CRM", icon: "fa-solid fa-address-book" },
  { id: "communication", label: "Communication", icon: "fa-solid fa-comments" },
  { id: "email_marketing", label: "Email Marketing", icon: "fa-solid fa-envelope-open-text" },
  { id: "productivity", label: "Productivity", icon: "fa-solid fa-table-cells-large" },
  { id: "automation", label: "Automation", icon: "fa-solid fa-bolt" },
  { id: "security", label: "Security", icon: "fa-solid fa-shield-halved" },
  { id: "address", label: "Address & Maps", icon: "fa-solid fa-map-location-dot" },
];

/* ── Catalogue ────────────────────────────────────────────────────── */

export const INTEGRATIONS: IntegrationDef[] = [
  // ── Cloud Storage (available) ────────────────────────────────────
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Sync file uploads and form submissions to Google Drive",
    icon: "fa-brands fa-google-drive",
    color: "text-[#4285F4]",
    category: "cloud_storage",
    status: "available",
    connectionType: "oauth",
    providerKey: "google_drive",
    table: "cloud_integrations",
    connectUrl: "/api/integrations/google_drive/connect",
    popular: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Send uploaded files to your cloud storage",
    icon: "fa-brands fa-dropbox",
    color: "text-[#0061FF]",
    category: "cloud_storage",
    status: "available",
    connectionType: "oauth",
    providerKey: "dropbox",
    table: "cloud_integrations",
    connectUrl: "/api/integrations/dropbox/connect",
    popular: true,
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Sync file uploads and form submission PDFs to OneDrive",
    icon: "fa-brands fa-microsoft",
    color: "text-[#0078D4]",
    category: "cloud_storage",
    status: "available",
    connectionType: "oauth",
    providerKey: "onedrive",
    table: "cloud_integrations",
    connectUrl: "/api/integrations/onedrive/connect",
  },
  {
    id: "box",
    name: "Box",
    description: "Send uploaded files and submissions to Box",
    icon: "fa-solid fa-box",
    color: "text-[#0061D5]",
    category: "cloud_storage",
    status: "available",
    connectionType: "oauth",
    providerKey: "box",
    table: "cloud_integrations",
    connectUrl: "/api/integrations/box/connect",
  },

  // ── AI Providers (available) ─────────────────────────────────────
  {
    id: "openai",
    name: "OpenAI",
    description: "Power smart features with GPT-4o and GPT-4 Turbo",
    icon: "fa-solid fa-robot",
    color: "text-[#10a37f]",
    category: "ai",
    status: "available",
    connectionType: "api_key",
    providerKey: "openai",
    table: "ai_integrations",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyLabel: "Get your API key from OpenAI",
    models: [
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    ],
    popular: true,
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "AI-powered content suggestions and competitor analysis",
    icon: "fa-solid fa-brain",
    color: "text-[#cc785c]",
    category: "ai",
    status: "available",
    connectionType: "api_key",
    providerKey: "anthropic",
    table: "ai_integrations",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyLabel: "Get your API key from Anthropic",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
      { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  {
    id: "google_ai",
    name: "Google AI (Gemini)",
    description: "Use Gemini models for AI features",
    icon: "fa-brands fa-google",
    color: "text-[#4285F4]",
    category: "ai",
    status: "available",
    connectionType: "api_key",
    providerKey: "google_ai",
    table: "ai_integrations",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyLabel: "Get your API key from Google AI Studio",
    models: [
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    ],
  },

  // ── Payments (available) ─────────────────────────────────────────
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept credit cards, Apple Pay, Google Pay and more",
    icon: "fa-brands fa-stripe",
    color: "text-[#635bff]",
    category: "payments",
    status: "available",
    connectionType: "oauth",
    providerKey: "stripe",
    table: "payment_integrations",
    connectUrl: "/api/stripe/connect",
    popular: true,
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Accept PayPal balance, credit and debit cards",
    icon: "fa-brands fa-paypal",
    color: "text-[#003087]",
    category: "payments",
    status: "available",
    connectionType: "api_key",
    providerKey: "paypal",
    table: "payment_integrations",
    apiKeyUrl: "https://developer.paypal.com/dashboard/applications/live",
    apiKeyLabel: "Get Client ID",
  },
  {
    id: "square",
    name: "Square",
    description: "In-person and online payments, invoicing",
    icon: "fa-solid fa-square",
    color: "text-[#006aff]",
    category: "payments",
    status: "available",
    connectionType: "api_key",
    providerKey: "square",
    table: "payment_integrations",
    apiKeyUrl: "https://developer.squareup.com/apps",
    apiKeyLabel: "Get Application ID",
  },

  // ── Security (available) ─────────────────────────────────────────
  {
    id: "recaptcha",
    name: "Google reCAPTCHA",
    description: "Invisible bot detection using Google reCAPTCHA v3",
    icon: "fa-solid fa-robot",
    color: "text-[#4285f4]",
    category: "security",
    status: "available",
    connectionType: "api_key",
    providerKey: "recaptcha",
    table: "captcha_integrations",
    apiKeyUrl: "https://www.google.com/recaptcha/admin",
    apiKeyLabel: "Get site key",
    extraFields: [
      { key: "siteKey", label: "Site Key", placeholder: "6Le...", type: "text" },
      { key: "secretKey", label: "Secret Key", placeholder: "6Le...", type: "password" },
    ],
  },
  {
    id: "turnstile",
    name: "Cloudflare Turnstile",
    description: "Privacy-friendly CAPTCHA alternative by Cloudflare",
    icon: "fa-solid fa-shield-halved",
    color: "text-[#f38020]",
    category: "security",
    status: "available",
    connectionType: "api_key",
    providerKey: "turnstile",
    table: "captcha_integrations",
    apiKeyUrl: "https://dash.cloudflare.com/?to=/:account/turnstile",
    apiKeyLabel: "Get site key",
    extraFields: [
      { key: "siteKey", label: "Site Key", placeholder: "0x...", type: "text" },
      { key: "secretKey", label: "Secret Key", placeholder: "0x...", type: "password" },
    ],
  },

  // ── Address & Maps (available) ───────────────────────────────────
  {
    id: "google_places",
    name: "Google Places",
    description: "Address autocomplete with Google Maps Places API",
    icon: "fa-brands fa-google",
    color: "text-[#4285f4]",
    category: "address",
    status: "available",
    connectionType: "api_key",
    providerKey: "google",
    table: "geocoding_integrations",
    apiKeyUrl: "https://console.cloud.google.com/apis/credentials",
    apiKeyLabel: "Get API key",
  },
  {
    id: "openstreetmap",
    name: "OpenStreetMap",
    description: "Free, open-source geocoding. No setup required.",
    icon: "fa-solid fa-map",
    color: "text-[#7ebc6f]",
    category: "address",
    status: "available",
    connectionType: "none",
    providerKey: "openstreetmap",
    table: "geocoding_integrations",
  },

  // ── CRM (coming soon) ───────────────────────────────────────────
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Send new contacts to your CRM and create new deals",
    icon: "fa-brands fa-hubspot",
    color: "text-[#ff7a59]",
    category: "crm",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Send new leads, contacts, or accounts to your sales CRM",
    icon: "fa-brands fa-salesforce",
    color: "text-[#00a1e0]",
    category: "crm",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    description: "Create deals and contacts from form submissions",
    icon: "fa-solid fa-handshake",
    color: "text-[#017737]",
    category: "crm",
    status: "coming_soon",
    connectionType: "api_key",
  },
  {
    id: "zoho_crm",
    name: "Zoho CRM",
    description: "Sync leads and contacts to your Zoho CRM",
    icon: "fa-solid fa-address-card",
    color: "text-[#e42527]",
    category: "crm",
    status: "coming_soon",
    connectionType: "oauth",
  },

  // ── Communication (coming soon) ──────────────────────────────────
  {
    id: "slack",
    name: "Slack",
    description: "Sync form submissions to Slack channels or teammates",
    icon: "fa-brands fa-slack",
    color: "text-[#4a154b]",
    category: "communication",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "microsoft_teams",
    name: "Microsoft Teams",
    description: "Send submission notifications to Teams channels",
    icon: "fa-brands fa-microsoft",
    color: "text-[#6264A7]",
    category: "communication",
    status: "coming_soon",
    connectionType: "oauth",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Post form submissions to Discord channels",
    icon: "fa-brands fa-discord",
    color: "text-[#5865F2]",
    category: "communication",
    status: "coming_soon",
    connectionType: "oauth",
  },

  // ── Email Marketing (coming soon) ────────────────────────────────
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Add and update contacts in your email lists",
    icon: "fa-brands fa-mailchimp",
    color: "text-[#ffe01b]",
    category: "email_marketing",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    description: "Update contacts and deals in your sales CRM",
    icon: "fa-solid fa-paper-plane",
    color: "text-[#356ae6]",
    category: "email_marketing",
    status: "coming_soon",
    connectionType: "api_key",
  },
  {
    id: "constant_contact",
    name: "Constant Contact",
    description: "Add new contacts to your email marketing lists",
    icon: "fa-solid fa-envelope-circle-check",
    color: "text-[#0066CC]",
    category: "email_marketing",
    status: "coming_soon",
    connectionType: "oauth",
  },

  // ── Productivity (coming soon) ───────────────────────────────────
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Instantly populate your spreadsheets with form data",
    icon: "fa-solid fa-table",
    color: "text-[#0f9d58]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "airtable",
    name: "Airtable",
    description: "Sync form submissions to your spreadsheet database",
    icon: "fa-solid fa-database",
    color: "text-[#18BFFF]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "api_key",
    popular: true,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Create pages and database entries from submissions",
    icon: "fa-solid fa-n",
    color: "text-[#000000]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
    popular: true,
  },
  {
    id: "trello",
    name: "Trello",
    description: "Convert form submissions into new Trello cards",
    icon: "fa-brands fa-trello",
    color: "text-[#0052CC]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
  },
  {
    id: "asana",
    name: "Asana",
    description: "Add new projects, tasks, and comments in Asana",
    icon: "fa-solid fa-list-check",
    color: "text-[#F06A6A]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
  },
  {
    id: "monday",
    name: "Monday.com",
    description: "Add new items and updates on your project boards",
    icon: "fa-solid fa-calendar-check",
    color: "text-[#6161ff]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Automatically add new events to your calendar",
    icon: "fa-solid fa-calendar-days",
    color: "text-[#4285F4]",
    category: "productivity",
    status: "coming_soon",
    connectionType: "oauth",
  },

  // ── Automation (coming soon -- users can already use via Send To) ─
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 7,000+ apps via Zapier webhooks",
    icon: "fa-solid fa-bolt",
    color: "text-[#ff4a00]",
    category: "automation",
    status: "available",
    connectionType: "none",
    popular: true,
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Connect to Make scenarios via webhooks",
    icon: "fa-solid fa-gear",
    color: "text-[#6D00CC]",
    category: "automation",
    status: "available",
    connectionType: "none",
    popular: true,
  },
];

/* ── Helpers ──────────────────────────────────────────────────────── */

export function getIntegration(id: string) {
  return INTEGRATIONS.find((i) => i.id === id);
}

export function getIntegrationsByCategory(category: IntegrationCategory | "all" | "popular") {
  if (category === "all") return INTEGRATIONS;
  if (category === "popular") return INTEGRATIONS.filter((i) => i.popular);
  return INTEGRATIONS.filter((i) => i.category === category);
}

export function getCategoryCounts() {
  const counts: Record<string, number> = { all: INTEGRATIONS.length, popular: 0 };
  for (const i of INTEGRATIONS) {
    counts[i.category] = (counts[i.category] ?? 0) + 1;
    if (i.popular) counts.popular++;
  }
  return counts;
}
