/**
 * Abroad Connect — built to docs/design/nri-wing-prototype.html
 * (screen `m-abroad`).
 *
 * TWO SCOPE DECISIONS MADE WITH THE USER, NOT ASSUMED
 *
 *   1. The mock's "City leads" table wants a named leader per
 *      INDIVIDUAL city (Frankfurt/Berlin/Munich each named, Hamburg
 *      shown vacant). Nothing in the schema tracks leadership below
 *      the chapter level — a chapter_lead covers a whole multi-city
 *      chapter. Decision: show the chapter_lead(s) for the member's
 *      own chapter only. No per-city table, no fabricated vacancies
 *      for a role level that was never designed to exist.
 *
 *   2. WhatsApp "Joined"/"Join" state and the "you're in 2" stat have
 *      no membership table anywhere — my_social_handles() only ever
 *      returned links. Decision: unchanged from the existing
 *      component. Links only, restyled to match this screen.
 *
 * LEADERSHIP DATA — my_chapter_leadership() (20260805237000)
 *   Country Coordinator, this member's own chapter_lead, and
 *   team_leads (Student Assistance, Job Assistance, ... — the mock's
 *   "Teams that assist") covering their chapter or country. This maps
 *   onto member_roles, which already had a `title` field documented
 *   with the example "Student Visa Navigator" — built for exactly
 *   this, never surfaced before. Contact info is shown by design: a
 *   member who takes one of these roles is meant to be reachable
 *   through it, same precedent as leaders_master.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type LeadershipRow = {
  tier: "coordinator" | "chapter_lead" | "team_lead";
  role: string;
  title: string | null;
  leader_name: string;
  mobile: string | null;
  whatsapp: string | null;
  since: string;
};

type Stats = {
  country_member_count: number | null;
  chapter_name: string | null;
  chapter_member_count: number | null;
  next_event_title: string | null;
  next_event_date: string | null;
};

type Handle = {
  scope: "national" | "chapter";
  platform: "x" | "facebook" | "instagram" | "youtube" | "whatsapp" | "telegram" | "website";
  label: string;
  url: string;
  handle: string | null;
  chapter: string | null;
  member_count: number | null;
  count_as_of: string | null;
  description: string | null;
};

const PLATFORM_ICON: Record<Handle["platform"], string> = {
  x: "𝕏", facebook: "f", instagram: "◉", youtube: "▶", whatsapp: "◆", telegram: "✈", website: "🌐",
};

const TIER_LABEL: Record<LeadershipRow["tier"], string> = {
  coordinator: "Country Coordinator",
  chapter_lead: "Chapter Lead",
  team_lead: "Team Lead",
};

const STRIPE: Record<string, string> = {
  0: "var(--saffron)", 1: "var(--navy)", 2: "var(--green)", 3: "var(--crimson)",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function waLink(number: string, name: string) {
  const digits = number.replace(/\D/g, "");
  const text = encodeURIComponent(`Namaskaram ${name}, I am a fellow YSRCP NRI Wing member.`);
  return `https://wa.me/${digits}?text=${text}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function LeadershipCard({ row }: { row: LeadershipRow }) {
  const contact = row.whatsapp || row.mobile;
  return (
    <div className="row" style={{ gap: 11, alignItems: "flex-start" }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", flex: "0 0 40px", fontSize: 13,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700,
        background: "linear-gradient(140deg, var(--navy) 0%, var(--green-deep) 100%)",
      }}>
        {initials(row.leader_name)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>
          {row.title || TIER_LABEL[row.tier]}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{row.leader_name}</div>
        <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>since {fmtDate(row.since)}</div>
        {contact ? (
          <a
            className="pt-btn pt-btn-go pt-btn-sm" style={{ marginTop: 8, textDecoration: "none", display: "inline-flex" }}
            href={waLink(contact, row.leader_name)} target="_blank" rel="noreferrer"
          >
            Message
          </a>
        ) : (
          <div className="hint" style={{ marginTop: 8 }}>No contact on file</div>
        )}
      </div>
    </div>
  );
}

export default function MyAbroadConnect() {
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [ldr, st, h] = await Promise.all([
      supabase.rpc("my_chapter_leadership"),
      supabase.rpc("my_chapter_stats"),
      supabase.rpc("my_social_handles"),
    ]);
    if (ldr.error || st.error || h.error) {
      console.error(ldr.error || st.error || h.error);
      setFailed(true);
    } else {
      setLeadership((ldr.data as LeadershipRow[]) ?? []);
      setStats(((st.data as Stats[]) ?? [])[0] ?? null);
      setHandles((h.data as Handle[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }
  if (failed) {
    return <div className="pt-note warn">We couldn't load Abroad Connect just now. Please refresh.</div>;
  }

  const coordinator = leadership.find((r) => r.tier === "coordinator");
  const chapterLead = leadership.filter((r) => r.tier === "chapter_lead");
  const teamLeads = leadership.filter((r) => r.tier === "team_lead");
  const chapterHandles = handles.filter((h) => h.scope === "chapter");
  const nationalHandles = handles.filter((h) => h.scope === "national");

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-sec-title">
        Abroad Connect{stats?.chapter_name ? ` · ${stats.chapter_name}` : ""}
      </div>
      <p className="pt-sec-note">
        The wing's own team where you live. These are the people who answer first —
        before anything needs to travel back to Andhra Pradesh.
      </p>

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 18 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Members in your country</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats?.country_member_count ?? "—"}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Members in your chapter</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats?.chapter_member_count ?? "—"}</div>
          {!stats?.chapter_name && <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>No chapter for your city yet</div>}
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Next chapter event</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: stats?.next_event_date ? 19 : 29, fontWeight: 600, paddingTop: stats?.next_event_date ? 7 : 0 }}>
            {stats?.next_event_date ? fmtDate(stats.next_event_date) : "—"}
          </div>
          {stats?.next_event_title && <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{stats.next_event_title}</div>}
        </div>
      </div>

      <div className="pt-page">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>{stats?.chapter_name ? `${stats.chapter_name} chapter` : "Your chapter"}</h3>
                <div className="sub">Who holds which role</div>
              </div>
            </div>
            <div className="pt-card-b">
              {!coordinator && chapterLead.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>
                  No coordinator or chapter lead on file yet for your area.
                </div>
              ) : (
                <div className="pt-grid pt-g2">
                  {coordinator && <LeadershipCard row={coordinator} />}
                  {chapterLead.map((r, i) => <LeadershipCard key={i} row={r} />)}
                </div>
              )}
            </div>
          </section>

          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>Teams that assist</h3>
                <div className="sub">Named people, not a shared inbox</div>
              </div>
            </div>
            <div className="pt-card-b">
              {teamLeads.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>
                  No functional teams appointed for your area yet.
                </div>
              ) : (
                <div className="pt-grid pt-g2">
                  {teamLeads.map((r, i) => {
                    const contact = r.whatsapp || r.mobile;
                    return (
                      <div key={i} style={{
                        display: "flex", gap: 10, padding: "12px 13px",
                        border: "1px solid var(--line)", borderRadius: "var(--r)", background: "var(--card)",
                      }}>
                        <div style={{ width: 3, borderRadius: 3, alignSelf: "stretch", flex: "0 0 3px", background: STRIPE[i % 4] }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{r.title || "Team Lead"}</h4>
                          <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{r.leader_name}</div>
                          {contact && (
                            <a className="pt-btn pt-btn-out" style={{ marginTop: 8, padding: "5px 11px", fontSize: 12, textDecoration: "none", display: "inline-flex" }}
                               href={waLink(contact, r.leader_name)} target="_blank" rel="noreferrer">
                              Message
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="pt-rail" style={{ position: "sticky", top: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>Follow the party</h3>
                <div className="sub">Official handles, and your chapter's own</div>
              </div>
            </div>
            <div className="pt-card-b">
              {nationalHandles.length > 0 && (
                <>
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, marginBottom: 9 }}>
                    YSRCP · Official
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 14 }}>
                    {nationalHandles.map((h) => (
                      <a key={`${h.platform}-${h.label}`} href={h.url} target="_blank" rel="noreferrer"
                         className="pt-btn pt-btn-out" style={{ textDecoration: "none", fontSize: 12.5, padding: "7px 11px" }}>
                        {PLATFORM_ICON[h.platform]} {h.handle || h.label}
                      </a>
                    ))}
                  </div>
                </>
              )}
              {chapterHandles.length > 0 && (
                <>
                  <div className="pt-divider" style={{ margin: "0 0 13px" }} />
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, marginBottom: 9 }}>
                    YSRCP NRI Wing{h_chapter(chapterHandles)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {chapterHandles.map((h) => (
                      <div key={`${h.platform}-${h.label}`} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line-2)" }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, background: "rgba(37,211,102,.14)",
                          display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px",
                        }}>
                          {PLATFORM_ICON[h.platform]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <a href={h.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600, fontSize: 13, textDecoration: "none" }}>
                            {h.label}
                          </a>
                          <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                            {h.handle || h.description}
                            {h.member_count != null && (
                              <> · ≈{h.member_count}{h.count_as_of ? ` as of ${fmtDate(h.count_as_of)}` : ""}</>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {nationalHandles.length === 0 && chapterHandles.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No channels on file.</div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function h_chapter(rows: Handle[]) {
  const name = rows[0]?.chapter;
  return name ? ` · ${name}` : "";
}
