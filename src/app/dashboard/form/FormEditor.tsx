"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import type { FormSchema, StepDef, FieldDef, FieldType, PackageConfig, PackageOption, PackageFeature, PackageRule, PackageLayout, RepeaterConfig, RepeaterSubField, AssetCollectionConfig, AssetCategory, SiteStructureConfig, FeatureSelectorConfig, FeatureOption, GoalBuilderConfig, GoalOption, GoalRefinement, ApprovalConfig, PaymentConfig, PaymentProvider, CaptchaConfig, CaptchaProvider, RatingConfig, SliderConfig, SocialHandlesConfig, SocialPlatformId, MatrixConfig, QuestionnaireConfig, QuestionnaireQuestion, PropertyDetailsConfig, InsuranceInfoConfig, GuestRsvpConfig, RoomSelectorConfig, RoomOption, LoanCalculatorConfig, CaseIntakeConfig, DonationTierConfig, DonationTier, VolunteerSignupConfig, CauseSelectorConfig, CauseOption, CalculatedFieldConfig, CalculatedFormat, ChainedSelectConfig, ChainedSelectOption, ChainedSelectLevel } from "@/lib/forms";
import { SOCIAL_PLATFORMS, GRID_COLUMNS, MIN_COL_SPAN, getMinColSpan, getEffectiveColSpan } from "@/lib/forms";
import { COUNTRIES } from "@/data/countries";
import { PROVIDER_META, type CloudProvider } from "@/lib/cloud/providers";
import CloudDestinationButton from "@/components/CloudDestinationButton";
import IconPicker from "@/components/IconPicker";
import { saveFormSchemaAction } from "./actions";

/* ── Field type catalogue ──────────────────────────────────── */

type FieldCategory = "general" | "smart" | "advanced";
type IndustryTag = "web_design" | "marketing" | "real_estate" | "healthcare" | "education" | "ecommerce" | "consulting" | "events" | "legal" | "finance" | "nonprofit" | "hospitality";

interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: string;
  group: "standard" | "advanced";
  category: FieldCategory;
  description?: string;
  disabled?: boolean;
  tags?: IndustryTag[];
}

const FIELD_CATEGORIES: { id: FieldCategory; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "fa-grip" },
  { id: "smart", label: "Smart", icon: "fa-wand-magic-sparkles" },
  { id: "advanced", label: "Advanced", icon: "fa-rocket" },
];

const INDUSTRY_TAGS: { id: IndustryTag; label: string; icon: string; color: string }[] = [
  { id: "web_design", label: "Web Design", icon: "fa-globe", color: "#818cf8" },
  { id: "marketing", label: "Marketing", icon: "fa-bullhorn", color: "#f472b6" },
  { id: "real_estate", label: "Real Estate", icon: "fa-house", color: "#34d399" },
  { id: "healthcare", label: "Healthcare", icon: "fa-heart-pulse", color: "#f87171" },
  { id: "education", label: "Education", icon: "fa-graduation-cap", color: "#fbbf24" },
  { id: "ecommerce", label: "E-Commerce", icon: "fa-cart-shopping", color: "#a78bfa" },
  { id: "consulting", label: "Consulting", icon: "fa-handshake", color: "#60a5fa" },
  { id: "events", label: "Events", icon: "fa-champagne-glasses", color: "#fb923c" },
  { id: "legal", label: "Legal", icon: "fa-scale-balanced", color: "#94a3b8" },
  { id: "finance", label: "Finance", icon: "fa-building-columns", color: "#2dd4bf" },
  { id: "nonprofit", label: "Nonprofit", icon: "fa-hand-holding-heart", color: "#e879f9" },
  { id: "hospitality", label: "Hospitality", icon: "fa-concierge-bell", color: "#fca5a5" },
];

