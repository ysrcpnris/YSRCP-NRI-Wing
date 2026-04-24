# Credits & Referrals — How It Works

This document explains the credit economy and referral tree in the NRI Wing portal:
what a **user** can do, what an **admin** can do, and how the underlying system stays
trustworthy.

---

## 1. The big picture

Every registered user has a **credit balance**. Credits are earned through referrals
and a one-time signup bonus, and can be spent by redeeming **perks** that the admin
publishes. Every credit that moves in or out is recorded as a row in a **ledger** —
nothing is ever silently changed, so the balance is always explainable.

Each user also has two IDs:

| ID type | Example | Where it's used |
|---|---|---|
| **Public User Code** | `NRI-8K3P-2M` | Shown in the dashboard and admin panels; the human-readable ID to reference a user |
| **Referral Code** | `QR5MFGQJ` | Embedded in the share link (`/ref/QR5MFGQJ`); used to attribute new signups |

Both are **generated automatically by the database** when a profile is created — users
never have to pick one.

---

## 2. How credits are earned

There are three ways a user's balance goes up:

| Reason | Credits | When it's posted |
|---|---|---|
| **Signup bonus** | **+25** | Once, the moment the profile is created after email verification |
| **Active referral** | **+50** | Every time someone signs up using your link and verifies their email |
| **Passive referral** | **+10** | When someone your referral referred *also* brings in a new user |

The values above are the defaults. Admins can change them at any time from the
**Rewards → Reward Values** page; the new numbers apply to future events, and past
ledger entries are never rewritten.

### 2.1 Active vs. passive referrals

```
  You
   │
   │ (active referral → you earn +50)
   ▼
  Bob
   │
   │ (active referral → Bob earns +50)
   │ (passive referral → YOU earn +10)
   ▼
  Carol
```

- **Active** = someone signed up with your link directly.
- **Passive** = someone signed up with one of your active referrals' link (one level down the tree).

Passive rewards stop after one level — it's not infinite MLM.

---

## 3. How credits are spent

Admins publish **perks** in the catalogue (e.g. *"Meet & Greet Invite — 500 credits"*).
Users browse the catalogue in their **Refer & Earn** tab. If their balance is high
enough, the **Redeem** button is enabled. Clicking it creates a **pending redemption
request** that the admin sees in their dashboard.

When the admin **approves** it, the credits are deducted atomically and the user's
balance updates in real time. If the admin **rejects** it, nothing is deducted; the
user just sees a "Rejected" status with the admin's note.

**Users cannot spend below zero.** The balance check happens at the moment of
approval, against a locked database row, so even concurrent approvals are safe.

---

## 4. What a USER can do

The user-side experience lives in the **Dashboard**.

### 4.1 Your User ID
- Shown in the header of your dashboard (e.g. `ID: NRI-8K3P-2M`).
- Click to copy. Share it when raising support tickets so the admin can look you up instantly.

### 4.2 Your credit balance
- Displayed as a pill next to your User ID: `⚡ 125 credits`.
- Updates **live** — if you earn a referral while the tab is open, the number ticks up without a page refresh.

### 4.3 Refer & Earn tab
This is your personal referral and credits hub.

| Section | What it does |
|---|---|
| **Top banner** | Copy your `/ref/YOURCODE` link with one click |
| **Current Balance** card | Big readout of your total credits and a reminder of the payout rates |
| **Recent Credit Activity** | Last 10 ledger entries — what you earned, why, and when |
| **Rewards Catalogue** | Browse perks the admin has published; click **Redeem** on anything you can afford |
| **My Redemptions** | See the status of your redemption requests (pending / approved / rejected) with admin notes |
| **Active Referrals** table | Everyone who signed up using your direct link |
| **Passive Tree** table | Everyone your referrals referred (one level deep) |

### 4.4 Sharing your link
- Copy the link from Refer & Earn, or just the 8-character code.
- Works on any domain — locally it's `http://localhost:5173/ref/XXX`; in production it'll be your production domain, automatically.
- Clicking the link stores the code, redirects to the register page, and auto-credits once the new user verifies their email.

### 4.5 What you cannot do
- You can't credit yourself by using your own link.
- You can't redeem a perk you can't afford.
- You can't edit your balance — only approved admin adjustments and the automatic triggers can move credits.
- You can't change your referral code or User Code — they're permanent.
- You can delete a **pending** redemption you submitted by mistake; you can't delete one after admin decision.

