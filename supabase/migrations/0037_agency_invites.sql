-- Agency invites: admin-only system to invite agency owners to try the platform
create table if not exists public.agency_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  coupon_code text not null unique,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

alter table public.agency_invites enable row level security;
create policy "Service role full access" on public.agency_invites for all using (true);

create index idx_agency_invites_email on public.agency_invites (email);
create index idx_agency_invites_token on public.agency_invites (token);
create index idx_agency_invites_coupon on public.agency_invites (coupon_code);

-- Seed the agency_invite email template
insert into public.email_templates (slug, name, subject, description, variables, html_body) values
(
  'agency_invite',
  'Agency Invitation',
  'You''re invited to try linqme -- exclusive access',
  'Sent by an admin to invite agency owners to sign up for linqme with a unique coupon code.',
  ARRAY['email', 'coupon_code', 'signup_url', 'expires_date'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Agency Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1326;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b1326;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding:0 0 24px;text-align:center;">
              <img src="https://linqme.io/email-logo.png" alt="linqme" width="120" height="34" style="display:block;margin:0 auto 8px;border:0;" /><span style="font-size:18px;font-weight:800;color:#e2e8f0;letter-spacing:-0.02em;">linqme</span>
            </td>
          </tr>
          <tr>
            <td style="background:#131b2e;border-radius:16px;padding:36px 32px;border:1px solid rgba(105,108,248,0.15);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:0 0 8px;">
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">You''re invited to linqme</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 20px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi there,</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">You''ve been hand-picked to get early access to <strong style="color:#e2e8f0;">linqme</strong> -- the all-in-one client onboarding platform built for agencies. We''d love for you to take it for a spin.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;">
                      <tr>
                        <td style="padding:20px;">
                          <p style="margin:0 0 12px;color:#e2e8f0;font-size:14px;font-weight:700;">What you get with linqme:</p>
                          <table role="presentation" cellspacing="0" cellpadding="0">
                            <tr><td style="padding:4px 0;color:#2dd4a8;font-size:13px;">&#10003;</td><td style="padding:4px 0 4px 10px;color:#94a3b8;font-size:13px;">Drag-and-drop form builder with 30+ field types</td></tr>
                            <tr><td style="padding:4px 0;color:#2dd4a8;font-size:13px;">&#10003;</td><td style="padding:4px 0 4px 10px;color:#94a3b8;font-size:13px;">White-label branding -- your logo, colors, and domain</td></tr>
                            <tr><td style="padding:4px 0;color:#2dd4a8;font-size:13px;">&#10003;</td><td style="padding:4px 0 4px 10px;color:#94a3b8;font-size:13px;">AI-powered insights and analytics dashboard</td></tr>
                            <tr><td style="padding:4px 0;color:#2dd4a8;font-size:13px;">&#10003;</td><td style="padding:4px 0 4px 10px;color:#94a3b8;font-size:13px;">Stripe Connect for collecting payments</td></tr>
                            <tr><td style="padding:4px 0;color:#2dd4a8;font-size:13px;">&#10003;</td><td style="padding:4px 0 4px 10px;color:#94a3b8;font-size:13px;">Multi-partner management for scaling your agency</td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,rgba(105,108,248,0.15),rgba(45,212,168,0.1));border-radius:12px;border:1px solid rgba(105,108,248,0.2);">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0 0 4px;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Your exclusive coupon code</p>
                          <p style="margin:0;color:#696cf8;font-size:22px;font-weight:800;letter-spacing:0.04em;font-family:monospace;">{{coupon_code}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="{{signup_url}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Get Started Free</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">This invitation expires on {{expires_date}}. Enter the coupon code above during checkout to unlock your discount.</p>
                    <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">Or sign up here: {{signup_url}}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="margin:0;color:#475569;font-size:12px;line-height:1.5;">Sent from linqme</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>'
)
on conflict (slug) do nothing;
