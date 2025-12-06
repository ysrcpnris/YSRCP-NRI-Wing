// components/ProfileSection.tsx
import { useState, useEffect } from 'react';
import { Save, User, Clipboard, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileSection() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    occupation: profile?.occupation || '',
    native_district: profile?.native_district || '',
    native_constituency: profile?.native_constituency || '',
    native_mandal: profile?.native_mandal || '',
    native_village: profile?.native_village || '',
    current_country: profile?.current_country || '',
    current_state: profile?.current_state || '',
    current_city: profile?.current_city || ''
  });

  // --- REFERRAL STATE ---
  const [referralCode, setReferralCode] = useState<string | null>(
    profile?.referral_code ?? null
  );
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [refLoading, setRefLoading] = useState(false);

  useEffect(() => {
    // keep form defaults in sync with profile when it becomes available
    setFormData((prev) => ({
      ...prev,
      full_name: profile?.full_name ?? prev.full_name,
      phone: profile?.phone ?? prev.phone,
      occupation: profile?.occupation ?? prev.occupation,
      native_district: profile?.native_district ?? prev.native_district,
      native_constituency: profile?.native_constituency ?? prev.native_constituency,
      native_mandal: profile?.native_mandal ?? prev.native_mandal,
      native_village: profile?.native_village ?? prev.native_village,
      current_country: profile?.current_country ?? prev.current_country,
      current_state: profile?.current_state ?? prev.current_state,
      current_city: profile?.current_city ?? prev.current_city
    }));
  }, [profile]);

  useEffect(() => {
    // If referral_code not present on profile object, try fetching it once
    async function loadReferralInfo() {
      if (!profile?.id) return;
      // if profile already has code (set via AuthContext), use it
      if (profile.referral_code) {
        setReferralCode(profile.referral_code);
      } else {
        setRefLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('referral_code')
            .eq('id', profile.id)
            .single();

          if (!error && data?.referral_code) {
            setReferralCode(data.referral_code);
          }
        } catch (e) {
          // ignore - referral code is optional
          console.error('Failed to fetch referral_code fallback', e);
        } finally {
          setRefLoading(false);
        }
      }

      // fetch referral count (how many users this profile referred)
      try {
        const { count, error } = await supabase
          .from('referrals')
          .select('id', { head: true, count: 'exact' })
          .eq('referrer_id', profile.id);

        if (!error) {
          setReferralCount(Number(count ?? 0));
        }
      } catch (e) {
        console.warn('Failed to load referral count', e);
      }
    }

    loadReferralInfo();
  }, [profile]);

  const handleCopyReferral = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // fallback: prompt
      // eslint-disable-next-line no-alert
      alert('Copy this link: ' + link);
    }
  };

  const handleShareReferral = async () => {
    if (!referralCode) return;
    const link = `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join NRI Wing',
          text: 'Sign up using my referral link',
          url: link
        });
      } catch (e) {
        console.warn('Share failed', e);
      }
    } else {
      // fallback to copy
      handleCopyReferral();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (error) throw error;

      await refreshProfile();
      setMessage('Profile updated successfully!');
      setEditing(false);
    } catch (error: any) {
      setMessage('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // referral link computed only when referralCode exists
  const referralLink =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}/signup?ref=${encodeURIComponent(referralCode)}`
      : '';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Profile</h2>
          <p className="text-gray-600">Manage your account information</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition"
          >
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{profile?.full_name}</h3>
            <p className="text-gray-600">{profile?.email}</p>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                profile?.status === 'verified'
                  ? 'bg-green-200 text-green-800'
                  : profile?.status === 'pending'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-red-200 text-red-800'
              }`}
            >
              {profile?.status}
            </span>
          </div>
        </div>

        {/* Referral Card (shows only when referralCode available OR when ref fetch is loading) */}
        <div className="mt-4">
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-sm text-gray-500">Your referral</h4>

            {refLoading ? (
              <div className="text-sm text-gray-500 mt-2">Loading referral info…</div>
            ) : referralCode ? (
              <div className="mt-2 space-y-3">
                <div className="text-xs text-gray-500">Referral code</div>
                <div className="flex items-center justify-between">
                  <div className="font-medium break-all">{referralCode}</div>
                  <div className="text-sm text-gray-500">Referrals: {referralCount ?? 0}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Referral link</div>
                  <div className="mt-1 flex gap-2 items-center">
                    <input
                      readOnly
                      value={referralLink}
                      className="flex-1 px-3 py-2 border rounded bg-gray-50 text-sm"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="px-3 py-2 bg-indigo-600 text-white rounded"
                      aria-label="Copy referral link"
                    >
                      {copied ? 'Copied' : <Clipboard className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareReferral}
                      className="px-3 py-2 border rounded"
                      aria-label="Share referral link"
                    >
                      <LinkIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Share this link — when someone signs up using it, they will be credited to you.
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-500">
                No referral code yet. It will be generated automatically on signup.
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                disabled={!editing}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                disabled
                value={profile?.email}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Native Place in Andhra Pradesh</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.native_district}
                onChange={(e) => setFormData({ ...formData, native_district: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Constituency</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.native_constituency}
                onChange={(e) => setFormData({ ...formData, native_constituency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mandal</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.native_mandal}
                onChange={(e) => setFormData({ ...formData, native_mandal: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.native_village}
                onChange={(e) => setFormData({ ...formData, native_village: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Current Location Abroad</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.current_country}
                onChange={(e) => setFormData({ ...formData, current_country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.current_state}
                onChange={(e) => setFormData({ ...formData, current_state: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                disabled={!editing}
                value={formData.current_city}
                onChange={(e) => setFormData({ ...formData, current_city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </div>

        {editing && (
          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
