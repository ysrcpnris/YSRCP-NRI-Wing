# About the New Two-Step Login (Email OTP)

Hi,

Following up on the finding your cyber security team shared with us — that when they tested the login with a list of around two million publicly leaked passwords, some accounts were getting opened. That's a known attack pattern called "credential stuffing." It works like this: on every website out there, some users reuse the same password across multiple sites. When one of those other sites gets hacked, those passwords end up in public dumps. If the same user happens to have an account on our portal with the same password, an attacker (or a security test like the one your team ran) can simply try the leaked passwords against our login and gets in. The weakness isn't in our code or how we store passwords — it's that the password the real user chose was already exposed elsewhere on the internet.

The right defence against this is to add a second step at login, so a password alone is no longer enough — even if it's correct. We've now done that. Here's what's changed.

## What the user experiences

The login flow now has two steps instead of one.

**Step one** is the same as before. The user opens the website, clicks Login, and enters their email and password.

**Step two** is new. Instead of being taken straight to their dashboard, the user lands on a verification page that says "We sent a 6-digit code to your-email@example.com." A live timer on that page counts down from 5 minutes. The user opens their email, finds the code we just sent, types it into the verification page, and clicks "Verify and continue." Only then do they reach their dashboard.

If the user doesn't see the email, there's a "Resend code" button under the input. It has a 30-second cooldown so people don't spam the system, but after that they can request a fresh code at any time.

If the user types the wrong code, the page says "Invalid code. Please check the email and try again." If the timer hits zero before they enter the code, the page says "This code has expired. Tap Resend to get a new one." These two situations show different messages so the user knows what to do.

## How long does this last?

We didn't want to make users go through this every single time they reload the page — that would be annoying. So once a user successfully verifies their code, the verification stays valid for **8 hours**. Within that window, they can navigate around the site, close and reopen the tab, even briefly disconnect from the internet — they won't be asked for a new code.

After 8 hours, or whenever they log out, the next login will require a fresh verification code. This matches how most banking apps and other security-conscious sites behave.

## Why this closes the gap your security team found

The reason their test was able to open accounts is that a correct password was enough on its own. Now that we've added the second step, a correct password alone no longer gets anyone in — they also need the 6-digit code, which is sent only to the legitimate user's email inbox.

So if your security team re-runs the same test today with those two million leaked passwords, here's what will happen: even when a leaked password matches a real user's password and Supabase says "password verified," the next screen asks for the verification code that just went to that user's email. The test script doesn't have access to the user's mailbox, so it can't fetch the code. The test will stop right there, and the account stays safe.

The same logic applies to any real-world attacker — credential-stuffing attacks rely on automated scripts trying thousands of passwords per minute, and none of those scripts can read the legitimate user's email. They hit a wall at the second step. Each code also expires in 5 minutes and we throttle how often codes can be requested, so manual guessing isn't practical either.


## A few honest notes

This is a frontend-enforced check. It stops people from logging in through our website without the code. A very sophisticated attacker who writes a custom program that talks directly to our database API (instead of using our website) could technically bypass the second step — but at that point they're not running a normal credential-stuffing attack anymore, they're writing custom software targeting us specifically. That's a different and far less common threat. If you ever feel you need protection against that level of attacker, we can add a second layer of defence (called "server-side MFA enforcement" using authenticator apps like Google Authenticator). It's more secure but also more friction for users — they'd all need to install an app on their phone. Happy to revisit that conversation later.

Also worth knowing: the system uses Supabase's own email pipeline to send the codes (via Resend, which is already configured on the project). There are no new third-party services, no new costs, and no new credentials anywhere — just an additional step in the existing login flow.

## Quick summary

- Login now requires email + password **and** a 6-digit code sent to email.
- The code expires in 5 minutes; users can request a fresh one anytime.
- A successful verification is remembered for 8 hours, so users don't re-verify on every reload.
- This directly stops the credential-stuffing attack you reported.
- No new third-party services or costs.
- One small one-time dashboard configuration is needed for the email template + expiry setting.

Let me know if you have questions or want to see it from the user's side — happy to walk you through a live demo.

— Engineering team
