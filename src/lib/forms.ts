// Form schema types shared between server and client components.

export type FieldType =
  | "text"
  | "name"
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
  | "consent"
  | "asset_collection"
  | "site_structure"
  | "feature_selector"
  | "goal_builder"
  | "approval"
  | "brand_style"
  | "competitor_analyzer"
  | "timeline"
  | "budget_allocator"
  | "payment"
  | "captcha"
  | "rating"
  | "toggle"
  | "slider"
  | "social_handles"
  | "matrix"
  | "questionnaire"
  | "property_details"
  | "insurance_info"
  | "guest_rsvp"
  | "room_selector"
  | "loan_calculator"
  | "case_intake"
  | "donation_tier"
  | "volunteer_signup"
  | "cause_selector"
  | "calculated"
  | "chained_select";

/* ââ Package Selector types âââââââââââââââââââââââââââââââ */

export interface PackageFeature {
  /** Feature label shown in the grid, e.g. "Custom Domain" */
  label: string;
  /** Value per package keyed by package id â true/false for checkmarks, or a string for text */
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

/** Display style for the package selector */
export type PackageLayout = "cards" | "horizontal" | "compact" | "list";

export interface PackageConfig {
  packages: PackageOption[];
  features: PackageFeature[];
  rules: PackageRule[];
  /** Default package ID to recommend if no rules match */
  defaultPackageId?: string;
  /** Display layout style (default "cards") */
  layout?: PackageLayout;
  /** Number of grid columns: 1-4, or "auto" to fit based on count (default "auto") */
  columns?: 1 | 2 | 3 | 4 | "auto";
  /** Show the comparison features table below the cards */
  showFeaturesTable?: boolean;
}

/* ââ Repeater (nested entries) types ââââââââââââââââââââââ */

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

/* ââ Asset Collection types ââââââââââââââââââââââââââââââââââ */

export type AssetCategory = "logos" | "colors" | "fonts" | "documents" | "images" | "other";

export interface AssetCollectionConfig {
  /** Which asset categories to show (default all) */
  categories?: AssetCategory[];
  /** Max total files allowed */
  maxFiles?: number;
  /** Allow connecting cloud storage (Google Drive, Dropbox) */
  allowCloudConnect?: boolean;
}

/* ââ Site Structure Builder types ââââââââââââââââââââââââââââ */

export interface SiteStructurePage {
  id: string;
  name: string;
  /** Nested children for sub-pages */
  children?: SiteStructurePage[];
}

export interface SiteStructureConfig {
  /** Pre-populated starter pages */
  starterPages?: SiteStructurePage[];
  /** Max pages allowed */
  maxPages?: number;
  /** Allow nesting / sub-pages */
  allowNesting?: boolean;
}

/* ââ Feature Selector types âââââââââââââââââââââââââââââââââ */

export interface FeatureOption {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  /** Complexity label (e.g. "Simple", "Medium", "Complex") */
  complexity?: string;
  /** Price impact string (e.g. "+$500", "Included") */
  priceImpact?: string;
  /** Category grouping */
  category?: string;
}

export interface FeatureSelectorConfig {
  features: FeatureOption[];
  /** Max features a client can select (0 = unlimited) */
  maxSelections?: number;
  /** Show price/complexity indicators */
  showPriceImpact?: boolean;
  showComplexity?: boolean;
}

/* ââ Goal Builder types âââââââââââââââââââââââââââââââââââââ */

export interface GoalOption {
  id: string;
  label: string;
  icon?: string;
  /** Refinement questions shown when this goal is selected */
  refinements?: GoalRefinement[];
}

export interface GoalRefinement {
  id: string;
  label: string;
  type: "select" | "number" | "text" | "range";
  options?: string[];
  placeholder?: string;
  /** For range type */
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}

export interface GoalBuilderConfig {
  goals: GoalOption[];
  /** Allow selecting multiple primary goals */
  allowMultiple?: boolean;
}

/* ââ Approval / Sign-off types ââââââââââââââââââââââââââââââ */

export interface ApprovalConfig {
  /** Text/scope to approve (HTML or plain text) */
  scopeText?: string;
  /** Require a typed signature */
  requireSignature?: boolean;
  /** Require typing full name to confirm */
  requireFullName?: boolean;
  /** Custom approval button label */
  approveLabel?: string;
}

/* ── Brand Style Picker types ────────────────────────────── */

export interface BrandStyleOption {
  id: string;
  /** Vibe name, e.g. "Modern", "Corporate", "Playful", "Luxury" */
  name: string;
  /** Hex colors for the generated palette tile (3-5 colors) */
  palette: string[];
  /** Font family suggestion shown on the tile */
  fontFamily?: string;
  /** Short description of the style */
  description?: string;
}

export interface BrandStyleConfig {
  /** Style options the client can pick from */
  styles: BrandStyleOption[];
  /** Allow selecting multiple styles (default false = pick one) */
  allowMultiple?: boolean;
}

/* ── Competitor Analyzer types ───────────────────────────── */

export interface CompetitorAnalyzerConfig {
  /** Max number of competitors a client can enter */
  maxCompetitors?: number;
  /** Placeholder URL example */
  placeholder?: string;
  /** Whether to auto-fetch site data via edge function */
  autoFetch?: boolean;
  /** Whether to generate an AI summary of the competitor */
  aiSummary?: boolean;
}

/* ── Timeline & Availability Selector types ──────────────── */

export interface TimelineMilestone {
  id: string;
  label: string;
  /** Whether the client must provide a date for this milestone */
  required?: boolean;
}

export interface TimelineConfig {
  /** Pre-defined milestone dates for the client to fill in */
  milestones?: TimelineMilestone[];
  /** Show a project start date picker */
  showStartDate?: boolean;
  /** Show a project end/deadline date picker */
  showEndDate?: boolean;
  /** Allow client to add blackout/unavailable date ranges */
  allowBlackoutDates?: boolean;
  /** Minimum date (ISO string) — defaults to today */
  minDate?: string;
  /** Number of columns for milestone date fields (1 = stacked, 2 or 3 = side by side). Default 1. */
  milestoneColumns?: 1 | 2 | 3;
}

/* ── Budget Allocator Slider types ───────────────────────── */

export interface BudgetChannel {
  id: string;
  /** Channel label, e.g. "Google Ads", "Meta Ads", "SEO" */
  label: string;
  /** Icon class (Font Awesome) */
  icon?: string;
  /** Default allocation percentage or dollar amount */
  defaultValue?: number;
}

export interface BudgetAllocatorConfig {
  /** Available channels to allocate across */
  channels: BudgetChannel[];
  /** "constrained" = fixed total, redistributing; "independent" = each slider standalone */
  mode: "constrained" | "independent";
  /** For constrained mode: the total budget to distribute */
  totalBudget?: number;
  /** For independent mode: max value per slider */
  maxPerChannel?: number;
  /** Currency symbol (default "$") */
  currency?: string;
  /** Show as percentages instead of dollar amounts */
  showAsPercentage?: boolean;
  /** Allow the form user to enter their own total budget (constrained mode) */
  allowCustomBudget?: boolean;
}

/* ── Payment Field types ────────────────────────────────── */

export type PaymentProvider = "stripe" | "paypal" | "square";

export interface PaymentConfig {
  /** Which payment provider to use */
  provider: PaymentProvider;
  /** Payment mode: "one_time" or "subscription" */
  mode?: "one_time" | "subscription";
  /** Currency code (default "usd") */
  currency?: string;
  /** Fixed amount in cents (if set, user cannot change) */
  amountCents?: number;
  /** Whether the amount is user-editable */
  customAmount?: boolean;
  /** Label shown above the payment button */
  buttonLabel?: string;
  /** Whether to collect billing address */
  collectBillingAddress?: boolean;
}

/* ── Captcha / Bot Protection types ─────────────────────── */

export type CaptchaProvider = "recaptcha" | "turnstile";

export interface CaptchaConfig {
  /** Which captcha provider to use */
  provider: CaptchaProvider;
  /** Captcha mode: "visible" shows the widget, "invisible" runs in background */
  mode?: "visible" | "invisible";
}

/* -- Rating field types --------------------------------------------------- */

export interface RatingConfig {
  /** Maximum number of stars (default 5) */
  maxStars: number;
  /** Allow half-star selections */
  allowHalf?: boolean;
}

/* -- Slider field types --------------------------------------------------- */

export interface SliderConfig {
  /** Minimum value (default 0) */
  min: number;
  /** Maximum value (default 100) */
  max: number;
  /** Step increment (default 1) */
  step: number;
  /** Unit label shown after the value, e.g. "%", "$", "days" */
  unit?: string;
  /** Show the current value next to the slider */
  showValue?: boolean;
}

/* -- Social Media Handles types ------------------------------------------- */

export const SOCIAL_PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: "fa-brands fa-instagram", prefix: "@" },
  { id: "facebook", label: "Facebook", icon: "fa-brands fa-facebook", prefix: "" },
  { id: "x", label: "X / Twitter", icon: "fa-brands fa-x-twitter", prefix: "@" },
  { id: "linkedin", label: "LinkedIn", icon: "fa-brands fa-linkedin", prefix: "" },
  { id: "tiktok", label: "TikTok", icon: "fa-brands fa-tiktok", prefix: "@" },
  { id: "youtube", label: "YouTube", icon: "fa-brands fa-youtube", prefix: "" },
  { id: "pinterest", label: "Pinterest", icon: "fa-brands fa-pinterest", prefix: "" },
  { id: "threads", label: "Threads", icon: "fa-brands fa-threads", prefix: "@" },
] as const;

