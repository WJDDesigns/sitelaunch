-- ============================================================================
-- linqme — Template library system
-- Migration 0006
-- ============================================================================

-- Add template metadata columns
alter table public.form_templates
  add column if not exists description text,
  add column if not exists category text not null default 'general',
  add column if not exists icon text,
  add column if not exists owner_partner_id uuid references public.partners(id) on delete cascade,
  add column if not exists is_predefined boolean not null default false;

-- Predefined templates are visible to all; user templates only to the owner.
-- Mark the existing default template as predefined.
update public.form_templates set is_predefined = true where is_default = true;

-- Index for browsing templates
create index if not exists form_templates_category_idx on public.form_templates(category);
create index if not exists form_templates_owner_idx on public.form_templates(owner_partner_id);

-- ============================================================================
-- Seed: Website Design Onboarding (predefined template)
-- ============================================================================
insert into public.form_templates (slug, name, description, category, icon, version, is_default, is_predefined, schema)
values (
  'web-design-onboarding-v1',
  'Website Design Onboarding',
  'Comprehensive 8-step client onboarding form for web design agencies. Covers contact info, package selection, branding, content, ecommerce, and launch planning.',
  'web-design',
  'fa-rocket',
  1,
  false,
  true,
  $json${
    "steps": [
      {
        "id": "welcome_contact",
        "title": "Welcome & Contact Info",
        "description": "Let's start with the basics about you and your business.",
        "fields": [
          { "id": "heading_welcome", "type": "heading", "label": "Welcome to Your Website Project!", "content": "We're excited to get started! This onboarding form will help us understand your business, brand, and vision so we can build the perfect website. It should take about 15-20 minutes to complete." },
          { "id": "contact_name", "type": "text", "label": "Your Name", "required": true, "placeholder": "Jane Smith" },
          { "id": "business_name", "type": "text", "label": "Business Name", "required": true, "placeholder": "Acme Coffee Co." },
          { "id": "contact_email", "type": "email", "label": "Email Address", "required": true, "placeholder": "jane@acmecoffee.com" },
          { "id": "contact_phone", "type": "tel", "label": "Phone Number", "placeholder": "555-123-4567" },
          { "id": "business_address", "type": "address", "label": "Business Address", "hint": "Optional — useful for local SEO and maps integration." },
          { "id": "existing_website", "type": "url", "label": "Existing Website URL", "placeholder": "https://currentsite.com", "hint": "Leave blank if you don't have one yet." },
          { "id": "business_description", "type": "textarea", "label": "What does your business do?", "required": true, "rows": 4, "placeholder": "Describe your business, products/services, and what makes you unique..." }
        ]
      },
      {
        "id": "package_selection",
        "title": "Project Scope",
        "description": "Help us understand the size and scope of your project.",
        "fields": [
          { "id": "heading_scope", "type": "heading", "label": "Let's size your project", "content": "These questions help us recommend the right package and estimate your project timeline." },
          { "id": "page_estimate", "type": "radio", "label": "How many pages do you expect?", "required": true, "options": ["1-3 pages (Landing / Starter)", "4-7 pages (Small Business)", "8-15 pages (Business+)", "15+ pages (Enterprise)"] },
          { "id": "needs_ecommerce", "type": "radio", "label": "Will you sell products or services online?", "required": true, "options": ["Yes", "No", "Not sure yet"] },
          { "id": "needs_blog", "type": "radio", "label": "Do you need a blog or news section?", "required": true, "options": ["Yes", "No", "Maybe later"] },
          { "id": "integrations_count", "type": "radio", "label": "How many third-party integrations do you need?", "options": ["None", "1-2 basic (analytics, email)", "3-5 (CRM, scheduling, etc.)", "6+ (complex integrations)"] },
          { "id": "package_preference", "type": "radio", "label": "Which package interests you?", "hint": "This is just a starting point — we'll refine it together.", "options": ["Essentials — Clean single-page or simple site", "Business — Multi-page with blog and integrations", "Business+ — Full-featured with ecommerce or memberships", "Custom — Enterprise needs, let's talk"] }
        ]
      },
      {
        "id": "pages_detail",
        "title": "Pages & Structure",
        "description": "Tell us about the pages you envision for your site.",
        "fields": [
          { "id": "heading_pages", "type": "heading", "label": "Plan your pages", "content": "List the pages you want on your site and what each should accomplish. Common pages: Home, About, Services, Portfolio, Contact, Blog, Shop, FAQ, Team." },
          { "id": "pages_list", "type": "textarea", "label": "List your desired pages", "required": true, "rows": 6, "placeholder": "Home — Our main landing page showcasing services\nAbout — Our story and mission\nServices — What we offer with pricing\nPortfolio — Examples of our work\nContact — Get in touch form\n..." },
          { "id": "homepage_priority", "type": "textarea", "label": "What's the #1 thing visitors should do on your homepage?", "required": true, "rows": 3, "placeholder": "Book a consultation, purchase a product, sign up for newsletter..." },
          { "id": "special_features", "type": "textarea", "label": "Any special page features?", "rows": 4, "hint": "E.g., interactive calculators, event calendars, team bios, testimonial sliders, etc.", "placeholder": "Describe any unique functionality you need..." }
        ]
      },
      {
        "id": "ecommerce",
        "title": "E-Commerce Details",
        "description": "Tell us about your online store needs.",
        "fields": [
          { "id": "heading_ecom", "type": "heading", "label": "Online Store Setup", "content": "Skip this section if you answered 'No' to selling online. Otherwise, these details help us plan your store." },
          { "id": "product_type", "type": "radio", "label": "What will you sell?", "options": ["Physical products", "Digital products/downloads", "Services & bookings", "Mix of the above"] },
          { "id": "product_count", "type": "number", "label": "Approximate number of products/services", "placeholder": "25" },
          { "id": "payment_processors", "type": "checkbox", "label": "Preferred payment methods", "options": ["Stripe", "PayPal", "Square", "Apple Pay / Google Pay", "Afterpay / Klarna"], "maxSelections": 5 },
          { "id": "shipping_regions", "type": "checkbox", "label": "Shipping regions", "options": ["Local only", "Domestic (US)", "North America", "International", "No physical shipping (digital only)"], "maxSelections": 3 },
          { "id": "tax_handling", "type": "radio", "label": "Do you need automated tax calculation?", "options": ["Yes", "No", "Not sure"] },
          { "id": "inventory_system", "type": "text", "label": "Current inventory/POS system", "placeholder": "e.g., Shopify, Square, spreadsheet, none..." },
          { "id": "ecommerce_notes", "type": "textarea", "label": "Any other ecommerce requirements?", "rows": 3, "placeholder": "Subscription boxes, wholesale pricing, gift cards, etc." }
        ]
      },
      {
        "id": "branding",
        "title": "Branding & Identity",
        "description": "Share your visual identity so we can design around your brand.",
        "fields": [
          { "id": "heading_brand", "type": "heading", "label": "Your Visual Identity", "content": "If you have existing brand assets, upload them here. If not, no worries — we can help you develop them." },
          { "id": "logo_status", "type": "radio", "label": "Do you have a logo?", "required": true, "options": ["Yes — I'll upload it", "Yes — but it needs a refresh", "No — I need one designed"] },
          { "id": "logo_upload", "type": "files", "label": "Upload your logo", "hint": "PNG, SVG, or AI preferred. Upload all versions (color, white, icon).", "accept": "image/*,.ai,.pdf,.svg" },
          { "id": "primary_brand_color", "type": "color", "label": "Primary brand color", "placeholder": "#2563eb" },
          { "id": "secondary_brand_color", "type": "color", "label": "Secondary brand color", "placeholder": "#f97316" },
          { "id": "accent_brand_color", "type": "color", "label": "Accent color", "placeholder": "#10b981" },
          { "id": "brand_guidelines", "type": "radio", "label": "Do you have brand guidelines?", "options": ["Yes — I'll upload them", "Partial — just some basics", "No — build from scratch"] },
          { "id": "brand_guidelines_upload", "type": "file", "label": "Upload brand guidelines", "hint": "PDF or DOC preferred.", "accept": ".pdf,.doc,.docx" },
          { "id": "brand_personality", "type": "textarea", "label": "Describe your brand personality", "rows": 3, "hint": "How should your brand feel? E.g., professional, playful, luxurious, approachable...", "placeholder": "We want to feel modern and approachable, but still professional. Think Apple meets your friendly local shop." },
          { "id": "desired_feelings", "type": "textarea", "label": "Three feelings visitors should have on your site", "rows": 2, "placeholder": "Trustworthy, inspired, excited to work with us" },
          { "id": "avoid_feelings", "type": "textarea", "label": "Anything your brand should NOT feel like?", "rows": 2, "placeholder": "Cheap, corporate, cluttered, boring..." },
          { "id": "typography_prefs", "type": "textarea", "label": "Typography preferences", "rows": 2, "hint": "Do you have preferred fonts, or general preferences?", "placeholder": "We like clean sans-serifs. Our current font is Montserrat." }
        ]
      },
      {
        "id": "audience_inspiration",
        "title": "Audience & Inspiration",
        "description": "Help us understand who you're trying to reach.",
        "fields": [
          { "id": "heading_audience", "type": "heading", "label": "Know Your Audience", "content": "Understanding your customers helps us design an experience that resonates with them." },
          { "id": "target_audience", "type": "textarea", "label": "Who is your target audience?", "required": true, "rows": 4, "placeholder": "Describe your ideal customer: age range, interests, pain points, what they value..." },
          { "id": "value_proposition", "type": "textarea", "label": "What's your unique value proposition?", "required": true, "rows": 3, "placeholder": "Why should someone choose you over competitors?" },
          { "id": "competitors", "type": "textarea", "label": "Top 3 competitors", "rows": 3, "placeholder": "1. CompetitorA.com — they do X well\n2. CompetitorB.com — we want to beat their Y\n3. CompetitorC.com — similar audience" },
          { "id": "inspiration_sites", "type": "textarea", "label": "Websites you love (with reasons)", "rows": 5, "hint": "Share 3-5 sites you admire and what you like about each.", "placeholder": "stripe.com — clean layout, great animations\nairbnb.com — beautiful photography, easy navigation\nnotion.so — modern feel, simple but powerful" },
          { "id": "sites_to_avoid", "type": "textarea", "label": "Any styles or sites you dislike?", "rows": 3, "placeholder": "We don't want anything that looks like a generic template or has too many animations..." }
        ]
      },
      {
        "id": "content_launch",
        "title": "Content & Launch Planning",
        "description": "Let's plan the content, integrations, and launch timeline.",
        "fields": [
          { "id": "heading_content", "type": "heading", "label": "Getting Launch-Ready", "content": "These final details help us plan your project timeline and ensure nothing falls through the cracks." },
          { "id": "copywriting_status", "type": "radio", "label": "Who will write the website copy?", "required": true, "options": ["I'll provide all copy", "I need help with copywriting", "I have some copy, need help with the rest", "I'll use AI-generated drafts for your team to refine"] },
          { "id": "available_assets", "type": "checkbox", "label": "What assets do you already have?", "options": ["Professional photography", "Product photography", "Video content", "Testimonials / reviews", "Case studies", "Team headshots", "None of the above"] },
          { "id": "stock_photography", "type": "radio", "label": "Do you need stock photography?", "options": ["Yes — source and license for us", "Maybe — suggest options", "No — I have everything"] },
          { "id": "current_domain", "type": "text", "label": "Current domain name", "placeholder": "mybusiness.com", "hint": "The domain you want the site to live at." },
          { "id": "domain_status", "type": "radio", "label": "Domain ownership status", "options": ["I own it and can manage DNS", "I own it but need help with DNS", "I need to purchase a domain", "Not sure"] },
          { "id": "current_hosting", "type": "radio", "label": "Current hosting provider", "options": ["None / new site", "GoDaddy", "Bluehost / HostGator", "AWS / Vercel / Netlify", "Other (specify below)"] },
          { "id": "integrations_needed", "type": "checkbox", "label": "Third-party integrations needed", "options": ["Email marketing (Mailchimp, ConvertKit, etc.)", "CRM (HubSpot, Salesforce, etc.)", "Google Analytics 4", "Google Tag Manager", "Meta/Facebook Pixel", "Calendly / Booking system", "Zapier automations", "Live chat widget", "Membership / gated content", "Multi-language support", "Google Maps"], "maxSelections": 8 },
          { "id": "other_integrations", "type": "textarea", "label": "Other tools or integrations", "rows": 2, "placeholder": "Anything else we should connect to?" },
          { "id": "accessibility_needs", "type": "radio", "label": "Accessibility requirements", "options": ["WCAG 2.1 AA compliance", "Section 508 compliance", "ADA compliance", "Basic best practices", "Not sure — advise me"] },
          { "id": "launch_date", "type": "date", "label": "Desired launch date", "hint": "When do you ideally want the site live?" },
          { "id": "decision_maker", "type": "text", "label": "Who has final approval authority?", "placeholder": "Name and role", "hint": "Who signs off on design and content?" },
          { "id": "success_metrics", "type": "textarea", "label": "How will you measure success?", "rows": 3, "placeholder": "More leads, higher conversion rate, reduced bounce rate, increased online sales..." },
          { "id": "budget_notes", "type": "textarea", "label": "Budget range or notes", "rows": 2, "hint": "Optional but helps us tailor our recommendation.", "placeholder": "Our budget is roughly $X-Y, flexible for the right solution." }
        ]
      },
      {
        "id": "review_submit",
        "title": "Review & Submit",
        "description": "You're almost done! Review your answers and submit.",
        "fields": [
          { "id": "heading_review", "type": "heading", "label": "You're all set!", "content": "Thank you for taking the time to fill this out thoroughly. Your answers help us hit the ground running. After you submit, we'll review everything and reach out within 1-2 business days to schedule your kickoff call." },
          { "id": "additional_notes", "type": "textarea", "label": "Anything else we should know?", "rows": 4, "placeholder": "Final thoughts, special requirements, or questions for our team..." },
          { "id": "agree_terms", "type": "checkbox", "label": "I agree to the project terms", "required": true, "placeholder": "I understand this questionnaire is a starting point and final scope will be confirmed during our kickoff call." }
        ]
      }
    ]
  }$json$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  is_predefined = excluded.is_predefined,
  schema = excluded.schema;

-- ============================================================================
-- Seed: Simple Starter template (predefined)
-- ============================================================================
insert into public.form_templates (slug, name, description, category, icon, version, is_default, is_predefined, schema)
values (
  'simple-starter-v1',
  'Simple Starter',
  'Basic 3-step onboarding form. Great starting point for any service business.',
  'general',
  'fa-bolt',
  1,
  false,
  true,
  $json${
    "steps": [
      {
        "id": "about",
        "title": "About You",
        "description": "Tell us the basics.",
        "fields": [
          { "id": "name", "type": "text", "label": "Your Name", "required": true },
          { "id": "email", "type": "email", "label": "Email", "required": true },
          { "id": "phone", "type": "tel", "label": "Phone" },
          { "id": "company", "type": "text", "label": "Company Name" }
        ]
      },
      {
        "id": "project",
        "title": "Your Project",
        "description": "What are we building?",
        "fields": [
          { "id": "project_type", "type": "select", "label": "Project Type", "required": true, "options": ["New website", "Redesign", "Branding", "Marketing", "Other"] },
          { "id": "description", "type": "textarea", "label": "Describe your project", "required": true, "rows": 4 },
          { "id": "timeline", "type": "radio", "label": "Timeline", "options": ["ASAP", "1-2 months", "3-6 months", "Flexible"] },
          { "id": "budget", "type": "radio", "label": "Budget range", "options": ["Under $5k", "$5k-$15k", "$15k-$50k", "$50k+"] }
        ]
      },
      {
        "id": "assets",
        "title": "Assets & Files",
        "description": "Upload any existing materials.",
        "fields": [
          { "id": "logo", "type": "file", "label": "Logo", "accept": "image/*,.svg,.ai,.pdf" },
          { "id": "brand_files", "type": "files", "label": "Brand assets / reference files", "accept": "image/*,.pdf,.doc,.docx" },
          { "id": "notes", "type": "textarea", "label": "Anything else?", "rows": 3 }
        ]
      }
    ]
  }$json$::jsonb
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  is_predefined = excluded.is_predefined,
  schema = excluded.schema;

-- Update the existing default template with metadata
update public.form_templates
set description = 'Default 3-step form covering business info, contact details, and goals.',
    category = 'general',
    icon = 'fa-clipboard-list',
    is_predefined = true
where slug = 'site-onboarding-v1';
