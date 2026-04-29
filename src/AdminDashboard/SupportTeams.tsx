import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  UserMinus,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "../lib/supabase";

// Returned by admin_support_teams_overview() RPC.
type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  claimed_by_profile_id: string | null;
  member_first_name: string | null;
  member_last_name: string | null;
  member_email: string | null;
  member_mobile: string | null;
  total_assigned: number;
  total_resolved: number;
};

export default function SupportTeams() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_support_teams_overview");
    if (error) setErr(error.message);
    else setTeams((data || []) as TeamRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
    // Live: when a member claims/releases a seat (or admin force-releases),
    // the row's claimed_by_profile_id changes — re-pull the overview.
    const channel = supabase
      .channel("admin-support-teams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_teams" },
        () => fetchTeams()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_requests" },
        () => fetchTeams()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setEditingId(null);
  };

  const saveTeam = async () => {
    setErr(null);
    setInfo(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErr("Team name is required.");
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("support_teams")
        .update({ name: trimmed, description: description.trim() || null })
        .eq("id", editingId);
      if (error) {
        setErr(error.message);
        return;
      }
      setInfo("Team updated.");
    } else {
      const { error } = await supabase
        .from("support_teams")
        .insert({ name: trimmed, description: description.trim() || null });
      if (error) {
        setErr(error.message);
        return;
      }
      setInfo("Team added.");
    }
    resetForm();
    fetchTeams();
  };

  const startEdit = (t: TeamRow) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description || "");
    setErr(null);
    setInfo(null);
  };

  const toggleActive = async (t: TeamRow) => {
    const { error } = await supabase
      .from("support_teams")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) setErr(error.message);
    else fetchTeams();
  };

  const removeTeam = async (t: TeamRow) => {
    const claimed = !!t.claimed_by_profile_id;
    const msg = claimed
      ? `Delete team "${t.name}"? It is currently held by ${t.member_email || "a support team member"}. ` +
        `Deleting frees their seat — they'll see a "no seat" notice and can delete their account or wait to be re-assigned. Existing assigned requests stay in the database.`
      : `Delete team "${t.name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    const { error } = await supabase
      .from("support_teams")
      .delete()
      .eq("id", t.id);
    if (error) setErr(error.message);
    else {
      setInfo(`Deleted "${t.name}".`);
      fetchTeams();
    }
  };

  const releaseSeat = async (t: TeamRow) => {
    if (!t.claimed_by_profile_id) return;
    if (
      !confirm(
        `Release seat held by ${t.member_email || "the current member"}? ` +
          `They keep their account but lose access to "${t.name}". The seat reopens for someone else.`
      )
    )
      return;
    const { error, data } = await supabase.rpc("admin_release_support_team", {
      p_team_id: t.id,
    });
    if (error || (data && data.ok === false)) {
      setErr(error?.message || `Could not release: ${data?.reason || "unknown"}`);
    } else {
      setInfo("Seat released.");
      fetchTeams();
    }
  };

  // ---------------- DERIVED ----------------
  const stats = useMemo(() => {
    const total = teams.length;
    const claimed = teams.filter((t) => !!t.claimed_by_profile_id).length;
    const active = teams.filter((t) => t.is_active).length;
    return { total, claimed, active };
  }, [teams]);

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-primary-600">Support Teams</h1>
        <button
          onClick={fetchTeams}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>
      <p className="text-gray-500 mb-6">
        Add or remove teams. Each team can be claimed by one support-team member who registers
        at <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">/support-teams</code>.
      </p>

      {/* COUNTERS */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Total teams" value={stats.total} />
        <Stat label="Active" value={stats.active} tone="emerald" />
        <Stat label="Claimed" value={stats.claimed} tone="primary" />
      </div>

      {/* FORM */}
      <div className="bg-white border rounded-xl shadow-sm p-5 mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? "Edit Team" : "Add New Team"}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input
            className="border p-2 rounded"
            placeholder="Team name (e.g. Legal Cell AP)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {err && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-2">
            {err}
          </p>
        )}
        {info && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 rounded mb-2">
            {info}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={saveTeam}
            className="bg-primary-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
          >
            <Plus size={16} />
            {editingId ? "Save Changes" : "Add Team"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white border rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold mb-4">All Teams</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-500">No teams yet. Add one above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left">Team</th>
                  <th className="px-3 py-2 text-left">Held by</th>
                  <th className="px-3 py-2 text-left">Issues solved</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  const memberName =
                    [t.member_first_name, t.member_last_name].filter(Boolean).join(" ") ||
                    null;
                  const claimed = !!t.claimed_by_profile_id;
                  return (
                    <tr key={t.id} className="border-b hover:bg-blue-50/40 align-top">
                      <td className="px-3 py-3">
                        <p className="font-semibold">{t.name}</p>
                        {t.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {t.description}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {claimed ? (
                          <div className="text-[12px]">
                            <p className="font-bold text-gray-900">{memberName || "—"}</p>
                            {t.member_email && (
                              <p className="text-gray-600 inline-flex items-center gap-1.5">
                                <Mail size={11} /> {t.member_email}
                              </p>
                            )}
                            {t.member_mobile && (
                              <p className="text-gray-600 inline-flex items-center gap-1.5">
                                <Phone size={11} /> {t.member_mobile}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[12px] italic text-gray-400">
                            Open — no claim
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-[12px]">
                        <span className="font-bold text-emerald-700">
                          {t.total_resolved}
                        </span>{" "}
                        <span className="text-gray-500">/ {t.total_assigned}</span>
                      </td>
                      <td className="px-3 py-3">
                        {t.is_active ? (
                          <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold">
                            <CheckCircle2 size={14} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-semibold">
                            <XCircle size={14} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => startEdit(t)}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                            title="Edit"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => toggleActive(t)}
                            className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-xs"
                            title={t.is_active ? "Deactivate" : "Activate"}
                          >
                            {t.is_active ? "Deactivate" : "Activate"}
                          </button>
                          {claimed && (
                            <button
                              onClick={() => releaseSeat(t)}
                              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 text-xs"
                              title="Release the current member's seat"
                            >
                              <UserMinus size={14} /> Release seat
                            </button>
                          )}
                          <button
                            onClick={() => removeTeam(t)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 text-xs"
                            title="Delete"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: number;
  tone?: "gray" | "primary" | "emerald";
}) {
  const palette = {
    gray:    "bg-gray-50 text-gray-700 border-gray-200",
    primary: "bg-primary-50 text-primary-700 border-primary-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${palette}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  );
}
