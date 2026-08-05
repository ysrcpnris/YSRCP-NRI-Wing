/**
 * Local Connect — built to docs/design/nri-wing-prototype.html
 * (screen `m-connect`).
 *
 * TWO REAL GAPS FOUND AND CLOSED BEFORE THIS SHIPPED
 *
 *   1. The mock labels the constituency leader "Member of Legislative
 *      Assembly." The real role tracked in leader_assignments is
 *      "Assembly Coordinator" — a party role, not the elected MLA, and
 *      the party may not hold every seat. Showing "MLA" would misstate
 *      who these people are. This screen uses the real role text
 *      my_local_connect() returns, never a hardcoded "MLA".
 *
 *   2. The mock's "Mandal Presidents" table (village/household counts,
 *      a named president per mandal) had NO backing data at all — no
 *      mandal-level leader tier existed anywhere. Added for real in
 *      20260805235000: leader_assignments.mandal, my_local_connect()'s
 *      4th tier, and my_constituency_mandals(). Village/household
 *      counts are genuinely nullable — there is no source for them yet
 *      and none is invented here. A mandal with no data shows "—", not
 *      a fabricated number, and that must never look like a real zero.
 *
 * WHAT THIS SCREEN OMITS ON PURPOSE
 *   No follower/social-handle icons (Twitter/Instagram/YouTube) — the
 *   schema only ever tracked WhatsApp for leaders (the audience is
 *   abroad, where a WhatsApp message is free and an India call is not).
 *   Inventing social links the data doesn't have would be worse than
 *   not showing them.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import "../styles/prototype-tokens.css";

type ConnectRow = {
  tier: "mandal" | "constituency" | "district" | "state";
  role: string;
  leader_name: string;
  whatsapp: string | null;
  whatsapp_alt: string | null;
  photo_url: string | null;
  place: string | null;
};

type MandalRow = {
  mandal_name: string;
  villages_count: number | null;
  households_count: number | null;
  president_name: string | null;
  whatsapp: string | null;
};

const TIER_LABEL: Record<ConnectRow["tier"], string> = {
  mandal: "Your mandal",
  constituency: "Your constituency",
  district: "District leadership",
  state: "State leadership",
};

function waLink(number: string, name: string) {
  const digits = number.replace(/\D/g, "");
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Namaskaram ${name} garu, I am a YSRCP NRI Wing member writing from abroad.`
  );
  return `https://wa.me/${withCc}?text=${text}`;
}

function initials(name: string): string {
  const skip = /^(sri|smt|dr|kum|shri|mr|mrs|ms)\.?$/i;
  const parts = name.replace(/[(),]/g, " ").split(/\s+/).filter((p) => p && !skip.test(p));
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// Per-tier CTA copy, matching the mock: the mandal card is the primary,
// most-actionable contact (blue), constituency and district are outline —
// all three still resolve to the same real action (a WhatsApp message to
// that leader), there is no separate "raise an issue" backend for this
// card. The copy signals purpose, the link is honest about what happens.
const TIER_CTA: Record<ConnectRow["tier"], { label: string; primary: boolean }> = {
  constituency: { label: "Request a connect", primary: false },
  mandal: { label: "Raise a local issue", primary: true },
  district: { label: "Escalate an issue", primary: false },
  state: { label: "Message on WhatsApp", primary: false },
};

function LeaderCard({ row }: { row: ConnectRow }) {
  const cta = TIER_CTA[row.tier];
  return (
    <div className="pt-card" style={{ overflow: "hidden" }}>
      <div style={{
        background: "linear-gradient(150deg, var(--navy-deep) 0%, var(--navy) 68%, #2a7fe0 100%)",
        padding: "22px 20px 24px", color: "#fff", textAlign: "center",
      }}>
        <div style={{ fontSize: 9.5, letterSpacing: ".17em", textTransform: "uppercase", color: "rgba(255,255,255,.72)", fontWeight: 600 }}>
          {TIER_LABEL[row.tier]}
        </div>
        <div style={{
          width: 76, height: 76, borderRadius: "50%", margin: "15px auto 13px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 700, color: "#fff",
          // Mandal is the primary/most-actionable card — its avatar fill
          // is solid green rather than the translucent-white every other
          // tier gets, echoing the primary blue CTA below it.
          background: row.tier === "mandal" ? "var(--green)" : "rgba(255,255,255,.16)",
          border: "3px solid rgba(255,255,255,.45)",
          overflow: "hidden", backgroundImage: row.photo_url ? `url(${row.photo_url})` : undefined,
          backgroundSize: "cover", backgroundPosition: "center",
        }}>
          {!row.photo_url && initials(row.leader_name)}
        </div>
        <div style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 600 }}>{row.leader_name}</div>
        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.75)", marginTop: 4 }}>
          {row.role}{row.place ? ` · ${row.place}` : ""}
        </div>
      </div>
      <div style={{ padding: "14px 18px", display: "flex", gap: 8 }}>
        {row.whatsapp ? (
          <a
            className={`pt-btn ${cta.primary ? "pt-btn-go" : "pt-btn-out"}`} style={{ flex: 1, textDecoration: "none" }}
            href={waLink(row.whatsapp, row.leader_name)} target="_blank" rel="noreferrer"
          >
            {cta.label}
          </a>
        ) : (
          <span className="pt-btn pt-btn-out" style={{ flex: 1, opacity: 0.6, cursor: "default" }}>
            No contact on file
          </span>
        )}
      </div>
    </div>
  );
}

export default function MyLocalConnect() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ConnectRow[]>([]);
  const [mandals, setMandals] = useState<MandalRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: connect }, { data: mandalRows }] = await Promise.all([
      supabase.rpc("my_local_connect"),
      supabase.rpc("my_constituency_mandals"),
    ]);
    setRows((connect as ConnectRow[]) ?? []);
    setMandals((mandalRows as MandalRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const mandal = rows.find((r) => r.tier === "mandal");
  const constituency = rows.find((r) => r.tier === "constituency");
  const district = rows.find((r) => r.tier === "district");
  const stateLeaders = rows.filter((r) => r.tier === "state");

  const myMandalName = (profile as Record<string, unknown> | null)?.mandal as string | undefined;

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-sec-title">Local Connect</div>
      <p className="pt-sec-note">
        Your line back home — the party structure for your registered constituency,
        now down to mandal level.
      </p>

      <section className="pt-card" style={{ marginBottom: 14 }}>
        <div className="pt-card-h">
          <div style={{ flex: 1 }}>
            <h3>
              {profile?.assembly_constituency || "Your constituency"}
              {profile?.district ? ` · ${profile.district} District` : ""}
            </h3>
            <div className="sub">Where you're registered on the roll</div>
          </div>
        </div>
      </section>

      <div className="pt-note go" style={{ marginBottom: 16 }}>
        <b>This page is your line home.</b> For the wing's own people where you live —
        your country coordinator, city lead and assistance teams — see Abroad Connect.
      </div>

      {loading ? (
        <div className="pt-card"><div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div></div>
      ) : (
        <>
          {/* Card order follows the mock: constituency, then mandal (the
              primary, most-actionable contact — centered and blue), then
              district. Not a strict top-down hierarchy walk (district
              actually outranks constituency) — it's ordered by which
              contact a member reaches for first day to day. */}
          <div className="pt-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 16 }}>
            {constituency ? <LeaderCard row={constituency} /> : (
              <div className="pt-card"><div className="pt-card-b" style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No constituency coordinator on file</div></div>
            )}
            {mandal ? <LeaderCard row={mandal} /> : (
              <div className="pt-card">
                <div className="pt-card-b" style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Your mandal</div>
                  {myMandalName ? `${myMandalName} — no Mandal President appointed yet` : "Complete your profile to see your mandal"}
                </div>
              </div>
            )}
            {district ? <LeaderCard row={district} /> : (
              <div className="pt-card"><div className="pt-card-b" style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No district leadership on file</div></div>
            )}
          </div>

          <div className="pt-note" style={{ marginBottom: 16, fontSize: 12.5 }}>
            <b>Maintained by the secretariat.</b> Leader details come from the party's own
            records — nobody outside the secretariat can edit these.
          </div>

          <section className="pt-card" style={{ marginBottom: 16 }}>
            <div className="pt-card-h">
              <div style={{ flex: 1 }}>
                <h3>Mandal Presidents · {profile?.assembly_constituency || "Your constituency"}</h3>
                <div className="sub">The wing lists mandal-level office bearers as they're appointed</div>
              </div>
              <span className="pt-pill pt-p-green">New</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    {["Mandal", "Mandal President", "Villages", "Households", "Contact"].map((h) => (
                      <th key={h} style={{
                        textAlign: h === "Villages" || h === "Households" ? "right" : "left",
                        fontSize: 10, letterSpacing: ".11em", textTransform: "uppercase",
                        color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                        borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mandals.map((m) => (
                    <tr key={m.mandal_name}>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        <div style={{ fontWeight: 600 }}>{m.mandal_name}</div>
                        {myMandalName === m.mandal_name && (
                          <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>Your mandal</div>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        {m.president_name || (
                          <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>
                            Vacant — appointment pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {m.villages_count ?? "—"}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {m.households_count ?? "—"}
                      </td>
                      <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                        {m.whatsapp ? (
                          <a className="pt-btn pt-btn-out" style={{ padding: "5px 11px", fontSize: 12, textDecoration: "none" }}
                             href={waLink(m.whatsapp, m.president_name || "")} target="_blank" rel="noreferrer">
                            Connect
                          </a>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {stateLeaders.length > 0 && (
            <section className="pt-card">
              <div className="pt-card-h"><h3>State leadership</h3></div>
              <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stateLeaders.map((r, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "10px 14px", borderRadius: "var(--r-sm)",
                    border: "1px solid var(--navy)", background: "var(--navy-soft)",
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flex: "0 0 40px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "#fff",
                      background: "linear-gradient(145deg, var(--navy) 0%, var(--navy-lift) 100%)",
                      backgroundImage: r.photo_url ? `url(${r.photo_url})` : undefined,
                      backgroundSize: "cover", backgroundPosition: "center",
                      border: "2px solid #fff", boxShadow: "0 0 0 1px var(--navy)",
                    }}>
                      {!r.photo_url && initials(r.leader_name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.leader_name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{r.role}</div>
                    </div>
                    {r.whatsapp && (
                      <a className="pt-btn pt-btn-go" style={{ padding: "6px 13px", fontSize: 12, textDecoration: "none" }}
                         href={waLink(r.whatsapp, r.leader_name)} target="_blank" rel="noreferrer">
                        WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
