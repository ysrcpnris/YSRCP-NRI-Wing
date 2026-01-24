// src/pages/Visited.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* =======================
   TYPES
======================= */
type Visit = {
  id: string;
  visitor_name: string;
  email: string;
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
  const [purposesModalOpen, setPurposesModalOpen] = useState(false);
  const [selectedPersonVisits, setSelectedPersonVisits] = useState<Visit[]>([]);
  const [editingPurposesEmail, setEditingPurposesEmail] = useState<string | null>(null);
  const [deletingPurposesEmail, setDeletingPurposesEmail] = useState<string | null>(null);

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

    if (!error) setVisits(data || []);
    else console.error(error);

    setLoading(false);
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  /* =======================
     VISIT COUNT (EMAIL)
  ======================= */
  const visitCountByEmail = visits.reduce<Record<string, number>>(
    (acc, visit) => {
      if (!visit.email) return acc;
      acc[visit.email] = (acc[visit.email] || 0) + 1;
      return acc;
    },
    {}
  );

  /* =======================
     GROUP VISITS BY EMAIL
  ======================= */
  const groupedByEmail = visits.reduce<Record<string, Visit[]>>((acc, visit) => {
    if (!visit.email) return acc;
    if (!acc[visit.email]) acc[visit.email] = [];
    acc[visit.email].push(visit);
    return acc;
  }, {});

  const uniquePersons = Object.entries(groupedByEmail).map(([email, visitsForPerson]) => {
    const latestVisit = visitsForPerson[0]; // First one (ordered by desc date)
    const purposes = visitsForPerson.map(v => v.purpose).filter(Boolean);
    return {
      email,
      visitor_name: latestVisit.visitor_name,
      place: latestVisit.place,
      visit_date: latestVisit.visit_date,
      visit_time: latestVisit.visit_time,
      count: visitsForPerson.length,
      purposes,
      allVisits: visitsForPerson,
    };
  });

  /* =======================
     DERIVED DATA
  ======================= */
  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter(v => v.visit_date === today);
  const todayPersons = Object.entries(groupedByEmail).reduce<typeof uniquePersons>((acc, [email, visitsForPerson]) => {
    if (visitsForPerson.some(v => v.visit_date === today)) {
      const latestVisit = visitsForPerson[0];
      const purposes = visitsForPerson.map(v => v.purpose).filter(Boolean);
      acc.push({
        email,
        visitor_name: latestVisit.visitor_name,
        place: latestVisit.place,
        visit_date: latestVisit.visit_date,
        visit_time: latestVisit.visit_time,
        count: visitsForPerson.length,
        purposes,
        allVisits: visitsForPerson,
      });
    }
    return acc;
  }, []);

  const personsToShow = view === "today" ? todayPersons : uniquePersons;
  const start = (page - 1) * pageSize;
  const paginated = personsToShow.slice(start, start + pageSize);
  const totalPages = Math.ceil(personsToShow.length / pageSize);

  const handleViewChange = (v: "none" | "all" | "today") => {
    setView(v);
    setPage(1);
  };

  /* =======================
     DELETE ALL VISITS FOR EMAIL
  ======================= */
  const handleDeleteAll = async (email: string) => {
    setDeletingPurposesEmail(email);
  };

  /* =======================
     SAVE PURPOSES
  ======================= */
  const handleSavePurposes = async (email: string, newPurposes: string[]) => {
    // Get all visits for this email
    const visitsForEmail = groupedByEmail[email] || [];
    
    // Update each visit's purpose (we'll update the first one with combined purposes)
    if (visitsForEmail.length > 0) {
      // Clear all purposes first
      for (const visit of visitsForEmail) {
        await supabase.from("nri_visits").update({ purpose: "" }).eq("id", visit.id);
      }
      
      // Update the first visit with all purposes
      const combinedPurpose = newPurposes.join(" | ");
      await supabase.from("nri_visits").update({ purpose: combinedPurpose }).eq("id", visitsForEmail[0].id);
    }
    
    setEditingPurposesEmail(null);
    fetchVisits();
  };

  /* =======================
     SAVE
  ======================= */
  const handleSaveVisit = async (form: Visit) => {
    if (editingVisit) {
      await supabase.from("nri_visits").update(form).eq("id", editingVisit.id);
    } else {
      // Exclude empty id when inserting (let Supabase generate it)
      const { id, ...insertData } = form;
      await supabase.from("nri_visits").insert(insertData);
    }

    setModalOpen(false);
    setEditingVisit(null);
    fetchVisits();
  };

  /* =======================
     FORM MODAL
  ======================= */
  const VisitForm = ({ visit }: { visit: Visit | null }) => {
    const [form, setForm] = useState<Visit>(
      visit || {
        id: "",
        visitor_name: "",
        email: "",
        place: "",
        visit_date: "",
        visit_time: "",
        purpose: "",
      }
    );

    const update = (k: keyof Visit, v: string) =>
      setForm({ ...form, [k]: v });

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-lg rounded-xl p-6">
          <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
            {visit ? "Edit Visit" : "Add Visit"}
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
              placeholder="Email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
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
              className="px-4 py-2 bg-gray-300 rounded"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-[#1368d6] text-white rounded"
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1368d6]">
            NRI Visits with Hon’ble CM
          </h1>
          <p className="text-gray-600">Overview of all NRI visits</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-[#1368d6] text-white px-5 py-2 rounded-lg"
        >
          + Add Visit
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
        <StatCard title="Total Unique Visitors" value={uniquePersons.length} onClick={() => handleViewChange(view === "all" ? "none" : "all")} active={view === "all"} />
        <StatCard title="Today's Visitors" value={todayPersons.length} onClick={() => handleViewChange(view === "today" ? "none" : "today")} active={view === "today"} />
      </div>

      {/* TABLE */}
      {view !== "none" && (
        <div className="bg-white border rounded-xl p-6">
          <table className="w-full border">
            <thead className="bg-[#1368d6] text-white">
              <tr>
                <th className="p-3 text-center">Name</th>
                <th className="p-3 text-center">Email</th>
                <th className="p-3 text-center">Visit Count</th>
                <th className="p-3 text-center">Place</th>
                <th className="p-3 text-center">Latest Date</th>
                <th className="p-3 text-center">Latest Time</th>
                <th className="p-3 text-center">Purposes</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(person => (
                <tr key={person.email}>
                  <td className="p-3 text-center">{person.visitor_name}</td>
                  <td className="p-3 text-center">{person.email}</td>
                  <td className="p-3 text-center font-semibold text-green-600">
                    {person.count}
                  </td>
                  <td className="p-3 text-center">{person.place}</td>
                  <td className="p-3 text-center">{person.visit_date}</td>
                  <td className="p-3 text-center">{person.visit_time}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedPersonVisits(person.allVisits);
                        setPurposesModalOpen(true);
                      }}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      View ({person.purposes.length})
                    </button>
                  </td>
                  <td className="p-3 text-center flex gap-2 justify-center">
                    <button onClick={() => { setEditingPurposesEmail(person.email); }} className="text-green-600">Edit</button>
                    <button onClick={() => handleDeleteAll(person.email)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && <VisitForm visit={editingVisit} />}
      {purposesModalOpen && <PurposesModal visits={selectedPersonVisits} onClose={() => setPurposesModalOpen(false)} />}
      {editingPurposesEmail && <EditPurposesModal email={editingPurposesEmail} allVisits={groupedByEmail[editingPurposesEmail] || []} onSaved={() => fetchVisits()} onClose={() => setEditingPurposesEmail(null)} />}
      {deletingPurposesEmail && <DeletePurposesModal email={deletingPurposesEmail} allVisits={groupedByEmail[deletingPurposesEmail] || []} onDeleted={() => fetchVisits()} onClose={() => setDeletingPurposesEmail(null)} />}
    </div>
  );
}

/* =======================
   EDIT PURPOSES MODAL
======================= */
function EditPurposesModal({ email, allVisits, onSaved, onClose }: { email: string; allVisits: Visit[]; onSaved: () => void; onClose: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const handleEditStart = (visitId: string, currentPurpose: string) => {
    setEditingId(visitId);
    setEditingValue(currentPurpose);
  };

  const handleSaveEdit = async (visitId: string) => {
    await supabase.from("nri_visits").update({ purpose: editingValue }).eq("id", visitId);
    setEditingId(null);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
          Edit All Purposes for {email}
        </h2>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          {allVisits.length > 0 ? (
            allVisits.map((visit) => (
              <div key={visit.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded border">
                <div className="flex-1">
                  {editingId === visit.id ? (
                    <textarea
                      className="border w-full p-2 rounded mb-2"
                      rows={2}
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                    />
                  ) : (
                    <p className="font-semibold mb-1">{visit.purpose || "(No purpose)"}</p>
                  )}
                  <p className="text-sm text-gray-500">{visit.visit_date} at {visit.visit_time}</p>
                </div>
                <div className="flex gap-1 flex-col">
                  {editingId === visit.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(visit.id)}
                        className="text-green-600 font-semibold hover:text-green-800 px-2 py-1 bg-green-50 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-gray-600 font-semibold hover:text-gray-800 px-2 py-1 bg-gray-200 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleEditStart(visit.id, visit.purpose)}
                      className="text-blue-600 font-semibold hover:text-blue-800 px-2 py-1 bg-blue-50 rounded text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No purposes recorded</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-[#1368d6] text-white rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   DELETE PURPOSES MODAL
======================= */
function DeletePurposesModal({ email, allVisits, onDeleted, onClose }: { email: string; allVisits: Visit[]; onDeleted: () => void; onClose: () => void }) {
  const handleDeletePurpose = async (visitId: string) => {
    if (!window.confirm("Delete this purpose and its visit record?")) return;
    await supabase.from("nri_visits").delete().eq("id", visitId);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-xl p-6">
        <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
          Delete All Purposes for {email}
        </h2>

        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          {allVisits.length > 0 ? (
            allVisits.map((visit) => (
              <div key={visit.id} className="flex gap-2 items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex-1">
                  <p className="font-semibold">{visit.purpose || "(No purpose)"}</p>
                  <p className="text-sm text-gray-500">{visit.visit_date} at {visit.visit_time}</p>
                </div>
                <button
                  onClick={() => handleDeletePurpose(visit.id)}
                  className="text-red-600 font-semibold hover:text-red-800 px-3 py-1 bg-red-50 rounded text-sm whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No purposes recorded</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 bg-[#1368d6] text-white rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =======================
   PURPOSES MODAL
======================= */
function PurposesModal({ visits, onClose }: { visits: Visit[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl p-6">
        <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
          All Visits ({visits.length})
        </h2>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {visits.length > 0 ? (
            visits.map((visit, idx) => (
              <div key={idx} className="flex gap-4 items-start p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-l-4 border-[#1368d6]">
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{visit.purpose || "(No purpose)"}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      📅 <strong>{visit.visit_date}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      🕐 <strong>{visit.visit_time}</strong>
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No visits recorded</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-[#1368d6] text-white rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
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
     <div className="bg-white border rounded-xl p-6 text-center shadow hover:shadow-md max-w-60 mx-px">
      <div className="text-lg font-bold">{title}</div>
      <div className="text-3xl text-green-600">{value}</div>
      <button
        onClick={onClick}
        className="mt-3 bg-[#1368d6] text-white px-4 py-2 rounded"
      >
        {active ? "Hide" : "View More"}
      </button>
    </div>
  );
}
