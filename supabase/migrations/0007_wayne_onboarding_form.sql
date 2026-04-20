-- ============================================================================
-- linqme — Apply Website Design Onboarding template to Wayne's account
-- Migration 0007
-- ============================================================================

-- Find Wayne's partner and the web design onboarding template,
-- then update his form to use that template's schema.
do $$
declare
  v_wayne_partner_id uuid;
  v_wayne_template_id uuid;
  v_onboarding_schema jsonb;
begin
  -- Find Wayne's partner by his profile email
  select prt.id into v_wayne_partner_id
  from public.partners prt
  join public.profiles p on p.id = prt.created_by
  where p.email = 'wayne@wjddesigns.com'
  order by prt.created_at asc
  limit 1;

  if v_wayne_partner_id is null then
    raise notice 'Wayne partner not found — skipping.';
    return;
  end if;

  -- Get the web design onboarding template schema
  select schema into v_onboarding_schema
  from public.form_templates
  where slug = 'web-design-onboarding-v1'
  limit 1;

  if v_onboarding_schema is null then
    raise notice 'Web Design Onboarding template not found — skipping.';
    return;
  end if;

  -- Find Wayne's active partner_form and update its template schema
  select pf.template_id into v_wayne_template_id
  from public.partner_forms pf
  where pf.partner_id = v_wayne_partner_id
    and pf.is_active = true
  limit 1;

  if v_wayne_template_id is null then
    raise notice 'Wayne has no active form — skipping.';
    return;
  end if;

  -- Update Wayne's template with the onboarding schema
  update public.form_templates
  set schema = v_onboarding_schema,
      name = 'Website Design Onboarding'
  where id = v_wayne_template_id;

  raise notice 'Applied Website Design Onboarding template to Wayne''s account.';
end $$;
