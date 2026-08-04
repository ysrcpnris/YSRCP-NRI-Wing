import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Appointing and revoking wing roles.
 *
 * Used by BOTH the admin Wing Management screen and the chapter surface
 * at /chapter. The brief is explicit that a chapter lead appoints their
 * own team ("local to that chapter, student assistance or something
 * else in future"), and until now that existed only as an RPC — the
 * one UI calling grant_wing_role() was admin-only, and wing_roles_list()
 * did not return cluster-scoped grants, so a chapter lead could create
 * a role through a raw call and never see it again to revoke it.
 *
 * The component holds no authority of its own. grant_wing_role() and
 * revoke_wing_role() compute rank FOR THE TARGET SCOPE and refuse
 * anything at or above the caller's own level, so what a chapter lead
 * sees offered here is already bounded by what the database will accept.
 */

const WING_ROLES = [
  { value: "country_coordinator", label: "Country coordinator", scope: "country" },
  { value: "cluster_lead",        label: "Chapter lead",        scope: "cluster" },
  // A team lead belongs to a country OR to a single chapter. A chapter
  // lead can only create the chapter-scoped kind — the appointee never
  // gets wider scope than whoever appointed them.
  { value: "team_lead",           label: "Team lead (read-only)", scope: "either" },
  { value: "secretariat",         label: "Secretariat (whole wing)", scope: "none" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full h-10 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm " +
  "focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none";

function Banner({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className={`px-4 py-2.5 rounded-lg text-sm mb-4 border ${
        ok
          ? "bg-emerald-50 text-emerald-900 border-emerald-200"
          : "bg-red-50 text-red-900 border-red-200"
      }`}
    >
      {msg}
    </div>
  );
}

/* Shapes returned by wing_roles_list(), search_members() and the
   clusters table. Typed rather than `any` so a column removed from an
   RPC shows up here instead of as undefined at runtime. */
type RoleRow = {
  role_id: string;
  profile_id: string;
  member_name: string | null;
  email: string | null;
  role: string;
  country: string | null;
  chapter: string | null;
  cluster_id: string | null;
  title: string | null;
  granted_at: string;
  granted_by_name: string | null;
};

type ClusterRow = { id: string; name: string; country: string };

type MemberHit = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
};

export default function RoleManager() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [clusters, setClusters] = useState<ClusterRow[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<MemberHit[]>([]);
  const [pick, setPick] = useState<MemberHit | null>(null);
  const [role, setRole] = useState("country_coordinator");
  const [country, setCountry] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      supabase.rpc("wing_roles_list"),
      supabase.from("clusters").select("id, name, country").order("name"),
    ]);
    setRows((r as RoleRow[]) ?? []);
    setClusters((c as ClusterRow[]) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!q.trim()) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_members", { p_q: q });
      setFound((data as MemberHit[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const grant = async () => {
    if (!pick) return;
    const { data, error } = await supabase.rpc("grant_wing_role", {
      p_profile_id: pick.id,
      p_role: role,
      p_country: role === "secretariat" ? null : country || pick.country,
      // Sent for a chapter lead, and for a team lead when a chapter was
      // chosen — that is what makes a chapter-scoped team lead possible.
      p_cluster_id:
        role === "cluster_lead" || (role === "team_lead" && clusterId)
          ? clusterId || null
          : null,
      p_title: title || null,
    });
    const res = Array.isArray(data) ? data[0] : data;
    if (error || !res?.ok) {
      setMsg({ t: res?.message ?? "Could not grant that role.", ok: false });
      return;
    }
    setMsg({ t: res.message, ok: true });
    setPick(null); setQ(""); setTitle(""); setClusterId("");
    load();
  };

  const revoke = async (id: string) => {
    const { data } = await supabase.rpc("revoke_wing_role", { p_role_id: id });
    const res = Array.isArray(data) ? data[0] : data;
    setMsg({ t: res?.message ?? "Could not revoke.", ok: Boolean(res?.ok) });
    load();
  };

  const scope = WING_ROLES.find((r) => r.value === role)?.scope;
  const wantsCountry = scope === "country" || scope === "cluster" || scope === "either";
  const wantsCluster = scope === "cluster" || scope === "either";

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}

      <div className="p-5 bg-white border border-gray-200 rounded-xl mb-6">
        <h4 className="font-bold text-gray-900 mb-3">Appoint someone</h4>

        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className={inputCls + " pl-9"}
            placeholder="Search a member by name or email"
            value={pick ? `${pick.full_name} · ${pick.email}` : q}
            onChange={(e) => { setPick(null); setQ(e.target.value); }}
          />
          {found.length > 0 && !pick && (
            <ul className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200
                           rounded-lg shadow-lg max-h-56 overflow-auto">
              {found.map((m) => (
                <li key={m.id}
                    onClick={() => { setPick(m); setCountry(m.country ?? ""); setFound([]); }}
                    className="px-3 py-2 text-sm hover:bg-primary-50 cursor-pointer">
                  <span className="font-semibold">{m.full_name}</span>
                  <span className="text-gray-500 text-xs"> · {m.email} · {m.country}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Role">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              {WING_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </Field>

          {wantsCountry && (
            <Field label="Country">
              <input className={inputCls} value={country}
                     onChange={(e) => setCountry(e.target.value)}
                     placeholder="e.g. Germany" />
            </Field>
          )}

          {wantsCluster && (
            <Field label="Chapter">
              <select className={inputCls} value={clusterId}
                      onChange={(e) => setClusterId(e.target.value)}>
                <option value="">Choose…</option>
                {clusters
                  .filter((c) => !country || c.country === country)
                  .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}

          <Field label="Title (optional)">
            <input className={inputCls} value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   placeholder="e.g. Student Assistance Lead" />
          </Field>
        </div>

        {/* Read-only by design, and the scope depends on whether a
            chapter was named. Say both here, not only in a migration. */}
        {role === "team_lead" && (
          <p className="text-xs text-gray-500 mt-2">
            A team lead reads and edits nothing.{" "}
            {clusterId
              ? "With a chapter chosen, they see only that chapter."
              : "With no chapter chosen, they see the whole country — which only a country coordinator or administrator can grant."}
          </p>
        )}
        {role === "cluster_lead" && !clusterId && (
          <p className="text-xs text-amber-700 mt-2">
            Choose the chapter this lead will run.
          </p>
        )}

        <button
          onClick={grant}
          disabled={!pick}
          className="mt-4 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                     inline-flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
        >
          <Plus size={15} /> Grant role
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4 font-bold">Member</th>
              <th className="py-2 pr-4 font-bold">Role</th>
              <th className="py-2 pr-4 font-bold">Scope</th>
              <th className="py-2 pr-4 font-bold">Granted</th>
              <th className="py-2 font-bold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">
                Nobody holds a wing role yet.
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.role_id} className="border-b border-gray-100">
                <td className="py-2.5 pr-4">
                  <span className="font-semibold text-gray-900">{r.member_name}</span>
                  <span className="block text-xs text-gray-500">{r.email}</span>
                </td>
                <td className="py-2.5 pr-4">
                  {WING_ROLES.find((w) => w.value === r.role)?.label ?? r.role}
                  {r.title && <span className="block text-xs text-gray-500">{r.title}</span>}
                </td>
                <td className="py-2.5 pr-4 text-gray-700">
                  {r.chapter ? (
                    <>
                      {r.chapter}
                      <span className="block text-xs text-gray-400">
                        chapter · {r.country}
                      </span>
                    </>
                  ) : (
                    r.country || "Whole wing"
                  )}
                </td>
                <td className="py-2.5 pr-4 text-gray-500 text-xs whitespace-nowrap">
                  {new Date(r.granted_at).toLocaleDateString()}
                  {r.granted_by_name && <span className="block">by {r.granted_by_name}</span>}
                </td>
                <td className="py-2.5 text-right">
                  <button onClick={() => revoke(r.role_id)}
                          className="text-xs font-bold text-red-600 hover:text-red-700
                                     inline-flex items-center gap-1">
                    <Trash2 size={13} /> Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