export type SocialPlatformId = typeof SOCIAL_PLATFORMS[number]["id"];

export interface SocialHandlesConfig {
  /** Which platforms to show (defaults to all) */
  platforms: SocialPlatformId[];
  /** Number of columns for handle inputs (1 = stacked, 2 = side by side). Default 1. */
  columns?: 1 | 2;
}

/* -- Name types ----------------------------------------------------------- */

export interface NameConfig {
  /** Which sub-fields to show */
  fields?: ("prefix" | "first" | "middle" | "last" | "suffix")[];
  /** Layout: stacked or inline (2-col first/last) */
  layout?: "stacked" | "inline";
  /** Available prefixes (e.g. Mr., Mrs., Ms., Dr.) */
  prefixes?: string[];
}

/* -- Phone types ---------------------------------------------------------- */

export interface PhoneConfig {
  /** Phone format */
  format?: "us" | "international";
  /** Default country code for international format */
  defaultCountry?: string;
  /** Show extension field */
  showExtension?: boolean;
  /** Placeholder override */
  phonePlaceholder?: string;
}

/* -- Email types ---------------------------------------------------------- */

export interface EmailConfig {
  /** Require user to type email twice to confirm */
  confirmEmail?: boolean;
  /** Blocked email domains (e.g. ["example.com", "test.com"]) */
  blockedDomains?: string[];
  /** Allowed email domains -- if set, only these are accepted */
  allowedDomains?: string[];
}

