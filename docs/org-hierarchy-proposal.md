# Organizational Hierarchy — Feasibility & Plan

**Client request**

> Show the YSRCP organizational hierarchy for every leader. For any leader on a user's dashboard, the user should see who reports to whom — i.e. the chain above that leader, all the way up to YS Jagan.

The reference image the client shared shows six tiers:

```
                              YS Jagan  (President)
                                /        \
                NRI Coordinator         Regional Coordinators (x5)
                  (Samba)                    |
                    |                  District In-charges
              Country Convenors            (per district)
              USA / UK / CA / AU / UAE         |
                                          Assembly In-charges
                                            (per constituency)
```

This document tells you, in plain terms, **what's already built**, **what's missing**, **how big the job is**, **what could go wrong**, and **what the client needs to decide before we start**.

---

## 1. What we already have

Our database stores leaders in two tables: a master record per person (`leaders_master`) and one or more "assignment" rows that say which areas they cover (`leader_assignments`). Today these assignments use four roles:

| Role in our system | Equivalent in the client image | Status |
|---|---|---|
| Global Coordinator | NRI Coordinator (Samba) | Stored as one person who is visible to every user. Functionally the same as the image's "NRI Coordinator". |
| Regional Coordinator | Regional Coordinator | Already supports multiple districts per leader (the image shows 2 districts each, but our schema is flexible — some can cover 5). |
| District President | District In-charge | Stored per district + constituency. |
| Assembly Coordinator | Assembly In-charge | Stored per district + constituency. |

The seed file we already loaded (`new_16_seed_master_data.sql`) has:
- 1 Global Coordinator (Aluru Sambasiva Reddy)
- 25 Regional Coordinator entries (5 leaders, each covering several districts)
- 25 District Presidents
- ~175 Assembly Coordinators

**So three of the six tiers in the image are already in production data.** The hierarchical *links* between them are implicit — we know an Assembly In-charge "reports to" the District In-charge of the same district + constituency, who in turn "reports to" the Regional Coordinator of that district, but no row stores a direct parent ID. That's actually fine — we can compute the chain on the fly without changing the schema.

---

## 2. What's missing

Three concrete gaps:

**A. Tier 1 — "President" as a role.**
YS Jagan currently exists in the data only as one of the Assembly Coordinators (Pulivendula). There's no "President" role at the top of the hierarchy. We'd add `President` as a fifth role, with a single leader row.

**B. Tier 3 — "Country Convenor" as a role.**
This is a brand-new role and a brand-new scoping dimension. It's organized by *country of residence*, not by Indian state/district. There are 5 of them in the image: USA, UK, Canada, Australia, UAE.

To support this we need:
- A new role label: `Country Convenor`.
- A new column on `leader_assignments` called `country` (text, nullable). Filled when role is Country Convenor; empty otherwise.
- The actual people — names and contact numbers, one per country.

**C. Country Convenor data we don't have.**
The 5 names + WhatsApp numbers + photos for the USA / UK / Canada / Australia / UAE convenors. The client must provide these — they are not in any seed file.

---

## 3. Two ways to display the hierarchy

We have two options, with very different scope.

### Option A — "Reports to" trail on each leader card  *(recommended)*

When a user opens **Leadership Connect**, each leader's card gets a small chain underneath them:

> **Sri Boddeti Prasad** — District President, Anakapalle  
> *Reports to:* Sri Kurasala Kannababu (Regional Coordinator) → YS Jagan (President)

For a USA-based user, the global side reads:

> **USA Convenor — <name>**  
> *Reports to:* Aluru Sambasiva Reddy (NRI Coordinator) → YS Jagan (President)

The chain is computed live from the existing tables — no new joins or denormalised data. Each user sees only the chain that's relevant to *them*, which is what they actually care about.

**Pros**
- Works for every user immediately, no zooming required.
- Mobile-friendly out of the box.
- Reuses everything already in the database.
- Fast to build (about 1 working day).

**Cons**
- Doesn't reproduce the image as a single visual diagram. (We'd be conveying the same information, just one chain at a time.)

### Option B — Full org-chart page  *(closer to the image)*

A new tab in the user dashboard called something like **Party Structure**, rendering the entire 41-node tree from the image, with the user's own position highlighted. Click a node to expand its sub-tree.

**Pros**
- Matches the visual the client sent.
- One screen shows the whole organisation.

**Cons**
- 41+ boxes is hard to fit on a phone screen — needs pinch-zoom / pan, hand-rolled SVG, or a charting library.
- Most users only care about their own chain, not the whole 41 nodes — so it's a "wow" feature rather than a daily-use feature.
- Adds 1-2 extra days of build time on top of Option A.
- Has to be redesigned for mobile separately from desktop.

### Recommendation

