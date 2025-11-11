// src/pages/Visited.tsx
import React, { useState } from "react";

type Visit = {
  name: string;
  place: string;
  date: string;
  time: string;
  purpose: string;
};

// Dummy data (expanded)
const dummyVisits: Visit[] = [
  { name: "Ravi Kumar", place: "Hyderabad, India", date: "2025-10-31", time: "11:30 AM", purpose: "NRI Welfare Initiatives Discussion" },
  { name: "Lakshmi Reddy", place: "London, UK", date: "2025-10-31", time: "3:00 PM", purpose: "Investment Opportunities in AP" },
  { name: "John Davis", place: "New York, USA", date: "2025-10-30", time: "2:15 PM", purpose: "Educational Reforms Support" },
  { name: "Aarav Sharma", place: "Dubai, UAE", date: "2025-11-11", time: "5:45 PM", purpose: "Overseas NRI Coordination" },
  { name: "Priya Patel", place: "Singapore", date: "2025-10-29", time: "10:30 AM", purpose: "Women Empowerment Project Collaboration" },
  { name: "Rajesh Gupta", place: "Kuala Lumpur, Malaysia", date: "2025-10-31", time: "4:20 PM", purpose: "IT Infrastructure Proposal" },
  { name: "Anita Verma", place: "Toronto, Canada", date: "2025-11-11", time: "12:45 PM", purpose: "Education & Youth Exchange Program" },
  { name: "Mohammed Ali", place: "Doha, Qatar", date: "2025-10-31", time: "9:10 AM", purpose: "NRI Community Expansion" },
  { name: "Kiran Reddy", place: "Chennai, India", date: "2025-11-12", time: "10:00 AM", purpose: "Business Collaboration" },
  { name: "Neha Sharma", place: "Sydney, Australia", date: "2025-11-12", time: "6:15 PM", purpose: "Healthcare Partnership" },
];

export default function Visited() {
  const [view, setView] = useState<"none" | "all" | "today">("none");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = dummyVisits.filter((v) => v.date === today);
  const visitsToShow = view === "today" ? todayVisits : dummyVisits;

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedVisits = visitsToShow.slice(start, end);
  const totalPages = Math.ceil(visitsToShow.length / pageSize);

  const handleViewChange = (newView: "none" | "all" | "today") => {
    setView(newView);
    setPage(1);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-3">
        NRI Visits with Hon’ble CM Y.S. Jagan Mohan Reddy
      </h1>
      <p className="text-gray-600 mb-6">
        Overview of NRI delegations and individuals who met the Chief Minister
      </p>

      {/* Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
  {/* Total Visits Card */}
  <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between max-w-xs w-full mx-auto">
          <div>
            <div className="text-gray-600 text-lg font-bold text-center">Total Visits</div>
            <div className="text-3xl font-semibold text-green-600 mt-2 text-center">
              {dummyVisits.length}
            </div>
          </div>
          <button
            onClick={() => handleViewChange(view === "all" ? "none" : "all")}
            className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200 w-fit self-center"
          >
            {view === "all" ? "Hide Details" : "View More"}
          </button>
        </div>

  {/* Today's Visits Card */}
  <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between max-w-xs w-full mx-auto">
          <div>
            <div className="text-gray-600 text-lg font-bold text-center">Today’s Visits</div>
            <div className="text-3xl font-semibold text-green-600 mt-2 text-center">
              {todayVisits.length}
            </div>
          </div>
          <button
            onClick={() => handleViewChange(view === "today" ? "none" : "today")}
            className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200 w-fit self-center"
          >
            {view === "today" ? "Hide Details" : "View More"}
          </button>
        </div>
      </div>

      {/* Table Section */}
      {view !== "none" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 transition-all duration-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#1368d6]">
              {view === "today" ? "Today’s Visit Details" : "All Visit Details"}
            </h2>
            <button
              onClick={() => handleViewChange("none")}
              className="px-3 py-1 text-sm rounded-md bg-[#1368d6] text-white hover:bg-green-600 transition"
            >
              Close
            </button>
          </div>

          {visitsToShow.length === 0 ? (
            <div className="text-gray-600 text-center py-10">
              No visits found for today.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Candidate Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Place</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Visited Date</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Time</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedVisits.map((v, i) => (
                      <tr
                        key={i}
                        className={`border-b hover:bg-blue-50 transition ${
                          i % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-800">{v.name}</td>
                        <td className="px-4 py-3 text-gray-800">{v.place}</td>
                        <td className="px-4 py-3 text-gray-800">{v.date}</td>
                        <td className="px-4 py-3 text-gray-800">{v.time}</td>
                        <td className="px-4 py-3 text-gray-800">{v.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-5 text-sm text-gray-700">
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className={`px-4 py-1.5 rounded-md border ${
                        page === 1
                          ? "text-gray-400 border-gray-200 cursor-not-allowed"
                          : "border-[#1368d6] text-[#1368d6] hover:bg-blue-50"
                      }`}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                      className={`px-4 py-1.5 rounded-md border ${
                        page === totalPages
                          ? "text-gray-400 border-gray-200 cursor-not-allowed"
                          : "border-green-600 text-green-600 hover:bg-green-50"
                      }`}
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
    </div>
  );
}
