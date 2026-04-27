"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";
import { signupAction, checkSlugAvailability } from "./actions";

const INPUT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300";

const SELECT_CLS =
  "block w-full px-4 py-3 text-sm bg-surface-container-lowest/80 border border-outline-variant/10 rounded-xl text-on-surface focus:ring-2 focus:ring-primary/30 focus:border-primary/30 outline-none transition-all duration-300 appearance-none";

const STEPS = ["Account", "Plan", "Business", "Details"] as const;

const PLAN_TIERS = [
  {
    id: "free",
    name: "Free",
    price: "Free",
    period: "forever",
    desc: "10 submissions/mo, 1 form, 100 MB storage",
    icon: "fa-seedling",
  },
  {
    id: "starter",
    name: "Starter",
    price: "$39",
    period: "/mo",
    desc: "50 submissions/mo, 5 forms, 1 GB storage, CSV & PDF exports",
    icon: "fa-rocket",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    period: "/mo",
    desc: "Unlimited submissions & forms, white-labeling, custom domain",
    icon: "fa-bolt",
    recommended: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "$249",
    period: "/mo",
    desc: "Everything in Pro + partner management, 500 GB storage, priority support",
    icon: "fa-building",
  },
] as const;

export default function SignupForm({ rootHost }: { rootHost: string }) {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const nextUrl = searchParams.get("next") || null;
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [tosAccepted, setTosAccepted] = useState(false);

  // Step 1 field refs — we validate before advancing
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    company_name: "",
    slug: "",
    plan_type: "agency",
    selected_plan: planParam || "free",
    // Step 3
    phone: "",
    website: "",
    industry: "",
    billing_address_line1: "",
    billing_address_line2: "",
    billing_city: "",
    billing_state: "",
    billing_zip: "",
    billing_country: "US",
    // Step 3
    team_size: "",
    expected_monthly_clients: "",
    referral_source: "",
    tax_id: "",
  });

  // Slug availability check (debounced with stale-response guard)
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slugRequestId = useRef(0);

  useEffect(() => {
    const slug = formData.slug;
    if (!slug || slug.length < 2) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    const requestId = ++slugRequestId.current;
    slugTimerRef.current = setTimeout(async () => {
      try {
        const { available } = await checkSlugAvailability(slug);
        // Only apply result if this is still the latest request
        if (requestId === slugRequestId.current) {
          setSlugStatus(available ? "available" : "taken");
        }
      } catch {
        if (requestId === slugRequestId.current) {
          setSlugStatus("idle");
        }
      }
    }, 500);
    return () => {
      if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    };
  }, [formData.slug]);

  function update(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  function validateStep(): boolean {
    if (step === 0) {
      if (!formData.email || !formData.password || !formData.company_name || !formData.slug) {
        setError("All fields are required.");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Please enter a valid email address.");
        return false;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return false;
      }
      if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        setError("Workspace URL can only contain lowercase letters, numbers, and hyphens.");
        return false;
      }
      if (slugStatus === "checking") {
        setError("Still checking if that workspace URL is available. Please wait a moment.");
        return false;
      }
      if (slugStatus === "taken") {
        setError("That workspace URL is already taken. Please choose another.");
        return false;
      }
      if (!tosAccepted) {
        setError("You must agree to the Terms of Service and Privacy Policy.");
        return false;
      }
    }
    // Step 1 (Plan) always passes -- free is default
    if (step === 2) {
      if (!formData.phone || !formData.company_name) {
        setError("Phone number is required.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep()) {
      setError(null);
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    for (const [key, value] of Object.entries(formData)) {
      fd.set(key, value);
    }
    fd.set("tos_accepted_at", new Date().toISOString());

    const result = await signupAction(fd);

    if (!result.ok) {
      setError(result.error);
      setSubmitting(false);
      // If it's a slug/email error, go back to step 1
      if (result.error.includes("workspace URL") || result.error.includes("email")) {
        setStep(0);
      }
      return;
    }

    // Server returns the full redirect URL (verify-email with email+plan params, or dashboard)
    window.location.href = result.next;
  }

  return (
    <div className="gradient-border rounded-2xl">
      <div className="rounded-2xl p-6 space-y-5 bg-surface-container shadow-xl border border-outline-variant/10">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                  i < step
                    ? "bg-tertiary/20 text-tertiary"
                    : i === step
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface-variant/40"
                }`}
              >
                {i < step ? (
                  <i className="fa-solid fa-check text-[10px]" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium transition-colors duration-300 ${
                  i === step ? "text-on-surface" : "text-on-surface-variant/40"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 transition-colors duration-300 ${
                    i < step ? "bg-tertiary/30" : "bg-outline-variant/10"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Account Basics */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Your work email">
              <input
                type="email"
                required
                autoComplete="email"
                className={INPUT_CLS}
                placeholder="you@youragency.com"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </Field>

            <Field label="Create a password" hint="At least 8 characters.">
              <PasswordInput
                required
                minLength={8}
                autoComplete="new-password"
                className={`${INPUT_CLS} pr-10`}
                value={formData.password}
                onChange={(e) => update("password", e.target.value)}
              />
            </Field>

            <Field label="Company / agency name">
              <input
                required
                autoComplete="organization"
                className={INPUT_CLS}
                placeholder="Acme Creative"
                value={formData.company_name}
                onChange={(e) => {
                  update("company_name", e.target.value);
                  // Auto-generate slug if user hasn't manually edited it
                  if (!formData.slug || formData.slug === slugify(formData.company_name)) {
                    update("slug", slugify(e.target.value));
                  }
                }}
              />
            </Field>

            <Field label="Your workspace URL" hint="Lowercase letters, numbers, hyphens.">
              <div className="flex items-center">
                <input
                  required
                  pattern="[a-z0-9-]+"
                  className={`${INPUT_CLS} rounded-r-none`}
                  placeholder="acme"
                  value={formData.slug}
                  onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
                <span className="px-3 py-3 text-sm text-on-surface-variant bg-surface-container-high border-0 rounded-r-xl whitespace-nowrap">
                  .{rootHost}
                </span>
              </div>
              {formData.slug.length >= 2 && (
                <div className="mt-1.5 text-xs flex items-center gap-1.5">
                  {slugStatus === "checking" && (
                    <span className="text-on-surface-variant/50">
                      <i className="fa-solid fa-spinner fa-spin mr-1" />
                      Checking availability...
                    </span>
                  )}
                  {slugStatus === "available" && (
                    <span className="text-tertiary">
                      <i className="fa-solid fa-circle-check mr-1" />
                      {formData.slug}.{rootHost} is available!
                    </span>
                  )}
                  {slugStatus === "taken" && (
                    <span className="text-error">
                      <i className="fa-solid fa-circle-xmark mr-1" />
                      {formData.slug}.{rootHost} is already taken.
                    </span>
                  )}
                </div>
              )}
            </Field>

            {/* TOS Agreement */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => { setTosAccepted(e.target.checked); setError(null); }}
                className="mt-0.5 h-4 w-4 accent-primary rounded"
              />
              <span className="text-xs text-on-surface-variant/70 leading-relaxed group-hover:text-on-surface-variant transition-colors">
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="text-primary hover:underline font-medium">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs text-on-surface-variant/70">
              Choose the plan that fits your needs. You can always change later.
            </p>
            <div className="space-y-2.5">
              {PLAN_TIERS.map((tier) => (
                <label
                  key={tier.id}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                    formData.selected_plan === tier.id
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-outline-variant/15 hover:border-primary/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="selected_plan"
                    value={tier.id}
                    checked={formData.selected_plan === tier.id}
                    onChange={() => update("selected_plan", tier.id)}
                    className="sr-only"
                  />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    formData.selected_plan === tier.id
                      ? "bg-primary/20 text-primary"
                      : "bg-surface-container-high text-on-surface-variant/60"
                  }`}>
                    <i className={`fa-solid ${tier.icon} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface">{tier.name}</span>
                      {"recommended" in tier && tier.recommended && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant/60 mt-0.5">{tier.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-extrabold text-on-surface font-headline">{tier.price}</span>
                    {tier.period !== "forever" && (
                      <span className="text-xs text-on-surface-variant/50">{tier.period}</span>
                    )}
                  </div>
                  {formData.selected_plan === tier.id && (
                    <div className="absolute top-3 right-3">
                      <i className="fa-solid fa-circle-check text-primary text-sm" />
                    </div>
                  )}
                </label>
              ))}
            </div>

            <fieldset className="space-y-2 pt-2">
              <legend className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                What best describes you?
              </legend>
              <PlanOption
                name="plan_type"
                value="agency"
                checked={formData.plan_type === "agency"}
                onChange={() => update("plan_type", "agency")}
                title="I'm an agency or freelancer"
                desc="You'll onboard your own clients through one branded workspace."
              />
              <PlanOption
                name="plan_type"
                value="agency_plus_partners"
                checked={formData.plan_type === "agency_plus_partners"}
                onChange={() => update("plan_type", "agency_plus_partners")}
                title="I manage multiple brands / sub-partners"
                desc="You can spin up sub-partner workspaces, each with their own branding and team."
              />
            </fieldset>
          </div>
        )}

        {/* Step 3: Business Details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Phone number">
              <input
                type="tel"
                autoComplete="tel"
                className={INPUT_CLS}
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </Field>

            <Field label="Website" hint="Optional">
              <input
                type="url"
                autoComplete="url"
                className={INPUT_CLS}
                placeholder="https://youragency.com"
                value={formData.website}
                onChange={(e) => update("website", e.target.value)}
              />
            </Field>

            <Field label="Industry / niche" hint="Optional">
              <select
                className={SELECT_CLS}
                value={formData.industry}
                onChange={(e) => update("industry", e.target.value)}
              >
                <option value="">Select your industry</option>
                <option value="web_design">Web Design & Development</option>
                <option value="marketing">Marketing & Advertising</option>
                <option value="creative">Creative & Design Studio</option>
                <option value="consulting">Consulting</option>
                <option value="real_estate">Real Estate</option>
                <option value="healthcare">Healthcare</option>
                <option value="legal">Legal</option>
                <option value="finance">Finance & Accounting</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="saas">SaaS / Technology</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <div className="pt-2">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-3">
                Billing address
              </p>
              <div className="space-y-3">
                <input
                  autoComplete="address-line1"
                  className={INPUT_CLS}
                  placeholder="Street address"
                  value={formData.billing_address_line1}
                  onChange={(e) => update("billing_address_line1", e.target.value)}
                />
                <input
                  autoComplete="address-line2"
                  className={INPUT_CLS}
                  placeholder="Apt, suite, unit (optional)"
                  value={formData.billing_address_line2}
                  onChange={(e) => update("billing_address_line2", e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    autoComplete="address-level2"
                    className={INPUT_CLS}
                    placeholder="City"
                    value={formData.billing_city}
                    onChange={(e) => update("billing_city", e.target.value)}
                  />
                  <input
                    autoComplete="address-level1"
                    className={INPUT_CLS}
                    placeholder="State / Province"
                    value={formData.billing_state}
                    onChange={(e) => update("billing_state", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    autoComplete="postal-code"
                    className={INPUT_CLS}
                    placeholder="ZIP / Postal code"
                    value={formData.billing_zip}
                    onChange={(e) => update("billing_zip", e.target.value)}
                  />
                  <select
                    autoComplete="country"
                    className={SELECT_CLS}
                    value={formData.billing_country}
                    onChange={(e) => update("billing_country", e.target.value)}
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Usage & Preferences */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <Field label="Team size" hint="How many people will use linqme?">
              <select
                className={SELECT_CLS}
                value={formData.team_size}
                onChange={(e) => update("team_size", e.target.value)}
              >
                <option value="">Select team size</option>
                <option value="just_me">Just me</option>
                <option value="2-5">2–5 people</option>
                <option value="6-15">6–15 people</option>
                <option value="16-50">16–50 people</option>
                <option value="50+">50+ people</option>
              </select>
            </Field>

            <Field label="Expected monthly clients" hint="Roughly how many clients do you onboard per month?">
              <select
                className={SELECT_CLS}
                value={formData.expected_monthly_clients}
                onChange={(e) => update("expected_monthly_clients", e.target.value)}
              >
                <option value="">Select volume</option>
                <option value="1-5">1–5 clients</option>
                <option value="6-15">6–15 clients</option>
                <option value="16-50">16–50 clients</option>
                <option value="50+">50+ clients</option>
              </select>
            </Field>

            <Field label="How did you hear about us?">
              <select
                className={SELECT_CLS}
                value={formData.referral_source}
                onChange={(e) => update("referral_source", e.target.value)}
              >
                <option value="">Select one</option>
                <option value="google">Google Search</option>
                <option value="social_media">Social Media</option>
                <option value="referral">Friend / Colleague Referral</option>
                <option value="blog">Blog / Article</option>
                <option value="youtube">YouTube</option>
                <option value="podcast">Podcast</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Tax ID / EIN" hint="Optional. Used for invoicing.">
              <input
                className={INPUT_CLS}
                placeholder="e.g. 12-3456789"
                value={formData.tax_id}
                onChange={(e) => update("tax_id", e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-error/20 bg-error-container/10 px-3 py-2 text-sm text-error">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="rounded-xl border border-outline-variant/15 px-5 py-3 text-sm font-medium text-on-surface-variant hover:border-primary/30 hover:text-on-surface transition-all duration-300"
            >
              Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex-1 rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] transition-all duration-500"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-xl bg-primary text-on-primary px-4 py-3 text-sm font-bold hover:shadow-[0_0_30px_rgba(var(--color-primary),0.35)] disabled:opacity-60 transition-all duration-500"
            >
              {submitting ? "Creating workspace..." : "Create workspace"}
            </button>
          )}
        </div>

        <p className="text-xs text-on-surface-variant/50 text-center">
          Already have an account?{" "}
          <Link
            href={nextUrl ? `/login?next=${encodeURIComponent(nextUrl)}` : "/login"}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest">{label}</span>
      {hint && <span className="block text-xs text-on-surface-variant/60 mt-0.5 mb-1.5">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function PlanOption({
  name,
  value,
  title,
  desc,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  title: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-outline-variant/15 hover:border-primary/30 cursor-pointer has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5 transition-all duration-200">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <div>
        <div className="text-sm font-medium text-on-surface">{title}</div>
        <div className="text-xs text-on-surface-variant/60 mt-0.5">{desc}</div>
      </div>
    </label>
  );
}
