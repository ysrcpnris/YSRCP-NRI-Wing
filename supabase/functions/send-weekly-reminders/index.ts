import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Weekly reminder emails, two cohorts:
 *   - "Not registered": an auth.users row exists (they started signup)
 *     but email_confirmed_at is still null. Tracked in
 *     public.registration_reminders (no profiles row exists yet for
 *     these accounts, so there's nothing on profiles to track against).
 *   - "Incomplete profile": profiles exists, onboarding_completed_at
 *     is null. Tracked on profiles.profile_reminder_last_sent_at.
 *
 * Rate limit is enforced here, not by cron cadence alone — this
 * function is meant to be triggered weekly, but every recipient is
 * still individually checked against a 7-day cooldown before sending,
 * so a manual re-trigger (or a misconfigured schedule) can never send
 * more than once per person per week.
 *
 * A send is only recorded as sent (and the cooldown started) after
 * Resend actually accepts it — a failed send (e.g. RESEND_API_KEY not
 * configured yet, or the account is over quota) leaves that person
 * untouched so the next run retries them, rather than silently losing
 * them for a week.
 *
 * Auth: this function is deployed with --no-verify-jwt (matching every
 * other function in this project) and instead checks its own shared
 * secret, since the caller is a pg_cron job, not a member session.
 */

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") || "YSRCP NRI Wing <onboarding@resend.dev>";
const APP_URL = Deno.env.get("APP_URL") || "https://ysrcp-nri-wing-staging.vercel.app";

const ONE_HOUR_MS = 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") as string,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string
);

type SendResult = { sent: number; skipped_cooldown: number; failed: number; errors: string[] };

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!resp.ok) {
    return { ok: false, error: `Resend ${resp.status}: ${await resp.text()}` };
  }
  return { ok: true };
}

async function remindUnverified(): Promise<SendResult> {
  const result: SendResult = { sent: 0, skipped_cooldown: 0, failed: 0, errors: [] };
  const cutoff = Date.now() - ONE_HOUR_MS;

  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) {
      result.errors.push(`listUsers: ${error.message}`);
      break;
    }
    const users = data.users;
    if (users.length === 0) break;

    for (const u of users) {
      if (u.email_confirmed_at) continue; // already verified — belongs to the other cohort or done
      if (!u.email) continue;
      if (new Date(u.created_at).getTime() > cutoff) continue; // give them a chance to finish on their own first

      const { data: existing } = await supabaseAdmin
        .from("registration_reminders")
        .select("last_sent_at, send_count")
        .eq("user_id", u.id)
        .maybeSingle();

      if (existing && Date.now() - new Date(existing.last_sent_at).getTime() < SEVEN_DAYS_MS) {
        result.skipped_cooldown++;
        continue;
      }

      const name = (u.user_metadata?.first_name as string | undefined) || "there";
      const { ok, error: sendErr } = await sendEmail(
        u.email,
        "Finish setting up your YSRCP NRI Wing account",
        `<p>Hi ${name},</p>
         <p>You started creating your YSRCP NRI Wing account but haven't verified your email yet.
         Verifying only takes a minute, and it's the only thing standing between you and the rest of the wing.</p>
         <p><a href="${APP_URL}">Finish verifying your account</a></p>
         <p>If you didn't try to sign up, you can safely ignore this email.</p>`
      );

      if (!ok) {
        result.failed++;
        result.errors.push(`${u.email}: ${sendErr}`);
        continue;
      }

      result.sent++;
      if (existing) {
        await supabaseAdmin
          .from("registration_reminders")
          .update({ last_sent_at: new Date().toISOString(), send_count: existing.send_count + 1 })
          .eq("user_id", u.id);
      } else {
        await supabaseAdmin
          .from("registration_reminders")
          .insert({ user_id: u.id, email: u.email });
      }
    }

    if (users.length < perPage) break;
    page++;
  }

  return result;
}

async function remindIncompleteProfiles(): Promise<SendResult> {
  const result: SendResult = { sent: 0, skipped_cooldown: 0, failed: 0, errors: [] };
  const cooldownCutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  // role='admin' is excluded: admin accounts never go through the member
  // onboarding wizard at all, so onboarding_completed_at is structurally
  // always null for them — that's not an incomplete profile, it's just
  // how admin accounts are represented. Caught live against staging:
  // the admin fixture (t.ae.a) matched this query before this exclusion.
  const { data: rows, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, first_name, profile_reminder_last_sent_at")
    .is("onboarding_completed_at", null)
    .neq("role", "admin")
    .or(`profile_reminder_last_sent_at.is.null,profile_reminder_last_sent_at.lt.${cooldownCutoff}`);

  if (error) {
    result.errors.push(`profiles query: ${error.message}`);
    return result;
  }

  for (const p of rows ?? []) {
    if (!p.email) continue;

    const { ok, error: sendErr } = await sendEmail(
      p.email,
      "Complete your YSRCP NRI Wing profile",
      `<p>Hi ${p.first_name || "there"},</p>
       <p>You verified your account, but your profile isn't finished yet — a few required fields
       are all that stand between you and your dashboard, including which constituency connects
       you to your local coordinator.</p>
       <p><a href="${APP_URL}/complete-profile">Finish your profile</a></p>`
    );

    if (!ok) {
      result.failed++;
      result.errors.push(`${p.email}: ${sendErr}`);
      continue;
    }

    result.sent++;
    await supabaseAdmin
      .from("profiles")
      .update({ profile_reminder_last_sent_at: new Date().toISOString() })
      .eq("id", p.id);
  }

  return result;
}

serve(async (req) => {
  const auth = req.headers.get("Authorization") || "";
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const [unverified, incomplete] = await Promise.all([
    remindUnverified(),
    remindIncompleteProfiles(),
  ]);

  return new Response(
    JSON.stringify({ ok: true, unverified, incomplete }),
    { headers: { "Content-Type": "application/json" } }
  );
});
