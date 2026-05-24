# About Encrypting Personal Information

Hi,

You asked us to add SHA-256 encryption with salting on the personal information we store — mobile numbers, emails, and names. I wanted to take a moment to explain what's actually going on under the hood, because I think there's a small mix-up between two different things that sound similar but do very different jobs. Both protect data, but they're meant for different situations.

## SHA-256 with salting is what we already use — for passwords

SHA-256 with salting is a one-way scramble. You put a word in, you get back a long random-looking string, and there's no way to ever turn that string back into the original word. It's a one-way street.

That's perfect for passwords, and we already do this. When someone signs up, we never store their actual password anywhere. We scramble it with salting and store only the scrambled version. When they log in next time, we scramble whatever they typed and check whether the two scrambled strings match. We never need to know what their real password is — we just need to verify it. Even if our entire database leaked tomorrow, nobody could read those passwords back. That's already in place.

## But the same approach doesn't fit mobile, email, or name

Here's the thing — those fields aren't passwords. They're information we have to *show back* to the user and to admins. If we applied the same one-way scramble to them, the website would stop working.

Think about a few real scenarios:

- A user logs in and we want to greet them with "Welcome, Ravi Kumar." But the database only has a scrambled string like `8a4f9c2e1b7d…`, and there's no way to turn it back into "Ravi Kumar." We'd literally have to print the scramble on the screen.
- An admin opens the All Users page or downloads the Excel export. Every row would show those random strings instead of real names, emails, and mobiles. The export would be useless.
- A user clicks "Forgot password." We need to email them a reset link — but the email column in the database is a scramble. We can't send an email to a scramble.
- An admin types a mobile number into the search box to find one specific user. The database has the scrambled version, not the number, so the search would never match anything.

So while the idea is well-intentioned, the actual technique — SHA-256 with salting — wouldn't fit this kind of data.

## What you probably actually want is encryption (which is different) — and we already have it

What protects data like emails and names is called *encryption*, not hashing. Encryption is a two-way lock. We can store data in scrambled form, and then when our app needs to display it to the right person, we can unscramble it with a key that only we have. To anyone without the key — a hacker, a backup thief, a curious database admin — the data looks like nonsense.

The good news is this is already in place on our setup, automatically, through Supabase (our backend provider). Here's exactly what's protecting your users' data right now:

**The whole database is encrypted on disk with AES-256.** AES-256 is the same encryption standard the US government uses for classified documents. If someone stole a hard drive from the Supabase data centre, or got hold of a backup file, the contents would be unreadable scrambled bytes. The key that unlocks it is held inside Amazon's hardware security modules, not stored alongside the data.

**Every single connection between the user's browser and our database is encrypted with TLS 1.3.** That's the strongest version of TLS available today. So whether a user is signing up from coffee-shop Wi-Fi or a hotel network, nobody between them and our servers can read what's flowing — not their name, not their mobile number, nothing.

**Passwords are hashed with bcrypt and a per-user salt.** This is the SHA-256-with-salting equivalent done correctly for passwords. Even our own engineering team can't read user passwords; we can only verify them.

**On top of all that, we have Row Level Security inside the database itself.** This is a rule that says "even if you have a valid login key, you can only see your own rows of data." So if a user's session token somehow leaked, the attacker still couldn't read anyone else's data — the database itself refuses to return it.

## Why this is enough

Every major data-protection standard accepts this combination as the correct way to protect personal information. ISO 27001, SOC 2, India's IT Act 2000, the new Digital Personal Data Protection Act 2023 — they all describe their encryption requirement in terms of "encryption in transit" (which is our TLS 1.3) and "encryption at rest" (which is our AES-256 on disk), plus access controls (which is our Row Level Security). All three boxes are ticked.

If you ever do come across a specific regulator or auditor saying "you must also encrypt individual columns inside the database," that's a much heavier process and it usually only applies to things like medical records, banking information, or government classified data. For a community contact directory like ours — names, emails, mobile numbers — the protections we already have are appropriate. Adding another encryption layer on top wouldn't actually reduce any real risk; it would just slow things down and make features like search, password reset, and Excel export much harder to maintain.

## Short version

- The SHA-256 + salting approach is what we already use, but specifically for passwords (because passwords don't need to be displayed back).
- For mobile, email, and name, we use encryption (which is the right tool for data we need to read back) — and it's already running automatically through Supabase: AES-256 on disk, TLS 1.3 over the network, bcrypt for passwords, and Row Level Security on top.
- This combination satisfies every major data-protection law and audit standard relevant to our portal.

Happy to walk through any of this in more detail if you'd like. The bottom line: the goal you're aiming for is already met — it's just implemented under names that don't include the words "SHA-256 with salting," because those words specifically describe a tool for a different job.

— Engineering team
