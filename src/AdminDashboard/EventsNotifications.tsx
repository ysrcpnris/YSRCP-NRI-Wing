import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

// Notification item structure with title, content, date, venue, and delivery status
type NotificationItem = {
  id: string;
  title: string;
  info: string;
  date: string | null;          // YYYY-MM-DD (or null for general notifications)
  venue: string | null;
  status: "Draft" | "Sent";
};

// Admin interface for creating and managing event notifications
export default function EventsNotifications() {
  // List of notification items
  const [events, setEvents] = useState<NotificationItem[]>([]);
  // Modal visibility state
  const [modalOpen, setModalOpen] = useState(false);
  // Current item being edited (null if creating new)
  const [editItem, setEditItem] = useState<NotificationItem | null>(null);

  // Form field states for notification title, content, date, venue, and status
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [date, setDate] = useState<string>("");      // YYYY-MM-DD; empty = general notification
  const [venue, setVenue] = useState<string>("");
  const [status, setStatus] = useState<"Draft" | "Sent">("Draft");

  // Load all notifications on component mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch all notifications from database
  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    setEvents(data || []);
  };

  // Prepare form for creating new or editing existing notification
  const openModal = (item?: NotificationItem) => {
    setEditItem(item || null);
    setTitle(item?.title || "");
    setInfo(item?.info || "");
    // events.date in DB is timestamptz — slice to YYYY-MM-DD for the <input type=date>
    setDate(item?.date ? String(item.date).slice(0, 10) : "");
    setVenue(item?.venue || "");
    setStatus(item?.status || "Draft");
    setModalOpen(true);
  };

  // Create new or update existing notification in database
  const saveEvent = async () => {
    if (!title || !info) return;

    const payload: any = {
      title,
      info,
      status,
      date: date ? date : null,           // empty string -> null (general notification)
      venue: venue.trim() || null,
    };

    if (editItem) {
      await supabase.from("events").update(payload).eq("id", editItem.id);
    } else {
      await supabase.from("events").insert(payload);
    }

    setModalOpen(false);
    fetchEvents();
  };

  // Remove notification from database
  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
  };

 return (
  <div className="p-6">
    {/* HEADER */}
    {/* Page title and new notification button*/}
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-primary-600">
          Events & Notifications
        </h1>
        <p className="text-gray-500 mt-1">
          Create and manage announcements visible to users
        </p>
      </div>

      <button
        onClick={() => openModal()}
        className="bg-gradient-to-r from-blue-600 to-blue-600 text-white px-5 py-2 rounded-lg shadow flex gap-2 items-center hover:opacity-90"
      >
        <Plus size={18} /> New Notification
      </button>
    </div>

    {/* GRID */}
    {/*Card grid displaying all notifications with edit/delete actions*/}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {events.map((e) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = e.date
          ? new Date(e.date as string).getTime() < today.getTime()
          : false;

        return (
          <div
            key={e.id}
            className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
          >
            {/* TITLE + STATUS */}
            <div>
              <div className="flex justify-between items-start mb-2 gap-2">
                <h3 className="font-semibold text-lg text-gray-800">
                  {e.title}
                </h3>

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

              {/* DATE + ACTIVE/PAST + VENUE */}
              <div className="flex flex-wrap items-center gap-2 mb-2 text-[11px]">
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
                    {isPast ? "Past" : "Active"}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-700">
                    General
                  </span>
                )}
                {e.venue && (
                  <span className="text-gray-500 truncate max-w-[180px]">
                    📍 {e.venue}
                  </span>
                )}
              </div>

              {/* INFO */}
              <p className="text-sm text-gray-600 line-clamp-3">{e.info}</p>
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


    {/* EMPTY STATE */}
    
    {events.length === 0 && (
      <div className="text-center py-16 text-gray-500">
        No notifications created yet.
      </div>
    )}

    {/* MODAL */}
    {/* Form modal for creating or editing notifications*/}
    {modalOpen && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
          <h3 className="text-xl font-semibold mb-4">
            {editItem ? "Edit Notification" : "Create Notification"}
          </h3>

          <input
            className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-400"
            placeholder="Notification Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full border rounded-lg p-2 mb-3 focus:ring-2 focus:ring-blue-400"
            placeholder="Notification Content"
            rows={4}
            value={info}
            onChange={(e) => setInfo(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase">
                Event date
              </label>
              <input
                type="date"
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Leave empty for a general notification (always active).
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
            className="w-full border rounded-lg p-2 mb-4"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option>Draft</option>
            <option>Sent</option>
          </select>

          <div className="flex gap-3">
            <button
              onClick={() => setModalOpen(false)}
              className="flex-1 border rounded-lg py-2"
            >
              Cancel
            </button>
            <button
              onClick={saveEvent}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-green-600"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}