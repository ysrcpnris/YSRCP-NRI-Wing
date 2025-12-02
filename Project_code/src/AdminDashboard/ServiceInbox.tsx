// src/pages/ServiceInbox.tsx
import React, { useState } from "react";

export default function ServiceInbox() {
  const [requests, setRequests] = useState([
    {
      id: "REQ-202401",
      name: "Shiva Reddy",
      type: "STUDENT SUPPORT",
      date: "Jan 11, 2025",
      status: "Pending",
    },
    {
      id: "REQ-202402",
      name: "Sarathi Nair",
      type: "STUDENT SUPPORT",
      date: "May 12, 2025",
      status: "Pending",
    },
    {
      id: "REQ-202403",
      name: "Maher Sathik",
      type: "STUDENT SUPPORT",
      date: "Aug 13, 2025",
      status: "Pending",
    },
    {
      id: "REQ-202404",
      name: "Sharmas Vali",
      type: "STUDENT SUPPORT",
      date: "March 12, 2025",
      status: "Pending",
    },
    {
      id: "REQ-202405",
      name: "Suparna Das",
      type: "STUDENT SUPPORT",
      date: "June 12, 2025",
      status: "Pending",
    },
  ]);

  const updateStatus = (reqId: string, newStatus: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
    );
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6 text-center sm:text-left">
        SERVICE REQUESTS
      </h1>

      <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
        <h2 className="text-xl font-semibold mb-5">
          Service Request Inbox
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700 border-b">
                <th className="py-3 px-4 text-left">REQUEST ID</th>
                <th className="py-3 px-4 text-left">USER NAME</th>
                <th className="py-3 px-4 text-left">SERVICE TYPE</th>
                <th className="py-3 px-4 text-left">DATE</th>
                <th className="py-3 px-4 text-left">STATUS</th>
                <th className="py-3 px-4 text-left">ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {requests.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b ${
                    i % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50 transition`}
                >
                  <td className="py-3 px-4">{r.id}</td>

                  <td className="py-3 px-4 font-semibold text-gray-900">
                    {r.name}
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-semibold">
                      {r.type}
                    </span>
                  </td>

                  <td className="py-3 px-4">{r.date}</td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-4">
                    <select
                      value={r.status}
                      onChange={(e) =>
                        updateStatus(r.id, e.target.value)
                      }
                      className={`px-3 py-1 rounded-md border text-sm font-medium ${
                        r.status === "Pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : r.status === "Resolved"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>

                  <td className="py-3 px-4">
                    <button className="text-[#1368d6] font-semibold hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
