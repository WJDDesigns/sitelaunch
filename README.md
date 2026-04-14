# SiteLaunch

Multi-tenant client onboarding platform. Next.js 15 + Supabase + PWA.

This is Phase 0 — the skeleton. Auth works, subdomain routing works, schema is in place. No form engine or dashboards yet.

## What's in here

```
sitelaunch/
├── middleware.ts                      Subdomain detection + auth refresh
├── src/
│   ├── app/
│   │   ├── page.tsx                   Marketing landing (root domain)
│   │   ├── login/page.tsx             Magic-link sign-in
│   │   ├── auth/callback/route.ts     Supabase session exchange
│   │   ├── auth/signout/route.ts      Sign out
│   │   ├── dashboard/page.tsx         Authenticated dashboard (app.*)
│   │   └── s/[subdomain]/page.tsx     Partner-branded onboarding (*.* / custom domains)
│   └── lib/
│       ├── supabase/{client,server,middleware}.ts
│       ├── tenant.ts                  Host → tenant context resolver
│       └── utils/cn.ts
└── supabase/
    └── migrations/0001_init.sql       Full schema + RLS
```

## First-time local setup

### 1. Clone and install

```bash
git clone git@github.com:WJDDesigns/sitelaunch.git
cd sitelaunch
pnpm install         # or: npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — already filled with your project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your publishable key (`sb_publishable_...`).
- `SUPABASE_SERVICE_ROLE_KEY` — your secret key (`sb_secret_...`). Server-only, never committed.
- `NEXT_PUBLIC_ROOT_DOMAIN=lvh.me:3000` — `lvh.me` is a public DNS trick: it (and all its subdomains) always resolve to `127.0.0.1`. Perfect for local subdomain testing.

### 3. Apply the database schema

Open your Supabase dashboard → **SQL Editor** → paste the contents of `supabase/migrations/0001_init.sql` → Run.

This creates all tables, enums, triggers, and row-level-security policies.

### 4. Make yourself a superadmin

Sign in once first (run the app, go to `/login`, enter your email, click the magic link). Then in Supabase SQL Editor:

```sql
update public.profiles set role = 'superadmin' where email = 'wayne@wjddesigns.com';
```

### 5. Seed a test partner (optional)

```sql
insert into public.partners (slug, name, primary_color)
values ('pop', 'POP Marketing', '#e11d48');
```

### 6. Run it

```bash
pnpm dev
```

Then visit:

- `http://lvh.me:3000` — marketing landing
- `http://app.lvh.me:3000` — login / dashboard
- `http://pop.lvh.me:3000` — POP's partner-branded onboarding page

All three hit the same dev server; the middleware routes them based on host.

## Deployment (Vercel)

### One-time

1. Push this repo to `WJDDesigns/sitelaunch` on GitHub.
2. Import the repo in Vercel.
3. Add environment variables (same keys as `.env.local`, but set `NEXT_PUBLIC_ROOT_DOMAIN=mysitelaunch.com` and `NEXT_PUBLIC_APP_URL=https://app.mysitelaunch.com`).
4. In Vercel → Domains, add:
   - `mysitelaunch.com`
   - `www.mysitelaunch.com`
   - `app.mysitelaunch.com`
   - `*.mysitelaunch.com` (wildcard — needed for partner subdomains)

### DNS at your registrar

Add these records (Vercel shows the exact values to use):

```
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
CNAME  app    cname.vercel-dns.com
CNAME  *      cname.vercel-dns.com
```

### Partner custom domains (later)

When a partner wants `onboard.popmarketing.com`:

1. They add a CNAME at their DNS: `onboard → cname.vercel-dns.com`
2. You add the domain to the Vercel project (via the Vercel API — we'll build this into the admin UI later).
3. You set `custom_domain = 'onboard.popmarketing.com'` on their partner row.

Middleware handles the rest.

## What's next

Phase 1 — Partner management (add/invite partner, branding settings, per-tenant theming).
Phase 2 — Form engine (JSON-schema renderer, multi-step, file uploads, drafts).
Phase 3 — Submissions + notifications.
Phase 4 — PWA install, custom-domain provisioning, Stripe, analytics.

See `PIVOT-PLAN.md` (from the WJD onboarding project) for the full roadmap.
