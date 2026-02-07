import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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

// Modal Component for displaying full suggestion
function SuggestionModal({
  suggestion,
  onClose,
}: {
  suggestion: Suggestion | null;
  onClose: () => void;
}) {
  if (!suggestion) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 border-2 border-[#1368d6]">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-blue-100">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-[#1368d6]">
              {suggestion.name}
            </span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-gray-600">{suggestion.country}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-gray-600">{suggestion.date}</span>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[#1368d6] text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Suggestion Body */}
        <div className="max-h-[60vh] overflow-y-auto border-2 border-[#1368d6] rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
            {suggestion.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Suggestions() {
  const [showTable, setShowTable] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const { suggestions } = useFetchSuggestions();
  const totalSuggestions = suggestions.length;

  // Truncate text to specified length
  const truncateText = (text: string, maxLength: number = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

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
                    <td
                      onClick={() => setSelectedSuggestion(s)}
                      className="px-4 py-2 text-sm text-[#1368d6] cursor-pointer hover:underline font-medium"
                    >
                      {truncateText(s.suggestion, 80)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for full suggestion */}
      <SuggestionModal
        suggestion={selectedSuggestion}
        onClose={() => setSelectedSuggestion(null)}
      />
    </div>
  );
}
