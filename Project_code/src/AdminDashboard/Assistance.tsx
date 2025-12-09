import React, { useState } from "react";

type AssistanceItem = {
  id: number;
  name: string;
  requestType: string;
  date: string;
  status: "Pending" | "Resolved";
  description: string;
  location: string;
  assignedTo?: string;
  actionTaken?: string;
  comments?: string;
};

const dummyData: AssistanceItem[] = [
  {
    id: 1,
    name: "Ramesh Kumar",
    requestType: "Medical Help",
    date: "2025-10-15",
    status: "Resolved",
    description: "Requested help for hospital expenses.",
    location: "India",
    assignedTo: "Health Team (Hyd)",
    actionTaken: "Guided to hospital support scheme"
  },
  {
    id: 2,
    name: "Anjali Singh",
    requestType: "Education Support",
    date: "2025-10-17",
    status: "Pending",
    description: "Scholarship request for USA studies.",
    location: "USA"
  },
  {
    id: 3,
    name: "David Thomas",
    requestType: "Legal Aid",
    date: "2025-10-18",
    status: "Pending",
    description: "Passport issue in UAE.",
    location: "UAE"
  },
  {
    id: 4,
    name: "Priya Sharma",
    requestType: "Travel Assistance",
    date: "2025-10-20",
    status: "Pending",
    description: "Ticket booking and visa issues.",
    location: "UK"
  },
  {
    id: 5,
    name: "Mohammed Ali",
    requestType: "Employment Support",
    date: "2025-10-25",
    status: "Resolved",
    description: "Guidance for job placement.",
    location: "Dubai",
    assignedTo: "Employment Team (Dubai)",
    actionTaken: "Helped with company interview placement"
  }
];

// Teams based on location
const TeamsByLocation: Record<string, string[]> = {
  India: ["Health Team (Hyd)", "Education Cell (AP)", "Legal Cell (Vijayawada)"],
  USA: ["NRI Cell – USA", "Education Support – USA", "Legal Advisors – USA"],
  UK: ["NRI Team UK", "Scholarship Dept. UK", "Legal Support UK"],
  UAE: ["Dubai Coordination Team", "Embassy Support UAE"],
  Dubai: ["Employment Team (Dubai)", "Legal Team Dubai"],
};

function StatCard({
  title,
  value,
  color,
  onClick,
}: {
  title: string;
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all p-6 flex flex-col justify-between max-w-xs">
      <div>
        <div className="text-gray-600 text-lg font-bold text-center">{title}</div>
        <div className={`text-3xl font-semibold mt-2 ${color} text-center`}>
          {value.toLocaleString()}
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-all mx-auto"
      >
        View More
      </button>
    </div>
  );
}

export default function Assistance() {
  const [data, setData] = useState<AssistanceItem[]>(dummyData);
  const [selected, setSelected] = useState<"total" | "pending" | "resolved" | null>(null);

  // modal controls
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceItem | null>(null);

  const total = data.length;
  const pending = data.filter((d) => d.status === "Pending").length;
  const resolved = data.filter((d) => d.status === "Resolved").length;

  const tableData =
    selected === "pending"
      ? data.filter((d) => d.status === "Pending")
      : selected === "resolved"
      ? data.filter((d) => d.status === "Resolved")
      : selected === "total"
      ? data
      : [];

  // form fields
  const [assignedTo, setAssignedTo] = useState("");
  const [actionType, setActionType] = useState("");
  const [comments, setComments] = useState("");

  const openAllocationForm = (req: AssistanceItem) => {
    setSelectedRequest(req);
    setAllocateModalOpen(true);
  };

  const handleAllocate = () => {
    if (!selectedRequest) return;

    const updated = data.map((item) =>
      item.id === selectedRequest.id
        ? {
            ...item,
            status: "Resolved",
            assignedTo,
            actionTaken: actionType,
            comments,
          }
        : item
    );

    setData(updated);
    setAllocateModalOpen(false);
    setAssignedTo("");
    setActionType("");
    setComments("");
  };

  return (
    <div className="p-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#1368d6] mb-2">
        Assistance Requests Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Assign, manage, and resolve NRI assistance requests effectively.
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Requests" value={total} color="text-[#1368d6]" onClick={() => setSelected("total")} />
        <StatCard title="Pending Requests" value={pending} color="text-yellow-600" onClick={() => setSelected("pending")} />
        <StatCard title="Resolved Requests" value={resolved} color="text-green-600" onClick={() => setSelected("resolved")} />
      </div>

      {/* Table */}
      {selected && (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#1368d6]">
              {selected === "total" ? "All Assistance Requests" : selected === "pending" ? "Pending Requests" : "Resolved Requests"}
            </h2>

            <button
              onClick={() => setSelected(null)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-blue-50 text-[#1368d6]"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Request Type</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>

              <tbody>
                {tableData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-blue-50">
                    <td className="px-4 py-2">{item.name}</td>
                    <td className="px-4 py-2">{item.requestType}</td>
                    <td className="px-4 py-2">{item.location}</td>
                    <td className="p-3 whitespace-nowrap text-sm">{item.date}</td>

                    <td
                      className={`px-4 py-2 font-medium ${
                        item.status === "Pending" ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {item.status}
                    </td>

                    <td className="px-4 py-2">{item.description}</td>

                    <td className="px-4 py-2">
                      {item.status === "Pending" ? (
                        <button
                          onClick={() => openAllocationForm(item)}
                          className="px-3 py-1 text-sm bg-[#1368d6] text-white rounded hover:bg-green-600"
                        >
                          Resolve / Allocate
                        </button>
                      ) : (
                        <span className="text-green-600 text-sm">Assigned to: {item.assignedTo}</span>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALLOCATION MODAL */}
      {allocateModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6">

            <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
              Resolve Request • {selectedRequest.name}
            </h2>

            {/* FORM */}
            <div className="space-y-4">
              {/* TEAM SELECTION */}
              <div>
                <label className="text-sm font-medium">Assign to Team</label>
                <select
                  className="border w-full p-2 rounded mt-1"
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Select Team</option>
                  {(TeamsByLocation[selectedRequest.location] || ["General Support Team"]).map((team) => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                </select>
              </div>

              {/* ACTION */}
              <div>
                <label className="text-sm font-medium">Action Type</label>
                <select
                  className="border w-full p-2 rounded mt-1"
                  onChange={(e) => setActionType(e.target.value)}
                >
                  <option value="">Select Action</option>
                  <option>Scholarship Guidance</option>
                  <option>Medical Support</option>
                  <option>Travel Assistance</option>
                  <option>Legal Assistance</option>
                  <option>Employment Support</option>
                  <option>Financial Support</option>
                </select>
              </div>

              {/* COMMENTS */}
              <div>
                <label className="text-sm font-medium">Comments / Notes</label>
                <textarea
                  rows={3}
                  className="border w-full p-2 rounded mt-1"
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add details about the action taken..."
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAllocateModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={handleAllocate}
                className="px-4 py-2 rounded bg-[#1368d6] text-white hover:bg-green-600"
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