/* -- Text types ----------------------------------------------------------- */

export interface TextConfig {
  /** Maximum character length */
  maxLength?: number;
  /** Input mask/format hint (display only) */
  inputMask?: string;
}

/* -- Address types -------------------------------------------------------- */

export interface AddressConfig {
  /** Input mode: manual fields or autocomplete */
  mode?: "manual" | "autocomplete";
  /** Autocomplete provider: google (Google Places API) or openstreetmap (Nominatim) */
  autocompleteProvider?: "google" | "openstreetmap";
  /** Region scope for autocomplete: "us" restricts to US, "international" allows worldwide */
  region?: "us" | "international";
  /** Which address sub-fields to collect */
  fields?: ("street" | "street2" | "city" | "state" | "zip" | "country")[];
}

/* -- Matrix/Grid types ---------------------------------------------------- */

export interface MatrixConfig {
  /** Row labels (questions/items) */
  rows: string[];
  /** Column labels (answer options) */
  columns: string[];
  /** Allow multiple selections per row */
  multiSelect?: boolean;
}

/* -- Questionnaire/Scoring types ------------------------------------------ */

export interface QuestionnaireQuestion {
  id: string;
  text: string;
  answers: { label: string; score: number }[];
}

export interface QuestionnaireConfig {
  /** List of scored questions */
  questions: QuestionnaireQuestion[];
  /** Show running score total to the user */
  showScore?: boolean;
}

/* -- Property Details types (Real Estate) --------------------------------- */

export type PropertyType = "single_family" | "condo" | "townhouse" | "multi_family" | "land" | "commercial" | "mobile" | "other";

export interface PropertyDetailsConfig {
  /** Which sub-fields to show */
  fields?: ("property_type" | "bedrooms" | "bathrooms" | "sqft" | "lot_size" | "year_built" | "parking" | "stories" | "price")[];
  /** Show price field */
  showPrice?: boolean;
  /** Currency symbol for price */
  currency?: string;
}

/* -- Insurance Info types (Healthcare) ------------------------------------ */

export interface InsuranceInfoConfig {
  /** Which sub-fields to show */
  fields?: ("provider" | "plan_type" | "policy_number" | "group_number" | "subscriber_name" | "subscriber_dob" | "relationship")[];
  /** Common insurance providers for the dropdown */
  providers?: string[];
}

/* -- Guest RSVP types (Events) -------------------------------------------- */

export interface RsvpMealOption {
  label: string;
  icon?: string;
}

