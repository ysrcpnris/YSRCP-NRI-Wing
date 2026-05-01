import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  Crown,
  Globe,
  MapPin,
  Building2,
  User as UserIcon,
  Search,
  Phone,
  RefreshCw,
} from "lucide-react";

// '0000000000' is a placeholder used in seed data for leaders whose real
// number isn't on file (e.g. YS Jagan as President). Treat it as no number.
const isRealPhone = (p: string | null | undefined): p is string =>
  !!p && p.replace(/\D/g, "") !== "0000000000";

// Pretty-print '+91XXXXXXXXXX' as '+91 XXXXXXXXXX'. Non-Indian numbers
// (already-formatted with their own country code) are returned as-is.
const formatLeaderPhone = (p: string): string =>
  p.startsWith("+91") && p.length > 3 ? `+91 ${p.slice(3)}` : p;

/* ======================================================================
   ORG HIERARCHY — admin view of the full leadership tree
   --------------------------------------------------------------------
   Tree shape (top → bottom):
     President
       ├─ Global / NRI Coordinator (no scope)
       └─ Regional Coordinators
            └─ District Presidents (under each district they cover)
                 └─ Assembly Coordinators (per constituency)

   Data source: org_hierarchy_v (created in new_28). Falls back to
   leader_assignments + leaders_master if the view isn't available.
====================================================================== */

type Row = {
  assignment_id: string;
  role: string;
  district: string | null;
  constituency: string | null;
  sort_order: number | null;
  leader_id: string;
  name: string;
  whatsapp_number: string | null;
  whatsapp_number_2: string | null;
  photo_url: string | null;
};

const ROLE_META: Record<
  string,
  { Icon: React.ComponentType<{ size?: number; className?: string }>; tone: string; label: string }
