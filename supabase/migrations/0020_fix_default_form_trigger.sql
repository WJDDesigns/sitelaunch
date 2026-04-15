-- Fix: the tg_partner_default_form trigger from 0003 does not supply
-- the `name`, `slug`, or `is_default` columns that became NOT NULL in 0015.
-- This causes "null value in column slug" when new users sign up.

CREATE OR REPLACE FUNCTION public.tg_partner_default_form()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_template_id uuid;
BEGIN
  SELECT id INTO v_template_id FROM public.form_templates
  WHERE is_default = true ORDER BY created_at ASC LIMIT 1;

  IF v_template_id IS NOT NULL THEN
    INSERT INTO public.partner_forms (partner_id, template_id, name, slug, is_default, is_active)
    VALUES (new.id, v_template_id, 'Onboarding Form', 'default', true, true)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END $$;
