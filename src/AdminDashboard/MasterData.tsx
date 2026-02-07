import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

/* ======================================================
   TYPES
====================================================== */
type LeaderMaster = {
  id: string;
  name: string;
  whatsapp_number: string;
  is_active: boolean;
};

type LeaderAssignment = {
  id: string;
  leader_id: string;
  role: string;
  district: string;
  constituency: string;
  is_active: boolean;
  leader: LeaderMaster;
};

/* ======================================================
   COMPONENT
====================================================== */
export default function MasterData() {
  /* ---------------- FILTERS ---------------- */
  const [district, setDistrict] = useState("");
  const [constituency, setConstituency] = useState("");
  const [role, setRole] = useState("");

  /* ---------------- DATA ---------------- */
  const [districts, setDistricts] = useState<string[]>([]);
  const [constituencies, setConstituencies] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<LeaderAssignment[]>([]);

  /* ---------------- MODAL ---------------- */
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<LeaderAssignment | null>(null);

  /* ---------------- FORM ---------------- */
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formDistrict, setFormDistrict] = useState("");
  const [formConstituency, setFormConstituency] = useState("");

  /* ======================================================
     INITIAL LOAD
  ====================================================== */
  useEffect(() => {
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (district) fetchConstituencies(district);
  }, [district]);

  useEffect(() => {
    if (district && constituency) fetchAssignments();
  }, [district, constituency, role]);

  /* ======================================================
     FETCH HELPERS
  ====================================================== */
  const fetchDistricts = async () => {
    const { data } = await supabase
      .from("leader_assignments")
      .select("district")
      .neq("district", "")
      .order("district");

    setDistricts([...new Set(data?.map((d) => d.district))]);
  };

  const fetchConstituencies = async (district: string) => {
    const { data } = await supabase
      .from("leader_assignments")
      .select("constituency")
      .eq("district", district)
      .order("constituency");

    setConstituencies([...new Set(data?.map((c) => c.constituency))]);
  };

  const fetchAssignments = async () => {
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
          is_active
        )
      `
      )
      .eq("district", district)
      .eq("constituency", constituency)
      .eq("is_active", true);

    if (role) query = query.eq("role", role);

    const { data, error } = await query;

    if (!error) setAssignments(data as any);
  };

  /* ======================================================
     MODAL OPEN
  ====================================================== */
  const openAddModal = () => {
    setEditItem(null);
    setName("");
    setPhone("");
    setFormRole("");
    setFormDistrict(district);
    setFormConstituency(constituency);
    setShowModal(true);
  };

  const openEditModal = (item: LeaderAssignment) => {
    setEditItem(item);
    setName(item.leader.name);
    setPhone(item.leader.whatsapp_number);
    setFormRole(item.role);
    setFormDistrict(item.district);
    setFormConstituency(item.constituency);
    setShowModal(true);
  };

  /* ======================================================
     SAVE
  ====================================================== */
  const saveLeader = async () => {
    let leaderId = editItem?.leader.id;

    if (!leaderId) {
      const { data } = await supabase
        .from("leaders_master")
        .insert({ name, whatsapp_number: phone, is_active: true })
        .select()
        .single();

      leaderId = data.id;
    } else {
      await supabase
        .from("leaders_master")
        .update({ name, whatsapp_number: phone })
        .eq("id", leaderId);
    }

    if (editItem) {
      await supabase
        .from("leader_assignments")
        .update({
          role: formRole,
          district: formDistrict,
          constituency: formConstituency,
        })
        .eq("id", editItem.id);
    } else {
      await supabase.from("leader_assignments").insert({
        leader_id: leaderId,
        role: formRole,
        district: formDistrict,
        constituency: formConstituency,
        is_active: true,
      });
    }

    setShowModal(false);
    fetchAssignments();
  };

  /* ======================================================
     DELETE (SAFE)
  ====================================================== */
  const deleteAssignment = async (id: string) => {
    await supabase
      .from("leader_assignments")
      .update({ is_active: false })
      .eq("id", id);

    fetchAssignments();
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold text-[#1368d6] mb-4 md:mb-6">
       Local Leaders
      </h1>

      {/* FILTERS */}
     {/* FILTERS */}
<div className="bg-white p-3 md:p-5 rounded-2xl border shadow-sm mb-6 overflow-visible">
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-end overflow-visible">
    {/* DISTRICT */}
    <div className="z-30">
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        District
      </label>
      <select
        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        value={district}
        onChange={(e) => {
          setDistrict(e.target.value);
          setConstituency("");
        }}
      >
        <option value="">Select District</option>
        {districts.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
    </div>

    {/* CONSTITUENCY */}
    <div className="z-20">
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        Constituency
      </label>
      <select
        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        value={constituency}
        onChange={(e) => setConstituency(e.target.value)}
        disabled={!district}
      >
        <option value="">Select Constituency</option>
        {constituencies.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </div>

    {/* ROLE */}
    <div className="z-10">
      <label className="text-xs font-semibold text-gray-500 mb-1 block">
        Role
      </label>
      <select
        className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="">All Roles</option>
        <option>District President</option>
        <option>Regional Coordinator</option>
        <option>Assembly Coordinator</option>
      </select>
    </div>

    {/* ADD BUTTON */}
    <button
      onClick={openAddModal}
      disabled={!district || !constituency}
      className="h-[42px] bg-green-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition sm:col-span-2 md:col-span-1"
    >
      <Plus size={16} />
      <span className="hidden sm:inline">Add Leader</span>
      <span className="sm:hidden">Add</span>
    </button>
  </div>
</div>


      {/* TABLE */}
      {!district || !constituency ? (
        <div className="text-gray-500 text-center py-10">
          Select district & constituency to view leaders
        </div>
      ) : (
        <div className="bg-white border border-gray-200 shadow-sm overflow-x-auto">
          <table className="w-full text-sm md:text-base">
            <thead className="bg-blue-600 border-b border-blue-700">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left font-semibold text-white text-xs md:text-sm">
                  Leader
                </th>
                <th className="px-3 md:px-6 py-3 text-center font-semibold text-white text-xs md:text-sm">
                  Role
                </th>
                <th className="px-3 md:px-6 py-3 text-center font-semibold text-white text-xs md:text-sm">
                  Contact
                </th>
                <th className="px-3 md:px-6 py-3 text-right font-semibold text-white text-xs md:text-sm">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-150">
              {assignments.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-3 md:px-6 py-2">
                    <p className="font-medium text-gray-800 text-sm md:text-base">{a.leader.name}</p>
                  </td>

                  <td className="px-3 md:px-6 py-2 text-center">
                    <span className="text-green-600 font-medium text-xs md:text-sm">{a.role}</span>
                  </td>

                  <td className="px-3 md:px-6 py-2 text-center">
                    <span className="text-gray-700 text-xs md:text-sm">{a.leader.whatsapp_number}</span>
                  </td>

                  <td className="px-3 md:px-6 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(a)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                        title="Edit"
                      >
                        <Edit3 size={18} />
                      </button>

                      <button
                        onClick={() => deleteAssignment(a.id)}
                        className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                        title="Deactivate"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {assignments.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400">
                    No leaders found for selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {showModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-4 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
      <h3 className="text-xl font-semibold mb-6 text-[#1368d6]">
        {editItem ? "Edit Leader Assignment" : "Add New Leader"}
      </h3>

      <div className="space-y-4">
        <input
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          placeholder="Leader Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          placeholder="WhatsApp Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <input
          className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          placeholder="Role (e.g. District President)"
          value={formRole}
          onChange={(e) => setFormRole(e.target.value)}
        />
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setShowModal(false)}
          className="w-full border rounded-lg py-2 hover:bg-gray-100"
        >
          Cancel
        </button>

        <button
          onClick={saveLeader}
          className="w-full bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
