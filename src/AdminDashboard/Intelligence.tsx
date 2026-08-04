import { useEffect, useState } from "react";
import {
  Users,
  MapPin,
  AlertTriangle,
  Globe,
  UserX,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Admin intelligence.
 *
 * The admin dashboard already has a screen per table — Users,
 * Assistance, ServiceInbox, Suggestions, OrgHierarchy. This is the
 * screen for questions that cross them, which nothing else answers:
 * where members live versus where they are FROM, which constituencies
 * are uncovered, who is dormant, and what needs a human today.
 *
 * Everything here is counts. No member identifiers, no protected
 * columns — an intelligence screen is exactly where a careless join
 * leaks the fields the column grants exist to protect, so the RPCs are
 * built from aggregates outward rather than from a member list inward.
 *
 * SMALL NUMBERS ARE LABELLED AS SUCH. A "top constituency" with two
 * members is noise, and presenting it as a ranking would invite a
 * decision the data cannot support.
 */

type Headline = { metric: string; value: number; detail: string };
type Geo = {
  dimension: "residence" | "origin";
  label: string | null;
  sublabel: string | null;
  members: number;
  onboarded: number;
  joined_30d: number;
};
type Gap = {
  gap_type: "members_no_leader" | "leader_no_members";
  constituency: string;
  district: string;
  members: number;
  coordinators: number;
};
type Band = { band: string; members: number; share: number };

const HEADLINE_META: Record<
  string,
  { label: string; Icon: typeof Users; urgent?: boolean }
> = {
  members: { label: "Members", Icon: Users },
  countries: { label: "Countries", Icon: Globe },
  constituencies_covered: { label: "Constituencies", Icon: MapPin },
  incomplete_profiles: { label: "Incomplete profiles", Icon: UserX, urgent: true },
  open_grievances: { label: "Open grievances", Icon: AlertTriangle, urgent: true },
  open_student_requests: { label: "Student requests", Icon: AlertTriangle, urgent: true },
  pending_appointments: { label: "Pending appointments", Icon: AlertTriangle, urgent: true },
};

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-bold text-gray-900">{title}</h3>
      {hint && <p className="text-sm text-gray-500 mt-0.5 mb-3">{hint}</p>}
      {children}
    </section>
  );
}

