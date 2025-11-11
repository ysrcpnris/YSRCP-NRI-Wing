import React, { useState } from "react";

type Suggestion = {
  id: number;
  name: string;
  country: string;
  date: string;
  suggestion: string;
};

const dummySuggestions: Suggestion[] = [
  {
    id: 1,
    name: "Ravi Teja",
    country: "UAE",
    date: "2025-10-21",
    suggestion: "Introduce more skill development programs for NRIs.",
  },
  {
    id: 2,
    name: "Samantha Raj",
    country: "USA",
    date: "2025-10-22",
    suggestion:
      "Need a digital helpdesk to address quick assistance requests for overseas citizens.",
  },
  {
    id: 3,
    name: "Abdul Rahman",
    country: "Saudi Arabia",
    date: "2025-10-24",
    suggestion: "Organize cultural events to strengthen NRI connections.",
  },
  {
    id: 4,
    name: "Priyanka Das",
    country: "Singapore",
    date: "2025-10-25",
    suggestion: "Provide simplified online registration for NRI members.",
  },
];

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
    <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between max-w-xs w-full mx-auto">
      <div>
        <div className="text-gray-600 text-lg font-bold text-center">{title}</div>
        <div className={`text-3xl font-semibold mt-2 ${color} text-center`}>
          {value.toLocaleString()}
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-4 bg-[#1368d6] text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200 w-fit self-center"
      >
        View More
      </button>
    </div>
  );
}

export default function Suggestions() {
  const [showTable, setShowTable] = useState(false);
  const totalSuggestions = dummySuggestions.length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#1368d6] mb-2">
        Suggestions Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Overview of valuable suggestions received from NRIs across the globe.
      </p>

      {/* Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Suggestions"
          value={totalSuggestions}
          color="text-green-600"
          onClick={() => setShowTable(true)}
        />
      </div>

      {/* Suggestions Table */}
      {showTable && (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#1368d6]">
              All Suggestions
            </h2>
            <button
              onClick={() => setShowTable(false)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-blue-50 text-[#1368d6]"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-[#1368d6] text-white">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    Name
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    Country
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium">
                    Suggestion
                  </th>
                </tr>
              </thead>
              <tbody>
                {dummySuggestions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-blue-50 transition"
                  >
                    <td className="px-4 py-2 text-sm">{s.name}</td>
                    <td className="px-4 py-2 text-sm">{s.country}</td>
                    <td className="px-4 py-2 text-sm">{s.date}</td>
                    <td className="px-4 py-2 text-sm">{s.suggestion}</td>
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
