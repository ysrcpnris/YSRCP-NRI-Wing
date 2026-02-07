import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/* ---------------- TYPES ---------------- */
type AssistanceItem = {
  id: number;
  applicant_name: string;
  service_type: string;
  service_category: string;
  service_option: string;
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
  const [selected, setSelected] =
    useState<"total" | "pending" | "resolved" | null>(null);

  const [loading, setLoading] = useState(false);

  /* -------- Modals -------- */
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<AssistanceItem | null>(null);
  const [descriptionText, setDescriptionText] = useState("");

  const [assignedTo, setAssignedTo] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [comments, setComments] = useState("");

  /* ---------------- FETCH DATA ---------------- */
  const fetchRequests = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("service_requests")
      .select(
        `
        id,
        applicant_name,
        service_type,
        service_category,
        service_option,
        current_location,
        description,
        status,
        assigned_to,
        action_taken,
        admin_comments,
        created_at
      `
      )
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

    const { error } = await supabase
      .from("service_requests")
      .update({
        status: "resolved",
        assigned_to: assignedTo,
        action_taken: actionTaken,
        admin_comments: comments,
      })
      .eq("id", selectedRequest.id);

    if (!error) {
      fetchRequests();
      setAllocateModalOpen(false);
      setSelectedRequest(null);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6">
      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#1368d6] mb-1">
        Assistance Requests Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Allocate and resolve NRI service requests efficiently.
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
              className="text-sm px-3 py-1 border rounded"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-lg text-sm">
              <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                <tr>
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Service</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Option</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Action</th>
                </tr>
              </thead>

              <tbody>
                {tableData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-blue-50">
                    <td className="px-3 py-2">{item.applicant_name}</td>
                    <td className="px-3 py-2">{item.service_type}</td>
                    <td className="px-3 py-2">{item.service_category}</td>
                    <td className="px-3 py-2">{item.service_option}</td>
                    <td className="px-3 py-2">{item.current_location}</td>
                    <td className="px-3 py-2">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className={`px-3 py-2 font-medium ${
                        item.status === "pending"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.status}
                    </td>

                    {/* DESCRIPTION VIEW */}
                    <td className="px-3 py-2">
                      <button
                        className="text-blue-600 underline"
                        onClick={() => {
                          setDescriptionText(item.description);
                          setDescriptionModalOpen(true);
                        }}
                      >
                        View
                      </button>
                    </td>

                    {/* ACTION */}
                    <td className="px-3 py-2">
                      {item.status === "pending" ? (
                        <button
                          onClick={() => openAllocationForm(item)}
                          className="bg-[#1368d6] text-white px-3 py-1 rounded"
                        >
                          Resolve
                        </button>
                      ) : (
                        <span className="text-green-600 text-xs">
                          {item.assigned_to}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {loading && (
              <p className="text-center mt-4 text-gray-500">Loading...</p>
            )}
          </div>
        </div>
      )}

      {/* DESCRIPTION MODAL */}
      {descriptionModalOpen && (
        <Modal title="Request Description" onClose={() => setDescriptionModalOpen(false)}>
          <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-5">
            <p className="text-gray-800 whitespace-pre-wrap leading-7 text-base font-medium">{descriptionText}</p>
          </div>
        </Modal>
      )}

      {/* ALLOCATION MODAL */}
      {allocateModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-[#1368d6]">{`Resolve – ${selectedRequest.applicant_name}`}</h3>
              <button onClick={() => setAllocateModalOpen(false)} className="text-xl font-bold">×</button>
            </div>
            <select
              className="w-full border p-2 rounded mb-3"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Assign Team</option>
              {(TeamsByLocation[selectedRequest.current_location] || ["General Support Team"]).map(
                (t) => (
                  <option key={t}>{t}</option>
                )
              )}
            </select>

            <input
              className="w-full border p-2 rounded mb-3"
              placeholder="Action Taken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />

            <textarea
              className="w-full border p-2 rounded mb-4"
              rows={3}
              placeholder="Admin Comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => setAllocateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#1368d6] text-white rounded"
                onClick={handleResolve}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- REUSABLE MODAL ---------------- */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl p-7 shadow-2xl border border-gray-200 transform transition-all animate-slideUp max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h3 className="text-xl font-bold bg-gradient-to-r from-[#1368d6] to-[#00a86b] bg-clip-text text-transparent">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors duration-200"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CARD ---------------- */
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