export default function Intelligence() {
  const [headline, setHeadline] = useState<Headline[]>([]);
  const [geo, setGeo] = useState<Geo[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [bands, setBands] = useState<Band[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const [h, g, c, e] = await Promise.all([
        supabase.rpc("intel_headline"),
        supabase.rpc("intel_geography"),
        supabase.rpc("intel_coverage_gaps"),
        supabase.rpc("intel_engagement"),
      ]);
      const hl = (h.data as Headline[]) ?? [];
      setHeadline(hl);
      setGeo((g.data as Geo[]) ?? []);
      setGaps((c.data as Gap[]) ?? []);
      setBands((e.data as Band[]) ?? []);
      // Every intel RPC returns no rows to a non-admin rather than an
      // error, so an empty headline is the access answer.
      setDenied(hl.length === 0);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (denied) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="font-bold text-gray-900">Not available</p>
        <p className="text-sm text-gray-600 mt-1">
          Intelligence is limited to wing administrators.
        </p>
      </div>
    );
  }

  const residence = geo.filter((r) => r.dimension === "residence");
  const origin = geo.filter((r) => r.dimension === "origin");
  const noLeader = gaps.filter((g) => g.gap_type === "members_no_leader");
  const noMembers = gaps.filter((g) => g.gap_type === "leader_no_members");
  const totalMembers =
    headline.find((h) => h.metric === "members")?.value ?? 0;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-black text-gray-900">Intelligence</h2>
        <p className="text-sm text-gray-600 mt-1">
          The whole wing at a glance — where we are, where we aren’t, and
          what needs attention.
        </p>
      </div>

      {/* Operational first. What needs a human today outranks any trend. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {headline.map((h) => {
          const meta = HEADLINE_META[h.metric] ?? {
            label: h.metric,
            Icon: Users,
          };
          const needsAction = meta.urgent && h.value > 0;
          return (
            <div
              key={h.metric}
              className={`p-5 rounded-xl border ${
                needsAction
                  ? "bg-amber-50 border-amber-200"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`flex items-center gap-2 mb-2 ${
                  needsAction ? "text-amber-700" : "text-gray-500"
                }`}
              >
                <meta.Icon size={15} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  {meta.label}
                </span>
              </div>
              <p
                className={`text-3xl font-black tabular-nums leading-none ${
                  needsAction ? "text-amber-900" : "text-gray-900"
                }`}
              >
                {h.value}
              </p>
              <p className="text-xs text-gray-500 mt-1.5">{h.detail}</p>
            </div>
          );
        })}
      </div>

      <Section
        title="Engagement"
        hint="A member counts as active if they finished onboarding, shared a campaign, booked an appointment, raised a case or sent feedback."
      >
        <div className="space-y-2">
          {bands.map((b) => (
            <div key={b.band} className="flex items-center gap-3">
              <span className="w-56 shrink-0 text-sm text-gray-700">
                {b.band}
              </span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className={`h-full ${
                    b.band.startsWith("Dormant")
                      ? "bg-gray-400"
                      : b.band.startsWith("Signed up")
                      ? "bg-primary-300"
                      : "bg-primary-600"
                  }`}
                  style={{ width: `${Math.max(1, b.share)}%` }}
                />
              </div>
              <span className="w-24 shrink-0 text-sm text-gray-600 tabular-nums text-right">
                {b.members} · {b.share}%
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Section title="Where members live" hint="The chapter's view.">
          <div className="space-y-1.5">
            {residence.slice(0, 10).map((r, i) => (
              <div
                key={`${r.label}-${r.sublabel}-${i}`}
                className="flex items-center justify-between gap-3 text-sm py-1.5
                           border-b border-gray-100 last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900">{r.label}</span>
                  {r.sublabel && (
                    <span className="text-gray-400 text-xs"> · {r.sublabel}</span>
                  )}
                </div>
                <span className="tabular-nums text-gray-600 shrink-0">
                  {r.members}
                  {r.joined_30d > 0 && (
                    <span className="text-emerald-600 text-xs ml-1.5">
                      +{r.joined_30d}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Where members are from"
          hint="The party's view — home constituency, not residence."
        >
          <div className="space-y-1.5">
            {origin.slice(0, 10).map((r, i) => (
              <div
                key={`${r.label}-${i}`}
                className="flex items-center justify-between gap-3 text-sm py-1.5
                           border-b border-gray-100 last:border-0"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-gray-900">{r.label}</span>
                  <span className="text-gray-400 text-xs"> · {r.sublabel}</span>
                </div>
                <span className="tabular-nums text-gray-600 shrink-0">
                  {r.members}
                </span>
              </div>
            ))}
          </div>
          {/* The honesty note. With 65 members spread over 62
              constituencies, "top constituency" means almost nothing,
              and a ranking would invite a decision the data cannot
              support. */}
          {origin.length > 0 && origin[0].members < 5 && (
            <p className="text-xs text-gray-400 mt-3">
              Members are spread thinly — {origin.length} constituencies, the
              largest with {origin[0].members}. Too few to rank meaningfully.
            </p>
          )}
        </Section>
      </div>

      <Section
        title="Coverage gaps"
        hint="Constituencies where the wing and the party organisation don't line up."
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-bold text-amber-800 mb-2">
              Members with no coordinator ({noLeader.length})
            </p>
            {noLeader.length === 0 ? (
              <p className="text-sm text-gray-500">
                Every constituency with members has one. Good.
              </p>
            ) : (
              <div className="space-y-1">
                {noLeader.slice(0, 12).map((g) => (
                  <div
                    key={g.constituency}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span>
                      <span className="font-semibold text-gray-900">
                        {g.constituency}
                      </span>
                      <span className="text-gray-400 text-xs"> · {g.district}</span>
                    </span>
                    <span className="tabular-nums text-gray-600">
                      {g.members}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">
              Coordinator, no members yet ({noMembers.length})
            </p>
            <p className="text-sm text-gray-500">
              {noMembers.length} of 175 constituencies have party leadership but
              nobody in the NRI Wing — the clearest list of where recruitment
              has room to grow.
            </p>
          </div>
        </div>
      </Section>

      <p className="text-xs text-gray-400">
        Counts only. This screen holds no voter IDs, dates of birth, family
        details or contact numbers.
        {totalMembers < 200 &&
          " Figures are from a small base — treat proportions with care."}
      </p>
    </div>
  );
}