export interface GuestRsvpConfig {
  /** Meal options (e.g. Chicken, Fish, Vegetarian) */
  mealOptions?: RsvpMealOption[];
  /** Allow plus-ones */
  allowPlusOnes?: boolean;
  /** Max plus-ones allowed */
  maxPlusOnes?: number;
  /** Show dietary restrictions field */
  showDietary?: boolean;
  /** Show notes/special requests field */
  showNotes?: boolean;
  /** Common dietary restriction options */
  dietaryOptions?: string[];
}

/* -- Room Selector types (Hospitality) ------------------------------------ */

export interface RoomOption {
  id: string;
  name: string;
  description?: string;
  amenities?: string[];
  pricePerNight?: number;
  maxGuests?: number;
  icon?: string;
}

export interface RoomSelectorConfig {
  /** Available rooms/services */
  rooms: RoomOption[];
  /** Show pricing */
  showPricing?: boolean;
  /** Currency symbol */
  currency?: string;
  /** Allow selecting multiple rooms */
  multiSelect?: boolean;
  /** Number of columns (2-4) */
  columns?: 2 | 3 | 4;
}

/* -- Loan Calculator types (Finance) -------------------------------------- */

export interface LoanCalculatorConfig {
  /** Min loan amount */
  minAmount?: number;
  /** Max loan amount */
  maxAmount?: number;
  /** Default loan amount */
  defaultAmount?: number;
  /** Min interest rate (%) */
  minRate?: number;
  /** Max interest rate (%) */
  maxRate?: number;
  /** Default interest rate */
  defaultRate?: number;
  /** Available term options in months */
  termOptions?: number[];
  /** Default term in months */
  defaultTerm?: number;
  /** Currency symbol */
  currency?: string;
  /** Label for the calculator (e.g. "Mortgage Calculator", "Auto Loan") */
  calculatorLabel?: string;
}

/* -- Case Intake types (Legal) -------------------------------------------- */

export interface CaseIntakeConfig {
  /** Available case type options */
  caseTypes?: string[];
  /** Show jurisdiction/state field */
  showJurisdiction?: boolean;
  /** Show date of incident field */
  showDateOfIncident?: boolean;
  /** Show opposing party field */
  showOpposingParty?: boolean;
  /** Show case description/summary field */
  showDescription?: boolean;
  /** Show statute of limitations warning */
  showStatuteWarning?: boolean;
  /** Custom jurisdiction options (defaults to US states) */
  jurisdictions?: string[];
}

/* -- Donation Tier types (Nonprofit) -------------------------------------- */

export interface DonationTier {
  id: string;
  label: string;
  amount: number;
  /** Impact statement, e.g. "Feeds a family for a week" */
  impact?: string;
  icon?: string;
  /** Whether this tier is highlighted/recommended */
  featured?: boolean;
}

export interface DonationTierConfig {
  /** Preset giving levels */
  tiers: DonationTier[];
  /** Allow custom/other amount */
  allowCustom?: boolean;
  /** Currency symbol */
  currency?: string;
  /** Whether this is a recurring donation selector */
  showRecurring?: boolean;
  /** Recurring frequency options */
  recurringOptions?: ("one_time" | "monthly" | "quarterly" | "annually")[];
}

/* -- Volunteer Signup types (Nonprofit) ----------------------------------- */

export interface VolunteerSignupConfig {
  /** Available days */
  days?: string[];
  /** Available time slots */
  timeSlots?: string[];
  /** Skill/interest tags volunteers can select */
  skills?: string[];
  /** Show one-time vs recurring toggle */
  showFrequency?: boolean;
  /** Show notes/special skills field */
  showNotes?: boolean;
  /** Max time slots a volunteer can select (0 = unlimited) */
  maxSlots?: number;
}

/* -- Cause Selector types (Nonprofit) ------------------------------------- */

export interface CauseOption {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  /** Optional funding goal or target */
  goal?: string;
}

export interface CauseSelectorConfig {
  /** Available causes/programs */
  causes: CauseOption[];
  /** Allow selecting multiple causes */
  multiSelect?: boolean;
  /** Max causes that can be selected (0 = unlimited) */
  maxSelections?: number;
  /** Number of grid columns (2-4) */
  columns?: 2 | 3 | 4;
}

/* -- Calculated Field types ------------------------------------------------ */

export type CalculatedFormat = "number" | "currency" | "percent";

