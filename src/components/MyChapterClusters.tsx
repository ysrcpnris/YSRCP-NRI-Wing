/**
 * Clusters — built to docs/design/nri-wing-prototype.html (screen
 * `c-clusters`). Mock calls them "clusters"; this codebase renamed the
 * concept to "chapters" (20260805150000) — same thing, kept the mock's
 * screen title since that's what the design source calls it.
 *
 * CHAPTER CREATION WAS ADMIN-ONLY, BY DELIBERATE DESIGN — REVERSED HERE
 * ON EXPLICIT INSTRUCTION, NOT REBUILT AROUND SILENTLY
 *   20260804250000 locked this down after finding a coordinator could
 *   directly INSERT *and DELETE* chapters via a lax table policy —
 *   DELETE was the dangerous half, since chapter_cities/social_handles
 *   cascade off a chapter. Checked this with the user before building;
 *   explicit instruction was to reverse the limitation. Built via
 *   create_chapter()/assign_city_to_chapter() — scoped, audited RPCs,
 *   same shape as every other write path in this schema — rather than
 *   reopening the table policy that caused the original problem. The
 *   direct-table RESTRICTIVE lock (including DELETE) is untouched and
 *   confirmed still enforced: a coordinator still cannot delete a
 *   chapter from here or anywhere else.
 *
 * THE DATA-QUALITY CARD USES REAL CITY STRINGS
 *   city_data_quality() returns actual distinct city values and counts
 *   for the coordinator's country. Near-duplicate detection (casing/
 *   whitespace collisions) and "this looks like a country name, not a
 *   city" flags run client-side against that real data — nothing here
 *   is a canned example.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type ChapterRow = { chapter_id: string; name: string; country: string; cities: string[]; member_count: number; lead_name: string | null };
type CityCount = { city: string; member_count: number };

export default function MyChapterClusters({ country }: { country: string }) {
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [unclustered, setUnclustered] = useState<CityCount[]>([]);
  const [quality, setQuality] = useState<CityCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, u, q] = await Promise.all([
      supabase.rpc("my_chapters_overview"),
      supabase.rpc("unclustered_cities", { p_country: country }),
      supabase.rpc("city_data_quality", { p_country: country }),
    ]);
    setChapters((c.data as ChapterRow[]) ?? []);
    setUnclustered((u.data as CityCount[]) ?? []);
    setQuality((q.data as CityCount[]) ?? []);
    setLoading(false);
  }, [country]);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const totalMembers = quality.reduce((a, q) => a + Number(q.member_count), 0);
  const inClusterMembers = chapters.reduce((a, c) => a + Number(c.member_count), 0);
  const wouldMove = Array.from(picked).reduce((a, city) => a + (unclustered.find((u) => u.city === city)?.member_count ?? 0), 0);

  // Real near-duplicate / bad-value detection over the real distinct
  // city strings — not the mock's canned Düsseldorf/Duesseldorf example.
  const qualityIssues = (() => {
    const byNormalized = new Map<string, CityCount[]>();
    for (const q of quality) {
      const norm = q.city.toLowerCase().replace(/[^a-z0-9]/g, "");
      byNormalized.set(norm, [...(byNormalized.get(norm) ?? []), q]);
    }
    const issues: { kind: string; detail: string }[] = [];
    for (const group of byNormalized.values()) {
      if (group.length > 1) {
        issues.push({ kind: "same city, split", detail: group.map((g) => g.city).join(" / ") });
      }
    }
    const blank = quality.find((q) => q.city === "(blank)");
    if (blank) issues.push({ kind: "lands nowhere", detail: `(blank) — ${blank.member_count} members` });
    const countryLike = quality.find((q) => q.city.toLowerCase() === country.toLowerCase());
    if (countryLike) issues.push({ kind: "lands nowhere", detail: `"${countryLike.city}" — country name in the city field` });
    return issues;
  })();

  const toggleCity = (city: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city); else next.add(city);
      return next;
    });
  };

  const create = async () => {
    if (!newName.trim() || picked.size === 0) return;
    setCreating(true);
    setMsg(null);
    const { error } = await supabase.rpc("create_chapter", {
      p_country: country,
      p_name: newName.trim(),
      p_cities: Array.from(picked),
    });
    setCreating(false);
    if (error) {
      setMsg({ text: "Could not create the chapter. Please try again.", kind: "err" });
      return;
    }
    setNewName("");
    setPicked(new Set());
    setMsg({ text: `Chapter created — ${wouldMove} member${wouldMove === 1 ? "" : "s"} assigned.`, kind: "ok" });
    void fetchAll();
  };

  const addToChapter = async (city: string, chapterId: string) => {
    const { error } = await supabase.rpc("assign_city_to_chapter", { p_chapter_id: chapterId, p_city: city });
    if (!error) void fetchAll();
  };

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div className="pt-sec-title">Clusters · {country}</div>
          <p className="pt-sec-note" style={{ marginBottom: 0 }}>
            A cluster is a set of cities you group together. Members land in one automatically from
            the city on their profile — nobody assigns them.
          </p>
        </div>
      </div>

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 16 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Clusters</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{chapters.length}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Members in a cluster</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{inClusterMembers}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>of {totalMembers}</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Not in any cluster</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600, color: unclustered.length ? "var(--saffron)" : undefined }}>
            {totalMembers - inClusterMembers}
          </div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Cities with members</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{quality.length}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{quality.length - unclustered.length} grouped · {unclustered.length} loose</div>
        </div>
      </div>

      <div className="pt-page">
        <section className="pt-card" style={{ borderColor: "var(--green)" }}>
          <div className="pt-card-h">
            <div style={{ flex: 1 }}>
              <h3>New cluster</h3>
              <div className="sub">Pick the cities that belong together</div>
            </div>
            <span className="pt-pill pt-p-green">New</span>
          </div>
          <div className="pt-card-b">
            <div className="pt-field">
              <label>Cluster name</label>
              <input className="pt-inp" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rhein-Ruhr" />
            </div>
            <div className="pt-field">
              <label>Cities <span className="hint">— member counts shown</span></label>
              {unclustered.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>Every city with members is already in a cluster.</div>
              ) : (
                <div className="pt-checks" style={{ gap: 7 }}>
                  {unclustered.map((u) => (
                    <label key={u.city} className={`pt-chk ${picked.has(u.city) ? "on" : ""}`}>
                      <input type="checkbox" checked={picked.has(u.city)} onChange={() => toggleCity(u.city)} />
                      {u.city} · {u.member_count}
                    </label>
                  ))}
                </div>
              )}
              <span className="hint">Only cities not already in a cluster appear here — a city belongs to
                one cluster, so a member can never be in two.</span>
            </div>
            {picked.size > 0 && (
              <div className="pt-note go" style={{ marginBottom: 14 }}>
                <b>{wouldMove} member{wouldMove === 1 ? "" : "s"}</b> would move into this cluster the moment you save it.
              </div>
            )}
            {msg && <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ marginBottom: 14 }}>{msg.text}</div>}
            <button className="pt-btn pt-btn-go" style={{ width: "100%" }} disabled={creating || !newName.trim() || picked.size === 0} onClick={create}>
              {creating ? "Creating…" : "Create cluster"}
            </button>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <section className="pt-card">
            <div className="pt-card-h"><h3>Your clusters</h3></div>
            {chapters.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>No clusters yet.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Cluster", "Cities", "Members", "Lead"].map((h) => (
                        <th key={h} style={{
                          textAlign: h === "Members" ? "right" : "left", fontSize: 10, letterSpacing: ".11em",
                          textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)", whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chapters.map((c) => (
                      <tr key={c.chapter_id}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{c.name}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", color: "var(--ink-2)" }}>{c.cities.join(" · ") || "—"}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{c.member_count}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>{c.lead_name || <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {unclustered.length > 0 && (
            <section className="pt-card">
              <div className="pt-card-h">
                <div style={{ flex: 1 }}>
                  <h3>Cities not in a cluster</h3>
                  <div className="sub">{totalMembers - inClusterMembers} members · nobody local is accountable for them</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["City", "Members", ""].map((h) => (
                        <th key={h} style={{
                          textAlign: h === "Members" ? "right" : "left", fontSize: 10, letterSpacing: ".11em",
                          textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, padding: "9px 14px",
                          borderBottom: "1px solid var(--line)", background: "var(--card-2)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unclustered.map((u) => (
                      <tr key={u.city}>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", fontWeight: 600 }}>{u.city}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{u.member_count}</td>
                        <td style={{ padding: "11px 14px", borderBottom: "1px solid var(--line-2)" }}>
                          {chapters.length > 0 ? (
                            <select className="pt-inp" style={{ fontSize: 12, padding: "5px 8px" }}
                                    defaultValue="" onChange={(e) => { if (e.target.value) void addToChapter(u.city, e.target.value); }}>
                              <option value="" disabled>Add to a cluster…</option>
                              {chapters.map((c) => <option key={c.chapter_id} value={c.chapter_id}>{c.name}</option>)}
                            </select>
                          ) : (
                            <span style={{ color: "var(--ink-4)", fontSize: 12 }}>Create a cluster first</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {qualityIssues.length > 0 && (
            <section className="pt-card" style={{ borderColor: "var(--saffron)" }}>
              <div className="pt-card-h">
                <div style={{ flex: 1 }}>
                  <h3>Before this works properly</h3>
                  <div className="sub">Measured on your real data, not invented</div>
                </div>
                <span className="pt-pill pt-p-saf">Data issue</span>
              </div>
              <div className="pt-card-b">
                <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 12 }}>
                  <b>City is free text today.</b> Across your {totalMembers} real {country} members there are{" "}
                  {quality.length} different city strings, including:
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12.5 }}>
                  {qualityIssues.map((issue, i) => (
                    <div key={i} className="row" style={{ gap: 9 }}>
                      <span style={{ flex: 1, fontFamily: "monospace" }}>{issue.detail}</span>
                      <span className="pt-pill" style={{ background: "var(--saffron-soft)", color: "var(--saffron)" }}>{issue.kind}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-divider" />
                <div className="pt-note warn" style={{ fontSize: 12 }}>
                  Clusters are only as good as this field. Two fixes, both small: make city a picker at
                  signup and in the profile editor, and run a one-time normalisation over what's already
                  stored.
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
