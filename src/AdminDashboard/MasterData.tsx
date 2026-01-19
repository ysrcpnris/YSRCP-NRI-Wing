// src/pages/MasterData.tsx
import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

/* ======================================================
   TYPES
====================================================== */
type Leader = {
  id: string;
  name: string;
  role: string;
  whatsapp_number: string;
};

type NotificationItem = {
  id: string;
  title: string;
  info: string;
  status: "Draft" | "Sent";
};

/* ======================================================
   COMPONENT
====================================================== */
export default function MasterData() {
  /* ------------------ STATE ------------------ */
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [events, setEvents] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  /* ------------------ MODAL STATE ------------------ */
  const [modalType, setModalType] = useState<"leader" | "event" | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  /* ------------------ FORM STATE ------------------ */
  const [inputName, setInputName] = useState("");
  const [inputRole, setInputRole] = useState("");
  const [inputPhone, setInputPhone] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventInfo, setEventInfo] = useState("");
  const [eventStatus, setEventStatus] = useState<"Draft" | "Sent">("Draft");

  /* ======================================================
     FETCH DATA
  ====================================================== */
  useEffect(() => {
    fetchLeaders();
    fetchEvents();
  }, []);

  const fetchLeaders = async () => {
    const { data, error } = await supabase
      .from("leaders")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Leaders fetch error", error);
      return;
    }
    setLeaders(data || []);
  };

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Events fetch error", error);
      return;
    }
    setEvents(data || []);
  };

  /* ======================================================
     MODAL OPENERS
  ====================================================== */
  const openLeaderModal = (leader?: Leader) => {
    setModalType("leader");
    setEditItem(leader || null);
    setInputName(leader?.name || "");
    setInputRole(leader?.role || "");
    setInputPhone(leader?.whatsapp_number || "");
  };

  const openEventModal = (event?: NotificationItem) => {
    setModalType("event");
    setEditItem(event || null);
    setEventTitle(event?.title || "");
    setEventInfo(event?.info || "");
    setEventStatus(event?.status || "Draft");
  };

  /* ======================================================
     SAVE / UPDATE
  ====================================================== */
  const saveLeader = async () => {
    if (!inputName || !inputRole) return;

    setLoading(true);

    if (editItem) {
      await supabase
        .from("leaders")
        .update({ name: inputName, role: inputRole, whatsapp_number: inputPhone })
        .eq("id", editItem.id);
    } else {
      await supabase.from("leaders").insert({
        name: inputName,
        role: inputRole,
        whatsapp_number: inputPhone,
      });
    }

    setLoading(false);
    closeModal();
    fetchLeaders();
  };

  const saveEvent = async () => {
    if (!eventTitle || !eventInfo) return;

    setLoading(true);

    if (editItem) {
      await supabase
        .from("events")
        .update({
          title: eventTitle,
          info: eventInfo,
          status: eventStatus,
        })
        .eq("id", editItem.id);
    } else {
      await supabase.from("events").insert({
        title: eventTitle,
        info: eventInfo,
        status: eventStatus,
      });
    }

    setLoading(false);
    closeModal();
    fetchEvents();
  };

  /* ======================================================
     DELETE
  ====================================================== */
  const deleteLeader = async (id: string) => {
    await supabase.from("leaders").delete().eq("id", id);
    fetchLeaders();
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
  };

  /* ======================================================
     CLOSE MODAL
  ====================================================== */
  const closeModal = () => {
    setModalType(null);
    setEditItem(null);
    setInputName("");
    setInputRole("");
    setInputPhone("");
    setEventTitle("");
    setEventInfo("");
    setEventStatus("Draft");
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6">
        SYSTEM MASTER DATA
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ================= LEADERS ================= */}
        <div className="bg-white rounded-xl border shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold">👥 Local Leaders</h2>
            <button
              onClick={() => openLeaderModal()}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded"
            >
              <Plus size={18} /> Add New
            </button>
          </div>

          <div className="space-y-3">
            {leaders.map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center bg-gray-50 p-3 rounded border"
              >
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-sm text-gray-500">{l.role}</p>
                  <p className="text-sm text-gray-400">{l.whatsapp_number}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openLeaderModal(l)}>
                    <Edit3 />
                  </button>
                  <button onClick={() => deleteLeader(l.id)}>
                    <Trash2 className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ================= EVENTS ================= */}
        <div className="bg-white rounded-xl border shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold">🔔 Events & Notifications</h2>
            <button
              onClick={() => openEventModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
            >
              <Plus size={18} /> Create
            </button>
          </div>

          <div className="space-y-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="flex justify-between items-center bg-gray-50 p-3 rounded border"
              >
                <div>
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-sm text-gray-500">{e.info}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded bg-gray-200">
                    {e.status}
                  </span>
                  <button onClick={() => openEventModal(e)}>
                    <Edit3 />
                  </button>
                  <button onClick={() => deleteEvent(e.id)}>
                    <Trash2 className="text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MODAL ================= */}
      {modalType && (
        <Modal
          title={
            modalType === "leader"
              ? editItem
                ? "Edit Leader"
                : "Add Leader"
              : editItem
              ? "Edit Event"
              : "Create Event"
          }
          onClose={closeModal}
        >
          {modalType === "leader" && (
            <>
              <input
                placeholder="Leader Name"
                className="w-full border p-2 rounded"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
              />
              <input
                placeholder="Role"
                className="w-full border p-2 rounded mt-3"
                value={inputRole}
                onChange={(e) => setInputRole(e.target.value)}
              />
              <input
                placeholder="WhatsApp Number"
                className="w-full border p-2 rounded mt-3"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value)}
              />
              <button
                onClick={saveLeader}
                className="w-full bg-blue-600 text-white py-2 mt-4 rounded"
              >
                Save
              </button>
            </>
          )}

          {modalType === "event" && (
            <>
              <input
                placeholder="Title"
                className="w-full border p-2 rounded"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
              <input
                placeholder="Info"
                className="w-full border p-2 rounded mt-3"
                value={eventInfo}
                onChange={(e) => setEventInfo(e.target.value)}
              />
              <select
                className="w-full border p-2 rounded mt-3"
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value as any)}
              >
                <option>Draft</option>
                <option>Sent</option>
              </select>
              <button
                onClick={saveEvent}
                className="w-full bg-green-600 text-white py-2 mt-4 rounded"
              >
                Save
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ======================================================
   MODAL
====================================================== */
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl w-full max-w-lg">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        {children}
        <button
          className="w-full border py-2 rounded mt-4"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

