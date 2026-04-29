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

const LEADER_PHOTO_BUCKET = "leader-photos";

type LeaderAssignment = {
  id: string;
  leader_id: string;
  role: string;
  district: string | null;
  constituency: string | null;
  is_active: boolean;
  leader: LeaderMaster;
};

// Global Coordinator → visible to ALL users (district/constituency are NULL).
// The other three are scoped by location.
const ROLES = [
  "Global Coordinator",
  "Regional Coordinator",
  "District President",
  "Assembly Coordinator",
];

// Roles that don't need a state/district/constituency (apply globally).
const isGlobalRole = (r: string) => r === "Global Coordinator";

/* ======================================================
   COMPONENT
====================================================== */
export default function MasterData() {
  /* ---------------- FILTERS ---------------- */
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [constituency, setConstituency] = useState("");
  const [role, setRole] = useState("");

  /* ---------------- DATA ---------------- */
  const [assignments, setAssignments] = useState<LeaderAssignment[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------------- MODAL ---------------- */
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LeaderAssignment | null>(null);

  /* ---------------- FORM ---------------- */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");           // optional second number
  const [formRole, setFormRole] = useState("");
  const [formState, setFormState] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formConstituency, setFormConstituency] = useState("");

  // Optional leader profile photo. `existingPhotoUrl` holds the URL already on
  // the leader (when editing) so we can show it before any new file is picked.
  // `photoFile` is a freshly-picked File the admin wants to upload on Save.
  // `photoPreview` is an objectURL for the preview (revoked when modal closes).
  // `photoCleared` flags an explicit "remove" so Save will null out the column
  // and delete the storage object.
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCleared, setPhotoCleared] = useState(false);
  const [savingLeader, setSavingLeader] = useState(false);

  /* ======================================================
     STATIC DATA (all states from shared file)
  ====================================================== */
  const allStates = useMemo(() => {
    return Object.keys(indianAddressData).sort();
  }, []);

  const districtsFor = (st: string) => {
    if (!st) return [];
    return (indianAddressData[st] || []).map((d) => d.name).sort();
  };

  const constituenciesFor = (st: string, dist: string) => {
    if (!st || !dist) return [];
    const d = (indianAddressData[st] || []).find((x) => x.name === dist);
    return d ? d.constituencies.map((c) => c.name).sort() : [];
  };

  /* ======================================================
     FETCH — loads all leaders, filters are optional
  ====================================================== */
  useEffect(() => {
    fetchAssignments();
  }, [state, district, constituency, role]);

  const fetchAssignments = async () => {
    setLoading(true);
    let query = supabase
      .from("leader_assignments")
      .select(
        `
        id,
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

    if (district) query = query.eq("district", district);
    if (constituency) query = query.eq("constituency", constituency);
    if (role) query = query.eq("role", role);
    // State filter: only include assignments whose district belongs to the selected state
    // (done client-side after fetching)

    const { data, error } = await query;
    if (error) {
      console.error("fetch leader_assignments error:", error);
      setAssignments([]);
    } else if (data) {
      let rows = data as any[];
      if (state) {
        const districtsInState = new Set(districtsFor(state));
        rows = rows.filter((r) => districtsInState.has(r.district));
      }
      setAssignments(rows);
    }
    setLoading(false);
  };

  /* ======================================================
     MODAL
  ====================================================== */
  // Helper: which state does a given district belong to?
  const findStateForDistrict = (dist: string) => {
    if (!dist) return "";
    for (const [st, districts] of Object.entries(indianAddressData)) {
      if (districts.some((d) => d.name === dist)) return st;
    }
    return "";
  };

  // Common reset for the photo controls — used by both modal openers and
  // when closing/cancelling so a stale objectURL never leaks across opens.
  const resetPhotoState = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCleared(false);
    setExistingPhotoUrl(null);
  };

  const openAddModal = () => {
    setEditItem(null);
    setName("");
    setPhone("");
    setPhone2("");
    setFormRole("");
    setFormState(state);
    setFormDistrict(district);
    setFormConstituency(constituency);
    resetPhotoState();
    setShowModal(true);
  };

  const openEditModal = (item: LeaderAssignment) => {
    setEditItem(item);
    setName(item.leader?.name || "");
    setPhone(item.leader?.whatsapp_number || "");
    setPhone2(item.leader?.whatsapp_number_2 || "");
    setFormRole(item.role);
    const resolvedState = findStateForDistrict(item.district || "");
    setFormState(resolvedState);
    setFormDistrict(item.district || "");
    setFormConstituency(item.constituency || "");
    resetPhotoState();
    setExistingPhotoUrl(item.leader?.photo_url || null);
    setShowModal(true);
  };

  const closeModal = () => {
    resetPhotoState();
    setShowModal(false);
  };

  // File picker handler. Validates type/size, then makes a local objectURL
  // for preview so the admin sees the new image before clicking Save.
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
    const url = URL.createObjectURL(file);
    setPhotoFile(file);
    setPhotoPreview(url);
    setPhotoCleared(false);
  };

  // Mark the existing photo for removal on Save (we don't delete from
  // storage immediately so a Cancel still leaves the original photo intact).
  const handleClearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoCleared(true);
  };

  // Storage helpers.
  // Path key: leader_id/<timestamp>.<ext>. Same leader gets one photo
  // path-prefix so we can clean up old objects predictably.
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

  // Best-effort delete of the previous storage object given its public URL.
  // Failing here doesn't block the leader update — the orphan can be cleaned
  // up later. We only attempt if the URL points at our bucket.
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
     SAVE
  ====================================================== */
  const saveLeader = async () => {
    // Global Coordinators apply everywhere → no state/district/constituency.
    // Other roles require all three.
    const isGlobal = isGlobalRole(formRole);
    if (!name.trim() || !phone.trim() || !formRole) {
      alert("Please fill name, WhatsApp number, and role.");
      return;
    }
    if (!isGlobal && (!formState || !formDistrict || !formConstituency)) {
      alert("Please fill state, district and constituency.");
      return;
    }

    const phoneNorm  = phone.trim();
    const phone2Norm = phone2.trim() || null;

    setSavingLeader(true);

    let leaderId = editItem?.leader?.id;

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

    // Photo handling — runs after the leader row exists so we have its id
    // for the storage path. Three paths:
    //   1. New file picked → upload, write photo_url, drop the previous file.
    //   2. "Remove" clicked  → null the column, delete the old object.
    //   3. Nothing changed   → leave photo_url alone.
    try {
      if (photoFile && leaderId) {
        const newUrl = await uploadLeaderPhoto(leaderId, photoFile);
        const { error: photoErr } = await supabase
          .from("leaders_master")
          .update({ photo_url: newUrl })
          .eq("id", leaderId);
        if (photoErr) throw photoErr;
        // Best-effort cleanup of the prior photo (if any).
        if (existingPhotoUrl && existingPhotoUrl !== newUrl) {
          await tryDeleteLeaderPhotoByUrl(existingPhotoUrl);
        }
      } else if (photoCleared && leaderId) {
        const { error: photoErr } = await supabase
          .from("leaders_master")
          .update({ photo_url: null })
          .eq("id", leaderId);
        if (photoErr) throw photoErr;
        await tryDeleteLeaderPhotoByUrl(existingPhotoUrl);
      }
    } catch (err: any) {
      console.error("photo update failed:", err);
      alert(
        "Leader saved, but photo update failed: " +
          (err?.message || "unknown error")
      );
      // Don't bail — leader text data is already saved, just continue.
    } finally {
      setSavingLeader(false);
    }

    // For Global Coordinator: store district + constituency as NULL.
    const assignmentDistrict     = isGlobal ? null : formDistrict;
    const assignmentConstituency = isGlobal ? null : formConstituency;

    if (editItem) {
      const { error } = await supabase
        .from("leader_assignments")
        .update({
          role: formRole,
          district: assignmentDistrict,
          constituency: assignmentConstituency,
        })
        .eq("id", editItem.id);
      if (error) {
        alert("Failed to update assignment: " + error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("leader_assignments").insert({
        leader_id: leaderId,
        role: formRole,
        district: assignmentDistrict,
        constituency: assignmentConstituency,
        is_active: true,
      });
      if (error) {
        alert("Failed to create assignment: " + error.message);
        return;
      }
    }

    closeModal();
    // If we just added in a different state/district/constituency than the filter, switch to it
    if (!isGlobal && formState && formDistrict && formConstituency) {
      setState(formState);
      setDistrict(formDistrict);
      setConstituency(formConstituency);
    }
    fetchAssignments();
  };

  /* ======================================================
     DELETE (SOFT)
  ====================================================== */
  const deleteAssignment = async (id: string) => {
    if (!confirm("Deactivate this leader assignment?")) return;
    await supabase.from("leader_assignments").update({ is_active: false }).eq("id", id);
    fetchAssignments();
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-wrap justify-between items-start gap-3 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-600">Local Leaders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add leaders by district & constituency so users see them in Leadership Connect.
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-100"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-100"
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
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
            {assignments.length} {assignments.length === 1 ? "leader" : "leaders"}
            {state || district || constituency || role ? " (filtered)" : ""}
          </p>
          {(state || district || constituency || role) && (
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
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">District</th>
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
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    {state || district || constituency || role
                      ? "No leaders match the current filters."
                      : 'No leaders added yet. Click "Add Leader" to create the first one.'}
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const isGlobal = isGlobalRole(a.role);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                            {a.leader?.photo_url ? (
                              <img
                                src={a.leader.photo_url}
                                alt={a.leader.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-semibold">
                                {(a.leader?.name || "?").charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="truncate">{a.leader?.name || "—"}</span>
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
                          {isGlobal ? "🌐 " : ""}{a.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isGlobal ? <span className="text-gray-400 italic">all districts</span> : (a.district || "—")}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {isGlobal ? <span className="text-gray-400 italic">—</span> : (a.constituency || "—")}
                      </td>
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <div>{a.leader?.whatsapp_number || "—"}</div>
                        {a.leader?.whatsapp_number_2 && (
                          <div className="text-[11px] text-gray-500">{a.leader.whatsapp_number_2}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(a)}
                            className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 transition"
                            title="Edit"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => deleteAssignment(a.id)}
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editItem ? "Edit Leader" : "Add New Leader"}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Leader name</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Sri P.V. Midhun Reddy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

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

              {/* Profile photo (optional). Shown above WhatsApp #2 so admins
                  see it as a primary detail of the leader. */}
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

              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  <option value="">Select Role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {isGlobalRole(formRole) ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800">
                  🌐 <span className="font-semibold">Global Coordinator</span> — this leader will be visible to <b>every user</b> regardless of their address. State / district / constituency aren't needed.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">State</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white"
                      value={formState}
                      onChange={(e) => {
                        setFormState(e.target.value);
                        setFormDistrict("");
                        setFormConstituency("");
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-100"
                      value={formDistrict}
                      onChange={(e) => {
                        setFormDistrict(e.target.value);
                        setFormConstituency("");
                      }}
                      disabled={!formState}
                    >
                      <option value="">Select District</option>
                      {districtsFor(formState).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Constituency</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 bg-white disabled:bg-gray-100"
                      value={formConstituency}
                      onChange={(e) => setFormConstituency(e.target.value)}
                      disabled={!formDistrict}
                    >
                      <option value="">Select Constituency</option>
                      {constituenciesFor(formState, formDistrict).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
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
                  : editItem
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