Build **Option A first**. It answers the client's actual question ("who is up on whom?") for every user, in every context, with no extra screens. Add **Option B later** if the client still wants a single-page diagram once Option A is live.

---

## 4. Effort estimate

Assuming the client supplies the missing Country Convenor data:

| Task | Effort |
|---|---|
| Database migration: add `country` column, seed President row, seed 5 Country Convenor rows (or scaffolding for them) | ~1 hour |
| Admin Master Data UI: extend the role list with President / NRI Coordinator / Country Convenor; show country picker when role = Country Convenor | ~2-3 hours |
| User dashboard: compute the upward chain for each leader; render the "Reports to" trail on each card | ~2-3 hours |
| QA on real data + browser/mobile pass | ~1 hour |
| **Total — Option A** | **~1 working day** |
| Optional: full org-chart tree page (Option B) | **+1-2 working days** |

---

## 5. Challenges and risks

**The image shows "always 2 District In-charges per RC"** — that's only true illustratively. In our real data, a single Regional Coordinator can cover anywhere from 1 to 5 districts (e.g., Y.V. Subba Reddy currently covers 5). Our breadcrumb will display the **truthful** structure based on what's in the database, not the simplified 2-per-RC pattern in the image. The client should be told this so they don't expect a perfect 1:2:2 fan-out everywhere.

**Country Convenor data is currently empty.** Until the client supplies the 5 names and numbers, NRI users won't have a country-specific convenor — they'll see the NRI Coordinator and the President but no in-between tier. We can either (a) keep that tier blank until the data arrives, or (b) create stub rows ("Country Convenor — to be assigned") so the structure renders fully. We recommend (a) — empty is more honest than placeholder names.

**The chain is *computed*, not *configured*.** A leader's parent is inferred from their location: the AC of Tekkali "reports to" whichever DP is registered for Tekkali in Srikakulam district. If admin creates an AC for a constituency where no DP exists yet, the chain will skip a tier ("…reports to: Regional Coordinator"). That's the correct behaviour — we won't fabricate a missing parent — but the client should know about it. The fix is to make sure every district has a DP and every constituency has an AC, which is already the existing data-entry workflow.

**Editing roles cascades.** If an admin demotes a leader from RC to AC in Master Data, every breadcrumb that previously said "reports to: <them>" updates instantly across the site, because the chain is computed live. This is generally a feature (no stale data), but the client should know there's no "approval workflow" for hierarchy changes — admins have full direct control.

**Multiple matches.** Some leaders show up in multiple roles in the seed (e.g., the District President of Pulivendula is also Y.S. Jagan, who is the President at tier 1). When this happens we'll need a deterministic rule to decide which version is "above" the other. We propose: tier-1 (President) always wins; below that, the most-specific scope wins (constituency over district over region). The client should confirm.

---

## 6. Decisions the client needs to make

Before we start the build, please confirm the following:

1. **Option A or Option B?** Reports-to trail on every card (recommended) — or full org-chart page on a separate tab — or both?
2. **The 5 Country Convenor entries.** For each of USA / UK / Canada / Australia / UAE we need:
   - Full name
   - WhatsApp number (with country code)
   - Optional: profile photo, secondary number
3. **Should YS Jagan be added as "President" in our leader directory?** If yes, we'll add a new role and a row for him. If the client prefers him to stay implicit (everyone knows he's the President; no need for a row), we can hard-code "YS Jagan — President" at the top of every breadcrumb without a database row.
4. **Should the Global Coordinator (Aluru Sambasiva Reddy) be relabelled as "NRI Coordinator"** to match the client's terminology? It's the same person playing the same role; only the label on screen changes.
5. **NRI users — what should they see in their leader cards?**
   - Today: the Global / NRI Coordinator and (if their Indian address is filled) their Indian-side leaders.
   - With this feature: also their Country Convenor based on `country_of_residence`.
   - Confirm this is desired.

---

## 7. What we will *not* do as part of this feature

To keep the scope tight and the timeline honest:

- We won't build an editor for the *hierarchy* itself — admins continue to edit leaders one at a time, and the chain reorganises automatically based on those edits.
- We won't add an org-chart export (PDF/PNG of the tree). Possible follow-up.
- We won't notify users when their reporting line changes. The new chain just appears on their next dashboard load.
- We won't add per-tier permissions (e.g. "Country Convenors can edit users in their country"). Out of scope; can be discussed later if the client wants it.

---

## TL;DR for the client

> The technology can do this. The data can do this. We are missing 5 Country Convenor records and a small "President" entry, both of which the client must supply. Once those are in hand, this is a one-day build for a clean "reports to" chain on every leader card — which is what users actually want. A full visual org-chart page like the reference image is possible but adds 1-2 extra days and is mostly a "wow" surface; we suggest doing it later, if at all.

When the client confirms Option A and provides the 5 Country Convenor entries, we can ship this in one working day.
