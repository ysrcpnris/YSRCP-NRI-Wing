import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

type NotificationItem = {
  id: string;
  title: string;
  info: string;
  status: "Draft" | "Sent";
};

export default function EventsNotifications() {
  const [events, setEvents] = useState<NotificationItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<NotificationItem | null>(null);

  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [status, setStatus] = useState<"Draft" | "Sent">("Draft");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    setEvents(data || []);
  };

  const openModal = (item?: NotificationItem) => {
    setEditItem(item || null);
    setTitle(item?.title || "");
    setInfo(item?.info || "");
    setStatus(item?.status || "Draft");
    setModalOpen(true);
  };

  const saveEvent = async () => {
    if (!title || !info) return;

    if (editItem) {
      await supabase
        .from("events")
        .update({ title, info, status })
        .eq("id", editItem.id);
    } else {
      await supabase.from("events").insert({ title, info, status });
    }

    setModalOpen(false);
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
  };

 return (
  <div className="p-6">
    {/* HEADER */}
    <div className="flex justify-between items-center mb-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1368d6]">
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {events.map((e) => (
        <div
          key={e.id}
          className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between"
        >
          {/* TITLE + STATUS */}
          <div>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg text-gray-800">
                {e.title}
              </h3>

              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  e.status === "Sent"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {e.status}
              </span>
            </div>

            {/* INFO */}
            <p className="text-sm text-gray-600 line-clamp-3">
              {e.info}
            </p>
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
      ))}
    </div>

    {/* EMPTY STATE */}
    {events.length === 0 && (
      <div className="text-center py-16 text-gray-500">
        No notifications created yet.
      </div>
    )}

    {/* MODAL */}
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