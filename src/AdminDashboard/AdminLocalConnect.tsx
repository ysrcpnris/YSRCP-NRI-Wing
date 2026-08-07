/**
 * Local Connect — built to docs/design/nri-wing-prototype.html (a-connect).
 *
 * MANDAL PRESIDENTS: THE BACKEND EXISTED, THE ADMIN UI DIDN'T
 *   20260805235000 built leader_assignments.mandal, resolve_mandal()
 *   and the member-facing read side, but MasterData.tsx's role
 *   dropdown never gained "Mandal President" — so despite the
 *   groundwork, essentially no real assignments existed. Checked with
 *   the user, then built for real: MasterData.tsx now offers the role
 *   (with a mandal picker sourced from ap_mandals, not free text — a
 *   mistyped mandal name silently orphans the assignment, caught live
 *   while testing, see 20260807130001), and this screen reads the
 *   real gap/filled state per constituency.
 *
 *   Villages/households show as real blanks — ap_mandals.villages_
 *   count/households_count are deliberately unpopulated everywhere in
 *   this schema (20260805235000's own reasoning: "a fabricated
 *   household count would be worse than an honest blank").
 *
 * LEADER HANDLES: NEW, MINIMAL, CHECKED WITH THE USER
 *   leader_handles (20260807130000) is the first table linking a
 *   social handle to a specific leader — reuses the existing
 *   handle_platform enum, admin-write only.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stats = {
  constituencies_listed: number; constituencies_total: number;
  mandal_presidents: number; unfilled_mandals: number; country_coordinators: number;
};
type LeaderWithHandles = {
  assignment_id: string; leader_id: string; leader_name: string; role: string;
  place: string | null; photo_url: string | null; platforms: string[];
};
type MandalRow = {
  mandal_id: number; mandal_name: string; villages_count: number | null; households_count: number | null;
  assignment_id: string | null; president_name: string | null; whatsapp: string | null;
};

const PLATFORM_LABEL: Record<string, string> = {
  x: "X", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", whatsapp: "WhatsApp", telegram: "Telegram", website: "Website",
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function AdminLocalConnect() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaders, setLeaders] = useState<LeaderWithHandles[]>([]);
  const [constituencies, setConstituencies] = useState<string[]>([]);
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [mandals, setMandals] = useState<MandalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingHandleFor, setAddingHandleFor] = useState<string | null>(null);
  const [handlePlatform, setHandlePlatform] = useState("x");
  const [handleUrl, setHandleUrl] = useState("");

  const fetchTop = useCallback(async () => {
    const [s, l, c] = await Promise.all([
      supabase.rpc("admin_local_connect_stats"),
      supabase.rpc("admin_leaders_with_handles"),
      supabase.rpc("admin_constituencies_with_mandals"),
    ]);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    setLeaders((l.data as LeaderWithHandles[]) ?? []);
    const names = ((c.data as { name: string }[]) ?? []).map((r) => r.name);
    setConstituencies(names);
    setSelectedConstituency((prev) => prev || names[0] || "");
    setLoading(false);
  }, []);

  const fetchMandals = useCallback(async (constituency: string) => {
    if (!constituency) { setMandals([]); return; }
    const { data } = await supabase.rpc("admin_constituency_mandals", { p_constituency: constituency });
    setMandals((data as MandalRow[]) ?? []);
  }, []);

  useEffect(() => { void fetchTop(); }, [fetchTop]);
  useEffect(() => { void fetchMandals(selectedConstituency); }, [selectedConstituency, fetchMandals]);

  const submitHandle = async (leaderId: string) => {
    if (!handleUrl.trim()) return;
    const { error } = await supabase.rpc("add_leader_handle", {
      p_leader_id: leaderId, p_platform: handlePlatform, p_url: handleUrl.trim(),
    });
    if (!error) {
      setAddingHandleFor(null);
      setHandleUrl("");
      void fetchTop();
    }
  };

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Local Connect</h2>
        <p className="text-sm text-gray-600 mt-1">
          The party structure members see. Mandal Presidents are newly added — an unfilled mandal
          is a visible gap to every NRI from that constituency.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Constituencies listed</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.constituencies_listed}</div>
          <div className="text-xs text-gray-500 mt-1">of {stats.constituencies_total} statewide</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Mandal Presidents</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.mandal_presidents}</div>
          <div className="text-xs text-gray-500 mt-1">published to members</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Unfilled mandals</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: stats.unfilled_mandals > 0 ? "#D9641A" : "#111827" }}>{stats.unfilled_mandals}</div>
          <div className="text-xs text-gray-500 mt-1">visible as gaps</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Country coordinators</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.country_coordinators}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-gray-900">Leader handles & photos</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">New</span>
          </div>
          <p className="text-xs text-gray-500">Secretariat-maintained — no chapter can edit these</p>
        </div>
        {leaders.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No leaders on file yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Leader</th>
                  <th className="py-2 px-4 font-bold">Role</th>
                  <th className="py-2 px-4 font-bold">Photo</th>
                  <th className="py-2 px-4 font-bold">Handles on file</th>
                  <th className="py-2 px-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.assignment_id} className="border-b border-gray-100 align-top">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {l.photo_url ? (
                          <img src={l.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-[10px] font-bold flex items-center justify-center">{initials(l.leader_name)}</span>
                        )}
                        {l.leader_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{l.role}{l.place ? ` · ${l.place}` : ""}</td>
                    <td className="py-2.5 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${l.photo_url ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                        {l.photo_url ? "Uploaded" : "Initials only"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {l.platforms.length === 0 ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">None</span>
                        ) : (
                          l.platforms.map((p) => (
                            <span key={p} className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{PLATFORM_LABEL[p] ?? p}</span>
                          ))
                        )}
                      </div>
                      {addingHandleFor === l.leader_id && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <select value={handlePlatform} onChange={(e) => setHandlePlatform(e.target.value)} className="text-xs border border-gray-300 rounded px-1.5 py-1">
                            {Object.entries(PLATFORM_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                          </select>
                          <input
                            value={handleUrl}
                            onChange={(e) => setHandleUrl(e.target.value)}
                            placeholder="https://…"
                            className="text-xs border border-gray-300 rounded px-1.5 py-1 flex-1 min-w-[120px]"
                          />
                          <button onClick={() => void submitHandle(l.leader_id)} className="text-xs font-bold text-primary-700 hover:underline">Save</button>
                          <button onClick={() => { setAddingHandleFor(null); setHandleUrl(""); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {addingHandleFor !== l.leader_id && (
                        <button
                          onClick={() => { setAddingHandleFor(l.leader_id); setHandlePlatform("x"); setHandleUrl(""); }}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300"
                        >
                          {l.platforms.length === 0 ? "Add" : "Edit"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-gray-100 bg-amber-50 text-xs text-amber-900">
          <b>No group invites here, deliberately.</b> A constituency WhatsApp group published to
          thousands of members reaches far more people than it expects. Group invites stay in
          Abroad Connect, where a coordinator owns them.
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Mandal Presidents</h3>
            <p className="text-xs text-gray-500 mt-0.5">Showing {selectedConstituency || "—"}</p>
          </div>
          <select
            value={selectedConstituency}
            onChange={(e) => setSelectedConstituency(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          >
            {constituencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {mandals.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No mandals on file for this constituency.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Mandal</th>
                  <th className="py-2 px-4 font-bold">President</th>
                  <th className="py-2 px-4 font-bold text-right">Villages</th>
                  <th className="py-2 px-4 font-bold text-right">Households</th>
                  <th className="py-2 px-4 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {mandals.map((m) => (
                  <tr key={m.mandal_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{m.mandal_name}</td>
                    <td className="py-2.5 px-4" style={!m.president_name ? { color: "#9CA3AF" } : undefined}>
                      {m.president_name ?? "Not appointed"}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-400 tabular-nums">{m.villages_count ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right text-gray-400 tabular-nums">{m.households_count ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={m.president_name ? { background: "#DCFCE7", color: "#166534" } : { background: "#FEF3C7", color: "#92400E" }}
                      >
                        {m.president_name ? "Live" : "Gap"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-gray-100 text-xs text-gray-500">
          Villages and households are shown only where recorded — there is no data source for
          them yet, so a blank means "not recorded," never a fabricated zero. To appoint a
          president for a gap, use Master Data.
        </div>
      </div>
    </div>
  );
}