> = {
  President:               { Icon: Crown,      tone: "text-amber-600 bg-amber-50 border-amber-200",   label: "President" },
  "Global Coordinator":    { Icon: Globe,      tone: "text-sky-700 bg-sky-50 border-sky-200",         label: "Global / NRI Coordinator" },
  "Regional Coordinator":  { Icon: MapPin,     tone: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Regional Coordinator" },
  "District President":    { Icon: Building2,  tone: "text-indigo-700 bg-indigo-50 border-indigo-200", label: "District President" },
  "Assembly Coordinator":  { Icon: UserIcon,   tone: "text-purple-700 bg-purple-50 border-purple-200", label: "Assembly Coordinator" },
};

// ---------------------------------------------------------------------
// Small leader badge used in every node of the tree.
// ---------------------------------------------------------------------
function LeaderBadge({
  row,
  showRole = false,
  small = false,
}: {
  row: Row;
  showRole?: boolean;
  small?: boolean;
}) {
  const meta = ROLE_META[row.role] || ROLE_META["Assembly Coordinator"];
  const Icon = meta.Icon;
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 ${
        small ? "py-0.5" : "py-1"
      } ${meta.tone}`}
    >
      <Icon size={small ? 12 : 14} />
      <div className="flex flex-col leading-none gap-0.5">
        <span className={`font-semibold leading-none ${small ? "text-[11px]" : "text-xs"}`}>
          {row.name || "—"}
        </span>
        {showRole && (
          <span className={`uppercase tracking-wide leading-none ${small ? "text-[8px]" : "text-[9px]"} opacity-70`}>
            {meta.label}
          </span>
        )}
      </div>
      {isRealPhone(row.whatsapp_number) && (
        <a
          href={`https://wa.me/${row.whatsapp_number.replace(/\D/g, "")}`}
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-1 text-[10px] text-gray-500 hover:text-emerald-700 hover:underline ml-1.5 leading-none"
          title="Open in WhatsApp"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone size={10} />
          {formatLeaderPhone(row.whatsapp_number)}
        </a>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Collapsible block — used to fold each level of the tree.
// ---------------------------------------------------------------------
function Collapsible({
  open,
  setOpen,
  header,
  childCount,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  header: React.ReactNode;
  childCount: number;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-start gap-2 w-full text-left"
      >
        <span className="mt-1 text-gray-400">
          {childCount > 0 ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="inline-block w-3.5" />}
        </span>
        <div className="flex-1">{header}</div>
        {childCount > 0 && (
          <span className="text-[10px] text-gray-400 mt-1.5 ml-2">
            {childCount} {childCount === 1 ? "child" : "children"}
          </span>
        )}
      </button>
      {open && childCount > 0 && (
        <div className="ml-5 mt-2 pl-3 border-l border-gray-200 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export default function OrgHierarchy() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void loadHierarchy();

    // Realtime: refresh the tree when leader rows change. Debounced so a
    // batch insert (e.g. saving a leader who covers 5 districts) only
    // triggers one reload. Falls back gracefully if the realtime
    // publication doesn't yet include these tables — the channel just
    // sits idle.
    let timer: number | null = null;
    const debounced = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadHierarchy(), 400);
    };
    const channel = supabase
      .channel("org-hierarchy-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "leader_assignments" }, debounced)
      .on("postgres_changes", { event: "*", schema: "public", table: "leaders_master" }, debounced)
      .subscribe();
    return () => {
      if (timer) window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, []);

  const loadHierarchy = async () => {
    setLoading(true);
    setErr(null);
    // Try the helper view first (new_28). If it doesn't exist yet,
    // fall back to the underlying tables joined manually.
    const view = await supabase
      .from("org_hierarchy_v")
      .select("*")
      .order("sort_order", { ascending: true });

    if (!view.error && view.data) {
      setRows(view.data as unknown as Row[]);
      setLoading(false);
      return;
    }

    // Fallback: join manually
    const { data, error } = await supabase
      .from("leader_assignments")
      .select(`
        id,
        role,
        district,
        constituency,
        sort_order,
        is_active,
        leaders_master (
          id, name, whatsapp_number, whatsapp_number_2, photo_url, is_active
        )
      `)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    type Joined = {
      id: string;
      role: string;
      district: string | null;
      constituency: string | null;
      sort_order: number | null;
      leaders_master: {
        id: string;
        name: string;
        whatsapp_number: string | null;
        whatsapp_number_2: string | null;
        photo_url: string | null;
        is_active: boolean;
      } | null;
    };
    const flat: Row[] = ((data as unknown as Joined[]) || [])
      .filter((r) => r.leaders_master?.is_active)
      .map((r) => ({
        assignment_id: r.id,
        role: r.role,
        district: r.district,
        constituency: r.constituency,
        sort_order: r.sort_order,
        leader_id: r.leaders_master!.id,
        name: r.leaders_master!.name,
        whatsapp_number: r.leaders_master!.whatsapp_number,
        whatsapp_number_2: r.leaders_master!.whatsapp_number_2,
        photo_url: r.leaders_master!.photo_url,
      }));
    setRows(flat);
    setLoading(false);
  };

  // Group helpers — pull rows by role / district / constituency.
  const president = useMemo(() => rows.find((r) => r.role === "President") || null, [rows]);
  const globals   = useMemo(() => rows.filter((r) => r.role === "Global Coordinator"), [rows]);

  // RC → districts they cover. We bucket by leader_id so an RC who covers
  // 5 districts shows once at the top with all 5 children grouped under.
  const regionals = useMemo(() => {
    const byLeader: Record<string, { rc: Row; districts: string[] }> = {};
    rows
      .filter((r) => r.role === "Regional Coordinator")
      .forEach((r) => {
        const key = r.leader_id;
        if (!byLeader[key]) byLeader[key] = { rc: r, districts: [] };
        if (r.district && !byLeader[key].districts.includes(r.district)) {
          byLeader[key].districts.push(r.district);
        }
      });
    return Object.values(byLeader).sort((a, b) => a.rc.name.localeCompare(b.rc.name));
  }, [rows]);

  const districtPresident = (district: string): Row | null =>
    rows.find((r) => r.role === "District President" && r.district === district) || null;

  const acsForDistrict = (district: string): Row[] =>
    rows
      .filter((r) => r.role === "Assembly Coordinator" && r.district === district)
      .sort((a, b) => (a.constituency || "").localeCompare(b.constituency || ""));

  // Search filter — narrows visible nodes by leader name, role, district,
  // or constituency. Empty query shows the full tree.
  const matches = (...parts: (string | null | undefined)[]) =>
    !search.trim() ||
    parts
      .filter(Boolean)
      .some((p) => (p as string).toLowerCase().includes(search.trim().toLowerCase()));

  const toggle = (k: string) => setOpenMap((m) => ({ ...m, [k]: !m[k] }));
  const isOpen = (k: string, defaultOpen = true) =>
    openMap[k] === undefined ? defaultOpen : openMap[k];

  const expandAll = () => {
    const keys: string[] = ["president", "globals"];
    regionals.forEach((rc) => {
      keys.push(`rc-${rc.rc.leader_id}`);
      rc.districts.forEach((d) => keys.push(`rc-${rc.rc.leader_id}-${d}`));
    });
    const next: Record<string, boolean> = {};
    keys.forEach((k) => (next[k] = true));
    setOpenMap(next);
  };
  const collapseAll = () => {
    const next: Record<string, boolean> = { president: true };
    regionals.forEach((rc) => {
      next[`rc-${rc.rc.leader_id}`] = false;
      rc.districts.forEach((d) => (next[`rc-${rc.rc.leader_id}-${d}`] = false));
    });
    setOpenMap(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        Loading org hierarchy…
      </div>
    );
  }
  if (err) {
    return (
      <div className="p-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
        Failed to load: {err}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* ===== Header ===== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-gray-900">Org Hierarchy</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Top-down view of the YSRCP leadership structure — President →
            Regional Coordinators → District Presidents → Assembly Coordinators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name / district / constituency"
              className="pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <button
            onClick={expandAll}
            className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Collapse all
          </button>
          <button
            onClick={() => void loadHierarchy()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
            title="Reload from database"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ===== Stat strip ===== */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
        {[
          { label: "President",            count: president ? 1 : 0,                  tone: "bg-amber-50 text-amber-700 border-amber-200" },
          { label: "Global Coordinator",   count: globals.length,                     tone: "bg-sky-50 text-sky-700 border-sky-200" },
          { label: "Regional Coordinators",count: regionals.length,                   tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
          { label: "District Presidents",  count: rows.filter(r => r.role === "District President").length,   tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
          { label: "Assembly Coordinators",count: rows.filter(r => r.role === "Assembly Coordinator").length, tone: "bg-purple-50 text-purple-700 border-purple-200" },
        ].map((c) => (
          <div key={c.label} className={`px-3 py-2 rounded-lg border ${c.tone}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{c.label}</div>
            <div className="text-lg font-bold">{c.count}</div>
          </div>
        ))}
      </div>

      {/* ===== Tree ===== */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 space-y-3">
        {/* PRESIDENT */}
        {president ? (
          <Collapsible
            open={isOpen("president")}
            setOpen={() => toggle("president")}
            childCount={globals.length + regionals.length}
            header={<LeaderBadge row={president} showRole />}
          >
            {/* Globals (Samba etc.) */}
            {globals
              .filter((g) => matches(g.name, g.role))
              .map((g) => (
                <div key={g.assignment_id}>
                  <LeaderBadge row={g} showRole />
                </div>
              ))}

            {/* RCs */}
            {regionals.map(({ rc, districts }) => {
              const rcKey = `rc-${rc.leader_id}`;
              // Show RC if RC name matches OR any descendant matches.
              const descendantMatch = districts.some((d) => {
                if (matches(d)) return true;
                const dp = districtPresident(d);
                if (dp && matches(dp.name)) return true;
                return acsForDistrict(d).some((ac) =>
                  matches(ac.name, ac.constituency)
                );
              });
              if (!matches(rc.name) && !descendantMatch) return null;

              return (
                <Collapsible
                  key={rcKey}
                  open={isOpen(rcKey)}
                  setOpen={() => toggle(rcKey)}
                  childCount={districts.length}
                  header={
                    <div className="flex items-center gap-2 flex-wrap">
                      <LeaderBadge row={rc} showRole />
                      <span className="text-[10px] text-gray-500">
                        {districts.length} district{districts.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  }
                >
                  {districts.map((d) => {
                    const dpKey = `rc-${rc.leader_id}-${d}`;
                    const dp = districtPresident(d);
                    const acs = acsForDistrict(d);
                    if (
                      !matches(d) &&
                      !(dp && matches(dp.name)) &&
                      !acs.some((ac) => matches(ac.name, ac.constituency))
                    )
                      return null;

                    return (
                      <Collapsible
                        key={dpKey}
                        open={isOpen(dpKey)}
                        setOpen={() => toggle(dpKey)}
                        childCount={acs.length}
                        header={
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700">
                              <Building2 size={12} className="text-indigo-600" />
                              {d}
                            </span>
                            {dp ? (
                              <LeaderBadge row={dp} small />
                            ) : (
                              <span className="text-[10px] italic text-gray-400 ml-1">
                                no district president
                              </span>
                            )}
                          </div>
                        }
                      >
                        {acs.length === 0 ? (
                          <div className="text-[10px] italic text-gray-400 pl-1">
                            no assembly coordinators
                          </div>
                        ) : (
                          acs
                            .filter((ac) => matches(ac.name, ac.constituency))
                            .map((ac) => (
                              <div
                                key={ac.assignment_id}
                                className="flex items-center gap-2 flex-wrap"
                              >
                                <span className="text-[10px] font-semibold text-gray-500 px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded">
                                  {ac.constituency || "—"}
                                </span>
                                <LeaderBadge row={ac} small />
                              </div>
                            ))
                        )}
                      </Collapsible>
                    );
                  })}
                </Collapsible>
              );
            })}
          </Collapsible>
        ) : (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <strong>No President seeded.</strong> Run migration{" "}
            <code className="text-[11px]">new_28_org_hierarchy.sql</code> to add YS
            Jagan as the President at the top of the tree.
          </div>
        )}
      </div>
    </div>
  );
}
