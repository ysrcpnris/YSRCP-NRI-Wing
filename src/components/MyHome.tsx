/**
 * Home — built to docs/design/nri-wing-prototype.html (screen `m-home`).
 *
 * Replaces Dashboard.tsx's pre-mock renderOverviewContent(). Every card
 * pulls from an RPC already built and shipped this session for its own
 * screen — nothing new was added to the schema for this page:
 *   - open_slots()          → Appointments' own RPC, filtered to my_status
 *   - my_assistance_board() → Assistance Board's own RPC
 *   - my_local_connect()    → Local Connect's own RPC
 *   - my_chapter_leadership() → Abroad Connect's own RPC
 *   - grievances (direct query, same shape Grievances.tsx uses)
 *
 * WHAT THE MOCK SHOWS THAT ISN'T BUILT HERE
 *   "A student in Germany asked for help you can give" is framed as a
 *   skills match. Assistance Board itself already dropped "Matches your
 *   skills" — no structured skills data to match against reliably. This
 *   card shows the newest open board post that isn't the member's own
 *   and that they haven't already offered on, labelled "Open", not
 *   "Match" — a nudge toward the board, not a claim of personalisation
 *   that isn't real.
 *
 *   The mock's referral progress bar ("6 more to reach Country Organiser
 *   tier") has no backing anywhere in the schema — no tier concept
 *   exists. Shown as a plain count instead of an invented tier bar.
 *
 * profileCompletion / activeReferrals / referralLink are passed down
 * from Dashboard.tsx rather than re-derived here — that logic already
 * exists there (profileChecklist is genuinely non-trivial: weighted
 * fields, family-member sub-fields, social handles) and re-implementing
 * it a second time risks the two disagreeing.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import "../styles/prototype-tokens.css";

type BoardRow = {
  id: string;
  category: "student" | "job";
  title: string;
  poster_name: string;
  city: string | null;
  status: string;
  created_at: string;
  offer_count: number;
  is_own_post: boolean;
  my_offer_id: string | null;
};

type SlotRow = {
  id: string;
  title: string;
  venue: string | null;
  starts_at: string;
  my_status: "pending" | "confirmed" | null;
};

type ConnectRow = {
  tier: "mandal" | "constituency" | "district" | "state";
  role: string;
  leader_name: string;
  place: string | null;
};

type LeadershipRow = {
  tier: "coordinator" | "chapter_lead" | "team_lead";
  leader_name: string;
};

function fmtMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}
function timeAgo(iso: string) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Props = {
  profileCompletion: number;
  nextMissingFieldLabel: string | null;
  referralCount: number;
  referralCountThisMonth: number;
  referralLink: string;
  onCopyReferralLink: () => void;
  onNavigate: (tab: string) => void;
};

export default function MyHome({
  profileCompletion, nextMissingFieldLabel, referralCount, referralCountThisMonth,
  referralLink, onCopyReferralLink, onNavigate,
}: Props) {
  const { user, profile } = useAuth();
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [openGrievances, setOpenGrievances] = useState(0);
  const [connect, setConnect] = useState<ConnectRow[]>([]);
  const [leadership, setLeadership] = useState<LeadershipRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [b, s, g, c, l] = await Promise.all([
      supabase.rpc("my_assistance_board"),
      supabase.rpc("open_slots"),
      supabase.from("grievances").select("id, status").eq("profile_id", user.id),
      supabase.rpc("my_local_connect"),
      supabase.rpc("my_chapter_leadership"),
    ]);
    setBoard((b.data as BoardRow[]) ?? []);
    setSlots((s.data as SlotRow[]) ?? []);
    setOpenGrievances(((g.data as { status: string }[]) ?? []).filter((r) => !["resolved", "closed"].includes(r.status)).length);
    setConnect((c.data as ConnectRow[]) ?? []);
    setLeadership((l.data as LeadershipRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  const pendingSlot = slots.find((s) => s.my_status === "pending") ?? null;
  const openBoardPosts = board.filter((p) => p.status === "open");
  const boardNudge = openBoardPosts.find((p) => !p.is_own_post && !p.my_offer_id) ?? null;
  const showVoterPrompt = profile && (profile as Record<string, unknown>).has_vote == null;

  const attention: Array<{ stripe: string; title: string; body: string; pill: string; pillCls: string; cta: string; ctaCls: string; onClick: () => void }> = [];
  if (pendingSlot) {
    attention.push({
      stripe: "var(--saffron)", title: "Your appointment request is pending approval",
      body: `${fmtDay(pendingSlot.starts_at)}${pendingSlot.venue ? ` · ${pendingSlot.venue}` : ""}`,
      pill: "Pending", pillCls: "pt-p-saf", cta: "View", ctaCls: "pt-btn-out",
      onClick: () => onNavigate("appointments"),
    });
  }
  if (boardNudge) {
    attention.push({
      stripe: "var(--navy)", title: boardNudge.title,
      body: `${boardNudge.poster_name}${boardNudge.city ? ` · ${boardNudge.city}` : ""} · ${timeAgo(boardNudge.created_at)}${boardNudge.offer_count > 0 ? ` · ${boardNudge.offer_count} responded` : ""}`,
      pill: "Open", pillCls: "pt-p-navy", cta: "Offer help", ctaCls: "pt-btn-go",
      onClick: () => onNavigate("board"),
    });
  }
  if (showVoterPrompt) {
    attention.push({
      stripe: "var(--green)", title: "Confirm whether you're on the voter roll",
      body: "The wing is mapping NRI voters constituency by constituency. Takes under a minute.",
      pill: "New", pillCls: "pt-p-green", cta: "Answer", ctaCls: "pt-btn-go",
      onClick: () => onNavigate("profile"),
    });
  }

  const constituency = connect.find((r) => r.tier === "constituency");
  const mandal = connect.find((r) => r.tier === "mandal");
  const coordinator = leadership.find((r) => r.tier === "coordinator");
  const openCount = (pendingSlot ? 1 : 0) + openGrievances;
  const openParts = [
    openGrievances > 0 ? `${openGrievances} grievance${openGrievances === 1 ? "" : "s"}` : null,
    pendingSlot ? "1 appointment" : null,
  ].filter(Boolean).join(" · ");

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 18 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Membership</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 20, fontWeight: 600, paddingTop: 7 }}>Active</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
            <span className="pt-pill pt-p-green">Verified</span>
            {user?.created_at && ` since ${fmtMonthYear(user.created_at)}`}
          </div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>People you referred</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{referralCount}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>
            {referralCountThisMonth > 0 ? <span style={{ color: "var(--green-deep)", fontWeight: 600 }}>+{referralCountThisMonth}</span> : null}{referralCountThisMonth > 0 ? " this month" : "No new referrals this month"}
          </div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Open with the party</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{openCount}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>{openParts || "Nothing open right now"}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Profile strength</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{profileCompletion}<span style={{ fontSize: 16, color: "var(--ink-4)" }}>%</span></div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 5 }}>
            {profileCompletion >= 100 ? "Complete" : nextMissingFieldLabel ? `Add ${nextMissingFieldLabel} to finish` : "Keep going"}
          </div>
        </div>
      </div>

      <div className="pt-page">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>Needs your attention</h3>
                <div className="sub">
                  {attention.length === 0 ? "Nothing waiting on you" : `${attention.length} item${attention.length === 1 ? "" : "s"} waiting on you`}
                </div>
              </div>
            </div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {attention.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>You're all caught up.</div>
              ) : attention.map((a, i) => (
                <div key={i} className="pt-card" style={{ display: "flex", overflow: "hidden" }}>
                  <div style={{ width: 4, flex: "0 0 4px", background: a.stripe }} />
                  <div style={{ flex: 1, padding: "12px 14px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <h4 style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3 }}>{a.title}</h4>
                      <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.body}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      <span className={`pt-pill ${a.pillCls}`}>{a.pill}</span>
                      <button className={`pt-btn ${a.ctaCls} pt-btn-sm`} onClick={a.onClick}>{a.cta}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>From the Assistance Board</h3>
                <div className="sub">Open requests from members in your country</div>
              </div>
              <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => onNavigate("board")}>See all {openBoardPosts.length}</button>
            </div>
            {openBoardPosts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No open requests right now.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Request", "From", "City", "Type", "Replies"].map((h) => (
                        <th key={h} style={{
                          textAlign: h === "Replies" ? "right" : "left",
                          fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                          color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openBoardPosts.slice(0, 4).map((p) => (
                      <tr key={p.id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{p.title}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{p.poster_name}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{p.city ?? "—"}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          <span className={`pt-pill ${p.category === "job" ? "pt-p-navy" : "pt-p-saf"}`}>{p.category === "job" ? "Job" : "Student"}</span>
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.offer_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="pt-rail" style={{ position: "sticky", top: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h"><h3>Invite your circle</h3></div>
            <div className="pt-card-b">
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 12 }}>
                Every NRI who joins through you strengthens the wing's count in your country.
              </p>
              <div style={{ background: "var(--card-2)", border: "1px dashed var(--line)", borderRadius: "var(--r-sm)", padding: "11px 13px", marginBottom: 11 }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>Your referral code</div>
                <div style={{ fontFamily: "monospace", fontSize: 16, fontWeight: 700, letterSpacing: ".08em", color: "var(--navy)" }}>
                  {referralLink ? referralLink.split("/").pop() : "—"}
                </div>
              </div>
              <button className="pt-btn pt-btn-go" style={{ width: "100%" }} onClick={onCopyReferralLink}>Copy invite link</button>
              <div className="pt-divider" />
              <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--ink-3)" }}>Joined through you</span>
                <b>{referralCount} member{referralCount === 1 ? "" : "s"}</b>
              </div>
            </div>
          </section>

          <section className="pt-card">
            <div className="pt-card-h"><h3>Your local connect</h3></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {constituency && (
                <div>
                  <div className="eyebrow">{constituency.role}{constituency.place ? ` · ${constituency.place}` : ""}</div>
                  <div style={{ fontWeight: 600, marginTop: 3 }}>{constituency.leader_name}</div>
                </div>
              )}
              {mandal && (
                <div>
                  <div className="eyebrow">{mandal.role}{mandal.place ? ` · ${mandal.place}` : ""}</div>
                  <div style={{ fontWeight: 600, marginTop: 3 }}>{mandal.leader_name}</div>
                </div>
              )}
              {coordinator && (
                <div>
                  <div className="eyebrow">Country Coordinator</div>
                  <div style={{ fontWeight: 600, marginTop: 3 }}>{coordinator.leader_name}</div>
                </div>
              )}
              {!constituency && !mandal && !coordinator && (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No leadership on file yet for your area.</div>
              )}
              <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => onNavigate("connect")}>Open Local Connect</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
