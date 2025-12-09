// src/pages/Visited.tsx
import React, { useState } from "react";

type Visit = {
  id: number;
  name: string;
  place: string;
  date: string;
  time: string;
  purpose: string;
};

// Dummy data (with ID field added)
const dummyVisits: Visit[] = [
  { id: 1, name: "Ravi Kumar", place: "Hyderabad, India", date: "2025-10-31", time: "11:30 AM", purpose: "NRI Welfare Initiatives Discussion" },
  { id: 2, name: "Lakshmi Reddy", place: "London, UK", date: "2025-10-31", time: "3:00 PM", purpose: "Investment Opportunities in AP" },
  { id: 3, name: "John Davis", place: "New York, USA", date: "2025-10-30", time: "2:15 PM", purpose: "Educational Reforms Support" },
  { id: 4, name: "Aarav Sharma", place: "Dubai, UAE", date: "2025-11-11", time: "5:45 PM", purpose: "Overseas NRI Coordination" },
  { id: 5, name: "Priya Patel", place: "Singapore", date: "2025-10-29", time: "10:30 AM", purpose: "Women Empowerment Project Collaboration" },
];

export default function Visited() {
  const [visits, setVisits] = useState<Visit[]>(dummyVisits);
  const [view, setView] = useState<"none" | "all" | "today">("none");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const pageSize = 5;

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((v) => v.date === today);
  const visitsToShow = view === "today" ? todayVisits : visits;

  const start = (page - 1) * pageSize;
  const paginated = visitsToShow.slice(start, start + pageSize);
  const totalPages = Math.ceil(visitsToShow.length / pageSize);

  const handleViewChange = (v: "none" | "all" | "today") => {
    setView(v);
    setPage(1);
  };

  /** ==========================
   *  ADD / EDIT SAVE HANDLER
   *  ========================== */
  const handleSaveVisit = (visit: Visit) => {
    if (editingVisit) {
      // Update
      setVisits(visits.map((v) => (v.id === visit.id ? visit : v)));
    } else {
      // New add
      setVisits([...visits, { ...visit, id: Date.now() }]);
    }
    setModalOpen(false);
    setEditingVisit(null);
  };

  /** Delete */
  const handleDelete = (id: number) => {
    if (!window.confirm("Are you sure you want to delete this visit?")) return;
    setVisits(visits.filter((v) => v.id !== id));
  };

  /** Form component inside modal */
  const VisitForm = ({ visit }: { visit: Visit | null }) => {
    const [form, setForm] = useState<Visit>(
      visit || {
        id: 0,
        name: "",
        place: "",
        date: "",
        time: "",
        purpose: "",
      }
    );

    const update = (key: keyof Visit, value: string) => {
      setForm({ ...form, [key]: value });
    };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
            {visit ? "Edit Visit" : "Add New Visit"}
          </h2>

          <div className="space-y-3">
            <input className="border w-full p-2 rounded" placeholder="Name"
              value={form.name} onChange={(e) => update("name", e.target.value)} />
            <input className="border w-full p-2 rounded" placeholder="Place"
              value={form.place} onChange={(e) => update("place", e.target.value)} />

            <input type="date" className="border w-full p-2 rounded"
              value={form.date} onChange={(e) => update("date", e.target.value)} />

            <input type="text" className="border w-full p-2 rounded" placeholder="Time (e.g., 2:15 PM)"
              value={form.time} onChange={(e) => update("time", e.target.value)} />

            <textarea className="border w-full p-2 rounded" rows={3} placeholder="Purpose"
              value={form.purpose} onChange={(e) => update("purpose", e.target.value)} />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              onClick={() => { setModalOpen(false); setEditingVisit(null); }}>
              Cancel
            </button>

            <button
              className="px-4 py-2 rounded bg-[#1368d6] text-white hover:bg-green-600"
              onClick={() => handleSaveVisit(form)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1368d6]">NRI Visits with Hon’ble CM</h1>
          <p className="text-gray-600 mb-4">Overview of all NRI visitor interactions</p>
        </div>

        <button
          onClick={() => { setModalOpen(true); setEditingVisit(null); }}
          className="bg-[#1368d6] text-white px-5 py-2 rounded-lg hover:bg-green-600 shadow-md"
        >
          + Add Visit
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

        {/* Total */}
        <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between max-w-xs w-full mx-auto">
          <div>
            <div className="text-gray-600 text-lg font-bold text-center">Total Visits</div>
            <div className="text-3xl font-semibold mt-2 text-green-600 text-center">{visits.length}</div>
          </div>

          <button
            onClick={() => handleViewChange(view === "all" ? "none" : "all")}
            className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-base hover:bg-green-600 transition-all duration-200 w-fit self-center"
          >
            {view === "all" ? "Hide" : "View More"}
          </button>
        </div>

        {/* Today */}
        <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-4 flex flex-col justify-between max-w-xs w-full mx-auto">
          <div>
            <div className="text-gray-600 text-lg font-bold text-center">Today’s Visits</div>
            <div className="text-3xl font-semibold mt-2 text-green-600 text-center">{todayVisits.length}</div>
          </div>

          <button
            onClick={() => handleViewChange(view === "today" ? "none" : "today")}
            className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-base hover:bg-green-600 transition-all duration-200 w-fit self-center"
          >
            {view === "today" ? "Hide" : "View More"}
          </button>
        </div>
      </div>

      {/* Table */}
      {view !== "none" && (
        <div className="bg-white border shadow-sm rounded-xl p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-[#1368d6]">
              {view === "all" ? "All Visit Details" : "Today’s Visit Details"}
            </h2>
            <button onClick={() => handleViewChange("none")} className="bg-[#1368d6] text-white px-4 py-1.5 rounded">
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border rounded">
              <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Place</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Time</th>
                  <th className="p-3 text-left">Purpose</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((v, i) => (
                  <tr key={v.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="p-3">{v.name}</td>
                    <td className="p-3">{v.place}</td>
                    <td className="p-3 whitespace-nowrap text-sm">{v.date}</td>
                    <td className="p-3">{v.time}</td>
                    <td className="p-3">{v.purpose}</td>
                    <td className="p-3 flex gap-2">
                      <button
                        className="px-3 py-1 text-sm text-blue-600 hover:underline"
                        onClick={() => { setEditingVisit(v); setModalOpen(true); }}
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 text-sm text-red-600 hover:underline"
                        onClick={() => handleDelete(v.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between mt-4 text-sm text-gray-700">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))}
                  className="px-4 py-1 border rounded hover:bg-blue-50">
                  Previous
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))}
                  className="px-4 py-1 border rounded hover:bg-blue-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && <VisitForm visit={editingVisit} />}
    </div>
  );
}
