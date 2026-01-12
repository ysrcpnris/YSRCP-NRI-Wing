import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

type Suggestion = {
  id: number;
  name: string;
  country: string;
  date: string;
  suggestion: string;
};

const dummySuggestions: Suggestion[] = [];

// live suggestions state (fetched from Supabase)
// we keep the variable name `dummySuggestions` only where UI references it
// but populate `suggestions` and use that in rendering below.
const useFetchSuggestions = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .order("suggestion_date", { ascending: false });

      if (error) {
        console.error("Fetch suggestions error:", error);
        setSuggestions([]);
      } else {
        setSuggestions(
          (data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            country: d.country,
            date: d.suggestion_date,
            suggestion: d.suggestion,
          })) as Suggestion[]
        );
      }

      setLoading(false);
    };

    fetch();
  }, []);

  return { suggestions, loading };
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
  const { suggestions } = useFetchSuggestions();
  const totalSuggestions = suggestions.length;

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
                {suggestions.map((s) => (
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
