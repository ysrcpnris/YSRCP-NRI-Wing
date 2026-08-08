/**
 * Talent Pool — built to docs/design/nri-wing-prototype.html (a-talent).
 *
 * THE SCREEN'S REAL SPINE IS contribution_areas, NOT join_org_interest.
 * The three top stat cards are exactly contribution_areas' three real
 * values (already granted, already carried elsewhere) — join_org_interest
 * backs exactly one card ("Willing to join the organisation"), not the
 * whole screen.
 *
 * DROPPED, NOT FAKED:
 *   - "X active" on each stat card — no login/session-tracking concept
 *     exists anywhere in this schema.
 *   - "Deployable capacity"'s four categories (Telugu content creators /
 *     web & app builders / data & analytics / event organisers abroad)
 *     correspond to nothing real — profession is free text with no
 *     structured skills taxonomy (already concluded twice elsewhere:
 *     the assistance-board migration and MyHome.tsx). Replaced with a
 *     real substitute that keeps the card's actual purpose — where
 *     contribution capacity concentrates — using contribution_areas
 *     grouped by country instead.
 *   - Per-member bio lines ("Runs a 2,000-strong Telugu network in
 *     Germany") — no bio/description field exists on profiles.
 *   - "Start intake" / "Shortlist" buttons — no intake or shortlist
 *     mechanism exists anywhere, same class of drop as a-assist's
 *     Nudge/Escalate buttons.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AreaStat = { area: string; count: number; pct: number };
type Willing = {
  id: string; full_name: string | null; country: string | null; city_abroad: string | null;
  contribution_areas: string[] | null; referred_count: number; member_since: string;
};
type ByCountry = { country: string; social_media: number; technology: number; political: number; total: number };

const AREA_LABEL: Record<string, string> = { social_media: "Social Media", technology: "Technology", political: "Political" };
const AREA_COLOR: Record<string, string> = { social_media: "#1E3A8A", technology: "#16A34A", political: "#D9641A" };

function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function AdminTalent() {
  const [stats, setStats] = useState<AreaStat[]>([]);
  const [willing, setWilling] = useState<Willing[]>([]);
  const [byCountry, setByCountry] = useState<ByCountry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [s, w, c] = await Promise.all([
      supabase.rpc("admin_talent_pool_stats"),
      supabase.rpc("admin_talent_willing"),
      supabase.rpc("admin_talent_by_country"),
    ]);
    setStats((s.data as AreaStat[]) ?? []);
    setWilling((w.data as Willing[]) ?? []);
    setByCountry((c.data as ByCountry[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const maxCountryTotal = Math.max(1, ...byCountry.map((c) => c.total));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Talent Pool</h2>
        <p className="text-sm text-gray-600 mt-1">
          Members who told you how they can contribute. This is the list you draw on when a campaign needs people rather than money.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.area} className="p-5 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full" style={{ background: AREA_COLOR[s.area] }} />
              <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{AREA_LABEL[s.area] ?? s.area}</span>
            </div>
            <div className="text-3xl font-black text-gray-900 tabular-nums">{s.count}</div>
            <div className="text-xs text-gray-500 mt-1">{s.pct}% of members</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Willing to join the organisation</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {willing.length} said yes — these are your future office bearers
            </p>
          </div>
          {willing.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Nobody has said yes yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-bold">Member</th>
                    <th className="py-2 px-4 font-bold">Country</th>
                    <th className="py-2 px-4 font-bold">Contributes</th>
                    <th className="py-2 px-4 font-bold text-right">Referred</th>
                    <th className="py-2 px-4 font-bold">Since</th>
                  </tr>
                </thead>
                <tbody>
                  {willing.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{m.full_name ?? "—"}</td>
                      <td className="py-2.5 px-4 text-gray-700">{m.country}{m.city_abroad ? ` · ${m.city_abroad}` : ""}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(m.contribution_areas ?? []).length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            (m.contribution_areas ?? []).map((a) => (
                              <span key={a} className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">{AREA_LABEL[a] ?? a}</span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{m.referred_count}</td>
                      <td className="py-2.5 px-4 text-gray-500">{fmtMonth(m.member_since)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Contribution capacity by country</h3>
          <p className="text-xs text-gray-500 mb-3">Where contributor capacity concentrates</p>
          {byCountry.length === 0 ? (
            <div className="text-sm text-gray-400">No members have picked a contribution area yet.</div>
          ) : (
            <div className="space-y-3">
              {byCountry.map((c) => (
                <div key={c.country}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{c.country}</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{c.total}</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-gray-100" style={{ width: `${Math.round((100 * c.total) / maxCountryTotal)}%` }}>
                    {c.social_media > 0 && <span style={{ flex: c.social_media, background: AREA_COLOR.social_media }} />}
                    {c.technology > 0 && <span style={{ flex: c.technology, background: AREA_COLOR.technology }} />}
                    {c.political > 0 && <span style={{ flex: c.political, background: AREA_COLOR.political }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3 text-xs text-gray-600">
            {Object.entries(AREA_LABEL).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: AREA_COLOR[k] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
