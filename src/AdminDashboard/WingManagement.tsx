import { useCallback, useEffect, useState } from "react";
import {
  Shield, MapPin, Link2, CalendarDays, Megaphone,
  Plus, Trash2, Search, Check, X, ExternalLink,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Wing management — the operational surface for everything slices 3, 4,
 * 6 and 8 built.
 *
 * Those slices shipped member-facing displays and database tables with
 * nothing to work them: roles, chapters, handles, appointment slots and
 * campaigns could only be created with direct SQL. A table with no way
 * to operate it is a schema plus a promise, so this is the other half.
 *
 * Every write goes through an RPC or a scoped policy — this screen holds
 * no authority of its own. An admin sees everything; a country
 * coordinator sees and edits only their own countries, because that is
 * what the functions return them.
 */

type Tab = "roles" | "chapters" | "handles" | "appointments" | "campaigns";

const TABS: { key: Tab; label: string; Icon: typeof Shield }[] = [
  { key: "roles", label: "Roles", Icon: Shield },
  { key: "chapters", label: "Chapters", Icon: MapPin },
  { key: "handles", label: "Handles & Groups", Icon: Link2 },
  { key: "appointments", label: "Appointments", Icon: CalendarDays },
  { key: "campaigns", label: "Campaigns", Icon: Megaphone },
];

const WING_ROLES = [
  { value: "country_coordinator", label: "Country coordinator", needs: "country" },
  { value: "cluster_lead", label: "Chapter lead", needs: "cluster" },
  { value: "team_lead", label: "Team lead (read-only)", needs: "country" },
  { value: "secretariat", label: "Secretariat (whole wing)", needs: "none" },
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

/* ── Roles ─────────────────────────────────────────────────────────── */
function RolesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<any[]>([]);
  const [pick, setPick] = useState<any>(null);
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
    setRows(r ?? []);
    setClusters(c ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!q.trim()) { setFound([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_members", { p_q: q });
      setFound(data ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const grant = async () => {
    if (!pick) return;
    const { data, error } = await supabase.rpc("grant_wing_role", {
      p_profile_id: pick.id,
      p_role: role,
      p_country: role === "secretariat" ? null : country || pick.country,
      p_cluster_id: role === "cluster_lead" ? clusterId || null : null,
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

  const needs = WING_ROLES.find((r) => r.value === role)?.needs;

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

          {needs !== "none" && (
            <Field label="Country">
              <input className={inputCls} value={country}
                     onChange={(e) => setCountry(e.target.value)}
                     placeholder="e.g. Germany" />
            </Field>
          )}

          {needs === "cluster" && (
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

        {/* Team lead is read-only by design — say so where it is chosen,
            not only in a migration comment. */}
        {role === "team_lead" && (
          <p className="text-xs text-gray-500 mt-2">
            A team lead can read their country’s members and cases but cannot
            edit anything.
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
                  {r.chapter || r.country || "Whole wing"}
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

/* ── Chapters ──────────────────────────────────────────────────────── */
function ChaptersTab() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [cityName, setCityName] = useState("");
  const [cityCluster, setCityCluster] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const [{ data: c }, { data: cc }] = await Promise.all([
      supabase.from("clusters").select("id, name, country").order("country"),
      supabase.from("cluster_cities").select("country, city, cluster_id").order("country"),
    ]);
    setClusters(c ?? []);
    setCities(cc ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addCluster = async () => {
    const { error } = await supabase.from("clusters").insert({ name, country });
    setMsg(error
      ? { t: "Only a wing administrator can change the chapter map.", ok: false }
      : { t: "Chapter created.", ok: true });
    if (!error) { setName(""); setCountry(""); load(); }
  };

  const addCity = async () => {
    const cl = clusters.find((c) => c.id === cityCluster);
    if (!cl) return;
    const { error } = await supabase.from("cluster_cities")
      .insert({ country: cl.country, city: cityName, cluster_id: cl.id });
    setMsg(error
      ? { t: "Could not add that city — it may already belong to a chapter.", ok: false }
      : { t: "City added.", ok: true });
    if (!error) { setCityName(""); load(); }
  };

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}
      <p className="text-sm text-gray-600 mb-4">
        A city belongs to exactly one chapter, so a member’s city always
        resolves to a single team. Only wing administrators can change this
        map.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <h4 className="font-bold text-gray-900 mb-3">New chapter</h4>
          <div className="space-y-3">
            <Field label="Name">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="e.g. USA — Pacific Northwest" />
            </Field>
            <Field label="Country">
              <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)}
                     placeholder="e.g. United States" />
            </Field>
            <button onClick={addCluster} disabled={!name || !country}
                    className="h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                               disabled:opacity-50 hover:bg-primary-700">
              Create chapter
            </button>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <h4 className="font-bold text-gray-900 mb-3">Add a city to a chapter</h4>
          <div className="space-y-3">
            <Field label="Chapter">
              <select className={inputCls} value={cityCluster}
                      onChange={(e) => setCityCluster(e.target.value)}>
                <option value="">Choose…</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.country}</option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input className={inputCls} value={cityName}
                     onChange={(e) => setCityName(e.target.value)} placeholder="e.g. Portland" />
            </Field>
            <button onClick={addCity} disabled={!cityName || !cityCluster}
                    className="h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                               disabled:opacity-50 hover:bg-primary-700">
              Add city
            </button>
          </div>
        </div>
      </div>

      <h4 className="font-bold text-gray-900 mt-8 mb-3">
        {clusters.length} chapters · {cities.length} cities
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {clusters.map((c) => (
          <div key={c.id} className="p-4 bg-white border border-gray-200 rounded-xl">
            <p className="font-bold text-gray-900 text-sm">{c.name}</p>
            <p className="text-xs text-gray-500">{c.country}</p>
            <p className="text-xs text-gray-600 mt-2">
              {cities.filter((x) => x.cluster_id === c.id).map((x) => x.city).join(", ") ||
               "No cities yet"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Handles ───────────────────────────────────────────────────────── */
function HandlesTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [form, setForm] = useState({
    scope: "chapter", platform: "whatsapp", label: "", url: "",
    cluster_id: "", member_count: "", description: "",
  });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const [{ data: h }, { data: c }] = await Promise.all([
      supabase.from("social_handles")
        .select("id, scope, platform, label, url, country, member_count, count_as_of, cluster_id")
        .order("scope").order("label"),
      supabase.from("clusters").select("id, name, country").order("name"),
    ]);
    setRows(h ?? []);
    setClusters(c ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const cl = clusters.find((c) => c.id === form.cluster_id);
    if (form.scope === "chapter" && !cl) {
      setMsg({ t: "Pick the chapter this belongs to.", ok: false });
      return;
    }
    const { error } = await supabase.from("social_handles").insert({
      scope: form.scope,
      platform: form.platform,
      label: form.label,
      url: form.url,
      cluster_id: form.scope === "chapter" ? cl!.id : null,
      // country must match the cluster's — a composite FK enforces it,
      // so deriving it here rather than asking is the only safe option.
      country: form.scope === "chapter" ? cl!.country : null,
      member_count: form.member_count ? Number(form.member_count) : null,
      count_as_of: form.member_count ? new Date().toISOString().slice(0, 10) : null,
      description: form.description || null,
    });
    setMsg(error
      ? { t: error.message.includes("foreign key")
            ? "That chapter is not in that country."
            : "Could not save — you may not cover that chapter.", ok: false }
      : { t: "Handle saved.", ok: true });
    if (!error) { setForm({ ...form, label: "", url: "", member_count: "", description: "" }); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("social_handles").delete().eq("id", id);
    setMsg(error ? { t: "Could not remove that one.", ok: false }
                 : { t: "Removed.", ok: true });
    load();
  };

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}
      <p className="text-sm text-gray-600 mb-4">
        Chapter handles are visible only to that chapter’s members. National
        ones are visible to everybody and are administrator-only.
        WhatsApp cannot report group size, so any member count you enter is
        shown with the date you entered it.
      </p>

      <div className="p-5 bg-white border border-gray-200 rounded-xl mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Scope">
            <select className={inputCls} value={form.scope}
                    onChange={(e) => setForm({ ...form, scope: e.target.value })}>
              <option value="chapter">Chapter</option>
              <option value="national">National (admin only)</option>
            </select>
          </Field>
          {form.scope === "chapter" && (
            <Field label="Chapter">
              <select className={inputCls} value={form.cluster_id}
                      onChange={(e) => setForm({ ...form, cluster_id: e.target.value })}>
                <option value="">Choose…</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.country}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Platform">
            <select className={inputCls} value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value })}>
              {["whatsapp","telegram","x","facebook","instagram","youtube","website"]
                .map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Label">
            <input className={inputCls} value={form.label}
                   onChange={(e) => setForm({ ...form, label: e.target.value })}
                   placeholder="e.g. Germany — Members Group" />
          </Field>
          <Field label="Link">
            <input className={inputCls} value={form.url}
                   onChange={(e) => setForm({ ...form, url: e.target.value })}
                   placeholder="https://…" />
          </Field>
          <Field label="Members (optional)">
            <input className={inputCls} type="number" value={form.member_count}
                   onChange={(e) => setForm({ ...form, member_count: e.target.value })}
                   placeholder="e.g. 240" />
          </Field>
        </div>
        <button onClick={add} disabled={!form.label || !form.url}
                className="mt-4 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                           disabled:opacity-50 hover:bg-primary-700">
          Save handle
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((h) => (
          <div key={h.id}
               className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
            <span className="text-xs font-bold uppercase w-20 shrink-0 text-gray-500">
              {h.platform}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-gray-900 truncate">{h.label}</p>
              <p className="text-xs text-gray-500 truncate">
                {h.scope === "national" ? "National" : h.country}
                {h.member_count ? ` · ≈${h.member_count} as of ${h.count_as_of}` : ""}
              </p>
            </div>
            <a href={h.url} target="_blank" rel="noopener noreferrer"
               className="text-gray-400 hover:text-primary-600 shrink-0">
              <ExternalLink size={15} />
            </a>
            <button onClick={() => remove(h.id)}
                    className="text-red-500 hover:text-red-700 shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Appointments ──────────────────────────────────────────────────── */
function AppointmentsTab() {
  const [slots, setSlots] = useState<any[]>([]);
  const [openSlot, setOpenSlot] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", starts_at: "", ends_at: "", capacity: "1",
    mode: "manual", country: "", virtual_link: "", venue: "", notes_label: "",
  });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("slots_i_manage");
    setSlots(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openBookings = async (id: string) => {
    if (openSlot === id) { setOpenSlot(null); return; }
    const { data } = await supabase.rpc("slot_bookings", { p_slot_id: id });
    setBookings(data ?? []);
    setOpenSlot(id);
  };

  const decide = async (bookingId: string, decision: string) => {
    const { data } = await supabase.rpc("decide_booking", {
      p_booking_id: bookingId, p_decision: decision,
    });
    const res = Array.isArray(data) ? data[0] : data;
    setMsg({ t: res?.message ?? "Could not save.", ok: Boolean(res?.ok) });
    if (openSlot) {
      const { data: b } = await supabase.rpc("slot_bookings", { p_slot_id: openSlot });
      setBookings(b ?? []);
    }
    load();
  };

  const create = async () => {
    // new Date('').toISOString() throws RangeError, which would escape
    // this handler and leave the form dead with no message. Validate
    // before converting.
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setMsg({ t: "Please give the appointment a valid start and end time.", ok: false });
      return;
    }
    if (end <= start) {
      setMsg({ t: "The end time must be after the start time.", ok: false });
      return;
    }

    const { error } = await supabase.from("appointment_slots").insert({
      title: form.title,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
      capacity: Number(form.capacity) || 1,
      mode: form.mode,
      country: form.country || null,
      virtual_link: form.virtual_link || null,
      venue: form.venue || null,
      notes_label: form.notes_label || null,
      is_published: true,
    });
    setMsg(error
      ? { t: form.country
            ? "Could not create — you may not cover that country."
            : "A wing-wide appointment can only be created by an administrator.",
          ok: false }
      : { t: "Appointment published.", ok: true });
    if (!error) { setForm({ ...form, title: "", starts_at: "", ends_at: "" }); load(); }
  };

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}
      <div className="p-5 bg-white border border-gray-200 rounded-xl mb-6">
        <h4 className="font-bold text-gray-900 mb-3">New appointment</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Title">
            <input className={inputCls} value={form.title}
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Starts">
            <input className={inputCls} type="datetime-local" value={form.starts_at}
                   onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
          </Field>
          <Field label="Ends">
            <input className={inputCls} type="datetime-local" value={form.ends_at}
                   onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
          </Field>
          <Field label="Seats">
            <input className={inputCls} type="number" min={1} value={form.capacity}
                   onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </Field>
          <Field label="Admission">
            <select className={inputCls} value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="manual">By request — you approve each one</option>
              <option value="auto">First come, first served</option>
            </select>
          </Field>
          <Field label="Country (blank = whole wing)">
            <input className={inputCls} value={form.country}
                   onChange={(e) => setForm({ ...form, country: e.target.value })}
                   placeholder="e.g. Germany" />
          </Field>
          <Field label="Online link (optional)">
            <input className={inputCls} value={form.virtual_link}
                   onChange={(e) => setForm({ ...form, virtual_link: e.target.value })} />
          </Field>
          <Field label="Venue (optional)">
            <input className={inputCls} value={form.venue}
                   onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </Field>
          <Field label="Ask the member (optional)">
            <input className={inputCls} value={form.notes_label}
                   onChange={(e) => setForm({ ...form, notes_label: e.target.value })}
                   placeholder="What would you like to discuss?" />
          </Field>
        </div>
        {/* The meeting link is only revealed to a member once their
            booking is confirmed — worth saying here so an organiser
            knows it is safe to fill in on a by-request slot. */}
        <p className="text-xs text-gray-500 mt-2">
          The online link is shown only to members whose booking is confirmed.
        </p>
        <button onClick={create} disabled={!form.title || !form.starts_at || !form.ends_at}
                className="mt-4 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                           disabled:opacity-50 hover:bg-primary-700">
          Publish
        </button>
      </div>

      <div className="space-y-3">
        {slots.length === 0 && (
          <p className="text-sm text-gray-500">No appointments yet.</p>
        )}
        {slots.map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => openBookings(s.id)}
                    className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-gray-50">
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{s.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(s.starts_at).toLocaleString()} ·{" "}
                  {s.mode === "manual" ? "by request" : "first come"} ·{" "}
                  {s.country || "whole wing"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-bold tabular-nums text-gray-900">
                  {s.confirmed}/{s.capacity}
                </span>
                {Number(s.pending) > 0 && (
                  <span className="block text-xs font-bold text-amber-700">
                    {s.pending} waiting
                  </span>
                )}
              </div>
            </button>

            {openSlot === s.id && (
              <div className="border-t border-gray-100 divide-y divide-gray-100">
                {bookings.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">Nobody has booked yet.</p>
                )}
                {bookings.map((b) => (
                  <div key={b.booking_id} className="p-4 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900">{b.member_name}</p>
                      <p className="text-xs text-gray-500">
                        {b.member_email} · {b.member_city}
                      </p>
                      {b.member_note && (
                        <p className="text-xs text-gray-600 mt-1 italic">“{b.member_note}”</p>
                      )}
                    </div>
                    {b.status === "pending" ? (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => decide(b.booking_id, "confirmed")}
                                className="h-9 px-3 rounded-lg bg-primary-600 text-white text-xs
                                           font-bold inline-flex items-center gap-1">
                          <Check size={13} /> Confirm
                        </button>
                        <button onClick={() => decide(b.booking_id, "declined")}
                                className="h-9 px-3 rounded-lg border border-gray-300 text-xs
                                           font-bold text-gray-700 inline-flex items-center gap-1">
                          <X size={13} /> Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-gray-500 shrink-0">{b.status}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Campaigns ─────────────────────────────────────────────────────── */
function CampaignsTab() {
  const [stats, setStats] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", brief: "", share_text: "", target_url: "",
    hashtags: "", country: "",
  });
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("campaign_stats");
    setStats(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    const { error } = await supabase.from("campaigns").insert({
      title: form.title,
      brief: form.brief || null,
      share_text: form.share_text,
      target_url: form.target_url,
      hashtags: form.hashtags || null,
      country: form.country || null,
      is_published: true,
    });
    setMsg(error
      ? { t: form.country
            ? "Could not create — you may not cover that country."
            : "A wing-wide campaign can only be created by an administrator.",
          ok: false }
      : { t: "Campaign published.", ok: true });
    if (!error) { setForm({ ...form, title: "", share_text: "", target_url: "" }); load(); }
  };

  return (
    <div>
      {msg && <Banner msg={msg.t} ok={msg.ok} />}
      <div className="p-5 bg-white border border-gray-200 rounded-xl mb-6">
        <h4 className="font-bold text-gray-900 mb-3">New campaign</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title">
            <input className={inputCls} value={form.title}
                   onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Country (blank = whole wing)">
            <input className={inputCls} value={form.country}
                   onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="Link to share">
            <input className={inputCls} value={form.target_url}
                   onChange={(e) => setForm({ ...form, target_url: e.target.value })}
                   placeholder="https://…" />
          </Field>
          <Field label="Hashtags">
            <input className={inputCls} value={form.hashtags}
                   onChange={(e) => setForm({ ...form, hashtags: e.target.value })}
                   placeholder="#YSRCP #NRIWing" />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="The post members will share">
            <textarea rows={3} value={form.share_text}
                      onChange={(e) => setForm({ ...form, share_text: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-sm
                                 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none resize-none" />
          </Field>
        </div>
        <button onClick={create}
                disabled={!form.title || !form.share_text || !form.target_url}
                className="mt-4 h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                           disabled:opacity-50 hover:bg-primary-700">
          Publish
        </button>
      </div>

      <h4 className="font-bold text-gray-900 mb-3">Performance</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <th className="py-2 pr-4 font-bold">Campaign</th>
              <th className="py-2 pr-4 font-bold">Scope</th>
              <th className="py-2 pr-4 font-bold text-right">Sharers</th>
              <th className="py-2 pr-4 font-bold text-right">Shares</th>
              <th className="py-2 font-bold text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-center text-gray-500">
                No campaigns yet.
              </td></tr>
            )}
            {stats.map((c) => (
              <tr key={c.campaign_id} className="border-b border-gray-100">
                <td className="py-2.5 pr-4 font-semibold text-gray-900">{c.title}</td>
                <td className="py-2.5 pr-4 text-gray-600">{c.country || "Whole wing"}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{c.sharers}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums">{c.shares}</td>
                <td className="py-2.5 text-right tabular-nums">{c.clicks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Honesty about what the number is. */}
      <p className="text-xs text-gray-400 mt-3">
        Clicks are counted at most <strong>once per link per hour</strong>, so
        several people following the same member’s link within an hour count
        once. That is a deliberate floor against inflation, and it means these
        numbers <strong>understate</strong> real reach rather than estimating
        it. They are not unique visitors, and we cannot see what anyone liked
        or reposted on a social platform.
      </p>
    </div>
  );
}

export default function WingManagement() {
  const [tab, setTab] = useState<Tab>("roles");
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Wing management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Roles, chapters, handles, appointments and campaigns.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
                  className={`h-10 px-4 text-sm font-bold border-b-2 -mb-px whitespace-nowrap
                              inline-flex items-center gap-2 transition-colors ${
                    tab === t.key
                      ? "border-primary-600 text-primary-700"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "roles" && <RolesTab />}
      {tab === "chapters" && <ChaptersTab />}
      {tab === "handles" && <HandlesTab />}
      {tab === "appointments" && <AppointmentsTab />}
      {tab === "campaigns" && <CampaignsTab />}
    </div>
  );
}
