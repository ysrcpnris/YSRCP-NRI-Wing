// src/pages/Visited.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* =======================
   TYPES
======================= */
type Visit = {
  id: string;
  visitor_name: string;
  place: string;
  visit_date: string;
  visit_time: string;
  purpose: string;
};

/* =======================
   MAIN COMPONENT
======================= */
export default function Visited() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<"none" | "all" | "today">("none");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);

  const pageSize = 5;

  /* =======================
     FETCH VISITS
  ======================= */
  const fetchVisits = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("nri_visits")
      .select("*")
      .order("visit_date", { ascending: false });

    if (error) {
      console.error("Fetch visits error:", error);
    } else {
      setVisits(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  /* =======================
     DERIVED DATA
  ======================= */
  const today = new Date().toISOString().split("T")[0];

  const todayVisits = visits.filter(
    (v) => v.visit_date === today
  );

  const visitsToShow =
    view === "today" ? todayVisits : visits;

  const start = (page - 1) * pageSize;
  const paginated = visitsToShow.slice(start, start + pageSize);
  const totalPages = Math.ceil(visitsToShow.length / pageSize);

  const handleViewChange = (v: "none" | "all" | "today") => {
    setView(v);
    setPage(1);
  };

  /* =======================
     DELETE VISIT
  ======================= */
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this visit?")) return;

    const { error } = await supabase
      .from("nri_visits")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Delete failed");
      console.error(error);
    } else {
      fetchVisits();
    }
  };

  /* =======================
     SAVE (ADD / EDIT)
  ======================= */
  const handleSaveVisit = async (form: Visit) => {
    if (editingVisit) {
      // UPDATE
      const { error } = await supabase
        .from("nri_visits")
        .update({
          visitor_name: form.visitor_name,
          place: form.place,
          visit_date: form.visit_date,
          visit_time: form.visit_time,
          purpose: form.purpose,
        })
        .eq("id", editingVisit.id);

      if (error) {
        alert("Update failed");
        console.error(error);
        return;
      }
    } else {
      // INSERT
      const { error } = await supabase
        .from("nri_visits")
        .insert({
          visitor_name: form.visitor_name,
          place: form.place,
          visit_date: form.visit_date,
          visit_time: form.visit_time,
          purpose: form.purpose,
        });

      if (error) {
        alert("Insert failed");
        console.error(error);
        return;
      }
    }

    setModalOpen(false);
    setEditingVisit(null);
    fetchVisits();
  };

  /* =======================
     VISIT FORM MODAL
  ======================= */
  const VisitForm = ({ visit }: { visit: Visit | null }) => {
    const [form, setForm] = useState<Visit>(
      visit || {
        id: "",
        visitor_name: "",
        place: "",
        visit_date: "",
        visit_time: "",
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
            <input
              className="border w-full p-2 rounded"
              placeholder="Visitor Name"
              value={form.visitor_name}
              onChange={(e) => update("visitor_name", e.target.value)}
            />

            <input
              className="border w-full p-2 rounded"
              placeholder="Place"
              value={form.place}
              onChange={(e) => update("place", e.target.value)}
            />

            <input
              type="date"
              className="border w-full p-2 rounded"
              value={form.visit_date}
              onChange={(e) => update("visit_date", e.target.value)}
            />

            <input
              type="time"
              className="border w-full p-2 rounded"
              value={form.visit_time}
              onChange={(e) => update("visit_time", e.target.value)}
            />

            <textarea
              className="border w-full p-2 rounded"
              rows={3}
              placeholder="Purpose"
              value={form.purpose}
              onChange={(e) => update("purpose", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              onClick={() => {
                setModalOpen(false);
                setEditingVisit(null);
              }}
            >
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

  /* =======================
     UI
  ======================= */
  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1368d6]">
            NRI Visits with Hon’ble CM
          </h1>
          <p className="text-gray-600 mb-4">
            Overview of all NRI visitor interactions
          </p>
        </div>

        <button
          onClick={() => {
            setModalOpen(true);
            setEditingVisit(null);
          }}
          className="bg-[#1368d6] text-white px-5 py-2 rounded-lg hover:bg-green-600 shadow-md"
        >
          + Add Visit
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard
          title="Total Visits"
          value={visits.length}
          active={view === "all"}
          onClick={() => handleViewChange(view === "all" ? "none" : "all")}
        />

        <StatCard
          title="Today’s Visits"
          value={todayVisits.length}
          active={view === "today"}
          onClick={() => handleViewChange(view === "today" ? "none" : "today")}
        />
      </div>

      {/* TABLE */}
      {view !== "none" && (
        <div className="bg-white border shadow-sm rounded-xl p-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-[#1368d6]">
              {view === "all" ? "All Visit Details" : "Today’s Visit Details"}
            </h2>
            <button
              onClick={() => handleViewChange("none")}
              className="bg-[#1368d6] text-white px-4 py-1.5 rounded"
            >
              Close
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-500 py-6">Loading...</p>
          ) : (
            <>
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
                    <tr key={v.id} className={i % 2 ? "bg-gray-50" : ""}>
                      <td className="p-3">{v.visitor_name}</td>
                      <td className="p-3">{v.place}</td>
                      <td className="p-3">{v.visit_date}</td>
                      <td className="p-3">{v.visit_time}</td>
                      <td className="p-3">{v.purpose}</td>
                      <td className="p-3 flex gap-2">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => {
                            setEditingVisit(v);
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(v.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex justify-between mt-4 text-sm">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      className="px-4 py-1 border rounded"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      className="px-4 py-1 border rounded"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {modalOpen && <VisitForm visit={editingVisit} />}
    </div>
  );
}

/* =======================
   STAT CARD
======================= */
function StatCard({
  title,
  value,
  onClick,
  active,
}: {
  title: string;
  value: number;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <div className="rounded-xl bg-white border p-4 flex flex-col items-center">
      <div className="text-gray-600 text-lg font-bold">{title}</div>
      <div className="text-3xl font-semibold mt-2 text-green-600">
        {value}
      </div>
      <button
        onClick={onClick}
        className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md"
      >
        {active ? "Hide" : "View More"}
      </button>
    </div>
  );
}
