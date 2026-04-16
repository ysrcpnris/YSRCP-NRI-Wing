import React, { useState, useRef, useEffect } from 'react';
import { User, Lock, LogOut, ChevronLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from "react-router-dom";


interface ProfileDropdownProps {
  profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    profile_photo?: string;
  };
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ profile }) => {
  const { signOut,user } = useAuth();
  const navigate = useNavigate();


  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });

      if (authError) {
        setPasswordError('Current password is incorrect');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setPasswordError(updateError.message);
      } else {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setShowChangePassword(false);
          setPasswordSuccess('');
        }, 2000);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
  setIsOpen(false);                 // close dropdown
  navigate("/", { replace: true }); // instant redirect
  await signOut();                  // backend cleanup
};

// Build full name with intelligent fallback chain
const fullName = (() => {
  // Primary: Use profile data
  if (profile?.first_name) {
    const last = profile.last_name && profile.last_name !== profile.first_name
      ? ` ${profile.last_name}`
      : '';
    return `${profile.first_name}${last}`;
  }
  
  if (profile?.last_name) {
    return profile.last_name;
  }
  
  // Secondary: Use auth metadata as fallback (profile might be null during token refresh)
  const authFirst = (user?.user_metadata?.first_name as string) || '';
  const authLast = (user?.user_metadata?.last_name as string) || '';
  const authFull = (user?.user_metadata?.full_name as string) || '';
  
  if (authFirst && authLast) return `${authFirst} ${authLast}`;
  if (authFirst) return authFirst;
  if (authFull) return authFull;
  
  return 'User';
})();

const initials =
  fullName
    .split(' ')
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';


  return (
    <div ref={dropdownRef} className="relative">
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 rounded-xl border border-blue-300 hover:bg-blue-50 transition-all"
      >
        {profile?.profile_photo ? (
          <img
            src={`${profile.profile_photo}?t=${Date.now()}`}
            alt={fullName}
            className="w-11 h-11 rounded-full object-cover border-2 border-primary-500"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center text-sm font-bold ${profile?.profile_photo ? 'hidden' : ''}`}>
          {initials}
        </div>

        <div className="hidden sm:flex flex-col items-start">
          <p className="text-sm font-bold text-gray-900">{fullName || 'User'}</p>
          <p className="text-xs text-gray-500">{profile?.email || 'nri@portal'}</p>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-blue-200 z-[150] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-700 to-green-600 text-white border-b border-green-300">
            <p className="font-bold text-lg truncate">{fullName || 'User'}</p>
            <p className="text-xs opacity-90 truncate">{profile?.email}</p>
          </div>

          {/* Menu */}
          <div className="py-2">
       <button
  onClick={() => {
    setIsOpen(false);
    navigate("/dashboard", {
      state: { openProfile: true },
    });
  }}
  className="w-full px-6 py-4 flex items-center gap-4 text-gray-800 hover:bg-blue-50 transition font-semibold"
>
  <User size={20} className="text-blue-700" />
  My Profile
</button>


            <button
              onClick={() => {
                setShowChangePassword(true);
                setIsOpen(false);
              }}
              className="w-full px-6 py-4 flex items-center gap-4 text-gray-800 hover:bg-green-50 transition font-semibold"
            >
              <Lock size={20} className="text-green-700" />
              Change Password
            </button>

            <div className="border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full px-6 py-4 flex items-center gap-4 text-red-700 hover:bg-red-50 transition font-semibold"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-green-600 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Lock size={20} /> Change Password
              </h2>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordError('');
                  setPasswordSuccess('');
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <ChevronLeft size={24} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-600"
              />
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-600"
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-600"
              />

              {passwordError && (
                <p className="text-sm font-bold text-red-700 bg-red-50 p-3 rounded-lg border border-red-300">
                  {passwordError}
                </p>
              )}

              {passwordSuccess && (
                <p className="text-sm font-bold text-green-700 bg-green-50 p-3 rounded-lg border border-green-300">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-700 to-green-600 text-white rounded-lg font-bold hover:opacity-90 transition"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
