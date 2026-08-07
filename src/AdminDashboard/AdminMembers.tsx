/**
 * Members — built to docs/design/nri-wing-prototype.html (a-members).
 *
 * admin_member_list() extended with role/vote/contribution/referral
 * columns (20260808110000) — everything reused from real, already-
 * granted profile columns and member_roles, nothing invented.
 *
 * "Join org" is deliberately absent — no backing column exists (this
 * screen's own research pass re-confirmed the same conclusion already
 * reached twice this session for c-members and MyProfile.tsx's
 * render-only radio). "Import cohort" is dropped, not stubbed — no
 * bulk-import mechanism exists anywhere in this codebase.
 *
 * Found and fixed while building this screen, unrelated to it: two
 * real bugs in the referral system (wrong code column in a c-home
 * join, and a privileged-column guard silently reverting
 * process_my_referral()'s own write) — see 20260808110001/110002.
 *
 * "Elevate" reuses RoleManager.tsx as-is (already embedded in
 * WingManagement and a-roles) rather than rebuilding its scope logic
 * a fourth time.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RoleManager from "../components/RoleManager";

type Member = {
  id: string; public_user_code: string | null; full_name: string | null; email: string | null;
  country_of_residence: string | null; city_abroad: string | null;
  has_vote: boolean | null; contribution_areas: string[] | null;
  wing_role: string | null; wing_role_country: string | null; wing_role_chapter: string | null;
  referred_count: number;
};

const CONTRIBUTION_LABEL: Record<string, string> = {
  social_media: "Social Media", technology: "Technology", political: "Political",
};
const WING_ROLE_LABEL: Record<string, string> = {
  secretariat: "Secretariat", country_coordinator: "Coordinator", chapter_lead: "Chapter Lead", team_lead: "Team Lead",
};

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showElevateFor, setShowElevateFor] = useState<Member | null>(null);

  const fetchMembers = useCallback(async (q: string) => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_member_list", { p_search: q || null, p_limit: 200 });
    const rows = (data as (Member & { total_count: number })[]) ?? [];
    setMembers(rows);
    setTotal(rows[0]?.total_count ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchMembers(""); }, [fetchMembers]);

  const exportCsv = () => {
    const header = ["Code", "Name", "Email", "Country", "Role", "Vote", "Contributes", "Referred"];
    const lines = members.map((m) => [
      m.public_user_code ?? "", m.full_name ?? "", m.email ?? "", m.country_of_residence ?? "",
      m.wing_role ? WING_ROLE_LABEL[m.wing_role] ?? m.wing_role : "Member",
      m.has_vote === true ? "Yes" : m.has_vote === false ? "No" : "Not answered",
      (m.contribution_areas ?? []).map((c) => CONTRIBUTION_LABEL[c] ?? c).join("; "),
      String(m.referred_count),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "members.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Members</h2>
          <p className="text-sm text-gray-600 mt-1">{total.toLocaleString()} members</p>
        </div>
        <button onClick={exportCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
          Export
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void fetchMembers(search)}
          placeholder="Search name, email, mobile, city, or code"
          className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
        />
        <button onClick={() => void fetchMembers(search)} className="text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
          Search
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-1">Elevate a member</h3>
        <p className="text-xs text-gray-500 mb-3">
          Elevation adds a role without replacing the member account. Scope is auto-bound to what you
          hold, and every elevation is logged and reversible.
        </p>
        <RoleManager />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-400">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Member</th>
                  <th className="py-2 px-4 font-bold">Code</th>
                  <th className="py-2 px-4 font-bold">Country</th>
                  <th className="py-2 px-4 font-bold">Role</th>
                  <th className="py-2 px-4 font-bold">Vote</th>
                  <th className="py-2 px-4 font-bold">Contributes</th>
                  <th className="py-2 px-4 font-bold text-right">Referred</th>
                  <th className="py-2 px-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-gray-900">{m.full_name ?? "—"}</div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs text-gray-500">{m.public_user_code}</td>
                    <td className="py-2.5 px-4 text-gray-700">{m.country_of_residence}{m.city_abroad ? ` · ${m.city_abroad}` : ""}</td>
                    <td className="py-2.5 px-4">
                      {m.wing_role ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          {WING_ROLE_LABEL[m.wing_role] ?? m.wing_role}{m.wing_role_chapter ? ` · ${m.wing_role_chapter}` : m.wing_role_country ? ` · ${m.wing_role_country}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Member</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.has_vote === true ? "bg-emerald-100 text-emerald-700" : m.has_vote === false ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-800"}`}>
                        {m.has_vote === true ? "Yes" : m.has_vote === false ? "No" : "Not answered"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(m.contribution_areas ?? []).length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          (m.contribution_areas ?? []).map((c) => (
                            <span key={c} className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{CONTRIBUTION_LABEL[c] ?? c}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{m.referred_count}</td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setShowElevateFor(m)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300"
                      >
                        {m.wing_role ? "Manage role" : "Elevate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showElevateFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowElevateFor(null)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">{showElevateFor.full_name}</h3>
              <button onClick={() => setShowElevateFor(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Use the appoint form above (or the roster below) to grant or manage this member's role.
              Search "{showElevateFor.email}" to find them.
            </p>
            <RoleManager />
          </div>
        </div>
      )}
    </div>
  );
}
