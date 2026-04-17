The code is fine — this is a Supabase rate limit, not a bug. Here's the issue and fix:

Why "email rate limit exceeded"
Fresh Supabase projects use Supabase's built-in email service by default. It's only for development and enforces strict limits:

~3-4 emails per hour (very conservative)
Low deliverability (often goes to spam or gets blocked entirely)
Shared IP pool — once rate-limited, all your test emails are blocked
You've already hit the ceiling testing reset link + OTP. So no emails will go out for the next hour.

Fix — Configure your own SMTP (one-time setup)
You have two paths:

Option A — Wait (quick but limited)
Wait ~1 hour, then you can send ~3-4 more test emails. Good for quick testing, but you'll keep hitting the limit.

Option B — Add a real SMTP provider (recommended for production)
Step 1: Sign up for a free SMTP service. Easiest options:

Resend (free: 3,000 emails/month) — cleanest UI, recommended → https://resend.com
Brevo / Sendinblue (free: 300 emails/day)
SendGrid (free: 100 emails/day)
Mailgun (free: 100 emails/day)
Step 2: Get SMTP credentials from them. You'll get:

SMTP Host (e.g., smtp.resend.com)
Port (e.g., 465 or 587)
Username (e.g., resend or your API key)
Password (the secret key)
Sender email (like no-reply@yourdomain.com — or use their default)
Step 3: Configure in Supabase dashboard:

Go to your Supabase project → Project Settings → Authentication → scroll to SMTP Settings
Toggle "Enable Custom SMTP" ON
Fill in the fields from Step 2
Click Save
Step 4: Optionally customize the email templates:

Supabase Dashboard → Authentication → Email Templates
You'll see templates for: Confirm signup, Reset password, Magic link, etc.
Make sure the reset-password template has the {{ .ConfirmationURL }} variable
Additional checks while you're there
Site URL (Authentication → URL Configuration):

Set it to http://localhost:5173 for dev OR your production URL
This is what Supabase uses as the base for auth redirects
Redirect URLs allowlist:

Add both:
http://localhost:5173/**
https://ysrcpnriwing.org/** (when you deploy)
Without this, Supabase will reject your redirectTo URLs silently
Quick answer to your question
Yes, you need to configure Supabase first for emails to work reliably. The code is correct. Once you set up custom SMTP + whitelist your redirect URLs, both "Reset Link" and "OTP" will start working properly.

For fastest setup, I recommend Resend — free, simple signup, works with Supabase out of the box. Takes ~5 minutes.

Want me to help once you've picked an SMTP provider?





Done. I created email-templates.md with three ready-to-paste branded HTML email templates:

What's in the file
Three branded templates:

Confirm Signup — Blue gradient header, "Verify Email" CTA button, 24-hour expiry notice
Magic Link — Green gradient header (matches "Latest News"), "Sign In" CTA, 1-hour expiry notice
Reset Password — Blue gradient header, amber warning box about ignoring if not requested
Each uses:

Inline CSS (required — Gmail/Outlook strip <style> tags)
Table-based layout (universal email client support)
Mobile-responsive (max-width: 560px + width: 100%)
YSRCP branding — gradient header, "Global Unity · Local Impact" tagline, dark footer with site link
Fallback raw URL below the button (for strict clients that strip buttons)
Your theme colors: #0B4DA2, #1E6BD6, #00a86b, #00C853
How to apply (simple)
Go to Supabase Dashboard → Authentication → Email Templates
For each of the 3 templates:
Click the template name
Paste the Subject
Paste the full HTML body (replaces existing)
Save
Test each flow — new emails will be the branded versions
Next steps
Once you've configured SMTP (Resend/SendGrid/etc.) and pasted these templates, your auth emails will be:

Reliably delivered (real SMTP, no rate limit)
Professionally branded (matches website)
Trusted by spam filters (your own domain)
The email-templates.md file stays in your repo as your branding source of truth. If you ever want to tweak something, edit the HTML in that file then re-paste into Supabase.