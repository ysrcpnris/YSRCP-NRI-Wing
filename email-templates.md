# YSRCP NRI Wing — Branded Email Templates

Copy each template into your Supabase dashboard → **Authentication → Email Templates**.

Supabase provides 5 email templates. We're customizing 3 of them (the ones the app actually uses):
- **Confirm signup** (for registration)
- **Magic Link** (used by "OTP" option in Forgot Password)
- **Reset Password** (for "Reset Link" option)

All templates use inline CSS (required — email clients strip `<style>` tags) and table-based layouts (for Outlook compatibility).

---

## 1. CONFIRM SIGNUP

Subject: `Verify your email — YSRCP NRI Wing`

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
              <td style="background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);padding:32px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.3px;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 32px 16px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Confirm your email address</h2>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
                  Welcome aboard! Please confirm your email address to activate your account and join the NRI Wing community.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Verify Email
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:6px 0 0;font-size:12px;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#1E6BD6;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>

            <!-- Info box -->
            <tr>
              <td style="padding:0 32px 24px;">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                    🔒 This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.5;">
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

## 2. MAGIC LINK (OTP flow)

Subject: `Your sign-in link — YSRCP NRI Wing`

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
              <td style="background:linear-gradient(135deg,#00a86b 0%,#00C853 100%);padding:32px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 32px 16px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Sign in to your account</h2>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
                  Click the button below to sign in to YSRCP NRI Wing. No password needed.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#00a86b 0%,#00C853 100%);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Sign In
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:6px 0 0;font-size:12px;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#00a86b;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>

            <!-- Info box -->
            <tr>
              <td style="padding:0 32px 24px;">
                <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
                    🔒 This link is valid for 1 hour and can only be used once. If you didn't request it, you can ignore this email.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.5;">
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

## 3. RESET PASSWORD

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
              <td style="background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);padding:32px 24px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">YSRCP NRI Wing</h1>
                <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Global Unity · Local Impact</p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:40px 32px 16px;">
                <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h2>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
                  We received a request to reset the password for your account. Click the button below to choose a new password.
                </p>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 28px;">
                  <tr>
                    <td style="border-radius:10px;background:linear-gradient(135deg,#0B4DA2 0%,#1E6BD6 100%);">
                      <a href="{{ .ConfirmationURL }}"
                         style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                  Or paste this link into your browser:
                </p>
                <p style="margin:6px 0 0;font-size:12px;word-break:break-all;">
                  <a href="{{ .ConfirmationURL }}" style="color:#1E6BD6;text-decoration:underline;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>

            <!-- Info box -->
            <tr>
              <td style="padding:0 32px 24px;">
                <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;">
                  <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                    ⚠️ If you didn't request this reset, please ignore this email — your password will remain unchanged. This link expires in 1 hour.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#0f172a;padding:22px 24px;text-align:center;">
                <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:1.5;">
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
