/**
 * Overview — built to docs/design/nri-wing-prototype.html (a-home),
 * the Admin Console landing page.
 *
 * CHECKED WITH THE USER: replaces the legacy "Coordinator Dashboard"
 * (continent -> country -> state drill-down over raw registrations,
 * Export-to-Excel) that used to render at currentPage === "dashboard".
 * That was a real, live tool, not a placeholder — superseded outright,
 * same precedent as a-digital/a-abroad superseding thinner
 * WingManagement.tsx tabs. If the Export capability turns out to
 * matter operationally, that's a distinct follow-up, not silently
 * preserved here.
 *
 * ALMOST EVERYTHING HERE IS REUSED, NOT NEW — this screen composes
 * RPCs that already exist: admin_abroad_stats()/admin_abroad_countries()
 * (a-abroad), admin_voter_stats()/admin_voter_by_constituency() (a-vote),
 * pending_bookings_i_manage() (a-appt), admin_assistance_stats()/
 * admin_grievance_stats() (pre-redesign, already live), admin_feedback_stats()
 * (a-feedback). The one new piece is mandal_cover_have/mandal_cover_total
 * on admin_voter_by_constituency() (20260808200000).
 *
 * "Verified members" is rendered as "Total members" — profiles.status
 * is never set to anything but its 'pending' default anywhere in this
 * codebase, so there is no real verified/registered distinction to
 * filter by. "+204 awaiting import" is dropped — no import mechanism
 * exists (established already for a-members).
 *
 * "Open queues" sums all four real open-queue counts (appointments +
 * assistance + grievances + feedback) — the mock's own 44/9 aren't
 * internally consistent (44 excludes feedback; past-SLA sums to 7, not
 * 9; appointments have no past-SLA concept), so it isn't reverse-
 * engineered. "Past SLA" only sums the two sources that actually have
 * a time-window concept (grievances, assistance).
 *
 * Mandal cover shows "—" rather than "0/0" for constituencies where
 * ap_mandals has no seeded rows at all (real gap: only 36 of 175
 * constituencies have mandal data) — that's "no data," a different
 * fact from "zero coverage of real mandals."
 *
 * GATE FRAGMENTATION IS PRE-EXISTING: admin_grievance_stats()/
 * admin_assistance_stats()/admin_feedback_stats() are is_admin()-only;
 * the rest use has_global_scope(). A secretariat caller genuinely sees
 * a partial page here — that mirrors what each source screen already
 * does for that caller, not a new inconsistency.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AbroadStats = { countries_active: number; chapters_total: number };
type AbroadCountry = { country: string; members: number };
type VoterStats = { total_members: number; confirmed_voters: number };
type ConstituencyRow = {
  constituency: string; district: string; members: number; voters: number; roll_pct: number | null;
  priority: "hold" | "chase_epic" | "verify"; mandal_cover_have: number; mandal_cover_total: number;
};
type Pending = { booking_id: string; created_at: string };
type AssistanceStats = { open_worldwide: number; unanswered_72h: number } | null;
type GrievanceStats = { open_count: number; past_sla_count: number } | null;
type FeedbackStat = { head: string; unassigned: number };

const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  hold: { label: "Strong", color: "#16A34A" },
  chase_epic: { label: "Roll gap", color: "#D9641A" },
  verify: { label: "Thin", color: "#DC2626" },
};

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function AdminHome() {
  const [abroadStats, setAbroadStats] = useState<AbroadStats | null>(null);
  const [countries, setCountries] = useState<AbroadCountry[]>([]);
  const [voterStats, setVoterStats] = useState<VoterStats | null>(null);
  const [constituencies, setConstituencies] = useState<ConstituencyRow[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [assistance, setAssistance] = useState<AssistanceStats>(null);
  const [grievance, setGrievance] = useState<GrievanceStats>(null);
  const [feedback, setFeedback] = useState<FeedbackStat[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [ab, ac, vs, vc, pb, as_, gs, fb] = await Promise.all([
      supabase.rpc("admin_abroad_stats"),
      supabase.rpc("admin_abroad_countries"),
      supabase.rpc("admin_voter_stats"),
      supabase.rpc("admin_voter_by_constituency"),
      supabase.rpc("pending_bookings_i_manage"),
      supabase.rpc("admin_assistance_stats"),
      supabase.rpc("admin_grievance_stats"),
      supabase.rpc("admin_feedback_stats"),
    ]);
    setAbroadStats((Array.isArray(ab.data) ? ab.data[0] : ab.data) ?? null);
    setCountries((ac.data as AbroadCountry[]) ?? []);
    setVoterStats((Array.isArray(vs.data) ? vs.data[0] : vs.data) ?? null);
    setConstituencies((vc.data as ConstituencyRow[]) ?? []);
    setPending((pb.data as Pending[]) ?? []);
    setAssistance((Array.isArray(as_.data) ? as_.data[0] : as_.data) ?? null);
    setGrievance((Array.isArray(gs.data) ? gs.data[0] : gs.data) ?? null);
    setFeedback((fb.data as FeedbackStat[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const totalMembers = voterStats?.total_members ?? 0;
  const rollPct = totalMembers > 0 && voterStats ? Math.round((100 * voterStats.confirmed_voters) / totalMembers) : 0;
  const topCountries = [...countries].sort((a, b) => b.members - a.members).slice(0, 3);
  const maxCountryMembers = Math.max(1, ...countries.map((c) => c.members));

  const feedbackUnassigned = feedback.reduce((sum, f) => sum + f.unassigned, 0);
  const openQueues = pending.length + (assistance?.open_worldwide ?? 0) + (grievance?.open_count ?? 0) + feedbackUnassigned;
  const pastSla = (grievance?.past_sla_count ?? 0) + (assistance?.unanswered_72h ?? 0);
  const oldestPending = pending.length > 0 ? Math.max(...pending.map((p) => ageDays(p.created_at))) : 0;

  const topConstituencies = [...constituencies]
    .sort((a, b) => b.members - a.members)
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Overview</h2>
        <p className="text-sm text-gray-600 mt-1">Everything at a glance, drawn from the wing's real numbers.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Total members</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{totalMembers.toLocaleString()}</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Countries active</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{abroadStats?.countries_active ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Top: {topCountries.map((c) => c.country).join(" · ") || "—"}</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">On the voter roll</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{rollPct}%</div>
          <div className="text-xs text-gray-500 mt-1">{(voterStats?.confirmed_voters ?? 0).toLocaleString()} confirmed voters</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Open queues</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{openQueues}</div>
          <div className="text-xs mt-1" style={{ color: pastSla > 0 ? "#DC2626" : "#6B7280" }}>{pastSla} past SLA</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Members by country</h3>
          <p className="text-xs text-gray-500 mb-3">Where the diaspora actually is</p>
          {countries.length === 0 ? (
            <div className="text-sm text-gray-400">No countries with members yet.</div>
          ) : (
            <div className="space-y-2.5">
              {countries.slice(0, 8).map((c) => (
                <div key={c.country} className="flex items-center gap-2 text-sm">
                  <span className="w-28 flex-shrink-0 text-gray-700 truncate">{c.country}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${Math.round((100 * c.members) / maxCountryMembers)}%` }} />
                  </span>
                  <span className="w-10 text-right font-semibold text-gray-900 tabular-nums">{c.members}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Queues right now</h3>
            <p className="text-xs text-gray-500 mt-0.5">Anything past its service window is flagged</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Appointment requests</div>
                <div className="text-xs text-gray-500">{pending.length} pending{pending.length > 0 ? ` · oldest ${oldestPending}d` : ""}</div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Assistance requests</div>
                <div className="text-xs text-gray-500">
                  {assistance ? `${assistance.open_worldwide} open · ${assistance.unanswered_72h} unanswered past 72h` : "—"}
                </div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Grievances</div>
                <div className="text-xs text-gray-500">
                  {grievance ? (
                    <>
                      {grievance.open_count} open
                      {grievance.past_sla_count > 0 && <span style={{ color: "#DC2626" }}> · {grievance.past_sla_count} past SLA</span>}
                    </>
                  ) : "—"}
                </div>
              </div>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900 text-sm">Feedback awaiting triage</div>
                <div className="text-xs text-gray-500">{feedbackUnassigned} unassigned across three heads</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Constituency strength</h3>
          <p className="text-xs text-gray-500 mt-0.5">Where the wing has diaspora depth — and where it has none</p>
        </div>
        {topConstituencies.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No members resolve to a constituency yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Constituency</th>
                  <th className="py-2 px-4 font-bold">District</th>
                  <th className="py-2 px-4 font-bold text-right">NRI members</th>
                  <th className="py-2 px-4 font-bold text-right">On roll</th>
                  <th className="py-2 px-4 font-bold text-right">Roll %</th>
                  <th className="py-2 px-4 font-bold text-right">Mandal cover</th>
                  <th className="py-2 px-4 font-bold">Assessment</th>
                </tr>
              </thead>
              <tbody>
                {topConstituencies.map((c) => (
                  <tr key={c.constituency} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{c.constituency}</td>
                    <td className="py-2.5 px-4 text-gray-700">{c.district}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.members}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.voters}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.roll_pct != null ? `${c.roll_pct}%` : "—"}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">
                      {c.mandal_cover_total > 0 ? `${c.mandal_cover_have}/${c.mandal_cover_total}` : "—"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${PRIORITY_LABEL[c.priority].color}1a`, color: PRIORITY_LABEL[c.priority].color }}>
                        {PRIORITY_LABEL[c.priority].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
          <b>Mandal cover</b> shows "—" where the wing hasn't mapped that constituency's mandals yet — a data gap, not zero coverage.
        </div>
      </div>
    </div>
  );
}
