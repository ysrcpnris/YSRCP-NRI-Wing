/**
 * Our Members — built to docs/design/nri-wing-prototype.html
 * (screen `c-members`).
 *
 * THE VOTER COLUMN IS ALWAYS "HIDDEN" — HONESTLY, NOT DECORATIVELY
 *   chapter_roster() has never returned has_vote/epic_number/
 *   voter_constituency — those are withheld at the column-privilege
 *   level (MyProfile.tsx's own docstring). This screen doesn't hide a
 *   real value; it never receives one, so "Hidden" is a true statement
 *   about what the coordinator's own RPC call returns, not UI dressing
 *   over data secretly available.
 *
 * "JOIN ORG" COLUMN FROM THE MOCK IS NOT HERE
 *   It shows Yes/Tell me more against a question ("would you like to
 *   join the organisation formally?") that MyProfile.tsx already
 *   established has no backing column at all — rendered there, answer
 *   never sent anywhere. Nothing to show here either; see
 *   20260806120000's migration comment for the full reasoning.
 *
 * Export stays disabled — "secretariat only" per the mock, and there
 * is no export RPC for a coordinator to call regardless.
 */

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../contexts/useAuth";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type RosterRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  city_abroad: string | null;
  country: string | null;
  chapter: string | null;
  constituency: string | null;
  district: string | null;
  joined_at: string;
  contribution_areas: string[] | null;
  public_user_code: string | null;
  total_count: number;
};

const CONTRIBUTION_LABEL: Record<string, string> = {
  social_media: "Social Media",
  technology: "Technology",
  political: "Political",
};

const PAGE = 50;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function MyChapterMembers() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [contribution, setContribution] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const total = rows[0]?.total_count ?? 0;
  const pages = Math.ceil(total / PAGE);

  const load = useCallback(async (q: string, c: string, contrib: string, pageIndex: number) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("chapter_roster", {
      p_search: q || null,
      p_city: c || null,
      p_contribution: contrib || null,
      p_limit: PAGE,
      p_offset: pageIndex * PAGE,
    });
    if (error) console.error("chapter_roster failed:", error);
    setRows((data as RosterRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load("", "", "", 0); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(0); void load(search, city, contribution, 0); }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, city, contribution]);

  const countryLabel = rows[0]?.country ?? profile?.country_of_residence ?? "your country";
  const cities = Array.from(new Set(rows.map((r) => r.city_abroad).filter(Boolean))) as string[];

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="pt-sec-title">Our Members · {countryLabel}</div>
          <p className="pt-sec-note" style={{ marginBottom: 0 }}>
            {total} member{total === 1 ? "" : "s"}. You can contact them and record chapter notes —
            you cannot export the list or see voter records.
          </p>
        </div>
        <span className="pt-btn pt-btn-out" style={{ opacity: 0.45, cursor: "not-allowed" }}>
          Export · secretariat only
        </span>
      </div>

      <div className="pt-card" style={{ marginBottom: 14 }}>
        <div className="pt-card-b">
          <div className="row" style={{ gap: 9, flexWrap: "wrap" }}>
            <input
              className="pt-inp" style={{ flex: 1, minWidth: 220 }}
              placeholder={`Search ${countryLabel} members by name or city`}
              value={search} onChange={(e) => setSearch(e.target.value)}
            />
            <select className="pt-inp" style={{ width: "auto" }} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="pt-inp" style={{ width: "auto" }} value={contribution} onChange={(e) => setContribution(e.target.value)}>
              <option value="">Any contribution</option>
              {Object.entries(CONTRIBUTION_LABEL).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <section className="pt-card">
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>
            {search || city || contribution ? "No members match these filters." : "No members yet."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Member", "City", "Joined", "Contributes", "Voter", ""].map((h) => (
                    <th key={h} style={{
                      textAlign: "left", fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                      color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                      borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      <div style={{ fontWeight: 600 }}>{r.full_name || "—"}</div>
                      {r.public_user_code && <div style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "monospace" }}>{r.public_user_code}</div>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{r.city_abroad || "—"}</td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", whiteSpace: "nowrap" }}>{fmtDate(r.joined_at)}</td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      {r.contribution_areas && r.contribution_areas.length > 0 ? (
                        <div className="row" style={{ gap: 5, flexWrap: "wrap" }}>
                          {r.contribution_areas.map((a) => (
                            <span key={a} className="pt-pill pt-p-navy" style={{ background: "rgba(15,61,124,.09)" }}>
                              {CONTRIBUTION_LABEL[a] ?? a}
                            </span>
                          ))}
                        </div>
                      ) : <span style={{ color: "var(--ink-4)" }}>None given</span>}
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }} title="Secretariat only">Hidden</span>
                    </td>
                    <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                      {r.email ? (
                        <a className="pt-btn pt-btn-out pt-btn-sm" href={`mailto:${r.email}`}>Contact</a>
                      ) : r.mobile_number ? (
                        <a className="pt-btn pt-btn-out pt-btn-sm" href={`tel:${r.mobile_number}`}>Contact</a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pt-card-b" style={{ borderTop: "1px solid var(--line-2)" }}>
          <div className="pt-note">
            <b>Why the Voter column is hidden.</b> EPIC numbers and roll status are political-identity
            data. They stay with the secretariat, so a chapter breach can't expose them. Coordinators
            get what they need to organise, not everything the wing holds.
          </div>
        </div>
      </section>

      {pages > 1 && (
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <p style={{ fontSize: 11.5, color: "var(--ink-4)", fontVariantNumeric: "tabular-nums" }}>
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
          </p>
          <div className="row" style={{ gap: 8 }}>
            <button className="pt-btn pt-btn-out pt-btn-sm" disabled={page === 0}
                    onClick={() => { const p = page - 1; setPage(p); void load(search, city, contribution, p); }}>
              Previous
            </button>
            <button className="pt-btn pt-btn-out pt-btn-sm" disabled={page >= pages - 1}
                    onClick={() => { const p = page + 1; setPage(p); void load(search, city, contribution, p); }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
