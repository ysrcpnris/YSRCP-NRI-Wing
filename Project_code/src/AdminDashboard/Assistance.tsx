import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/* ---------------- TYPES ---------------- */
type AssistanceItem = {
  id: number;
  applicant_name: string;
  service_type: string;
  current_location: string;
  description: string;
  created_at: string;
  status: "pending" | "resolved" | "rejected";
  assigned_to?: string;
  action_taken?: string;
  admin_comments?: string;
};

/* ---------------- TEAM MAP ---------------- */
const TeamsByLocation: Record<string, string[]> = {
  India: ["Education Cell AP", "Health Cell AP", "Legal Cell AP"],
  USA: ["NRI USA Education Team", "Legal Advisors USA"],
  UK: ["UK NRI Team", "Scholarship UK"],
  UAE: ["Dubai Coordination Team", "Embassy Support UAE"],
  NewZealand: ["NZ Student Support Team"],
  Italy: ["Europe Legal Cell"],
};

/* ---------------- COMPONENT ---------------- */
export default function Assistance() {
  const [data, setData] = useState<AssistanceItem[]>([]);
  const [selected, setSelected] = useState<"total" | "pending" | "resolved" | null>(null);

  const [loading, setLoading] = useState(false);

  /* -------- Modal State -------- */
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceItem | null>(null);

  const [assignedTo, setAssignedTo] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [comments, setComments] = useState("");

  /* ---------------- FETCH DATA ---------------- */
  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("service_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setData(data as AssistanceItem[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  /* ---------------- COUNTS ---------------- */
  const total = data.length;
  const pending = data.filter((d) => d.status === "pending").length;
  const resolved = data.filter((d) => d.status === "resolved").length;

  const tableData =
    selected === "pending"
      ? data.filter((d) => d.status === "pending")
      : selected === "resolved"
      ? data.filter((d) => d.status === "resolved")
      : selected === "total"
      ? data
      : [];

  /* ---------------- HANDLERS ---------------- */
  const openAllocationForm = (req: AssistanceItem) => {
    setSelectedRequest(req);
    setAllocateModalOpen(true);
    setAssignedTo(req.assigned_to || "");
    setActionTaken(req.action_taken || "");
    setComments(req.admin_comments || "");
  };

  const handleResolve = async () => {
    if (!selectedRequest) return;
    const { data: updated, error } = await supabase
      .from("service_requests")
      .update({
        status: "resolved",
        assigned_to: assignedTo,
        action_taken: actionTaken,
        admin_comments: comments,
      })
      .eq("id", selectedRequest.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update request:", error);
      // minimal user feedback
      alert("Failed to update request: " + error.message);
      return;
    }

    // update local state to reflect the change immediately
    setData((prev) => prev.map((it) => (it.id === updated.id ? (updated as AssistanceItem) : it)));

    setAllocateModalOpen(false);
    setSelectedRequest(null);
    setAssignedTo("");
    setActionTaken("");
    setComments("");
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#1368d6] mb-1">
        Assistance Requests Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Allocate and resolve NRI service requests based on location & service type.
      </p>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Requests" value={total} onClick={() => setSelected("total")} />
        <StatCard title="Pending Requests" value={pending} onClick={() => setSelected("pending")} />
        <StatCard title="Resolved Requests" value={resolved} onClick={() => setSelected("resolved")} />
      </div>

      {/* TABLE */}
      {selected && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1368d6] capitalize">
              {selected} Requests
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="text-sm px-3 py-1 border rounded hover:bg-blue-50"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto relative">
            <table className="min-w-full border rounded-lg">
              <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Service</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {tableData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-blue-50">
                    <td className="px-4 py-2">{item.applicant_name}</td>
                    <td className="px-4 py-2">{item.service_type}</td>
                    <td className="px-4 py-2">{item.current_location}</td>
                    <td className="px-4 py-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className={`px-4 py-2 font-medium ${
                      item.status === "pending" ? "text-yellow-600" : "text-green-600"
                    }`}>
                      {item.status}
                    </td>
                    <td className="px-4 py-2">{item.description}</td>
                    <td className="px-4 py-2">
                      {item.status === "pending" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAllocationForm(item);
                          }}
                          className="bg-[#1368d6] text-white px-3 py-1 rounded hover:bg-green-600 z-10 relative"
                        >
                          Resolve / Allocate
                        </button>
                      ) : (
                        <span className="text-green-600 text-sm">
                          Assigned to: {item.assigned_to}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && <p className="text-center mt-4 text-gray-500">Loading...</p>}
        </div>
      )}

      {/* MODAL */}
      {allocateModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">
            <h3 className="text-xl font-semibold text-[#1368d6] mb-4">
              Resolve Request – {selectedRequest.applicant_name}
            </h3>

            <div className="space-y-4">
              <select
                className="w-full border p-2 rounded"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Assign to Team</option>
                {(TeamsByLocation[selectedRequest.current_location] || ["General Support Team"]).map(
                  (t) => (
                    <option key={t} value={t}>{t}</option>
                  )
                )}
              </select>

              <input
                placeholder="Action Taken"
                className="w-full border p-2 rounded"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
              />

              <textarea
                placeholder="Comments"
                className="w-full border p-2 rounded"
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAllocateModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-[#1368d6] text-white rounded hover:bg-green-600"
              >
                Submit & Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- CARD ---------------- */
function StatCard({ title, value, onClick }: any) {
  return (
    <div className="bg-white border rounded-xl p-6 text-center shadow hover:shadow-md max-w-60 mx-px">
      <h3 className="text-gray-600 text-lg font-bold">{title}</h3>
      <p className="text-3xl font-bold text-green-600 my-3">{value}</p>
      <button
        onClick={onClick}
        className="bg-[#1368d6] text-white px-4 py-2 rounded hover:bg-green-600"
      >
        View More
      </button>
    </div>
  );
}
