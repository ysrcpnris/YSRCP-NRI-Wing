/**
 * Appointments — bookable time slots. Restyled to
 * docs/design/nri-wing-prototype.html's design tokens (screen
 * `m-appt`); the booking model underneath predates the mock and is
 * kept as-is, not rebuilt to match it exactly.
 *
 * WHY THIS ISN'T THE MOCK'S CALENDAR
 *   m-appt shows one specific thing: a monthly calendar of open dates
 *   for a delegation visit to party HQ, with a party-size field (1-4
 *   visitors) per request. The real schema (20260804280000) is
 *   deliberately more general — appointment_slots is host/venue/mode
 *   per slot, not one recurring "meet Jagananna" type, and
 *   appointment_bookings has no party-size column. Rebuilding this as
 *   a single-purpose calendar would either fabricate a field nothing
 *   stores, or throw away the host/venue/manual-vs-auto distinctions
 *   the real system already uses for chapter-lead and coordinator
 *   slots too. Kept as a list, grouped by day where the mock groups by
 *   day, restyled rather than reshaped.
 *
 * TWO ADMISSION MODES, and the member is told which one applies before
 * they commit:
 *   auto    confirmed on the spot, up to the slot's capacity
 *   manual  a request that someone decides on
 *
 * Capacity is enforced in book_slot() under a row lock, so two people
 * booking the last seat at the same instant cannot both succeed. The
 * client shows seats_left as a courtesy, never as the check.
 */

import { useCallback, useEffect, useState } from "react";
import { MapPin, Video, Users, Check, Clock } from "lucide-react";
import { supabase } from "../lib/supabase";
import "../styles/prototype-tokens.css";

