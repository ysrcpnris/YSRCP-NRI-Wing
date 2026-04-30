import { useEffect, useMemo, useState } from "react";
import { Plus, Edit3, Trash2, Upload, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { indianAddressData } from "../lib/indianAddressData";

/* ======================================================
   TYPES
====================================================== */
type LeaderMaster = {
  id: string;
  name: string;
  whatsapp_number: string;
  whatsapp_number_2?: string | null;
  photo_url?: string | null;
  is_active: boolean;
};

type LeaderAssignment = {
  id: string;
  leader_id: string;
  role: string;
  district: string | null;
  constituency: string | null;
  is_active: boolean;
};

// One row per leader after grouping. The shared role lives at the top
// (every leader currently uses one role across their assignments) and the
// list of (district, constituency) tuples lives in `assignments`.
type LeaderRow = {
  leader: LeaderMaster;
  role: string;
  assignments: LeaderAssignment[];
};

// Each entry the admin adds in the modal. For non-AC roles `constituency`
// stays empty; the database column is set to NULL on save.
type AssignmentDraft = {
  state: string;
  district: string;
  constituency: string;
};

const LEADER_PHOTO_BUCKET = "leader-photos";

const ROLES = [
  "Global Coordinator",
  "Regional Coordinator",
  "District President",
  "Assembly Coordinator",
];

const isGlobalRole = (r: string) => r === "Global Coordinator";
// Only Assembly Coordinator is district + constituency. The rest are
// district-only (or none, for Global).
const needsConstituency = (r: string) => r === "Assembly Coordinator";

/* ======================================================
   COMPONENT
====================================================== */
export default function MasterData() {
  /* ---------------- FILTERS ---------------- */
  const [state, setState]               = useState("");
  const [district, setDistrict]         = useState("");
  const [constituency, setConstituency] = useState("");
  const [role, setRole]                 = useState("");

  /* ---------------- DATA ---------------- */
  const [leaderRows, setLeaderRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading]       = useState(false);

  /* ---------------- MODALS ---------------- */
  const [showModal, setShowModal] = useState(false);
  // editLeaderId is null when creating, set when editing.
  const [editLeaderId, setEditLeaderId] = useState<string | null>(null);

  // "Show all districts" popover when admin clicks the "+N more" badge.
  const [districtsModal, setDistrictsModal] = useState<LeaderRow | null>(null);

  /* ---------------- FORM ---------------- */
  const [name, setName]     = useState("");
  const [phone, setPhone]   = useState("");
  const [phone2, setPhone2] = useState("");
  const [formRole, setFormRole] = useState("");
  // Multi-district list. Each entry is one (state, district, constituency).
  const [formAssignments, setFormAssignments] = useState<AssignmentDraft[]>([]);

  // Photo state
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile]               = useState<File | null>(null);
  const [photoPreview, setPhotoPreview]         = useState<string | null>(null);
  const [photoCleared, setPhotoCleared]         = useState(false);
  const [savingLeader, setSavingLeader]         = useState(false);

  /* ======================================================
     STATIC DATA
  ====================================================== */
  const allStates = useMemo(() => Object.keys(indianAddressData).sort(), []);

  const districtsFor = (st: string) => {
    if (!st) return [];
    return (indianAddressData[st] || []).map((d) => d.name).sort();
  };

  const constituenciesFor = (st: string, dist: string) => {
    if (!st || !dist) return [];
    const d = (indianAddressData[st] || []).find((x) => x.name === dist);
    return d ? d.constituencies.map((c) => c.name).sort() : [];
  };

  const findStateForDistrict = (dist: string) => {
    if (!dist) return "";
    for (const [st, districts] of Object.entries(indianAddressData)) {
      if (districts.some((d) => d.name === dist)) return st;
    }
    return "";
  };

  /* ======================================================
     FETCH — all active assignments, grouped by leader
  ====================================================== */
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leader_assignments")
      .select(
        `
        id,
        leader_id,
        role,
        district,
        constituency,
        is_active,
        leader:leaders_master (
          id,
          name,
          whatsapp_number,
          whatsapp_number_2,
          photo_url,
          is_active
        )
      `
      )
      .eq("is_active", true)
      .order("district", { ascending: true })
      .order("constituency", { ascending: true });

    if (error) {
      console.error("fetch leader_assignments error:", error);
      setLeaderRows([]);
      setLoading(false);
      return;
    }

    // Group by leader_id. Inactive leaders are dropped (their assignments
    // were already filtered by is_active=true on the assignment row, but
    // the leader row itself can also be deactivated).
    const map = new Map<string, LeaderRow>();
    for (const a of (data || []) as any[]) {
      const leader = a.leader as LeaderMaster | null;
      if (!leader || !leader.is_active) continue;
      const existing = map.get(leader.id);
      const assignment: LeaderAssignment = {
        id: a.id,
        leader_id: a.leader_id,
        role: a.role,
        district: a.district,
        constituency: a.constituency,
        is_active: a.is_active,
      };
      if (existing) {
        existing.assignments.push(assignment);
      } else {
        map.set(leader.id, {
          leader,
          role: a.role,
          assignments: [assignment],
        });
      }
    }

    setLeaderRows(Array.from(map.values()));
    setLoading(false);
  };

  // Apply UI filters (state/district/constituency/role) to the grouped
  // rows. A leader passes if ANY of their assignments matches every set
  // filter. Filters not set are skipped.
  const filteredRows = useMemo(() => {
    return leaderRows.filter((row) => {
      if (role && row.role !== role) return false;

      // Global Coordinators don't have districts; they pass only when
      // none of the location filters are set (since they "match" all).
      if (isGlobalRole(row.role)) {
        return !state && !district && !constituency;
      }

      const matches = row.assignments.some((a) => {
        if (district && a.district !== district) return false;
        if (constituency && (a.constituency || "") !== constituency) return false;
        if (state) {
          const districtsInState = new Set(districtsFor(state));
          if (!a.district || !districtsInState.has(a.district)) return false;
        }
        return true;
      });
      return matches;
    });
  }, [leaderRows, role, state, district, constituency]);

  /* ======================================================
     PHOTO HELPERS (unchanged)
  ====================================================== */
  const resetPhotoState = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCleared(false);
    setExistingPhotoUrl(null);
  };

  const handlePickPhoto = (file: File | null) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      alert("Photo must be a JPEG, PNG, or WEBP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Photo must be under 5 MB.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoCleared(false);
  };

  const handleClearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCleared(true);
  };

  const uploadLeaderPhoto = async (leaderId: string, file: File): Promise<string> => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${leaderId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(LEADER_PHOTO_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from(LEADER_PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  const tryDeleteLeaderPhotoByUrl = async (url: string | null) => {
    if (!url) return;
    const marker = `/storage/v1/object/public/${LEADER_PHOTO_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const objectPath = url.substring(idx + marker.length);
    if (!objectPath) return;
    try {
      await supabase.storage.from(LEADER_PHOTO_BUCKET).remove([objectPath]);
    } catch (err) {
      console.warn("Could not remove old leader photo:", err);
    }
  };

  /* ======================================================
     MODAL — open / close
  ====================================================== */
  const openAddModal = () => {
    setEditLeaderId(null);
    setName("");
    setPhone("");
    setPhone2("");
    setFormRole("");
    // Pre-seed with the active filters as a convenience — admin usually
    // adds a leader for the area they were filtering by.
    setFormAssignments([
      {
        state: state || "",
        district: district || "",
        constituency: constituency || "",
      },
    ]);
    resetPhotoState();
    setShowModal(true);
  };

  const openEditModal = (row: LeaderRow) => {
    setEditLeaderId(row.leader.id);
    setName(row.leader.name || "");
    setPhone(row.leader.whatsapp_number || "");
    setPhone2(row.leader.whatsapp_number_2 || "");
    setFormRole(row.role);

    // Convert each existing assignment into an AssignmentDraft. Global
    // role has none, so the form just shows the global hint instead.
    const drafts: AssignmentDraft[] = isGlobalRole(row.role)
      ? []
      : row.assignments.map((a) => ({
          state: findStateForDistrict(a.district || ""),
          district: a.district || "",
          constituency: a.constituency || "",
        }));
    setFormAssignments(drafts);

    resetPhotoState();
    setExistingPhotoUrl(row.leader.photo_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    resetPhotoState();
    setShowModal(false);
  };

  /* ======================================================
     FORM helpers — multi-district list
  ====================================================== */
  const addAssignmentRow = () => {
    setFormAssignments((arr) => [
      ...arr,
      { state: "", district: "", constituency: "" },
    ]);
  };
  const removeAssignmentRow = (idx: number) => {
    setFormAssignments((arr) => arr.filter((_, i) => i !== idx));
  };
  const updateAssignmentRow = (idx: number, patch: Partial<AssignmentDraft>) => {
    setFormAssignments((arr) =>
      arr.map((a, i) => (i === idx ? { ...a, ...patch } : a))
    );
  };

  // When admin changes role mid-edit (e.g. AC → RC), clear out any
  // constituency strings — RC/DP shouldn't carry them.
  const onRoleChange = (newRole: string) => {
    setFormRole(newRole);
    if (isGlobalRole(newRole)) {
      setFormAssignments([]);
    } else if (!needsConstituency(newRole)) {
      setFormAssignments((arr) =>
        arr.length === 0
          ? [{ state: "", district: "", constituency: "" }]
          : arr.map((a) => ({ ...a, constituency: "" }))
      );
    } else {
      // AC: keep what's there but make sure there's at least one row.
      setFormAssignments((arr) =>
        arr.length === 0 ? [{ state: "", district: "", constituency: "" }] : arr
      );
    }
  };

  /* ======================================================
     SAVE — leader + N assignments
  ====================================================== */
  const saveLeader = async () => {
    const isGlobal      = isGlobalRole(formRole);
    const wantsCstcy    = needsConstituency(formRole);

    if (!name.trim() || !phone.trim() || !formRole) {
      alert("Please fill name, WhatsApp number, and role.");
      return;
    }
    if (!isGlobal) {
      if (formAssignments.length === 0) {
        alert("Add at least one district.");
        return;
      }
      const bad = formAssignments.find((a) => {
        if (!a.state || !a.district) return true;
        if (wantsCstcy && !a.constituency) return true;
        return false;
      });
      if (bad) {
        alert(
          wantsCstcy
            ? "Each row needs state, district and constituency."
            : "Each row needs state and district."
        );
        return;
      }
      // Block exact duplicates within the form.
      const keys = new Set<string>();
      for (const a of formAssignments) {
        const key = `${a.district}::${a.constituency || ""}`;
        if (keys.has(key)) {
          alert(`Duplicate entry: ${a.district}${a.constituency ? " / " + a.constituency : ""}.`);
          return;
        }
        keys.add(key);
      }
    }

    setSavingLeader(true);

    const phoneNorm  = phone.trim();
    const phone2Norm = phone2.trim() || null;

    let leaderId = editLeaderId;

    // 1. Upsert leaders_master row
    if (!leaderId) {
      const { data, error } = await supabase
        .from("leaders_master")
        .insert({
          name,
          whatsapp_number: phoneNorm,
          whatsapp_number_2: phone2Norm,
          is_active: true,
        })
        .select()
        .single();
      if (error || !data) {
        setSavingLeader(false);
        alert("Failed to create leader: " + (error?.message || "unknown error"));
        return;
      }
      leaderId = data.id;
    } else {
      const { error } = await supabase
        .from("leaders_master")
        .update({
          name,
          whatsapp_number: phoneNorm,
          whatsapp_number_2: phone2Norm,
        })
        .eq("id", leaderId);
      if (error) {
        setSavingLeader(false);
        alert("Failed to update leader: " + error.message);
        return;
      }
    }

    // 2. Photo (best-effort; doesn't block the rest)
    try {
      if (photoFile && leaderId) {
        const newUrl = await uploadLeaderPhoto(leaderId, photoFile);
        const { error: photoErr } = await supabase
          .from("leaders_master")
          .update({ photo_url: newUrl })
          .eq("id", leaderId);
        if (photoErr) throw photoErr;
        if (existingPhotoUrl && existingPhotoUrl !== newUrl) {
          await tryDeleteLeaderPhotoByUrl(existingPhotoUrl);
        }
      } else if (photoCleared && leaderId) {
        await supabase
          .from("leaders_master")
          .update({ photo_url: null })
          .eq("id", leaderId);
        await tryDeleteLeaderPhotoByUrl(existingPhotoUrl);
      }
    } catch (err: any) {
      console.error("photo update failed:", err);
      alert(
        "Leader saved, but photo update failed: " + (err?.message || "unknown error")
      );
    }

    // 3. Replace all assignments for this leader. Simpler than diffing —
    //    delete the existing active ones and insert the fresh set.
    {
      const { error: delErr } = await supabase
        .from("leader_assignments")
        .delete()
        .eq("leader_id", leaderId);
      if (delErr) {
        setSavingLeader(false);
        alert("Failed to clear old assignments: " + delErr.message);
        return;
      }
    }

    if (isGlobal) {
      // Global Coordinator gets a single row with NULL district / constituency.
      const { error } = await supabase.from("leader_assignments").insert({
        leader_id: leaderId,
        role: formRole,
        district: null,
        constituency: null,
        is_active: true,
      });
      if (error) {
        setSavingLeader(false);
        alert("Failed to save Global assignment: " + error.message);
        return;
      }
    } else {
      const inserts = formAssignments.map((a) => ({
        leader_id: leaderId,
        role: formRole,
        district: a.district || null,
        constituency: wantsCstcy ? a.constituency || null : null,
        is_active: true,
      }));
      const { error } = await supabase.from("leader_assignments").insert(inserts);
      if (error) {
        setSavingLeader(false);
        alert("Failed to save assignments: " + error.message);
        return;
      }
    }

    setSavingLeader(false);
    closeModal();
    fetchData();
  };

  /* ======================================================
     DELETE — soft delete the entire leader (all rows)
  ====================================================== */
  const deleteLeader = async (row: LeaderRow) => {
    if (
      !confirm(
        `Deactivate "${row.leader.name}"? They'll be removed from every district they're assigned to.`
      )
    )
      return;
    // Soft-delete by flipping is_active on the leader. RLS lets admin update.
    await supabase
      .from("leaders_master")
      .update({ is_active: false })
      .eq("id", row.leader.id);
    fetchData();
  };

  /* ======================================================
     UI
  ====================================================== */
  const totalLeaders = filteredRows.length;
  const filtersActive = !!(state || district || constituency || role);

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-600">Local Leaders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Each leader can cover one or more districts. Users see them automatically when
            their address matches any of those districts.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition"
        >
          <Plus size={16} /> Add Leader
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setDistrict("");
                setConstituency("");
              }}
            >
              <option value="">Select State</option>
              {allStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">District</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value);
                setConstituency("");
              }}
              disabled={!state}
            >
              <option value="">Select District</option>
              {districtsFor(state).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Constituency</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white disabled:bg-gray-100"
              value={constituency}
              onChange={(e) => setConstituency(e.target.value)}
              disabled={!district}
            >
              <option value="">Select Constituency</option>
              {constituenciesFor(state, district).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">All Roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {totalLeaders} {totalLeaders === 1 ? "leader" : "leaders"}
            {filtersActive ? " (filtered)" : ""}
          </p>
          {filtersActive && (
            <button
              onClick={() => {
                setState("");
                setDistrict("");
                setConstituency("");
                setRole("");
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-primary-600 to-primary-500 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Leader</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Districts</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Constituency</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">WhatsApp</th>
                <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">Loading…</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    {filtersActive
                      ? "No leaders match the current filters."
                      : 'No leaders added yet. Click "Add Leader" to create the first one.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isGlobal = isGlobalRole(row.role);
                  const wantsCstcy = needsConstituency(row.role);
                  const districts = row.assignments.map((a) => a.district).filter(Boolean) as string[];
                  const firstDistrict = districts[0] || "—";
                  const moreCount = districts.length - 1;
                  return (
                    <tr key={row.leader.id} className="hover:bg-gray-50 transition align-top">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            {row.leader.photo_url ? (
                              <img
                                src={row.leader.photo_url}
                                alt={row.leader.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {(row.leader.name || "?").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="truncate">{row.leader.name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium whitespace-nowrap ${
                            isGlobal
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-primary-50 text-primary-700 border border-primary-100"
                          }`}
                        >
                          {isGlobal ? "🌐 " : ""}{row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isGlobal ? (
                          <span className="text-gray-400 italic">all districts</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{firstDistrict}</span>
                            {moreCount > 0 && (
                              <button
                                onClick={() => setDistrictsModal(row)}
                                className="text-[11px] font-bold bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-full hover:bg-primary-100 transition"
                                title="Click to see all districts"
                              >
                                +{moreCount} more
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isGlobal ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : !wantsCstcy ? (
                          <span className="text-gray-400 italic">—</span>
                        ) : row.assignments.length === 1 ? (
                          row.assignments[0].constituency || "—"
                        ) : (
                          <span className="text-[11px] text-gray-500 italic">
                            see districts
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <div>{row.leader.whatsapp_number || "—"}</div>
                        {row.leader.whatsapp_number_2 && (
                          <div className="text-[11px] text-gray-500">
                            {row.leader.whatsapp_number_2}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(row)}
                            className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteLeader(row)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                            title="Deactivate"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISTRICTS MODAL */}
      {districtsModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setDistrictsModal(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 truncate">
                  {districtsModal.leader.name}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {districtsModal.role} ·{" "}
                  {districtsModal.assignments.length}{" "}
                  {districtsModal.assignments.length === 1 ? "district" : "districts"}
                </p>
              </div>
              <button
                onClick={() => setDistrictsModal(null)}
                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              {districtsModal.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm"
                >
                  <span className="font-semibold text-gray-900">
                    {a.district || "—"}
                  </span>
                  {needsConstituency(districtsModal.role) && (
                    <span className="text-[11px] text-gray-600">
                      {a.constituency || "—"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editLeaderId ? "Edit Leader" : "Add New Leader"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Leader name
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Sri P.V. Midhun Reddy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Phone primary */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  WhatsApp number (with country code, no spaces)
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="+919876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Photo */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">
                  Profile photo{" "}
                  <span className="text-gray-400 font-normal italic">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : !photoCleared && existingPhotoUrl ? (
                      <img
                        src={existingPhotoUrl}
                        alt="current"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                        No photo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-xs font-semibold cursor-pointer hover:bg-primary-100 transition">
                      <Upload size={14} />
                      {photoFile || (existingPhotoUrl && !photoCleared)
                        ? "Change photo"
                        : "Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handlePickPhoto(e.target.files?.[0] || null)}
                      />
                    </label>
                    {(photoFile || (existingPhotoUrl && !photoCleared)) && (
                      <button
                        type="button"
                        onClick={handleClearPhoto}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition"
                      >
                        <X size={14} /> Remove
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400">
                      JPEG / PNG / WEBP, up to 5 MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Phone secondary */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Secondary WhatsApp number{" "}
                  <span className="text-gray-400 font-normal italic">(optional)</span>
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="+919876543210"
                  value={phone2}
                  onChange={(e) => setPhone2(e.target.value)}
                />
              </div>

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
                  value={formRole}
                  onChange={(e) => onRoleChange(e.target.value)}
                >
                  <option value="">Select Role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Coverage area — Global hint OR multi-district list */}
              {isGlobalRole(formRole) ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                  🌐 <span className="font-semibold">Global Coordinator</span> — visible to{" "}
                  <b>every user</b> regardless of address. No districts needed.
                </div>
              ) : formRole ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-gray-500">
                      Districts {needsConstituency(formRole) ? "& constituencies" : ""}
                      <span className="text-gray-400 font-normal italic">
                        {" "}— add as many as this leader covers
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={addAssignmentRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 text-xs font-semibold rounded-lg hover:bg-primary-100"
                    >
                      <Plus size={12} /> Add district
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formAssignments.map((a, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                      >
                        <div
                          className={`grid grid-cols-1 sm:grid-cols-${
                            needsConstituency(formRole) ? "3" : "2"
                          } gap-2`}
                        >
                          <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white"
                            value={a.state}
                            onChange={(e) =>
                              updateAssignmentRow(idx, {
                                state: e.target.value,
                                district: "",
                                constituency: "",
                              })
                            }
                          >
                            <option value="">State</option>
                            {allStates.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <select
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100"
                            value={a.district}
                            disabled={!a.state}
                            onChange={(e) =>
                              updateAssignmentRow(idx, {
                                district: e.target.value,
                                constituency: "",
                              })
                            }
                          >
                            <option value="">District</option>
                            {districtsFor(a.state).map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          {needsConstituency(formRole) && (
                            <select
                              className="border border-gray-300 rounded px-2 py-1.5 text-sm bg-white disabled:bg-gray-100"
                              value={a.constituency}
                              disabled={!a.district}
                              onChange={(e) =>
                                updateAssignmentRow(idx, {
                                  constituency: e.target.value,
                                })
                              }
                            >
                              <option value="">Constituency</option>
                              {constituenciesFor(a.state, a.district).map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {formAssignments.length > 1 && (
                          <div className="flex justify-end mt-1.5">
                            <button
                              type="button"
                              onClick={() => removeAssignmentRow(idx)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {!needsConstituency(formRole) && (
                    <p className="text-[11px] text-gray-500 mt-2 italic">
                      Constituency isn't required for {formRole} — leave it out.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">
                  Pick a role above to set the coverage area.
                </p>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={closeModal}
                disabled={savingLeader}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveLeader}
                disabled={savingLeader}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 transition disabled:opacity-60"
              >
                {savingLeader
                  ? "Saving…"
                  : editLeaderId
                  ? "Save Changes"
                  : "Add Leader"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
