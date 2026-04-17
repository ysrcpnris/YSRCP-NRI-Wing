# YSRCP NRI Wing — Branded Email Templates

Copy each template into your Supabase dashboard → **Authentication → Email Templates**.

Supabase provides 5 email templates. We're customizing 3 of them (the ones the app actually uses):
- **Confirm signup** (for registration)
- **Magic Link** (used by "OTP" option in Forgot Password)
- **Reset Password** (for "Reset Link" option)

All templates use inline CSS (required — email clients strip `<style>` tags) and table-based layouts (for Outlook compatibility).

---

## 1. CONFIRM SIGNUP  ✨ (personalized)

Subject: `Welcome {{ .Data.first_name }} — please verify your email`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Verify your email</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);padding:36px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.5px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Recipient strip -->
            <tr>
              <td style="background:#f9fafb;padding:10px 32px;border-bottom:1px solid #eef2f7;">
                <p style="margin:0;font-size:12px;color:#6b7280;">Sent to <span style="color:#111827;font-weight:500;">{{ .Email }}</span></p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 14px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.2px;">
                  {{ if .Data.first_name }}Welcome, {{ .Data.first_name }}! 👋{{ else }}Welcome aboard! 👋{{ end }}
                </h2>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#4b5563;">
                  You're one step away from joining the <strong style="color:#0B4DA2;">YSRCP NRI Wing</strong> community — a global network of NRIs contributing to a progressive Andhra Pradesh.
                </p>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4b5563;">
                  Confirm your email to activate your account and get started.
                </p>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);box-shadow:0 4px 12px rgba(11,77,162,0.25);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Verify my email →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Button not working? <a href="{{ .ConfirmationURL }}" style="color:#1E6BD6;font-weight:500;text-decoration:underline;">Click here to verify</a>.
                </p>
              </td>
            </tr>

            <!-- What's next -->
            <tr>
              <td style="padding:8px 32px 24px;">
                <div style="background:linear-gradient(135deg,#f0f9ff 0%,#f5f3ff 100%);border:1px solid #dbeafe;border-radius:12px;padding:16px 18px;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0B4DA2;">✨ What's next?</p>
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
                    After verification you'll be able to connect with leadership, access exclusive updates, and contribute to initiatives that matter.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Security note -->
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;text-align:center;">
                  🔒 This link expires in 24 hours. If you didn't sign up for YSRCP NRI Wing, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ffffff;">YSRCP NRI Wing</p>
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                  YSR Congress Party · NRI Wing<br/>
                  <a href="https://ysrcpnriwing.org" style="color:#93c5fd;text-decoration:none;">ysrcpnriwing.org</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 2. MAGIC LINK (OTP flow)  ✨ (personalized)

Subject: `Your sign-in link for YSRCP NRI Wing`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your sign-in link</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#00a86b 0%,#00C853 100%);padding:36px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;letter-spacing:0.5px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Recipient strip -->
            <tr>
              <td style="background:#f0fdf4;padding:10px 32px;border-bottom:1px solid #dcfce7;">
                <p style="margin:0;font-size:12px;color:#14532d;">Sent to <span style="color:#064e3b;font-weight:500;">{{ .Email }}</span></p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 14px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.2px;">
                  {{ if .Data.first_name }}Hi {{ .Data.first_name }}, welcome back 👋{{ else }}Welcome back 👋{{ end }}
                </h2>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#4b5563;">
                  You requested a secure sign-in link — no password needed. Just click below to jump straight in.
                </p>
                <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#6b7280;">
                  This link works on any device. It'll sign you in instantly.
                </p>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#00a86b 0%,#00C853 100%);box-shadow:0 4px 12px rgba(0,168,107,0.25);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Sign me in →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Button not working? <a href="{{ .ConfirmationURL }}" style="color:#00a86b;font-weight:500;text-decoration:underline;">Click here to sign in</a>.
                </p>
              </td>
            </tr>

            <!-- Security card -->
            <tr>
              <td style="padding:8px 32px 24px;">
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#9a3412;">🔒 Not you?</p>
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#7c2d12;">
                    If you didn't ask for this link, someone may have typed your email by mistake. No action is needed — just ignore this email. The link expires in 1 hour.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ffffff;">YSRCP NRI Wing</p>
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                  YSR Congress Party · NRI Wing<br/>
                  <a href="https://ysrcpnriwing.org" style="color:#86efac;text-decoration:none;">ysrcpnriwing.org</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. RESET PASSWORD  ✨ (personalized)

