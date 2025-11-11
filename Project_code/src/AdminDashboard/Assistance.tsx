import React, { useState } from "react";

type AssistanceItem = {
  id: number;
  name: string;
  requestType: string;
  date: string;
  status: "Pending" | "Resolved";
  description: string;
};

const dummyData: AssistanceItem[] = [
  {
    id: 1,
    name: "Ramesh Kumar",
    requestType: "Medical Help",
    date: "2025-10-15",
    status: "Resolved",
    description: "Requested help for hospital expenses in Hyderabad.",
  },
  {
    id: 2,
    name: "Anjali Singh",
    requestType: "Education Support",
    date: "2025-10-17",
    status: "Pending",
    description: "Scholarship request for child studying in the USA.",
  },
  {
    id: 3,
    name: "David Thomas",
    requestType: "Legal Aid",
    date: "2025-10-18",
    status: "Resolved",
    description: "Assistance in a passport-related issue in UAE.",
  },
  {
    id: 4,
    name: "Priya Sharma",
    requestType: "Travel Assistance",
    date: "2025-10-20",
    status: "Pending",
    description: "Requested help for ticket booking and visa issues.",
  },
  {
    id: 5,
    name: "Mohammed Ali",
    requestType: "Employment Support",
    date: "2025-10-25",
    status: "Resolved",
    description: "Got job placement support via YSRCP NRI team.",
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
    <div
      className={`rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between max-w-xs w-full mx-auto`}
    >
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

export default function Assistance() {
  const [selected, setSelected] = useState<
    "total" | "pending" | "resolved" | null
  >(null);

  const total = dummyData.length;
  const pending = dummyData.filter((d) => d.status === "Pending").length;
  const resolved = dummyData.filter((d) => d.status === "Resolved").length;

  const tableData =
    selected === "pending"
      ? dummyData.filter((d) => d.status === "Pending")
      : selected === "resolved"
      ? dummyData.filter((d) => d.status === "Resolved")
      : selected === "total"
      ? dummyData
      : [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#1368d6] mb-2">
        Assistance Requests Overview
      </h1>
      <p className="text-gray-500 mb-6">
        Overview of service assistance requests received from NRIs.
      </p>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Requests"
          value={total}
          color="text-[#1368d6]"
          onClick={() => setSelected("total")}
        />
        <StatCard
          title="Pending Requests"
          value={pending}
          color="text-yellow-600"
          onClick={() => setSelected("pending")}
        />
        <StatCard
          title="Resolved Requests"
          value={resolved}
          color="text-green-600"
          onClick={() => setSelected("resolved")}
        />
      </div>

      {/* Table */}
      {selected && (
        <div className="bg-white border rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[#1368d6]">
              {selected === "total"
                ? "All Assistance Requests"
                : selected === "pending"
                ? "Pending Assistance Requests"
                : "Resolved Assistance Requests"}
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-blue-50 text-[#1368d6]"
            >
              Close
            </button>
          </div>

          {tableData.length === 0 ? (
            <p className="text-gray-500 text-center py-6">
              No data available.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 rounded-lg">
                <thead className="bg-[#0a64d9] text-white">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium">
                      Candidate Name
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium">
                      Request Type
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-blue-50 transition"
                    >
                      <td className="px-4 py-2 text-sm">{item.name}</td>
                      <td className="px-4 py-2 text-sm">
                        {item.requestType}
                      </td>
                      <td className="px-4 py-2 text-sm">{item.date}</td>
                      <td
                        className={`px-4 py-2 text-sm font-medium ${
                          item.status === "Pending"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {item.status}
                      </td>
                      <td className="px-4 py-2 text-sm">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
