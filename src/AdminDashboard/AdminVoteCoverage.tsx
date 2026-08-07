/**
 * Voter Coverage — built to docs/design/nri-wing-prototype.html (a-vote).
 *
 * public.voter_coverage never worked (security_invoker view re-checking
 * a caller's own column grants on has_vote/epic_number, which were
 * revoked from `authenticated` the very next migration after the view
 * was written) and is dropped in 20260808130000, replaced by
 * admin_voter_stats() + admin_voter_by_constituency() — the standard
 * SECURITY DEFINER pattern every other admin screen already uses.
 *
 * Constituency grouping uses COALESCE(voter_constituency,
 * assembly_constituency) — checked with the user: voter_constituency is
 * the semantically correct field (where a member is registered to
 * VOTE, distinct from where they're from) but is 0% populated today,
 * so the fallback keeps the screen useful while members fill in the
 * real field over time. See the migration for the full tradeoff.
 *
 * The mock's two analyst-note paragraphs name specific constituencies
 * and specific counts (1,593 voters, Gudivada, Rajampet, Visakhapatnam
 * North…) that are illustrative mock flavor, not real findings — real
 * staging data looks nothing like that. Reproducing that copy verbatim
 * against real numbers would be exactly the kind of comment CLAUDE.md
 * warns against: describing something as true that isn't. The left
 * card's note is computed from whatever the real numbers are instead;
 * the table's note is replaced with a factual, always-true legend for
 * what the Priority pill means, rather than a narrative claim about
 * which real seats show which pattern.
 *
 * Priority (hold / chase_epic / verify) is a derived classification
 * over real roll_pct, not a fabricated field — but the exact
 * thresholds (>=65 / >=45 / below) are my own judgment call sitting
 * inside the mock's illustrative bands, not a formula the mock stated.
 *
 * No filters, search, or export — the mock has none for this screen,
 * it's a pure read-only report.
 */

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stats = {
  total_members: number;
  confirmed_voters: number;
  epic_supplied: number;
  no_vote: number;
  unanswered: number;
};

type ConstituencyRow = {
  constituency_id: number;
  constituency: string;
  district: string;
  members: number;
  voters: number;
  epic_supplied: number;
  roll_pct: number | null;
  priority: "hold" | "chase_epic" | "verify";
};

const PRIORITY: Record<ConstituencyRow["priority"], { label: string; color: string }> = {
  hold: { label: "Hold", color: "#16A34A" },
  chase_epic: { label: "Chase EPIC", color: "#D9641A" },
  verify: { label: "Verify", color: "#DC2626" },
};

function pct(n: number, total: number) {
  return total > 0 ? Math.round((100 * n) / total) : 0;
}

export default function AdminVoteCoverage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<ConstituencyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [s, c] = await Promise.all([
        supabase.rpc("admin_voter_stats"),
        supabase.rpc("admin_voter_by_constituency"),
      ]);
      setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
      setRows((c.data as ConstituencyRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const covered = rows.filter((r) => r.voters > 0).length;
  const avgPerSeat = covered > 0 ? Math.round((10 * stats.confirmed_voters) / covered) / 10 : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Voter Coverage</h2>
        <p className="text-sm text-gray-600 mt-1">
          Which of the wing's members actually hold a vote in Andhra Pradesh, and where those votes
          sit. This is the number that turns a diaspora list into a political asset.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Confirmed voters</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.confirmed_voters}</div>
          <div className="text-xs text-gray-500 mt-1">{pct(stats.confirmed_voters, stats.total_members)}% of members</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">EPIC supplied</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.epic_supplied}</div>
          <div className="text-xs text-gray-500 mt-1">{pct(stats.epic_supplied, stats.confirmed_voters)}% of confirmed voters</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">No vote</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.no_vote}</div>
          <div className="text-xs text-gray-500 mt-1">{pct(stats.no_vote, stats.total_members)}% of members</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Unanswered</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.unanswered}</div>
          <div className="text-xs text-gray-500 mt-1">{pct(stats.unanswered, stats.total_members)}% haven't told us</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3">Roll status</h3>
          <div className="flex h-3.5 rounded-full overflow-hidden bg-gray-100">
            <span style={{ width: `${pct(stats.confirmed_voters, stats.total_members)}%`, background: "#16A34A" }} />
            <span style={{ width: `${pct(stats.no_vote, stats.total_members)}%`, background: "#9CA3AF" }} />
            <span style={{ width: `${pct(stats.unanswered, stats.total_members)}%`, background: "#E5E7EB" }} />
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#16A34A" }} />
              <span className="flex-1 text-gray-700">On the roll</span>
              <span className="font-semibold text-gray-900 tabular-nums">{stats.confirmed_voters}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#9CA3AF" }} />
              <span className="flex-1 text-gray-700">Not on the roll</span>
              <span className="font-semibold text-gray-900 tabular-nums">{stats.no_vote}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#E5E7EB" }} />
              <span className="flex-1 text-gray-700">Not answered</span>
              <span className="font-semibold text-gray-900 tabular-nums">{stats.unanswered}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 bg-emerald-50 -mx-5 -mb-5 px-5 py-4 rounded-b-xl text-xs text-emerald-900">
            {stats.confirmed_voters > 0 && avgPerSeat !== null ? (
              <>
                <b>Where the leverage is.</b> {stats.confirmed_voters} confirmed voter{stats.confirmed_voters === 1 ? "" : "s"} spread
                across {covered} constituenc{covered === 1 ? "y" : "ies"} averages {avgPerSeat} per seat. The value is that each one
                is a household with resident relatives who take political cues from them.
              </>
            ) : (
              <>
                <b>Nothing on the roll yet.</b> No member has confirmed a vote in Andhra Pradesh. This fills in as members answer
                the voter-roll question on their profile.
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Constituencies by NRI voter concentration</h3>
            <p className="text-xs text-gray-500 mt-0.5">Where diaspora votes actually cluster</p>
          </div>
          {rows.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No members resolve to a constituency yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-4 font-bold">Constituency</th>
                    <th className="py-2 px-4 font-bold">District</th>
                    <th className="py-2 px-4 font-bold text-right">Members</th>
                    <th className="py-2 px-4 font-bold text-right">Voters</th>
                    <th className="py-2 px-4 font-bold text-right">EPIC</th>
                    <th className="py-2 px-4 font-bold text-right">Roll %</th>
                    <th className="py-2 px-4 font-bold">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.constituency_id} className="border-b border-gray-100">
                      <td className="py-2.5 px-4 font-semibold text-gray-900">{r.constituency}</td>
                      <td className="py-2.5 px-4 text-gray-700">{r.district}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{r.members}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{r.voters}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{r.epic_supplied}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{r.roll_pct != null ? `${r.roll_pct}%` : "—"}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${PRIORITY[r.priority].color}1a`, color: PRIORITY[r.priority].color }}
                        >
                          {PRIORITY[r.priority].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
            <b>Hold</b> — 65%+ of members here are on the roll. <b>Chase EPIC</b> — 45–64%; the cheapest way to add verified
            voters is getting the rest their EPIC number. <b>Verify</b> — under 45%; check the data before counting on it.
          </div>
        </div>
      </div>
    </div>
  );
}