export interface CalculatedFieldConfig {
  /** Formula string with field references like {field_id}, e.g. "{price} * 1.08" */
  formula: string;
  /** How to display the result */
  format: CalculatedFormat;
  /** Decimal places (default 2) */
  decimalPlaces?: number;
  /** Currency symbol for currency format (default "$") */
  currencySymbol?: string;
  /** Prefix text shown before the result */
  prefix?: string;
  /** Suffix text shown after the result */
  suffix?: string;
}

/* -- Chained Select (hierarchical dropdown) types -------------------------- */

export interface ChainedSelectOption {
  /** Display label */
  label: string;
  /** Value stored in the data */
  value: string;
  /** Child options shown when this option is selected */
  children?: ChainedSelectOption[];
}

export interface ChainedSelectLevel {
  /** Label for this dropdown level, e.g. "Category", "Service" */
  label: string;
  /** Placeholder text */
  placeholder?: string;
}

export interface ChainedSelectConfig {
  /** Level definitions (labels and placeholders) */
  levels: ChainedSelectLevel[];
  /** Root-level options tree */
  options: ChainedSelectOption[];
}

/** Condition to show/hide a field or step based on another field's value */
export interface ShowCondition {
  /** ID of the field to evaluate (from any step) */
  fieldId: string;
  /** Comparison operator */
  operator: "equals" | "not_equals" | "contains" | "not_empty" | "is_empty" | "greater_than" | "less_than";
  /** Value to compare against (not used for not_empty / is_empty) */
  value?: string;
  /** Additional conditions combined via combinator (backward-compat: omit for single condition) */
  extraConditions?: { fieldId: string; operator: string; value?: string }[];
  /** How to combine with extraConditions: "and" (all must match) or "or" (any must match). Default "or". */
  combinator?: "and" | "or";
  /** Action: "show" (default) makes the target visible when matched; "hide" hides it when matched */
  action?: "show" | "hide";
}

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  /** Optional Font Awesome icon class for the field label */
  icon?: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
  accept?: string;
  hint?: string;
  /** For heading fields â rich text / description content */
  content?: string;
  /** For checkbox fields â max selections allowed */
  maxSelections?: number;
  /** For package fields â full package configuration */
  packageConfig?: PackageConfig;
  /** For repeater fields â sub-fields and entry config */
  repeaterConfig?: RepeaterConfig;
  /** For consent fields â the scrollable agreement text (plain text or HTML) */
  consentText?: string;
  /** For consent fields â label next to the checkbox, e.g. "I agree to the terms above" */
  consentCheckboxLabel?: string;
  /** For asset_collection fields â asset upload configuration */
  assetCollectionConfig?: AssetCollectionConfig;
  /** For site_structure fields â sitemap builder configuration */
  siteStructureConfig?: SiteStructureConfig;
  /** For feature_selector fields â feature toggle configuration */
  featureSelectorConfig?: FeatureSelectorConfig;
  /** For goal_builder fields â goal picker configuration */
  goalBuilderConfig?: GoalBuilderConfig;
  /** For approval fields â sign-off configuration */
  approvalConfig?: ApprovalConfig;
  /** For brand_style fields — visual style picker configuration */
  brandStyleConfig?: BrandStyleConfig;
  /** For competitor_analyzer fields — competitor input configuration */
  competitorAnalyzerConfig?: CompetitorAnalyzerConfig;
  /** For timeline fields — date/milestone configuration */
  timelineConfig?: TimelineConfig;
  /** For budget_allocator fields — slider configuration */
  budgetAllocatorConfig?: BudgetAllocatorConfig;
  /** For payment fields — payment provider configuration */
  paymentConfig?: PaymentConfig;
  /** For captcha fields — bot protection configuration */
  captchaConfig?: CaptchaConfig;
  /** For rating fields — star count and half-star option */
  ratingConfig?: RatingConfig;
  /** For slider fields — min/max/step configuration */
  sliderConfig?: SliderConfig;
  /** For social_handles fields — which platforms to show */
  socialHandlesConfig?: SocialHandlesConfig;
  /** For address fields — structured address / autocomplete config */
  addressConfig?: AddressConfig;
  /** For name fields -- sub-field and layout config */
  nameConfig?: NameConfig;
  /** For phone fields -- formatting and country code config */
  phoneConfig?: PhoneConfig;
  /** For email fields -- confirmation and domain rules */
  emailConfig?: EmailConfig;
  /** For text fields -- max length and mask config */
  textConfig?: TextConfig;
  /** For matrix fields — grid/table config */
  matrixConfig?: MatrixConfig;
  /** For questionnaire fields — scored questions config */
  questionnaireConfig?: QuestionnaireConfig;
  /** For property_details fields — real estate property config */
  propertyDetailsConfig?: PropertyDetailsConfig;
  /** For insurance_info fields — healthcare insurance config */
  insuranceInfoConfig?: InsuranceInfoConfig;
  /** For guest_rsvp fields — event RSVP config */
  guestRsvpConfig?: GuestRsvpConfig;
  /** For room_selector fields — hospitality room/service config */
  roomSelectorConfig?: RoomSelectorConfig;
  /** For loan_calculator fields — finance calculator config */
  loanCalculatorConfig?: LoanCalculatorConfig;
  /** For case_intake fields — legal case intake config */
  caseIntakeConfig?: CaseIntakeConfig;
  /** For donation_tier fields — nonprofit donation config */
  donationTierConfig?: DonationTierConfig;
  /** For volunteer_signup fields — nonprofit volunteer config */
  volunteerSignupConfig?: VolunteerSignupConfig;
  /** For cause_selector fields — nonprofit cause/program config */
  causeSelectorConfig?: CauseSelectorConfig;
  /** For calculated fields -- formula and display config */
  calculatedFieldConfig?: CalculatedFieldConfig;
  /** For chained_select fields -- hierarchical dropdown config */
  chainedSelectConfig?: ChainedSelectConfig;
  /** Show this field only when the condition is met */
  showCondition?: ShowCondition;
  /** For file/files fields: optional cloud storage destination */
  cloudDestination?: {
    provider: "google_drive" | "dropbox" | "onedrive" | "box";
    folderId: string;
    folderPath: string;
  };
  /** Column span in a 4-column grid layout (1-4). Default = 4 (full width). */
  colSpan?: 1 | 2 | 3 | 4;
  /** Display mode for select/radio/checkbox fields. "icon_cards" renders options as a card grid with icons. */
  displayMode?: "default" | "icon_cards";
  /** Map of option value -> Font Awesome icon class (e.g. { "Instagram": "fa-brands fa-instagram" }). Used when displayMode is "icon_cards". */
  optionIcons?: Record<string, string>;
  /** Number of columns for icon card grid (2-6). Default 3. */
  iconCardColumns?: 2 | 3 | 4 | 5 | 6;
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

