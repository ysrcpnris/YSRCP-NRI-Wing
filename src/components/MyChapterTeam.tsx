/**
 * Team & Groups — built to docs/design/nri-wing-prototype.html
 * (screen `c-team`).
 *
 * CITY LEADS AND THE COMMITTEE REUSE EXISTING, REAL INFRASTRUCTURE
 *   Both are member_roles rows — chapter_lead (city leads, one per
 *   chapter) and team_lead (committee, free-text title) — already
 *   fully readable via wing_roles_list() and grantable/revocable via
 *   grant_wing_role()/revoke_wing_role(), the same RPCs RoleManager
 *   already uses. This screen adds the mock's two-table presentation
 *   (grouped by chapter, with real member counts) on top of that real
 *   data; RoleManager (kept below, unchanged) is still where a grant
 *   or revoke actually happens.
 *
 * NO FIXED 15-SEAT COMMITTEE — EXPLICIT INSTRUCTION
 *   The mock shows a fixed list (Treasurer, Women's Wing Lead, ...)
 *   with "vacant" rows for unfilled seats. Built instead as an open
 *   list of however many team_lead titles a coordinator has actually
 *   granted — no seat cap, no fabricated vacancies for a seat that was
 *   never defined as existing.
 *
 * WHATSAPP GROUPS WERE ALREADY MOSTLY REAL
 *   social_handles with platform='whatsapp' already tracked group
 *   links and a manually-recorded member_count (WhatsApp has no
 *   group-size API). Genuinely new here: expires_at (link rotation)
 *   and social_handle_joins (a real "joined via portal" count, kept
 *   separate from the manual total so the two are never confused).
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type ChapterRow = { chapter_id: string; name: string; country: string; cities: string[]; member_count: number; lead_name: string | null };
type RoleRow = { role_id: string; profile_id: string; member_name: string; email: string; role: string; country: string | null; chapter: string | null; chapter_id: string | null; title: string | null; granted_at: string };
type HandleRow = { id: string; chapter_id: string; chapter_name: string; platform: string; label: string; handle: string | null; url: string; member_count: number | null; count_as_of: string | null; expires_at: string | null; joined_via_portal: number; can_write: boolean };

const PLATFORM_ICON: Record<string, string> = { x: "𝕏", facebook: "f", instagram: "◉", youtube: "▶", whatsapp: "◆", telegram: "✈", website: "🌐" };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function isExpired(iso: string | null) {
  return !!iso && new Date(iso).getTime() < Date.now();
}

export default function MyChapterTeam() {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [handles, setHandles] = useState<HandleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [platform, setPlatform] = useState("whatsapp");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, r, h] = await Promise.all([
      supabase.rpc("my_chapters_overview"),
      supabase.rpc("wing_roles_list"),
      supabase.rpc("my_chapter_handles_admin"),
    ]);
    setChapters((c.data as ChapterRow[]) ?? []);
    setRoles((r.data as RoleRow[]) ?? []);
    setHandles((h.data as HandleRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const committee = roles.filter((r) => r.role === "team_lead");

  const addHandle = async (chapterId: string) => {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.rpc("add_chapter_handle", {
      p_chapter_id: chapterId, p_platform: platform, p_label: label.trim(), p_url: url.trim(),
    });
    setSaving(false);
    if (error) {
      setMsg({ text: "Couldn't add that handle — check the link starts with http(s)://", kind: "err" });
      return;
    }
    setLabel(""); setUrl(""); setAddingTo(null);
    setMsg({ text: "Handle added.", kind: "ok" });
    void fetchAll();
  };

  const rotate = async (h: HandleRow) => {
    const newUrl = window.prompt(`New link for "${h.label}"`, h.url);
    if (!newUrl) return;
    const { error } = await supabase.rpc("rotate_chapter_handle", {
      p_handle_id: h.id, p_new_url: newUrl,
      p_expires_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    });
    if (!error) void fetchAll();
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  return (
    <div>
      <div className="pt-sec-title">Team & Groups</div>
      <p className="pt-sec-note">
        Appoint your city and team leads, and keep the chapter's WhatsApp groups usable.
      </p>

      <div className="pt-page">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>City leads</h3>
                <div className="sub">One per cluster — appoint or change below in Team</div>
              </div>
            </div>
            {chapters.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No clusters yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Cluster", "Lead", "Members"].map((h) => (
                        <th key={h} style={{
                          textAlign: h === "Members" ? "right" : "left", fontSize: 10, letterSpacing: ".11em",
                          textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((c) => (
                      <tr key={c.chapter_id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          {c.lead_name || <span className="pt-pill" style={{ background: "var(--saffron-soft)", color: "var(--saffron)" }}>Vacant</span>}
                        </td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.member_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="pt-card">
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>Committee</h3>
                <div className="sub">{committee.length} appointed · no fixed number of seats</div>
              </div>
            </div>
            {committee.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>Nobody appointed yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Seat", "Holder", "Since"].map((h) => (
                        <th key={h} style={{
                          textAlign: "left", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                          color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {committee.map((r) => (
                      <tr key={r.role_id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{r.title || "Team Lead"}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{r.member_name}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", color: "var(--ink-3)" }}>{fmtDate(r.granted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="pt-card">
          <div className="pt-card-h">
            <div style={{ flex: 1 }}>
              <h3>WhatsApp groups & social handles</h3>
              <div className="sub">Links rotate as needed — a forwarded link that expires stops working</div>
            </div>
          </div>
          {msg && <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ margin: "12px 18px 0" }}>{msg.text}</div>}
          {handles.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No handles yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Platform", "Label", "Joined via portal", "Status", ""].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "Joined via portal" ? "right" : "left", fontSize: 10, letterSpacing: ".11em",
                        textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                        borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {handles.map((h) => (
                    <tr key={h.id}>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        {PLATFORM_ICON[h.platform] ?? h.platform} {h.chapter_name}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        <div style={{ fontWeight: 600 }}>{h.label}</div>
                        {h.member_count != null && (
                          <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>
                            ≈{h.member_count} total{h.count_as_of ? ` as of ${fmtDate(h.count_as_of)}` : ""}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {h.joined_via_portal}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        {h.expires_at ? (
                          isExpired(h.expires_at)
                            ? <span className="pt-pill" style={{ background: "var(--saffron-soft)", color: "var(--saffron)" }}>Expired {fmtDate(h.expires_at)}</span>
                            : <span className="pt-pill pt-p-green">Valid to {fmtDate(h.expires_at)}</span>
                        ) : <span className="pt-pill pt-p-green">Live</span>}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        {h.can_write && (
                          <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => void rotate(h)}>
                            {h.platform === "whatsapp" ? "Rotate" : "Edit"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="pt-card-b" style={{ borderTop: "1px solid var(--line-2)" }}>
            {addingTo ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="row" style={{ gap: 9, flexWrap: "wrap" }}>
                  <select className="pt-inp" style={{ width: "auto" }} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                    {Object.keys(PLATFORM_ICON).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <input className="pt-inp" style={{ flex: 1, minWidth: 160 }} placeholder="Label — e.g. Germany · Official"
                         value={label} onChange={(e) => setLabel(e.target.value)} />
                  <input className="pt-inp" style={{ flex: 2, minWidth: 220 }} placeholder="https://…"
                         value={url} onChange={(e) => setUrl(e.target.value)} />
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="pt-btn pt-btn-go pt-btn-sm" disabled={saving} onClick={() => void addHandle(addingTo)}>
                    {saving ? "Saving…" : "Add handle"}
                  </button>
                  <button className="pt-btn pt-btn-out pt-btn-sm" onClick={() => setAddingTo(null)}>Cancel</button>
                </div>
              </div>
            ) : chapters.length > 0 ? (
              <select className="pt-inp" style={{ width: "auto" }} defaultValue=""
                      onChange={(e) => { if (e.target.value) setAddingTo(e.target.value); }}>
                <option value="" disabled>+ Add handle to…</option>
                {chapters.map((c) => <option key={c.chapter_id} value={c.chapter_id}>{c.name}</option>)}
              </select>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
