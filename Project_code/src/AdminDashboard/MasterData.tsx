// src/pages/MasterData.tsx
import React, { useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";

export default function MasterData() {
  /* ------------------ Leaders Data ------------------ */
  const [leaders, setLeaders] = useState([
    { id: 1, name: "Leader Name 1", role: "Constituency In-Charge" },
    { id: 2, name: "Leader Name 2", role: "District Coordinator" },
    { id: 3, name: "Leader Name 3", role: "State Level Coordinator" },
  ]);

  /* ------------------ Events & Notifications Data ------------------ */
  const [events, setEvents] = useState([
    {
      id: 1,
      title: "Global Summit Notification",
      info: "Sent to All Users • Jan 12, 10:00 AM",
      status: "Sent",
    },
    {
      id: 2,
      title: "Membership Drive Alert",
      info: "Scheduled for Jan 20",
      status: "Draft",
    },
  ]);

  /* ------------------ Modal State ------------------ */
  const [modalType, setModalType] = useState<"leader" | "event" | null>(null);
  const [editItem, setEditItem] = useState<any>(null);

  /* ------------------ Input State ------------------ */
  const [inputName, setInputName] = useState("");
  const [inputRole, setInputRole] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventInfo, setEventInfo] = useState("");
  const [eventStatus, setEventStatus] = useState("Draft");

  /* ------------------ Open Modal With Prefill ------------------ */
  const openLeaderModal = (leader?: any) => {
    setModalType("leader");
    setEditItem(leader || null);
    setInputName(leader?.name || "");
    setInputRole(leader?.role || "");
  };

  const openEventModal = (event?: any) => {
    setModalType("event");
    setEditItem(event || null);
    setEventTitle(event?.title || "");
    setEventInfo(event?.info || "");
    setEventStatus(event?.status || "Draft");
  };

  /* ------------------ Save / Update Leaders ------------------ */
  const saveLeader = () => {
    if (!inputName || !inputRole) return;

    if (editItem) {
      // Update existing leader
      setLeaders((prev) =>
        prev.map((l) =>
          l.id === editItem.id ? { ...l, name: inputName, role: inputRole } : l
        )
      );
    } else {
      // Add new leader
      setLeaders((prev) => [
        ...prev,
        {
          id: Date.now(),
          name: inputName,
          role: inputRole,
        },
      ]);
    }

    closeModal();
  };

  /* ------------------ Save / Update Events ------------------ */
  const saveEvent = () => {
    if (!eventTitle || !eventInfo) return;

    if (editItem) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === editItem.id
            ? { ...e, title: eventTitle, info: eventInfo, status: eventStatus }
            : e
        )
      );
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: eventTitle,
          info: eventInfo,
          status: eventStatus,
        },
      ]);
    }

    closeModal();
  };

  /* ------------------ Delete Functions ------------------ */
  const deleteLeader = (id: number) => {
    setLeaders((prev) => prev.filter((l) => l.id !== id));
  };

  const deleteEvent = (id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  /* ------------------ Close Modal ------------------ */
  const closeModal = () => {
    setModalType(null);
    setEditItem(null);
    setInputName("");
    setInputRole("");
    setEventTitle("");
    setEventInfo("");
    setEventStatus("Draft");
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6">
        SYSTEM MASTER DATA
      </h1>

      {/* -------- MAIN GRID -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* -------- LOCAL LEADERS -------- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              👥 Local Leaders
            </h2>

            <button
              onClick={() => openLeaderModal()}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md shadow hover:bg-green-700"
            >
              <Plus size={18} /> Add New
            </button>
          </div>

          {/* Leader List */}
          <div className="space-y-3">
            {leaders.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div>
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-sm text-gray-500">{l.role}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => openLeaderModal(l)}
                  >
                    <Edit3 size={20} />
                  </button>

                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => deleteLeader(l.id)}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -------- EVENTS & NOTIFICATIONS -------- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              🔔 Events & Notifications
            </h2>

            <button
              onClick={() => openEventModal()}
              className="flex items-center gap-2 bg-[#1368d6] text-white px-4 py-2 rounded-md shadow hover:bg-blue-700"
            >
              <Plus size={18} /> Create
            </button>
          </div>

          <div className="space-y-3">
            {events.map((e) => (
              <div
                key={e.id}
                className="p-4 bg-gray-50 border rounded-lg hover:shadow-sm flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-gray-800">{e.title}</p>
                  <p className="text-sm text-gray-500">{e.info}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-md ${
                      e.status === "Sent"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {e.status}
                  </span>

                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => openEventModal(e)}
                  >
                    <Edit3 size={20} />
                  </button>

                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => deleteEvent(e.id)}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- DYNAMIC MODAL ---------- */}
      {modalType && (
        <Modal title={modalType === "leader" ? (editItem ? "Edit Leader" : "Add Leader") : (editItem ? "Edit Event" : "Create Event")} onClose={closeModal}>
          
          {/* Leader Form */}
          {modalType === "leader" && (
            <>
              <label className="text-sm font-medium mt-2">Leader Name</label>
              <input
                type="text"
                className="w-full border p-2 rounded mt-1"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
              />

              <label className="text-sm font-medium mt-4">Role</label>
              <input
                type="text"
                className="w-full border p-2 rounded mt-1"
                value={inputRole}
                onChange={(e) => setInputRole(e.target.value)}
              />

              <button
                className="bg-[#1368d6] text-white w-full py-2 rounded-md mt-4 hover:bg-green-600"
                onClick={saveLeader}
              >
                Save
              </button>
            </>
          )}

          {/* Event Form */}
          {modalType === "event" && (
            <>
              <label className="text-sm font-medium">Event Title</label>
              <input
                type="text"
                className="w-full border p-2 rounded mt-1"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />

              <label className="text-sm font-medium mt-4">Event Info</label>
              <input
                type="text"
                className="w-full border p-2 rounded mt-1"
                value={eventInfo}
                onChange={(e) => setEventInfo(e.target.value)}
              />

              <label className="text-sm font-medium mt-4">Status</label>
              <select
                className="w-full border p-2 rounded mt-1"
                value={eventStatus}
                onChange={(e) => setEventStatus(e.target.value)}
              >
                <option>Draft</option>
                <option>Sent</option>
              </select>

              <button
                className="bg-green-600 text-white w-full py-2 rounded-md mt-4 hover:bg-green-700"
                onClick={saveEvent}
              >
                Save Event
              </button>
            </>
          )}

        </Modal>
      )}
    </div>
  );
}

/* ---------- REUSABLE MODAL COMPONENT ---------- */
function Modal({ onClose, title, children }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 animate-fadeIn">
        <h3 className="text-xl font-semibold mb-4 text-[#1368d6]">{title}</h3>

        {children}

        <button
          className="mt-4 w-full py-2 rounded-md border hover:bg-gray-100"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