Subject: `Reset your password — YSRCP NRI Wing`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.06);">

            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);padding:36px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;letter-spacing:0.5px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Recipient strip -->
            <tr>
              <td style="background:#f9fafb;padding:10px 32px;border-bottom:1px solid #eef2f7;">
                <p style="margin:0;font-size:12px;color:#6b7280;">Sent to <span style="color:#111827;font-weight:500;">{{ .Email }}</span></p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:36px 32px 8px;">
                <h2 style="margin:0 0 14px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.2px;">
                  {{ if .Data.first_name }}Hi {{ .Data.first_name }},{{ else }}Hi there,{{ end }} let's get you back in 🔐
                </h2>
                <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#4b5563;">
                  We received a request to reset the password for your <strong style="color:#0B4DA2;">YSRCP NRI Wing</strong> account.
                </p>
                <p style="margin:0 0 28px;font-size:15px;line-height:1.65;color:#4b5563;">
                  Click the button below to choose a new password. It only takes a moment.
                </p>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);box-shadow:0 4px 12px rgba(11,77,162,0.25);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Reset my password →
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Button not working? <a href="{{ .ConfirmationURL }}" style="color:#1E6BD6;font-weight:500;text-decoration:underline;">Click here to reset</a>.
                </p>
              </td>
            </tr>

            <!-- Security alert -->
            <tr>
              <td style="padding:8px 32px 24px;">
                <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:14px 16px;">
                  <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">⚠️ Didn't request this?</p>
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#78350f;">
                    If you didn't ask to reset your password, someone may have entered your email by mistake. Your account is safe — just ignore this email. Your current password will stay unchanged.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Tips -->
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;">💡 Password tips</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">
                  Use at least 8 characters with a mix of letters, numbers, and symbols. Don't reuse passwords from other sites.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#ffffff;">YSRCP NRI Wing</p>
                <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
                  YSR Congress Party · NRI Wing<br/>
                  This link expires in 1 hour · <a href="https://ysrcpnriwing.org" style="color:#93c5fd;text-decoration:none;">ysrcpnriwing.org</a>
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

# HOW TO APPLY THESE TEMPLATES

### Step 1 — Open the Supabase template editor
1. Go to https://supabase.com/dashboard
2. Select your project (`rcpcmjrahhzayqxexpkv`)
3. Left sidebar → **Authentication**
4. Click **Email Templates** tab

### Step 2 — Paste each template
You'll see 5 templates listed:
- Confirm signup
- Invite user
- Magic Link
- Change Email Address
- Reset Password

For each of the 3 we care about:
1. Click the template name
2. **Subject** field: paste the subject shown above
3. **Body** field: paste the full HTML block (replace all existing content)
4. Click **Save**

### Step 3 — Verify the variables
Supabase injects these variables automatically:
- `{{ .ConfirmationURL }}` — the clickable link (different meaning per template)
- `{{ .Email }}` — recipient email
- `{{ .SiteURL }}` — your site URL from auth settings
- `{{ .Token }}` — raw token (optional, we're not using it)

Make sure `{{ .ConfirmationURL }}` is present in every template — it's the action link.

### Step 4 — Test
After saving, test each flow:
1. **Confirm signup**: Register a new account → check inbox for branded email
2. **Magic link**: Forgot Password → OTP → check inbox
3. **Reset password**: Forgot Password → Reset Link → check inbox

---

## Notes

- **Colors used:** Primary blue gradient (#0B4DA2 → #1E6BD6) for confirm & reset; Green gradient (#00a86b → #00C853) for magic link (matches the "Latest News" theme on the homepage).
- **Mobile-responsive:** All templates use fixed-width tables with `max-width:560px` and `width:100%` — they render cleanly on phones.
- **No external CSS:** Everything is inline. Safe for Gmail, Outlook, Apple Mail, etc.
- **Button fallback:** Each template also shows the raw URL so users on strict email clients can still copy-paste.
- **No images:** Purely HTML/CSS. No broken-image issues or slow loading. If you want to add the NRI logo later, upload it to a CDN (or use the Supabase storage public URL) and reference it with an `<img>` tag.

Once custom SMTP is configured (Resend/SendGrid/etc.), these templates will be what your users actually receive.
