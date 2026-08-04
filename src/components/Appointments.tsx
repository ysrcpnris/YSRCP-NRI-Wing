import { useCallback, useEffect, useState } from "react";
import { CalendarDays, MapPin, Video, Users, Check, Clock, X } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Appointments — bookable time slots.
 *
 * TWO ADMISSION MODES, and the member is told which one applies before
 * they commit:
 *   auto    confirmed on the spot, up to the slot's capacity
 *   manual  a request that someone decides on
 *
 * Saying "Request a place" for a manual slot and "Book" for an auto one
 * is the difference between a member expecting a decision and a member
 * expecting a seat.
 *
 * Capacity is enforced in book_slot() under a row lock, so two people
 * booking the last seat at the same instant cannot both succeed. The
 * client shows seats_left as a courtesy, never as the check.
 */

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

function when(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const date = s.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const t = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${t(s)}–${t(e)}`;
}

function BookingForm({
  slot,
  onClose,
  onBooked,
}: {
  slot: Slot;
  onClose: () => void;
  onBooked: () => void;
}) {
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
      className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900">{slot.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {when(slot.starts_at, slot.ends_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 shrink-0 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {slot.mode === "manual" && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-900">
                This one is by request. You’ll hear back once someone has
                reviewed it — booking now doesn’t reserve a place.
              </p>
            </div>
          )}

          <div>
            <label className="input-label">
              {slot.notes_label || "Anything you'd like to add?"}
              {slot.mode === "manual" && (
                <span className="text-xs font-normal text-gray-500">
                  {" "}
                  — this is what the reviewer reads
                </span>
              )}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={1000}
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm
                         focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg border border-gray-200 text-sm font-bold text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 h-11 rounded-lg bg-primary-600 text-white text-sm font-bold
                       hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving
              ? "Sending…"
              : slot.mode === "manual"
              ? "Send request"
              : "Confirm booking"}
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

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("open_slots");
    if (error) console.error("open_slots failed:", error);
    setSlots((data as Slot[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Appointments</h2>
        <p className="text-sm text-gray-600 mt-1">
          Time with the leadership and your chapter coordinators.
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <CalendarDays size={22} className="mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-gray-900">Nothing scheduled yet</p>
          <p className="text-sm text-gray-600 mt-1">
            When appointments open up, they’ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((s) => {
            const full = s.mode === "auto" && s.seats_left === 0;
            const mine = s.my_status;
            return (
              <div
                key={s.id}
                className="p-5 bg-white border border-gray-200 rounded-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide text-primary-600">
                        {when(s.starts_at, s.ends_at)}
                      </span>
                      {s.mode === "manual" && !mine && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full
                                         bg-amber-50 text-amber-800 border border-amber-200">
                          By request
                        </span>
                      )}
                    </div>

                    <p className="font-bold text-gray-900">{s.title}</p>
                    {s.description && (
                      <p className="text-sm text-gray-600 mt-1">{s.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                      {s.host_name && <span>with {s.host_name}</span>}
                      {s.venue && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} />
                          {s.venue}
                        </span>
                      )}
                      {s.virtual_link && (
                        <span className="inline-flex items-center gap-1">
                          <Video size={11} />
                          Online
                        </span>
                      )}
                      {/* Seats are shown for auto slots only. On a manual
                          slot the number would imply a race that isn't
                          happening — the decision is a human's. */}
                      {s.mode === "auto" && (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Users size={11} />
                          {s.seats_left} of {s.capacity} left
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {mine === "confirmed" ? (
                      <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg
                                       bg-emerald-50 text-emerald-800 border border-emerald-200
                                       text-sm font-bold">
                        <Check size={15} />
                        Booked
                      </span>
                    ) : mine === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg
                                       bg-amber-50 text-amber-800 border border-amber-200
                                       text-sm font-bold">
                        <Clock size={15} />
                        Awaiting reply
                      </span>
                    ) : full ? (
                      <span className="inline-flex items-center h-10 px-4 rounded-lg
                                       bg-gray-100 text-gray-500 text-sm font-bold">
                        Full
                      </span>
                    ) : (
                      <button
                        onClick={() => setBooking(s)}
                        className="h-10 px-4 rounded-lg bg-primary-600 text-white text-sm
                                   font-bold hover:bg-primary-700 transition-colors"
                      >
                        {s.mode === "manual" ? "Request a place" : "Book"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {booking && (
        <BookingForm
          slot={booking}
          onClose={() => setBooking(null)}
          onBooked={load}
        />
      )}
    </div>
  );
}
