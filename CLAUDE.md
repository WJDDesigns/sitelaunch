# linqme Developer Guidelines & Standards

Owner: Wayne (wayne@wjddesigns.com)
Stack: Next.js 16 App Router, Supabase, Tailwind CSS, TypeScript, Vercel
Supabase project: kdlquanvrvbcmfcdvxeb
Vercel team: team_Yur8v0zTARB4coIKW8v34n0Z, project: prj_ttPw9AsFOGK1e9fnW3PoIMqu2azd

---

## Hard Rules

- NEVER include "Co-Authored-By", AI/Claude/Anthropic mentions, or any AI attribution in commits, PRs, code comments, or anywhere on GitHub. Wayne is the sole author.
- NEVER use emdashes (—). Always use double hyphens (--).
- Always write "linqme" lowercase, never "LinqMe" (except in PascalCase component names).
- ALL human-readable data MUST use `formatFieldValue()` from `src/lib/format-field-value.ts`. This includes emails, PDFs, CSV exports, Google Sheets sync, entry detail pages, Smart Overview prompts, and anywhere a user or AI reads field data.
- Always type-check (`npx tsc --noEmit`) before committing.
- This document is a living reference. If you notice a pattern, convention, or lesson learned during development that isn't captured here, ask Wayne whether it should be added. Proactively suggest additions when something feels like it could trip up a future session.

---

## Project Structure

```
src/
  app/
    dashboard/           # Authenticated dashboard pages
      entries/           # Global entries list
      form/              # Form builder, per-form pages
        [formId]/
          entries/       # Per-form entries + Smart Overview
      settings/          # Settings tabs (General, Branding, Billing, Advanced, Changelog)
      integrations/      # Integration grid
      submissions/       # Submission detail + actions
      billing/           # Billing components
    api/                 # API route handlers
      integrations/      # OAuth connect/callback routes
      ai-integrations/   # AI provider CRUD
    [partnerSlug]/       # Public form pages
  lib/
    auth.ts              # Session, account resolution, partner hierarchy
    ai.ts                # getPartnerAI(), aiComplete()
    forms.ts             # FormSchema, FieldDef, all field type definitions
    format-field-value.ts # THE critical formatter -- use everywhere
    notifications.ts     # Email notifications, merge tags
    supabase/
      server.ts          # createClient() -- RLS-enforced server client
      client.ts          # createClient() -- RLS-enforced browser client
      admin.ts           # createAdminClient() -- service role, bypasses RLS
    sheets/
      sync.ts            # Fire-and-forget Sheets sync
      google-sheets.ts   # Google Sheets API helpers
    integrations/
      catalogue.ts       # Central registry of all integrations
  components/            # Shared UI components
  types/                 # Type definitions
  hooks/                 # React hooks
supabase/
  migrations/            # Sequential: 0001_initial.sql, 0002_..., etc.
```

---

## Authentication & Authorization

Every protected page follows this pattern:

```typescript
const session = await requireSession();          // Redirects to /login if not auth'd
const account = await getCurrentAccount(session.userId); // Resolves root partner
if (!account) return notFound();
```

Key functions in `src/lib/auth.ts`:
- `requireSession()` -- guard, redirects unauthenticated users
- `getCurrentAccount(userId)` -- resolves the ROOT partner by walking up parent_partner_id
- `getPartnerMemberContext(userId)` -- returns the directly assigned sub-partner (not root)
- `getVisiblePartners()` -- returns root + children for ALL users (including superadmins)
- `getAllPartnersAdmin()` -- superadmin-only: returns all partners in the system

Partner hierarchy: root partners have `parent_partner_id = null`. Sub-partners reference their parent. `getCurrentAccount` always walks to the root.

---

## Supabase Client Usage

| Client | When to Use | RLS |
|--------|-------------|-----|
| `createClient()` from `server.ts` | Server components, route handlers | Enforced |
| `createClient()` from `client.ts` | Browser/client components | Enforced |
| `createAdminClient()` from `admin.ts` | Server actions, API routes, background tasks | Bypassed |

Rule: Use admin client only when the code has already verified authorization (e.g., after `requireSession()` + account check). Never expose admin client to untrusted inputs without validation.

All queries MUST scope by `partner_id`:
```typescript
.eq("partner_id", account.id)
```

---

## Page Architecture

Pages are server components that fetch data, then pass it to client components:

```typescript
// page.tsx (server component)
export default async function MyPage({ params }: PageProps) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  const data = await fetchData(account.id);
  return <MyClientComponent data={data} />;
}

// MyClientComponent.tsx ("use client")
export default function MyClientComponent({ data }: Props) {
  // UI, state, interactions
}
```

---

## Server Actions

