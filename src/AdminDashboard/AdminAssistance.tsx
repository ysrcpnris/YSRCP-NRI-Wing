/**
 * Student & Job Assistance — built to docs/design/nri-wing-prototype.html
 * (a-assist).
 *
 * This is the PUBLIC Assistance Board (assistance_posts/
 * assistance_offers, 20260805238000), not the private grievance/
 * student_requests queue chapter_assistance_board() covers for the
 * Chapter surface — the mock's own copy confirms it: "Requests are
 * visible to every member in the requester's country."
 *
 * "Views" is dropped — no view-tracking exists anywhere in this
 * schema. "Urgent" as a request type is dropped — assistance_posts.
 * category is constrained to student/job only, a deliberate decision
 * from the board's own migration. "Nudge chapter"/"Escalate" buttons
 * are dropped — no per-user notification system exists (same
 * conclusion as a-roles' Override card); "Requests needing a push" is
 * a real, honest diagnostic list instead of a button promising
 * delivery nothing would receive.
 *
 * "Median first reply" and "Replies" ARE real here (unlike
 * grievances) — assistance_offers.created_at genuinely is the first
 * reply timestamp for a post.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stats = {
  open_worldwide: number; countries_open: number; unanswered_72h: number;
  resolved_this_month: number; resolved_last_month: number; median_first_reply_hours: number | null;
};
type Responsiveness = { country: string; total_posts: number; answered_posts: number; answered_pct: number };
type NeedingPush = { id: string; title: string; member_name: string; country: string; category: string; age_days: number };
type Request = { id: string; title: string; country: string; category: string; replies: number; age_days: number; status: string; is_answered: boolean };

const CATEGORY_PILL: Record<string, { label: string; cls: string }> = {
  student: { label: "Student", cls: "bg-amber-100 text-amber-800" },
  job: { label: "Job", cls: "bg-blue-100 text-blue-800" },
};

function barColor(pct: number) {
  if (pct >= 75) return "#16A34A";
  if (pct >= 50) return "#D9641A";
  return "#DC2626";
}

export default function AdminAssistance() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [responsiveness, setResponsiveness] = useState<Responsiveness[]>([]);
  const [needingPush, setNeedingPush] = useState<NeedingPush[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<"all" | "student" | "job">("all");
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [s, r, np, req] = await Promise.all([
      supabase.rpc("admin_assistance_stats"),
      supabase.rpc("admin_assistance_responsiveness"),
      supabase.rpc("admin_assistance_needing_push"),
      supabase.rpc("admin_assistance_requests"),
    ]);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    setResponsiveness((r.data as Responsiveness[]) ?? []);
    setNeedingPush((np.data as NeedingPush[]) ?? []);
    setRequests((req.data as Request[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const resolvedDelta = stats.resolved_last_month > 0
    ? Math.round(100 * (stats.resolved_this_month - stats.resolved_last_month) / stats.resolved_last_month)
    : null;
  const visibleRequests = filter === "all" ? requests : requests.filter((r) => r.category === filter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Student & Job Assistance</h2>
        <p className="text-sm text-gray-600 mt-1">
          Requests are visible to every member in the requester's country. This is the tracking view —
          which countries are answering, and which requests are going cold.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Open worldwide</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.open_worldwide}</div>
          <div className="text-xs text-gray-500 mt-1">across {stats.countries_open} countries</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Unanswered past 72h</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: stats.unanswered_72h > 0 ? "#DC2626" : "#111827" }}>{stats.unanswered_72h}</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Resolved this month</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.resolved_this_month}</div>
          {resolvedDelta !== null && (
            <div className="text-xs mt-1" style={{ color: resolvedDelta >= 0 ? "#16A34A" : "#DC2626" }}>
              {resolvedDelta >= 0 ? "+" : ""}{resolvedDelta}% on last month
            </div>
          )}
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Median first reply</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">
            {stats.median_first_reply_hours != null ? `${stats.median_first_reply_hours}h` : "—"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3">Country responsiveness</h3>
          {responsiveness.length === 0 ? (
            <div className="text-sm text-gray-400">No open requests yet.</div>
          ) : (
            <div className="space-y-2.5">
              {responsiveness.map((r) => (
                <div key={r.country} className="flex items-center gap-2 text-sm">
                  <span className="w-28 flex-shrink-0 text-gray-700 truncate">{r.country}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${r.answered_pct}%`, background: barColor(r.answered_pct) }} />
                  </span>
                  <span className="w-10 text-right font-semibold text-gray-900 tabular-nums">{r.answered_pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Requests needing a push</h3>
            <p className="text-xs text-gray-500 mt-0.5">Open past 72 hours with no reply</p>
          </div>
          {needingPush.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">Nothing stale right now.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-bold">Request</th>
                    <th className="py-2 px-4 font-bold">Member</th>
                    <th className="py-2 px-4 font-bold">Country</th>
                    <th className="py-2 px-4 font-bold">Type</th>
                    <th className="py-2 px-4 font-bold">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {needingPush.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{n.title}</td>
                      <td className="py-2.5 px-4 text-gray-700">{n.member_name}</td>
                      <td className="py-2.5 px-4 text-gray-700">{n.country}</td>
                      <td className="py-2.5 px-4">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_PILL[n.category]?.cls ?? "bg-gray-100 text-gray-700"}`}>
                          {CATEGORY_PILL[n.category]?.label ?? n.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 tabular-nums" style={{ color: "#DC2626", fontWeight: 600 }}>{n.age_days}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">All requests</h3>
          <div className="flex gap-2">
            {(["all", "student", "job"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${filter === f ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 border-gray-300 hover:border-primary-300"}`}
              >
                {f === "all" ? "All" : f === "student" ? "Student" : "Job"}
              </button>
            ))}
          </div>
        </div>
        {visibleRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nothing here.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Request</th>
                  <th className="py-2 px-4 font-bold">Country</th>
                  <th className="py-2 px-4 font-bold">Type</th>
                  <th className="py-2 px-4 font-bold text-right">Replies</th>
                  <th className="py-2 px-4 font-bold">Age</th>
                  <th className="py-2 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{r.title}</td>
                    <td className="py-2.5 px-4 text-gray-700">{r.country}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CATEGORY_PILL[r.category]?.cls ?? "bg-gray-100 text-gray-700"}`}>
                        {CATEGORY_PILL[r.category]?.label ?? r.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{r.replies}</td>
                    <td className="py-2.5 px-4 tabular-nums">{r.age_days}d</td>
                    <td className="py-2.5 px-4">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={r.status === "resolved" ? { background: "#DCFCE7", color: "#166534" } : r.is_answered ? { background: "#DCFCE7", color: "#166534" } : { background: "#FEE2E2", color: "#991B1B" }}
                      >
                        {r.status === "resolved" ? "Resolved" : r.is_answered ? "Being helped" : "No reply"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
