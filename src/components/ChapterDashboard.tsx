import { useEffect, useState } from "react";
import { Users, MapPin, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";
import AssistanceQueue from "./AssistanceQueue";
import FeedbackInbox from "./FeedbackInbox";
import RoleManager from "./RoleManager";
import MyChapterMembers from "./MyChapterMembers";
import MyChapterClusters from "./MyChapterClusters";

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

type Stat = {
  country: string;
  chapter: string;
  members: number;
  joined_30d: number;
  cities: number;
  women: number;
};

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

/* What a coordinator actually does: know who is in the chapter, clear
   the assistance queue, read what the chapter is telling them, group
   cities into clusters, and read what the chapter is telling them. */
type View = "members" | "queue" | "feedback" | "team" | "clusters";

function ChapterTabs({
  view,
  setView,
}: {
  view: View;
  setView: (v: View) => void;
}) {
  const tabs: { key: View; label: string }[] = [
    { key: "members", label: "Members" },
    { key: "queue", label: "Assistance queue" },
    { key: "feedback", label: "Feedback" },
    // Delegation. A chapter lead appoints their own team lead here —
    // grant_wing_role() bounds what they may offer, so this surface
    // needs no rules of its own.
    { key: "team", label: "Team" },
    { key: "clusters", label: "Clusters" },
  ];
  return (
    <div className="flex gap-2 border-b border-gray-200 -mb-2">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => setView(t.key)}
          className={`h-10 px-4 text-sm font-bold border-b-2 -mb-px transition-colors ${
            view === t.key
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function ChapterDashboard() {
  const [view, setView] = useState<View>("members");
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [noAccess, setNoAccess] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.rpc("chapter_stats");
      const statRows = (s as Stat[]) ?? [];
      setStats(statRows);
      // An empty stats result means the caller holds no chapter — which
      // is a legitimate answer, not a failure.
      setNoAccess(statRows.length === 0);
      setLoading(false);
    })();
  }, []);

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

  /* Both of these sit before the noAccess guard, which is derived from
     chapter_stats() being empty — also true for a coordinator whose
     country simply has no members yet. Each of these does its own
     access check against its own RPC. */
  if (view === "queue") {
    return (
      <div className="space-y-8">
        <ChapterTabs view={view} setView={setView} />
        <AssistanceQueue />
      </div>
    );
  }

  if (view === "feedback") {
    return (
      <div className="space-y-8">
        <ChapterTabs view={view} setView={setView} />
        <FeedbackInbox />
      </div>
    );
  }

  if (view === "team") {
    return (
      <div className="space-y-8">
        <ChapterTabs view={view} setView={setView} />
        <div>
          <h2 className="text-xl font-black text-gray-900">Your team</h2>
          <p className="text-sm text-gray-600 mt-1">
            Appoint and remove people within the scope you hold.
          </p>
        </div>
        <RoleManager />
      </div>
    );
  }

  if (view === "clusters") {
    return (
      <div className="space-y-8">
        <ChapterTabs view={view} setView={setView} />
        {/* Built to docs/design/nri-wing-prototype.html (screen c-clusters). */}
        <MyChapterClusters country={stats[0]?.country ?? ""} />
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Your chapter</h2>
        <p className="text-sm text-gray-600 mt-1">
          {stats.map((s) => s.country).filter((v, i, a) => a.indexOf(v) === i).join(", ")}
        </p>
      </div>

      <ChapterTabs view={view} setView={setView} />

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

      {/* Built to docs/design/nri-wing-prototype.html (screen c-members). */}
      <MyChapterMembers />
    </div>
  );
}
