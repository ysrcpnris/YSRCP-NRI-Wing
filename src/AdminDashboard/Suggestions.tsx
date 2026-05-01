import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { countriesData } from "../lib/countryCodes";

// Suggestion submission structure with user info and feedback
type Suggestion = {
  id: number;
  name: string;
  country: string;
  // mobile + email come from the suggestions row directly when the user
  // submitted from a logged-in session (after new_25 migration). Older
  // rows may have null here.
  mobile: string | null;
  email: string | null;
  date: string;
  suggestion: string;
};

// ----------------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------------
// Show '2026-04-28T00:00:00+00:00' as '28 Apr 2026' — readable date only,
// no timezone clutter. Falls back to the raw value if it doesn't parse.
const formatDate = (raw: string | null | undefined): string => {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// Build a wa.me link. If the stored mobile already starts with '+', we
// trust it and use the digits as-is. Otherwise we look up the country's
// dial code from the suggestion's `country` field and prepend it. India
// is the safe default for legacy NRI rows where country wasn't set.
const buildWhatsappLink = (
  mobile: string | null,
  country: string | null
): string | null => {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, "");
  if (!digits) return null;
  if (mobile.trim().startsWith("+")) {
    return `https://wa.me/${digits}`;
  }
  // Already has a country code prefix in the digits (e.g. '91XXXXXXXXXX').
  // Heuristic: if length >= 11, treat the leading digits as country code
  // and don't prepend again.
  if (digits.length >= 11) {
    return `https://wa.me/${digits}`;
  }
  // Otherwise, prepend the dial code derived from the country name.
  const match = countriesData.find(
    (c) => c.name.toLowerCase() === (country || "").toLowerCase()
  );
  const dial = match?.code || "91"; // default India for legacy rows
  return `https://wa.me/${dial}${digits}`;
};

// Placeholder suggestions array (not used, actual data from database)
const dummySuggestions: Suggestion[] = [];

// Custom hook to fetch suggestions from database
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
            mobile: d.mobile_number ?? null,
            email: d.email ?? null,
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

// Display suggestion count with view action button
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
        className="mt-4 bg-primary-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200 w-fit self-center"
      >
        View More
      </button>
    </div>
  );
}

// Modal overlay displaying full suggestion text with metadata
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
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 border-2 border-primary-600">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-3 border-b border-blue-100 gap-3">
          <div className="text-sm text-gray-600 min-w-0">
            <p>
              <span className="font-semibold text-primary-600">
                {suggestion.name || "—"}
              </span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600">{suggestion.country || "—"}</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-gray-600">{formatDate(suggestion.date)}</span>
            </p>
            {(suggestion.mobile || suggestion.email) && (
              <p className="mt-1 text-[12px] text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
                {suggestion.mobile && (() => {
                  const wa = buildWhatsappLink(suggestion.mobile, suggestion.country);
                  return wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline text-emerald-700"
                      title="Open WhatsApp"
                    >
                      💬 {suggestion.mobile}
                    </a>
                  ) : (
                    <span>📞 {suggestion.mobile}</span>
                  );
                })()}
                {suggestion.email && (
                  <a
                    href={`mailto:${suggestion.email}`}
                    className="hover:underline text-primary-700"
                  >
                    ✉️ {suggestion.email}
                  </a>
                )}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-primary-600 text-2xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Suggestion Body */}
        <div className="max-h-[60vh] overflow-y-auto border-2 border-primary-600 rounded-lg p-4 bg-gradient-to-br from-blue-50 to-white">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
            {suggestion.suggestion}
          </p>
        </div>
      </div>
    </div>
  );
}

// Admin interface displaying suggestions overview with expandable table
export default function Suggestions() {
  // Toggle table visibility
  const [showTable, setShowTable] = useState(false);
  // Currently selected suggestion for modal display
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const { suggestions } = useFetchSuggestions();
  const totalSuggestions = suggestions.length;

  // Shorten text to specified length with ellipsis
  const truncateText = (text: string, maxLength: number = 80) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-600 mb-2">
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
            <h2 className="text-lg font-semibold text-primary-600">
              All Suggestions
            </h2>
            <button
              onClick={() => setShowTable(false)}
              className="px-3 py-1.5 text-sm border rounded hover:bg-blue-50 text-primary-600"
            >
              Close
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-primary-600 text-white">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Mobile</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Country</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-blue-50 transition"
                  >
                    <td className="px-4 py-2 text-sm">{s.name || "—"}</td>
                    <td className="px-4 py-2 text-sm whitespace-nowrap">
                      {s.mobile ? (() => {
                        const wa = buildWhatsappLink(s.mobile, s.country);
                        return wa ? (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-700 hover:underline"
                            title="Open WhatsApp"
                          >
                            {s.mobile}
                          </a>
                        ) : (
                          <span>{s.mobile}</span>
                        );
                      })() : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm whitespace-nowrap">
                      {s.email ? (
                        <a
                          href={`mailto:${s.email}`}
                          className="text-primary-600 hover:underline"
                        >
                          {s.email}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">{s.country || "—"}</td>
                    <td className="px-4 py-2 text-sm whitespace-nowrap">{formatDate(s.date)}</td>
                    <td
                      onClick={() => setSelectedSuggestion(s)}
                      className="px-4 py-2 text-sm text-primary-600 cursor-pointer hover:underline font-medium"
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