const FIELD_CATALOGUE: FieldTypeInfo[] = [
  // ── General ──
  { type: "text", label: "Short Text", icon: "fa-font", group: "standard", category: "general", description: "Single-line text with optional max length",
    tags: ["web_design", "marketing", "real_estate", "healthcare", "education", "ecommerce", "consulting", "events", "legal", "finance", "nonprofit", "hospitality"] },
  { type: "textarea", label: "Long Text", icon: "fa-align-left", group: "standard", category: "general", description: "Multi-line text area",
    tags: ["web_design", "marketing", "consulting", "legal", "education", "nonprofit"] },
  { type: "name", label: "Name", icon: "fa-user", group: "standard", category: "general", description: "First, last, middle, prefix & suffix",
    tags: ["healthcare", "real_estate", "legal", "finance", "education", "consulting", "events", "nonprofit", "hospitality"] },
  { type: "email", label: "Email", icon: "fa-envelope", group: "standard", category: "general", description: "Email with validation & confirmation",
    tags: ["web_design", "marketing", "real_estate", "healthcare", "education", "ecommerce", "consulting", "events", "legal", "finance", "nonprofit", "hospitality"] },
  { type: "tel", label: "Phone", icon: "fa-phone", group: "standard", category: "general", description: "Phone with formatting & country code",
    tags: ["real_estate", "healthcare", "consulting", "legal", "finance", "events", "hospitality"] },
  { type: "number", label: "Number", icon: "fa-hashtag", group: "standard", category: "general", description: "Numeric input",
    tags: ["finance", "ecommerce", "healthcare", "education"] },
  { type: "select", label: "Dropdown", icon: "fa-caret-down", group: "standard", category: "general", description: "Single-choice dropdown",
    tags: ["web_design", "marketing", "consulting", "education", "healthcare"] },
  { type: "radio", label: "Radio Choice", icon: "fa-circle-dot", group: "standard", category: "general", description: "Single-choice radio buttons",
    tags: ["marketing", "education", "consulting", "healthcare"] },
  { type: "checkbox", label: "Checkbox", icon: "fa-square-check", group: "standard", category: "general", description: "Multi-choice checkboxes",
    tags: ["web_design", "marketing", "consulting", "education"] },
  { type: "date", label: "Date Picker", icon: "fa-calendar", group: "standard", category: "general", description: "Date selector",
    tags: ["events", "real_estate", "consulting", "healthcare", "legal", "hospitality"] },
  { type: "rating", label: "Rating / Stars", icon: "fa-star", group: "standard", category: "general", description: "Star rating selector",
    tags: ["ecommerce", "hospitality", "education", "consulting", "events"] },
  { type: "toggle", label: "Yes / No Toggle", icon: "fa-toggle-on", group: "standard", category: "general", description: "Simple yes/no switch",
    tags: ["healthcare", "legal", "consulting", "education"] },
  { type: "slider", label: "Slider / Range", icon: "fa-gauge", group: "standard", category: "general", description: "Numeric slider with min/max",
    tags: ["finance", "marketing", "consulting", "ecommerce"] },
  { type: "address", label: "Address", icon: "fa-location-dot", group: "standard", category: "general", description: "Structured address with autocomplete",
    tags: ["real_estate", "healthcare", "legal", "ecommerce", "events", "hospitality", "nonprofit"] },
  { type: "url", label: "URL", icon: "fa-link", group: "standard", category: "general", description: "Website URL with validation",
    tags: ["web_design", "marketing", "ecommerce"] },
  { type: "color", label: "Color Picker", icon: "fa-palette", group: "standard", category: "general", description: "Hex color selector",
    tags: ["web_design", "marketing"] },
  // ── Smart (AI-powered) ──
  { type: "brand_style", label: "Brand Style Picker", icon: "fa-swatchbook", group: "advanced", category: "smart", description: "Visual style/vibe selector with AI tiles",
    tags: ["web_design", "marketing"] },
  { type: "competitor_analyzer", label: "Competitor Analyzer", icon: "fa-magnifying-glass-chart", group: "advanced", category: "smart", description: "Auto-scrape competitors & AI summarize",
    tags: ["web_design", "marketing", "ecommerce", "consulting"] },
  { type: "goal_builder", label: "Goal Builder", icon: "fa-bullseye", group: "advanced", category: "smart", description: "Interactive goal picker with refinements",
    tags: ["web_design", "marketing", "consulting", "nonprofit", "education"] },
  { type: "questionnaire", label: "Questionnaire", icon: "fa-clipboard-question", group: "advanced", category: "smart", description: "Scored questions with points",
    tags: ["healthcare", "education", "consulting", "legal", "finance"] },
  { type: "matrix", label: "Matrix / Grid", icon: "fa-table-cells-large", group: "advanced", category: "smart", description: "Row-by-column selection grid",
    tags: ["education", "consulting", "healthcare", "marketing"] },
  // ── Advanced ──
  { type: "package", label: "Package Selector", icon: "fa-box-open", group: "advanced", category: "advanced", description: "Pricing & package comparison",
    tags: ["web_design", "marketing", "ecommerce", "consulting", "events"] },
  { type: "site_structure", label: "Site Structure", icon: "fa-sitemap", group: "advanced", category: "advanced", description: "Visual sitemap builder",
    tags: ["web_design"] },
  { type: "feature_selector", label: "Feature Selector", icon: "fa-puzzle-piece", group: "advanced", category: "advanced", description: "Toggle features with price impact",
    tags: ["web_design", "ecommerce"] },
  { type: "asset_collection", label: "Asset Collection", icon: "fa-images", group: "advanced", category: "advanced", description: "Collect logos, colors, fonts & docs",
    tags: ["web_design", "marketing"] },
  { type: "timeline", label: "Timeline Selector", icon: "fa-calendar-days", group: "advanced", category: "advanced", description: "Project dates, milestones & blackout dates",
    tags: ["web_design", "consulting", "events", "real_estate", "legal"] },
  { type: "budget_allocator", label: "Budget Allocator", icon: "fa-sliders", group: "advanced", category: "advanced", description: "Visual budget sliders across channels",
    tags: ["marketing", "consulting", "finance", "nonprofit"] },
  { type: "social_handles", label: "Social Media", icon: "fa-share-nodes", group: "advanced", category: "advanced", description: "Collect social media handles with verification",
    tags: ["marketing", "ecommerce", "events", "hospitality"] },
  { type: "repeater", label: "Repeater / Pages", icon: "fa-layer-group", group: "advanced", category: "advanced", description: "Repeatable entry groups",
    tags: ["web_design", "real_estate", "education", "ecommerce"] },
  { type: "file", label: "File Upload", icon: "fa-paperclip", group: "advanced", category: "advanced", description: "Single file upload",
    tags: ["legal", "healthcare", "real_estate", "consulting", "education"] },
  { type: "files", label: "Multi-File", icon: "fa-folder-open", group: "advanced", category: "advanced", description: "Multiple file uploads",
    tags: ["legal", "healthcare", "real_estate", "consulting", "education"] },
  { type: "approval", label: "Approval / Sign-off", icon: "fa-signature", group: "advanced", category: "advanced", description: "Digital signature & scope approval",
    tags: ["legal", "consulting", "real_estate", "finance"] },
  { type: "payment", label: "Payment", icon: "fa-credit-card", group: "advanced", category: "advanced", description: "Collect payments via Stripe, PayPal, or Square",
    tags: ["ecommerce", "consulting", "events", "hospitality", "nonprofit", "education"] },
  // ── General ──
  { type: "heading", label: "Section Heading", icon: "fa-heading", group: "advanced", category: "general", description: "Display-only section header" },
  // ── Advanced ──
  { type: "consent", label: "Consent / Terms", icon: "fa-file-contract", group: "advanced", category: "advanced", description: "Agreement with checkbox",
    tags: ["legal", "healthcare", "finance", "ecommerce"] },
  { type: "captcha", label: "Bot Protection", icon: "fa-shield-halved", group: "advanced", category: "advanced", description: "reCAPTCHA or Cloudflare Turnstile" },
  // ── Industry-Specific ──
  { type: "property_details", label: "Property Details", icon: "fa-house-chimney", group: "advanced", category: "smart", description: "Beds, baths, sqft, lot & property type",
    tags: ["real_estate"] },
  { type: "insurance_info", label: "Insurance Info", icon: "fa-id-card", group: "advanced", category: "smart", description: "Provider, policy, group & subscriber",
    tags: ["healthcare"] },
  { type: "guest_rsvp", label: "Guest RSVP", icon: "fa-champagne-glasses", group: "advanced", category: "smart", description: "Attendance, meal choice & dietary needs",
    tags: ["events", "hospitality"] },
  { type: "room_selector", label: "Room / Service", icon: "fa-bed", group: "advanced", category: "smart", description: "Room or service cards with amenities & pricing",
    tags: ["hospitality", "events"] },
  { type: "loan_calculator", label: "Loan Calculator", icon: "fa-calculator", group: "advanced", category: "smart", description: "Interactive loan amount, rate & term calculator",
    tags: ["finance", "real_estate"] },
  { type: "case_intake", label: "Case Intake", icon: "fa-scale-balanced", group: "advanced", category: "smart", description: "Case type, jurisdiction & incident details",
    tags: ["legal"] },
  { type: "donation_tier", label: "Donation Tiers", icon: "fa-hand-holding-heart", group: "advanced", category: "smart", description: "Giving levels with impact statements",
    tags: ["nonprofit"] },
  { type: "volunteer_signup", label: "Volunteer Signup", icon: "fa-people-carry-box", group: "advanced", category: "smart", description: "Availability grid, skills & frequency",
    tags: ["nonprofit", "events"] },
  { type: "cause_selector", label: "Cause / Program", icon: "fa-ribbon", group: "advanced", category: "smart", description: "Pick causes or programs to support",
    tags: ["nonprofit"] },
  { type: "calculated", label: "Calculated Field", icon: "fa-calculator", group: "advanced", category: "smart", description: "Live formula results from other fields",
    tags: ["finance", "ecommerce", "consulting", "real_estate"] },
  { type: "chained_select", label: "Chained Dropdown", icon: "fa-bars-staggered", group: "advanced", category: "smart", description: "Hierarchical dependent dropdowns",
    tags: ["consulting", "ecommerce", "web_design", "healthcare", "education", "real_estate"] },
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

/* ── Chained Select tree editor ────────────────────────────── */

function ChainedOptionTreeEditor({
  options,
  depth,
  maxDepth,
  onChange,
}: {
  options: ChainedSelectOption[];
  depth: number;
  maxDepth: number;
  onChange: (opts: ChainedSelectOption[]) => void;
}) {
  return (
    <div className={depth > 0 ? "ml-4 pl-3 border-l-2 border-outline-variant/20 space-y-1.5" : "space-y-1.5"}>
      {options.map((opt, i) => (
        <div key={i}>
          <div className="flex gap-1.5 items-center">
            <input
              value={opt.label}
              onChange={(e) => {
                const updated = [...options];
                updated[i] = { ...updated[i], label: e.target.value };
                onChange(updated);
              }}
              placeholder="Label"
              className="flex-1 px-2 py-1 text-xs bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none placeholder:text-on-surface-variant/30"
            />
            <input
              value={opt.value}
              onChange={(e) => {
                const updated = [...options];
                updated[i] = { ...updated[i], value: e.target.value };
                onChange(updated);
              }}
              placeholder="value_key"
              className="flex-1 px-2 py-1 text-xs bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none placeholder:text-on-surface-variant/30 font-mono"
            />
            {depth < maxDepth && (
              <button
                type="button"
                onClick={() => {
                  const updated = [...options];
                  updated[i] = {
                    ...updated[i],
                    children: [...(updated[i].children ?? []), { label: "", value: "" }],
                  };
                  onChange(updated);
                }}
                className="text-[10px] text-primary/70 hover:text-primary shrink-0"
                title="Add child option"
              >
                <i className="fa-solid fa-plus" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(options.filter((_, idx) => idx !== i))}
              className="text-error/60 hover:text-error text-xs shrink-0"
              title="Remove option"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          {opt.children && opt.children.length > 0 && depth < maxDepth && (
            <ChainedOptionTreeEditor
              options={opt.children}
              depth={depth + 1}
              maxDepth={maxDepth}
              onChange={(children) => {
                const updated = [...options];
                updated[i] = { ...updated[i], children };
                onChange(updated);
              }}
            />
          )}
        </div>
      ))}
      {options.length === 0 && (
        <p className="text-[10px] text-on-surface-variant/40 italic">No options yet</p>
      )}
    </div>
  );
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
  if (type === "brand_style") {
    base.label = "Brand Style";
    base.brandStyleConfig = {
      styles: [
        { id: "modern", name: "Modern & Minimal", palette: ["#0f172a", "#3b82f6", "#f8fafc", "#e2e8f0", "#1e293b"], fontFamily: "Inter", description: "Clean lines, generous whitespace, sans-serif typography" },
        { id: "corporate", name: "Corporate & Professional", palette: ["#1e3a5f", "#2563eb", "#f1f5f9", "#cbd5e1", "#0f172a"], fontFamily: "Merriweather", description: "Trustworthy, structured, serif accents" },
        { id: "playful", name: "Playful & Creative", palette: ["#7c3aed", "#f472b6", "#fef3c7", "#a3e635", "#1e1b4b"], fontFamily: "Poppins", description: "Bold colors, rounded shapes, friendly feel" },
        { id: "luxury", name: "Luxury & Elegant", palette: ["#1c1917", "#d4a574", "#fafaf9", "#292524", "#78716c"], fontFamily: "Playfair Display", description: "Rich neutrals, gold accents, refined typography" },
      ],
      allowMultiple: false,
    };
  }
  if (type === "competitor_analyzer") {
    base.label = "Competitors";
    base.competitorAnalyzerConfig = {
      maxCompetitors: 5,
      placeholder: "https://competitor.com",
      autoFetch: true,
      aiSummary: true,
    };
  }
  if (type === "timeline") {
    base.label = "Project Timeline";
    base.timelineConfig = {
      showStartDate: true,
      showEndDate: true,
      allowBlackoutDates: true,
      milestones: [
        { id: "design", label: "Design Approval", required: false },
        { id: "content", label: "Content Delivery", required: false },
        { id: "launch", label: "Launch Date", required: false },
      ],
    };
  }
  if (type === "budget_allocator") {
    base.label = "Budget Allocation";
    base.budgetAllocatorConfig = {
      mode: "constrained",
      totalBudget: 5000,
      maxPerChannel: 10000,
      currency: "$",
      showAsPercentage: false,
      channels: [
        { id: "google", label: "Google Ads", icon: "fa-google", defaultValue: 40 },
        { id: "meta", label: "Meta / Facebook", icon: "fa-meta", defaultValue: 30 },
        { id: "seo", label: "SEO", icon: "fa-magnifying-glass", defaultValue: 20 },
        { id: "other", label: "Other", icon: "fa-ellipsis", defaultValue: 10 },
      ],
    };
  }
  if (type === "payment") {
    base.label = "Payment";
    base.paymentConfig = {
      provider: "stripe",
      mode: "one_time",
      currency: "usd",
      customAmount: false,
      amountCents: 0,
      buttonLabel: "Pay Now",
      collectBillingAddress: false,
    };
  }
  if (type === "captcha") {
    base.label = "Bot Protection";
    base.captchaConfig = {
      provider: "recaptcha",
      mode: "visible",
    };
  }
  if (type === "rating") {
    base.ratingConfig = { maxStars: 5, allowHalf: false };
  }
  if (type === "slider") {
    base.sliderConfig = { min: 0, max: 100, step: 1, unit: "", showValue: true };
  }
  if (type === "social_handles") {
    base.label = "Social Media Handles";
    base.socialHandlesConfig = { platforms: ["instagram", "facebook", "x", "linkedin", "tiktok", "youtube"] };
  }
  if (type === "name") {
    base.label = "Full Name";
    base.nameConfig = { fields: ["first", "last"], layout: "inline", prefixes: ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."] };
  }
  if (type === "email") {
    base.label = "Email";
    base.emailConfig = { confirmEmail: false, blockedDomains: [], allowedDomains: [] };
  }
  if (type === "tel") {
    base.label = "Phone";
    base.phoneConfig = { format: "us", defaultCountry: "US", showExtension: false };
  }
  if (type === "address") {
    base.label = "Address";
    base.addressConfig = { mode: "autocomplete", autocompleteProvider: "openstreetmap", region: "us", fields: ["street", "street2", "city", "state", "zip", "country"] };
  }
  if (type === "matrix") {
    base.label = "Rate Each Area";
    base.matrixConfig = {
      rows: ["Quality", "Speed", "Communication", "Value"],
      columns: ["Poor", "Fair", "Good", "Excellent"],
      multiSelect: false,
    };
  }
  if (type === "questionnaire") {
    base.label = "Quick Assessment";
    base.questionnaireConfig = {
      questions: [
        { id: `q_${uid()}`, text: "How would you describe your current online presence?", answers: [{ label: "Non-existent", score: 1 }, { label: "Basic", score: 2 }, { label: "Moderate", score: 3 }, { label: "Strong", score: 4 }] },
        { id: `q_${uid()}`, text: "What is your primary business model?", answers: [{ label: "Service-based", score: 1 }, { label: "Product-based", score: 2 }, { label: "Subscription", score: 3 }, { label: "Marketplace", score: 4 }] },
      ],
      showScore: false,
    };
  }
  if (type === "property_details") {
    base.label = "Property Details";
    base.propertyDetailsConfig = {
      fields: ["property_type", "bedrooms", "bathrooms", "sqft", "lot_size", "year_built", "parking"],
      showPrice: false,
      currency: "$",
    };
  }
  if (type === "insurance_info") {
    base.label = "Insurance Information";
    base.insuranceInfoConfig = {
      fields: ["provider", "plan_type", "policy_number", "group_number", "subscriber_name", "relationship"],
      providers: ["Aetna", "Anthem", "Blue Cross Blue Shield", "Cigna", "Humana", "Kaiser Permanente", "Medicaid", "Medicare", "MetLife", "UnitedHealthcare"],
    };
  }
  if (type === "guest_rsvp") {
    base.label = "RSVP";
    base.guestRsvpConfig = {
      mealOptions: [
        { label: "Chicken", icon: "fa-drumstick-bite" },
        { label: "Fish", icon: "fa-fish" },
        { label: "Vegetarian", icon: "fa-leaf" },
        { label: "Vegan", icon: "fa-seedling" },
      ],
      allowPlusOnes: true,
      maxPlusOnes: 3,
      showDietary: true,
      showNotes: true,
      dietaryOptions: ["Gluten-Free", "Dairy-Free", "Nut Allergy", "Shellfish Allergy", "Kosher", "Halal"],
    };
  }
  if (type === "room_selector") {
    base.label = "Select Your Room";
    base.roomSelectorConfig = {
      rooms: [
        { id: `rm_${uid()}`, name: "Standard Room", description: "Comfortable room with essential amenities", amenities: ["Wi-Fi", "TV", "Air Conditioning"], pricePerNight: 129, maxGuests: 2, icon: "fa-bed" },
        { id: `rm_${uid()}`, name: "Deluxe Suite", description: "Spacious suite with premium furnishings", amenities: ["Wi-Fi", "TV", "Mini Bar", "Room Service", "City View"], pricePerNight: 249, maxGuests: 3, icon: "fa-star" },
        { id: `rm_${uid()}`, name: "Presidential Suite", description: "Our finest accommodation with luxury touches", amenities: ["Wi-Fi", "TV", "Mini Bar", "Room Service", "Ocean View", "Jacuzzi", "Butler"], pricePerNight: 599, maxGuests: 4, icon: "fa-crown" },
      ],
      showPricing: true,
      currency: "$",
      multiSelect: false,
      columns: 3,
    };
  }
  if (type === "loan_calculator") {
    base.label = "Loan Calculator";
    base.loanCalculatorConfig = {
      minAmount: 10000,
      maxAmount: 1000000,
      defaultAmount: 250000,
      minRate: 1,
      maxRate: 15,
      defaultRate: 6.5,
      termOptions: [60, 120, 180, 240, 360],
      defaultTerm: 360,
      currency: "$",
      calculatorLabel: "Mortgage Calculator",
    };
  }
  if (type === "case_intake") {
    base.label = "Case Information";
    base.caseIntakeConfig = {
      caseTypes: ["Personal Injury", "Family Law", "Criminal Defense", "Estate Planning", "Business Law", "Real Estate", "Employment Law", "Immigration", "Bankruptcy", "Intellectual Property"],
      showJurisdiction: true,
      showDateOfIncident: true,
      showOpposingParty: true,
      showDescription: true,
      showStatuteWarning: false,
    };
  }
  if (type === "donation_tier") {
    base.label = "Select Your Giving Level";
    base.donationTierConfig = {
      tiers: [
        { id: `tier_${uid()}`, label: "Supporter", amount: 25, impact: "Provides meals for a family for one week", icon: "fa-heart" },
        { id: `tier_${uid()}`, label: "Champion", amount: 100, impact: "Supplies school materials for 10 children", icon: "fa-star", featured: true },
        { id: `tier_${uid()}`, label: "Hero", amount: 250, impact: "Funds a community workshop for a month", icon: "fa-trophy" },
        { id: `tier_${uid()}`, label: "Visionary", amount: 500, impact: "Sponsors an entire program for one quarter", icon: "fa-crown" },
      ],
      allowCustom: true,
      currency: "$",
      showRecurring: true,
      recurringOptions: ["one_time", "monthly", "quarterly", "annually"],
    };
  }
  if (type === "volunteer_signup") {
    base.label = "Volunteer Availability";
    base.volunteerSignupConfig = {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      timeSlots: ["Morning (8am-12pm)", "Afternoon (12pm-5pm)", "Evening (5pm-9pm)"],
      skills: ["Teaching", "Cooking", "Driving", "Construction", "Fundraising", "Event Planning", "Mentoring", "Administrative", "Technology", "Medical"],
      showFrequency: true,
      showNotes: true,
      maxSlots: 0,
    };
  }
  if (type === "calculated") {
    base.calculatedFieldConfig = {
      formula: "",
      format: "currency",
      decimalPlaces: 2,
      currencySymbol: "$",
    };
  }
  if (type === "chained_select") {
    base.chainedSelectConfig = {
      levels: [
        { label: "Category", placeholder: "Select category..." },
        { label: "Service", placeholder: "Select service..." },
      ],
      options: [
        {
          label: "Web Design", value: "web_design",
          children: [
            { label: "Landing Page", value: "landing_page" },
            { label: "Full Website", value: "full_website" },
            { label: "E-Commerce", value: "ecommerce" },
          ],
        },
        {
          label: "Marketing", value: "marketing",
          children: [
            { label: "SEO", value: "seo" },
            { label: "Social Media", value: "social_media" },
            { label: "PPC Ads", value: "ppc_ads" },
          ],
        },
      ],
    };
  }
  if (type === "cause_selector") {
    base.label = "Which cause speaks to you?";
    base.causeSelectorConfig = {
      causes: [
        { id: `cause_${uid()}`, name: "Education", description: "Support literacy programs and school supplies for underserved communities", icon: "fa-graduation-cap", goal: "$50,000" },
        { id: `cause_${uid()}`, name: "Hunger Relief", description: "Help feed families in need through local food banks and meal programs", icon: "fa-bowl-food", goal: "$30,000" },
        { id: `cause_${uid()}`, name: "Environment", description: "Fund clean water initiatives and conservation projects", icon: "fa-leaf", goal: "$40,000" },
        { id: `cause_${uid()}`, name: "Health & Wellness", description: "Provide medical supplies and health screenings to those without access", icon: "fa-heart-pulse", goal: "$60,000" },
      ],
      multiSelect: true,
      maxSelections: 0,
      columns: 2,
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

export default function FormEditor({ initialSchema, onOpenTemplates, formId, hasAI, hasPaymentGateway }: { initialSchema: FormSchema; onOpenTemplates?: () => void; formId?: string; hasAI?: boolean; hasPaymentGateway?: boolean }) {
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
  const [dropTarget, setDropTarget] = useState<{ stepId: string; index: number; side?: "left" | "right" } | null>(null);
  const [stepDropTarget, setStepDropTarget] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Resize-to-resize state ────────────────────────────── */
  const resizeRef = useRef<{
    stepId: string;
    fieldId: string;
    startX: number;
    startSpan: number;
    minSpan: number;
    gridColWidth: number;
  } | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);
  const [resizePreviewSpan, setResizePreviewSpan] = useState<number | null>(null);

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

  /* ── Auto-save (debounced 2s after last change) ────────── */
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(JSON.stringify(initialSchema));
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("saved");
  const [saveSource, setSaveSource] = useState<"manual" | "auto">("auto");
  const [savedAt, setSavedAt] = useState<string>("");

  useEffect(() => {
    if (!formId) return;
    const current = JSON.stringify(schema);
    if (current === lastSavedRef.current) return;

    setAutoSaveStatus("idle");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      const result = await saveFormSchemaAction(current, formId);
      if (result.ok) {
        lastSavedRef.current = current;
        setSaveSource("auto");
        setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
        setAutoSaveStatus("saved");
      } else {
        setAutoSaveStatus("idle");
        setMessage({ kind: "err", text: result.error ?? "Auto-save failed." });
      }
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema, formId]);

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

  /* ── Resize handlers ────────────────────────────────────── */

  function startResize(e: React.MouseEvent, stepId: string, fieldId: string, fieldType: FieldType, currentSpan: number) {
    e.preventDefault();
    e.stopPropagation();

    // Find the grid container to measure column width
    const target = e.currentTarget as HTMLElement;
    const gridEl = target.closest(".grid.grid-cols-4") as HTMLElement | null;
    if (!gridEl) return;

    const gridRect = gridEl.getBoundingClientRect();
    const gap = 8; // gap-2 = 0.5rem = 8px
    const gridColWidth = (gridRect.width - gap * 3) / GRID_COLUMNS;

    resizeRef.current = {
      stepId,
      fieldId,
      startX: e.clientX,
      startSpan: currentSpan,
      minSpan: getMinColSpan(fieldType),
      gridColWidth,
    };
    setResizingFieldId(fieldId);
    setResizePreviewSpan(currentSpan);

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const spanDelta = Math.round(dx / resizeRef.current.gridColWidth);
      const newSpan = Math.max(
        resizeRef.current.minSpan,
        Math.min(GRID_COLUMNS, resizeRef.current.startSpan + spanDelta),
      );
      setResizePreviewSpan(newSpan);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (resizeRef.current) {
        const { stepId: sid, fieldId: fid, startSpan } = resizeRef.current;
        // Use functional updater to read latest preview span
        setResizePreviewSpan((latest) => {
          if (latest !== null && latest !== startSpan) {
            updateField(sid, fid, { colSpan: latest as 1 | 2 | 3 | 4 });
          }
          return null;
        });
      }
      resizeRef.current = null;
      setResizingFieldId(null);
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  /* ── Drag handlers ─────────────────────────────────────── */
  function startDragPalette(type: FieldType, label: string) {
    dragPayload.current = { kind: "palette", fieldType: type, label };
    setIsDragging(true);
  }
  function startDragField(stepId: string, fieldId: string) {
    dragPayload.current = { kind: "field", sourceStepId: stepId, fieldId };
    setIsDragging(true);
  }
  function handleDragOverField(e: React.DragEvent, stepId: string, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // Detect side-drop: check if mouse is on left or right 30% of the field card
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    // Get the field being hovered over
    const step = schema.steps.find((s) => s.id === stepId);
    const hoveredField = step?.fields[index];
    const hoveredSpan = hoveredField ? getEffectiveColSpan(hoveredField) : GRID_COLUMNS;
    // Only allow side-drop if the hovered field isn't already at minimum span
    // and the hovered field has room to share
    const hoveredMin = hoveredField ? getMinColSpan(hoveredField.type) : GRID_COLUMNS;
    // Determine the dragged field's minimum span
    let draggedMin = 1;
    if (dragPayload.current?.kind === "palette") {
      draggedMin = getMinColSpan(dragPayload.current.fieldType);
    } else if (dragPayload.current?.kind === "field") {
      const dragFieldId = (dragPayload.current as { fieldId: string }).fieldId;
      const df = schema.steps.flatMap((s) => s.fields).find((f) => f.id === dragFieldId);
      if (df) draggedMin = getMinColSpan(df.type);
    }
    // Can fit side by side? Both at their minimums must fit in GRID_COLUMNS
    const canSideDrop = hoveredMin + draggedMin <= GRID_COLUMNS && hoveredSpan > hoveredMin;
    if (canSideDrop && pct < 0.3) {
      setDropTarget({ stepId, index, side: "left" });
    } else if (canSideDrop && pct > 0.7) {
      setDropTarget({ stepId, index, side: "right" });
    } else {
      setDropTarget({ stepId, index });
    }
  }
  function handleDragOverStep(e: React.DragEvent, stepId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const step = schema.steps.find((s) => s.id === stepId);
    setDropTarget({ stepId, index: step?.fields.length ?? 0 });
  }
  function startDragStep(stepId: string) {
    dragPayload.current = { kind: "step", stepId };
    setIsDragging(true);
  }
  function handleDragOverStepSlot(e: React.DragEvent, index: number) {
    const kind = dragPayload.current?.kind;
    if (!kind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (kind === "step") {
      setStepDropTarget(index);
    } else {
      // Palette or field drag over step header — auto-expand + set field drop target
      const step = schema.steps[index];
      if (step) {
        // Auto-expand after 400ms hover
        if (!expandedSteps.has(step.id)) {
          if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
          autoExpandTimer.current = setTimeout(() => {
            setExpandedSteps((prev) => new Set(prev).add(step.id));
          }, 400);
        }
        setDropTarget({ stepId: step.id, index: step.fields.length });
      }
    }
  }
  function handleDragOverStepHeader(e: React.DragEvent, stepId: string) {
    const kind = dragPayload.current?.kind;
    if (!kind || kind === "step") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const step = schema.steps.find((s) => s.id === stepId);
    if (!step) return;
    // Auto-expand collapsed step on hover
    if (!expandedSteps.has(stepId)) {
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = setTimeout(() => {
        setExpandedSteps((prev) => new Set(prev).add(stepId));
      }, 400);
    }
    setDropTarget({ stepId, index: step.fields.length });
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
    setIsDragging(false);
    if (autoExpandTimer.current) { clearTimeout(autoExpandTimer.current); autoExpandTimer.current = null; }
  }
  function handleDragEnd() {
    dragPayload.current = null;
    setDropTarget(null);
    setStepDropTarget(null);
    setIsDragging(false);
    if (autoExpandTimer.current) { clearTimeout(autoExpandTimer.current); autoExpandTimer.current = null; }
  }
  function handleDrop(e: React.DragEvent, stepId: string, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const payload = dragPayload.current;
    if (!payload) return;

    const side = dropTarget?.side;

    if (payload.kind === "palette") {
      const field = makeField(payload.fieldType, payload.label);
      if (side) {
        // Side drop: insert beside the target field and auto-size both
        const step = schema.steps.find((s) => s.id === stepId);
        const targetField = step?.fields[index];
        if (targetField) {
          const targetSpan = getEffectiveColSpan(targetField);
          const droppedMin = getMinColSpan(field.type) as 1 | 2 | 3 | 4;
          const targetMin = getMinColSpan(targetField.type) as 1 | 2 | 3 | 4;
          // Split available space: give dropped field half (clamped to min), target keeps the rest
          const halfSpan = Math.max(droppedMin, Math.floor(GRID_COLUMNS / 2)) as 1 | 2 | 3 | 4;
          const newDroppedSpan = Math.min(halfSpan, GRID_COLUMNS - targetMin) as 1 | 2 | 3 | 4;
          const newTargetSpan = Math.min(GRID_COLUMNS - newDroppedSpan, targetSpan) as 1 | 2 | 3 | 4;
          field.colSpan = newDroppedSpan;
          const insertIdx = side === "left" ? index : index + 1;
          setSchema((prev) => ({
            steps: prev.steps.map((s) => {
              if (s.id !== stepId) return s;
              const fields = s.fields.map((f) =>
                f.id === targetField.id ? { ...f, colSpan: newTargetSpan } : f,
              );
              fields.splice(insertIdx, 0, field);
              return { ...s, fields };
            }),
          }));
          selectField(stepId, field.id);
        }
      } else {
        insertField(stepId, index, field);
        selectField(stepId, field.id);
      }
    } else if (payload.kind === "field") {
      const sourceStep = schema.steps.find((s) => s.id === payload.sourceStepId);
      const field = sourceStep?.fields.find((f) => f.id === payload.fieldId);
      if (!field) return;

      if (side) {
        // Side drop with existing field
        const step = schema.steps.find((s) => s.id === stepId);
        const targetField = step?.fields[index];
        if (targetField && targetField.id !== field.id) {
          const targetSpan = getEffectiveColSpan(targetField);
          const droppedMin = getMinColSpan(field.type) as 1 | 2 | 3 | 4;
          const targetMin = getMinColSpan(targetField.type) as 1 | 2 | 3 | 4;
          const halfSpan = Math.max(droppedMin, Math.floor(GRID_COLUMNS / 2)) as 1 | 2 | 3 | 4;
          const newDroppedSpan = Math.min(halfSpan, GRID_COLUMNS - targetMin) as 1 | 2 | 3 | 4;
          const newTargetSpan = Math.min(GRID_COLUMNS - newDroppedSpan, targetSpan) as 1 | 2 | 3 | 4;
          const insertIdx = side === "left" ? index : index + 1;
          setSchema((prev) => {
            // First remove the field from its source
            let steps = prev.steps.map((s) => {
              if (s.id === payload.sourceStepId) {
                return { ...s, fields: s.fields.filter((f) => f.id !== payload.fieldId) };
              }
              return s;
            });
            // Then insert beside target with new spans
            steps = steps.map((s) => {
              if (s.id !== stepId) return s;
              const fields = s.fields.map((f) =>
                f.id === targetField.id ? { ...f, colSpan: newTargetSpan } : f,
              );
              // Recalculate insert index after potential removal from same step
              const actualIdx = Math.min(
                side === "left"
                  ? fields.findIndex((f) => f.id === targetField.id)
                  : fields.findIndex((f) => f.id === targetField.id) + 1,
                fields.length,
              );
              fields.splice(actualIdx, 0, { ...field, colSpan: newDroppedSpan });
              return { ...s, fields };
            });
            return { steps };
          });
          selectField(stepId, field.id);
        }
      } else {
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
    }

    dragPayload.current = null;
    setDropTarget(null);
    setIsDragging(false);
    if (autoExpandTimer.current) { clearTimeout(autoExpandTimer.current); autoExpandTimer.current = null; }
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
    if (result.ok) {
      lastSavedRef.current = JSON.stringify(schema);
      setSaveSource("manual");
      setAutoSaveStatus("saved");
      setMessage({ kind: "ok", text: "Form saved!" });
    } else {
      setMessage({ kind: "err", text: result.error ?? "Save failed." });
    }
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
          {/* Auto-save indicator */}
          <span className="text-[10px] font-medium hidden sm:flex items-center gap-1.5">
            {message?.kind === "err" ? (
              <span className="text-error">{message.text}</span>
            ) : autoSaveStatus === "saving" ? (
              <><i className="fa-solid fa-circle-notch fa-spin text-[8px] text-on-surface-variant/50" /> <span className="text-on-surface-variant/50">Saving…</span></>
            ) : autoSaveStatus === "saved" ? (
              saveSource === "manual" ? (
                <><i className="fa-solid fa-check text-[8px] text-tertiary" /> <span className="text-tertiary">Saved</span></>
              ) : (
                <><i className="fa-solid fa-check text-[8px] text-tertiary" /> <span className="text-tertiary">Auto-saved{savedAt ? ` at ${savedAt}` : ""}</span></>
              )
            ) : (
              <><i className="fa-solid fa-circle text-[6px] text-amber-400" /> <span className="text-on-surface-variant/50">Unsaved</span></>
            )}
          </span>
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
            disabled={saving || autoSaveStatus === "saving"}
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg text-xs hover:shadow-[0_0_15px_rgba(192,193,255,0.4)] disabled:opacity-60 transition-all whitespace-nowrap"
            title="Save now (auto-saves after 2s)"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* ── Payment gateway warning ─────────────────────── */}
      {!hasPaymentGateway && schema.steps.some((s) => s.fields.some((f) => f.type === "payment")) && (
        <div className="shrink-0 px-6 lg:px-8 py-3 bg-amber-500/[0.06] border-b border-amber-500/15 flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-sm text-amber-400" />
          <p className="text-xs text-amber-300/90 leading-relaxed">
            <strong className="font-bold">No payment gateway connected.</strong>{" "}
            Your form includes a payment field, but no payment provider is set up. Payments will not process until you connect one in{" "}
            <a href="/dashboard/settings" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">Settings &rarr; Integrations</a>.
          </p>
        </div>
      )}

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
                    {/* Step drop indicator — full step ghost */}
                    {isStepDropBefore && (
                      <div className="w-full mb-2 px-4 py-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary/70 uppercase tracking-widest">
                          <i className="fa-solid fa-arrows-up-down text-[10px] mr-1.5" />
                          Move step here
                        </span>
                      </div>
                    )}
                    <div
                      draggable
                      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; startDragStep(step.id); }}
                      onDragOver={(e) => {
                        handleDragOverStepSlot(e, si);
                        handleDragOverStepHeader(e, step.id);
                      }}
                      onDrop={(e) => {
                        if (dragPayload.current?.kind === "step") {
                          handleDropStep(e, si);
                        } else {
                          handleDrop(e, step.id, step.fields.length);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      className={`w-full bg-surface-container border rounded-2xl shadow-lg shadow-black/10 overflow-hidden transition-all ${
                        isStepSelected
                          ? "border-primary/40 ring-1 ring-primary/20"
                          : isDragging && dragPayload.current?.kind !== "step" && dropTarget?.stepId === step.id
                            ? "border-primary/40 ring-2 ring-primary/20 shadow-primary/10"
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
                          className="px-4 sm:px-6 pb-5"
                          onDragOver={(e) => handleDragOverStep(e, step.id)}
                          onDrop={(e) => handleDrop(e, step.id, step.fields.length)}
                        >
                          {step.fields.length === 0 && (
                            <div className={`text-center py-8 text-sm rounded-xl transition-all ${
                              dropTarget?.stepId === step.id
                                ? "border-2 border-dashed border-primary/50 bg-primary/5 text-primary/70"
                                : isDragging && dragPayload.current?.kind !== "step"
                                  ? "border-2 border-dashed border-primary/30 bg-primary/[0.03] text-on-surface-variant/50"
                                  : "border-2 border-dashed border-outline-variant/20 text-on-surface-variant"
                            }`}>
                              {isDragging && dragPayload.current?.kind !== "step" ? (
                                <><i className="fa-solid fa-plus text-[10px] mr-1.5" />Drop field here</>
                              ) : (
                                "Drag a field here or click one from the panel"
                              )}
                            </div>
                          )}

                          {/* Grid layout for fields */}
                          <div className="grid grid-cols-4 gap-2">
                          {step.fields.map((field, fi) => {
                            const isSelected = selectedStepId === step.id && selectedFieldId === field.id;
                            const isDropBefore = dropTarget?.stepId === step.id && dropTarget?.index === fi && !dropTarget?.side;
                            const isDropLeft = dropTarget?.stepId === step.id && dropTarget?.index === fi && dropTarget?.side === "left";
                            const isDropRight = dropTarget?.stepId === step.id && dropTarget?.index === fi && dropTarget?.side === "right";
                            const colSpan = getEffectiveColSpan(field);
                            const minSpan = getMinColSpan(field.type);
                            // Get info about the dragged field for the ghost
                            const dragInfo = dragPayload.current;
                            const ghostLabel = dragInfo?.kind === "palette" ? dragInfo.label : dragInfo?.kind === "field" ? schema.steps.flatMap((s) => s.fields).find((f) => f.id === dragInfo.fieldId)?.label ?? "Field" : "Field";
                            const ghostIcon = dragInfo?.kind === "palette" ? iconFor(dragInfo.fieldType) : dragInfo?.kind === "field" ? iconFor(schema.steps.flatMap((s) => s.fields).find((f) => f.id === dragInfo.fieldId)?.type ?? "text") : "fa-question";

                            const isResizing = resizingFieldId === field.id;
                            const displaySpan = isResizing && resizePreviewSpan !== null ? resizePreviewSpan : colSpan;
                            const canResize = minSpan < GRID_COLUMNS;

                            const colSpanCls =
                              displaySpan === 1 ? "col-span-1"
                              : displaySpan === 2 ? "col-span-2"
                              : displaySpan === 3 ? "col-span-3"
                              : "col-span-4";

                            return (
                              <React.Fragment key={field.id}>
                                {isDropBefore && (
                                  <div className="col-span-4 flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-sm text-primary/60 shrink-0">
                                      <FaIcon name={ghostIcon} />
                                    </div>
                                    <span className="text-sm font-medium text-primary/60 truncate">{ghostLabel}</span>
                                  </div>
                                )}
                                <div className={`${colSpanCls} relative ${isResizing ? "z-20" : ""}`} style={isResizing ? { transition: "none" } : undefined}>
                                  {/* Left side-drop indicator */}
                                  {isDropLeft && (
                                    <div className="absolute -left-1 top-0 bottom-0 w-1 rounded-full bg-primary z-10" />
                                  )}
                                  {/* Right side-drop indicator */}
                                  {isDropRight && (
                                    <div className="absolute -right-1 top-0 bottom-0 w-1 rounded-full bg-primary z-10" />
                                  )}
                                  <div
                                    draggable={!isResizing}
                                    onDragStart={(e) => { if (isResizing) { e.preventDefault(); return; } e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; startDragField(step.id, field.id); }}
                                    onDragOver={(e) => handleDragOverField(e, step.id, fi)}
                                    onDrop={(e) => handleDrop(e, step.id, fi)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => selectField(step.id, field.id)}
                                    className={`relative flex items-center gap-2 px-2.5 sm:px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 group/field ${
                                      isResizing
                                        ? "bg-primary/10 border-2 border-primary/50 ring-2 ring-primary/20"
                                        : isSelected
                                          ? "bg-primary/10 border border-primary/40"
                                          : "bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 hover:bg-surface-container-high"
                                    }`}
                                  >
                                    <div className="text-on-surface-variant/40 hover:text-on-surface-variant cursor-grab select-none shrink-0"><i className="fa-solid fa-grip-vertical text-[10px]" /></div>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                                      isSelected || isResizing ? "bg-primary/20 text-primary" : "bg-surface-container-highest text-primary"
                                    }`}>
                                      <FaIcon name={iconFor(field.type)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-on-surface truncate leading-tight">{field.label}</div>
                                      <div className="text-[10px] text-on-surface-variant/60 truncate flex items-center gap-1">
                                        {labelFor(field.type)}
                                        {field.required && <span className="text-tertiary font-medium">&middot; Req</span>}
                                        {field.showCondition?.fieldId && <span className="text-amber-400 font-medium">&middot; <i className="fa-solid fa-eye text-[8px]" /></span>}
                                      </div>
                                    </div>
                                    {/* Column span badge */}
                                    {displaySpan < GRID_COLUMNS && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 tabular-nums ${
                                        isResizing
                                          ? "bg-primary/20 text-primary border-primary/40 scale-110"
                                          : "bg-primary/10 text-primary border-primary/20"
                                      }`} title={`${displaySpan} of ${GRID_COLUMNS} columns${minSpan < GRID_COLUMNS ? ` (min ${minSpan})` : ""}`}>
                                        {displaySpan}/{GRID_COLUMNS}
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removeField(step.id, field.id); }}
                                      className="p-1 text-on-surface-variant/40 hover:text-error text-sm transition-colors shrink-0"
                                    >
                                      <i className="fa-solid fa-xmark text-xs" />
                                    </button>

                                    {/* Resize handle -- corner drag lines */}
                                    {canResize && (
                                      <div
                                        onMouseDown={(e) => startResize(e, step.id, field.id, field.type, colSpan)}
                                        className={`absolute bottom-0 right-0 w-5 h-5 cursor-ew-resize select-none ${
                                          isResizing
                                            ? "opacity-100"
                                            : "opacity-0 group-hover/field:opacity-100"
                                        } transition-opacity`}
                                        title="Drag to resize"
                                      >
                                        {/* Three diagonal lines forming a corner resize grip */}
                                        <svg viewBox="0 0 20 20" className="w-full h-full" fill="none">
                                          <line x1="18" y1="8" x2="8" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
                                          <line x1="18" y1="12" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
                                          <line x1="18" y1="16" x2="16" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/40" />
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}

                          {dropTarget?.stepId === step.id && dropTarget?.index === step.fields.length && !dropTarget?.side && step.fields.length > 0 && (() => {
                            const dragInfo = dragPayload.current;
                            const ghostLabel = dragInfo?.kind === "palette" ? dragInfo.label : dragInfo?.kind === "field" ? schema.steps.flatMap((s) => s.fields).find((f) => f.id === dragInfo.fieldId)?.label ?? "Field" : "Field";
                            const ghostIcon = dragInfo?.kind === "palette" ? iconFor(dragInfo.fieldType) : dragInfo?.kind === "field" ? iconFor(schema.steps.flatMap((s) => s.fields).find((f) => f.id === dragInfo.fieldId)?.type ?? "text") : "fa-question";
                            return (
                              <div className="col-span-4 flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 transition-all">
                                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-sm text-primary/60 shrink-0">
                                  <FaIcon name={ghostIcon} />
                                </div>
                                <span className="text-sm font-medium text-primary/60 truncate">{ghostLabel}</span>
                              </div>
                            );
                          })()}
                          </div>
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
                <div className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary/70 uppercase tracking-widest">
                    <i className="fa-solid fa-arrows-up-down text-[10px] mr-1.5" />
                    Move step here
                  </span>
                </div>
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
                hasAI={hasAI}
                hasPaymentGateway={hasPaymentGateway}
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

function FieldCard({ f, onDragStart, onClickAdd, showTags }: {
  f: FieldTypeInfo;
  onDragStart: (type: FieldType, label: string) => void;
  onClickAdd: (type: FieldType, label: string) => void;
  showTags?: boolean;
}) {
  return (
    <button
      key={f.type}
      draggable={!f.disabled}
      onDragStart={(e) => { if (f.disabled) { e.preventDefault(); return; } e.dataTransfer.effectAllowed = "move"; onDragStart(f.type, f.label); }}
      onClick={() => { if (!f.disabled) onClickAdd(f.type, f.label); }}
      className={`w-full p-2 bg-surface-container rounded-xl border border-outline-variant/10 transition-all group text-left ${f.disabled ? "opacity-40 cursor-not-allowed" : "cursor-grab hover:border-primary/40 hover:bg-surface-container-high"}`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center transition-colors text-xs shrink-0 ${f.disabled ? "text-on-surface-variant/40" : "text-primary group-hover:bg-primary/20"}`}>
          <FaIcon name={f.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-on-surface block truncate">{f.label}</span>
          {f.description && <span className="text-[10px] text-on-surface-variant/50 block truncate">{f.description}</span>}
        </div>
      </div>
      {showTags && f.tags && f.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-[2.375rem]">
          {f.tags.slice(0, 4).map((tagId) => {
            const tag = INDUSTRY_TAGS.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span key={tagId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase tracking-wider"
                style={{ backgroundColor: tag.color + "18", color: tag.color }}>
                <i className={`fa-solid ${tag.icon} text-[7px]`} />{tag.label}
              </span>
            );
          })}
          {f.tags.length > 4 && (
            <span className="text-[8px] text-on-surface-variant/40 self-center">+{f.tags.length - 4}</span>
          )}
        </div>
      )}
    </button>
  );
}

function FieldPalette({ onDragStart, onClickAdd }: {
  onDragStart: (type: FieldType, label: string) => void;
  onClickAdd: (type: FieldType, label: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<FieldCategory | "all">("all");
  const [activeTag, setActiveTag] = useState<IndustryTag | null>(null);
  const [showTagPanel, setShowTagPanel] = useState(false);

  const filtered = FIELD_CATALOGUE.filter((f) => {
    const matchesSearch = !search || f.label.toLowerCase().includes(search.toLowerCase()) || (f.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || f.category === activeCategory;
    const matchesTag = !activeTag || (f.tags ?? []).includes(activeTag);
    return matchesSearch && matchesCategory && matchesTag;
  });

  // Group by category for display
  const grouped = FIELD_CATEGORIES.map((cat) => ({
    ...cat,
    fields: filtered.filter((f) => f.category === cat.id),
  })).filter((g) => g.fields.length > 0);

  // Count fields per industry tag (for the tag panel)
  const tagCounts = INDUSTRY_TAGS.map((tag) => ({
    ...tag,
    count: FIELD_CATALOGUE.filter((f) => (f.tags ?? []).includes(tag.id)).length,
  }));

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
          className="w-full pl-9 pr-9 py-2 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary/50 outline-none transition-all"
        />
        <button onClick={() => setShowTagPanel(!showTagPanel)} title="Filter by industry"
          className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center transition-all ${showTagPanel || activeTag ? "bg-primary/20 text-primary" : "text-on-surface-variant/40 hover:text-on-surface-variant"}`}>
          <i className="fa-solid fa-tags text-[10px]" />
        </button>
      </div>

      {/* Industry tag filter panel */}
      {showTagPanel && (
        <div className="mb-3 p-2.5 bg-surface-container rounded-xl border border-outline-variant/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Filter by Industry</span>
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="text-[10px] text-primary hover:underline">Clear</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {tagCounts.map((tag) => (
              <button key={tag.id} onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeTag === tag.id ? "ring-1 ring-offset-0" : "hover:bg-surface-container-high/50"}`}
                style={activeTag === tag.id ? { backgroundColor: tag.color + "18", color: tag.color, outlineColor: tag.color } : undefined}>
                <i className={`fa-solid ${tag.icon} text-[9px]`} style={{ color: tag.color }} />
                <span className={activeTag === tag.id ? "" : "text-on-surface-variant/70"}>{tag.label}</span>
                <span className="text-[9px] text-on-surface-variant/30 ml-auto">{tag.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active tag indicator */}
      {activeTag && !showTagPanel && (() => {
        const tag = INDUSTRY_TAGS.find((t) => t.id === activeTag);
        return tag ? (
          <div className="flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg text-xs" style={{ backgroundColor: tag.color + "18", color: tag.color }}>
            <i className={`fa-solid ${tag.icon} text-[10px]`} />
            <span className="font-medium">{tag.label}</span>
            <span className="text-[10px] opacity-60">{filtered.length} fields</span>
            <button onClick={() => setActiveTag(null)} className="ml-auto opacity-60 hover:opacity-100">
              <i className="fa-solid fa-xmark text-[10px]" />
            </button>
          </div>
        ) : null;
      })()}

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${activeCategory === "all" ? "bg-primary text-on-primary" : "bg-surface-container-high/50 text-on-surface-variant/60 hover:text-on-surface"}`}
        >
          All
        </button>
        {FIELD_CATEGORIES.map((cat) => {
          const count = filtered.filter((f) => f.category === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeCategory === cat.id ? "bg-primary text-on-primary" : "bg-surface-container-high/50 text-on-surface-variant/60 hover:text-on-surface"}`}
            >
              <FaIcon name={cat.icon} className="text-[9px]" />
              {cat.label}
              {activeTag && <span className="text-[9px] opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Field list grouped by category */}
      {activeCategory === "all" && !search && !activeTag ? (
        grouped.map((group) => (
          <div key={group.id} className="mb-4">
            <h3 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <FaIcon name={group.icon} className="text-[9px]" />
              {group.label}
            </h3>
            <div className="space-y-1.5">
              {group.fields.map((f) => (
                <FieldCard key={f.type} f={f} onDragStart={onDragStart} onClickAdd={onClickAdd} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-1.5">
          {filtered.length === 0 && (
            <p className="text-xs text-on-surface-variant/50 text-center py-4">
              {activeTag ? "No fields match this industry filter" : "No fields match your search"}
            </p>
          )}
          {filtered.map((f) => (
            <FieldCard key={f.type} f={f} onDragStart={onDragStart} onClickAdd={onClickAdd} showTags={!!activeTag} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Field settings panel ──────────────────────────────────── */

function FieldSettingsPanel({ field, onUpdate, onClose, allFields, hasAI, hasPaymentGateway }: {
  field: FieldDef;
  onUpdate: (patch: Partial<FieldDef>) => void;
  onClose: () => void;
  allFields: FieldDef[];
  hasAI?: boolean;
  hasPaymentGateway?: boolean;
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

        {/* ── Column Width ── */}
        {(() => {
          const minSpan = getMinColSpan(field.type);
          if (minSpan >= GRID_COLUMNS) return null; // Full-width only
          const currentSpan = getEffectiveColSpan(field);
          const widthOptions = Array.from({ length: GRID_COLUMNS - minSpan + 1 }, (_, i) => minSpan + i) as (1 | 2 | 3 | 4)[];
          return (
            <section className="space-y-3">
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Column Width</div>
              <div className="flex gap-1.5">
                {widthOptions.map((span) => (
                  <button
                    key={span}
                    onClick={() => onUpdate({ colSpan: span })}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                      currentSpan === span
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container text-on-surface-variant border-outline-variant/15 hover:border-primary/40"
                    }`}
                  >
                    {span}/{GRID_COLUMNS}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-on-surface-variant/50">
                {currentSpan === GRID_COLUMNS ? "Full width" : `${currentSpan} of ${GRID_COLUMNS} columns`}.
                {minSpan < GRID_COLUMNS && ` This field can go as narrow as ${minSpan}/${GRID_COLUMNS}.`}
                {" "}Drag a field to the side of another field to create columns automatically.
              </p>
            </section>
          );
        })()}

        {(field.type === "select" || field.type === "radio" || field.type === "checkbox") && (
          <section className="space-y-3">
            {/* Display Mode toggle -- always visible */}
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Display Mode</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdate({ displayMode: undefined, optionIcons: undefined, iconCardColumns: undefined })}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-xl border-2 transition-all ${!field.displayMode || field.displayMode === "default" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant"}`}
              >
                <i className="fa-solid fa-list mr-1.5" />List
              </button>
              <button
                type="button"
                onClick={() => onUpdate({ displayMode: "icon_cards" })}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-xl border-2 transition-all ${field.displayMode === "icon_cards" ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/30 text-on-surface-variant hover:border-outline-variant"}`}
              >
                <i className="fa-solid fa-grip mr-1.5" />Icon Cards
              </button>
            </div>

            {/* Grid columns -- only in icon_cards mode */}
            {field.displayMode === "icon_cards" && (
              <label className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-on-surface-variant">Columns</span>
                <select
                  value={field.iconCardColumns ?? 3}
                  onChange={(e) => onUpdate({ iconCardColumns: Number(e.target.value) as 2 | 3 | 4 | 5 | 6 })}
                  className="px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none"
                >
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                  <option value={6}>6</option>
                </select>
              </label>
            )}

            {/* Options heading */}
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              {field.type === "checkbox" ? "Checkbox Options" : "Choices"}
            </div>

            {/* Individual option rows */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(field.options ?? []).map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-container-highest/30 rounded-xl px-3 py-2 group">
                  {/* Icon picker -- only in icon_cards mode */}
                  {field.displayMode === "icon_cards" && (
                    <IconPicker
                      value={field.optionIcons?.[opt] ?? ""}
                      onChange={(icon) => {
                        const icons = { ...(field.optionIcons ?? {}) };
                        if (icon) {
                          icons[opt] = icon;
                        } else {
                          delete icons[opt];
                        }
                        onUpdate({ optionIcons: Object.keys(icons).length > 0 ? icons : undefined });
                      }}
                    />
                  )}
                  {/* Editable option label */}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newLabel = e.target.value;
                      const opts = [...(field.options ?? [])];
                      const oldLabel = opts[idx];
                      opts[idx] = newLabel;
                      // Move icon mapping to new label
                      const icons = { ...(field.optionIcons ?? {}) };
                      if (oldLabel !== newLabel && icons[oldLabel]) {
                        icons[newLabel] = icons[oldLabel];
                        delete icons[oldLabel];
                      }
                      onUpdate({ options: opts, ...(Object.keys(icons).length > 0 ? { optionIcons: icons } : { optionIcons: undefined }) });
                    }}
                    placeholder="Option label"
                    className="flex-1 min-w-0 px-2 py-1 text-xs bg-transparent border-0 text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/30 rounded-lg"
                  />
                  {/* Delete option */}
                  <button
                    type="button"
                    onClick={() => {
                      const opts = [...(field.options ?? [])];
                      const removed = opts.splice(idx, 1)[0];
                      const icons = { ...(field.optionIcons ?? {}) };
                      delete icons[removed];
                      onUpdate({ options: opts, optionIcons: Object.keys(icons).length > 0 ? icons : undefined });
                    }}
                    className="text-on-surface-variant/30 hover:text-error text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Remove option"
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new option */}
            <button
              type="button"
              onClick={() => {
                const opts = [...(field.options ?? []), `Option ${(field.options ?? []).length + 1}`];
                onUpdate({ options: opts });
              }}
              className="flex items-center gap-1.5 text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <i className="fa-solid fa-plus text-[10px]" />Add option
            </button>

            {/* Auto-detect social icons -- only in icon_cards mode with options */}
            {field.displayMode === "icon_cards" && (field.options ?? []).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const socialMap: Record<string, string> = {
                    "Instagram": "fa-brands fa-instagram",
                    "Facebook": "fa-brands fa-facebook",
                    "X": "fa-brands fa-x-twitter",
                    "Twitter": "fa-brands fa-x-twitter",
                    "X / Twitter": "fa-brands fa-x-twitter",
                    "LinkedIn": "fa-brands fa-linkedin",
                    "TikTok": "fa-brands fa-tiktok",
                    "YouTube": "fa-brands fa-youtube",
                    "Pinterest": "fa-brands fa-pinterest",
                    "Threads": "fa-brands fa-threads",
                    "Snapchat": "fa-brands fa-snapchat",
                    "Reddit": "fa-brands fa-reddit",
                    "WhatsApp": "fa-brands fa-whatsapp",
                    "Telegram": "fa-brands fa-telegram",
                    "Discord": "fa-brands fa-discord",
                    "Twitch": "fa-brands fa-twitch",
                    "GitHub": "fa-brands fa-github",
                    "Dribbble": "fa-brands fa-dribbble",
                    "Behance": "fa-brands fa-behance",
                    "Mastodon": "fa-brands fa-mastodon",
                    "Bluesky": "fa-brands fa-bluesky",
                  };
                  const icons: Record<string, string> = { ...(field.optionIcons ?? {}) };
                  for (const opt of (field.options ?? [])) {
                    const match = socialMap[opt] || socialMap[opt.split(" ")[0]];
                    if (match && !icons[opt]) icons[opt] = match;
                  }
                  if (Object.keys(icons).length > 0) onUpdate({ optionIcons: icons });
                }}
                className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <i className="fa-solid fa-wand-magic-sparkles mr-1" />Auto-detect social icons
              </button>
            )}

            {/* Max selections -- checkbox only */}
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
          <DialogLauncher
            icon="fa-box-open"
            label="Package Selector"
            summary={`${field.packageConfig.packages.length} packages, ${field.packageConfig.features.length} features`}
          >
            {(onClose) => <PackageSettingsPanel config={field.packageConfig!} onUpdate={(cfg) => onUpdate({ packageConfig: cfg })} onCloseDialog={onClose} />}
          </DialogLauncher>
        )}

        {field.type === "repeater" && field.repeaterConfig && (
          <DialogLauncher
            icon="fa-layer-group"
            label="Repeater / Pages"
            summary={`${field.repeaterConfig.subFields.length} sub-fields, ${field.repeaterConfig.minEntries ?? 0}-${field.repeaterConfig.maxEntries ?? 20} entries`}
          >
            {(onClose) => <RepeaterSettingsPanel config={field.repeaterConfig!} onUpdate={(cfg) => onUpdate({ repeaterConfig: cfg })} onCloseDialog={onClose} />}
          </DialogLauncher>
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
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Maximum number of files the client can upload per category.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Allow Cloud Connect</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Let clients link files from Google Drive, Dropbox, etc.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.assetCollectionConfig.allowCloudConnect} onChange={e => onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, allowCloudConnect: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Categories</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Organize uploads into sections. Drag to reorder.</p>
              <div className="space-y-1.5">
                {field.assetCollectionConfig.categories?.map((cat, i) => (
                  <div key={i} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => { const from = Number(e.dataTransfer.getData("text/plain")); if (from !== i && !isNaN(from)) { const cats = [...field.assetCollectionConfig!.categories!]; const [moved] = cats.splice(from, 1); cats.splice(i > from ? i - 1 : i, 0, moved); onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, categories: cats } }); } }} className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder"><i className="fa-solid fa-grip-vertical text-[10px]" /></div>
                    <input value={cat} onChange={e => { const cats = [...field.assetCollectionConfig!.categories!]; cats[i] = e.target.value as AssetCategory; onUpdate({ assetCollectionConfig: { ...field.assetCollectionConfig!, categories: cats } }); }} className={INPUT_CLS} placeholder="e.g. Logo, Photos, Brand Guidelines" />
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
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Maximum number of pages the client can add to their sitemap.</p>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Allow Nesting</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Let clients create sub-pages under parent pages.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.siteStructureConfig.allowNesting} onChange={e => onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, allowNesting: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Starter Pages</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Pre-populate common pages so clients have a starting point. Drag to reorder.</p>
              <div className="space-y-1.5">
                {field.siteStructureConfig.starterPages?.map((page, i) => (
                  <div key={page.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(i)); }} onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => { const from = Number(e.dataTransfer.getData("text/plain")); if (from !== i && !isNaN(from)) { const pages = [...field.siteStructureConfig!.starterPages!]; const [moved] = pages.splice(from, 1); pages.splice(i > from ? i - 1 : i, 0, moved); onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: pages } }); } }} className="flex items-center gap-2">
                    <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder"><i className="fa-solid fa-grip-vertical text-[10px]" /></div>
                    <input value={page.name} onChange={e => { const pages = [...field.siteStructureConfig!.starterPages!]; pages[i] = { ...pages[i], name: e.target.value }; onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: pages } }); }} className={INPUT_CLS} placeholder="e.g. Home, About, Services, Contact" />
                    <button onClick={() => { const pages = field.siteStructureConfig!.starterPages!.filter((_, j) => j !== i); onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: pages } }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs transition-colors shrink-0"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ siteStructureConfig: { ...field.siteStructureConfig!, starterPages: [...field.siteStructureConfig!.starterPages!, { id: uid(), name: "" }] } })} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5 mt-2"><i className="fa-solid fa-plus text-[9px]" /> Add Starter Page</button>
            </div>
          </section>
        )}

        {/* ── Feature Selector Settings ── */}
        {field.type === "feature_selector" && field.featureSelectorConfig && (
          <DialogLauncher
            icon="fa-puzzle-piece"
            label="Feature Selector"
            summary={`${field.featureSelectorConfig.features?.length ?? 0} features configured`}
          >
            {(onClose) => <FeatureSelectorDialog config={field.featureSelectorConfig!} onUpdate={(cfg) => onUpdate({ featureSelectorConfig: cfg })} onClose={onClose} />}
          </DialogLauncher>
        )}


        {/* ── Goal Builder Settings ── */}
        {field.type === "goal_builder" && field.goalBuilderConfig && (
          <DialogLauncher
            icon="fa-bullseye"
            label="Goal Builder"
            summary={`${field.goalBuilderConfig.goals?.length ?? 0} goals configured`}
          >
            {(onClose) => <GoalBuilderDialog config={field.goalBuilderConfig!} onUpdate={(cfg) => onUpdate({ goalBuilderConfig: cfg })} onClose={onClose} />}
          </DialogLauncher>
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

        {/* ── Brand Style Picker Settings ── */}
        {field.type === "brand_style" && field.brandStyleConfig && (
          <DialogLauncher
            icon="fa-swatchbook"
            label="Brand Style Picker"
            summary={`${field.brandStyleConfig.styles.length} styles configured`}
          >
            {(onClose) => <BrandStyleDialog config={field.brandStyleConfig!} onUpdate={(cfg) => onUpdate({ brandStyleConfig: cfg })} onClose={onClose} />}
          </DialogLauncher>
        )}


        {/* ── Competitor Analyzer Settings ── */}
        {field.type === "competitor_analyzer" && field.competitorAnalyzerConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Competitor Analyzer</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Competitors</span>
              <input type="number" min={1} max={20} value={field.competitorAnalyzerConfig.maxCompetitors ?? 5} onChange={e => onUpdate({ competitorAnalyzerConfig: { ...field.competitorAnalyzerConfig!, maxCompetitors: Number(e.target.value) } })} className={INPUT_CLS} />
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">How many competitor URLs the client can enter.</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Placeholder URL</span>
              <input value={field.competitorAnalyzerConfig.placeholder ?? ""} onChange={e => onUpdate({ competitorAnalyzerConfig: { ...field.competitorAnalyzerConfig!, placeholder: e.target.value } })} className={INPUT_CLS} placeholder="https://competitor.com" />
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Example URL shown as placeholder text in the input field.</p>
            </div>
            {hasAI ? (
              <>
                <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
                  <span className="text-xs font-medium text-on-surface">Auto-Fetch Site Data</span>
                  <label className="relative cursor-pointer">
                    <input type="checkbox" checked={!!field.competitorAnalyzerConfig.autoFetch} onChange={e => onUpdate({ competitorAnalyzerConfig: { ...field.competitorAnalyzerConfig!, autoFetch: e.target.checked } })} className="sr-only peer" />
                    <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
                  </label>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
                  <span className="text-xs font-medium text-on-surface">AI Summary</span>
                  <label className="relative cursor-pointer">
                    <input type="checkbox" checked={!!field.competitorAnalyzerConfig.aiSummary} onChange={e => onUpdate({ competitorAnalyzerConfig: { ...field.competitorAnalyzerConfig!, aiSummary: e.target.checked } })} className="sr-only peer" />
                    <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
                  </label>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <i className="fa-solid fa-lock text-xs text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">AI Features Locked</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  To enable auto-fetch and AI summary, connect an AI provider (OpenAI, Anthropic, or Google AI) in{" "}
                  <a href="/dashboard/settings" className="text-primary underline underline-offset-2">Settings &rarr; Integrations</a>.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Timeline Settings ── */}
        {field.type === "timeline" && field.timelineConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Timeline & Availability</div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Show Start Date</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">When does the client want to begin the project?</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.timelineConfig.showStartDate} onChange={e => onUpdate({ timelineConfig: { ...field.timelineConfig!, showStartDate: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Show End / Deadline Date</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Does the client have a hard deadline?</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.timelineConfig.showEndDate} onChange={e => onUpdate({ timelineConfig: { ...field.timelineConfig!, showEndDate: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Allow Blackout Dates</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Let clients mark date ranges when they&apos;re unavailable.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.timelineConfig.allowBlackoutDates} onChange={e => onUpdate({ timelineConfig: { ...field.timelineConfig!, allowBlackoutDates: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Milestone Layout</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">How many columns for milestone date fields.</p>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map((cols) => {
                  const active = (field.timelineConfig!.milestoneColumns ?? 1) === cols;
                  return (
                    <button key={cols} type="button" onClick={() => onUpdate({ timelineConfig: { ...field.timelineConfig!, milestoneColumns: cols } })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                      {cols} Col{cols > 1 ? "s" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1.5 block">Milestones</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Key project phases the client needs to set dates for. Drag to reorder.</p>
              <div className="space-y-1.5">
                {(field.timelineConfig.milestones ?? []).map((ms, mi) => (
                  <div
                    key={ms.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(mi)); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      if (from !== mi && !isNaN(from)) {
                        const milestones = [...(field.timelineConfig!.milestones ?? [])];
                        const [moved] = milestones.splice(from, 1);
                        milestones.splice(mi > from ? mi - 1 : mi, 0, moved);
                        onUpdate({ timelineConfig: { ...field.timelineConfig!, milestones } });
                      }
                    }}
                    className="flex items-center gap-2 p-2 bg-surface-container rounded-lg"
                  >
                    <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder">
                      <i className="fa-solid fa-grip-vertical text-[10px]" />
                    </div>
                    <input value={ms.label} onChange={e => { const milestones = [...(field.timelineConfig!.milestones ?? [])]; milestones[mi] = { ...milestones[mi], label: e.target.value }; onUpdate({ timelineConfig: { ...field.timelineConfig!, milestones } }); }} className="flex-1 text-xs bg-transparent border-none outline-none text-on-surface" placeholder="e.g. Discovery, Design, Development, Launch" />
                    <label className="flex items-center gap-1 text-[10px] text-on-surface-variant/60 shrink-0" title="Client must provide a date for this milestone">
                      <input type="checkbox" checked={!!ms.required} onChange={e => { const milestones = [...(field.timelineConfig!.milestones ?? [])]; milestones[mi] = { ...milestones[mi], required: e.target.checked }; onUpdate({ timelineConfig: { ...field.timelineConfig!, milestones } }); }} className="w-3 h-3 rounded" style={{ accentColor: "var(--color-primary)" }} /> Req
                    </label>
                    <button onClick={() => { const milestones = (field.timelineConfig!.milestones ?? []).filter((_, i) => i !== mi); onUpdate({ timelineConfig: { ...field.timelineConfig!, milestones } }); }} className="text-on-surface-variant/40 hover:text-error text-[10px] shrink-0"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ timelineConfig: { ...field.timelineConfig!, milestones: [...(field.timelineConfig!.milestones ?? []), { id: uid(), label: "", required: false }] } })} className="w-full py-1.5 mt-1.5 border border-dashed border-outline-variant/30 rounded-lg text-[10px] text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1"><i className="fa-solid fa-plus text-[8px]" /> Add Milestone</button>
            </div>
          </section>
        )}

        {/* ── Budget Allocator Settings ── */}
        {field.type === "budget_allocator" && field.budgetAllocatorConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Budget Allocator</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Mode</span>
              <select value={field.budgetAllocatorConfig.mode} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, mode: e.target.value as "constrained" | "independent" } })} className={INPUT_CLS}>
                <option value="constrained">Fixed Total — budget is split across channels</option>
                <option value="independent">Independent — each channel has its own limit</option>
              </select>
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{field.budgetAllocatorConfig.mode === "constrained" ? "Moving one slider automatically adjusts others to keep the total fixed." : "Each channel slider is independent — no shared total."}</p>
            </div>
            {field.budgetAllocatorConfig.mode === "constrained" && (
              <>
                <div>
                  <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Default Total Budget ({field.budgetAllocatorConfig.currency ?? "$"})</span>
                  <input type="number" min={0} value={field.budgetAllocatorConfig.totalBudget ?? 5000} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, totalBudget: Number(e.target.value) } })} className={INPUT_CLS} />
                  <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{field.budgetAllocatorConfig.allowCustomBudget ? "Starting budget shown to the client. They can change it." : "The fixed amount clients divide across channels."}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-on-surface block">Allow Custom Budget</span>
                    <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Let the client enter their own total budget.</p>
                  </div>
                  <label className="relative cursor-pointer shrink-0 ml-3">
                    <input type="checkbox" checked={!!field.budgetAllocatorConfig.allowCustomBudget} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, allowCustomBudget: e.target.checked } })} className="sr-only peer" />
                    <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
                  </label>
                </div>
              </>
            )}
            {field.budgetAllocatorConfig.mode === "independent" && (
              <div>
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Per Channel ({field.budgetAllocatorConfig.currency ?? "$"})</span>
                <input type="number" min={0} value={field.budgetAllocatorConfig.maxPerChannel ?? 10000} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, maxPerChannel: Number(e.target.value) } })} className={INPUT_CLS} />
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Maximum each channel slider can reach.</p>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Show as Percentages</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Display % instead of dollar amounts on sliders.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.budgetAllocatorConfig.showAsPercentage} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, showAsPercentage: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Currency Symbol</span>
              <input value={field.budgetAllocatorConfig.currency ?? "$"} onChange={e => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, currency: e.target.value } })} className={INPUT_CLS} maxLength={3} placeholder="e.g. $, €, £" />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1.5 block">Channels</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Budget categories your client allocates money across. Drag to reorder.</p>
              <div className="space-y-1.5">
                {field.budgetAllocatorConfig.channels.map((ch, ci) => (
                  <div
                    key={ch.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(ci)); (e.currentTarget as HTMLElement).dataset.dragIdx = String(ci); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      if (from !== ci && !isNaN(from)) {
                        const channels = [...field.budgetAllocatorConfig!.channels];
                        const [moved] = channels.splice(from, 1);
                        channels.splice(ci > from ? ci - 1 : ci, 0, moved);
                        onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, channels } });
                      }
                    }}
                    className="flex items-center gap-2 p-2 bg-surface-container rounded-lg group"
                  >
                    <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder">
                      <i className="fa-solid fa-grip-vertical text-[10px]" />
                    </div>
                    <div className="shrink-0">
                      <IconPicker value={ch.icon ?? "fa-circle"} onChange={(icon) => { const channels = [...field.budgetAllocatorConfig!.channels]; channels[ci] = { ...channels[ci], icon }; onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, channels } }); }} />
                    </div>
                    <input value={ch.label} onChange={e => { const channels = [...field.budgetAllocatorConfig!.channels]; channels[ci] = { ...channels[ci], label: e.target.value }; onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, channels } }); }} className="flex-1 text-xs bg-transparent border-none outline-none text-on-surface font-medium" placeholder="e.g. SEO, Social Media, Content" />
                    <button onClick={() => { const channels = field.budgetAllocatorConfig!.channels.filter((_, i) => i !== ci); onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, channels } }); }} className="text-on-surface-variant/40 hover:text-error text-[10px] shrink-0"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => onUpdate({ budgetAllocatorConfig: { ...field.budgetAllocatorConfig!, channels: [...field.budgetAllocatorConfig!.channels, { id: uid(), label: "", icon: "fa-circle", defaultValue: 0 }] } })} className="w-full py-1.5 mt-1.5 border border-dashed border-outline-variant/30 rounded-lg text-[10px] text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1"><i className="fa-solid fa-plus text-[8px]" /> Add Channel</button>
            </div>
          </section>
        )}

        {/* -- Name Settings -- */}
        {field.type === "name" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Name Settings</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Name Fields</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Choose which parts of the name to collect.</p>
              <div className="space-y-1">
                {(["prefix", "first", "middle", "last", "suffix"] as const).map((fld) => {
                  const labels: Record<string, string> = { prefix: "Prefix (Mr., Mrs., etc.)", first: "First Name", middle: "Middle Name", last: "Last Name", suffix: "Suffix (Jr., Sr., etc.)" };
                  const fields = field.nameConfig?.fields ?? ["first", "last"];
                  const checked = fields.includes(fld);
                  return (
                    <label key={fld} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container/50 rounded-lg cursor-pointer transition-colors">
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        const next = e.target.checked ? [...fields, fld] : fields.filter((f) => f !== fld);
                        onUpdate({ nameConfig: { ...field.nameConfig, fields: next } });
                      }} className="h-3.5 w-3.5 rounded" style={{ accentColor: "var(--color-primary)" }} />
                      <span className="text-xs text-on-surface">{labels[fld]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Layout</span>
              <div className="grid grid-cols-2 gap-2">
                {(["inline", "stacked"] as const).map((l) => {
                  const active = (field.nameConfig?.layout ?? "inline") === l;
                  return (
                    <button key={l} type="button" onClick={() => onUpdate({ nameConfig: { ...field.nameConfig, layout: l } })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                      <i className={`fa-solid ${l === "inline" ? "fa-grip" : "fa-bars"} mr-1.5`} />
                      {l === "inline" ? "Side by Side" : "Stacked"}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* -- Email Settings -- */}
        {field.type === "email" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Email Settings</div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Require Confirmation</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Ask the user to re-enter their email to prevent typos.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.emailConfig?.confirmEmail} onChange={(e) => onUpdate({ emailConfig: { ...field.emailConfig, confirmEmail: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Blocked Domains</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-1.5">Comma-separated list of domains to reject (e.g. example.com, test.com).</p>
              <input type="text" value={(field.emailConfig?.blockedDomains ?? []).join(", ")} onChange={(e) => {
                const domains = e.target.value.split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
                onUpdate({ emailConfig: { ...field.emailConfig, blockedDomains: domains } });
              }} placeholder="example.com, test.com" className={INPUT_CLS} />
            </div>
          </section>
        )}

        {/* -- Phone Settings -- */}
        {field.type === "tel" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Phone Settings</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Format</span>
              <div className="grid grid-cols-2 gap-2">
                {(["us", "international"] as const).map((fmt) => {
                  const active = (field.phoneConfig?.format ?? "us") === fmt;
                  return (
                    <button key={fmt} type="button" onClick={() => onUpdate({ phoneConfig: { ...field.phoneConfig, format: fmt } })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                      <i className={`fa-solid ${fmt === "us" ? "fa-flag-usa" : "fa-globe"} mr-1.5`} />
                      {fmt === "us" ? "US Format" : "International"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Extension Field</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Show an optional extension/ext. field next to the phone number.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.phoneConfig?.showExtension} onChange={(e) => onUpdate({ phoneConfig: { ...field.phoneConfig, showExtension: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
        )}

        {/* -- Text Settings -- */}
        {field.type === "text" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Text Settings</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Characters</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-1.5">Leave empty for no limit.</p>
              <input type="number" min="1" value={field.textConfig?.maxLength ?? ""} onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : undefined;
                onUpdate({ textConfig: { ...field.textConfig, maxLength: val } });
              }} placeholder="No limit" className={INPUT_CLS} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Input Mask Hint</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-1.5">Show a format example below the field (e.g. "###-##-####").</p>
              <input type="text" value={field.textConfig?.inputMask ?? ""} onChange={(e) => onUpdate({ textConfig: { ...field.textConfig, inputMask: e.target.value || undefined } })} placeholder="e.g. ###-##-####" className={INPUT_CLS} />
            </div>
          </section>
        )}

        {/* -- Address Settings -- */}
        {field.type === "address" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Address Settings</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Input Mode</span>
              <div className="grid grid-cols-2 gap-2">
                {(["manual", "autocomplete"] as const).map((m) => {
                  const active = (field.addressConfig?.mode ?? "manual") === m;
                  return (
                    <button key={m} type="button" onClick={() => onUpdate({ addressConfig: { ...field.addressConfig, mode: m } })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                      <i className={`fa-solid ${m === "manual" ? "fa-pen" : "fa-magnifying-glass-location"} mr-1.5`} />
                      {m === "manual" ? "Manual Entry" : "Autocomplete"}
                    </button>
                  );
                })}
              </div>
              {field.addressConfig?.mode === "autocomplete" && (
                <div className="mt-3">
                  <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Provider Override</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([undefined, "openstreetmap", "google"] as const).map((p) => {
                      const current = field.addressConfig?.autocompleteProvider;
                      const active = p === undefined ? !current : current === p;
                      const meta = {
                        undefined: { icon: "fa-solid fa-globe", label: "Global" },
                        openstreetmap: { icon: "fa-solid fa-map", label: "OSM" },
                        google: { icon: "fa-brands fa-google", label: "Google" },
                      };
                      const key = String(p ?? "undefined");
                      return (
                        <button key={key} type="button" onClick={() => {
                          const next = { ...field.addressConfig };
                          if (p === undefined) { delete next.autocompleteProvider; } else { next.autocompleteProvider = p; }
                          onUpdate({ addressConfig: next });
                        }}
                          className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                          <i className={`${meta[key as keyof typeof meta]?.icon} mr-1`} />
                          {meta[key as keyof typeof meta]?.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-on-surface-variant/50 mt-2">
                    <i className="fa-solid fa-circle-info mr-1" />
                    {!field.addressConfig?.autocompleteProvider
                      ? "Uses the workspace default provider set in Settings > Integrations."
                      : field.addressConfig.autocompleteProvider === "google"
                        ? "Overrides to Google Places for this field. Requires API key in Settings."
                        : "Overrides to OpenStreetMap for this field. Free, no API key needed."}
                  </p>
                </div>
              )}
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Region</span>
              <div className="grid grid-cols-2 gap-2">
                {(["us", "international"] as const).map((r) => {
                  const active = (field.addressConfig?.region ?? "us") === r;
                  return (
                    <button key={r} type="button" onClick={() => onUpdate({ addressConfig: { ...field.addressConfig, region: r, fields: r === "us" ? ["street", "street2", "city", "state", "zip"] : ["street", "street2", "city", "state", "zip", "country"] } })}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                      <i className={`fa-solid ${r === "us" ? "fa-flag-usa" : "fa-globe"} mr-1.5`} />
                      {r === "us" ? "United States" : "International"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Address Fields</span>
              <p className="text-[10px] text-on-surface-variant/50 mb-2">Choose which sub-fields to collect.</p>
              <div className="space-y-1">
                {(["street", "street2", "city", "state", "zip", "country"] as const).map((fld) => {
                  const labels: Record<string, string> = { street: "Street Address", street2: "Address Line 2", city: "City", state: "State / Province", zip: "ZIP / Postal Code", country: "Country" };
                  const fields = field.addressConfig?.fields ?? ["street", "street2", "city", "state", "zip", "country"];
                  const checked = fields.includes(fld);
                  return (
                    <label key={fld} className="flex items-center gap-2 px-3 py-1.5 hover:bg-surface-container/50 rounded-lg cursor-pointer transition-colors">
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        const next = e.target.checked ? [...fields, fld] : fields.filter((f) => f !== fld);
                        onUpdate({ addressConfig: { ...field.addressConfig, fields: next } });
                      }} className="h-3.5 w-3.5 rounded" style={{ accentColor: "var(--color-primary)" }} />
                      <span className="text-xs text-on-surface">{labels[fld]}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* -- Matrix Settings -- */}
        {field.type === "matrix" && field.matrixConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Matrix Settings</div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Row Labels (one per line)</span>
              <textarea value={(field.matrixConfig.rows ?? []).join("\n")} onChange={(e) => onUpdate({ matrixConfig: { ...field.matrixConfig!, rows: e.target.value.split("\n").filter((l) => l.trim()) } })} rows={5} placeholder="Quality&#10;Speed&#10;Communication" className={`${INPUT_CLS} font-mono`} />
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Column Labels (one per line)</span>
              <textarea value={(field.matrixConfig.columns ?? []).join("\n")} onChange={(e) => onUpdate({ matrixConfig: { ...field.matrixConfig!, columns: e.target.value.split("\n").filter((l) => l.trim()) } })} rows={4} placeholder="Poor&#10;Fair&#10;Good&#10;Excellent" className={`${INPUT_CLS} font-mono`} />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Multi-Select</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Allow picking multiple columns per row.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.matrixConfig.multiSelect} onChange={(e) => onUpdate({ matrixConfig: { ...field.matrixConfig!, multiSelect: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
        )}

        {/* -- Questionnaire Settings -- */}
        {field.type === "questionnaire" && field.questionnaireConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Questionnaire Settings</div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Show Score</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Display running score total to the user.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.questionnaireConfig.showScore} onChange={(e) => onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, showScore: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            <div className="space-y-4">
              {field.questionnaireConfig.questions.map((q, qi) => (
                <div key={q.id} className="rounded-lg border border-outline-variant/20 p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-on-surface-variant mt-1.5 shrink-0">Q{qi + 1}</span>
                    <input value={q.text} onChange={(e) => {
                      const questions = [...field.questionnaireConfig!.questions];
                      questions[qi] = { ...questions[qi], text: e.target.value };
                      onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                    }} className={`${INPUT_CLS} flex-1`} placeholder="Question text..." />
                    <button onClick={() => {
                      const questions = field.questionnaireConfig!.questions.filter((_, i) => i !== qi);
                      onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                    }} className="text-on-surface-variant/40 hover:text-error text-xs shrink-0 mt-2"><i className="fa-solid fa-xmark" /></button>
                  </div>
                  <div className="space-y-1 pl-5">
                    {q.answers.map((a, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <input value={a.label} onChange={(e) => {
                          const questions = [...field.questionnaireConfig!.questions];
                          const answers = [...questions[qi].answers];
                          answers[ai] = { ...answers[ai], label: e.target.value };
                          questions[qi] = { ...questions[qi], answers };
                          onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                        }} className="flex-1 text-xs bg-surface-container-highest/50 border-0 rounded px-2 py-1 text-on-surface outline-none" placeholder="Answer..." />
                        <input type="number" value={a.score} onChange={(e) => {
                          const questions = [...field.questionnaireConfig!.questions];
                          const answers = [...questions[qi].answers];
                          answers[ai] = { ...answers[ai], score: Number(e.target.value) || 0 };
                          questions[qi] = { ...questions[qi], answers };
                          onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                        }} className="w-12 text-xs bg-surface-container-highest/50 border-0 rounded px-2 py-1 text-on-surface outline-none text-center" title="Score" />
                        <button onClick={() => {
                          const questions = [...field.questionnaireConfig!.questions];
                          const answers = questions[qi].answers.filter((_, i) => i !== ai);
                          questions[qi] = { ...questions[qi], answers };
                          onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                        }} className="text-on-surface-variant/30 hover:text-error text-[10px]"><i className="fa-solid fa-xmark" /></button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const questions = [...field.questionnaireConfig!.questions];
                      questions[qi] = { ...questions[qi], answers: [...questions[qi].answers, { label: "", score: 0 }] };
                      onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
                    }} className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "var(--color-primary)" }}><i className="fa-solid fa-plus text-[8px]" /> Add Answer</button>
                  </div>
                </div>
              ))}
              <button onClick={() => {
                const questions = [...field.questionnaireConfig!.questions, { id: `q_${uid()}`, text: "", answers: [{ label: "Option A", score: 1 }, { label: "Option B", score: 2 }] }];
                onUpdate({ questionnaireConfig: { ...field.questionnaireConfig!, questions } });
              }} className="w-full py-2 border border-dashed border-outline-variant/30 rounded-lg text-xs text-on-surface-variant hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1.5"><i className="fa-solid fa-plus text-[9px]" /> Add Question</button>
            </div>
          </section>
        )}

        {/* -- Rating Settings -- */}
        {field.type === "rating" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Rating Settings</div>
            <label className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-on-surface-variant">Max Stars</span>
              <input type="number" min={3} max={10} value={field.ratingConfig?.maxStars ?? 5} onChange={(e) => onUpdate({ ratingConfig: { ...field.ratingConfig!, maxStars: Number(e.target.value) || 5 } })} className="w-16 px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none" />
            </label>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Allow Half Stars</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={!!field.ratingConfig?.allowHalf} onChange={(e) => onUpdate({ ratingConfig: { ...field.ratingConfig!, allowHalf: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
        )}

        {/* -- Slider Settings -- */}
        {field.type === "slider" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Slider Settings</div>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Minimum</span>
              <input type="number" value={field.sliderConfig?.min ?? 0} onChange={(e) => onUpdate({ sliderConfig: { ...field.sliderConfig!, min: Number(e.target.value) } })} className={INPUT_CLS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Maximum</span>
              <input type="number" value={field.sliderConfig?.max ?? 100} onChange={(e) => onUpdate({ sliderConfig: { ...field.sliderConfig!, max: Number(e.target.value) } })} className={INPUT_CLS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Step</span>
              <input type="number" min={0.01} step={0.01} value={field.sliderConfig?.step ?? 1} onChange={(e) => onUpdate({ sliderConfig: { ...field.sliderConfig!, step: Number(e.target.value) || 1 } })} className={INPUT_CLS} />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Unit Label</span>
              <input value={field.sliderConfig?.unit ?? ""} onChange={(e) => onUpdate({ sliderConfig: { ...field.sliderConfig!, unit: e.target.value } })} placeholder='e.g. %, $, days' className={INPUT_CLS} />
            </label>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <span className="text-xs font-medium text-on-surface">Show Current Value</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={field.sliderConfig?.showValue !== false} onChange={(e) => onUpdate({ sliderConfig: { ...field.sliderConfig!, showValue: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
        )}

        {/* -- Calculated Field Settings -- */}
        {field.type === "calculated" && field.calculatedFieldConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Calculated Field Settings</div>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Formula</span>
              <textarea
                value={field.calculatedFieldConfig.formula}
                onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, formula: e.target.value } })}
                placeholder='e.g. {package_price} + {feature_total} * 1.08'
                rows={3}
                className={INPUT_CLS}
              />
              <span className="text-[10px] text-on-surface-variant/50 mt-1 block">
                Reference other fields with {"{field_id}"}. Supports +, -, *, /, parentheses, and numbers.
              </span>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Display Format</span>
              <select
                value={field.calculatedFieldConfig.format}
                onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, format: e.target.value as CalculatedFormat } })}
                className={INPUT_CLS}
              >
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="percent">Percent</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Decimal Places</span>
              <input
                type="number"
                min={0}
                max={10}
                value={field.calculatedFieldConfig.decimalPlaces ?? 2}
                onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, decimalPlaces: Number(e.target.value) } })}
                className="w-20 px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none"
              />
            </label>
            {field.calculatedFieldConfig.format === "currency" && (
              <label className="block">
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Currency Symbol</span>
                <input
                  value={field.calculatedFieldConfig.currencySymbol ?? "$"}
                  onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, currencySymbol: e.target.value } })}
                  placeholder="$"
                  className="w-20 px-2 py-1 text-sm bg-surface-container-highest/50 border-0 rounded-lg text-on-surface outline-none"
                />
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Prefix (optional)</span>
              <input
                value={field.calculatedFieldConfig.prefix ?? ""}
                onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, prefix: e.target.value || undefined } })}
                placeholder='e.g. "Total: "'
                className={INPUT_CLS}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Suffix (optional)</span>
              <input
                value={field.calculatedFieldConfig.suffix ?? ""}
                onChange={(e) => onUpdate({ calculatedFieldConfig: { ...field.calculatedFieldConfig!, suffix: e.target.value || undefined } })}
                placeholder='e.g. " per month"'
                className={INPUT_CLS}
              />
            </label>
          </section>
        )}

        {/* -- Chained Select Settings -- */}
        {field.type === "chained_select" && field.chainedSelectConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Chained Dropdown Settings</div>

            {/* Level labels */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-on-surface-variant">Levels</span>
                <button
                  type="button"
                  onClick={() => {
                    if (field.chainedSelectConfig!.levels.length >= 5) return;
                    onUpdate({
                      chainedSelectConfig: {
                        ...field.chainedSelectConfig!,
                        levels: [...field.chainedSelectConfig!.levels, { label: `Level ${field.chainedSelectConfig!.levels.length + 1}`, placeholder: "" }],
                      },
                    });
                  }}
                  disabled={field.chainedSelectConfig.levels.length >= 5}
                  className="text-[10px] text-primary hover:text-primary/80 disabled:opacity-40"
                >
                  <i className="fa-solid fa-plus mr-0.5" /> Add Level
                </button>
              </div>
              {field.chainedSelectConfig.levels.map((level, li) => (
                <div key={li} className="flex gap-2 items-center">
                  <input
                    value={level.label}
                    onChange={(e) => {
                      const levels = [...field.chainedSelectConfig!.levels];
                      levels[li] = { ...levels[li], label: e.target.value };
                      onUpdate({ chainedSelectConfig: { ...field.chainedSelectConfig!, levels } });
                    }}
                    placeholder="Level label"
                    className={INPUT_CLS + " flex-1"}
                  />
                  <input
                    value={level.placeholder ?? ""}
                    onChange={(e) => {
                      const levels = [...field.chainedSelectConfig!.levels];
                      levels[li] = { ...levels[li], placeholder: e.target.value || undefined };
                      onUpdate({ chainedSelectConfig: { ...field.chainedSelectConfig!, levels } });
                    }}
                    placeholder="Placeholder"
                    className={INPUT_CLS + " flex-1"}
                  />
                  {field.chainedSelectConfig!.levels.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const levels = field.chainedSelectConfig!.levels.filter((_, i) => i !== li);
                        onUpdate({ chainedSelectConfig: { ...field.chainedSelectConfig!, levels } });
                      }}
                      className="text-error/60 hover:text-error text-xs"
                    >
                      <i className="fa-solid fa-xmark" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Option tree editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-on-surface-variant">Options Tree</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({
                      chainedSelectConfig: {
                        ...field.chainedSelectConfig!,
                        options: [...field.chainedSelectConfig!.options, { label: "", value: "" }],
                      },
                    });
                  }}
                  className="text-[10px] text-primary hover:text-primary/80"
                >
                  <i className="fa-solid fa-plus mr-0.5" /> Add Root Option
                </button>
              </div>
              <ChainedOptionTreeEditor
                options={field.chainedSelectConfig.options}
                depth={0}
                maxDepth={field.chainedSelectConfig.levels.length - 1}
                onChange={(options) => onUpdate({ chainedSelectConfig: { ...field.chainedSelectConfig!, options } })}
              />
            </div>
          </section>
        )}

        {/* -- Social Media Handles Settings -- */}
        {field.type === "social_handles" && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Layout</div>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as const).map((cols) => {
                const active = (field.socialHandlesConfig?.columns ?? 1) === cols;
                return (
                  <button key={cols} type="button" onClick={() => onUpdate({ socialHandlesConfig: { ...field.socialHandlesConfig!, columns: cols } })}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                    {cols === 1 ? "Stacked" : "2 Columns"}
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest pt-2">Platforms</div>
            <p className="text-[10px] text-on-surface-variant/50">Toggle which social platforms to show.</p>
            <div className="space-y-1.5">
              {SOCIAL_PLATFORMS.map((p) => {
                const enabled = field.socialHandlesConfig?.platforms?.includes(p.id) ?? false;
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 bg-surface-container rounded-lg">
                    <div className="flex items-center gap-2">
                      <i className={`${p.icon} text-sm text-on-surface-variant`} />
                      <span className="text-xs font-medium text-on-surface">{p.label}</span>
                    </div>
                    <label className="relative cursor-pointer">
                      <input type="checkbox" checked={enabled} onChange={(e) => {
                        const current = field.socialHandlesConfig?.platforms ?? [];
                        const next = e.target.checked ? [...current, p.id] : current.filter((id) => id !== p.id);
                        onUpdate({ socialHandlesConfig: { ...field.socialHandlesConfig!, platforms: next as SocialPlatformId[] } });
                      }} className="sr-only peer" />
                      <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
                    </label>
                  </div>
                );
              })}
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
          {field.showCondition?.fieldId && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg">
              <i className="fa-solid fa-code-branch text-[10px] text-amber-400" />
              <span className="text-[10px] text-amber-300/80">Has display logic &mdash; manage in the <strong>Logic</strong> tab</span>
            </div>
          )}
        </section>

        {/* Payment settings */}
        {field.type === "payment" && field.paymentConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Payment Settings</div>
            {hasPaymentGateway ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-tertiary/[0.06] border border-tertiary/15">
                <i className="fa-solid fa-circle-check text-[10px] text-tertiary" />
                <span className="text-[10px] text-on-surface-variant/70">Payment gateway connected. Payments will process when the form is published.</span>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <i className="fa-solid fa-triangle-exclamation text-xs text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">No Payment Gateway</span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Payments will not process until you connect a provider (Stripe, PayPal, or Square) in{" "}
                  <a href="/dashboard/settings" className="text-primary underline underline-offset-2">Settings &rarr; Integrations</a>.
                </p>
              </div>
            )}
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Provider</span>
              <select value={field.paymentConfig.provider} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, provider: e.target.value as PaymentProvider } })} className={INPUT_CLS}>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
              </select>
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Which payment processor handles the transaction.</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Payment Mode</span>
              <select value={field.paymentConfig.mode ?? "one_time"} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, mode: e.target.value as "one_time" | "subscription" } })} className={INPUT_CLS}>
                <option value="one_time">One-time payment</option>
                <option value="subscription">Recurring subscription</option>
              </select>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Currency</span>
              <input value={field.paymentConfig.currency ?? "usd"} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, currency: e.target.value } })} className={INPUT_CLS} maxLength={3} placeholder="e.g. usd, eur, gbp" />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Custom Amount</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Let the client enter their own amount.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.paymentConfig.customAmount} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, customAmount: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
            {!field.paymentConfig.customAmount && (
              <div>
                <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Amount (in cents)</span>
                <input type="number" min={0} value={field.paymentConfig.amountCents ?? 0} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, amountCents: Number(e.target.value) } })} className={INPUT_CLS} placeholder="e.g. 9900 for $99.00" />
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Amount in smallest currency unit. 9900 = $99.00</p>
              </div>
            )}
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Button Label</span>
              <input value={field.paymentConfig.buttonLabel ?? "Pay Now"} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, buttonLabel: e.target.value } })} className={INPUT_CLS} placeholder="e.g. Pay Now, Subscribe, Complete Purchase" />
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
              <div>
                <span className="text-xs font-medium text-on-surface block">Collect Billing Address</span>
                <p className="text-[10px] text-on-surface-variant/50 mt-0.5">Require billing address before payment.</p>
              </div>
              <label className="relative cursor-pointer shrink-0 ml-3">
                <input type="checkbox" checked={!!field.paymentConfig.collectBillingAddress} onChange={e => onUpdate({ paymentConfig: { ...field.paymentConfig!, collectBillingAddress: e.target.checked } })} className="sr-only peer" />
                <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
              </label>
            </div>
          </section>
        )}

        {/* Captcha / Bot Protection settings */}
        {field.type === "captcha" && field.captchaConfig && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Bot Protection</div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/[0.04] border border-primary/15">
              <i className="fa-solid fa-circle-info text-[10px] text-primary" />
              <span className="text-[10px] text-on-surface-variant/70">Add your site key in <strong>Settings &rarr; Integrations</strong> to activate.</span>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Provider</span>
              <select value={field.captchaConfig.provider} onChange={e => onUpdate({ captchaConfig: { ...field.captchaConfig!, provider: e.target.value as CaptchaProvider } })} className={INPUT_CLS}>
                <option value="recaptcha">Google reCAPTCHA v3</option>
                <option value="turnstile">Cloudflare Turnstile</option>
              </select>
              <p className="text-[10px] text-on-surface-variant/50 mt-0.5">{field.captchaConfig.provider === "recaptcha" ? "Google reCAPTCHA runs invisibly and scores visitors." : "Cloudflare Turnstile is a privacy-friendly CAPTCHA alternative."}</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Mode</span>
              <select value={field.captchaConfig.mode ?? "visible"} onChange={e => onUpdate({ captchaConfig: { ...field.captchaConfig!, mode: e.target.value as "visible" | "invisible" } })} className={INPUT_CLS}>
                <option value="visible">Visible — shows the widget to the user</option>
                <option value="invisible">Invisible — runs in background, no widget shown</option>
              </select>
            </div>
          </section>
        )}

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

