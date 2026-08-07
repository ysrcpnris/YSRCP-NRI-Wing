import { useCallback, useEffect, useMemo, useState } from "react";
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
 * did not return chapter-scoped grants, so a chapter lead could create
 * a role through a raw call and never see it again to revoke it.
 *
 * The component holds no authority of its own. grant_wing_role() and
 * revoke_wing_role() compute rank FOR THE TARGET SCOPE and refuse
 * anything at or above the caller's own level, so what a chapter lead
 * sees offered here is already bounded by what the database will accept.
 */

/* rank mirrors public.role_rank(). The database refuses anything at or
   above the caller's own level in the target scope, so this list only
   decides what is worth OFFERING — it is not the control. */
const WING_ROLES = [
  { value: "country_coordinator", label: "Country coordinator", scope: "country", rank: 2 },
  { value: "chapter_lead",        label: "Chapter lead",        scope: "chapter", rank: 3 },
  // A team lead belongs to a country OR to a single chapter. A chapter
  // lead can only create the chapter-scoped kind — the appointee never
  // gets wider scope than whoever appointed them.
  { value: "team_lead",           label: "Team lead (read-only)", scope: "either", rank: 4 },
  { value: "secretariat",         label: "Secretariat (whole wing)", scope: "none", rank: 1 },
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
   chapters table. Typed rather than `any` so a column removed from an
   RPC shows up here instead of as undefined at runtime. */
type RoleRow = {
  role_id: string;
  profile_id: string;
  member_name: string | null;
  email: string | null;
  role: string;
  country: string | null;
  chapter: string | null;
  chapter_id: string | null;
  title: string | null;
  granted_at: string;
  granted_by_name: string | null;
};

type GrantOption = {
  scope_kind: "global" | "country" | "chapter";
  country: string | null;
  chapter_id: string | null;
  chapter_name: string | null;
  roles: string[];
};

/* Stable identity for a scope row, used as the <select> value. */
const optionKey = (o: GrantOption) =>
  `${o.scope_kind}:${o.chapter_id ?? o.country ?? "wing"}`;

const optionLabel = (o: GrantOption) =>
  o.scope_kind === "global"
    ? "The whole wing"
    : o.scope_kind === "chapter"
    ? `${o.chapter_name} · ${o.country}`
    : `${o.country} (country-wide)`;

type MemberHit = {
  id: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  city: string | null;
};

export default function RoleManager() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<MemberHit[]>([]);
  const [pick, setPick] = useState<MemberHit | null>(null);
  const [role, setRole] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  /**
   * What this caller may appoint, and where — answered by the server.
   *
   * This was previously derived client-side from my_role_rank(), a
   * single GLOBAL number, while grant_wing_role() computes rank for the
   * TARGET scope. A Germany coordinator who also leads a USA chapter
   * was offered USA operations the database then refused, and
   * secretariat could never be offered at all: it is rank 1 and the
   * filter was `rank > myRank`, so an admin at rank 1 failed `1 > 1`.
   *
   * my_grant_options() returns the legal combinations. Nothing here
   * derives capability — it renders what it is given, and sends back
   * the scope it was handed rather than free-typed fields.
   */
  const [options, setOptions] = useState<GrantOption[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [scopeKey, setScopeKey] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("wing_roles_list");
    setRows((data as RoleRow[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    (async () => {
      const { data, error } = await supabase.rpc("my_grant_options");
      if (error) console.error("my_grant_options failed:", error);
      setOptions((data as GrantOption[]) ?? []);
      setOptionsLoaded(true);
    })();
  }, [load]);

  // Debounced member search.
  useEffect(() => {
    if (!q.trim()) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_members", { p_q: q });
      setFound((data as MemberHit[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const chosen = options.find((o) => optionKey(o) === scopeKey) ?? options[0];
  // Memoised: a fresh [] each render would retrigger the effect below
  // forever.
  const rolesHere = useMemo(() => chosen?.roles ?? [], [chosen]);

  // Keep the two selects consistent as the options arrive.
  useEffect(() => {
    if (options.length && !options.some((o) => optionKey(o) === scopeKey)) {
      setScopeKey(optionKey(options[0]));
    }
  }, [options, scopeKey]);

  useEffect(() => {
    if (rolesHere.length && !rolesHere.includes(role)) setRole(rolesHere[0]);
  }, [rolesHere, role]);

  const grant = async () => {
    if (!pick || !chosen) return;
    const { data, error } = await supabase.rpc("grant_wing_role", {
      p_profile_id: pick.id,
      p_role: role,
      // Scope comes from the option the server offered, never from a
      // free-typed field — so a request cannot describe a scope the
      // caller was never given.
      p_country: chosen.scope_kind === "global" ? null : chosen.country,
      p_chapter_id: chosen.scope_kind === "chapter" ? chosen.chapter_id : null,
      p_title: title || null,
      p_reason: reason.trim() || null,
    });
    const res = Array.isArray(data) ? data[0] : data;
    if (error || !res?.ok) {
      setMsg({ t: res?.message ?? "Could not grant that role.", ok: false });
      return;
    }
    setMsg({ t: res.message, ok: true });
    setPick(null); setQ(""); setTitle(""); setReason("");
    load();
  };

  const revoke = async (id: string) => {
    const reasonText = window.prompt("Reason for revoking this role (optional):") ?? undefined;
    const { data } = await supabase.rpc("revoke_wing_role", {
      p_role_id: id,
      p_reason: reasonText?.trim() || null,
    });
    const res = Array.isArray(data) ? data[0] : data;
    setMsg({ t: res?.message ?? "Could not revoke.", ok: Boolean(res?.ok) });
    load();
  };

  const canAppoint = !optionsLoaded || options.length > 0;

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}

      {optionsLoaded && options.length === 0 && (
        <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl mb-6">
          <p className="font-bold text-gray-900">You can’t appoint anyone</p>
          <p className="text-sm text-gray-600 mt-1">
            Appointments are made by someone senior to the role being granted,
            within a country or chapter they cover. Ask your coordinator or a
            wing administrator.
          </p>
        </div>
      )}

      {canAppoint && (
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
                      onClick={() => { setPick(m); setFound([]); }}
                      className="px-3 py-2 text-sm hover:bg-primary-50 cursor-pointer">
                    <span className="font-semibold">{m.full_name}</span>
                    <span className="text-gray-500 text-xs"> · {m.email} · {m.country}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Scope first — it decides which roles are legal there. */}
            <Field label="Where">
              <select className={inputCls} value={scopeKey}
                      onChange={(e) => setScopeKey(e.target.value)}>
                {options.map((o) => (
                  <option key={optionKey(o)} value={optionKey(o)}>
                    {optionLabel(o)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Role">
              <select className={inputCls} value={role}
                      onChange={(e) => setRole(e.target.value)}>
                {rolesHere.map((r: string) => (
                  <option key={r} value={r}>
                    {WING_ROLES.find((w) => w.value === r)?.label ?? r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Title (optional)">
              <input className={inputCls} value={title}
                     onChange={(e) => setTitle(e.target.value)}
                     placeholder="e.g. Student Assistance Lead" />
            </Field>

            <Field label="Reason (optional)">
              <input className={inputCls} value={reason}
                     onChange={(e) => setReason(e.target.value)}
                     placeholder="e.g. filling a gap ahead of the summit" />
            </Field>
          </div>

          {role === "team_lead" && (
            <p className="text-xs text-gray-500 mt-2">
              A team lead reads and edits nothing.{" "}
              {chosen?.scope_kind === "chapter"
                ? "Scoped to this chapter."
                : "Scoped to the whole country."}
            </p>
          )}

          <button
            onClick={grant}
            disabled={!pick || !chosen}
            className="mt-4 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                       inline-flex items-center gap-2 hover:bg-primary-700 disabled:opacity-50"
          >
            <Plus size={15} /> Grant role
          </button>
        </div>
      )}

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
                Nobody holds a wing role here yet.
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
