// src/pages/MasterData.tsx
import React, { useState } from "react";
import { Plus, Edit3 } from "lucide-react";

export default function MasterData() {
  /* ------------------ Local Leaders Dummy Data ------------------ */
  const [leaders, setLeaders] = useState([
    { id: 1, name: "Leader Name 1", role: "Constituency In-Charge" },
    { id: 2, name: "Leader Name 2", role: "Constituency In-Charge" },
    { id: 3, name: "Leader Name 3", role: "Constituency In-Charge" },
  ]);

  /* ------------------ Events & Notifications Dummy Data ------------------ */
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
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6 text-center sm:text-left">
        SYSTEM MASTER DATA
      </h1>

      {/* -------- MAIN GRID -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* -------- LOCAL LEADERS -------- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-gray-700">👥 Local Leaders</span>
            </h2>

            <button
              onClick={() => setShowLeaderModal(true)}
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

                <button className="text-gray-600 hover:text-[#1368d6]">
                  <Edit3 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* -------- EVENTS & NOTIFICATIONS -------- */}
        <div className="bg-white rounded-xl border border-gray-200 shadow p-6">
          <div className="flex justify-between mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-gray-700">🔔 Events & Notifications</span>
            </h2>

            <button
              onClick={() => setShowEventModal(true)}
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

                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-md ${
                    e.status === "Sent"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- LEADER MODAL ---------- */}
      {showLeaderModal && (
        <Modal onClose={() => setShowLeaderModal(false)} title="Add New Leader">
          <p className="text-gray-600 mb-4 text-sm">
            This is a demo modal — connect to Supabase later.
          </p>

          <button
            className="bg-[#1368d6] text-white w-full py-2 rounded-md mt-2"
            onClick={() => setShowLeaderModal(false)}
          >
            Save
          </button>
        </Modal>
      )}

      {/* ---------- EVENT MODAL ---------- */}
      {showEventModal && (
        <Modal onClose={() => setShowEventModal(false)} title="Create Event">
          <p className="text-gray-600 mb-4 text-sm">
            Create new event & send notifications later.
          </p>

          <button
            className="bg-green-600 text-white w-full py-2 rounded-md mt-2"
            onClick={() => setShowEventModal(false)}
          >
            Publish
          </button>
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
        <h3 className="text-xl font-semibold mb-4">{title}</h3>

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
