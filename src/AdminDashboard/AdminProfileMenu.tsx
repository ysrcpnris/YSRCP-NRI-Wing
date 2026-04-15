import React, { useEffect, useRef, useState } from "react";
import { User, Lock, LogOut, Save, X, Phone, Mail, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

/* ===============================
   ADMIN PROFILE MENU (TOP RIGHT)
================================ */
// Dropdown menu component for admin profile, password change, and logout
export default function AdminProfileMenu() {
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Clears admin session and redirects to home
  const handleLogout = async () => {
    try {
      await signOut();
      localStorage.removeItem("is_admin");
      navigate("/", { replace: true });
    } catch (error: any) {
      toast.error("Logout failed");
    }
  };

  return (
    <>
      <div className="relative" ref={ref}>
        {/* Profile Icon Button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-gray-100 transition-all duration-200"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white flex items-center justify-center shadow-md border-2 border-white">
            <User size={20} />
          </div>
          <div className="hidden md:block text-left pr-2">
            
          </div>
        </button>

        {/* Dropdown Menu with options */}
        {open && (
          <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-fadeIn">
            <div className="px-5 py-4 bg-gradient-to-br from-blue-50 to-white border-b border-gray-100">
              <p className="text-sm font-bold text-[#1368d6] truncate">
                {[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>

            <div className="p-2">
              {/* My Profile button */}
              <button
                onClick={() => {
                  setOpen(false);
                  setShowProfile(true);
                }}
                className="w-full px-4 py-2.5 text-sm font-medium flex items-center gap-3 text-gray-700 hover:bg-blue-50 hover:text-[#1368d6] rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-[#1368d6]">
                  <User size={16} />
                </div>
                My Profile
              </button>

              {/* Change Password button */}
              <button
                onClick={() => navigate("/change-password")}
                className="w-full px-4 py-2.5 text-sm font-medium flex items-center gap-3 text-gray-700 hover:bg-blue-50 hover:text-[#1368d6] rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                  <Lock size={16} />
                </div>
                Change Password
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-sm font-medium flex items-center gap-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <LogOut size={16} />
                </div>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PROFILE MODAL */}
      {showProfile && <AdminProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}

/* ===============================
   ADMIN PROFILE MODAL
================================ */
// Modal form for editing admin profile (Name, Mobile, WhatsApp)
function AdminProfileModal({ onClose }: { onClose: () => void }) {
  const { profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  // Form state for editable profile fields
  const [form, setForm] = useState({
    first_name: "",
    email: "",
    mobile_number: "",
    whatsapp_number: "",
  });

  // Populate form with current profile data on modal open
  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        email: profile.email || "",
        mobile_number: profile.mobile_number || "",
        whatsapp_number: profile.whatsapp_number || "",
      });
    }
  }, [profile]);

  // Saves profile changes to database
  const updateProfile = async () => {
    if (!profile?.id) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: form.first_name,
          mobile_number: form.mobile_number,
          whatsapp_number: form.whatsapp_number,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      await refreshProfile();
      toast.success("Profile updated successfully!");
      onClose();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1368d6] to-[#00a86b] px-8 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold">Edit Profile</h2>
          <p className="text-blue-100 text-sm mt-1">Update your personal information</p>
        </div>

        <div className="p-8 space-y-5">
          {/* Name field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Name</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <User size={16} />
              </div>
              <input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Name"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Email field (read-only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={16} />
              </div>
              <input
                value={form.email}
                disabled
                className="w-full border border-gray-100 bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 text-gray-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          {/* Mobile Number field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mobile Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={16} />
              </div>
              <input
                value={form.mobile_number}
                onChange={(e) => setForm({ ...form, mobile_number: e.target.value })}
                placeholder="Mobile Number"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* WhatsApp Number field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">WhatsApp Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Phone size={16} className="text-green-500" />
              </div>
              <input
                value={form.whatsapp_number}
                onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
                placeholder="WhatsApp Number"
                className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          {/* Cancel and Save buttons */}
          <div className="flex justify-end gap-3 pt-4">
            {/* Cancel button */}
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            {/* Save button with loading state */}
            <button
              onClick={updateProfile}
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-[#1368d6] to-[#00a86b] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
