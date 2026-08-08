/**
 * Abroad Connect — built to docs/design/nri-wing-prototype.html (a-abroad).
 *
 * TERMINOLOGY: the mock's "Active chapters: 34, one per country" and
 * "Chapters approaching the group limit" both use "chapter" to mean
 * the COUNTRY-level unit, which predates 20260805150000's clusters ->
 * chapters rename (a chapter is now a city-cluster WITHIN a country —
 * the US alone has 5). Stat cards and copy here are named for what
 * they actually count; see admin_abroad_countries() for the real
 * per-chapter breakdown. "Chapters approaching the group limit" is
 * genuinely a country-level bar (its own numbers match the Countries
 * table's Members column) so it's built from admin_abroad_countries(),
 * not a separate query.
 *
 * "Committee: X/15" is dropped — the 15-seat cap was already rejected
 * twice in this codebase (20260806140000, 20260807100000); team_lead
 * is uncapped. The Countries table shows a raw committee count.
 *
 * "City leads: 61, 18 unfilled" is relabelled to "Chapters with a
 * lead" — chapter_lead is chapter-scoped, not city-scoped, so a
 * literal per-city count isn't backed by anything in the schema.
 *
 * WhatsApp registry — checked with the user: reuses my_chapter_handles_
 * admin()/rotate_chapter_handle() from a-links rather than a second
 * query over the same table. "Rotate now" is wired here for the first
 * time; a-links itself doesn't expose it yet.
 *
 * Unfilled roles — checked with the user: 3 real signals (coordinator
 * gaps, chapter_lead gaps, assistance backlog <50% answered, the same
 * threshold AdminAssistance.tsx's own bar coloring treats as urgent).
 * The mock's 4th item, an "events activity"/"1 volunteer" figure, has
 * no backing column anywhere and is dropped.
 *
 * "Add chapter"/"Add group" call create_chapter()/add_chapter_handle()
 * — both already exist and already work elsewhere in this codebase,
 * not new mechanisms.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import RoleManager from "../components/RoleManager";

type Stats = {
  countries_active: number;
  chapters_total: number;
  chapters_with_lead: number;
  whatsapp_groups: number;
  whatsapp_members_reached: number;
  countries_without_coordinator: number;
  members_unserved: number;
};

type CountryRow = {
  country: string;
  coordinator_count: number;
  lead_coordinator: string | null;
  members: number;
  chapters_count: number;
  committee_count: number;
  whatsapp_groups: number;
  status: "healthy" | "no_coordinator";
};

type GapRow = {
  gap_type: "no_coordinator" | "no_chapter_lead" | "assistance_backlog";
  country: string;
  chapter: string | null;
  chapter_id: string | null;
  detail: string;
};

type HandleRow = {
  id: string;
  chapter_id: string;
  chapter_name: string;
  country: string;
  platform: string;
  label: string;
  handle: string | null;
  url: string;
  member_count: number | null;
  count_as_of: string | null;
  expires_at: string | null;
  can_write: boolean;
};

type ChapterOpt = { chapter_id: string; name: string; country: string };

const WHATSAPP_CAP = 1024;

function pct(n: number, total: number) {
  return total > 0 ? Math.round((100 * n) / total) : 0;
}

function barColor(pct: number) {
  if (pct >= 75) return "#DC2626";
  if (pct >= 40) return "#D9641A";
  return "#16A34A";
}

export default function AdminAbroad() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [handles, setHandles] = useState<HandleRow[]>([]);
  const [chapterOpts, setChapterOpts] = useState<ChapterOpt[]>([]);
  const [countryFilter, setCountryFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [showAppoint, setShowAppoint] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateUrl, setRotateUrl] = useState("");

  const [newChapterCountry, setNewChapterCountry] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  const [newGroupChapter, setNewGroupChapter] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupUrl, setNewGroupUrl] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  const fetchAll = useCallback(async () => {
    const [s, c, g, h, co] = await Promise.all([
      supabase.rpc("admin_abroad_stats"),
      supabase.rpc("admin_abroad_countries"),
      supabase.rpc("admin_abroad_gaps"),
      supabase.rpc("my_chapter_handles_admin"),
      supabase.rpc("my_chapters_overview"),
    ]);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    setCountries((c.data as CountryRow[]) ?? []);
    setGaps((g.data as GapRow[]) ?? []);
    setHandles(((h.data as HandleRow[]) ?? []).filter((r) => r.platform === "whatsapp"));
    setChapterOpts((co.data as ChapterOpt[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const exportCsv = () => {
    const header = ["Country", "Coordinators", "Members", "Chapters", "Committee", "Groups", "Status"];
    const lines = countries.map((r) => [
      r.country, String(r.coordinator_count), String(r.members), String(r.chapters_count),
      String(r.committee_count), String(r.whatsapp_groups), r.status === "healthy" ? "Healthy" : "No coordinator",
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "abroad-countries.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const submitRotate = async (id: string) => {
    if (!rotateUrl.trim()) return;
    const { error } = await supabase.rpc("rotate_chapter_handle", { p_handle_id: id, p_new_url: rotateUrl.trim() });
    if (!error) {
      setRotatingId(null); setRotateUrl("");
      void fetchAll();
    }
  };

  const submitAddChapter = async () => {
    if (!newChapterCountry.trim() || !newChapterName.trim()) return;
    setAddingChapter(true);
    const { error } = await supabase.rpc("create_chapter", { p_country: newChapterCountry.trim(), p_name: newChapterName.trim() });
    setAddingChapter(false);
    if (!error) {
      setShowAddChapter(false); setNewChapterCountry(""); setNewChapterName("");
      void fetchAll();
    }
  };

  const submitAddGroup = async () => {
    if (!newGroupChapter || !newGroupLabel.trim() || !newGroupUrl.trim()) return;
    setAddingGroup(true);
    const { error } = await supabase.rpc("add_chapter_handle", {
      p_chapter_id: newGroupChapter, p_platform: "whatsapp", p_label: newGroupLabel.trim(), p_url: newGroupUrl.trim(),
    });
    setAddingGroup(false);
    if (!error) {
      setShowAddGroup(false); setNewGroupChapter(""); setNewGroupLabel(""); setNewGroupUrl("");
      void fetchAll();
    }
  };

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const visibleHandles = countryFilter ? handles.filter((h) => h.country === countryFilter) : handles;
  const nearLimit = [...countries].sort((a, b) => b.members - a.members).slice(0, 6);
  const gapLabel: Record<GapRow["gap_type"], string> = {
    no_coordinator: "No coordinator",
    no_chapter_lead: "No chapter lead",
    assistance_backlog: "Assistance backlog",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Abroad Connect</h2>
          <p className="text-sm text-gray-600 mt-1">
            The wing's structure outside India — country coverage, chapters, and the WhatsApp groups they run.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddGroup(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
            Add group
          </button>
          <button onClick={() => setShowAddChapter(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
            Add chapter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Countries active</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.countries_active}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.chapters_total} chapters across them</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Chapters with a lead</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.chapters_with_lead} <span className="text-lg text-gray-400">/ {stats.chapters_total}</span></div>
          <div className="text-xs mt-1" style={{ color: stats.chapters_total - stats.chapters_with_lead > 0 ? "#DC2626" : "#6B7280" }}>
            {stats.chapters_total - stats.chapters_with_lead} unfilled
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">WhatsApp groups</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.whatsapp_groups}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.whatsapp_members_reached.toLocaleString()} members reached</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Countries without a coordinator</div>
          <div className="text-3xl font-black tabular-nums" style={{ color: stats.countries_without_coordinator > 0 ? "#D9641A" : "#111827" }}>{stats.countries_without_coordinator}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.members_unserved} members unserved</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Countries</h3>
            <p className="text-xs text-gray-500 mt-0.5">The country is the unit. Coordinators subdivide it themselves.</p>
          </div>
          <button onClick={exportCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
            Export
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 px-4 font-bold">Country</th>
                <th className="py-2 px-4 font-bold text-right">Coordinators</th>
                <th className="py-2 px-4 font-bold text-right">Members</th>
                <th className="py-2 px-4 font-bold text-right">Chapters</th>
                <th className="py-2 px-4 font-bold text-right">Committee</th>
                <th className="py-2 px-4 font-bold text-right">Groups</th>
                <th className="py-2 px-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((r) => (
                <tr key={r.country} className={`border-b border-gray-100 ${r.status === "no_coordinator" ? "bg-red-50/40" : ""}`}>
                  <td className="py-2.5 px-4">
                    <div className="font-semibold text-gray-900">{r.country}</div>
                    {r.lead_coordinator && <div className="text-xs text-gray-500">{r.lead_coordinator}</div>}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.coordinator_count}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.members}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.chapters_count}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.committee_count}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.whatsapp_groups}</td>
                  <td className="py-2.5 px-4">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={r.status === "healthy" ? { background: "#DCFCE7", color: "#166534" } : { background: "#FEE2E2", color: "#991B1B" }}
                    >
                      {r.status === "healthy" ? "Healthy" : "No coordinator"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-gray-900">WhatsApp group registry</h3>
              <p className="text-xs text-gray-500 mt-0.5">Every group the wing recognises, and who runs it</p>
            </div>
            <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1.5">
              <option value="">All countries</option>
              {[...new Set(handles.map((h) => h.country))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {visibleHandles.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No WhatsApp groups on file.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-bold">Group</th>
                    <th className="py-2 px-4 font-bold">Chapter</th>
                    <th className="py-2 px-4 font-bold text-right">Members</th>
                    <th className="py-2 px-4 font-bold"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleHandles.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{h.label}</td>
                      <td className="py-2.5 px-4 text-gray-700">{h.chapter_name} <span className="text-gray-400">· {h.country}</span></td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{h.member_count ?? "—"}</td>
                      <td className="py-2.5 px-4 text-right">
                        {rotatingId === h.id ? (
                          <div className="flex items-center gap-1.5 justify-end">
                            <input
                              value={rotateUrl} onChange={(e) => setRotateUrl(e.target.value)} placeholder="New invite link"
                              className="text-xs border border-gray-300 rounded px-2 py-1 w-40"
                            />
                            <button onClick={() => void submitRotate(h.id)} className="text-xs font-bold text-primary-600 hover:underline">Save</button>
                            <button onClick={() => { setRotatingId(null); setRotateUrl(""); }} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </div>
                        ) : (
                          h.can_write && (
                            <button onClick={() => { setRotatingId(h.id); setRotateUrl(h.url); }} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
                              Rotate now
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Chapters approaching the group limit</h3>
          <p className="text-xs text-gray-500 mb-3">Based on members in-country, not group size — WhatsApp caps a group at {WHATSAPP_CAP}</p>
          <div className="space-y-2.5">
            {nearLimit.map((r) => (
              <div key={r.country} className="flex items-center gap-2 text-sm">
                <span className="w-24 flex-shrink-0 text-gray-700 truncate">{r.country}</span>
                <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct(r.members, WHATSAPP_CAP))}%`, background: barColor(pct(r.members, WHATSAPP_CAP)) }} />
                </span>
                <span className="w-12 text-right font-semibold text-gray-900 tabular-nums">{r.members}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Needs attention</h3>
          <p className="text-xs text-gray-500 mt-0.5">Coordinator gaps, chapter lead gaps, and countries with an assistance backlog</p>
        </div>
        {gaps.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nothing needs attention right now.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {gaps.map((g, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {g.country}{g.chapter ? ` — ${g.chapter}` : ""} <span className="text-xs font-bold text-gray-400 ml-1">{gapLabel[g.gap_type]}</span>
                  </div>
                  <div className="text-xs text-gray-500">{g.detail}</div>
                </div>
                {g.gap_type !== "assistance_backlog" && (
                  <button onClick={() => setShowAppoint(true)} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
                    Appoint
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAppoint && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAppoint(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Appoint</h3>
              <button onClick={() => setShowAppoint(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <RoleManager />
          </div>
        </div>
      )}

      {showAddChapter && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddChapter(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Add chapter</h3>
              <button onClick={() => setShowAddChapter(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <input value={newChapterCountry} onChange={(e) => setNewChapterCountry(e.target.value)} placeholder="Country (e.g. Germany)" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <input value={newChapterName} onChange={(e) => setNewChapterName(e.target.value)} placeholder="Chapter name (e.g. Germany — North)" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <button onClick={() => void submitAddChapter()} disabled={addingChapter} className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                {addingChapter ? "Creating…" : "Create chapter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGroup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddGroup(false)}>
          <div className="bg-white rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Add WhatsApp group</h3>
              <button onClick={() => setShowAddGroup(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <select value={newGroupChapter} onChange={(e) => setNewGroupChapter(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Select a chapter…</option>
                {chapterOpts.map((c) => <option key={c.chapter_id} value={c.chapter_id}>{c.name} ({c.country})</option>)}
              </select>
              <input value={newGroupLabel} onChange={(e) => setNewGroupLabel(e.target.value)} placeholder="Group name (e.g. Students)" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <input value={newGroupUrl} onChange={(e) => setNewGroupUrl(e.target.value)} placeholder="Invite link (https://chat.whatsapp.com/…)" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <button onClick={() => void submitAddGroup()} disabled={addingGroup} className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                {addingGroup ? "Adding…" : "Add group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
