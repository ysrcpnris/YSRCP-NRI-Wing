import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/* ---------------- TYPES ---------------- */
// Service request data structure from database
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

/* ---------------- COMPONENT ---------------- */
// Admin dashboard for managing assistance/service requests: allocate teams, track status, resolve tickets
export default function Assistance() {
  // Service request data and filtering state
  const [data, setData] = useState<AssistanceItem[]>([]);
  const [selected, setSelected] =
    useState<"total" | "pending" | "resolved" | null>(null);

  const [loading, setLoading] = useState(false);

  // Support teams (loaded from DB — admins manage them in the Support Teams page)
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  /* -------- Modals -------- */
  // Modal states for allocation form and description viewer
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);

  // Currently selected request and form fields for allocation
  const [selectedRequest, setSelectedRequest] =
    useState<AssistanceItem | null>(null);
  const [descriptionText, setDescriptionText] = useState("");

  // Form fields for resolving requests
  const [assignedTo, setAssignedTo] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [comments, setComments] = useState("");

  /* ---------------- FETCH DATA ---------------- */
  // Fetches all service requests from database, ordered by most recent first
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

  // Fetch active support teams for the Assign Team dropdown
  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("support_teams")
      .select("id, name")
      .eq("is_active", true)
      .order("name", { ascending: true });
    if (!error && data) setTeams(data);
  };

  useEffect(() => {
    fetchRequests();
    fetchTeams();
  }, []);

  /* ---------------- COUNTS ---------------- */
  // Calculate request counts by status
  const total = data.length;
  const pending = data.filter((d) => d.status === "pending").length;
  const resolved = data.filter((d) => d.status === "resolved").length;

  // Filter table data based on selected status
  const tableData =
    selected === "pending"
      ? data.filter((d) => d.status === "pending")
      : selected === "resolved"
      ? data.filter((d) => d.status === "resolved")
      : selected === "total"
      ? data
      : [];

  /* ---------------- HANDLERS ---------------- */
  // Opens allocation form with current request details
  const openAllocationForm = (req: AssistanceItem) => {
    setSelectedRequest(req);
    setAllocateModalOpen(true);
    setAssignedTo(req.assigned_to || "");
    setActionTaken(req.action_taken || "");
    setComments(req.admin_comments || "");
  };

  // Updates request status to resolved with team assignment and comments
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
      {/* HEADER - Page title and description */}
      <h1 className="text-2xl font-bold text-primary-600 mb-1">
        Assistance Requests Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Allocate and resolve NRI service requests efficiently.
      </p>

      {/* STATS CARDS - Total, Pending, and Resolved counts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Requests" value={total} onClick={() => setSelected(selected === "total" ? null : "total")} active={selected === "total"} />
        <StatCard title="Pending Requests" value={pending} onClick={() => setSelected(selected === "pending" ? null : "pending")} active={selected === "pending"} />
        <StatCard title="Resolved Requests" value={resolved} onClick={() => setSelected(selected === "resolved" ? null : "resolved")} active={selected === "resolved"} />
      </div>

      {/* TABLE - Displays requests based on selected status filter */}
      {selected && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold text-primary-600 capitalize">
              {selected} Requests
            </h2>
            {/* Close table view button */}
            <button
              onClick={() => setSelected(null)}
              className="text-sm px-3 py-1 border rounded"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border rounded-lg text-sm">
              {/* Table header with status columns */}
              <thead className="bg-gradient-to-r from-primary-600 to-accent-600 text-white">
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

              {/* Table rows with request details */}
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
                    {/* Status with color coding: yellow for pending, green for resolved */}
                    <td
                      className={`px-3 py-2 font-medium ${
                        item.status === "pending"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {item.status}
                    </td>

                    {/* View request description in modal */}
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

                    {/* Resolve button for pending requests or show assigned team */}
                    <td className="px-3 py-2">
                      {item.status === "pending" ? (
                        <button
                          onClick={() => openAllocationForm(item)}
                          className="bg-primary-600 text-white px-3 py-1 rounded"
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

            {/* Loading indicator */}
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

      {/* ALLOCATION MODAL - Resolve and assign request to team */}
      {allocateModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-primary-600">{`Resolve – ${selectedRequest.applicant_name}`}</h3>
              <button onClick={() => setAllocateModalOpen(false)} className="text-xl font-bold">×</button>
            </div>
            {/* Team assignment dropdown (populated from support_teams table) */}
            <select
              className="w-full border p-2 rounded mb-3"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Assign Team</option>
              {teams.length === 0 ? (
                <option value="General Support Team">General Support Team</option>
              ) : (
                teams.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))
              )}
            </select>
            {teams.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-3">
                No teams configured yet. Add teams in the "Support Teams" page.
              </p>
            )}

            {/* Action taken by team */}
            <input
              className="w-full border p-2 rounded mb-3"
              placeholder="Action Taken"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
            />

            {/* Admin notes and comments */}
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
                className="px-4 py-2 bg-primary-600 text-white rounded"
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
// Generic modal component for displaying content with title and close button
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
          <h3 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">{title}</h3>
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
// Stat card component displaying request count with view/hide toggle button
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
        className="mt-3 bg-primary-600 text-white px-4 py-2 rounded"
      >
        {active ? "Hide" : "View More"}
      </button>
    </div>
  );
}