---

## 5. What an ADMIN can do

Admins have a dedicated sidebar with four credit-related pages:

### 5.1 User directory (main admin home)
Every user row now shows:
- **User ID** (the `NRI-XXXX-XX` code). Hover for their internal UUID.
- **Credits** (current balance).

### 5.2 Credits page
A user-lookup tool for support and audits.

| Action | What it does |
|---|---|
| **Search** by User ID, email, or name | Finds the user instantly |
| **View ledger** | Shows that user's last 50 credit transactions with date / reason / note / delta |
| **Post adjustment** | Add or subtract credits manually with a note (e.g. "+20 as apology for missed event", "-50 fraud reversal") |

**Important:** adjustments go through the same ledger as everything else. To *reverse*
a mistake you don't edit a row — you post the opposite delta. That's how you preserve
the audit trail.

The admin cannot post an adjustment that would drive the balance below zero; the
system will reject it with a friendly message.

### 5.3 Rewards page (three tabs)

**Tab: Redemptions** (default view)
- Pending queue by default (toggle to see all)
- Each pending request shows the user's name, User ID, current balance, perk name, cost
- Type an optional note and click **Approve** or **Reject**
- Approval atomically deducts the credits. Rejection posts no ledger entry.

**Tab: Perks**
- Add, edit, hide, or delete perks from the catalogue
- Each perk has: name, description, cost in credits, active/inactive toggle
- Inactive perks are hidden from users but existing requests stay valid (admin can still act on them; approval is blocked if the perk was deactivated — the admin should reject instead)
- Perks with existing redemptions can't be hard-deleted (preserves audit history)

**Tab: Reward Values**
- Edit the payout for `active`, `passive`, and `signup`
- Changes apply to future events; past ledger entries are untouched
- Values must be non-negative

### 5.4 Support Teams page
Not credits-related, but worth noting: the "Assign Team" dropdown in the Assistance
page is populated from here. Admins can add/remove/rename teams.

### 5.5 What an admin CANNOT do
- **Cannot edit past ledger rows.** RLS blocks UPDATE/DELETE on `credit_transactions`.
  Fix history by posting a correcting row.
- **Cannot drive a user's balance negative.** CHECK constraint enforces it.
- **Cannot delete a perk that has redemption history** — must hide it instead.
- **Cannot approve a redemption when the user's balance has since dropped below the cost** — the trigger will refuse.

---

## 6. Data model reference

### `profiles` (additions from this system)
| Column | Meaning |
|---|---|
| `public_user_code` | The `NRI-XXXX-XX` ID shown in UI. Auto-generated. |
| `referral_code` | The 8-char code in share links. Auto-generated. |
| `credits_balance` | Denormalized sum of ledger deltas. Maintained by trigger. Guaranteed ≥ 0. |

### `referrals`
| Column | Meaning |
|---|---|
| `referrer_id` | Who gets the credit |
| `referred_id` | The newly signed-up user |
| `source` | `active` or `passive` |

A `CHECK` prevents self-referral (`referrer_id <> referred_id`), and a `UNIQUE`
constraint on `(referrer_id, referred_id, source)` prevents duplicate credit posts.

### `credit_transactions` (the ledger)
| Column | Meaning |
|---|---|
| `user_id` | Whose balance is affected |
| `delta` | Positive (earn) or negative (spend). Never zero. |
| `reason` | One of: `signup`, `active`, `passive`, `admin_adjustment`, `redemption` |
| `ref_id` | Source event (referral id / redemption id / admin user id) |
| `note` | Free-text, optional |
| `created_at` | Timestamp |

Append-only. RLS grants SELECT + INSERT only.

### `referral_rewards`
Config table. `reason` (PK) maps to `credits`. Seeded with `active=50, passive=10, signup=25`.
Admin-editable; non-negative.

### `reward_perks`
Admin-defined catalogue of redeemable perks. Has `name`, `description`, `cost_credits`, `is_active`.

### `redemptions`
User-submitted redemption requests. Fields: `user_id`, `perk_id`, `perk_name` (snapshot),
`cost_credits` (snapshot), `status` (`pending`/`approved`/`rejected`), `admin_note`,
`ledger_tx_id` (links to the spend entry once approved).

---

## 7. How it stays safe (invariants)

