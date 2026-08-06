/**
 * Chapter Home — built to docs/design/nri-wing-prototype.html
 * (screen `c-home`).
 *
 * TWO MOCK STATS RENAMED TO WHAT THEY ACTUALLY MEASURE
 *   "Median first reply" → "Median hours to resolution". This schema
 *   has no first-response timestamp; what's real is created_at →
 *   updated_at on a case that left 'open'. Different claim, labelled
 *   as what it is.
 *   "Assistance response" → "Cases moved off Open". status <> 'open'
 *   is a real, checkable proxy for "got attention" — not proof a
 *   member was replied to.
 *
 * TWO MOCK ITEMS RENAMED TO REAL SIGNALS, SAME UNDERLYING CONCERN
 *   "Hamburg city lead — 1 volunteered, needs your decision": no
 *   volunteer-for-a-role workflow exists anywhere — only direct
 *   appointment. Replaced with a real count of the coordinator's own
 *   chapters that have no lead at all.
 *   "Frankfurt group invite expired": genuinely real now, via
 *   social_handles.expires_at (20260806140000).
 *
 * "PROFILE COMPLETION" ON THIS SCREEN IS NOT THE MEMBER'S OWN PERCENTAGE
 *   Home.tsx's profileChecklist is a much richer, weighted, client-side
 *   calculation (family fields, social handles, the works). Duplicating
 *   it server-side risked the two disagreeing, so this is a simpler,
 *   explicitly-labelled proxy: five core fields, checked directly.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type HomeStats = {
  members_total: number; joined_7d: number; open_assistance: number; unanswered_assistance: number;
  response_rate_pct: number; median_hours_to_resolution: number | null; core_fields_complete_pct: number;
  vacant_chapters: number; expiring_or_expired_handles: number;
};
type Joinee = { id: string; full_name: string | null; city_abroad: string | null; created_at: string; referred_by_name: string | null; core_fields_complete: boolean; welcomed_at: string | null };
type CityCount = { city: string; member_count: number };

function timeAgo(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function MyChapterHome({ country, onNavigate }: { country: string; onNavigate: (v: "queue" | "team" | "clusters") => void }) {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [joinees, setJoinees] = useState<Joinee[]>([]);
  const [growth, setGrowth] = useState<CityCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcoming, setWelcoming] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, j, g] = await Promise.all([
      supabase.rpc("my_chapter_home"),
      supabase.rpc("my_chapter_new_joinees", { p_days: 7 }),
      supabase.rpc("city_data_quality", { p_country: country }),
    ]);
    const row = Array.isArray(s.data) ? s.data[0] : s.data;
    setStats(row ?? null);
    setJoinees((j.data as Joinee[]) ?? []);
    setGrowth(((g.data as CityCount[]) ?? []).filter((c) => c.city !== "(blank)"));
    setLoading(false);
  }, [country]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const welcome = async (id: string) => {
    setWelcoming(id);
    const { error } = await supabase.rpc("mark_member_welcomed", { p_profile_id: id });
    setWelcoming(null);
    if (!error) void fetchAll();
  };

  if (loading || !stats) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  const actionCount = stats.unanswered_assistance + stats.vacant_chapters + stats.expiring_or_expired_handles;
  const maxCity = Math.max(1, ...growth.map((g) => g.member_count));

  return (
    <div>
      <div className="pt-note go" style={{ marginBottom: 16 }}>
        <b>You cover {country}.</b> Everything on this page is limited to {country}'s members. Other
        countries, voter records and the admin calendar are not visible here — enforced in the
        database, not just hidden in this screen.
      </div>

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 18 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Members in {country}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.members_total}</div>
          <div style={{ fontSize: 11.5, color: "var(--green-deep)", fontWeight: 600 }}>+{stats.joined_7d} joined this week</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Needs your action</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{actionCount}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            {stats.unanswered_assistance} assistance · {stats.vacant_chapters} vacant lead{stats.vacant_chapters === 1 ? "" : "s"} · {stats.expiring_or_expired_handles} group link{stats.expiring_or_expired_handles === 1 ? "" : "s"}
          </div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Core fields complete</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.core_fields_complete_pct}<span style={{ fontSize: 16, color: "var(--ink-4)" }}>%</span></div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>chapter average</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Cases moved off Open</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.response_rate_pct}<span style={{ fontSize: 16, color: "var(--ink-4)" }}>%</span></div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            {stats.median_hours_to_resolution != null ? `${stats.median_hours_to_resolution}h median to resolve` : "—"}
          </div>
        </div>
      </div>

      <div className="pt-page">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>New joinees this week</h3>
                <div className="sub">Reach out before they go cold — the first fortnight decides whether they stay</div>
              </div>
            </div>
            {joinees.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>Nobody new this week.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Member", "City", "Joined", "Core fields", "Welcomed", ""].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                          color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {joinees.map((j) => (
                      <tr key={j.id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          <div style={{ fontWeight: 600 }}>{j.full_name || "—"}</div>
                          <div style={{ fontSize: 11, color: "var(--ink-4)" }}>{j.referred_by_name ? `Referred by ${j.referred_by_name}` : "Direct signup"}</div>
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{j.city_abroad || "—"}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", color: "var(--ink-3)" }}>{timeAgo(j.created_at)}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          <span className={`pt-pill ${j.core_fields_complete ? "pt-p-green" : ""}`} style={!j.core_fields_complete ? { background: "var(--saffron-soft)", color: "var(--saffron)" } : undefined}>
                            {j.core_fields_complete ? "Complete" : "Incomplete"}
                          </span>
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          {j.welcomed_at
                            ? <span className="pt-pill pt-p-green">Done</span>
                            : <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>Not yet</span>}
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          {!j.welcomed_at && (
                            <button className="pt-btn pt-btn-go pt-btn-sm" disabled={welcoming === j.id} onClick={() => void welcome(j.id)}>
                              {welcoming === j.id ? "…" : "Welcome"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pt-card">
            <div className="pt-card-h"><div style={{ flex: 1 }}><h3>{country} queues</h3><div className="sub">Only your country's items appear here</div></div></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Assistance requests</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                    {stats.open_assistance} open · {stats.unanswered_assistance} unanswered past 72h
                  </div>
                </div>
                <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => onNavigate("queue")}>Open queue</button>
              </div>
              {stats.vacant_chapters > 0 && (
                <>
                  <div className="pt-divider" style={{ margin: 0 }} />
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{stats.vacant_chapters} cluster{stats.vacant_chapters === 1 ? "" : "s"} with no lead</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Nobody local is accountable for them yet</div>
                    </div>
                    <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => onNavigate("team")}>Appoint</button>
                  </div>
                </>
              )}
              {stats.expiring_or_expired_handles > 0 && (
                <>
                  <div className="pt-divider" style={{ margin: 0 }} />
                  <div className="row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{stats.expiring_or_expired_handles} group link{stats.expiring_or_expired_handles === 1 ? "" : "s"} expiring or expired</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Members can't join until you renew it</div>
                    </div>
                    <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => onNavigate("team")}>Renew</button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="pt-rail" style={{ position: "sticky", top: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h"><h3>What you can do</h3></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
              {[
                `See and contact ${country} members`,
                "Assign assistance requests",
                "Appoint city and team leads",
                "Create clusters and group cities",
                "Add and rotate your chapter's WhatsApp groups",
              ].map((t) => (
                <div key={t} className="row" style={{ gap: 8 }}><span style={{ color: "var(--green-deep)" }}>✓</span> {t}</div>
              ))}
              <div className="pt-divider" style={{ margin: "6px 0" }} />
              {[
                "See members in other countries",
                "See EPIC or voter records",
                "Approve party-office appointments",
                "Export the member list",
              ].map((t) => (
                <div key={t} className="row" style={{ gap: 8 }}>
                  <span style={{ color: "var(--crimson)" }}>✕</span>
                  <span style={{ color: "var(--ink-3)" }}>{t}</span>
                </div>
              ))}
            </div>
          </section>

          {growth.length > 0 && (
            <section className="pt-card">
              <div className="pt-card-h"><h3>Chapter growth</h3></div>
              <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {growth.slice(0, 8).map((c) => (
                  <div key={c.city} className="row" style={{ gap: 8, fontSize: 12.5 }}>
                    <span style={{ width: 90, flex: "0 0 90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.city}</span>
                    <span style={{ flex: 1, height: 8, background: "var(--line-2)", borderRadius: 6, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${(c.member_count / maxCity) * 100}%`, background: "var(--green)", borderRadius: 6 }} />
                    </span>
                    <span style={{ width: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.member_count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
