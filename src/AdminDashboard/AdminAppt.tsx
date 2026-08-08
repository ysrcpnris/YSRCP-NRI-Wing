/**
 * Appointments with Jagananna — built to docs/design/nri-wing-prototype.html
 * (a-appt).
 *
 * RANGES — checked with the user: real table, materialized into slots.
 * appointment_slots was always one row per specific date/time; ranges
 * (20260808160000) sit above it — publish_range() inserts one
 * appointment_ranges row and one appointment_slots row per matching
 * weekday in the span, each with its own copy of cap/mode/venue, so
 * the already-proven per-slot capacity locking in book_slot()/
 * decide_booking() runs completely unchanged underneath.
 *
 * VISITORS PER BOOKING — checked with the user: added for real.
 * appointment_bookings.visitors is a real column now; capacity is
 * seats, not booking rows, in book_slot()/decide_booking()/open_slots()
 * alike. Appointments.tsx (member-facing) carries the input that
 * actually sets it.
 *
 * "Edit" in the mock's Published-ranges table is simplified to
 * Unpublish/Republish — a range with already-materialized, possibly-
 * booked slots can't have its weekday pattern or span rewritten
 * without reconciling existing bookings, and the mock doesn't specify
 * that reconciliation. Stopping new bookings is real; rewriting one in
 * place isn't built.
 *
 * "Purpose" is not a new field — it's member_note, prompted by
 * whichever notes_label the range set. No schema addition needed.
 *
 * "Approve all"/"Decline all" call decide_bookings(), a thin loop over
 * the real decide_booking() — same authorization, same per-slot
 * capacity lock, one row per input id so a partial fill (cap reached
 * partway through the batch) is reported per-booking, not silently
 * swallowed.
 *
 * WingManagement.tsx's AppointmentsTab is NOT retired here — ranges
 * are additive on top of the single-slot model it already manages, not
 * a replacement of it. A one-off meeting still has a real, simpler
 * path there.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Range = {
  id: string; title: string; venue: string | null; starts_on: string; ends_on: string;
  weekdays: number[]; visitors_cap: number; mode: string; country: string | null;
  is_published: boolean; slots_total: number; booked: number; cap_total: number;
};
type Pending = {
  booking_id: string; slot_id: string; range_id: string | null;
  member_name: string; member_country: string | null; visitors: number;
  purpose: string | null; starts_at: string; created_at: string;
};
type ChapterOpt = { chapter_id: string; name: string; country: string };

const DAY_LABEL: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };
const DAYS = [1, 2, 3, 4, 5, 6, 7];

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default function AdminAppt() {
  const [ranges, setRanges] = useState<Range[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [chapterOpts, setChapterOpts] = useState<ChapterOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const [form, setForm] = useState({
    title: "", days: [1, 2, 3] as number[],
    from: new Date().toISOString().slice(0, 10),
    until: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    cap: 5, mode: "manual" as "manual" | "auto",
    venue: "Party Central Office, Tadepalli", country: "", notesLabel: "",
  });
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [r, p, co] = await Promise.all([
      supabase.rpc("ranges_i_manage"),
      supabase.rpc("pending_bookings_i_manage"),
      supabase.rpc("my_chapters_overview"),
    ]);
    setRanges((r.data as Range[]) ?? []);
    setPending((p.data as Pending[]) ?? []);
    setChapterOpts((co.data as ChapterOpt[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const toggleDay = (d: number) => {
    setForm((f) => ({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] }));
  };

  const publish = async () => {
    setPublishing(true);
    setPublishMsg(null);
    const { data, error } = await supabase.rpc("publish_range", {
      p_title: form.title || "Appointments with Jagananna",
      p_starts_on: form.from, p_ends_on: form.until, p_weekdays: form.days,
      p_visitors_cap: form.cap, p_mode: form.mode,
      p_venue: form.venue || null, p_notes_label: form.notesLabel || null,
      p_country: form.country || null,
    });
    setPublishing(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row?.ok) {
      setPublishMsg(row?.message ?? "Could not publish that range.");
      return;
    }
    setPublishMsg(row.message);
    void fetchAll();
  };

  const togglePublish = async (r: Range) => {
    setBusyIds((s) => new Set(s).add(r.id));
    await supabase.rpc("set_range_published", { p_range_id: r.id, p_is_published: !r.is_published });
    setBusyIds((s) => { const n = new Set(s); n.delete(r.id); return n; });
    void fetchAll();
  };

  const decide = async (bookingId: string, decision: "confirmed" | "declined") => {
    setBusyIds((s) => new Set(s).add(bookingId));
    await supabase.rpc("decide_booking", { p_booking_id: bookingId, p_decision: decision });
    setBusyIds((s) => { const n = new Set(s); n.delete(bookingId); return n; });
    void fetchAll();
  };

  const decideAll = async (decision: "confirmed" | "declined") => {
    if (pending.length === 0) return;
    setBulkBusy(true);
    await supabase.rpc("decide_bookings", { p_booking_ids: pending.map((p) => p.booking_id), p_decision: decision });
    setBulkBusy(false);
    void fetchAll();
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const oldestDays = pending.length > 0 ? Math.max(...pending.map((p) => ageDays(p.created_at))) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Appointments with Jagananna</h2>
        <p className="text-sm text-gray-600 mt-1">
          Publish the dates the office can receive NRI delegations, set how many visitors each date takes,
          and choose whether requests confirm automatically.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-3">Publish a date range</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Appointments with Jagananna" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Where</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
              <option value="">The whole wing</option>
              {[...new Set(chapterOpts.map((c) => c.country))].sort().map((c) => <option key={c} value={c}>{c} (country-wide)</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">From</label>
            <input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Until</label>
            <input type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Visitors per date</label>
            <input type="number" min={1} max={200} value={form.cap} onChange={(e) => setForm({ ...form, cap: Math.max(1, parseInt(e.target.value, 10) || 1) })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
            <p className="text-xs text-gray-500 mt-1">The date closes automatically once this many visitors are approved.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Venue</label>
            <input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-gray-500 block mb-1">Which days?</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => (
              <button key={d} onClick={() => toggleDay(d)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${form.days.includes(d) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-700 border-gray-300 hover:border-primary-300"}`}>
                {DAY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-bold text-gray-500 block mb-1">How should requests be handled?</label>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" checked={form.mode === "manual"} onChange={() => setForm({ ...form, mode: "manual" })} /> Manual approval</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={form.mode === "auto"} onChange={() => setForm({ ...form, mode: "auto" })} /> Auto-approve</label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Manual holds every request for review. Auto-approve confirms instantly until the cap fills.</p>
        </div>

        {publishMsg && <p className="text-xs text-gray-600 mt-3">{publishMsg}</p>}
        <button onClick={() => void publish()} disabled={publishing || form.days.length === 0} className="mt-4 text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
          {publishing ? "Publishing…" : "Publish availability"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Published ranges</h3>
          <p className="text-xs text-gray-500 mt-0.5">Each range carries its own cap and approval mode</p>
        </div>
        {ranges.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No ranges published yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Range</th>
                  <th className="py-2 px-4 font-bold">Days</th>
                  <th className="py-2 px-4 font-bold text-right">Cap</th>
                  <th className="py-2 px-4 font-bold">Mode</th>
                  <th className="py-2 px-4 font-bold text-right">Booked</th>
                  <th className="py-2 px-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {ranges.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-gray-900">{new Date(r.starts_on).toLocaleDateString(undefined, { day: "numeric", month: "short" })}–{new Date(r.ends_on).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</div>
                      <div className="text-xs text-gray-500">{r.venue ?? "—"} · {r.country ?? "Whole wing"}</div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{r.weekdays.slice().sort().map((d) => DAY_LABEL[d]).join(" ")}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{r.visitors_cap}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={r.mode === "auto" ? { background: "#DBEAFE", color: "#1E40AF" } : { background: "#F3F4F6", color: "#4B5563" }}>
                        {r.mode === "auto" ? "Auto" : "Manual"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{r.booked} / {r.cap_total}</td>
                    <td className="py-2.5 px-4 text-right">
                      <button onClick={() => void togglePublish(r)} disabled={busyIds.has(r.id)} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300 disabled:opacity-50">
                        {r.is_published ? "Unpublish" : "Republish"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Pending requests</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {pending.length} waiting{pending.length > 0 ? ` · oldest ${oldestDays}d` : ""}
            </p>
          </div>
          {pending.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => void decideAll("declined")} disabled={bulkBusy} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-red-300 disabled:opacity-50">
                Decline all
              </button>
              <button onClick={() => void decideAll("confirmed")} disabled={bulkBusy} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                {bulkBusy ? "Working…" : "Approve all"}
              </button>
            </div>
          )}
        </div>
        {pending.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nothing waiting.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Member</th>
                  <th className="py-2 px-4 font-bold">Country</th>
                  <th className="py-2 px-4 font-bold">Date</th>
                  <th className="py-2 px-4 font-bold text-right">Visitors</th>
                  <th className="py-2 px-4 font-bold">Purpose</th>
                  <th className="py-2 px-4 font-bold"></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.booking_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{p.member_name}</td>
                    <td className="py-2.5 px-4 text-gray-700">{p.member_country ?? "—"}</td>
                    <td className="py-2.5 px-4 text-gray-700">{dayLabel(p.starts_at)}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{p.visitors}</td>
                    <td className="py-2.5 px-4 text-gray-700 max-w-xs truncate" title={p.purpose ?? ""}>{p.purpose ?? "—"}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => void decide(p.booking_id, "declined")} disabled={busyIds.has(p.booking_id)} className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-red-300 disabled:opacity-50">
                          Decline
                        </button>
                        <button onClick={() => void decide(p.booking_id, "confirmed")} disabled={busyIds.has(p.booking_id)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                          Approve
                        </button>
                      </div>
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
