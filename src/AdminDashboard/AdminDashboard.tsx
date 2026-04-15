// src/pages/AdminDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Settings } from "lucide-react";
import { Globe } from "lucide-react";
import * as XLSX from "xlsx";
import Visited from "./Visited";
import Assistance from "./Assistance";
import Suggestions from "./Suggestions";
// import ServiceInbox from "./ServiceInbox";
import MasterData from "./MasterData";
import EventsNotifications from "./EventsNotifications";

import ContentControl from "./ContentControl";
import AdminProfileMenu from "./AdminProfileMenu";
import ysrLogo from "../components/nrilogo.png";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";



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
  User,
  Lock,
  Save,
  Phone,
  Mail,
  Loader2,
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
// Supabase table storing member profile data
const TABLE_NAME = "profiles";

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
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  mobile_number?: string | null;
  whatsapp_number?: string | null;
  gender?: string | null;
  dob?: string | null;
  contribution?: string | null;
  profession?: string | null;
  organization?: string | null;
  designation?: string | null;
  country_of_residence: string | null;
  state_abroad: string | null;
  city_abroad: string | null;
  indian_state?: string | null;
  district?: string | null;
  assembly_constituency?: string | null;
  mandal?: string | null;
  village?: string | null;
  created_at?: string | null;
};

// Type for grouping geographic data with counts
type Bucket = { name: string; count: number };

/* ---------- Helpers ---------- */
// Calculates age from DOB, returns "-" if invalid
const calculateAge = (dob: string | null | undefined): number | string => {
  if (!dob) return "-";
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : "-";
  } catch {
    return "-";
  }
};

