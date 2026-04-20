-- ============================================================================
-- linqme — form schema v2: brand assets step with file uploads
-- Migration 0004
-- ============================================================================

update public.form_templates
set version = 2,
    schema = $json${
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
          "id": "brand",
          "title": "Brand assets",
          "description": "Upload your logo and any brand files we should use. You can skip any you don't have.",
          "fields": [
            { "id": "logo_file", "type": "file", "label": "Logo (PNG, SVG, or PDF)", "accept": "image/png,image/svg+xml,image/jpeg,application/pdf" },
            { "id": "brand_files", "type": "files", "label": "Other brand assets", "accept": "image/*,application/pdf", "hint": "Fonts, photos, style guides — anything you want us to use." }
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
where slug = 'site-onboarding-v1';
