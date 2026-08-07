/**
 * Roles & Access — built to docs/design/nri-wing-prototype.html (a-roles).
 *
 * THE MOCK'S OWN "NEEDS DATABASE WORK, NOT UI WORK" NOTE IS STALE
 *   That warning describes a system with three flat roles and
 *   all-or-nothing is_admin(). This codebase's scoped member_roles /
 *   wing_role system (built earlier this session) already is that
 *   work. This screen presents the real, already-enforced model — it
 *   does not gate on new schema.
 *
 * THE PERMISSION MATRIX IS A REFERENCE TABLE, NOT A LIVE QUERY
 *   Each row states what the database actually enforces, checked
 *   against this session's exploit tests and the 98-check auth-matrix
 *   suite — not copied from the mock. Two cells diverge from the
 *   mock's own assumptions on purpose: Team Lead cannot schedule
 *   events or assign assistance requests (can_write_scope() /
 *   can_write_chapter() both exclude team_lead, verified live against
 *   staging), and Chapter Lead CAN appoint a team lead within their
 *   own chapter (grant_wing_role() allows it, exercised by the
 *   auth-matrix's "chapter lead appoints team lead in own chapter" case)
 *   — the mock's simplified model has neither.
 *
 * ACCESS HYGIENE SIGNALS ARE REAL, CHECKED WITH THE USER
 *   "Secretariat overrides" now counts real admin_overrides rows via
 *   admin_role_actions_this_month() — that audit log already existed
 *   and already fired on every grant/revoke before this screen was
 *   built; only the reason field and this read were added
 *   (20260807100000/1). "Coordinator notified" is dropped — no
 *   per-user notification system exists in this codebase.
 *
 * "ROLES CLUSTERS INVENTED FOR THEMSELVES" — REAL TITLES ONLY
 *   No 15-seat premise, no capability tags — neither exists, and the
 *   committee was made explicitly unlimited earlier this session.
 *   wing_custom_titled_roles() returns real team_lead holders with a
 *   non-standard title and nothing invented on top.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RoleManager from "../components/RoleManager";

type CustomRole = { role_id: string; title: string; chapter: string | null; country: string | null; holder_name: string; granted_at: string };
type MultiHolder = { profile_id: string; full_name: string; role_count: number; roles: string };
type RecentAppointment = { profile_id: string; full_name: string; role: string; granted_at: string; joined_at: string; days_after: number };
type UnfilledCountry = { country: string; member_count: number };

const MATRIX: { capability: string; cells: [string, string, string, string, string]; warn?: boolean }[] = [
  { capability: "View members", cells: ["All", "Own country", "Own chapter", "Own country (read-only)", "Self"] },
  { capability: "Export member data", cells: ["Yes", "No", "No", "No", "No"] },
  { capability: "View EPIC / voter status", cells: ["Yes", "No", "No", "No", "Own only"], warn: true },
  { capability: "Approve Jagananna appointments", cells: ["Yes", "No", "No", "No", "Request only"] },
  { capability: "Schedule events", cells: ["Global", "Own country", "Own chapter", "No", "No"] },
  { capability: "Manage WhatsApp groups", cells: ["All", "Own country", "Own chapter", "No", "Join only"] },
  { capability: "Assign assistance requests", cells: ["All", "Own country", "Own chapter", "No", "No"] },
  { capability: "Appoint roles", cells: ["All", "Chapter & team leads", "Team leads in own chapter", "No", "No"] },
  { capability: "View grievances", cells: ["All", "Own country", "Own chapter", "No", "Own only"] },
];
const COLS = ["Secretariat", "Country Coordinator", "Chapter Lead", "Team Lead", "Member"];

function pillColor(v: string) {
  if (v === "All" || v === "Global" || v === "Yes") return { background: "#DCFCE7", color: "#166534" };
  if (v === "No") return { background: "#F3F4F6", color: "#6B7280" };
  return { background: "#DBEAFE", color: "#1E40AF" };
}

export default function AdminRolesAccess() {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [multiHolders, setMultiHolders] = useState<MultiHolder[]>([]);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [unfilled, setUnfilled] = useState<UnfilledCountry[]>([]);
  const [actionsThisMonth, setActionsThisMonth] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [cr, mh, ra, uf, am] = await Promise.all([
      supabase.rpc("wing_custom_titled_roles"),
      supabase.rpc("wing_role_multi_holders"),
      supabase.rpc("wing_roles_appointed_soon_after_joining", { p_days: 30 }),
      supabase.rpc("wing_countries_without_coordinator"),
      supabase.rpc("admin_role_actions_this_month"),
    ]);
    setCustomRoles((cr.data as CustomRole[]) ?? []);
    setMultiHolders((mh.data as MultiHolder[]) ?? []);
    setRecentAppointments((ra.data as RecentAppointment[]) ?? []);
    setUnfilled((uf.data as UnfilledCountry[]) ?? []);
    setActionsThisMonth((am.data as number) ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Roles & Access</h2>
        <p className="text-sm text-gray-600 mt-1">
          Who can do what, and where. Scope is enforced by database policy — a coordinator querying
          the API directly still sees only their own country.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Reserved</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Secretariat only</span>
          </div>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div>Jagananna appointments</div>
            <div>Voter status & EPIC records</div>
            <div>Member data export</div>
            <div>Wing-wide campaigns</div>
            <div>Appointing country coordinators</div>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 text-xs text-gray-500 leading-relaxed">
            Never delegated. These carry either political risk or protected data.
          </div>
        </div>

        <div className="p-5 bg-white border-2 border-emerald-300 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Delegated</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Chapter runs it</span>
          </div>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div>Their members — contact, welcome, notes</div>
            <div>Assistance requests & assignment</div>
            <div>Events and online meetings</div>
            <div>WhatsApp groups and invite links</div>
            <div>Committee seats and city leads</div>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 text-xs text-gray-500 leading-relaxed">
            The coordinator acts without asking. Secretariat sees the outcome, not a request queue.
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Override</span>
            <span className="text-xs text-gray-400 uppercase tracking-wide">Possible, and visible</span>
          </div>
          <div className="space-y-1.5 text-sm text-gray-700">
            <div>Secretariat can act on anything</div>
            <div>Every grant and revoke is written to the audit log</div>
            <div>A reason can be recorded against it</div>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 text-xs text-gray-500 leading-relaxed">
            Without this, delegation is theatre. With it, stepping in is a deliberate act on the
            record. (No per-user notification exists yet — this is visible in the audit log, not
            pushed to the coordinator.)
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Permission matrix</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Capability, not operating model — the secretariat <i>can</i> do everything in the
            delegated columns, and normally shouldn't. Verified against this session's own
            exploit tests and auth-matrix suite.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 px-4 font-bold">Capability</th>
                {COLS.map((c) => (
                  <th key={c} className="py-2 px-4 font-bold whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.capability} className={`border-b border-gray-100 ${row.warn ? "bg-red-50/50" : ""}`}>
                  <td className="py-2.5 px-4 font-semibold text-gray-900">{row.capability}</td>
                  {row.cells.map((v, i) => (
                    <td key={i} className="py-2.5 px-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={pillColor(v)}>{v}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Roles chapters invented for themselves</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Chapters fill their committee with whatever they need — these titles exist in one
            chapter only. No seat limit, no capability tagging — just the real title and holder.
          </p>
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-400 text-sm">Loading…</div>
        ) : customRoles.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No custom-titled team leads yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Title</th>
                  <th className="py-2 px-4 font-bold">Chapter</th>
                  <th className="py-2 px-4 font-bold">Holder</th>
                  <th className="py-2 px-4 font-bold">Created</th>
                </tr>
              </thead>
              <tbody>
                {customRoles.map((r) => (
                  <tr key={r.role_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{r.title}</td>
                    <td className="py-2.5 px-4 text-gray-700">{r.chapter ?? r.country ?? "—"}</td>
                    <td className="py-2.5 px-4">{r.holder_name}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">{new Date(r.granted_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Who holds a role</h3>
          <p className="text-xs text-gray-500 mb-4">Appoint, review and revoke — every action here is written to the audit log.</p>
          <RoleManager />
          {unfilled.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Countries with members but no coordinator
              </h4>
              <div className="space-y-1.5">
                {unfilled.slice(0, 8).map((u) => (
                  <div key={u.country} className="flex items-center justify-between text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span className="font-semibold text-gray-900">{u.country}</span>
                    <span className="text-gray-500 text-xs">{u.member_count} members, unfilled</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-4">Access hygiene</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Secretariat role actions</div>
                <div className="text-xs text-gray-500">{actionsThisMonth} this month · each logged with actor, action and time</div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-semibold text-gray-900">Someone holding multiple roles</div>
              {multiHolders.length === 0 ? (
                <div className="text-xs text-gray-400 mt-1">Nobody currently holds more than one active role.</div>
              ) : (
                multiHolders.map((m) => (
                  <div key={m.profile_id} className="text-xs text-gray-500 mt-1">
                    {m.full_name} — {m.roles}
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <div className="text-sm font-semibold text-gray-900">Appointed under 30 days after joining</div>
              {recentAppointments.length === 0 ? (
                <div className="text-xs text-gray-400 mt-1">None right now.</div>
              ) : (
                <div className="text-xs text-gray-500 mt-1">{recentAppointments.length} appointment{recentAppointments.length === 1 ? "" : "s"} — worth a check</div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Every appointment is logged</div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">On</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
