// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Settings } from "lucide-react";
import { Globe } from "lucide-react";
import Visited from "./Visited";
import Assistance from "./Assistance";
import Suggestions from "./Suggestions";
// import ServiceInbox from "./ServiceInbox";
import MasterData from "./MasterData";
import ContentControl from "./ContentControl";
import ysrLogo from "../components/nrilogo.png";



import {
  LogOut,
  CalendarDays,
  Home,
  BarChart3,
  Users,
  FolderKanban,
  Newspaper,
  Menu,
  X,
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
  first_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
  profession?: string | null;
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
function Sidebar({ onLogout, current, setCurrentPage, isOpen, onToggle }: { onLogout: () => void; current: string; setCurrentPage: (p: string) => void; isOpen: boolean; onToggle: () => void }) {
  const Item = ({ icon: Icon, label, page }: { icon: React.ComponentType<any>; label: string; page: string }) => (
    <div
      onClick={() => {
        setCurrentPage(page);
        if (window.innerWidth < 768) onToggle(); // Close on mobile after selection
      }}
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
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}
      <aside className={`fixed md:relative top-0 left-0 w-64 p-4 bg-gradient-to-b from-white to-blue-50 border-r border-blue-100 flex flex-col justify-between h-screen z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
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
            <button onClick={onToggle} className="md:hidden text-gray-700">
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-2">
            <Item icon={Home} label="Dashboard" page="dashboard" />
            <Item icon={CalendarDays} label="Visited" page="visited" />
            <Item icon={Newspaper} label="Assistance" page="assistance" />
            <Item icon={Users} label="Suggestions" page="suggestions" />
            {/* <Item icon={FolderKanban} label="Service Inbox" page="serviceInbox" /> */}
            <Item icon={Settings} label="Master Data" page="masterData" />
            <Item icon={Globe} label="Content Control" page="contentControl" />

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
    </>
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
    <div className="rounded-xl bg-white border border-gray-200 hover:shadow-lg transition-all duration-200 p-6 flex flex-col justify-between max-w-xs w-full mx-auto">
      <div>
        <div className="text-gray-600 text-lg font-bold text-center">{title}</div>
        <div className="text-3xl font-semibold text-green-600 mt-2 text-center">
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
/* ---------- State Members Table ---------- */
/* ---------- State Members Table (with Pagination) ---------- */
function StateMembersTable({ country, onBack }: { country: string; onBack: () => void }) {
  // This component was previously querying supabase directly. To simplify
  // rendering and avoid nested imports/parse issues, the dashboard will pass
  // the members list to display. Keep this component as a presentational
  // pagination table that expects `members` to be provided by the parent.
  return null;
}

function MembersList({
  title,
  members,
  onBack,
}: {
  title: string;
  members: Row[];
  onBack: () => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = members.slice(start, end);
  const totalPages = Math.max(1, Math.ceil(members.length / pageSize));

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold text-[#1368d6]">{title}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm rounded-md bg-[#1368d6] text-white hover:bg-green-600 transition"
        >
          ← Back
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-gray-600 p-6">No members found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white">
                <tr>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Name</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Email</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Mobile</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">WhatsApp</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">Profession</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`text-sm hover:bg-blue-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="py-2 px-4">{(m as any).first_name || "-"}</td>
                    <td className="py-2 px-4">{(m as any).email || "-"}</td>
                    <td className="py-2 px-4">{(m as any).mobile_number || "-"}</td>
                    <td className="py-2 px-4">{(m as any).whatsapp_number || "-"}</td>
                    <td className="py-2 px-4">{(m as any).profession || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr("");

      // Supabase/PostgREST commonly caps single requests (often at 1000 rows).
      // To reliably fetch large datasets we page using `.range()` in batches.
      const batchSize = 1000;
      let offset = 0;
      const allRows: Row[] = [];

      try {
        while (active) {
          const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(
              "id, first_name, email, mobile_number, whatsapp_number, profession, country_of_residence, state_abroad, city_abroad, created_at"
            )
            .range(offset, offset + batchSize - 1);

          if (!active) return;

          if (error) {
            setErr(error.message);
            break;
          }

          const chunk = (data || []) as Row[];
          allRows.push(...chunk);

          // If we received fewer than a full batch, we're done
          if (chunk.length < batchSize) break;

          offset += batchSize;
        }

        if (active) setRows(allRows);
      } catch (e: any) {
        if (active) setErr(e?.message || String(e));
      } finally {
        if (active) setLoading(false);
      }
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

  // No more state-level grouping: we directly show members for a country

  const handleLogout = () => {
    localStorage.removeItem("is_admin");
    navigate("/", { replace: true });
  };

  const chartData = selectedContinent
    ? selectedCountry
      ? []
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

  const showCharts = !(selectedContinent && (selectedCountry || countryBuckets.length === 0));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex">
       <Sidebar
      onLogout={handleLogout}
      current={currentPage}
      setCurrentPage={setCurrentPage}
      isOpen={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
    />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 bg-[#1368d6] text-white p-2 rounded-lg shadow-md"
        >
          <Menu size={20} />
        </button>
        {currentPage === "dashboard" && (
    <>
        <h1 className="text-3xl font-bold text-[#1368d6] mb-2">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mb-6">
          Registrations overview by continent, country, and state
        </p>

     <p style={{ fontWeight: "bold" , fontSize: "22px", color:"green" }}>
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
                <h2 className="text-2xl font-bold text-[#1368d6] mb-3">
                  <br />
                  Continents
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl">
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
                  <h2 className="text-xl font-bold text-[#1368d6]">Countries in {selectedContinent}</h2>
                  <button
                    onClick={() => setSelectedContinent(null)}
                    className="px-3 py-2 text-sm rounded border hover:bg-blue-50 text-[#1368d6]"
                  >
                    ← Back
                  </button>
                </div>

                {countryBuckets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-5xl">
                    {countryBuckets.map((b) => (
                      <StatCard
                        key={b.name}
                        title={b.name}
                        value={b.count}
                        onClick={() => setSelectedCountry(b.name)}
                      />
                    ))}
                  </div>
                ) : (
                  <MembersList
                    title={`Members in ${selectedContinent}`}
                    members={rows.filter((r) => toContinent(norm(r.country_of_residence)) === selectedContinent)}
                    onBack={() => setSelectedContinent(null)}
                  />
                )}
              </>
            )}

            {selectedContinent && selectedCountry && (
              <>
                <MembersList
                  title={`Members Registered in ${selectedCountry}`}
                  members={rows.filter((r) => norm(r.country_of_residence) === selectedCountry)}
                  onBack={() => setSelectedCountry(null)}
                />
              </>
            )}


            {/* ---------- CHARTS ---------- */}
            {showCharts && (
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
            )}
          </>
        
        )}
      {currentPage === "visited" && <Visited />}
      {currentPage === "assistance" && <Assistance />}
      {currentPage === "suggestions" && <Suggestions />}
      {/* {currentPage === "serviceInbox" && <ServiceInbox />} */}
      {currentPage === "masterData" && <MasterData />}
      {currentPage === "contentControl" && <ContentControl />}

      </main>
    </div>
  );
}
