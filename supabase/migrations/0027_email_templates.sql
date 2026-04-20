create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subject text not null,
  html_body text not null,
  description text,
  variables text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;
create policy "Service role full access" on public.email_templates for all using (true);

-- Seed the 7 default templates

insert into public.email_templates (slug, name, subject, description, variables, html_body) values
(
  'verification',
  'Email Verification',
  'Verify your email address',
  'Sent when a new user signs up and needs to verify their email address.',
  ARRAY['name', 'verify_url'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Verify your email</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">Verify your email</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">Thanks for signing up for linqme! Please verify your email address by clicking the button below.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="{{verify_url}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Verify Email Address</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If you didn''t create an account, you can safely ignore this email.</p>
                    <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">Or copy this link: {{verify_url}}</p>
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
),
(
  'verification_resend',
  'Resend Verification',
  'Your new verification link',
  'Sent when a user requests a new verification email.',
  ARRAY['name', 'verify_url'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Resend Verification</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">New verification link</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">You requested a new verification link. Click below to verify your email address.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="{{verify_url}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Verify Email Address</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If you didn''t request this, you can safely ignore this email.</p>
                    <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">Or copy this link: {{verify_url}}</p>
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
),
(
  'welcome',
  'Welcome to linqme',
  'Welcome to linqme, {{company_name}}!',
  'Sent after a partner account is created and verified.',
  ARRAY['company_name', 'plan_line', 'storefront_url', 'dashboard_url'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Welcome to linqme</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">Welcome aboard! &#127881;</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{company_name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">Your linqme account is all set up and ready to go. {{plan_line}}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;padding:16px;">
                      <tr>
                        <td style="padding:12px 16px;">
                          <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Your storefront</p>
                          <a href="{{storefront_url}}" style="color:#2dd4a8;font-size:14px;text-decoration:none;word-break:break-all;">{{storefront_url}}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="{{dashboard_url}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Go to Dashboard</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Need help getting started? Just reply to this email and we''ll be happy to assist.</p>
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
),
(
  'submission_partner',
  'New Submission (Partner)',
  'New submission from {{client_name}}',
  'Sent to the partner when a new client submission is received.',
  ARRAY['partner_name', 'client_name', 'client_email', 'dashboard_link'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>New Submission</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">New submission received</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{partner_name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">A new client has submitted their onboarding form. Here are the details:</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;">
                      <tr>
                        <td style="padding:16px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding:4px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">Name</td>
                              <td style="padding:4px 0;color:#e2e8f0;font-size:13px;font-weight:600;">{{client_name}}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">Email</td>
                              <td style="padding:4px 0;color:#2dd4a8;font-size:13px;">{{client_email}}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="{{dashboard_link}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">View Submission</a>
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
),
(
  'submission_client',
  'Submission Confirmation (Client)',
  'We received your information!',
  'Sent to the client after they submit their onboarding form.',
  ARRAY['client_name', 'partner_name', 'form_summary'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Submission Confirmation</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">Thanks for submitting! &#10003;</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{client_name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">We''ve received your information and {{partner_name}} has been notified. They''ll be in touch with you shortly to discuss next steps.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;">
                      <tr>
                        <td style="padding:16px;">
                          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">&#128161; <strong style="color:#e2e8f0;">What happens next?</strong></p>
                          <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;line-height:1.6;">{{partner_name}} will review your submission and reach out to you. No further action is needed on your part.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    {{form_summary}}
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">If you have questions, feel free to reply to this email.</p>
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
),
(
  'partner_invite',
  'Partner Invitation',
  'You''ve been invited to join linqme',
  'Sent when a partner is invited to join the platform.',
  ARRAY['inviter_name', 'partner_name', 'invite_url', 'role'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Partner Invitation</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">You''re invited!</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <p style="margin:0;color:#94a3b8;font-size:15px;line-height:1.7;">Hi {{partner_name}},</p>
                    <p style="margin:12px 0 0;color:#94a3b8;font-size:15px;line-height:1.7;">{{inviter_name}} has invited you to join linqme as a <strong style="color:#e2e8f0;">{{role}}</strong>. Click below to accept the invitation and set up your account.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <a href="{{invite_url}}" style="display:inline-block;background:#696cf8;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:14px;letter-spacing:0.02em;">Accept Invitation</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">This invitation will expire in 7 days. If you didn''t expect this, you can safely ignore it.</p>
                    <p style="margin:12px 0 0;color:#64748b;font-size:12px;line-height:1.6;word-break:break-all;">Or copy this link: {{invite_url}}</p>
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
),
(
  'support_contact',
  'Support Contact',
  'New support message: {{subject}}',
  'Sent when someone submits the support contact form.',
  ARRAY['sender_name', 'sender_email', 'subject', 'message'],
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <title>Support Contact</title>
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
                    <h1 style="margin:0;font-size:24px;font-weight:800;color:#e2e8f0;line-height:1.3;">New support message</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1326;border-radius:12px;">
                      <tr>
                        <td style="padding:16px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="padding:4px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">From</td>
                              <td style="padding:4px 0;color:#e2e8f0;font-size:13px;font-weight:600;">{{sender_name}}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">Email</td>
                              <td style="padding:4px 0;color:#2dd4a8;font-size:13px;">{{sender_email}}</td>
                            </tr>
                            <tr>
                              <td style="padding:4px 0;color:#64748b;font-size:13px;width:80px;vertical-align:top;">Subject</td>
                              <td style="padding:4px 0;color:#e2e8f0;font-size:13px;font-weight:600;">{{subject}}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;">
                    <p style="margin:0 0 8px;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
                    <div style="color:#94a3b8;font-size:14px;line-height:1.7;background:#0b1326;border-radius:12px;padding:16px;">{{message}}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">Reply directly to this email to respond to the sender.</p>
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