/* ── Column layout constants ─────────────────────────────── */

/** Maximum number of columns in the form grid */
export const GRID_COLUMNS = 4;

/**
 * Minimum colSpan each field type supports (how narrow it can go).
 * Fields not listed here default to GRID_COLUMNS (full width only).
 */
export const MIN_COL_SPAN: Partial<Record<FieldType, 1 | 2 | 3 | 4>> = {
  /* Can go as narrow as 1 column */
  text: 1,
  email: 1,
  tel: 1,
  number: 1,
  url: 1,
  date: 1,
  color: 1,
  select: 1,
  toggle: 1,
  rating: 1,
  slider: 1,
  /* Can go as narrow as 2 columns */
  name: 2,
  textarea: 2,
  radio: 2,
  checkbox: 2,
  address: 2,
  social_handles: 2,
  consent: 2,
  heading: 2,
  captcha: 2,
  payment: 2,
  file: 2,
  files: 2,
  /* Can go as narrow as 2 columns -- industry fields */
  property_details: 2,
  insurance_info: 2,
  guest_rsvp: 2,
  case_intake: 2,
  loan_calculator: 2,
  volunteer_signup: 2,
  calculated: 1,
  chained_select: 2,
  /* Full width only (4) -- complex/wide fields */
  // donation_tier, cause_selector, room_selector default to GRID_COLUMNS
  // package, repeater, asset_collection, site_structure, feature_selector,
  // goal_builder, approval, brand_style, competitor_analyzer, timeline,
  // budget_allocator, matrix, questionnaire, room_selector -- all default to GRID_COLUMNS
};

/** Get the minimum allowed colSpan for a given field type */
export function getMinColSpan(type: FieldType): number {
  return MIN_COL_SPAN[type] ?? GRID_COLUMNS;
}

/** Get the effective colSpan for a field (clamped to valid range) */
export function getEffectiveColSpan(field: FieldDef): 1 | 2 | 3 | 4 {
  const min = getMinColSpan(field.type);
  const span = field.colSpan ?? GRID_COLUMNS;
  return Math.max(min, Math.min(GRID_COLUMNS, span)) as 1 | 2 | 3 | 4;
}

/**
 * Group a flat field array into rows for grid rendering.
 * Each row is an array of fields whose colSpans sum to <= GRID_COLUMNS.
 */
