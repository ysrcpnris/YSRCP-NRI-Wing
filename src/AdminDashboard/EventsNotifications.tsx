import React, { useEffect, useState } from "react";
import {
  Plus,
  Edit3,
  Trash2,
  Users,
  Download,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../lib/supabase";

// Notification / event row stored in `events`. New `kind` column
// distinguishes the two: 'event' rows are apply-able and require a
// date; 'notification' rows are announce-only.
type EventRow = {
  id: string;
  title: string;
  info: string;
  date: string | null;
  venue: string | null;
  status: "Draft" | "Sent";
  kind: "event" | "notification";
};

// Per-applicant row returned by the get_event_applicants RPC.
type Applicant = {
  application_id: string;
  applied_at: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  country_of_residence: string | null;
  city_abroad: string | null;
  indian_state: string | null;
  district: string | null;
  assembly_constituency: string | null;
  public_user_code: string | null;
};

// "Current living location" — where the user actually lives right now.
// NRIs (country_of_residence set and not India) show "city, country".
// Domestic users show "constituency, district, state". Falls back to
// any known fragment if some fields are missing, and finally to "—".
const currentLivingLocation = (a: Applicant): string => {
  const country = (a.country_of_residence || "").trim();
  const isNri = country && country.toLowerCase() !== "india";
  if (isNri) {
    return [a.city_abroad, country].filter(Boolean).join(", ") || country || "—";
  }
  const indian = [a.assembly_constituency, a.district, a.indian_state]
    .filter(Boolean)
    .join(", ");
  return indian || country || "—";
};

// True when the event's date was more than 7 days ago — at that point
// the auto-purge has run (or the read-time TTL hides the rows anyway),
// so applicant data is gone for good.
const APPLICATIONS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const isApplicationsExpired = (eventDate: string | null): boolean => {
  if (!eventDate) return false;
  return new Date(eventDate).getTime() + APPLICATIONS_TTL_MS < Date.now();
};

export default function EventsNotifications() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({});

  // Create / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<EventRow | null>(null);
  const [kind, setKind] = useState<"event" | "notification">("event");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [date, setDate] = useState<string>("");
  const [venue, setVenue] = useState<string>("");
  const [status, setStatus] = useState<"Draft" | "Sent">("Draft");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Applicants modal state
  const [applicantsModalEvent, setApplicantsModalEvent] = useState<EventRow | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  // Set of application_ids whose extra row (location + applied time)
  // is currently expanded. Reset whenever the modal closes.
  const [expandedApplicants, setExpandedApplicants] = useState<Set<string>>(new Set());

  useEffect(() => {
    void initialize();
  }, []);

  // Run the auto-purge first so any expired applications are removed
  // before we fetch counts. Then load events + counts in parallel.
  const initialize = async () => {
    try {
      await supabase.rpc("purge_expired_event_applications");
    } catch {
      /* purge is best-effort; failures here shouldn't block the page */
    }
    await fetchEvents();
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data || []) as EventRow[];
    setEvents(rows);

    // Pull applicant counts for every kind='event' row in one round trip.
    const eventIds = rows.filter((r) => r.kind === "event").map((r) => r.id);
    if (eventIds.length > 0) {
      const { data: appRows } = await supabase
        .from("event_applications")
        .select("event_id")
        .in("event_id", eventIds);
      const counts: Record<string, number> = {};
      (appRows || []).forEach((a: any) => {
        counts[a.event_id] = (counts[a.event_id] || 0) + 1;
      });
      setApplicantCounts(counts);
    } else {
      setApplicantCounts({});
    }
  };

  const openModal = (item?: EventRow) => {
    setEditItem(item || null);
    setKind(item?.kind || "event");
    setTitle(item?.title || "");
    setInfo(item?.info || "");
    setDate(item?.date ? String(item.date).slice(0, 10) : "");
    setVenue(item?.venue || "");
    setStatus(item?.status || "Draft");
    setFormError(null);
    setModalOpen(true);
  };

  const saveEvent = async () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!info.trim()) {
      setFormError("Content is required.");
      return;
    }
    if (kind === "event" && !date) {
      setFormError("Events must have a date. Choose one or switch to Notification.");
      return;
    }

    setSaving(true);
    const payload: any = {
      kind,
      title: title.trim(),
      info: info.trim(),
      status,
      // Date is required for events, optional for notifications.
      date: date ? date : null,
      venue: venue.trim() || null,
    };

    let err = null;
    if (editItem) {
      ({ error: err } = await supabase.from("events").update(payload).eq("id", editItem.id));
    } else {
      ({ error: err } = await supabase.from("events").insert(payload));
    }
    setSaving(false);

    if (err) {
      setFormError(err.message);
      return;
    }

    setModalOpen(false);
    await fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this row? Any applications attached to it will be removed too.")) return;
    await supabase.from("events").delete().eq("id", id);
    await fetchEvents();
  };

  // ---- Applicants modal --------------------------------------------------
  const openApplicants = async (ev: EventRow) => {
    setApplicantsModalEvent(ev);
    setApplicants([]);
    setApplicantsLoading(true);
    const { data, error } = await supabase.rpc("get_event_applicants", {
      p_event_id: ev.id,
    });
    setApplicantsLoading(false);
    if (error) {
      alert("Failed to load applicants: " + error.message);
      return;
    }
    setApplicants((data || []) as Applicant[]);
  };

  const closeApplicants = () => {
    setApplicantsModalEvent(null);
    setApplicants([]);
    setExpandedApplicants(new Set());
  };

  const toggleExpanded = (applicationId: string) => {
    setExpandedApplicants((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) next.delete(applicationId);
      else next.add(applicationId);
      return next;
    });
  };

  const removeApplicant = async (applicationId: string) => {
    if (!confirm("Remove this applicant from the list?")) return;
    const { error } = await supabase
      .from("event_applications")
      .delete()
      .eq("id", applicationId);
    if (error) {
      alert("Failed to remove: " + error.message);
      return;
    }
    if (applicantsModalEvent) {
      await openApplicants(applicantsModalEvent);
    }
    await fetchEvents();
  };

  // Convert the applicants list to an Excel file the admin can keep
  // for follow-up. Single Location column = the applicant's current
  // living location (NRIs → city, country; domestic → constituency,
  // district, state).
  const downloadExcel = () => {
    if (!applicantsModalEvent || applicants.length === 0) return;
    const rows = applicants.map((a, i) => ({
      "#":          i + 1,
      Name:         a.full_name || "—",
      Mobile:       a.mobile_number || "—",
      Email:        a.email || "—",
      Location:     currentLivingLocation(a),
      "Applied at": new Date(a.applied_at).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Applicants");
    const safeTitle = applicantsModalEvent.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
    XLSX.writeFile(wb, `applicants-${safeTitle || "event"}.xlsx`);
  };

  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-600">Events & Notifications</h1>
          <p className="text-gray-500 mt-1">
            Notifications are announce-only. Events have a date and let users apply to attend
            (their list auto-clears 7 days after the event).
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-5 py-2 rounded-lg shadow flex gap-2 items-center hover:opacity-90"
        >
          <Plus size={18} /> New
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {events.map((e) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isPast = e.date
            ? new Date(e.date as string).getTime() < today.getTime()
            : false;
          const isEvent = e.kind === "event";
          const applyCount = applicantCounts[e.id] || 0;

          return (
            <div
              key={e.id}
              className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className="font-semibold text-lg text-gray-800">{e.title}</h3>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap ${
                      e.status === "Sent"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>

                {/* Type + date + venue */}
                <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                      isEvent
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-purple-50 text-purple-700 border border-purple-200"
                    }`}
                  >
                    {isEvent ? "Event" : "Notification"}
                  </span>
                  {e.date && (
                    <span className="font-mono text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                      📅 {new Date(e.date as string).toLocaleDateString()}
                    </span>
                  )}
                  {e.date ? (
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        isPast
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {isPast ? "Past" : "Upcoming"}
                    </span>
                  ) : (
                    !isEvent && (
                      <span className="px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700">
                        General
                      </span>
                    )
                  )}
                  {e.venue && (
                    <span className="text-gray-500 truncate max-w-[180px]">📍 {e.venue}</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 line-clamp-3">{e.info}</p>

                {/* Applicants strip — only meaningful for kind=event.
                    Once the event ended more than 7 days ago, the
                    auto-purge has run (or the read-time TTL hides the
                    rows anyway), so we replace the View button with a
                    static "User data auto-deleted" message instead of
                    a button that would open an empty list. */}
                {isEvent && (
                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                    {isApplicationsExpired(e.date) ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 italic">
                        <Trash2 size={12} />
                        User data auto-deleted (event ended over 7 days ago)
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                          <Users size={13} />
                          {applyCount} {applyCount === 1 ? "applicant" : "applicants"}
                        </span>
                        <button
                          onClick={() => void openApplicants(e)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
                        >
                          View applicants →
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <button
                  onClick={() => openModal(e)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Edit3 size={16} /> Edit
                </button>
                <button
                  onClick={() => deleteEvent(e.id)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-16 text-gray-500">No items created yet.</div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">
              {editItem ? "Edit" : "Create"}
            </h3>

            {/* Type selector */}
            <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setKind("event")}
                className={`p-3 rounded-lg border text-left transition ${
                  kind === "event"
                    ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-bold text-gray-900">Event</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Has a date. Users can apply to attend.
                </div>
              </button>
              <button
                type="button"
                onClick={() => setKind("notification")}
                className={`p-3 rounded-lg border text-left transition ${
                  kind === "notification"
                    ? "bg-purple-50 border-purple-400 ring-2 ring-purple-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-bold text-gray-900">Notification</div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Announce-only. No apply button.
                </div>
              </button>
            </div>

            <input
              className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-400"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-400"
              placeholder="Content / message"
              rows={4}
              value={info}
              onChange={(e) => setInfo(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Date {kind === "event" && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  className={`w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400 ${
                    kind === "event" && !date ? "border-red-300" : ""
                  }`}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {kind === "event"
                    ? "Required. Applications auto-clear 7 days after this date."
                    : "Optional. Leave empty for a general notification."}
                </p>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">
                  Venue (optional)
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. Hyderabad Convention Center"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </div>
            </div>

            <select
              className="w-full border rounded-lg p-2 mb-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option>Draft</option>
              <option>Sent</option>
            </select>

            {formError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                {formError}
              </div>
            )}

            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="flex-1 border rounded-lg py-2 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-green-600 disabled:bg-gray-400 inline-flex items-center justify-center gap-1.5"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* APPLICANTS MODAL */}
      {applicantsModalEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Applicants — {applicantsModalEvent.title}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {applicantsModalEvent.date
                    ? `Event on ${new Date(applicantsModalEvent.date).toLocaleDateString()} · Auto-clears ${new Date(
                        new Date(applicantsModalEvent.date).getTime() +
                          7 * 24 * 60 * 60 * 1000
                      ).toLocaleDateString()}`
                    : "No event date"}
                </p>
              </div>
              <button
                onClick={closeApplicants}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="text-xs font-semibold text-gray-700">
                {applicants.length} {applicants.length === 1 ? "applicant" : "applicants"}
              </div>
              <button
                onClick={downloadExcel}
                disabled={applicants.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={12} /> Download Excel
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {applicantsLoading ? (
                <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading applicants…
                </div>
              ) : applicants.length === 0 ? (
                <div className="text-center py-16 text-sm text-gray-500">
                  No one has applied yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white border-b border-gray-200">
                    <tr className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Name</th>
                      <th className="px-4 py-2">Mobile</th>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2"></th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map((a, idx) => {
                      const isExpanded = expandedApplicants.has(a.application_id);
                      return (
                        <React.Fragment key={a.application_id}>
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-4 py-2 font-medium text-gray-900">
                              {a.full_name || "—"}
                              {a.public_user_code && (
                                <div className="text-[10px] font-mono text-gray-400">
                                  {a.public_user_code}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                              {a.mobile_number ? (
                                <a
                                  href={`tel:${a.mobile_number}`}
                                  className="hover:underline"
                                >
                                  {a.mobile_number}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-700">
                              {a.email ? (
                                <a
                                  href={`mailto:${a.email}`}
                                  className="hover:underline"
                                >
                                  {a.email}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => toggleExpanded(a.application_id)}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:underline"
                                title={isExpanded ? "Hide details" : "Show location and applied time"}
                              >
                                {isExpanded ? (
                                  <>
                                    Hide <ChevronUp size={12} />
                                  </>
                                ) : (
                                  <>
                                    View more <ChevronDown size={12} />
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => void removeApplicant(a.application_id)}
                                className="p-1.5 rounded text-red-600 hover:bg-red-50"
                                title="Remove this applicant"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <td></td>
                              <td colSpan={5} className="px-4 py-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                                      Current location
                                    </p>
                                    <p className="text-gray-700">
                                      {currentLivingLocation(a)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                                      Applied at
                                    </p>
                                    <p className="text-gray-700">
                                      {new Date(a.applied_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
