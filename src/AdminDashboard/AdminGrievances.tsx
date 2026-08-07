/**
 * Grievances — built to docs/design/nri-wing-prototype.html (a-griev).
 *
 * Deliberately a NEW screen, not a retrofit of AssistanceQueue.tsx's
 * "Grievances & Students" tab — that component and assistance_queue()
 * are shared with the Chapter surface and only ever understood
 * two-country-scoped kinds. This one is wing-wide, admin-only, and
 * adds real district + AP-leader ownership (20260807110000), checked
 * with the user rather than assumed:
 *
 *   District: the member form never captured it before this slice —
 *   added a real dropdown sourced from leader_assignments' own
 *   district list, not hand-typed values liable to drift.
 *
 *   Owner: means a named AP party official (District President,
 *   Assembly Coordinator), not a wing volunteer abroad — a different
 *   concept from assign_case()'s wing-side assignment in c-assist.
 *   assigned_leader_id references leader_assignments directly, so
 *   "Owner" is always a real person already in MasterData.tsx, never a
 *   placeholder desk label.
 *
 * "Past SLA" (21 days) is a fixed, documented convention — no SLA
 * config exists anywhere in this schema. The category legend groups by
 * whichever categories members actually chose (general/welfare/civic/
 * land/other), not the mock's five differently-worded categories,
 * which the submission form has never offered.
 *
 * A real security bug was found and fixed while building this screen
 * (20260807110001): a table-level GRANT UPDATE from an unrelated
 * outage-fix had silently reopened direct-REST writes to status/
 * response/assigned_to on grievances for any country coordinator,
 * bypassing respond_to_case() entirely. Unrelated to this UI, fixed at
 * the database layer before this screen shipped.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type GrievanceRow = {
  id: string; reference_no: string | null; subject: string | null; category: string | null;
  district: string | null; member_name: string | null; member_country: string | null;
  status: string; created_at: string; resolved_at: string | null;
  assigned_leader_id: string | null; leader_name: string | null; leader_role: string | null; leader_district: string | null;
};
type Stats = {
  open_count: number; past_sla_count: number; closed_this_quarter: number;
  resolved_pct: number; median_resolution_days: number | null; categories: Record<string, number>;
};
type LeaderOption = { id: string; name: string; role: string; district: string | null };

const CATEGORY_LABEL: Record<string, string> = {
  general: "General", welfare: "Welfare", civic: "Civic", land: "Land records", other: "Other",
};
const CATEGORY_COLOR: Record<string, string> = {
  general: "#6B7280", welfare: "#16A34A", civic: "#D9641A", land: "#1E3A8A", other: "#9CA3AF",
};

function daysOpen(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function OwnerCell({ g, leaders, onAssigned }: { g: GrievanceRow; leaders: LeaderOption[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const assign = async (leaderId: string) => {
    setSaving(true);
    const { data, error } = await supabase.rpc("assign_grievance_leader", {
      p_grievance_id: g.id, p_leader_assignment_id: leaderId || null,
    });
    setSaving(false);
    if (!error && data !== false) {
      setOpen(false);
      onAssigned();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-left hover:underline"
        style={{ color: g.leader_name ? "#111827" : "#DC2626" }}
      >
        {g.leader_name ? `${g.leader_name} — ${g.leader_role}` : "Unassigned"}
      </button>
    );
  }
  return (
    <select
      autoFocus
      disabled={saving}
      defaultValue={g.assigned_leader_id ?? ""}
      onChange={(e) => void assign(e.target.value)}
      onBlur={() => setOpen(false)}
      className="text-xs border border-gray-300 rounded px-1 py-0.5"
    >
      <option value="">Unassigned</option>
      {leaders.map((l) => (
        <option key={l.id} value={l.id}>{l.name} — {l.role}{l.district ? ` (${l.district})` : ""}</option>
      ))}
    </select>
  );
}

export default function AdminGrievances() {
  const [rows, setRows] = useState<GrievanceRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaders, setLeaders] = useState<LeaderOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [g, s, l] = await Promise.all([
      supabase.rpc("admin_grievances", { p_status: "open" }),
      supabase.rpc("admin_grievance_stats"),
      supabase.from("leader_assignments").select("id, role, district, leaders_master(name)").eq("is_active", true),
    ]);
    setRows((g.data as GrievanceRow[]) ?? []);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    const leaderRows = ((l.data as unknown[]) ?? []).map((r) => {
      const row = r as { id: string; role: string; district: string | null; leaders_master: { name: string } | { name: string }[] | null };
      const lm = Array.isArray(row.leaders_master) ? row.leaders_master[0] : row.leaders_master;
      return { id: row.id, role: row.role, district: row.district, name: lm?.name ?? "—" };
    });
    setLeaders(leaderRows);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const exportCsv = () => {
    const header = ["Reference", "Subject", "Member", "Country", "District", "Category", "Owner", "Age (days)", "Status"];
    const lines = rows.map((g) => [
      g.reference_no ?? "", g.subject ?? "", g.member_name ?? "", g.member_country ?? "",
      g.district ?? "", g.category ?? "", g.leader_name ? `${g.leader_name} (${g.leader_role})` : "Unassigned",
      String(daysOpen(g.created_at)), g.status,
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `grievances-open-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const categoryEntries = Object.entries(stats.categories).sort((a, b) => b[1] - a[1]);
  const categoryTotal = categoryEntries.reduce((a, [, n]) => a + n, 0) || 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Grievances</h2>
        <p className="text-sm text-gray-600 mt-1">
          Every grievance carries a reference and, once assigned, a named AP official responsible for it.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Open</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.open_count}</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Past SLA (21d)</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: stats.past_sla_count > 0 ? "#DC2626" : "#111827" }}>{stats.past_sla_count}</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Closed this quarter</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.closed_this_quarter}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.resolved_pct}% resolved</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Median resolution</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">
            {stats.median_resolution_days != null ? `${stats.median_resolution_days}d` : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.7fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3">By category</h3>
          {categoryEntries.length === 0 ? (
            <div className="text-sm text-gray-400">No open grievances.</div>
          ) : (
            <div className="space-y-2">
              {categoryEntries.map(([cat, n]) => (
                <div key={cat} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLOR[cat] ?? "#9CA3AF" }} />
                  <span className="flex-1 text-gray-700">{CATEGORY_LABEL[cat] ?? cat}</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{n}</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                {categoryTotal} open grievance{categoryTotal === 1 ? "" : "s"} categorised
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Open grievances</h3>
            <button onClick={exportCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
              Export
            </button>
          </div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nothing open.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-bold">Reference</th>
                    <th className="py-2 px-4 font-bold">Subject</th>
                    <th className="py-2 px-4 font-bold">Member</th>
                    <th className="py-2 px-4 font-bold">District</th>
                    <th className="py-2 px-4 font-bold">Owner</th>
                    <th className="py-2 px-4 font-bold">Age</th>
                    <th className="py-2 px-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => {
                    const age = daysOpen(g.created_at);
                    const pastSla = age >= 21;
                    return (
                      <tr key={g.id} className={`border-b border-gray-100 ${pastSla ? "bg-red-50/60" : ""}`}>
                        <td className="py-2.5 px-4 font-mono text-xs text-gray-500 whitespace-nowrap">{g.reference_no}</td>
                        <td className="py-2.5 px-4 font-semibold text-gray-900">{g.subject}</td>
                        <td className="py-2.5 px-4 text-gray-700">{g.member_name}</td>
                        <td className="py-2.5 px-4 text-gray-700">{g.district ?? "—"}</td>
                        <td className="py-2.5 px-4"><OwnerCell g={g} leaders={leaders} onAssigned={() => void fetchAll()} /></td>
                        <td className="py-2.5 px-4 tabular-nums" style={pastSla ? { color: "#DC2626", fontWeight: 600 } : undefined}>{age}d</td>
                        <td className="py-2.5 px-4">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={pastSla ? { background: "#FEE2E2", color: "#991B1B" } : g.status === "in_progress" ? { background: "#DBEAFE", color: "#1E40AF" } : { background: "#F3F4F6", color: "#374151" }}
                          >
                            {pastSla ? "Past SLA" : g.status === "in_progress" ? "In progress" : g.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
