/**
 * Chapter Assistance — built to docs/design/nri-wing-prototype.html
 * (screen `c-assist`).
 *
 * Deliberately a NEW screen, not a retrofit of AssistanceQueue.tsx —
 * that component and assistance_queue() are shared with the Admin
 * surface and only ever understood two kinds (grievance/student).
 * This one calls the new chapter_assistance_board()/assign_case()/
 * chapter_volunteers()/chapter_assistance_stats() RPCs
 * (20260806160000), which add a third kind — Job — and a real
 * coordinator-assigns-a-volunteer workflow. Nothing about the
 * existing "Assistance queue" tab or the Admin screen changed.
 *
 * "Median first reply" / "Response rate" in the mock are relabelled
 * the same way as c-home: no first-response timestamp exists in this
 * schema, so these are "median hours to resolution" and "moved off
 * Open" — real, smaller claims.
 *
 * The volunteers card shows a real open-case count with no capacity
 * pill — no capacity concept was ever configured anywhere, and the
 * mock's "N more volunteers, offered help, never assigned anything"
 * line has no backing (no volunteer-for-role workflow exists).
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type CaseRow = {
  kind: "grievance" | "student" | "job"; id: string; reference_no: string | null;
  title: string | null; detail: string | null; status: string; member_id: string;
  member_name: string | null; member_email: string | null; member_mobile: string | null;
  member_country: string | null; member_city: string | null;
  created_at: string; updated_at: string | null;
  assigned_to: string | null; assigned_name: string | null; total_count: number;
};
type Stats = {
  open_total: number; open_student: number; open_job: number; open_grievance: number;
  unassigned: number; response_rate_pct: number; median_hours_to_resolution: number | null;
};
type Volunteer = { profile_id: string; full_name: string; role: string; title: string | null; chapter: string | null; open_cases: number };

const KIND_LABEL: Record<CaseRow["kind"], string> = { grievance: "Grievance", student: "Student", job: "Job" };
const KIND_PILL: Record<CaseRow["kind"], string> = { grievance: "pt-p-navy", student: "pt-p-green", job: "" };

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function AssignPicker({ c, volunteers, onAssigned }: { c: CaseRow; volunteers: Volunteer[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assign = async (volunteerId: string) => {
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("assign_case", {
      p_kind: c.kind, p_id: c.id, p_volunteer_id: volunteerId,
    });
    setSaving(false);
    if (err || data === false) {
      setError(err ? "Couldn't assign that." : "Outside the chapter you cover.");
      return;
    }
    setOpen(false);
    onAssigned();
  };

  if (c.assigned_to) {
    return <span className="pill p-green">{c.assigned_name || "Assigned"}</span>;
  }
  if (!open) {
    return (
      <button className="btn btn-pri btn-sm" onClick={() => setOpen(true)}>Assign</button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 160 }}>
      <select
        disabled={saving}
        defaultValue=""
        onChange={(e) => e.target.value && void assign(e.target.value)}
        style={{ fontSize: 12, padding: "4px 6px" }}
      >
        <option value="" disabled>Choose a volunteer…</option>
        {volunteers.map((v) => (
          <option key={v.profile_id} value={v.profile_id}>
            {v.full_name} — {v.title || v.role} ({v.open_cases} open)
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: 11, color: "var(--crimson)" }}>{error}</span>}
      <button className="btn btn-out btn-sm" onClick={() => setOpen(false)} disabled={saving}>Cancel</button>
    </div>
  );
}

export default function MyChapterAssist({ country }: { country: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [filter, setFilter] = useState<"all" | "unassigned">("all");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [s, c, v] = await Promise.all([
      supabase.rpc("chapter_assistance_stats"),
      supabase.rpc("chapter_assistance_board", { p_status: null }),
      supabase.rpc("chapter_volunteers"),
    ]);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    setCases((c.data as CaseRow[]) ?? []);
    setVolunteers((v.data as Volunteer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading || !stats) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  const visible = filter === "unassigned" ? cases.filter((c) => !c.assigned_to) : cases;

  return (
    <div>
      <p className="sec-note" style={{ marginBottom: 16 }}>
        Student and job requests from your members. Assign them to a volunteer and keep them moving.
      </p>

      <div className="pt-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 18 }}>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Open in {country}</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.open_total}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            {stats.open_student} student · {stats.open_job} job · {stats.open_grievance} grievance
          </div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Unassigned</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600, color: stats.unassigned > 0 ? "var(--saffron)" : undefined }}>{stats.unassigned}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>nobody owns these yet</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Cases moved off Open</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>{stats.response_rate_pct}%</div>
        </div>
        <div className="pt-card" style={{ padding: "15px 16px" }}>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600 }}>Median hours to resolution</div>
          <div style={{ fontFamily: "var(--serif)", fontSize: 29, fontWeight: 600 }}>
            {stats.median_hours_to_resolution != null ? stats.median_hours_to_resolution : "—"}
          </div>
        </div>
      </div>

      <div className="pt-page">
        <div className="card">
          <div className="card-h">
            <div style={{ flex: 1 }}>
              <h3>Open requests</h3>
              <div className="sub">Visible to {country} coordinators — you route them to the right helper</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className={`btn btn-sm ${filter === "all" ? "btn-pri" : "btn-out"}`} onClick={() => setFilter("all")}>All {cases.length}</button>
              <button className={`btn btn-sm ${filter === "unassigned" ? "btn-pri" : "btn-out"}`} onClick={() => setFilter("unassigned")}>
                Unassigned {cases.filter((c) => !c.assigned_to).length}
              </button>
            </div>
          </div>
          {visible.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--ink-4)", fontSize: 12.5 }}>Nothing here.</div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr><th>Request</th><th>Member</th><th>City</th><th>Type</th><th>Assigned to</th><th>Age</th><th></th></tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const age = daysOpen(c.created_at);
                    const stale = age >= 6 && !c.assigned_to;
                    return (
                      <tr key={`${c.kind}-${c.id}`} style={stale ? { background: "var(--crimson-soft)" } : undefined}>
                        <td className="t-name">{c.title || "—"}</td>
                        <td>{c.member_name || "—"}</td>
                        <td>{c.member_city || "—"}</td>
                        <td><span className={`pill ${KIND_PILL[c.kind]}`}>{KIND_LABEL[c.kind]}</span></td>
                        <td>
                          <AssignPicker c={c} volunteers={volunteers} onAssigned={() => void fetchAll()} />
                        </td>
                        <td style={stale ? { color: "var(--crimson)", fontWeight: 600 } : undefined}>{age}d</td>
                        <td />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="pt-rail" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div className="card-h"><h3>Your volunteers</h3></div>
            <div className="card-b stack" style={{ gap: 11 }}>
              {volunteers.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink-4)" }}>No team leads appointed yet.</div>
              ) : (
                volunteers.map((v, i) => (
                  <div key={v.profile_id}>
                    {i > 0 && <div className="divider" style={{ margin: "0 0 11px" }} />}
                    <div className="row">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{v.full_name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{v.title || (v.role === "chapter_lead" ? "Chapter lead" : "Team lead")}</div>
                      </div>
                      <span className="pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>{v.open_cases} open</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>What you can't see</h3></div>
            <div className="card-b stack" style={{ gap: 9, fontSize: 12.5, color: "var(--ink-3)" }}>
              <div className="row" style={{ gap: 8 }}><span style={{ color: "var(--crimson)" }}>✕</span> Assistance requests from other chapters</div>
              <div className="row" style={{ gap: 8 }}><span style={{ color: "var(--crimson)" }}>✕</span> Job request contact details until the requester accepts an offer</div>
              <div className="divider" style={{ margin: "3px 0" }} />
              <div style={{ lineHeight: 1.6 }}>Scope runs by chapter, both ways — a request from a member in another country never appears here.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