export function groupFieldsIntoRows(fields: FieldDef[]): FieldDef[][] {
  const rows: FieldDef[][] = [];
  let currentRow: FieldDef[] = [];
  let currentWidth = 0;

  for (const field of fields) {
    const span = getEffectiveColSpan(field);
    if (currentWidth + span > GRID_COLUMNS && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentWidth = 0;
    }
    currentRow.push(field);
    currentWidth += span;
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

/** Evaluate a single condition clause against form data */
function evaluateSingleCondition(
  fieldId: string,
  operator: string,
  value: string | undefined,
  allData: Record<string, unknown>,
): boolean {
  const raw = allData[fieldId];
  const fieldVal = raw === undefined || raw === null ? "" : String(raw);

  switch (operator) {
    case "equals":
      return fieldVal === (value ?? "");
    case "not_equals":
      return fieldVal !== (value ?? "");
    case "contains":
      return fieldVal.toLowerCase().includes((value ?? "").toLowerCase());
    case "not_empty":
      return fieldVal.trim() !== "";
    case "is_empty":
      return fieldVal.trim() === "";
    case "greater_than": {
      const num = parseFloat(fieldVal);
      const cmp = parseFloat(value ?? "0");
      return !isNaN(num) && !isNaN(cmp) && num > cmp;
    }
    case "less_than": {
      const num = parseFloat(fieldVal);
      const cmp = parseFloat(value ?? "0");
      return !isNaN(num) && !isNaN(cmp) && num < cmp;
    }
    default:
      return true;
  }
}

/**
 * Evaluate a show condition against the current form data.
 * Returns true if the field/step should be visible.
 *
 * Supports:
 * - Single condition (backward compat): just fieldId + operator + value
 * - Multiple conditions via extraConditions[], combined with combinator ("or" | "and")
 * - Action "show" (default): visible when conditions match
 * - Action "hide": visible when conditions do NOT match
 */
export function evaluateCondition(
  condition: ShowCondition | undefined,
  allData: Record<string, unknown>,
): boolean {
  if (!condition || !condition.fieldId) return true;

  // Build list of all condition clauses
  const clauses: { fieldId: string; operator: string; value?: string }[] = [
    { fieldId: condition.fieldId, operator: condition.operator, value: condition.value },
    ...(condition.extraConditions ?? []),
  ];

  const combinator = condition.combinator ?? "or";

  let matched: boolean;
  if (combinator === "and") {
    matched = clauses.every((c) => evaluateSingleCondition(c.fieldId, c.operator, c.value, allData));
  } else {
    // "or" — any clause matching is enough
    matched = clauses.some((c) => evaluateSingleCondition(c.fieldId, c.operator, c.value, allData));
  }

  // If action is "hide", invert: visible when conditions do NOT match
  if (condition.action === "hide") return !matched;

  // Default action "show": visible when conditions match
  return matched;
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
    // Skip hidden fields â they should not be validated
    if (f.showCondition && !evaluateCondition(f.showCondition, allData ?? data)) continue;
    // File fields are validated separately (upload state lives in submission_files).
    if (f.type === "file" || f.type === "files") continue;
    // Heading fields are display-only, never validated.
    if (f.type === "heading") continue;
    // Calculated fields are computed read-only, never validated.
    if (f.type === "calculated") continue;
    const v = data[f.id];
    if (f.type === "chained_select") {
      if (f.required) {
        try {
          const parsed = typeof v === "string" ? JSON.parse(v) : (typeof v === "object" ? v : null);
          if (!parsed) { errors[f.id] = "Please make a selection"; continue; }
          const keys = Object.keys(parsed).filter((k) => parsed[k]);
          if (keys.length === 0) errors[f.id] = "Please make a selection";
        } catch { errors[f.id] = "Please make a selection"; }
      }
      continue;
    }
    // Repeater entries are validated inline â the component handles required sub-fields.
    if (f.type === "repeater") {
      if (f.required) {
        const minEntries = f.repeaterConfig?.minEntries ?? 1;
        try {
          const entries = typeof v === "string" ? JSON.parse(v || "[]") : (Array.isArray(v) ? v : []);
          if (entries.length < minEntries) {
            errors[f.id] = `At least ${minEntries} ${f.repeaterConfig?.entryLabel?.toLowerCase() || "entry"}(s) required`;
          }
        } catch { /* malformed JSON â let it pass */ }
      }
      continue;
    }
    // Package fields store selected package id â validated as required if set.
    if (f.type === "package") {
      if (f.required && (!v || v === "")) errors[f.id] = "Please select a package";
      continue;
    }
    // Consent fields must be checked ("yes") when required.
    if (f.type === "consent") {
      if (f.required && v !== "yes") errors[f.id] = "You must agree to continue";
      continue;
    }
    if (f.type === "approval") {
      if (f.required) {
        try {
          const parsed = typeof v === "string" ? JSON.parse(v) : (typeof v === "object" ? v : null);
          if (!parsed || parsed.approved !== true) {
            errors[f.id] = "Approval is required to continue";
          }
        } catch { errors[f.id] = "Approval is required to continue"; }
      }
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
    if (f.type === "email" && f.emailConfig?.confirmEmail && typeof v === "string") {
      const confirmVal = data[f.id + "_confirm"];
      if (typeof confirmVal === "string" && confirmVal !== v) errors[f.id + "_confirm"] = "Email addresses do not match";
    }
    if (f.type === "name" && typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        const reqFields = (f.nameConfig?.fields ?? ["first", "last"]).filter((fld) => fld !== "middle" && fld !== "prefix" && fld !== "suffix");
        const missing = reqFields.filter((fld) => !parsed[fld]?.trim());
        if (f.required && missing.length > 0) errors[f.id] = "Please fill in all name fields";
      } catch { if (f.required) errors[f.id] = "Please enter your name"; }
    }
    if (f.type === "tel" && f.phoneConfig?.format === "international" && typeof v === "string") {
      if (v.length > 0 && !/^\+?\d[\d\s\-().]{4,}$/.test(v)) errors[f.id] = "Please enter a valid phone number";
    }
    if (f.type === "tel" && f.phoneConfig?.format !== "international" && typeof v === "string") {
      if (v.length > 0 && !/^[\d\s\-().+]{7,}$/.test(v)) errors[f.id] = "Please enter a valid phone number";
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
    if (f.type === "rating" && typeof v === "string") {
      const n = Number(v);
      const max = f.ratingConfig?.maxStars ?? 5;
      if (Number.isNaN(n) || n < (f.ratingConfig?.allowHalf ? 0.5 : 1) || n > max) errors[f.id] = "Invalid rating";
    }
    if (f.type === "slider" && typeof v === "string") {
      const n = Number(v);
      const cfg = f.sliderConfig ?? { min: 0, max: 100, step: 1 };
      if (Number.isNaN(n) || n < cfg.min || n > cfg.max) errors[f.id] = `Must be between ${cfg.min} and ${cfg.max}`;
    }
    if (f.type === "address" && f.addressConfig?.mode === "manual" && typeof v === "string") {
      try {
        const addr = JSON.parse(v);
        const reqFields = (f.addressConfig.fields ?? ["street", "city", "state", "zip"]).filter((fld) => fld !== "street2");
        const missing = reqFields.filter((fld) => !addr[fld]?.trim());
        if (f.required && missing.length > 0) errors[f.id] = "Please fill in all address fields";
      } catch { /* plain text fallback, already validated by required check above */ }
    }
    if (f.type === "address" && f.addressConfig?.mode === "autocomplete" && typeof v === "string") {
      try {
        const addr = JSON.parse(v);
        const reqFields = (f.addressConfig.fields ?? ["street", "city", "state", "zip"]).filter((fld) => fld !== "street2");
        const missing = reqFields.filter((fld) => !addr[fld]?.trim());
        if (f.required && missing.length > 0) errors[f.id] = "Please fill in all address fields";
      } catch { /* plain text fallback */ }
    }
    if (f.type === "social_handles" && typeof v === "string") {
      try {
        const handles = JSON.parse(v);
        if (f.required && (!Array.isArray(handles) || handles.every((h: { handle?: string }) => !h.handle?.trim()))) {
          errors[f.id] = "At least one social handle is required";
        }
      } catch { if (f.required) errors[f.id] = "At least one social handle is required"; }
    }
    if (f.type === "matrix" && typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        if (f.required && f.matrixConfig) {
          const unanswered = f.matrixConfig.rows.filter((row) => !parsed[row]);
          if (unanswered.length > 0) errors[f.id] = `Please answer all rows (${unanswered.length} remaining)`;
        }
      } catch { if (f.required) errors[f.id] = "Please answer all rows"; }
    }
    if (f.type === "questionnaire" && typeof v === "string") {
      try {
        const parsed = JSON.parse(v);
        if (f.required && f.questionnaireConfig) {
          const unanswered = f.questionnaireConfig.questions.filter((q) => !parsed[q.id]);
          if (unanswered.length > 0) errors[f.id] = `Please answer all questions (${unanswered.length} remaining)`;
        }
      } catch { if (f.required) errors[f.id] = "Please answer all questions"; }
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}
