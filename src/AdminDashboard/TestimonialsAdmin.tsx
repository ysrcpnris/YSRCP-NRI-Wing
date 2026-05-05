import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { countriesData } from "../lib/countryCodes";
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Edit3,
  Save,
  X,
  RefreshCw,
  Quote as QuoteIcon,
} from "lucide-react";

/* ======================================================================
   TESTIMONIALS — admin CRUD for the home-page "Voices of Our Global
   Community" marquee. Replaces the previously hardcoded array.
====================================================================== */

type Row = {
  id: string;
  name: string;
  location: string;
  message: string;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const COUNTRY_NAMES = countriesData.map((c) => c.name).sort();

export default function TestimonialsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Add-form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit-row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("testimonials")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  const resetAddForm = () => {
    setName("");
    setLocation("");
    setMessage("");
  };

  const addTestimonial = async () => {
    if (!name.trim() || !location.trim() || !message.trim()) {
      alert("Please fill in name, location, and message.");
      return;
    }
    setAdding(true);
    const nextSort =
      rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order ?? 0)) + 1 : 0;
    const { error } = await supabase.from("testimonials").insert({
      name: name.trim(),
      location: location.trim(),
      message: message.trim(),
      sort_order: nextSort,
      is_active: true,
    });
    setAdding(false);
    if (error) {
      alert("Failed to add: " + error.message);
      return;
    }
    resetAddForm();
    void load();
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditLocation(row.location);
    setEditMessage(row.message);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editName.trim() || !editLocation.trim() || !editMessage.trim()) {
      alert("Please fill in all fields.");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("testimonials")
      .update({
        name: editName.trim(),
        location: editLocation.trim(),
        message: editMessage.trim(),
      })
      .eq("id", editingId);
    setSavingEdit(false);
    if (error) {
      alert("Failed to save: " + error.message);
      return;
    }
    setEditingId(null);
    void load();
  };

  const removeRow = async (id: string) => {
    if (!confirm("Delete this testimonial permanently?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
      return;
    }
    void load();
  };

  const toggleActive = async (row: Row) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      alert("Failed to update: " + error.message);
      return;
    }
    void load();
  };

  const moveRow = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const a = rows[index];
    const b = rows[target];
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    const { error: e1 } = await supabase
      .from("testimonials")
      .update({ sort_order: bOrder })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("testimonials")
      .update({ sort_order: aOrder })
      .eq("id", b.id);
    if (e1 || e2) {
      alert("Failed to reorder: " + (e1?.message || e2?.message));
    }
    void load();
  };

  const activeCount = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);
  const hiddenCount = rows.length - activeCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        Loading testimonials…
      </div>
    );
  }
  if (err) {
    return (
      <div className="m-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
        Failed to load: {err}
      </div>
    );
  }

  return (
    <div className="py-4 md:py-6 px-2 md:px-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-primary-700 flex items-center gap-2">
            <QuoteIcon size={22} className="text-amber-500" />
            Testimonials — Voices of Our Global Community
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quotes added here appear on the home page in the order shown.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 self-start"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* STAT STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
        <div className="px-3 py-2 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Active
          </div>
          <div className="text-lg font-bold">{activeCount}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border bg-gray-50 text-gray-700 border-gray-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Hidden
          </div>
          <div className="text-lg font-bold">{hiddenCount}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border bg-sky-50 text-sky-700 border-sky-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
            Total
          </div>
          <div className="text-lg font-bold">{rows.length}</div>
        </div>
      </div>

      {/* ADD FORM */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-primary-600" /> Add a testimonial
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. MR. Bharath Kandula"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Location (country)
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
            >
              <option value="">Select country…</option>
              {COUNTRY_NAMES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            Message
          </label>
          <textarea
            rows={3}
            placeholder="Their message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={addTestimonial}
            disabled={adding || !name.trim() || !location.trim() || !message.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {adding ? "Adding…" : "Add testimonial"}
          </button>
        </div>
      </div>

      {/* TABLE / LIST */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">
            {rows.length} {rows.length === 1 ? "testimonial" : "testimonials"}
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No testimonials yet. Use the form above to add the first one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row, idx) => {
              const isEditing = editingId === row.id;
              return (
                <li
                  key={row.id}
                  className={`flex items-start gap-3 px-4 py-3 transition ${
                    row.is_active ? "" : "bg-gray-50 opacity-60"
                  }`}
                >
                  {/* Move arrows */}
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      onClick={() => void moveRow(idx, -1)}
                      disabled={idx === 0 || isEditing}
                      className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => void moveRow(idx, 1)}
                      disabled={idx === rows.length - 1 || isEditing}
                      className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="border border-primary-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                            placeholder="Name"
                          />
                          <select
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value)}
                            className="border border-primary-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
                          >
                            <option value="">Select country…</option>
                            {COUNTRY_NAMES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          rows={3}
                          value={editMessage}
                          onChange={(e) => setEditMessage(e.target.value)}
                          className="w-full border border-primary-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-800 italic leading-relaxed">
                          "{row.message}"
                        </p>
                        <div className="mt-1.5 text-[11px] text-gray-500">
                          <span className="font-semibold text-gray-700">{row.name}</span>
                          <span className="mx-1.5 text-gray-300">·</span>
                          <span>{row.location}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => void saveEdit()}
                          disabled={savingEdit}
                          className="p-2 rounded-lg text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                          title="Save"
                        >
                          {savingEdit ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(row)}
                          className="p-2 rounded-lg text-primary-700 hover:bg-primary-50"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => void toggleActive(row)}
                          className={`p-2 rounded-lg transition ${
                            row.is_active
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-400 hover:bg-gray-100"
                          }`}
                          title={
                            row.is_active ? "Hide from home page" : "Show on home page"
                          }
                        >
                          {row.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button
                          onClick={() => void removeRow(row.id)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