Colocated in `actions.ts` next to the components that call them:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireSession, getCurrentAccount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function myAction(id: string) {
  const session = await requireSession();
  const account = await getCurrentAccount(session.userId);
  if (!account) throw new Error("No account");

  const admin = createAdminClient();
  // ... do work ...

  revalidatePath("/dashboard/relevant-path");
}
```

Naming: `verbNounAction` (e.g., `updateSubmissionStatusAction`, `toggleSmartOverviewAction`, `generateSmartOverview`)

---

## Database Migrations

Location: `supabase/migrations/`
Naming: `NNNN_descriptive_name.sql` (sequential four-digit number)
Apply via Supabase MCP: `apply_migration(project_id, name, query)`

Always enable RLS and create policies:
```sql
alter table public.my_table enable row level security;

create policy "Partners manage own rows" on public.my_table
  for all using (partner_id in (
    select pm.partner_id from public.partner_members pm
    where pm.user_id = auth.uid()
  ));
```

---

## formatFieldValue() -- The Golden Rule

`src/lib/format-field-value.ts` converts raw JSONB submission data into human-readable strings.

MUST be used in every place a human (or AI) reads field data:
- Entry detail page rendering
- Email notification bodies (`{all_fields}` and `{field:id}` merge tags)
- PDF export
- CSV export
- Google Sheets sync rows
- Smart Overview AI prompts
- Resend email bodies

When adding a new field type:
1. Add the type to `FieldType` in `src/lib/forms.ts`
2. Add its FieldDef config interface
3. Add a case in `formatFieldValue()` to render it as readable text
4. Add renderer in `SubmissionForm.tsx` (client-facing form)
5. Add renderer in `FormPreview.tsx` (editor preview)
6. Add renderer in entry detail page
7. Verify it displays correctly in emails, PDFs, CSV, Sheets

---

## Integration System

Integrations are catalogued in `src/lib/integrations/catalogue.ts` with metadata (name, icon, category, connection type, provider key, table).

Current integration tables:
- `ai_integrations` -- OpenAI, Anthropic, Google AI (API key)
- `cloud_integrations` -- Google Drive, Dropbox, OneDrive, Box (OAuth)
- `payment_integrations` -- Stripe (OAuth)
- `captcha_integrations` -- reCAPTCHA, Turnstile (API key)
- `geocoding_integrations` -- Google Places, OpenStreetMap (API key)
- `sheets_feeds` + `sheets_connections` -- Google Sheets (OAuth)

When adding a new integration:
1. Add entry to `catalogue.ts` with all metadata
2. Create/update the DB table if needed (migration)
3. Add connect handler: OAuth (`/api/integrations/[provider]/connect`) or API key endpoint
4. Add to `IntegrationsGrid` connected lookup
5. Wire up wherever the integration is consumed
6. Ensure parent agency fallback if applicable (see `getPartnerAI` pattern)

AI provider fallback pattern (`src/lib/ai.ts`):
```typescript
export async function getPartnerAI(partnerId: string) {
  // Check partner's own integrations
  // If none found, check parent_partner_id recursively
  // Prefer: anthropic > openai > google_ai
}
```

---

## Notification & Email System

Flow: submission created → `notifyPartnerOfSubmission(submissionId)` in `src/lib/notifications.ts`

1. Load submission + schema + partner branding
2. Load `form_notifications` rows for this form
3. Evaluate conditions (ShowCondition) against submission data
4. Render email via merge tags:
   - `{all_fields}` -- HTML table of all fields (uses `formatFieldValue`)
   - `{client_name}`, `{client_email}`, `{partner_name}` -- escaped strings
   - `{submission_link}` -- dashboard URL to entry
   - `{field:fieldId}` -- specific field value (uses `formatFieldValue`)
5. Send via Resend to notification recipients
6. Create in-app notifications for partner members

Key rule: Never render raw JSON in emails. Always use `formatFieldValue()` with the field's `FieldDef` for proper formatting.

---

## Form System

Types in `src/lib/forms.ts`:
- `FormSchema` -- top-level: `{ steps: [{ title, description?, fields: FieldDef[] }] }`
- `FieldDef` -- per-field: `{ id, type, label, required?, placeholder?, icon?, hint?, ...configs }`
- `FieldType` -- union of 48+ field type strings

Complex field configs are inline on FieldDef:
- `packageConfig`, `budgetAllocatorConfig`, `timelineConfig`, `addressConfig`
- `ratingConfig`, `repeaterConfig`, `questionnaireConfig`, `matrixConfig`
- `socialHandlesConfig`, `nameConfig`, `guestRsvpConfig`, `donationTierConfig`

Submission data is stored as JSONB in `submissions.data`, keyed by field ID.

Conditional logic uses `ShowCondition`:
```typescript
interface ShowCondition {
  fieldId: string;
  operator: "equals" | "not_equals" | "contains" | "not_empty" | "is_empty" | ...;
  value?: string;
  combinator?: "and" | "or";
  action?: "show" | "hide";
}
```

---

## Feature Flags

Stored in `partners.settings` JSONB column:
- `smart_overview_enabled` (boolean)
- `smart_overview_for_partners` (boolean) -- agency allows sub-partners to use it

Pattern for adding a new feature flag:
1. Add to partner settings JSONB (no migration needed)
2. Read in server component: `const settings = (partner?.settings as Record<string, unknown>) ?? {}`
3. Create toggle in Settings UI (SmartOverviewSection pattern)
4. Create server action to update: merge into existing settings, `revalidatePath`

---

## Smart Overview / AI Features

Pattern: cache table + server action + collapsed client component

1. Cache in `smart_overview_cache` table (partner_id, partner_form_id, overview_html, entry_count, generated_at)
2. Server action `generateSmartOverview(formId)`:
   - Check settings (own partner + parent agency fallback)
   - Get AI via `getPartnerAI()` (with parent fallback)
   - Load submissions, format with `formatFieldValue()`
   - Call `aiComplete(ai, systemPrompt, userPrompt)`
   - Upsert cache
3. Client component starts collapsed as a button, expands when overview exists
4. System prompt instructions: plain sentences, no markdown, no emdashes (use --)

---

## Export Patterns

PDF export (`/dashboard/submissions/[id]/pdf/route.ts`):
- Route handler returning HTML with inline CSS
- Partner/agency branding cascade: partner → agency → defaults
- Uses `formatFieldValue()` for all field data
- Logo, primary/accent colors, brand banner

CSV export:
- Client-side generation in entries list components
- Escape formula injection: prefix `=+\-@` with single quote
- Quote fields containing commas, quotes, or newlines

Google Sheets sync (`src/lib/sheets/sync.ts`):
- Fire-and-forget after submission (non-blocking)
- Uses `formatFieldValue()` for cell values
- Each feed is independent (Promise.allSettled)
- sheet_name must match the actual tab name in the spreadsheet

---

## UI & Styling

Color system: Material Design 3 tokens via CSS variables + Tailwind:
- `text-on-surface` (primary text), `text-on-surface-variant` (secondary)
- `bg-surface-container` (card backgrounds), `bg-surface-container-highest` (elevated)
- `border-outline-variant` (subtle borders)
- `text-primary` (accents, interactive elements)
- `text-error` (errors), `text-tertiary` (success/complete)

Common patterns:
- Cards: `rounded-2xl border border-outline-variant/[0.08] bg-surface-container/50 shadow-xl shadow-black/10 p-6 md:p-8`
- Buttons: `rounded-lg` or `rounded-xl`
- Badges: `text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full`
- Icons: Font Awesome (`fa-solid fa-icon-name`)
- Fonts: `font-headline` (Plus Jakarta Sans), `font-body` (Inter)

---

## Checklist: Adding a New Field Type

1. [ ] Add type string to `FieldType` union in `src/lib/forms.ts`
2. [ ] Add config interface if complex (e.g., `MyFieldConfig`)
3. [ ] Add config property to `FieldDef` interface
4. [ ] Add case in `formatFieldValue()` for human-readable output
5. [ ] Add editor settings panel in `FormEditor.tsx`
6. [ ] Add field catalogue entry in `FormEditor.tsx` (category, icon, label)
7. [ ] Add client renderer in `SubmissionForm.tsx`
8. [ ] Add preview renderer in `FormPreview.tsx`
9. [ ] Add entry detail renderer (if structured data)
10. [ ] Verify output in: email, PDF, CSV, Sheets, Smart Overview

## Checklist: Adding a New Integration

1. [ ] Add entry to `src/lib/integrations/catalogue.ts`
2. [ ] Create DB table or add to existing (migration with RLS)
3. [ ] Create API route for connect (OAuth or API key)
4. [ ] Wire into `IntegrationsGrid` connected lookup
5. [ ] Add consumption code where the integration is used
6. [ ] Add parent agency fallback if applicable
7. [ ] Test connect/disconnect flow
8. [ ] Update IntegrationsGrid categories if new category needed

## Checklist: Adding a New Settings Section

1. [ ] Create client component (e.g., `MySection.tsx`) in `src/app/dashboard/settings/`
2. [ ] Add server action in `settings/actions.ts`
3. [ ] Add data fetching in `settings/page.tsx` (parallel with existing queries)
4. [ ] Add component to appropriate tab content (generalContent, brandingContent, etc.)
5. [ ] Store config in `partners.settings` JSONB or dedicated table
6. [ ] Use optimistic state in the client component for instant feedback