| Invariant | Enforced by |
|---|---|
| Balance is always the exact sum of the user's ledger | Trigger on `credit_transactions` INSERT |
| Balance can never go below 0 | `CHECK (credits_balance >= 0)` on `profiles` |
| Ledger is append-only | RLS policy: no UPDATE/DELETE for anyone |
| Ledger entries are non-zero | `CHECK (delta <> 0)` |
| Nobody can self-refer | `CHECK (referrer_id <> referred_id)` + client guard |
| No duplicate active/passive post for the same pair | `UNIQUE (referrer_id, referred_id, source)` |
| No concurrent double-spend | Row lock + balance check inside redemption trigger |
| Signup bonus can't fire twice | Existence-check inside the trigger |
| Mobile numbers are unique even across formatting variants | Normalization trigger + partial UNIQUE index |
| Users can only redeem what they can afford | Trigger-side balance check on approval |
| Admins can't accidentally orphan approved redemptions | `ON DELETE RESTRICT` from `reward_perks` |

Every invariant lives in the database, not in client code. You can open the SQL
console, poke at the tables, and the rules still hold.

---

## 8. Typical flows, end to end

### New user arrives via a referral link
1. They click `https://yourdomain/ref/QR5MFGQJ`.
2. The code goes into `localStorage`; they're redirected to `/register`.
3. They fill the form. If the mobile is already in use (in any formatting variant),
   the UI shows a friendly error up front.
4. They submit → receive an email verification link.
5. They click the link. Email verifies, session is established, and on first render
   the app creates the `profiles` row.
6. In the same database transaction:
   - **Public User Code** and **Referral Code** are auto-generated.
   - **Signup bonus trigger** posts +25 to the new user.
7. The client's `processReferralIfNeeded` then:
   - Looks up the referrer by the stored code.
   - Rejects self-referral.
   - Inserts an **active** referral row → trigger posts **+50** to the referrer.
   - If the referrer was themselves referred, inserts a **passive** row → trigger posts **+10** to the grandparent.
8. The referrer (if they're in an open tab) sees their balance tick up live via Supabase Realtime.

### User redeems a perk
1. User opens **Refer & Earn**, finds a perk they can afford, clicks **Redeem**.
2. A `redemptions` row is created as `pending`.
3. Admin opens **Rewards → Redemptions**, reviews, clicks **Approve** (with or without a note).
4. Database trigger:
   - Verifies the perk is still active.
   - Row-locks the user's profile.
   - Verifies balance is still ≥ cost.
   - Inserts a `-cost` ledger entry → balance trigger deducts it.
5. User sees status flip to **Approved** in real time, with the admin's note.

### Admin fixes a mistake
- **Gave the wrong person a bonus** → open Credits page, find the user, post a negative `admin_adjustment` with a note.
- **User reports missing credits** → open Credits, view ledger, see the full history, post a corrective adjustment if legitimate.
- **Published a perk with the wrong price** → open Rewards → Perks → Edit. Already-submitted redemptions keep their snapshotted cost so nothing retroactively changes.

---

## 9. Migrations to apply (in order)

Run these in the Supabase SQL editor the first time you set this up:

```
supabase/migrations/new_05_mobile_unique.sql
supabase/migrations/new_06_support_teams.sql
supabase/migrations/new_07_credits_referrals.sql
supabase/migrations/new_08_rewards_and_redemptions.sql
supabase/migrations/new_09_robustness_fixes.sql
```

After migration 08, the `credit_transactions` and `profiles` tables are added to the
Supabase Realtime publication, so the client can subscribe and see balances update
without a refresh.

---

## 10. FAQ

**Q: Can I transfer credits between users?**
Not directly from the UI. An admin can simulate a transfer by posting `-N` on one user and `+N` on another, both with matching notes.

**Q: Do credits expire?**
Not today. If you want expiry, it would be a scheduled job that posts negative adjustments — easy to add later.

**Q: What stops a user from creating 100 fake accounts with free email addresses?**
Credits only post after **email verification**, which blocks the easiest case. The mobile-number uniqueness blocks the common case. Beyond that, fighting email-farm fraud requires account velocity limits, which we haven't added — let me know if you want that.


**Q: Can I see who referred whom without clicking into each user?**
Not in the current admin UI. Admin currently sees per-user ledger + per-user Active/Passive tables. A global referral-tree view could be added.

**Q: What happens if Supabase Realtime is down?**
Nothing breaks; the user just has to click the "Refresh" button or reload the page to see updates. All the actual credit logic lives in the database, Realtime only pushes notifications.
