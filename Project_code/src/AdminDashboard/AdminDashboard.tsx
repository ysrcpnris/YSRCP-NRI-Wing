// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Visited from "./Visited";
import Assistance from "./Assistance";
import Suggestions from "./Suggestions";
import ysrLogo from "../components/nrilogo.png";



import {
  LogOut,
  CalendarDays,
  Home,
  BarChart3,
  Users,
  FolderKanban,
  Newspaper,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ---------- CONFIG ---------- */
const TABLE_NAME = "profiles";
const COUNTRY_TO_CONTINENT: Record<string, string> = {
  India: "Asia",
  UAE: "Asia",
  Singapore: "Asia",
  Malaysia: "Asia",
  Japan: "Asia",
  China: "Asia",
  Philippines: "Asia",
  Thailand: "Asia",
  USA: "North America",
  Canada: "North America",
  Mexico: "North America",
  UK: "Europe",
  Germany: "Europe",
  France: "Europe",
  Italy: "Europe",
  Spain: "Europe",
  Netherlands: "Europe",
  Australia: "Australia",
  NewZealand: "Australia",
  Brazil: "South America",
  Argentina: "South America",
  Chile: "South America",
  Nigeria: "Africa",
  SouthAfrica: "Africa",
  Egypt: "Africa",
  Kenya: "Africa",
};
const CONTINENTS = [
  "Asia",
  "Africa",
  "Europe",
  "North America",
  "South America",
  "Australia",
  "Unknown",
] as const;

type Row = {
  id: string;
  country_of_residence: string | null;
  state_abroad: string | null;
  city_abroad: string | null;
  created_at?: string | null;
};
type Bucket = { name: string; count: number };

/* ---------- Helpers ---------- */
const norm = (v: string | null | undefined) => (v || "").trim();
const toContinent = (country: string) =>
  COUNTRY_TO_CONTINENT[country] || "Unknown";
function group(rows: Row[], key: "continent" | "country" | "state"): Bucket[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const country = norm(r.country_of_residence);
    const state = norm(r.state_abroad);
    const k =
      key === "continent"
        ? toContinent(country)
        : key === "country"
        ? country
        : state;
    if (!k) continue;
    map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .filter((b) => b.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ---------- Sidebar ---------- */
function Sidebar({ onLogout, current, setCurrentPage }: { onLogout: () => void; current: string; setCurrentPage: (p: string) => void }) {
  const Item = ({ icon: Icon, label, page }: any) => (
    <div
      onClick={() => setCurrentPage(page)}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
        current === page
          ? "bg-[#1368d6] text-white shadow-md"
          : "text-gray-700 hover:bg-blue-50 hover:text-[#1368d6]"
      }`}
    >
      <Icon size={18} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
  return (
    <aside className="w-64 p-4 bg-gradient-to-b from-white to-blue-50 border-r border-blue-100 flex flex-col justify-between h-screen">
      <div>
        <div className="flex items-center gap-3 mb-6">
  <img
    src={ysrLogo}
    alt="YSRCP Logo"
    className="w-10 h-10 rounded-full border-2 border-green-600 shadow-sm"
  />
  <div>
    <div className="font-semibold text-[#1368d6]">YSRCP Admin</div>
    <div className="text-xs text-green-600">NRI Wing</div>
  </div>
</div>
        <nav className="space-y-2">
          <Item icon={Home} label="Dashboard" page="dashboard" />
          <Item icon={CalendarDays} label="Visited" page="visited" />
          <Item icon={Newspaper} label="Assistance" page="assistance" />
          <Item icon={Users} label="Suggestions" page="suggestions" />
        </nav>
      </div>

      <div className="mt-6">
        <button
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white px-4 py-2 rounded-lg shadow-md hover:opacity-95 transition-all duration-150"
        >
          <LogOut size={16} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}


/* ---------- Cards ---------- */
function StatCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between">
      <div>
        <div className="text-gray-600 text-base font-medium">{title}</div>
        <div className="text-3xl font-semibold text-[#1368d6] mt-2">
          {value.toLocaleString()}
        </div>
      </div>
      <button
        onClick={onClick}
        className="mt-4 bg-[#1368d6] text-white px-4 py-2 rounded-md text-sm hover:bg-green-600 transition-all duration-200"
      >
        View More
      </button>
    </div>
  );
}

/* ---------- Main ---------- */
export default function AdminDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(
    null
  );
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("id, country_of_residence, state_abroad, city_abroad, created_at");
      if (!active) return;
      if (error) setErr(error.message);
      else setRows((data || []) as Row[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const continentBuckets = useMemo(() => {
    const g = group(rows, "continent");
    const map = new Map(g.map((b) => [b.name, b.count]));
    return CONTINENTS.map((name) => ({ name, count: map.get(name) || 0 })).filter(
      (b) => b.count > 0
    );
  }, [rows]);

  const countryBuckets = useMemo(() => {
    if (!selectedContinent) return [];
    const filtered = rows.filter(
      (r) => toContinent(norm(r.country_of_residence)) === selectedContinent
    );
    return group(filtered, "country");
  }, [rows, selectedContinent]);

  const stateBuckets = useMemo(() => {
    if (!selectedContinent || !selectedCountry) return [];
    const filtered = rows.filter(
      (r) =>
        toContinent(norm(r.country_of_residence)) === selectedContinent &&
        norm(r.country_of_residence) === selectedCountry
    );
    return group(filtered, "state");
  }, [rows, selectedContinent, selectedCountry]);

  const handleLogout = () => {
    localStorage.removeItem("is_admin");
    navigate("/", { replace: true });
  };

  const chartData = selectedContinent
    ? selectedCountry
      ? stateBuckets
      : countryBuckets
    : continentBuckets;

  const COLORS = [
    "#1368d6",
    "#16a34a",
    "#9333ea",
    "#eab308",
    "#ef4444",
    "#0ea5e9",
    "#475569",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex">
       <Sidebar
      onLogout={handleLogout}
      current={currentPage}
      setCurrentPage={setCurrentPage}
    />

      <main className="flex-1 p-8 overflow-y-auto">
        {currentPage === "dashboard" && (
    <>
        <h1 className="text-3xl font-bold text-[#1368d6] mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mb-6">
          Registrations overview by continent, country, and state
        </p>

     <p style={{ fontWeight: "bold" , fontSize: "18px", color:"green" }}>
              Total Registrations: {rows.length.toLocaleString()}</p> 

        {loading ? (
          <div className="text-center text-gray-500 mt-8">Loading...</div>
        ) : err ? (
          <div className="p-4 rounded bg-red-50 border border-red-200 text-red-700">
            {err}
          </div>
        ) : (
          <>
            {/* ------- CONTINENTS / COUNTRIES / STATES ------- */}
            {!selectedContinent && (
              <>
                <h2 className="text-xl font-bold text-[#1368d6] mb-3">
                  <br />
                  Continents
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {continentBuckets.map((b) => (
                    <StatCard
                      key={b.name}
                      title={b.name}
                      value={b.count}
                      onClick={() => setSelectedContinent(b.name)}
                    />
                  ))}
                </div>
              </>
             
            )}
              </>
        )}

            {selectedContinent && !selectedCountry && (
              <>
                <div className="flex justify-between items-center mt-8 mb-3">
                  <h2 className="text-xl font-bold text-[#1368d6]">
                    Countries in {selectedContinent}
                  </h2>
                  <button
                    onClick={() => setSelectedContinent(null)}
                    className="px-3 py-2 text-sm rounded border hover:bg-blue-50 text-[#1368d6]"
                  >
                    ← Back
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {countryBuckets.map((b) => (
                    <StatCard
                      key={b.name}
                      title={b.name}
                      value={b.count}
                      onClick={() => setSelectedCountry(b.name)}
                    />
                  ))}
                </div>
              </>
            )}

            {selectedContinent && selectedCountry && (
              <>
                <div className="flex justify-between items-center mt-8 mb-3">
                  <h2 className="text-xl font-bold text-[#1368d6]">
                    States in {selectedCountry}
                  </h2>
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="px-3 py-2 text-sm rounded border hover:bg-blue-50 text-[#1368d6]"
                  >
                    ← Back
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {stateBuckets.map((b) => (
                    <StatCard key={b.name} title={b.name} value={b.count} />
                  ))}
                </div>
              </>
            )}

            {/* ---------- CHARTS ---------- */}
            <div className="bg-white border rounded-xl p-6 shadow-sm mt-10">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#1368d6]">
                <BarChart3 size={18} /> Statistics Overview
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1368d6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="count"
                        nameKey="name"
                        outerRadius={100}
                        label
                      >
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        
        )}
      {currentPage === "visited" && <Visited />}
      {currentPage === "assistance" && <Assistance />}
      {currentPage === "suggestions" && <Suggestions />}
      </main>
    </div>
  );
}
