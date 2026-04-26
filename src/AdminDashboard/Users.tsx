import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "../lib/supabase";

type Row = {
  id: string;
  public_user_code?: string | null;
  credits_balance?: number | null;
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
  country_of_residence?: string | null;
  state_abroad?: string | null;
  city_abroad?: string | null;
  indian_state?: string | null;
  district?: string | null;
  assembly_constituency?: string | null;
  mandal?: string | null;
  village?: string | null;
  family_relation?: string | null;
  family_name?: string | null;
  family_mobile?: string | null;
  family_village?: string | null;
  family_designation?: string | null;
  created_at?: string | null;
};

const PAGE_SIZE = 12;

// Normalises a user row into a single search blob so a single input filters
// across all fields. Cheaper than running OR filters against every column,
// and it works on the already-loaded array (instant feedback).
function buildSearchBlob(r: Row): string {
  return [
    r.public_user_code,
    r.first_name, r.last_name, r.full_name,
    r.email, r.mobile_number, r.whatsapp_number,
    r.gender, r.profession, r.organization, r.designation,
    r.country_of_residence, r.state_abroad, r.city_abroad,
    r.indian_state, r.district, r.assembly_constituency,
    r.mandal, r.village,
    r.family_relation, r.family_name, r.family_mobile,
    r.family_village, r.family_designation,
    r.contribution,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function Users() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Row | null>(null);

  // Index search blobs once per row to keep filtering fast on large lists.
  const blobs = useMemo(
    () => rows.map((r) => ({ row: r, blob: buildSearchBlob(r) })),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    // Multi-word search: every term must match somewhere in the blob.
    const terms = q.split(/\s+/);
    return blobs
      .filter(({ blob }) => terms.every((t) => blob.includes(t)))
      .map(({ row }) => row);
  }, [blobs, rows, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, public_user_code, credits_balance, first_name, last_name, full_name, email, mobile_number, whatsapp_number, gender, dob, contribution, profession, organization, designation, country_of_residence, state_abroad, city_abroad, indian_state, district, assembly_constituency, mandal, village, family_relation, family_name, family_mobile, family_village, family_designation, created_at"
      )
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-600 mb-1">All Users</h1>
      <p className="text-gray-500 mb-5">
        {rows.length.toLocaleString()} registered · search by name, ID, email,
        mobile, location, profession, family relation, anything.
      </p>

      {/* SEARCH */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything — e.g. NRI-8K3P-2M, Saketh, +9198, Hyderabad, Doctor..."
            className="flex-1 border-0 outline-none text-sm font-medium placeholder:text-gray-400"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded"
            >
              Clear
            </button>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} match{filtered.length === 1 ? "" : "es"}
          </span>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            {query ? "No users match your search." : "No users yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-primary-600 to-accent-600 text-white">
                <tr>
                  <th className="py-2.5 px-3 text-left font-semibold">User ID</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Name</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Email</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Mobile</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Location</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Profession</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Family</th>
                  <th className="py-2.5 px-3 text-left font-semibold">Credits</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, i) => {
                  const name =
                    [r.first_name, r.last_name].filter(Boolean).join(" ") ||
                    r.full_name ||
                    "—";
                  const indianLoc = [r.assembly_constituency, r.district, r.indian_state]
                    .filter(Boolean)
                    .join(", ");
                  const abroad = [r.city_abroad, r.country_of_residence]
                    .filter(Boolean)
                    .join(", ");
                  const location = abroad || indianLoc || "—";
                  const hasFamily =
                    r.family_relation || r.family_name || r.family_mobile;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b last:border-b-0 hover:bg-blue-50 ${
                        i % 2 ? "bg-gray-50/40" : "bg-white"
                      }`}
                    >
                      <td className="py-2 px-3 font-mono text-[11px]" title={r.id}>
                        {r.public_user_code || r.id.slice(0, 8)}
                      </td>
                      <td className="py-2 px-3 font-semibold">{name}</td>
                      <td className="py-2 px-3 text-gray-700">{r.email || "—"}</td>
                      <td className="py-2 px-3 text-gray-700">{r.mobile_number || "—"}</td>
                      <td className="py-2 px-3 text-gray-600 max-w-[220px] truncate" title={location}>
                        {location}
                      </td>
                      <td className="py-2 px-3 text-gray-600">{r.profession || "—"}</td>
                      <td className="py-2 px-3">
                        {hasFamily ? (
                          <button
                            onClick={() => setSelected(r)}
                            className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full hover:bg-emerald-100"
                          >
                            👪 {r.family_relation || "—"}
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-bold text-amber-700">
                        ⚡ {r.credits_balance ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-700">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`px-3 py-1 rounded border ${
                  page === 1
                    ? "text-gray-300 border-gray-200 cursor-not-allowed"
                    : "border-primary-600 text-primary-700 hover:bg-blue-50"
                }`}
              >
                Previous
              </button>
              <span className="px-2 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`px-3 py-1 rounded border ${
                  page === totalPages
                    ? "text-gray-300 border-gray-200 cursor-not-allowed"
                    : "border-primary-600 text-primary-700 hover:bg-blue-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* USER DETAIL MODAL — full record + family info */}
      {selected && <UserDetailModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}


/* ---------------- USER DETAIL MODAL ---------------- */
function UserDetailModal({ user, onClose }: { user: Row; onClose: () => void }) {
  const sections: { title: string; rows: { label: string; value: any }[] }[] = [
    {
      title: "Identity",
      rows: [
        { label: "User ID", value: user.public_user_code },
        { label: "Internal UUID", value: user.id },
        { label: "Name", value: [user.first_name, user.last_name].filter(Boolean).join(" ") || user.full_name },
        { label: "Email", value: user.email },
        { label: "Mobile", value: user.mobile_number },
        { label: "WhatsApp", value: user.whatsapp_number },
        { label: "Gender", value: user.gender },
        { label: "DOB", value: user.dob },
      ],
    },
    {
      title: "Address (Abroad)",
      rows: [
        { label: "Country", value: user.country_of_residence },
        { label: "State", value: user.state_abroad },
        { label: "City", value: user.city_abroad },
      ],
    },
    {
      title: "Address (India)",
      rows: [
        { label: "State", value: user.indian_state },
        { label: "District", value: user.district },
        { label: "Constituency", value: user.assembly_constituency },
        { label: "Mandal", value: user.mandal },
        { label: "Village", value: user.village },
      ],
    },
    {
      title: "Professional",
      rows: [
        { label: "Profession", value: user.profession },
        { label: "Organization", value: user.organization },
        { label: "Designation", value: user.designation },
        { label: "Contribution", value: user.contribution },
      ],
    },
    {
      title: "Active Family Member",
      rows: [
        { label: "Relation", value: user.family_relation },
        { label: "Name", value: user.family_name },
        { label: "Mobile", value: user.family_mobile },
        { label: "Village", value: user.family_village },
        { label: "Designation", value: user.family_designation },
      ],
    },
    {
      title: "Credits",
      rows: [{ label: "Balance", value: `⚡ ${user.credits_balance ?? 0}` }],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-90">
              User Details
            </p>
            <p className="text-base font-bold truncate">
              {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
            </p>
            {user.public_user_code && (
              <p className="text-[11px] font-mono opacity-90">{user.public_user_code}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {sections.map((s) => (
            <div key={s.title}>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {s.title}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
                {s.rows.map((row) => (
                  <div key={row.label} className="text-sm flex items-baseline gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                      {row.label}
                    </span>
                    <span className="font-semibold text-gray-900 truncate">
                      {row.value || <span className="text-gray-300 font-normal">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
