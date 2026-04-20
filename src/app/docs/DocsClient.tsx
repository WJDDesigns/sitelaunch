"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import LinqMeLogo from "@/components/LinqMeLogo";
import ThemeToggle from "@/components/ThemeToggle";

/* ──────────────────────────────────────
   Table of Contents data
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
    id: "settings",
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
   Main Docs Client Component
   ────────────────────────────────────── */
export default function DocsClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("getting-started");
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Flatten all IDs for intersection observer
  const allIds = TOC.flatMap((s) => [s.id, ...(s.children?.map((c) => c.id) ?? [])]);

  // Intersection observer for active section tracking
  useEffect(() => {
    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const id of allIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    observerRef.current = observer;
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setMobileTocOpen(false);
    }
  }, []);

  // Filter TOC by search
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
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-8 py-4 bg-background/70 backdrop-blur-2xl border-b border-on-surface/[0.04]">
        <Link href="/" className="flex items-center gap-2.5">
          <LinqMeLogo variant="auto" className="h-7 w-auto text-primary" />
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/#features">Features</Link>
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/#how-it-works">How It Works</Link>
          <Link className="text-sm text-on-surface-variant hover:text-on-surface transition-colors duration-300" href="/pricing">Pricing</Link>
          <Link className="text-sm text-primary font-semibold transition-colors duration-300" href="/docs">Docs</Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle showAuto={false} />
          <div className="h-5 w-px bg-on-surface/10 hidden sm:block" />
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] active:scale-[0.97] transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex text-sm text-on-surface-variant hover:text-on-surface transition-colors">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 bg-primary text-on-primary font-semibold rounded-xl text-sm hover:shadow-[0_0_24px_rgba(var(--color-primary),0.4)] active:scale-[0.97] transition-all duration-300"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="flex pt-[73px]">
        {/* ── Sidebar TOC (desktop) ── */}
        <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto border-r border-on-surface/[0.06] bg-background/50 backdrop-blur-xl">
          <div className="p-5">
            <div className="relative mb-4">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-xs" />
              <input
                type="text"
                placeholder="Search docs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/10 focus:border-primary/30 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            </div>

            <nav className="space-y-1">
              {filteredToc.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => scrollTo(section.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      activeId === section.id
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-on-surface/[0.04] hover:text-on-surface"
                    }`}
                  >
                    <i className={`fa-solid ${section.icon} w-4 text-center text-xs`} />
                    {section.title}
                  </button>
                  {section.children && (
                    <div className="ml-6 pl-3 border-l border-outline-variant/10 space-y-0.5 mt-0.5 mb-2">
                      {section.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => scrollTo(child.id)}
                          className={`w-full text-left block px-3 py-1.5 rounded-md text-xs transition-all duration-200 ${
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
          className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/25 flex items-center justify-center"
        >
          <i className={`fa-solid ${mobileTocOpen ? "fa-xmark" : "fa-bars"} text-lg`} />
        </button>

        {/* ── Mobile TOC drawer ── */}
        {mobileTocOpen && (
          <>
            <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileTocOpen(false)} />
            <aside className="lg:hidden fixed right-0 top-[73px] bottom-0 z-40 w-80 max-w-[85vw] overflow-y-auto bg-background border-l border-on-surface/[0.06] shadow-2xl">
              <div className="p-5">
                <div className="relative mb-4">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-xs" />
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container text-sm text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/10 focus:border-primary/30 outline-none transition-all"
                  />
                </div>
                <nav className="space-y-1">
                  {filteredToc.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => scrollTo(section.id)}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                          activeId === section.id ? "bg-primary/10 text-primary" : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        <i className={`fa-solid ${section.icon} w-4 text-center text-xs`} />
                        {section.title}
                      </button>
                      {section.children && (
                        <div className="ml-6 pl-3 border-l border-outline-variant/10 space-y-0.5 mt-0.5 mb-2">
                          {section.children.map((child) => (
                            <button
                              key={child.id}
                              onClick={() => scrollTo(child.id)}
                              className={`w-full text-left block px-3 py-1.5 rounded-md text-xs transition-all ${
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
        <main className="flex-1 min-w-0 px-6 md:px-12 lg:px-16 py-12 max-w-4xl">
          {/* Hero */}
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
              <i className="fa-solid fa-book text-[10px]" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-black font-headline text-on-surface mb-4 tracking-tight">
              linqme Docs
            </h1>
            <p className="text-lg text-on-surface-variant/70 max-w-2xl leading-relaxed">
              Everything you need to know about building forms, managing clients, and growing your agency with linqme.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════
              GETTING STARTED
             ═══════════════════════════════════════════════ */}
          <DocSection id="getting-started" title="Getting Started" icon="fa-rocket">
            <p>
              linqme is a form-building and client onboarding platform designed for agencies. Create beautiful multi-step forms,
              collect client information, manage submissions, and white-label the entire experience under your brand.
            </p>

            <DocSub id="creating-account" title="Creating Your Account">
              <p>
                Head to the signup page and create your account using email and password, or sign in with Google or GitHub.
                Once signed up, linqme automatically creates a workspace for you with your name and a unique subdomain.
              </p>
              <Callout type="tip">
                Your subdomain determines your public storefront URL. You can change it later in Settings under Branding.
              </Callout>
              <p>
                After signup, you will land on the dashboard where you can start building your first form right away.
              </p>
            </DocSub>

            <DocSub id="dashboard-overview" title="Dashboard Overview">
              <p>
                The dashboard is your command center. The left sidebar gives you quick access to every section:
              </p>
              <FeatureList items={[
                { icon: "fa-table-cells", label: "Dashboard", desc: "Overview of your workspace activity and quick stats." },
                { icon: "fa-pen-ruler", label: "Forms", desc: "Create and manage all your forms." },
                { icon: "fa-inbox", label: "Entries", desc: "View all submissions from your clients." },
                { icon: "fa-users", label: "Accounts", desc: "Manage your client contacts and companies." },
                { icon: "fa-lightbulb", label: "Insights", desc: "Build custom dashboards with widgets." },
                { icon: "fa-chart-pie", label: "Analytics", desc: "Track form views, completions, and trends." },
                { icon: "fa-credit-card", label: "Billing", desc: "Manage your plan, subscription, and invoices." },
                { icon: "fa-gear", label: "Settings", desc: "Profile, branding, integrations, and security." },
              ]} />
              <p>
                The sidebar also shows your current usage (submissions this month) and allows you to collapse it for more screen space.
                On mobile, navigation moves to a bottom tab bar with a slide-out drawer for the full menu.
              </p>
            </DocSub>

            <DocSub id="your-first-form" title="Your First Form">
              <p>
                To create your first form, go to Forms and click the "New Form" button. Give it a name, an optional description,
                and start adding fields. Each form can have one or more steps, and each step holds any number of fields.
              </p>
              <Steps items={[
                "Navigate to Forms in the sidebar.",
                "Click \"New Form\" to create a blank form.",
                "Give your form a name and slug (the slug is used in the URL).",
                "Add a step, then add fields to that step.",
                "Configure each field with a label, type, and settings.",
                "Toggle the form to Active when you are ready to share it.",
                "Copy the public URL and send it to your client.",
              ]} />
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              FORMS
             ═══════════════════════════════════════════════ */}
          <DocSection id="forms" title="Forms" icon="fa-pen-ruler">
            <p>
              Forms are the core of linqme. Each form is a multi-step questionnaire that your clients fill out through a
              branded, hosted page. You can build anything from simple contact forms to complex onboarding workflows.
            </p>

            <DocSub id="creating-forms" title="Creating a Form">
              <p>
                From the Forms page, click "New Form." You will see a form editor with a sidebar for steps and fields,
                and a live preview area. Forms start with one step by default.
              </p>
              <Callout type="info">
                On the Free plan you can create up to 1 form. Starter and Agency plans allow unlimited forms.
              </Callout>
              <p>
                Each form has a name (displayed to your clients), a slug (used in the URL), and an optional description.
                You can also set a confirmation message that appears after submission, or redirect clients to an external URL.
              </p>
            </DocSub>

            <DocSub id="field-types" title="Field Types">
              <p>
                linqme supports over 25 field types, from simple text inputs to advanced components like budget allocators
                and competitor analyzers. See the <button onClick={() => scrollTo("field-reference")} className="text-primary hover:underline font-medium">Field Reference</button> section
                for a complete breakdown of every available field type.
              </p>
            </DocSub>

            <DocSub id="multi-step-forms" title="Multi-Step Forms">
              <p>
                Break long forms into manageable steps. Each step has its own title and description, and clients see a
                progress indicator as they move through. Use the form editor sidebar to add, reorder, or remove steps.
              </p>
              <p>
                Steps can be made conditional so they only appear when certain criteria are met. For example, you might
                show a "Brand Guidelines" step only if the client selected "Branding" in a previous step.
              </p>
            </DocSub>

            <DocSub id="conditional-logic" title="Conditional Logic">
              <p>
                Any field or step can be shown or hidden based on the value of another field. This is configured through
                the Logic tab in the form editor. Conditions support operators like equals, not equals, contains,
                is empty, and is not empty.
              </p>
              <Callout type="tip">
                Use the visual flow canvas in the Logic tab to see how your conditions connect fields together. Drag
                connections between fields to build complex logic trees.
              </Callout>
              <p>
                When a step has all its visible fields hidden by conditions, the step is automatically skipped during
                the form flow so clients never see an empty page.
              </p>
            </DocSub>

            <DocSub id="form-settings" title="Form Settings">
              <p>
                Each form has additional settings accessible through the Settings panel in the form editor:
              </p>
              <FeatureList items={[
                { icon: "fa-toggle-on", label: "Active / Inactive", desc: "Toggle whether the form accepts new submissions." },
                { icon: "fa-star", label: "Default Form", desc: "Set one form as the default that appears on your storefront." },
                { icon: "fa-heading", label: "Confirmation Page", desc: "Custom heading and body text shown after submission." },
                { icon: "fa-arrow-up-right-from-square", label: "Redirect URL", desc: "Send clients to an external URL after submission." },
                { icon: "fa-bell", label: "Notifications", desc: "Configure who gets email notifications for new submissions." },
              ]} />
            </DocSub>

            <DocSub id="layout-styles" title="Layout Styles">
              <p>
                linqme offers four different layout styles for how your form appears to clients:
              </p>
              <FeatureList items={[
                { icon: "fa-sidebar", label: "Sidebar (default)", desc: "Traditional layout with step navigation on the left side." },
                { icon: "fa-window-maximize", label: "Top Navigation", desc: "Step tabs across the top of the page for a modern feel." },
                { icon: "fa-expand", label: "No Navigation", desc: "Full-screen single-step layout. Navigation buttons only, no step list." },
                { icon: "fa-comments", label: "Conversation", desc: "One question at a time, typeform-style. Great for shorter forms." },
              ]} />
              <p>
                You can change the layout style per form from the form settings panel. The layout can be previewed in the editor.
              </p>
            </DocSub>

            <DocSub id="form-templates" title="Templates and Duplication">
              <p>
                Save time by duplicating an existing form. From the Forms list, use the menu on any form card to create
                a copy. The duplicate will have all the same steps, fields, and settings but a new slug.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              FIELD REFERENCE
             ═══════════════════════════════════════════════ */}
          <DocSection id="field-reference" title="Field Reference" icon="fa-list-check">
            <p>
              Below is a complete reference of every field type available in the form builder, organized by category.
              Each field can be configured with a label, placeholder, help text, icon, required toggle, and conditional visibility.
            </p>

            <DocSub id="basic-fields" title="Basic Fields">
              <FieldRef fields={[
                { name: "Text", desc: "Single-line text input. Good for names, titles, short answers." },
                { name: "Textarea", desc: "Multi-line text area with configurable rows. Use for descriptions, bios, long answers." },
                { name: "Email", desc: "Email input with built-in validation." },
                { name: "Phone", desc: "Phone number input." },
                { name: "URL", desc: "URL input with validation." },
                { name: "Number", desc: "Numeric input. Accepts whole numbers and decimals." },
                { name: "Date", desc: "Date picker with calendar popup. Respects light/dark theme." },
                { name: "Color", desc: "Color picker that saves hex values. Useful for brand color collection." },
                { name: "Address", desc: "Full address field." },
              ]} />
            </DocSub>

            <DocSub id="selection-fields" title="Selection Fields">
              <FieldRef fields={[
                { name: "Select (Dropdown)", desc: "Single-choice dropdown menu. Configure options in the field settings." },
                { name: "Radio", desc: "Single-choice radio buttons displayed as a visual list." },
                { name: "Checkbox", desc: "Multiple-choice checkboxes. You can set a maximum selection limit." },
                { name: "Package Selector", desc: "Pricing/service tier picker with a built-in rules engine for complex pricing logic." },
                { name: "Feature Selector", desc: "Feature checkboxes with complexity indicators and optional pricing display." },
                { name: "Brand Style", desc: "Visual style palette selector showing color mood boards and typography samples." },
                { name: "Goal Builder", desc: "Goal picker with refinement questions to help define project objectives." },
              ]} />
            </DocSub>

            <DocSub id="file-fields" title="File Upload Fields">
              <FieldRef fields={[
                { name: "File", desc: "Single file upload. Files are stored securely and can be routed to connected cloud storage." },
                { name: "Files (Multiple)", desc: "Multiple file upload with drag-and-drop support." },
                { name: "Asset Collection", desc: "Advanced multi-file asset picker with tagging, categorization, and cloud storage routing to Google Drive, Dropbox, OneDrive, or Box." },
              ]} />
              <Callout type="info">
                File upload destinations can be configured per field. Connect your cloud storage in Settings to route
                uploaded files directly to your Google Drive, Dropbox, OneDrive, or Box.
              </Callout>
            </DocSub>

            <DocSub id="advanced-fields" title="Advanced Fields">
              <FieldRef fields={[
                { name: "Repeater", desc: "Nested rows that clients can add and remove. Define sub-fields like a mini-form within a form. Supports icons per row." },
                { name: "Consent", desc: "Scrollable agreement text with a checkbox. Use for terms of service, NDAs, or project agreements." },
                { name: "Site Structure", desc: "Interactive sitemap/page builder with drag-and-drop tree editing. Clients can define their website structure." },
                { name: "Competitor Analyzer", desc: "Enter competitor URLs and get AI-generated competitive analysis summaries. Requires an AI integration." },
                { name: "Timeline", desc: "Milestone date picker with availability blocker for scheduling project timelines." },
                { name: "Budget Allocator", desc: "Multi-channel budget slider. Choose between constrained mode (must total 100%) or independent mode." },
                { name: "Payment", desc: "Collect payments directly in the form via Stripe, PayPal, or Square. Requires a payment integration." },
                { name: "Captcha", desc: "Bot protection using reCAPTCHA v3 or Cloudflare Turnstile. Can be visible or invisible." },
                { name: "Approval", desc: "Sign-off field with a canvas-based draw-to-sign signature pad." },
              ]} />
            </DocSub>

            <DocSub id="display-fields" title="Display Fields">
              <FieldRef fields={[
                { name: "Heading", desc: "Display-only section header with rich content. Use to add context, instructions, or visual breaks between fields. Not an input field." },
              ]} />
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              ENTRIES
             ═══════════════════════════════════════════════ */}
          <DocSection id="entries" title="Entries and Submissions" icon="fa-inbox">
            <p>
              Every time a client fills out one of your forms, it creates an entry. Entries are stored securely and
              accessible from the Entries section of your dashboard.
            </p>

            <DocSub id="viewing-entries" title="Viewing Entries">
              <p>
                The Entries page shows all submissions across your forms. You can filter by form, search by client name
                or email, and click into any entry to see the full submitted data including file attachments.
              </p>
              <p>
                Each entry detail view shows all field values organized by step, with download links for uploaded files
                and the client's contact information.
              </p>
            </DocSub>

            <DocSub id="entry-statuses" title="Entry Statuses">
              <p>
                Entries have three possible statuses:
              </p>
              <FeatureList items={[
                { icon: "fa-pen", label: "Draft", desc: "The client has started but not yet submitted the form." },
                { icon: "fa-check", label: "Submitted", desc: "The client has completed and submitted all required fields." },
                { icon: "fa-thumbs-up", label: "Approved", desc: "You have reviewed and approved the submission." },
              ]} />
            </DocSub>

            <DocSub id="exporting-data" title="Exporting Data">
              <p>
                Export your entry data in two formats:
              </p>
              <FeatureList items={[
                { icon: "fa-file-csv", label: "CSV Export", desc: "Bulk export all entries (or filtered entries) to a CSV spreadsheet." },
                { icon: "fa-file-pdf", label: "PDF Export", desc: "Generate a formatted PDF of any individual submission for sharing or archiving." },
              ]} />
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              CLIENT ACCOUNTS
             ═══════════════════════════════════════════════ */}
          <DocSection id="accounts" title="Client Accounts" icon="fa-users">
            <p>
              The Accounts section helps you organize and track your clients. Each account stores contact information
              and is linked to their form submissions.
            </p>

            <DocSub id="managing-clients" title="Managing Clients">
              <p>
                Add clients manually or let them be created automatically when they submit a form. Each account includes
                a name, email, phone, company name, and status (active, inactive, or pending).
              </p>
              <p>
                Click into any account to see their profile details, submission history, and any notes you have added.
              </p>
            </DocSub>

            <DocSub id="client-tags" title="Tags and Organization">
              <p>
                Use tags to categorize your clients. Tags make it easy to filter and search across your accounts. Common
                tag patterns include project type, industry, priority level, or referral source.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              BRANDING
             ═══════════════════════════════════════════════ */}
          <DocSection id="branding" title="Branding and White-Label" icon="fa-palette">
            <p>
              Make linqme look like your own platform. Customize colors, logos, domains, and more so your clients see
              your brand, not ours.
            </p>

            <DocSub id="workspace-branding" title="Workspace Branding">
              <p>
                In Settings, go to the Branding tab to configure your workspace appearance:
              </p>
              <FeatureList items={[
                { icon: "fa-image", label: "Logo", desc: "Upload your logo for the sidebar, storefront, and form pages. Supports light and dark variants." },
                { icon: "fa-droplet", label: "Primary Color", desc: "Your brand's main color. Used for buttons, links, progress bars, and accents across all pages." },
                { icon: "fa-wand-magic-sparkles", label: "Secondary Color", desc: "Used for gradients and secondary accents." },
                { icon: "fa-font", label: "Workspace Name", desc: "Your company or agency name displayed in the sidebar and storefront." },
              ]} />
            </DocSub>

            <DocSub id="custom-domains" title="Custom Domains">
              <p>
                Connect your own domain (like forms.youragency.com) so clients see your URL instead of a linqme subdomain.
                Go to Settings, then the Branding tab, and follow the DNS setup instructions.
              </p>
              <Steps items={[
                "Go to Settings and click the Branding tab.",
                "Under Custom Domain, enter your desired domain.",
                "Add the CNAME record shown to your DNS provider.",
                "Wait for DNS propagation (usually a few minutes to a few hours).",
                "linqme will verify and activate your domain automatically.",
              ]} />
              <Callout type="info">
                Custom domains are available on the Starter plan and above.
              </Callout>
            </DocSub>

            <DocSub id="storefront" title="Your Storefront">
              <p>
                Your storefront is the public-facing page where clients can see and start your forms. It is accessible at
                your subdomain (yourslug.linqme.app) or your custom domain. The storefront displays your logo, brand colors,
                and either all your active forms or a single primary form, depending on your Landing Mode setting.
              </p>
            </DocSub>

            <DocSub id="white-label" title="White-Label Settings">
              <p>
                On Starter and Agency plans, you can fully white-label the experience:
              </p>
              <FeatureList items={[
                { icon: "fa-eye-slash", label: "Hide linqme Branding", desc: "Remove all linqme logos and \"Powered by\" text from your forms and storefront." },
                { icon: "fa-paragraph", label: "Custom Footer", desc: "Add your own footer text to the storefront." },
                { icon: "fa-icons", label: "Custom Favicon", desc: "Upload your own favicon for the browser tab." },
              ]} />
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              INTEGRATIONS
             ═══════════════════════════════════════════════ */}
          <DocSection id="integrations" title="Integrations" icon="fa-plug">
            <p>
              Connect linqme to your favorite tools. All integrations are managed from Settings under the Integrations tab.
            </p>

            <DocSub id="cloud-storage" title="Cloud Storage">
              <p>
                Connect cloud storage providers to automatically route file uploads from your forms to the right place.
              </p>
              <FeatureList items={[
                { icon: "fa-google-drive", label: "Google Drive", desc: "Authenticate with Google and select a destination folder." },
                { icon: "fa-dropbox", label: "Dropbox", desc: "Connect your Dropbox account for file routing." },
                { icon: "fa-cloud", label: "OneDrive", desc: "Connect Microsoft OneDrive." },
                { icon: "fa-box", label: "Box", desc: "Connect Box.com for enterprise file management." },
              ]} />
              <p>
                Once connected, you can set a cloud storage destination on any file upload field in the form builder.
                When a client uploads a file, it will be automatically sent to your chosen provider and folder.
              </p>
            </DocSub>

            <DocSub id="payment-providers" title="Payment Providers">
              <p>
                Collect payments directly within your forms by connecting a payment provider:
              </p>
              <FeatureList items={[
                { icon: "fa-stripe-s", label: "Stripe", desc: "Connect your Stripe account to accept credit card payments." },
                { icon: "fa-paypal", label: "PayPal", desc: "Connect PayPal via OAuth for PayPal checkout." },
                { icon: "fa-square", label: "Square", desc: "Connect Square for in-form payment processing." },
              ]} />
              <Callout type="info">
                You must have an active account with the payment provider before connecting. linqme does not handle funds
                directly. All payments go straight to your connected account.
              </Callout>
            </DocSub>

            <DocSub id="ai-integrations" title="AI Services">
              <p>
                Some advanced field types like the Competitor Analyzer use AI to generate content. Connect an AI provider
                to unlock these features:
              </p>
              <FeatureList items={[
                { icon: "fa-robot", label: "OpenAI", desc: "Connect with your OpenAI API key for GPT-powered analysis." },
                { icon: "fa-brain", label: "Anthropic", desc: "Connect with your Anthropic API key for Claude-powered features." },
              ]} />
              <p>
                Go to Settings, then the Integrations tab, and add your API key under AI Integrations. You can select which
                model to use from the available options.
              </p>
            </DocSub>

            <DocSub id="captcha" title="Bot Protection (CAPTCHA)">
              <p>
                Protect your forms from spam and automated submissions with CAPTCHA:
              </p>
              <FeatureList items={[
                { icon: "fa-shield", label: "reCAPTCHA v3", desc: "Google's invisible bot detection. Runs in the background with no user interaction required." },
                { icon: "fa-cloud-bolt", label: "Cloudflare Turnstile", desc: "Privacy-friendly CAPTCHA alternative. Can be visible or invisible." },
              ]} />
              <p>
                Add your site key in Settings under Integrations, then add a Captcha field to any form.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              ANALYTICS & INSIGHTS
             ═══════════════════════════════════════════════ */}
          <DocSection id="analytics-insights" title="Analytics and Insights" icon="fa-chart-pie">
            <DocSub id="analytics-dashboard" title="Analytics Dashboard">
              <p>
                The Analytics page gives you a real-time overview of how your forms are performing. Track page views,
                form submissions, completion rates, and drop-off points over time with interactive charts.
              </p>
              <p>
                Analytics are tracked automatically for all your active forms. You can filter by date range and form
                to drill into specific performance data.
              </p>
            </DocSub>

            <DocSub id="custom-insights" title="Custom Insights">
              <p>
                The Insights page lets you build custom dashboards with widgets. Each widget can display a specific metric
                or visualization, like most common field values, submission trends, or completion rates.
              </p>
              <p>
                Create multiple insight dashboards for different purposes. linqme can also auto-generate an insights
                dashboard based on your form's field types and data.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              TEAM
             ═══════════════════════════════════════════════ */}
          <DocSection id="team" title="Team Management" icon="fa-user-group">
            <DocSub id="inviting-members" title="Inviting Members">
              <p>
                Invite team members to collaborate on your workspace. Go to the Team page and enter their email address
                to send an invitation. They will receive an email with a link to join your workspace.
              </p>
              <p>
                Pending invitations show their status and expiration date. You can resend or revoke any invitation before
                it is accepted.
              </p>
            </DocSub>

            <DocSub id="roles-permissions" title="Roles and Permissions">
              <p>
                linqme supports three team roles:
              </p>
              <FeatureList items={[
                { icon: "fa-crown", label: "Owner", desc: "Full access to everything including billing, team management, and account deletion." },
                { icon: "fa-pen", label: "Editor", desc: "Can create and edit forms, view entries, and manage clients." },
                { icon: "fa-eye", label: "Viewer", desc: "Read-only access to forms, entries, and analytics." },
              ]} />
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              PARTNERS
             ═══════════════════════════════════════════════ */}
          <DocSection id="partners" title="Partner Management" icon="fa-handshake">
            <p>
              For agencies managing multiple brands or sub-accounts, the Partners feature lets you create separate
              workspaces under your main account. Each partner has its own branding, forms, and team members.
            </p>
            <Callout type="info">
              Partners are available on paid plans (Starter and Agency).
            </Callout>

            <DocSub id="creating-partners" title="Creating Partners">
              <p>
                Navigate to Partners in the sidebar and click "New Partner." Give the partner a name and slug. Once
                created, you can assign forms, invite team members, and configure branding for that specific partner.
              </p>
            </DocSub>

            <DocSub id="partner-branding" title="Partner Branding">
              <p>
                Each partner can have its own logo, primary color, and custom domain. This means every client-facing
                page for that partner shows their unique brand identity.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              BILLING
             ═══════════════════════════════════════════════ */}
          <DocSection id="billing" title="Billing and Plans" icon="fa-credit-card">
            <DocSub id="plans" title="Plans and Pricing">
              <p>
                linqme offers three plans to fit your needs:
              </p>
              <div className="grid gap-4 sm:grid-cols-3 my-6">
                <PlanCard name="Free" price="$0" features={["1 submission/month", "1 form", "1 GB storage", "linqme branding"]} />
                <PlanCard name="Starter" price="$99/mo" features={["25 submissions/month", "Unlimited forms", "50 GB storage", "White-label", "Custom domain"]} highlight />
                <PlanCard name="Agency" price="$249/mo" features={["Unlimited submissions", "Unlimited forms", "500 GB storage", "Priority support", "All features"]} />
              </div>
              <p>
                You can upgrade, downgrade, or cancel your plan at any time from the Billing page. Changes take effect
                at the start of your next billing cycle.
              </p>
            </DocSub>

            <DocSub id="managing-subscription" title="Managing Your Subscription">
              <p>
                The Billing page shows your current plan, usage stats, and billing date. Use the "Manage Subscription"
                button to open the Stripe customer portal where you can update your payment method, switch plans, or cancel.
              </p>
            </DocSub>

            <DocSub id="invoices" title="Invoices">
              <p>
                All your invoices are listed in a searchable, filterable table on the Billing page. Each invoice shows
                the date, amount, billing period, and status. You can view the invoice details or download a PDF
                for your records.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              SECURITY
             ═══════════════════════════════════════════════ */}
          <DocSection id="security" title="Security" icon="fa-shield-halved">
            <p>
              linqme takes security seriously. Your data is stored on Supabase with row-level security policies,
              and all communication happens over HTTPS.
            </p>

            <DocSub id="authentication" title="Authentication Methods">
              <p>
                linqme supports multiple ways to sign in:
              </p>
              <FeatureList items={[
                { icon: "fa-envelope", label: "Email and Password", desc: "Traditional email/password authentication." },
                { icon: "fa-wand-magic-sparkles", label: "Magic Link", desc: "Passwordless login via a secure email link." },
                { icon: "fa-google", label: "Google OAuth", desc: "Sign in with your Google account." },
                { icon: "fa-github", label: "GitHub OAuth", desc: "Sign in with your GitHub account." },
              ]} />
            </DocSub>

            <DocSub id="mfa" title="Multi-Factor Authentication">
              <p>
                Add an extra layer of security with MFA. Go to Settings, then the General tab, and look for MFA Settings.
                You can set up a TOTP authenticator app (like Google Authenticator or Authy) that generates a code each
                time you log in.
              </p>
              <p>
                When you enable MFA, you will also receive recovery codes. Store these somewhere safe in case you lose
                access to your authenticator app.
              </p>
            </DocSub>

            <DocSub id="passkeys" title="Passkeys">
              <p>
                Passkeys offer the most secure and convenient sign-in experience. Using WebAuthn, you can register
                a biometric authenticator (like Touch ID or Face ID) or a hardware security key.
              </p>
              <p>
                Manage your passkeys in Settings under the General tab. You can register multiple passkeys and remove
                ones you no longer use.
              </p>
            </DocSub>

            <DocSub id="sessions" title="Session Management">
              <p>
                View all your active sessions in Settings under the General tab. Each session shows the browser, operating
                system, IP address, and last activity time. You can revoke any session to sign it out remotely,
                which is useful if you suspect unauthorized access.
              </p>
            </DocSub>
          </DocSection>

          {/* ═══════════════════════════════════════════════
              SETTINGS
             ═══════════════════════════════════════════════ */}
          <DocSection id="settings" title="Settings" icon="fa-gear">
            <DocSub id="profile-settings" title="Profile">
              <p>
                Update your display name and avatar from the General tab in Settings. Your email address is shown
                for reference but is managed through your authentication provider.
              </p>
            </DocSub>

            <DocSub id="dashboard-palette" title="Dashboard Palette">
              <p>
                Personalize the look of your dashboard with a custom color palette. Choose from several preset palettes
                or pick your own accent color. This only affects your view of the dashboard, not your clients' experience.
              </p>
            </DocSub>

            <DocSub id="data-export" title="Data Export">
              <p>
                Export all your account data as a JSON file from the Advanced tab in Settings. This includes your profile,
                forms, entries, clients, and settings. Useful for backup or GDPR compliance purposes.
              </p>
            </DocSub>

            <DocSub id="delete-account" title="Deleting Your Account">
              <p>
                If you need to delete your account, you can do so from the Advanced tab in Settings under the Danger Zone.
                This action is permanent and cannot be undone. All your data, forms, entries, and integrations will
                be removed.
              </p>
              <Callout type="warning">
                Account deletion is irreversible. Make sure to export your data first if you need to keep any records.
              </Callout>
            </DocSub>
          </DocSection>

          {/* Footer spacer */}
          <div className="h-24" />

          {/* Back to top */}
          <div className="text-center pb-12">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="inline-flex items-center gap-2 text-sm text-on-surface-variant/50 hover:text-primary transition-colors"
            >
              <i className="fa-solid fa-arrow-up text-xs" />
              Back to top
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Sub-components
   ────────────────────────────────────── */

function DocSection({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-24">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <i className={`fa-solid ${icon} text-primary`} />
        </div>
        <h2 className="text-2xl md:text-3xl font-black font-headline text-on-surface tracking-tight">{title}</h2>
      </div>
      <div className="space-y-6 text-on-surface-variant leading-relaxed">{children}</div>
    </section>
  );
}

function DocSub({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-24 pt-4">
      <h3 className="text-lg font-bold font-headline text-on-surface mb-3">{title}</h3>
      <div className="space-y-3 text-on-surface-variant leading-relaxed">{children}</div>
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
    <div className={`${s.bg} ${s.border} border rounded-xl p-4 flex gap-3 my-4`}>
      <i className={`fa-solid ${s.icon} ${s.text} mt-0.5 shrink-0`} />
      <div className="text-sm text-on-surface leading-relaxed">{children}</div>
    </div>
  );
}

function FeatureList({ items }: { items: { icon: string; label: string; desc: string }[] }) {
  return (
    <div className="space-y-3 my-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl bg-surface-container/50 border border-outline-variant/5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <i className={`fa-solid ${item.icon} text-primary text-xs`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-on-surface">{item.label}</span>
            <p className="text-xs text-on-surface-variant/70 mt-0.5">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <div className="space-y-2 my-4">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
            {i + 1}
          </span>
          <p className="text-sm text-on-surface leading-relaxed">{item}</p>
        </div>
      ))}
    </div>
  );
}

function FieldRef({ fields }: { fields: { name: string; desc: string }[] }) {
  return (
    <div className="space-y-2 my-4">
      {fields.map((f) => (
        <div key={f.name} className="p-3 rounded-xl bg-surface-container/50 border border-outline-variant/5">
          <span className="text-sm font-semibold text-on-surface">{f.name}</span>
          <p className="text-xs text-on-surface-variant/70 mt-1">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function PlanCard({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 border ${highlight ? "border-primary/30 bg-primary/5 shadow-lg shadow-primary/10" : "border-outline-variant/10 bg-surface-container/30"}`}>
      <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">{name}</h4>
      <p className="text-2xl font-black text-on-surface mt-1">{price}</p>
      <div className="mt-4 space-y-2">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-2 text-xs text-on-surface-variant">
            <i className="fa-solid fa-check text-primary text-[10px]" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
