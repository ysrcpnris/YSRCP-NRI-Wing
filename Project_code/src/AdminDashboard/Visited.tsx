// src/pages/Visited.tsx
import React, { useState } from "react";

type Visit = {
  name: string;
  place: string;
  date: string;
  time: string;
  purpose: string;
};

// Dummy data for now
const dummyVisits: Visit[] = [
  {
    name: "Ravi Kumar",
    place: "Hyderabad, India",
    date: "2025-10-10",
    time: "11:30 AM",
    purpose: "NRI Welfare Initiatives Discussion",
  },
  {
    name: "Lakshmi Reddy",
    place: "London, UK",
    date: "2025-09-22",
    time: "3:00 PM",
    purpose: "Investment Opportunities in AP",
  },
  {
    name: "John Davis",
    place: "New York, USA",
    date: "2025-09-05",
    time: "2:15 PM",
    purpose: "Educational Reforms Support",
  },
  {
    name: "Aarav Sharma",
    place: "Dubai, UAE",
    date: "2025-08-18",
    time: "5:45 PM",
    purpose: "Overseas NRI Coordination",
  },
  {
    name: "Priya Patel",
    place: "Singapore",
    date: "2025-08-02",
    time: "10:30 AM",
    purpose: "Women Empowerment Project Collaboration",
  },
];

export default function Visited() {
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-3">
        NRI Visits with Hon’ble CM Y.S. Jagan Mohan Reddy
      </h1>
      <p className="text-gray-600 mb-6">
        Overview of NRI delegations and individuals who met the Chief Minister
      </p>

      {/* Card Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between">
          <div>
            <div className="text-gray-600 text-base font-medium">
              Total Visits
            </div>
            <div className="text-4xl font-bold text-green-600 mt-2">
              {dummyVisits.length}
            </div>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="mt-4 bg-[#1368d6] text-white px-5 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200"
          >
            {showTable ? "Hide Details" : "View More"}
          </button>
        </div>
      </div>

      {/* Table Section */}
      {showTable && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 transition-all duration-200">
          <h2 className="text-xl font-semibold text-[#1368d6] mb-4">
            Visit Details
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-blue-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Candidate Name
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Place
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Visited Date
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Time
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody>
                {dummyVisits.map((v, i) => (
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
        </div>
      )}
    </div>
  );
}
