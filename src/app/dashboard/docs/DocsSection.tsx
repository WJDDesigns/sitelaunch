"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ──────────────────────────────────────
   Table of Contents data (mirrors public docs)
   ────────────────────────────────────── */
interface TocSection {
  id: string;
  title: string;
  icon: string;
  children?: { id: string; title: string }[];
}

const TOC: TocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "fa-rocket",
    children: [
      { id: "creating-account", title: "Creating Your Account" },
      { id: "dashboard-overview", title: "Dashboard Overview" },
      { id: "your-first-form", title: "Your First Form" },
    ],
  },
  {
    id: "forms",
    title: "Forms",
    icon: "fa-pen-ruler",
    children: [
      { id: "creating-forms", title: "Creating a Form" },
      { id: "field-types", title: "Field Types" },
      { id: "multi-step-forms", title: "Multi-Step Forms" },
      { id: "conditional-logic", title: "Conditional Logic" },
      { id: "form-settings", title: "Form Settings" },
      { id: "layout-styles", title: "Layout Styles" },
      { id: "form-templates", title: "Templates and Duplication" },
    ],
  },
  {
    id: "field-reference",
    title: "Field Reference",
    icon: "fa-list-check",
    children: [
      { id: "basic-fields", title: "Basic Fields" },
      { id: "selection-fields", title: "Selection Fields" },
      { id: "file-fields", title: "File Upload Fields" },
      { id: "advanced-fields", title: "Advanced Fields" },
      { id: "display-fields", title: "Display Fields" },
    ],
  },
  {
    id: "entries",
    title: "Entries and Submissions",
    icon: "fa-inbox",
    children: [
      { id: "viewing-entries", title: "Viewing Entries" },
      { id: "entry-statuses", title: "Entry Statuses" },
      { id: "exporting-data", title: "Exporting Data" },
    ],
  },
  {
    id: "accounts",
    title: "Client Accounts",
    icon: "fa-users",
    children: [
      { id: "managing-clients", title: "Managing Clients" },
      { id: "client-tags", title: "Tags and Organization" },
    ],
  },
  {
    id: "branding",
    title: "Branding and White-Label",
    icon: "fa-palette",
    children: [
      { id: "workspace-branding", title: "Workspace Branding" },
      { id: "custom-domains", title: "Custom Domains" },
      { id: "storefront", title: "Your Storefront" },
      { id: "white-label", title: "White-Label Settings" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: "fa-plug",
    children: [
      { id: "cloud-storage", title: "Cloud Storage" },
      { id: "payment-providers", title: "Payment Providers" },
      { id: "ai-integrations", title: "AI Services" },
      { id: "captcha", title: "Bot Protection (CAPTCHA)" },
    ],
  },
  {
    id: "analytics-insights",
    title: "Analytics and Insights",
    icon: "fa-chart-pie",
    children: [
      { id: "analytics-dashboard", title: "Analytics Dashboard" },
      { id: "custom-insights", title: "Custom Insights" },
    ],
  },
  {
    id: "team",
    title: "Team Management",
    icon: "fa-user-group",
    children: [
      { id: "inviting-members", title: "Inviting Members" },
      { id: "roles-permissions", title: "Roles and Permissions" },
    ],
  },
  {
    id: "partners",
    title: "Partner Management",
    icon: "fa-handshake",
    children: [
      { id: "creating-partners", title: "Creating Partners" },
      { id: "partner-branding", title: "Partner Branding" },
    ],
  },
  {
    id: "billing",
    title: "Billing and Plans",
    icon: "fa-credit-card",
    children: [
      { id: "plans", title: "Plans and Pricing" },
      { id: "managing-subscription", title: "Managing Your Subscription" },
      { id: "invoices", title: "Invoices" },
    ],
  },
  {
    id: "security",
    title: "Security",
    icon: "fa-shield-halved",
    children: [
      { id: "authentication", title: "Authentication Methods" },
      { id: "mfa", title: "Multi-Factor Authentication" },
      { id: "passkeys", title: "Passkeys" },
      { id: "sessions", title: "Session Management" },
    ],
  },
  {
    id: "settings-ref",
    title: "Settings",
    icon: "fa-gear",
    children: [
      { id: "profile-settings", title: "Profile" },
      { id: "dashboard-palette", title: "Dashboard Palette" },
      { id: "data-export", title: "Data Export" },
      { id: "delete-account", title: "Deleting Your Account" },
    ],
  },
];

/* ──────────────────────────────────────
   Dashboard-embedded docs viewer
   ────────────────────────────────────── */
export default function DocsSection() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("getting-started");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const allIds = TOC.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);

  useEffect(() => {
    observerRef.current?.disconnect();
    const root = contentRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { root, rootMargin: "-20px 0px -70% 0px", threshold: 0 },
    );

    for (const id of allIds) {
      const el = root.querySelector(`#docs-${id}`);
      if (el) observer.observe(el);
    }

    observerRef.current = observer;
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#docs-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileTocOpen(false);
    }
  }, []);

  const filteredToc = search.trim()
    ? TOC.map((section) => {
        const q = search.toLowerCase();
        const matchesParent = section.title.toLowerCase().includes(q);
        const matchedChildren = section.children?.filter((c) => c.title.toLowerCase().includes(q)) ?? [];
        if (matchesParent || matchedChildren.length > 0) {
          return { ...section, children: matchesParent ? section.children : matchedChildren };
        }
        return null;
      }).filter(Boolean) as TocSection[]
    : TOC;

  return (
    <section className="rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-outline-variant/[0.08]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold font-headline text-on-surface">
            <i className="fa-solid fa-book text-primary mr-2 text-sm" />
            Documentation
          </h2>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Open full page <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" />
          </a>
        </div>
        <p className="text-sm text-on-surface-variant/60">
          Everything you need to know about building forms, managing clients, and growing your agency.
        </p>
      </div>

      <div className="flex" style={{ height: "calc(80vh - 200px)", minHeight: 500 }}>
        {/* ── Sidebar TOC ── */}
        <aside className="hidden md:block w-56 shrink-0 overflow-y-auto border-r border-outline-variant/[0.08] bg-surface-container-lowest/30">
          <div className="p-3">
            <div className="relative mb-3">
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[10px]" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/10 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <nav className="space-y-0.5">
              {filteredToc.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeId === section.id
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-on-surface/[0.04] hover:text-on-surface"
                    }`}
                  >
                    <i className={`fa-solid ${section.icon} w-3.5 text-center text-[10px]`} />
                    {section.title}
                  </button>
                  {section.children && (
                    <div className="ml-5 pl-2.5 border-l border-outline-variant/10 space-y-0.5 mt-0.5 mb-1.5">
                      {section.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => scrollTo(child.id)}
                          className={`w-full text-left block px-2.5 py-1 rounded-md text-[11px] transition-all duration-200 ${
                            activeId === child.id
                              ? "text-primary font-semibold bg-primary/5"
                              : "text-on-surface-variant/60 hover:text-on-surface"
                          }`}
                        >
                          {child.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Mobile TOC toggle ── */}
        <button
          onClick={() => setMobileTocOpen(!mobileTocOpen)}
          className="md:hidden fixed bottom-6 right-6 z-50 w-12 h-12 rounded-xl bg-primary text-on-primary shadow-lg shadow-primary/25 flex items-center justify-center"
        >
          <i className={`fa-solid ${mobileTocOpen ? "fa-xmark" : "fa-list"} text-sm`} />
        </button>

        {/* ── Mobile TOC drawer ── */}
        {mobileTocOpen && (
          <>
            <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileTocOpen(false)} />
            <aside className="md:hidden fixed right-0 top-0 bottom-0 z-40 w-72 max-w-[85vw] overflow-y-auto bg-background border-l border-on-surface/[0.06] shadow-2xl">
              <div className="p-4">
                <div className="relative mb-3">
                  <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[10px]" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/10 focus:border-primary/30 outline-none transition-all"
                  />
                </div>
                <nav className="space-y-0.5">
                  {filteredToc.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => scrollTo(section.id)}
                        className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          activeId === section.id ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <i className={`fa-solid ${section.icon} w-3.5 text-center text-[10px]`} />
                        {section.title}
                      </button>
                      {section.children && (
                        <div className="ml-5 pl-2.5 border-l border-outline-variant/10 space-y-0.5 mt-0.5 mb-1.5">
                          {section.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => scrollTo(child.id)}
                              className={`w-full text-left block px-2.5 py-1 rounded-md text-[11px] transition-all ${
                                activeId === child.id ? "text-primary font-semibold bg-primary/5" : "text-on-surface-variant/60 hover:text-on-surface"
                              }`}
                            >
                              {child.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </div>
            </aside>
          </>
        )}

        {/* ── Main content ── */}
        <div ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-6 md:px-8 py-6">
          {/* GETTING STARTED */}
          <DocSection id="docs-getting-started" title="Getting Started" icon="fa-rocket">
            <p>
              linqme is a form-building and client onboarding platform designed for agencies. Create beautiful multi-step forms,
              collect client information, manage submissions, and white-label the entire experience under your brand.
            </p>

            <DocSub id="docs-creating-account" title="Creating Your Account">
              <p>
                Head to the signup page and create your account using email and password, or sign in with Google or GitHub.
                Once signed up, linqme automatically creates a workspace for you with your name and a unique subdomain.
              </p>
              <Callout type="tip">
                Your subdomain determines your public storefront URL. You can change it later in Settings under Branding.
              </Callout>
            </DocSub>

            <DocSub id="docs-dashboard-overview" title="Dashboard Overview">
              <p>
                The dashboard is your command center. The left sidebar gives you quick access to every section: Dashboard,
                Forms, Entries, Accounts, Insights, Analytics, Billing, and Settings. On mobile, navigation moves to a
                bottom tab bar with a slide-out drawer.
              </p>
            </DocSub>

            <DocSub id="docs-your-first-form" title="Your First Form">
              <p>
                To create your first form, go to Forms and click "New Form." Give it a name, an optional description,
                and start adding fields. Each form can have one or more steps, and each step holds any number of fields.
              </p>
              <Steps items={[
                "Navigate to Forms in the sidebar.",
                "Click \"New Form\" to create a blank form.",
                "Give your form a name and slug.",
                "Add a step, then add fields to that step.",
                "Configure each field with a label, type, and settings.",
                "Toggle the form to Active when you are ready to share it.",
                "Copy the public URL and send it to your client.",
              ]} />
            </DocSub>
          </DocSection>

          {/* FORMS */}
          <DocSection id="docs-forms" title="Forms" icon="fa-pen-ruler">
            <p>
              Forms are the core of linqme. Each form is a multi-step questionnaire that your clients fill out through a
              branded, hosted page.
            </p>

            <DocSub id="docs-creating-forms" title="Creating a Form">
              <p>
                From the Forms page, click "New Form." You will see a form editor with a sidebar for steps and fields,
                and a live preview area. Forms start with one step by default.
              </p>
              <Callout type="info">
                On the Free plan you can create up to 1 form. Starter and Agency plans allow unlimited forms.
              </Callout>
            </DocSub>

            <DocSub id="docs-field-types" title="Field Types">
              <p>
                linqme supports over 25 field types, from simple text inputs to advanced components like budget allocators
                and competitor analyzers. See the Field Reference section below for a complete breakdown.
              </p>
            </DocSub>

            <DocSub id="docs-multi-step-forms" title="Multi-Step Forms">
              <p>
                Break long forms into manageable steps. Each step has its own title and description, and clients see a
                progress indicator as they move through. Steps can be made conditional so they only appear when certain
                criteria are met.
              </p>
            </DocSub>

            <DocSub id="docs-conditional-logic" title="Conditional Logic">
              <p>
                Any field or step can be shown or hidden based on the value of another field. This is configured through
                the Logic tab in the form editor. Conditions support operators like equals, not equals, contains,
                is empty, and is not empty.
              </p>
              <Callout type="tip">
                Use the visual flow canvas in the Logic tab to see how your conditions connect fields together.
              </Callout>
            </DocSub>

            <DocSub id="docs-form-settings" title="Form Settings">
              <p>
                Each form has settings for active/inactive toggle, default form selection, confirmation page messaging,
                redirect URL after submission, and notification configuration.
              </p>
            </DocSub>

            <DocSub id="docs-layout-styles" title="Layout Styles">
              <p>
                linqme offers four layout styles: Sidebar (default), Top Navigation, No Navigation (full-screen), and
                Conversation (one question at a time). Change the layout per form from the form settings panel.
              </p>
            </DocSub>

            <DocSub id="docs-form-templates" title="Templates and Duplication">
              <p>
                Save time by duplicating an existing form. From the Forms list, use the menu on any form card to create
                a copy with all the same steps, fields, and settings but a new slug.
              </p>
            </DocSub>
          </DocSection>

          {/* FIELD REFERENCE */}
          <DocSection id="docs-field-reference" title="Field Reference" icon="fa-list-check">
            <p>
              Below is a complete reference of every field type available in the form builder, organized by category.
            </p>

            <DocSub id="docs-basic-fields" title="Basic Fields">
              <FieldRef fields={[
                { name: "Text", desc: "Single-line text input for names, titles, and short answers." },
                { name: "Textarea", desc: "Multi-line text area with configurable rows." },
                { name: "Email", desc: "Email input with built-in validation." },
                { name: "Phone", desc: "Phone number input." },
                { name: "URL", desc: "URL input with validation." },
                { name: "Number", desc: "Numeric input for whole numbers and decimals." },
                { name: "Date", desc: "Date picker with calendar popup." },
                { name: "Color", desc: "Color picker that saves hex values." },
                { name: "Address", desc: "Full address field with autocomplete support." },
              ]} />
            </DocSub>

            <DocSub id="docs-selection-fields" title="Selection Fields">
              <FieldRef fields={[
                { name: "Select (Dropdown)", desc: "Single-choice dropdown menu." },
                { name: "Radio", desc: "Single-choice radio buttons." },
                { name: "Checkbox", desc: "Multiple-choice checkboxes with optional selection limit." },
                { name: "Package Selector", desc: "Pricing/service tier picker with rules engine." },
                { name: "Feature Selector", desc: "Feature checkboxes with complexity indicators and pricing." },
                { name: "Brand Style", desc: "Visual style palette selector with color mood boards." },
                { name: "Goal Builder", desc: "Goal picker with refinement questions." },
              ]} />
            </DocSub>

            <DocSub id="docs-file-fields" title="File Upload Fields">
              <FieldRef fields={[
                { name: "File", desc: "Single file upload with secure storage." },
                { name: "Files (Multiple)", desc: "Multiple file upload with drag-and-drop." },
                { name: "Asset Collection", desc: "Advanced multi-file asset picker with tagging and cloud storage routing." },
              ]} />
            </DocSub>

            <DocSub id="docs-advanced-fields" title="Advanced Fields">
              <FieldRef fields={[
                { name: "Repeater", desc: "Nested rows that clients can add and remove with sub-fields." },
                { name: "Consent", desc: "Scrollable agreement text with checkbox for terms and NDAs." },
                { name: "Site Structure", desc: "Interactive sitemap builder with drag-and-drop tree editing." },
                { name: "Competitor Analyzer", desc: "AI-generated competitive analysis from URLs. Requires AI integration." },
                { name: "Timeline", desc: "Milestone date picker with availability blocker." },
                { name: "Budget Allocator", desc: "Multi-channel budget slider in constrained or independent mode." },
                { name: "Payment", desc: "Collect payments via Stripe, PayPal, or Square." },
                { name: "Captcha", desc: "Bot protection using reCAPTCHA v3 or Cloudflare Turnstile." },
                { name: "Approval", desc: "Canvas-based draw-to-sign signature pad." },
              ]} />
            </DocSub>

            <DocSub id="docs-display-fields" title="Display Fields">
              <FieldRef fields={[
                { name: "Heading", desc: "Display-only section header with rich content." },
              ]} />
            </DocSub>
          </DocSection>

          {/* ENTRIES */}
          <DocSection id="docs-entries" title="Entries and Submissions" icon="fa-inbox">
            <DocSub id="docs-viewing-entries" title="Viewing Entries">
              <p>
                The Entries page shows all submissions across your forms. Filter by form, search by client name
                or email, and click into any entry to see the full submitted data including file attachments.
              </p>
            </DocSub>

            <DocSub id="docs-entry-statuses" title="Entry Statuses">
              <p>
                Entries have three statuses: Draft (started but not submitted), Submitted (completed by client),
                and Approved (reviewed by you).
              </p>
            </DocSub>

            <DocSub id="docs-exporting-data" title="Exporting Data">
              <p>
                Export entry data as CSV (bulk export) or PDF (individual formatted submission). Both options are
                available from the Entries page.
              </p>
            </DocSub>
          </DocSection>

          {/* CLIENT ACCOUNTS */}
          <DocSection id="docs-accounts" title="Client Accounts" icon="fa-users">
            <DocSub id="docs-managing-clients" title="Managing Clients">
              <p>
                Add clients manually or let them be created automatically when they submit a form. Each account includes
                name, email, phone, company, and status. Click into any account to see their profile, submission history,
                and notes.
              </p>
            </DocSub>

            <DocSub id="docs-client-tags" title="Tags and Organization">
              <p>
                Use tags to categorize your clients by project type, industry, priority, or referral source. Tags make
                it easy to filter and search across your accounts.
              </p>
            </DocSub>
          </DocSection>

          {/* BRANDING */}
          <DocSection id="docs-branding" title="Branding and White-Label" icon="fa-palette">
            <DocSub id="docs-workspace-branding" title="Workspace Branding">
              <p>
                In Settings under the Branding tab, configure your logo, primary color, secondary color, and workspace
                name. These are used across all client-facing pages.
              </p>
            </DocSub>

            <DocSub id="docs-custom-domains" title="Custom Domains">
              <p>
                Connect your own domain (like forms.youragency.com) so clients see your URL. Add the CNAME record
                shown in Settings and linqme will verify and activate it automatically.
              </p>
              <Callout type="info">
                Custom domains are available on Starter and Agency plans.
              </Callout>
            </DocSub>

            <DocSub id="docs-storefront" title="Your Storefront">
              <p>
                Your storefront is the public page where clients see and start your forms, accessible at your subdomain
                or custom domain.
              </p>
            </DocSub>

            <DocSub id="docs-white-label" title="White-Label Settings">
              <p>
                On Starter and Agency plans, hide all linqme branding, add custom footer text, and upload a custom
                favicon for a fully white-labeled experience.
              </p>
            </DocSub>
          </DocSection>

          {/* INTEGRATIONS */}
          <DocSection id="docs-integrations" title="Integrations" icon="fa-plug">
            <DocSub id="docs-cloud-storage" title="Cloud Storage">
              <p>
                Connect Google Drive, Dropbox, OneDrive, or Box to automatically route file uploads from your forms.
                Set a destination per file upload field.
              </p>
            </DocSub>

            <DocSub id="docs-payment-providers" title="Payment Providers">
              <p>
                Connect Stripe, PayPal, or Square to collect payments directly within your forms. All payments go
                straight to your connected account.
              </p>
              <Callout type="info">
                You must have an active account with the payment provider before connecting.
              </Callout>
            </DocSub>

            <DocSub id="docs-ai-integrations" title="AI Services">
              <p>
                Connect OpenAI or Anthropic with your API key to power smart features like the Competitor Analyzer.
                Choose your preferred model in the AI Integrations section.
              </p>
            </DocSub>

            <DocSub id="docs-captcha" title="Bot Protection (CAPTCHA)">
              <p>
                Add reCAPTCHA v3 or Cloudflare Turnstile to protect your forms from spam. Add your site key in
                Settings, then add a Captcha field to any form.
              </p>
            </DocSub>
          </DocSection>

          {/* ANALYTICS */}
          <DocSection id="docs-analytics-insights" title="Analytics and Insights" icon="fa-chart-pie">
            <DocSub id="docs-analytics-dashboard" title="Analytics Dashboard">
              <p>
                Track page views, form submissions, completion rates, and drop-off points with interactive charts.
                Filter by date range and form.
              </p>
            </DocSub>

            <DocSub id="docs-custom-insights" title="Custom Insights">
              <p>
                Build custom dashboards with widgets. Each widget displays a specific metric or visualization.
                linqme can also auto-generate insights based on your form data.
              </p>
            </DocSub>
          </DocSection>

          {/* TEAM */}
          <DocSection id="docs-team" title="Team Management" icon="fa-user-group">
            <DocSub id="docs-inviting-members" title="Inviting Members">
              <p>
                Invite team members from the Team page. They will receive an email invitation to join your workspace.
                You can resend or revoke pending invitations.
              </p>
            </DocSub>

            <DocSub id="docs-roles-permissions" title="Roles and Permissions">
              <p>
                Three roles are available: Owner (full access including billing and account deletion), Editor (can
                create and edit forms, view entries, manage clients), and Viewer (read-only access).
              </p>
            </DocSub>
          </DocSection>

          {/* PARTNERS */}
          <DocSection id="docs-partners" title="Partner Management" icon="fa-handshake">
            <Callout type="info">
              Partners are available on paid plans (Starter and Agency).
            </Callout>

            <DocSub id="docs-creating-partners" title="Creating Partners">
              <p>
                Navigate to Partners and click "New Partner." Each partner gets its own branding, forms, and team members.
              </p>
            </DocSub>

            <DocSub id="docs-partner-branding" title="Partner Branding">
              <p>
                Each partner can have its own logo, primary color, and custom domain for a unique brand identity
                on every client-facing page.
              </p>
            </DocSub>
          </DocSection>

          {/* BILLING */}
          <DocSection id="docs-billing" title="Billing and Plans" icon="fa-credit-card">
            <DocSub id="docs-plans" title="Plans and Pricing">
              <div className="grid gap-3 sm:grid-cols-3 my-4">
                <PlanCard name="Free" price="$0" features={["1 submission/month", "1 form", "1 GB storage"]} />
                <PlanCard name="Starter" price="$99/mo" features={["25 submissions/month", "Unlimited forms", "White-label"]} highlight />
                <PlanCard name="Agency" price="$249/mo" features={["Unlimited submissions", "Unlimited forms", "All features"]} />
              </div>
            </DocSub>

            <DocSub id="docs-managing-subscription" title="Managing Your Subscription">
              <p>
                Use the "Manage Subscription" button on the Billing page to open the Stripe customer portal where
                you can update payment method, switch plans, or cancel.
              </p>
            </DocSub>

            <DocSub id="docs-invoices" title="Invoices">
              <p>
                All invoices are listed on the Billing page with date, amount, period, and status. View details or
                download PDFs for your records.
              </p>
            </DocSub>
          </DocSection>

          {/* SECURITY */}
          <DocSection id="docs-security" title="Security" icon="fa-shield-halved">
            <DocSub id="docs-authentication" title="Authentication Methods">
              <p>
                Sign in with email/password, magic link, Google OAuth, or GitHub OAuth.
              </p>
            </DocSub>

            <DocSub id="docs-mfa" title="Multi-Factor Authentication">
              <p>
                Enable MFA in Settings under the General tab. Set up a TOTP authenticator app and store your
                recovery codes safely.
              </p>
            </DocSub>

            <DocSub id="docs-passkeys" title="Passkeys">
              <p>
                Register biometric authenticators (Touch ID, Face ID) or hardware security keys using WebAuthn.
                Manage passkeys in Settings.
              </p>
            </DocSub>

            <DocSub id="docs-sessions" title="Session Management">
              <p>
                View all active sessions in Settings with browser, OS, IP, and last activity. Revoke any session
                to sign it out remotely.
              </p>
            </DocSub>
          </DocSection>

          {/* SETTINGS */}
          <DocSection id="docs-settings-ref" title="Settings" icon="fa-gear">
            <DocSub id="docs-profile-settings" title="Profile">
              <p>
                Update your display name and avatar from the General tab in Settings.
              </p>
            </DocSub>

            <DocSub id="docs-dashboard-palette" title="Dashboard Palette">
              <p>
                Choose from preset palettes or pick your own accent color. This only affects your view of the dashboard.
              </p>
            </DocSub>

            <DocSub id="docs-data-export" title="Data Export">
              <p>
                Export all account data as JSON from the Advanced tab. Includes profile, forms, entries, clients,
                and settings.
              </p>
            </DocSub>

            <DocSub id="docs-delete-account" title="Deleting Your Account">
              <p>
                Delete your account from the Advanced tab under Danger Zone. This is permanent and cannot be undone.
              </p>
              <Callout type="warning">
                Account deletion is irreversible. Export your data first if you need to keep records.
              </Callout>
            </DocSub>
          </DocSection>

          <div className="h-8" />
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────
   Sub-components (dashboard-scoped)
   ────────────────────────────────────── */

function DocSection({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <i className={`fa-solid ${icon} text-primary text-xs`} />
        </div>
        <h2 className="text-xl font-black font-headline text-on-surface tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4 text-sm text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

function DocSub({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-6 pt-3">
      <h3 className="text-sm font-bold font-headline text-on-surface mb-2">{title}</h3>
      <div className="space-y-2 text-sm text-on-surface-variant leading-relaxed">{children}</div>
    </div>
  );
}

function Callout({ type, children }: { type: "tip" | "info" | "warning"; children: React.ReactNode }) {
  const styles = {
    tip: { icon: "fa-lightbulb", bg: "bg-[#0F9D58]/10", border: "border-[#0F9D58]/20", text: "text-[#0F9D58]" },
    info: { icon: "fa-circle-info", bg: "bg-[#4285F4]/10", border: "border-[#4285F4]/20", text: "text-[#4285F4]" },
    warning: { icon: "fa-triangle-exclamation", bg: "bg-[#F4B400]/10", border: "border-[#F4B400]/20", text: "text-[#F4B400]" },
  };
  const s = styles[type];
  return (
    <div className={`${s.bg} ${s.border} border rounded-lg p-3 flex gap-2.5 my-3`}>
      <i className={`fa-solid ${s.icon} ${s.text} mt-0.5 shrink-0 text-xs`} />
      <div className="text-xs text-on-surface leading-relaxed">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <div className="space-y-1.5 my-3">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <p className="text-xs text-on-surface leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FieldRef({ fields }: { fields: { name: string; desc: string }[] }) {
  return (
    <div className="space-y-1.5 my-3">
      {fields.map((f) => (
        <div key={f.name} className="p-2.5 rounded-lg bg-surface-container/50 border border-outline-variant/5">
          <span className="text-xs font-semibold text-on-surface">{f.name}</span>
          <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function PlanCard({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${highlight ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-outline-variant/10 bg-surface-container/30"}`}>
      <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest">{name}</h4>
      <p className="text-lg font-black text-on-surface mt-0.5">{price}</p>
      <div className="mt-3 space-y-1.5">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
            <i className="fa-solid fa-check text-primary text-[8px]" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
