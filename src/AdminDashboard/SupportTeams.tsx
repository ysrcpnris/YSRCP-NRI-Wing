import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

type Team = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export default function SupportTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_teams")
      .select("*")
      .order("name", { ascending: true });
    if (error) setErr(error.message);
    else setTeams((data || []) as Team[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeams();
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

  const startEdit = (t: Team) => {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description || "");
    setErr(null);
    setInfo(null);
  };

  const toggleActive = async (t: Team) => {
    const { error } = await supabase
      .from("support_teams")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (error) setErr(error.message);
    else fetchTeams();
  };

  const removeTeam = async (t: Team) => {
    if (!confirm(`Delete team "${t.name}"? This cannot be undone.`)) return;
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary-600 mb-1">Support Teams</h1>
      <p className="text-gray-500 mb-6">
        Add or remove teams that appear in the Assistance "Assign Team" dropdown.
      </p>

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
                  <th className="px-3 py-2 text-left">Name</th>
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => (
                  <tr key={t.id} className="border-b hover:bg-blue-50">
                    <td className="px-3 py-2 font-semibold">{t.name}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {t.description || "-"}
                    </td>
                    <td className="px-3 py-2">
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
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
