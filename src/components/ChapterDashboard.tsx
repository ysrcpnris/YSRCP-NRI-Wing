import { useCallback, useEffect, useState } from "react";
import { Search, Users, MapPin, TrendingUp, Mail, Phone } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Chapter surface — for country coordinators and chapter leads.
 *
 * Everything here is scoped server-side by chapter_roster() and
 * chapter_stats(), both of which read my_countries(). A coordinator who
 * asks for a country they do not hold gets an empty set, not an error,
 * so there is nothing for the client to enforce and nothing it could
 * get wrong.
 *
 * The roster deliberately carries no voter, DOB or family fields —
 * those are withheld at the column level and the RPC does not
 * reintroduce them.
 */

type RosterRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  city_abroad: string | null;
  country: string | null;
  chapter: string | null;
  constituency: string | null;
  district: string | null;
  joined_at: string;
  total_count: number;
};

type Stat = {
  country: string;
  chapter: string;
  members: number;
  joined_30d: number;
  cities: number;
  women: number;
};

const PAGE = 50;

function initials(name: string | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

function StatCard({
  label,
  value,
  sub,
  Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  Icon: typeof Users;
}) {
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Icon size={15} />
        <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-black text-gray-900 tabular-nums leading-none">
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function ChapterDashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  const total = rows[0]?.total_count ?? 0;

  const loadRoster = useCallback(async (q: string, pageIndex: number) => {
    const { data, error } = await supabase.rpc("chapter_roster", {
      p_search: q || null,
      p_limit: PAGE,
      p_offset: pageIndex * PAGE,
    });
    if (error) {
      console.error("chapter_roster failed:", error);
      return;
    }
    setRows((data as RosterRow[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.rpc("chapter_stats"),
        supabase.rpc("chapter_roster", { p_limit: PAGE, p_offset: 0 }),
      ]);
      const statRows = (s as Stat[]) ?? [];
      setStats(statRows);
      setRows((r as RosterRow[]) ?? []);
      // An empty stats result means the caller holds no chapter — which
      // is a legitimate answer, not a failure.
      setNoAccess(statRows.length === 0);
      setLoading(false);
    })();
  }, []);

  // Debounced so typing a name is one query at rest.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      loadRoster(search, 0);
    }, 250);
    return () => clearTimeout(t);
  }, [search, loadRoster]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (noAccess) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="font-bold text-gray-900">No chapter assigned</p>
        <p className="text-sm text-gray-600 mt-1">
          This area is for country coordinators and chapter leads. If you
          believe you should have access, contact your country coordinator.
        </p>
      </div>
    );
  }

  const totals = stats.reduce(
    (a, s) => ({
      members: a.members + Number(s.members),
      new30: a.new30 + Number(s.joined_30d),
      cities: a.cities + Number(s.cities),
      women: a.women + Number(s.women),
    }),
    { members: 0, new30: 0, cities: 0, women: 0 }
  );

  const pages = Math.ceil(total / PAGE);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Your chapter</h2>
        <p className="text-sm text-gray-600 mt-1">
          {stats.map((s) => s.country).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Members" value={totals.members} Icon={Users} />
        <StatCard
          label="Joined"
          value={totals.new30}
          sub="in the last 30 days"
          Icon={TrendingUp}
        />
        <StatCard label="Cities" value={totals.cities} Icon={MapPin} />
        <StatCard
          label="Women"
          value={
            totals.members
              ? `${Math.round((totals.women / totals.members) * 100)}%`
              : "—"
          }
          sub={`${totals.women} of ${totals.members}`}
          Icon={Users}
        />
      </div>

      {/* Per-chapter breakdown, only when there is more than one to compare. */}
      {stats.length > 1 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-4 font-bold">Chapter</th>
                <th className="py-2 pr-4 font-bold text-right">Members</th>
                <th className="py-2 pr-4 font-bold text-right">New (30d)</th>
                <th className="py-2 font-bold text-right">Cities</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={`${s.country}-${s.chapter}`} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-semibold text-gray-900">{s.chapter}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{s.members}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-gray-600">
                    {s.joined_30d}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-gray-600">
                    {s.cities}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <h3 className="font-bold text-gray-900">
            Members{" "}
            <span className="font-normal text-gray-500 tabular-nums">
              ({total})
            </span>
          </h3>
          <div className="relative w-full max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or city"
              className="w-full h-10 pl-9 pr-3 bg-gray-50 border border-gray-300 rounded-lg
                         text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            {search ? `No members match “${search}”.` : "No members yet."}
          </p>
        ) : (
          <>
            {/* Cards on small screens, table on wide — a 7-column table is
                unreadable on a phone, and coordinators do use phones. */}
            <div className="space-y-3 md:hidden">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-3"
                >
                  <div
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center
                               bg-gradient-to-br from-primary-500 to-accent-500
                               text-white font-black text-xs"
                  >
                    {initials(r.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900 text-sm truncate">
                      {r.full_name || "—"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {r.city_abroad || "—"} · {r.constituency || "—"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        aria-label={`Email ${r.full_name ?? "member"}`}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center
                                   justify-center text-gray-500 hover:text-primary-600
                                   hover:border-primary-300"
                      >
                        <Mail size={15} />
                      </a>
                    )}
                    {r.mobile_number && (
                      <a
                        href={`tel:${r.mobile_number}`}
                        aria-label={`Call ${r.full_name ?? "member"}`}
                        className="w-9 h-9 rounded-lg border border-gray-200 flex items-center
                                   justify-center text-gray-500 hover:text-primary-600
                                   hover:border-primary-300"
                      >
                        <Phone size={15} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-bold">Member</th>
                    <th className="py-2 pr-4 font-bold">City</th>
                    <th className="py-2 pr-4 font-bold">Constituency</th>
                    <th className="py-2 pr-4 font-bold">Joined</th>
                    <th className="py-2 font-bold text-right">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center
                                       bg-gradient-to-br from-primary-500 to-accent-500
                                       text-white font-black text-[10px]"
                          >
                            {initials(r.full_name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">
                              {r.full_name || "—"}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {r.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-700">{r.city_abroad || "—"}</td>
                      <td className="py-3 pr-4 text-gray-700">
                        {r.constituency || "—"}
                        {r.district && (
                          <span className="block text-xs text-gray-400">
                            {r.district}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 tabular-nums whitespace-nowrap">
                        {new Date(r.joined_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {r.email && (
                            <a
                              href={`mailto:${r.email}`}
                              aria-label={`Email ${r.full_name ?? "member"}`}
                              className="w-8 h-8 rounded-lg border border-gray-200 inline-flex
                                         items-center justify-center text-gray-500
                                         hover:text-primary-600 hover:border-primary-300"
                            >
                              <Mail size={14} />
                            </a>
                          )}
                          {r.mobile_number && (
                            <a
                              href={`tel:${r.mobile_number}`}
                              aria-label={`Call ${r.full_name ?? "member"}`}
                              className="w-8 h-8 rounded-lg border border-gray-200 inline-flex
                                         items-center justify-center text-gray-500
                                         hover:text-primary-600 hover:border-primary-300"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-gray-500 tabular-nums">
                  {page * PAGE + 1}–{Math.min((page + 1) * PAGE, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page === 0}
                    onClick={() => {
                      const p = page - 1;
                      setPage(p);
                      loadRoster(search, p);
                    }}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold
                               disabled:opacity-40 hover:border-primary-300"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pages - 1}
                    onClick={() => {
                      const p = page + 1;
                      setPage(p);
                      loadRoster(search, p);
                    }}
                    className="h-9 px-3 rounded-lg border border-gray-200 text-sm font-semibold
                               disabled:opacity-40 hover:border-primary-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
