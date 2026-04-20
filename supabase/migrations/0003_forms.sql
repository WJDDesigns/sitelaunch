-- ============================================================================
-- linqme — form engine + anonymous submission tokens
-- Migration 0003
-- ============================================================================

-- Add access_token for anonymous submission flows
alter table public.submissions
  add column if not exists access_token text unique default encode(gen_random_bytes(24), 'hex');

create index if not exists submissions_access_token_idx on public.submissions(access_token);

-- ============================================================================
-- Seed a default form template (idempotent)
-- ============================================================================
insert into public.form_templates (slug, name, version, is_default, schema)
values (
  'site-onboarding-v1',
  'Website Onboarding (v1)',
  1,
  true,
  $json${
    "steps": [
      {
        "id": "about",
        "title": "About your business",
        "description": "Tell us the basics so we can design around your brand.",
        "fields": [
          { "id": "business_name", "type": "text", "label": "Business name", "required": true, "placeholder": "Acme Coffee Co." },
          { "id": "industry", "type": "select", "label": "Industry", "required": true, "options": ["Retail","Hospitality / Food","Professional services","Health & wellness","E-commerce","Non-profit","Other"] },
          { "id": "tagline", "type": "text", "label": "Tagline or slogan", "placeholder": "Coffee that wakes the soul." },
          { "id": "years_in_business", "type": "number", "label": "Years in business" }
        ]
      },
      {
        "id": "contact",
        "title": "Primary contact",
        "description": "Who should we reach out to with questions?",
        "fields": [
          { "id": "contact_name", "type": "text", "label": "Full name", "required": true },
          { "id": "contact_email", "type": "email", "label": "Email", "required": true },
          { "id": "contact_phone", "type": "tel", "label": "Phone", "placeholder": "555-123-4567" }
        ]
      },
      {
        "id": "goals",
        "title": "Goals & vision",
        "description": "Help us understand what success looks like for you.",
        "fields": [
          { "id": "primary_goal", "type": "textarea", "label": "What's the #1 thing this site needs to accomplish?", "required": true, "rows": 3 },
          { "id": "audience", "type": "textarea", "label": "Who's your target audience?", "rows": 3 },
          { "id": "inspiration", "type": "textarea", "label": "Any sites you love? Paste links or describe what you like.", "rows": 4 }
        ]
      }
    ]
  }$json$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  schema = excluded.schema,
  is_default = excluded.is_default;

-- ============================================================================
-- Auto-link new partners to the default template
-- ============================================================================
create or replace function public.tg_partner_default_form()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_template_id uuid;
begin
  select id into v_template_id from public.form_templates
  where is_default = true order by created_at asc limit 1;
  if v_template_id is not null then
    insert into public.partner_forms (partner_id, template_id)
    values (new.id, v_template_id)
    on conflict do nothing;
  end if;
  return new;
end $$;

drop trigger if exists on_partner_created_default_form on public.partners;
create trigger on_partner_created_default_form
  after insert on public.partners
  for each row execute function public.tg_partner_default_form();

-- Backfill: link any existing partners that don't yet have a form
insert into public.partner_forms (partner_id, template_id)
select p.id, t.id
from public.partners p
cross join lateral (
  select id from public.form_templates where is_default = true
  order by created_at asc limit 1
) t
where not exists (
  select 1 from public.partner_forms pf where pf.partner_id = p.id
);