// Exports member data to Excel with formatted columns and auto-fit widths
const exportToExcel = (data: any[], filename: string = "registrations.xlsx") => {
  const exportData = data.map((row: any) => ({
    "First Name": row.first_name || "-",
    "Last Name": row.last_name || "-",
    "Email": row.email || "-",
    "Mobile Number": row.mobile_number || "-",
    "WhatsApp Number": row.whatsapp_number || "-",
    "Gender": row.gender || "-",
    "Age": calculateAge(row.dob),
    "Contribution": row.contribution || "-",
    "Country of Residence": row.country_of_residence || "-",
    "City Abroad": row.city_abroad || "-",
    "Indian State": row.indian_state || "-",
    "District": row.district || "-",
    "Assembly Constituency": row.assembly_constituency || "-",
    "Mandal": row.mandal || "-",
    "Village": row.village || "-",
    "Profession": row.profession || "-",
    "Organization": row.organization || "-",
    "Designation": row.designation || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  
  // Auto-fit column widths
  const colWidths = Object.keys(exportData[0] || {}).map(() => ({ wch: 20 }));
  worksheet["!cols"] = colWidths;
  
  XLSX.writeFile(workbook, filename);
};

/* ---------- Sidebar ---------- */
// Navigation sidebar with admin menu (Profile, Logout) and page links
function Sidebar({ onLogout, current, setCurrentPage, isOpen, onToggle }: { onLogout: () => void; current: string; setCurrentPage: (p: string) => void; isOpen: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  // State for dropdown menus
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showProfile, setShowProfile] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Reusable sidebar menu item component
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
      <aside className={`fixed top-0 left-0 w-64 h-screen bg-gradient-to-b from-white to-blue-50 border-r border-blue-100 z-40 flex flex-col transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-6 relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 flex-1 hover:opacity-80 transition"
            >
              <img
                src={ysrLogo}
                alt="YSRCP Logo"
                className="w-10 h-10 rounded-full border-2 border-green-600 shadow-sm"
              />
              <div className="text-left">
                <div className="font-semibold text-[#1368d6]">NRI Convenor</div>
                <div className="text-xs text-green-600">NRI Wing</div>
              </div>
            </button>
            <button onClick={onToggle} className="md:hidden text-gray-700">
              <X size={20} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute left-4 top-20 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
                  <p className="text-sm font-bold text-[#1368d6]">Admin Menu</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowProfile(true);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium flex items-center gap-2 text-gray-700 hover:bg-blue-50 hover:text-[#1368d6] rounded-lg transition-all"
                  >
                    <User size={16} />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/change-password");
                    }}
                    className="w-full px-3 py-2 text-sm font-medium flex items-center gap-2 text-gray-700 hover:bg-blue-50 hover:text-[#1368d6] rounded-lg transition-all"
                  >
                    <Lock size={16} />
                    Change Password
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-sm font-medium flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
          <nav className="space-y-2">
            <Item icon={Home} label="Dashboard" page="dashboard" />
            <Item icon={CalendarDays} label="Visited" page="visited" />
            <Item icon={Newspaper} label="Assistance" page="assistance" />
            <Item icon={Users} label="Suggestions" page="suggestions" />
            {/* <Item icon={FolderKanban} label="Service Inbox" page="serviceInbox" /> */}
            <Item icon={Settings} label="Master Data" page="masterData" />
            <Item icon={Newspaper} label="Events & Notifications" page="eventsnotifications" />
            <Item icon={Globe} label="Content Control" page="contentControl" />

          </nav>
        </div>

        
      </aside>

      {/* Profile Modal */}
      {showProfile && <AdminProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}


/* ---------- Cards ---------- */
// Card component displaying registration count with drill-down capability
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
/* ---------- Paginated Members Table ---------- */
// Displays paginated list of members (8 per page) with drill-down navigation
function MembersList({
  title,
  members,
  onBack,
}: {
  title: string;
  members: Row[];
  onBack: () => void;
}) {
  // Pagination state: 8 members per page
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
                    <td className="py-2 px-4">{[(m as any).first_name, (m as any).last_name].filter(Boolean).join(" ") || "-"}</td>
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


/* ---------- Main Dashboard ---------- */
// Main admin dashboard with geographic drill-down, charts, and session timeout protection
export default function AdminDashboard() {
  // Dashboard state
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [countryContinentMap, setCountryContinentMap] = useState<Record<string, string>>({});
  
  // Auto-logout after 2 minutes inactivity (shows warning at 1.5 min)
  const idleTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const IDLE_TIME_LIMIT = 2 * 60 * 1000; // 2 minutes in milliseconds
  const WARNING_TIME = 1.5 * 60 * 1000; // Show warning at 1.5 minutes

  // String normalization helpers
  const norm = (v: string | null | undefined) => (v || "").trim();
  const toContinent = (country: string) =>
    countryContinentMap[normalizeCountry(country)] || "Unknown";

  // Normalize country names for consistent lookup
  const normalizeCountry = (value: string) =>
    value
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // Reset session timeout on user activity
  const resetIdleTimer = () => {
    // Clear previous timers
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    setShowIdleWarning(false);

    // Set warning timeout at 1.5 minutes
    warningTimeoutRef.current = setTimeout(() => {
      setShowIdleWarning(true);
    }, WARNING_TIME);

    // Set logout timeout at 2 minutes
    idleTimeoutRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIME_LIMIT);
  };

  // Track user activity to auto-logout after 2 minutes of inactivity
  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    const handleActivity = () => {
      resetIdleTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timer on component mount
    resetIdleTimer();

    // Cleanup on unmount
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, []);

  // Groups member records by continent/country/state with counts
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

  const navigate = useNavigate();
  // Fetch country-to-continent mapping for geographic grouping
  useEffect(() => {
  let active = true;

  (async () => {
    const { data, error } = await supabase
      .from("countries")
      .select(`
        name,
        continents (
          name
        )
      `);

    if (!active) return;

    if (error) {
      console.error("Failed to fetch countries:", error.message);
      return;
    }

    const map: Record<string, string> = {};
    (data || []).forEach((c: any) => {
      if (c.name && c.continents?.name) {
        map[normalizeCountry(c.name)] = c.continents.name;

      }
    });

    setCountryContinentMap(map);
  })();

  return () => {
    active = false;
  };
}, []);


  // Fetch all member profiles using pagination (1000 rows per batch)
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setErr("");

      // Batch fetch: Supabase caps requests at ~1000 rows, so paginate through dataset
      const batchSize = 1000;
      let offset = 0;
      const allRows: Row[] = [];

      try {
        while (active) {
          const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(
              "id, first_name, last_name, full_name, email, mobile_number, whatsapp_number, gender, dob, contribution, profession, organization, designation, country_of_residence, state_abroad, city_abroad, indian_state, district, assembly_constituency, mandal, village, created_at"
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

  // Memoized continent buckets for initial dashboard view
  const continentBuckets = useMemo(() => {
    const g = group(rows, "continent");
    const map = new Map(g.map((b) => [b.name, b.count]));
    return CONTINENTS.map((name) => ({ name, count: map.get(name) || 0 })).filter(
      (b) => b.count > 0
    );
  }, [rows]);

  // Memoized country buckets filtered by selected continent
  const countryBuckets = useMemo(() => {
    if (!selectedContinent) return [];
    const filtered = rows.filter(
      (r) => toContinent(norm(r.country_of_residence)) === selectedContinent
    );
    return group(filtered, "country");
  }, [rows, selectedContinent]);

  // No more state-level grouping: we directly show members for a country

  // Logout handler: clears session and redirects to home
  const handleLogout = () => {
    // Clear all timers
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    
    localStorage.removeItem("is_admin");
    localStorage.removeItem("adminLoginTime");
    navigate("/", { replace: true });
  };

  // Determine chart data based on current drill-down level
  const chartData = selectedContinent
    ? selectedCountry
      ? []
      : countryBuckets
    : continentBuckets;

  // Color palette for charts
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
      {/* Idle Warning Modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4 border-2 border-red-400">
            <h3 className="text-lg font-bold text-red-600 mb-2">Session Expiring Soon</h3>
            <p className="text-gray-700 mb-4">
              Your session will expire in 30 seconds due to inactivity. Click below to continue working or you will be logged out.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setShowIdleWarning(false);
                  resetIdleTimer();
                }}
                className="bg-[#1368d6] text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Continue Session
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        onLogout={handleLogout}
        current={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 ml-0 md:ml-64 p-8 overflow-y-auto h-screen">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 bg-[#1368d6] text-white p-2 rounded-lg shadow-md"
        >
          <Menu size={20} />
        </button>
        {currentPage === "dashboard" && (
    <>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1368d6] mb-2">
              Coordinator Dashboard
            </h1>
            <p className="text-gray-500">
              Registrations overview by continent, country, and state
            </p>
          </div>
          <button
            onClick={() => exportToExcel(rows, `registrations_${new Date().toISOString().split('T')[0]}.xlsx`)}
            disabled={loading || rows.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-medium"
          >
            📥 Export Excel
          </button>
        </div>

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
                  {/* Bar Chart */}
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 50 }}>
                        <XAxis 
                          dataKey="name" 
                          tick={{ fontSize: 11 }}
                          angle={chartData.length > 8 ? -45 : 0}
                          textAnchor={chartData.length > 8 ? "end" : "middle"}
                          height={chartData.length > 8 ? 80 : 50}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1368d6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Pie Chart - Full width and height */}
                  <div className="h-96 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie
                          data={chartData}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={chartData.length > 15 ? 90 : 110}
                          label={chartData.length <= 10}
                          labelLine={false}
                        >
                          {chartData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value.toLocaleString()} />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          wrapperStyle={{ fontSize: "12px", paddingTop: "20px" }}
                        />
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
      {currentPage === "eventsnotifications" && <EventsNotifications />}
      {currentPage === "contentControl" && <ContentControl />}

      </main>
    </div>
  );
}

/* ===============================
   ADMIN PROFILE MODAL
================================ */
// Modal for editing admin profile (Name, Mobile, WhatsApp)
function AdminProfileModal({ onClose }: { onClose: () => void }) {
  // Get admin profile from auth context
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    email: "",
    mobile_number: "",
    whatsapp_number: "",
  });

  // Populate form with current profile data
  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        email: profile.email || "",
        mobile_number: profile.mobile_number || "",
        whatsapp_number: profile.whatsapp_number || "",
      });
    }
  }, [profile]);

  // Save profile changes to database
  const updateProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name,
          mobile_number: form.mobile_number,
          whatsapp_number: form.whatsapp_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      // @ts-ignore
      toast.success("Profile updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      // @ts-ignore
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] px-8 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <p className="text-blue-100 text-sm mt-1">Update your personal information</p>
        </div>

        <div className="p-8 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Name</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={16} />
              </div>
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Name"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={16} />
              </div>
              <input
                value={form.email}
                disabled
                className="w-full border border-gray-100 bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mobile Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={16} />
              </div>
              <input
                value={form.mobile_number}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                placeholder="Mobile Number"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">WhatsApp Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={16} className="text-green-500" />
              </div>
              <input
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="WhatsApp Number"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={updateProfile}
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
