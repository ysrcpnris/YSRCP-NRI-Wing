/**
 * Feedback Analysis — built to docs/design/nri-wing-prototype.html
 * (a-feedback).
 *
 * SENTIMENT AND THEMES — checked with the user: dropped, not faked.
 * The mock's whole identity is sentiment ("62% positive", "▲ 8pts
 * since April" per head) and a "Themes raised most" bar chart. Nothing
 * backs either — no sentiment score, no theme/tag column, no
 * historical snapshot to diff a trend against. Stat cards below are
 * real submission/unassigned counts per head instead; there is no
 * Themes card at all, because there's nothing real to group by.
 *
 * ASSIGNMENT — checked with the user: matches a-griev's precedent.
 * a-feedback is a wing-wide Admin screen, not a Chapter one — the same
 * distinction a-griev's own migration already reasoned through for
 * assign_case() (chapter volunteer) vs assign_grievance_leader() (a
 * named AP official). assign_suggestion_leader() is a faithful copy of
 * the latter mechanism, same leader_assignments table, same is_admin()
 * gate, same AssignCell interaction pattern as AdminGrievances.tsx's
 * OwnerCell — not a new concept.
 *
 * "Assign all" is a client-side loop over assign_suggestion_leader(),
 * not a new bulk RPC — each assignment is fully independent (no shared
 * capacity or lock to race, unlike a-appt's bookings), so a loop is
 * exactly as correct as a server-side batch and needed no new SQL.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stat = { head: string; submissions: number; unassigned: number };
type FeedbackRow = {
  id: string; name: string | null; suggestion: string; country: string | null;
  is_member: boolean; submitted_at: string; head: string; subject: string | null;
  assigned_leader_id: string | null; leader_name: string | null; leader_role: string | null;
};
type LeaderOption = { id: string; name: string; role: string; district: string | null };

const HEAD_LABEL: Record<string, string> = { political: "Political", policies: "Policies", governance: "Governance" };
const HEAD_COLOR: Record<string, string> = { political: "#1E3A8A", policies: "#16A34A", governance: "#D9641A" };

function ageLabel(iso: string) {
  const hrs = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function AssignCell({ row, leaders, onAssigned }: { row: FeedbackRow; leaders: LeaderOption[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assign = async (leaderId: string) => {
    setSaving(true);
    const { data, error } = await supabase.rpc("assign_suggestion_leader", {
      p_suggestion_id: row.id, p_leader_assignment_id: leaderId || null,
    });
    setSaving(false);
    if (!error && data !== false) {
      setOpen(false);
      onAssigned();
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs font-semibold text-left hover:underline" style={{ color: row.leader_name ? "#111827" : "#DC2626" }}>
        {row.leader_name ? `${row.leader_name} — ${row.leader_role}` : "Unassigned"}
      </button>
    );
  }
  return (
    <select autoFocus disabled={saving} defaultValue={row.assigned_leader_id ?? ""} onChange={(e) => void assign(e.target.value)} onBlur={() => setOpen(false)} className="text-xs border border-gray-300 rounded px-1 py-0.5">
      <option value="">Unassigned</option>
      {leaders.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.role}{l.district ? ` (${l.district})` : ""}</option>)}
    </select>
  );
}

export default function AdminFeedback() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningAll, setAssigningAll] = useState(false);
  const [bulkLeader, setBulkLeader] = useState("");

  const fetchAll = useCallback(async () => {
    const [s, f, l] = await Promise.all([
      supabase.rpc("admin_feedback_stats"),
      supabase.rpc("feedback_for_my_countries", { p_limit: 200 }),
      supabase.from("leader_assignments").select("id, role, district, leaders_master(name)").eq("is_active", true),
    ]);
    setStats((s.data as Stat[]) ?? []);
    setRows((f.data as FeedbackRow[]) ?? []);
    const leaderRows = ((l.data as unknown[]) ?? []).map((r) => {
      const row = r as { id: string; role: string; district: string | null; leaders_master: { name: string } | { name: string }[] | null };
      const lm = Array.isArray(row.leaders_master) ? row.leaders_master[0] : row.leaders_master;
      return { id: row.id, role: row.role, district: row.district, name: lm?.name ?? "—" };
    });
    setLeaders(leaderRows);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const unassigned = rows.filter((r) => !r.assigned_leader_id);

  const assignAll = async () => {
    if (!bulkLeader || unassigned.length === 0) return;
    setAssigningAll(true);
    await Promise.all(unassigned.map((r) => supabase.rpc("assign_suggestion_leader", { p_suggestion_id: r.id, p_leader_assignment_id: bulkLeader })));
    setAssigningAll(false);
    setBulkLeader("");
    void fetchAll();
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const oldestHrs = unassigned.length > 0 ? Math.max(...unassigned.map((r) => Date.now() - new Date(r.submitted_at).getTime())) / 3600000 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Feedback Analysis</h2>
        <p className="text-sm text-gray-600 mt-1">What the diaspora is submitting, grouped by head, and who owns following up.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.head} className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: HEAD_COLOR[s.head] }} />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{HEAD_LABEL[s.head] ?? s.head}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 tabular-nums">{s.submissions}</div>
            <div className="text-xs text-gray-500 mt-1">submissions</div>
            <div className="text-xs mt-2 font-semibold" style={{ color: s.unassigned > 0 ? "#DC2626" : "#16A34A" }}>
              {s.unassigned} unassigned
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Awaiting triage</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {unassigned.length} unassigned{unassigned.length > 0 ? ` · oldest ${Math.round(oldestHrs)}h` : ""}
            </p>
          </div>
          {unassigned.length > 0 && (
            <div className="flex gap-2 items-center">
              <select value={bulkLeader} onChange={(e) => setBulkLeader(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
                <option value="">Choose a leader…</option>
                {leaders.map((l) => <option key={l.id} value={l.id}>{l.name} — {l.role}</option>)}
              </select>
              <button onClick={() => void assignAll()} disabled={!bulkLeader || assigningAll} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                {assigningAll ? "Assigning…" : "Assign all"}
              </button>
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No feedback yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${HEAD_COLOR[r.head]}1a`, color: HEAD_COLOR[r.head] }}>
                        {HEAD_LABEL[r.head] ?? r.head}
                      </span>
                      <span className="text-xs text-gray-400">{r.country ?? "—"} · {ageLabel(r.submitted_at)}</span>
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">{r.subject ?? "(no subject)"}</div>
                    <p className="text-sm text-gray-600 mt-0.5">{r.suggestion}</p>
                    <div className="text-xs text-gray-500 mt-1">{r.name || "No name given"} · {r.is_member ? "Signed-in member" : "Not signed in"}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <AssignCell row={r} leaders={leaders} onAssigned={fetchAll} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