function PackageSettingsPanel({ config, onUpdate, onCloseDialog }: {
  config: PackageConfig;
  onUpdate: (cfg: PackageConfig) => void;
  onCloseDialog?: () => void;
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

        {step.showCondition?.fieldId && (
          <section className="space-y-3">
            <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Visibility</div>
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg">
              <i className="fa-solid fa-code-branch text-[10px] text-amber-400" />
              <span className="text-[10px] text-amber-300/80">Has display logic &mdash; manage in the <strong>Logic</strong> tab</span>
            </div>
          </section>
        )}

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

function RepeaterSettingsPanel({ config, onUpdate, onCloseDialog }: {
  config: RepeaterConfig;
  onUpdate: (cfg: RepeaterConfig) => void;
  onCloseDialog?: () => void;
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

/* ── Dialog Launcher (opens complex settings in a full modal) ── */

function DialogLauncher({
  icon,
  label,
  summary,
  children,
}: {
  icon: string;
  label: string;
  summary: string;
  children: (onClose: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 p-3 bg-surface-container rounded-xl border border-outline-variant/10 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group"
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm shrink-0">
          <i className={`fa-solid ${icon}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{label}</p>
          <p className="text-[10px] text-on-surface-variant/60">{summary}</p>
        </div>
        <i className="fa-solid fa-arrow-up-right-from-square text-[10px] text-on-surface-variant/30 group-hover:text-primary transition-colors" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="bg-surface rounded-2xl border border-outline-variant/15 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-surface border-b border-outline-variant/10 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">
                  <i className={`fa-solid ${icon}`} />
                </div>
                <h2 className="text-lg font-headline font-bold text-on-surface">{label}</h2>
              </div>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all">
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
            <div className="p-6">
              {children(() => setOpen(false))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Drag-reorder helper ─────────────────────────────────── */

function useDragReorder<T extends { id: string }>(
  items: T[],
  onReorder: (updated: T[]) => void,
) {
  const dragIdx = useRef<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropIdx(i); }
  function onDragLeave() { setDropIdx(null); }
  function onDrop(i: number) {
    const from = dragIdx.current;
    if (from !== null && from !== i) {
      const arr = [...items];
      const [moved] = arr.splice(from, 1);
      arr.splice(i > from ? i - 1 : i, 0, moved);
      onReorder(arr);
    }
    dragIdx.current = null;
    setDropIdx(null);
  }
  function onDragEnd() { dragIdx.current = null; setDropIdx(null); }

  return { dragIdx, dropIdx, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd };
}

/** Small helper text below a label */
function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-on-surface-variant/50 leading-relaxed mt-0.5">{children}</p>;
}

/** Drop indicator bar */
function DropBar({ show }: { show: boolean }) {
  if (!show) return null;
  return <div className="h-1 rounded-full bg-primary/60 mx-2 my-1 animate-pulse" />;
}

/* ── Feature Selector Dialog ─────────────────────────────── */

function FeatureSelectorDialog({ config, onUpdate, onClose }: {
  config: FeatureSelectorConfig;
  onUpdate: (cfg: FeatureSelectorConfig) => void;
  onClose: () => void;
}) {
  const dnd = useDragReorder(config.features ?? [], (features) => onUpdate({ ...config, features }));

  return (
    <div className="space-y-5">
      {/* Intro help */}
      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          <i className="fa-solid fa-circle-info text-primary mr-1.5" />
          Define the features your clients can choose from. Drag the <i className="fa-solid fa-grip-vertical text-[10px] mx-0.5" /> handle to reorder. Each feature can have a category, complexity level, and optional price.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <span className="text-[11px] font-medium text-on-surface-variant mb-1 block">Max Selections</span>
          <input type="number" min={0} value={config.maxSelections} onChange={e => onUpdate({ ...config, maxSelections: +e.target.value })} className={INPUT_CLS} />
          <HelpText>How many features the client can pick. 0 means unlimited.</HelpText>
        </div>
        <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
          <div>
            <span className="text-xs font-medium text-on-surface block">Price Impact</span>
            <HelpText>Show a price tag on each feature so clients see costs.</HelpText>
          </div>
          <label className="relative cursor-pointer shrink-0 ml-3">
            <input type="checkbox" checked={!!config.showPriceImpact} onChange={e => onUpdate({ ...config, showPriceImpact: e.target.checked })} className="sr-only peer" />
            <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
          </label>
        </div>
        <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
          <div>
            <span className="text-xs font-medium text-on-surface block">Complexity</span>
            <HelpText>Show how complex each feature is to build.</HelpText>
          </div>
          <label className="relative cursor-pointer shrink-0 ml-3">
            <input type="checkbox" checked={!!config.showComplexity} onChange={e => onUpdate({ ...config, showComplexity: e.target.checked })} className="sr-only peer" />
            <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
            <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
          </label>
        </div>
      </div>

      <div className="space-y-1">
        {config.features?.map((feat, i) => (
          <div key={feat.id}>
            <DropBar show={dnd.dropIdx === i} />
            <div
              draggable
              onDragStart={() => dnd.onDragStart(i)}
              onDragOver={(e) => dnd.onDragOver(e, i)}
              onDragLeave={dnd.onDragLeave}
              onDrop={() => dnd.onDrop(i)}
              onDragEnd={dnd.onDragEnd}
              className="p-4 bg-surface-container rounded-xl border border-outline-variant/10 space-y-3 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder">
                  <i className="fa-solid fa-grip-vertical text-xs" />
                </div>
                <IconPicker value={feat.icon || "fa-puzzle-piece"} onChange={(icon) => { const features = [...config.features!]; features[i] = { ...features[i], icon }; onUpdate({ ...config, features }); }} />
                <input value={feat.name} onChange={e => { const features = [...config.features!]; features[i] = { ...features[i], name: e.target.value }; onUpdate({ ...config, features }); }} className={`${INPUT_CLS} font-semibold`} placeholder="e.g. Contact Form, Blog, E-commerce" />
                <button onClick={() => onUpdate({ ...config, features: config.features!.filter((_, j) => j !== i) })} className="p-2 text-on-surface-variant/40 hover:text-error text-xs shrink-0"><i className="fa-solid fa-trash" /></button>
              </div>
              <input value={feat.description} onChange={e => { const features = [...config.features!]; features[i] = { ...features[i], description: e.target.value }; onUpdate({ ...config, features }); }} className={INPUT_CLS} placeholder="Short description, e.g. 'Let visitors reach out via a form'" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <input value={feat.category} onChange={e => { const features = [...config.features!]; features[i] = { ...features[i], category: e.target.value }; onUpdate({ ...config, features }); }} className={INPUT_CLS} placeholder="e.g. Core, Content, Commerce" />
                  <HelpText>Group label — clients see features organized by this.</HelpText>
                </div>
                <div>
                  <select value={feat.complexity} onChange={e => { const features = [...config.features!]; features[i] = { ...features[i], complexity: e.target.value as "Simple" | "Medium" | "Complex" }; onUpdate({ ...config, features }); }} className={INPUT_CLS}>
                    <option value="Simple">Simple — minimal effort</option>
                    <option value="Medium">Medium — moderate effort</option>
                    <option value="Complex">Complex — significant effort</option>
                  </select>
                  <HelpText>How much dev effort this feature requires.</HelpText>
                </div>
                <div>
                  <input value={feat.priceImpact} onChange={e => { const features = [...config.features!]; features[i] = { ...features[i], priceImpact: e.target.value }; onUpdate({ ...config, features }); }} className={INPUT_CLS} placeholder="e.g. Included, +$300, +$1,500" />
                  <HelpText>Price shown to client if &ldquo;Price Impact&rdquo; is on.</HelpText>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Final drop zone */}
        {(config.features?.length ?? 0) > 0 && <DropBar show={dnd.dropIdx === (config.features?.length ?? 0)} />}
      </div>

      <button onClick={() => onUpdate({ ...config, features: [...config.features!, { id: uid(), name: "", description: "", icon: "fa-puzzle-piece", complexity: "Simple" as const, priceImpact: "", category: "" }] })} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-sm text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-plus text-xs" /> Add Feature</button>
    </div>
  );
}

/* ── Goal Builder Dialog ─────────────────────────────────── */

function GoalBuilderDialog({ config, onUpdate, onClose }: {
  config: GoalBuilderConfig;
  onUpdate: (cfg: GoalBuilderConfig) => void;
  onClose: () => void;
}) {
  const dnd = useDragReorder(config.goals ?? [], (goals) => onUpdate({ ...config, goals }));

  return (
    <div className="space-y-5">
      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          <i className="fa-solid fa-circle-info text-primary mr-1.5" />
          Define the goals your clients can pick from, like &ldquo;Generate Leads&rdquo; or &ldquo;Sell Products.&rdquo; Each goal can have refinements — follow-up questions that narrow down exactly what the client needs.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
        <div>
          <span className="text-xs font-medium text-on-surface block">Allow Multiple Goals</span>
          <HelpText>Let clients select more than one goal at a time.</HelpText>
        </div>
        <label className="relative cursor-pointer shrink-0 ml-3">
          <input type="checkbox" checked={!!config.allowMultiple} onChange={e => onUpdate({ ...config, allowMultiple: e.target.checked })} className="sr-only peer" />
          <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
        </label>
      </div>

      <div className="space-y-1">
        {config.goals?.map((goal, gi) => (
          <div key={goal.id}>
            <DropBar show={dnd.dropIdx === gi} />
            <div
              draggable
              onDragStart={() => dnd.onDragStart(gi)}
              onDragOver={(e) => dnd.onDragOver(e, gi)}
              onDragLeave={dnd.onDragLeave}
              onDrop={() => dnd.onDrop(gi)}
              onDragEnd={dnd.onDragEnd}
              className="p-4 bg-surface-container rounded-xl border border-outline-variant/10 space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder">
                  <i className="fa-solid fa-grip-vertical text-xs" />
                </div>
                <IconPicker value={goal.icon || "fa-bullseye"} onChange={(icon) => { const goals = [...config.goals!]; goals[gi] = { ...goals[gi], icon }; onUpdate({ ...config, goals }); }} />
                <input value={goal.label} onChange={e => { const goals = [...config.goals!]; goals[gi] = { ...goals[gi], label: e.target.value }; onUpdate({ ...config, goals }); }} className={`${INPUT_CLS} font-semibold`} placeholder="e.g. Generate Leads, Sell Products, Build Brand" />
                <button onClick={() => onUpdate({ ...config, goals: config.goals!.filter((_, j) => j !== gi) })} className="p-2 text-on-surface-variant/40 hover:text-error text-xs shrink-0"><i className="fa-solid fa-trash" /></button>
              </div>
              <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">Refinements</span>
                  <span className="text-[9px] text-on-surface-variant/40">— follow-up questions shown when this goal is selected</span>
                </div>
                {goal.refinements?.map((ref, ri) => (
                  <div key={ref.id} className="flex items-start gap-2 p-3 bg-surface-container-high/50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <input value={ref.label} onChange={e => { const goals = [...config.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], label: e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className={INPUT_CLS} placeholder="e.g. Target audience, Budget range, Timeline" />
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <select value={ref.type} onChange={e => { const goals = [...config.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], type: e.target.value as "select" | "range" | "text" | "number" }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className={INPUT_CLS}>
                            <option value="select">Dropdown — pick from a list</option>
                            <option value="range">Range — numeric slider</option>
                            <option value="text">Text — free-form answer</option>
                          </select>
                        </div>
                        {ref.type === "select" && <input value={(ref.options || []).join(", ")} onChange={e => { const goals = [...config.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className={INPUT_CLS} placeholder="Options separated by commas" />}
                        {ref.type === "range" && <><input type="number" value={ref.min ?? 0} onChange={e => { const goals = [...config.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], min: +e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className={INPUT_CLS} placeholder="Min value" /><input type="number" value={ref.max ?? 100} onChange={e => { const goals = [...config.goals!]; const refs = [...goals[gi].refinements!]; refs[ri] = { ...refs[ri], max: +e.target.value }; goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className={INPUT_CLS} placeholder="Max value" /></>}
                      </div>
                    </div>
                    <button onClick={() => { const goals = [...config.goals!]; const refs = goals[gi].refinements!.filter((_, j) => j !== ri); goals[gi] = { ...goals[gi], refinements: refs }; onUpdate({ ...config, goals }); }} className="p-1 text-on-surface-variant/40 hover:text-error text-xs mt-1"><i className="fa-solid fa-xmark" /></button>
                  </div>
                ))}
                <button onClick={() => { const goals = [...config.goals!]; goals[gi] = { ...goals[gi], refinements: [...goals[gi].refinements!, { id: uid(), label: "", type: "select" as const, options: [] }] }; onUpdate({ ...config, goals }); }} className="w-full py-2 border border-dashed border-outline-variant/20 rounded-lg text-[11px] text-on-surface-variant/60 hover:border-primary/50 hover:text-primary transition-all flex items-center justify-center gap-1"><i className="fa-solid fa-plus text-[9px]" /> Add Refinement</button>
              </div>
            </div>
          </div>
        ))}
        {(config.goals?.length ?? 0) > 0 && <DropBar show={dnd.dropIdx === (config.goals?.length ?? 0)} />}
      </div>
      <button onClick={() => onUpdate({ ...config, goals: [...config.goals!, { id: uid(), label: "", icon: "fa-bullseye", refinements: [] }] })} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-sm text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-plus text-xs" /> Add Goal</button>
    </div>
  );
}

/* ── Brand Style Dialog ──────────────────────────────────── */

function BrandStyleDialog({ config, onUpdate, onClose }: {
  config: NonNullable<FieldDef["brandStyleConfig"]>;
  onUpdate: (cfg: NonNullable<FieldDef["brandStyleConfig"]>) => void;
  onClose: () => void;
}) {
  const dnd = useDragReorder(config.styles, (styles) => onUpdate({ ...config, styles }));

  return (
    <div className="space-y-5">
      <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
        <p className="text-xs text-on-surface-variant leading-relaxed">
          <i className="fa-solid fa-circle-info text-primary mr-1.5" />
          Create visual style options for clients to choose from. Each style has a color palette, font, and description. Drag to reorder how they appear.
        </p>
      </div>

      <div className="flex items-center justify-between p-3 bg-surface-container rounded-lg">
        <div>
          <span className="text-xs font-medium text-on-surface block">Allow Multiple Selections</span>
          <HelpText>Let clients pick more than one style they like.</HelpText>
        </div>
        <label className="relative cursor-pointer shrink-0 ml-3">
          <input type="checkbox" checked={!!config.allowMultiple} onChange={e => onUpdate({ ...config, allowMultiple: e.target.checked })} className="sr-only peer" />
          <div className="w-8 h-4 bg-surface-container-highest rounded-full peer-checked:bg-primary transition-colors" />
          <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-on-surface-variant rounded-full peer-checked:translate-x-4 peer-checked:bg-on-primary transition-all" />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.styles.map((style, si) => (
          <div key={style.id}>
            <DropBar show={dnd.dropIdx === si} />
            <div
              draggable
              onDragStart={() => dnd.onDragStart(si)}
              onDragOver={(e) => dnd.onDragOver(e, si)}
              onDragLeave={dnd.onDragLeave}
              onDrop={() => dnd.onDrop(si)}
              onDragEnd={dnd.onDragEnd}
              className="p-4 bg-surface-container rounded-xl border border-outline-variant/10 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="cursor-grab active:cursor-grabbing text-on-surface-variant/30 hover:text-on-surface-variant/60 transition-colors shrink-0" title="Drag to reorder">
                  <i className="fa-solid fa-grip-vertical text-xs" />
                </div>
                <div className="flex gap-0.5">{style.palette.map((c, ci) => <div key={ci} className="w-5 h-5 rounded border border-outline-variant/20" style={{ backgroundColor: c }} />)}</div>
                <input value={style.name} onChange={e => { const styles = [...config.styles]; styles[si] = { ...styles[si], name: e.target.value }; onUpdate({ ...config, styles }); }} className="flex-1 text-sm font-bold bg-transparent border-none outline-none text-on-surface" placeholder="e.g. Modern & Clean, Bold & Vibrant" />
                <button onClick={() => onUpdate({ ...config, styles: config.styles.filter((_, i) => i !== si) })} className="text-on-surface-variant/40 hover:text-error text-xs p-1 shrink-0"><i className="fa-solid fa-trash" /></button>
              </div>
              <div>
                <input value={style.description ?? ""} onChange={e => { const styles = [...config.styles]; styles[si] = { ...styles[si], description: e.target.value }; onUpdate({ ...config, styles }); }} className={INPUT_CLS} placeholder="Describe the vibe, e.g. 'Minimalist with lots of whitespace'" />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-[10px] text-on-surface-variant/60 shrink-0">Palette:</span>
                {style.palette.map((c, ci) => (
                  <div key={ci} className="relative group">
                    <input type="color" value={c} onChange={e => { const styles = [...config.styles]; const palette = [...styles[si].palette]; palette[ci] = e.target.value; styles[si] = { ...styles[si], palette }; onUpdate({ ...config, styles }); }} className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent p-0" />
                    {style.palette.length > 1 && <button onClick={() => { const styles = [...config.styles]; styles[si] = { ...styles[si], palette: styles[si].palette.filter((_, j) => j !== ci) }; onUpdate({ ...config, styles }); }} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-error text-on-error text-[7px] hidden group-hover:flex items-center justify-center"><i className="fa-solid fa-xmark" /></button>}
                  </div>
                ))}
                {style.palette.length < 6 && <button onClick={() => { const styles = [...config.styles]; styles[si] = { ...styles[si], palette: [...styles[si].palette, "#888888"] }; onUpdate({ ...config, styles }); }} className="w-7 h-7 rounded border border-dashed border-outline-variant/30 flex items-center justify-center text-[9px] text-on-surface-variant/40 hover:text-primary" title="Add another color"><i className="fa-solid fa-plus" /></button>}
              </div>
              <div>
                <input value={style.fontFamily ?? ""} onChange={e => { const styles = [...config.styles]; styles[si] = { ...styles[si], fontFamily: e.target.value }; onUpdate({ ...config, styles }); }} className={INPUT_CLS} placeholder="e.g. Inter, Playfair Display, Montserrat" />
                <HelpText>Google Font name — shown in the style preview card.</HelpText>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => onUpdate({ ...config, styles: [...config.styles, { id: uid(), name: "New Style", palette: ["#333333", "#666666", "#ffffff", "#eeeeee"], fontFamily: "", description: "" }] })} className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-sm text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-2"><i className="fa-solid fa-plus text-xs" /> Add Style</button>
    </div>
  );
}