type Slot = {
  id: string;
  title: string;
  description: string | null;
  host_name: string | null;
  venue: string | null;
  virtual_link: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed: number;
  seats_left: number;
  mode: "auto" | "manual";
  notes_label: string | null;
  country: string | null;
  my_status: "pending" | "confirmed" | null;
};

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function timeRange(startsAt: string, endsAt: string) {
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${t(new Date(startsAt))}–${t(new Date(endsAt))}`;
}

function BookingForm({ slot, onClose, onBooked }: { slot: Slot; onClose: () => void; onBooked: () => void }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("book_slot", {
      p_slot_id: slot.id,
      p_note: note.trim() || null,
    });
    setSaving(false);

    // book_slot returns {ok, status, message} rather than throwing, so a
    // full slot or a country mismatch arrives as ok:false with text
    // written for the member. Showing it verbatim beats inventing one.
    const row = Array.isArray(data) ? data[0] : data;
    if (err || !row?.ok) {
      setError(err ? "Something went wrong. Please try again." : row?.message);
      return;
    }
    onBooked();
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(16,21,28,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div className="pt-card" style={{ width: "100%", maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="pt-card-h">
          <div style={{ flex: 1 }}>
            <h3>{slot.title}</h3>
            <div className="sub">{dayLabel(slot.starts_at)} · {timeRange(slot.starts_at, slot.ends_at)}</div>
          </div>
        </div>
        <div className="pt-card-b">
          {slot.mode === "manual" && (
            <div className="pt-note warn" style={{ marginBottom: 14 }}>
              This one is by request. You'll hear back once someone has reviewed it — booking now
              doesn't reserve a place.
            </div>
          )}
          <div className="pt-field" style={{ marginBottom: error ? 14 : 0 }}>
            <label>
              {slot.notes_label || "Anything you'd like to add?"}
              {slot.mode === "manual" && <span className="hint"> — this is what the reviewer reads</span>}
            </label>
            <textarea className="pt-inp" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {error && <div className="pt-note warn">{error}</div>}
        </div>
        <div className="pt-card-h" style={{ borderTop: "1px solid var(--line-2)", borderBottom: "none", justifyContent: "flex-end", gap: 8 }}>
          <button className="pt-btn pt-btn-out" onClick={onClose}>Cancel</button>
          <button className="pt-btn pt-btn-go" onClick={submit} disabled={saving}>
            {saving ? "Sending…" : slot.mode === "manual" ? "Send request" : "Confirm booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Appointments() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("open_slots");
    if (error) console.error("open_slots failed:", error);
    setSlots((data as Slot[]) ?? []);
    setLoading(false);
  }, []);

  /**
   * Cancelling goes through cancel_booking(), not a direct UPDATE.
   *
   * appointment_bookings grants no INSERT, UPDATE or DELETE to
   * `authenticated` at all: booking is book_slot() (row lock plus
   * capacity), deciding is decide_booking() (capacity again), and
   * cancelling is here. A direct write let an admin confirm past
   * capacity and let a member set their own status, so the table is
   * simply not writable from a client.
   */
  const cancel = useCallback(async (slotId: string) => {
    setCancelling(slotId);
    const { data, error } = await supabase.rpc("cancel_booking", { p_slot_id: slotId });
    setCancelling(null);
    if (error || data === false) {
      console.error("cancel failed:", error);
      return;
    }
    load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>Loading…</div>;
  }

  const mine = slots.filter((s) => s.my_status);

  // Grouped by day — the closest real equivalent to the mock's calendar
  // without inventing a day-capacity concept the schema doesn't have.
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = dayLabel(s.starts_at);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(s);
  }

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-sec-title">Appointments</div>
      <p className="pt-sec-note">
        Time with the leadership and your chapter coordinators. Requesting a manual slot is not a
        confirmation until someone reviews it.
      </p>

      <div className="pt-page">
        <div>
          {slots.length === 0 ? (
            <div className="pt-card" style={{ padding: 30, textAlign: "center", color: "var(--ink-4)" }}>
              Nothing scheduled yet. When appointments open up, they'll appear here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {[...byDay.entries()].map(([day, daySlots]) => (
                <div key={day}>
                  <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-4)", fontWeight: 600, marginBottom: 8 }}>
                    {day}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {daySlots.map((s) => {
                      const full = s.mode === "auto" && s.seats_left === 0;
                      return (
                        <div key={s.id} className="pt-card" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="row" style={{ gap: 8, marginBottom: 3 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--navy)" }}>{timeRange(s.starts_at, s.ends_at)}</span>
                              {s.mode === "manual" && !s.my_status && <span className="pt-pill pt-p-saf">By request</span>}
                            </div>
                            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{s.title}</h4>
                            {s.description && <p style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 6 }}>{s.description}</p>}
                            <div className="row" style={{ gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--ink-4)" }}>
                              {s.host_name && <span>with {s.host_name}</span>}
                              {s.venue && <span className="row" style={{ gap: 4 }}><MapPin size={11} />{s.venue}</span>}
                              {s.virtual_link && <span className="row" style={{ gap: 4 }}><Video size={11} />Online</span>}
                              {s.mode === "auto" && (
                                <span className="row" style={{ gap: 4 }}><Users size={11} />{s.seats_left} of {s.capacity} left</span>
                              )}
                            </div>
                          </div>
                          <div style={{ flex: "0 0 auto" }}>
                            {s.my_status ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                                <span className={`pt-pill ${s.my_status === "confirmed" ? "pt-p-green" : "pt-p-saf"}`}>
                                  {s.my_status === "confirmed" ? <Check size={11} /> : <Clock size={11} />}
                                  {s.my_status === "confirmed" ? "Booked" : "Awaiting reply"}
                                </span>
                                <button
                                  className="pt-btn pt-btn-out pt-btn-sm"
                                  disabled={cancelling === s.id}
                                  onClick={() => void cancel(s.id)}
                                >
                                  {cancelling === s.id ? "Cancelling…" : s.my_status === "confirmed" ? "Cancel" : "Withdraw"}
                                </button>
                              </div>
                            ) : full ? (
                              <span className="pt-pill" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>Full</span>
                            ) : (
                              <button className="pt-btn pt-btn-go pt-btn-sm" onClick={() => setBooking(s)}>
                                {s.mode === "manual" ? "Request a place" : "Book"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="pt-rail" style={{ position: "sticky", top: 18 }}>
          <section className="pt-card">
            <div className="pt-card-h"><h3>Your requests</h3></div>
            <div className="pt-card-b">
              {mine.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--ink-4)", fontSize: 12.5, padding: 10 }}>
                  You haven't booked or requested anything yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {mine.map((s) => (
                    <div key={s.id} className="row" style={{ gap: 11, alignItems: "flex-start" }}>
                      <div style={{
                        width: 3, borderRadius: 3, alignSelf: "stretch", flex: "0 0 3px",
                        background: s.my_status === "confirmed" ? "var(--green)" : "var(--saffron)",
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{dayLabel(s.starts_at)}</div>
                      </div>
                      <span className={`pt-pill ${s.my_status === "confirmed" ? "pt-p-green" : "pt-p-saf"}`}>
                        {s.my_status === "confirmed" ? "Confirmed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {booking && <BookingForm slot={booking} onClose={() => setBooking(null)} onBooked={load} />}
    </div>
  );
}
