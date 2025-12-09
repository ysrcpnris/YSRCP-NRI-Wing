
import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  MapPin,
  ChevronDown,
  LogOut,
  Briefcase,
  GraduationCap,
  Scale,
  Check,
  ArrowRight,
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DashboardProps {
  onClose: () => void;
  onLogout: () => void;
  role?: "Job" | "Business" | "Student";
}

type SectionKey =
  | 'profile'
  | 'referrals'
  | 'connect'
  | 'services'
  | 'events'
  | 'notifications';

type Referral = {
  id: number;
  member_name: string;
  location: string | null;
  type: 'active' | 'passive';
  created_at: string;
};

type Leader = {
  id: number;
  role: string;
  name: string;
  avatar_url: string | null;
  whatsapp_number: string | null;
  sort_order?: number;
};

type EventItem = {
  id: number;
  title: string;
  event_date: string; // ISO date string
  city: string | null;
  status: string | null; // e.g. "Upcoming"
};

type NotificationItem = {
  id: number;
  title: string;
  body: string | null;
  created_at: string;
  is_read: boolean;
};

const Dashboard: React.FC<DashboardProps> = ({ onClose, onLogout, role }) => {

  const [expandedSection, setExpandedSection] = useState<SectionKey | null>('profile');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'info' } | null>(
    null
  );
  const { user, refreshProfile, profile } = useAuth();
  
  // Photo upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Dynamic data state
  const [activeReferrals, setActiveReferrals] = useState<Referral[]>([]);
  const [passiveReferrals, setPassiveReferrals] = useState<Referral[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Summary stats for referrals
  const referralStats = useMemo(() => {
    const active = activeReferrals.length;
    const passive = passiveReferrals.length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const createdThisWeek = [...activeReferrals, ...passiveReferrals].filter((r) => {
      const d = new Date(r.created_at);
      return d >= weekAgo;
    }).length;

    return {
      active,
      passive,
      newThisWeek: createdThisWeek,
    };
  }, [activeReferrals, passiveReferrals]);

  // Toast timeout
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type });
  };

  const toggleSection = (section: SectionKey) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  // Photo handlers
  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !user) {
      showToast('No file selected or user not available', 'info');
      return;
    }

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `profile-photos/${user.id}_${Date.now()}.${fileExt}`;
     const { error: uploadError } = await supabase.storage
  .from('profile-photos')
  .upload(filePath, photoFile, { upsert: true });

if (uploadError) {
  console.error('Storage upload error', uploadError);
  throw uploadError;
}

// ✔ Correct Supabase v2 syntax
const { data: publicUrlData } = supabase.storage
  .from('profile-photos')
  .getPublicUrl(filePath);

const publicUrl = publicUrlData.publicUrl;

// Save public URL in DB
const { error: updateError } = await supabase
  .from('profiles')
  .update({ profile_photo: publicUrl })
  .eq('id', user.id);


      if (updateError) {
        console.error('Profile update error', updateError);
        throw updateError;
      }

      await refreshProfile();
      showToast('Profile photo updated', 'success');

      setPhotoFile(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
    } catch (err: any) {
      console.error('Upload error', err);
      const msg = err?.message || err?.error_description || 'Upload failed';
      showToast(msg, 'info');
    } finally {
      setUploading(false);
    }
  };

  // Fetch dashboard data from Supabase
  useEffect(() => {
    if (!user) return;

    const loadDashboard = async () => {
      setLoadingDashboard(true);
      try {
        // 1. Referrals for this user
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (referralError) {
          console.error('Referrals fetch error', referralError);
        } else if (referralData) {
          const active = (referralData as Referral[]).filter((r) => r.type === 'active');
          const passive = (referralData as Referral[]).filter((r) => r.type === 'passive');
          setActiveReferrals(active);
          setPassiveReferrals(passive);
        }

        // 2. Leaders
        const { data: leadersData, error: leadersError } = await supabase
          .from('leaders')
          .select('*')
          .order('sort_order', { ascending: true });

        if (leadersError) {
          console.error('Leaders fetch error', leadersError);
        } else if (leadersData) {
          setLeaders(leadersData as Leader[]);
        }

        // 3. Events (nearest upcoming first)
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: true });

        if (eventsError) {
          console.error('Events fetch error', eventsError);
        } else if (eventsData) {
          setEvents(eventsData as EventItem[]);
        }

        // 4. Notifications (latest first) – both read & unread; UI highlights unread count
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (notifError) {
          console.error('Notifications fetch error', notifError);
        } else if (notifData) {
          setNotifications(notifData as NotificationItem[]);
        }
      } finally {
        setLoadingDashboard(false);
      }
    };

    loadDashboard();
  }, [user]);

  // Helper to format dates like "Jan 12, 2025"
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getMonthDay = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { month: '', day: '' };
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      day: d.getDate().toString(),
    };
  };

  const fullName =
    (profile?.first_name || profile?.last_name) ?
      `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() :
      '';

  const referralLink = profile
    ? `https://ysrcp.com/join/${profile.id}`
    : 'https://ysrcp.com/join/YOURCODE';

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;

  // --- ENRICHED SUMMARY RENDERERS (Visible when Collapsed) ---

  const renderProfileSummary = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
          <span>Profile Completion</span>
          {/* still static for now, you can compute this later from filled fields */}
          <span className="text-indigo-600">75%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 w-3/4 rounded-full shadow-sm"></div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 sm:border-l sm:border-gray-200 sm:pl-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={14} className="text-green-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-500" />
          <span>Socials Pending</span>
        </div>
      </div>
    </div>
  );

  const renderReferralsSummary = () => (
    <div className="flex flex-wrap items-center gap-6 w-full mt-1 opacity-90">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-emerald-600 leading-none">
          {referralStats.active}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>
      <div className="w-px bg-gray-200 h-6 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-blue-600 leading-none">
          {referralStats.passive}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Passive
          </span>
        </div>
      </div>
      <div className="flex-1 text-right hidden md:block">
        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
          +{referralStats.newThisWeek} this week
        </span>
      </div>
    </div>
  );

  const renderConnectSummary = () => (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {(leaders.slice(0, 4) || []).map((leader) => (
            <div
              key={leader.id}
              className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden"
            >
              <img
                src={
                  leader.avatar_url ||
                  `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                    leader.name || 'Leader'
                  )}`
                }
                alt={leader.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
        <span className="text-xs font-bold text-gray-600">
          {leaders[0]?.role || 'Leadership Contacts'}{' '}
          {leaders.length > 1 ? `& ${leaders.length - 1} Others` : ''}
        </span>
      </div>
    </div>
  );

  const renderServicesSummary = () => (
    <div className="flex flex-wrap items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100">
          Student
        </span>
        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-bold uppercase border border-purple-100">
          Legal
        </span>
        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase border border-amber-100">
          Career
        </span>
      </div>
    </div>
  );

  const renderEventsSummary = () => {
    const nextEvent = events[0];
    const monthDay = nextEvent ? getMonthDay(nextEvent.event_date) : null;

    return (
      <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
        {nextEvent ? (
          <>
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-center min-w-[36px]">
                <span className="block text-[9px] font-black uppercase">
                  {monthDay?.month}
                </span>
                <span className="block text-xs font-black leading-none">
                  {monthDay?.day}
                </span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-800">
                  {nextEvent.title}
                </span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-white bg-pink-500 px-2 py-0.5 rounded-full">
              {nextEvent.status || 'Upcoming'}
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500">No upcoming events yet.</div>
        )}
      </div>
    );
  };

  const renderNotificationsSummary = () => (
    <div className="w-full mt-1 flex items-center justify-between opacity-90">
      <div className="flex items-center gap-2">
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
          {unreadNotificationsCount}
        </span>
        <span className="text-xs text-gray-500 font-medium">Unread updates</span>
      </div>
    </div>
  );

  // --- EXPANDED CONTENT RENDERERS ---

  const renderProfileContent = () => (
    <div className="pt-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Photo Block */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden bg-gray-100 mb-3">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  No Photo
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2">
              <label className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-lg cursor-pointer text-xs font-bold">
                Select
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
              </label>
              <button
                onClick={() => {
                  setPhotoFile(null);
                  if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                  }
                  setPhotoPreview(null);
                }}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3">
              <button
                disabled={!photoFile || uploading}
                onClick={handleUploadPhoto}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="text-center relative z-10">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-indigo-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-white"
                    strokeDasharray="75, 100"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black">75%</span>
                </div>
              </div>
              <h3 className="text-base font-bold">Gold Member</h3>
              <p className="text-indigo-200 text-xs mb-3">Complete profile to unlock Platinum</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Missing Info
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 cursor-pointer transition-all">
                <span className="text-xs font-bold text-gray-600">Link Socials</span>
                <ArrowRight size={12} className="text-indigo-500" />
              </div>
              <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:border-indigo-300 cursor-pointer transition-all">
                <span className="text-xs font-bold text-gray-600">Add Profession</span>
                <ArrowRight size={12} className="text-indigo-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={fullName}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                defaultValue={profile?.email ?? ''}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <h4 className="text-xs font-black text-indigo-900 mb-3 flex items-center gap-2">
              <MapPin size={14} /> INDIAN ADDRESS
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none">
                <option>{profile?.indian_state || 'Select State'}</option>
              </select>
              <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none">
                <option>{profile?.district || 'Select District'}</option>
              </select>
              <select className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none">
                <option>{profile?.mandal || 'Select Mandal'}</option>
              </select>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider">
              Professional & Social
            </h4>

            {/* Profession - Free Text */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Profession / Designation
              </label>
              <input
             type="text"
             defaultValue={profile?.profession || profile?.role_designation || ""}
            placeholder="e.g. Senior Software Architect"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />

            </div>

            {/* Social Media Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Facebook className="absolute left-3 top-3 text-blue-600" size={16} />
                <input
                  type="text"
                  defaultValue={profile?.facebook_id ?? ''}
                  placeholder="Facebook Profile URL / ID"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-3 top-3 text-black" size={16} />
                <input
                  type="text"
                  defaultValue={profile?.twitter_id ?? ''}
                  placeholder="X (Twitter) Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 text-blue-700" size={16} />
                <input
                  type="text"
                  defaultValue={profile?.linkedin_id ?? ''}
                  placeholder="LinkedIn Profile URL"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 text-pink-600" size={16} />
                <input
                  type="text"
                  defaultValue={profile?.instagram_id ?? ''}
                  placeholder="Instagram Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              I want to contribute via:
            </h4>
            <div className="flex flex-wrap gap-2">
              {['Podcast', 'Tech Team', 'ORM', 'Content', 'Ground Force'].map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-white group"
                >
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-700">
                    {opt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => showToast('Profile Saved Successfully!')}
              className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-black transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Check size={14} /> Save Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReferralsContent = () => (
    <div className="pt-4 animate-fade-in space-y-6">
      {/* Top Row */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div>
          <h4 className="font-black text-xl mb-1">Refer & Earn</h4>
          <p className="text-emerald-100 text-xs max-w-md">
            Share your unique link. Top referrers get exclusive meeting invites with party
            leadership.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
          <code className="text-xs font-mono text-white px-2 truncate max-w-[200px]">
            {referralLink}
          </code>
          <button
            onClick={() => {
              navigator.clipboard
                ?.writeText(referralLink)
                .then(() => showToast('Referral Link Copied!'))
                .catch(() => showToast('Could not copy link', 'info'));
            }}
            className="bg-white text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tables - SCROLLABLE for large lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Active Referrals
            </h4>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              {activeReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {activeReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No active referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Passive Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Passive Tree
            </h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              {passiveReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {passiveReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No passive referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {passiveReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderConnectContent = () => {
    const colorClasses = [
      { text: 'text-purple-600', border: 'border-purple-200' },
      { text: 'text-blue-600', border: 'border-blue-200' },
      { text: 'text-emerald-600', border: 'border-emerald-200' },
      { text: 'text-orange-600', border: 'border-orange-200' },
    ];

    return (
      <div className="pt-4 animate-fade-in">
        {leaders.length === 0 ? (
          <div className="text-xs text-gray-500">No leadership contacts configured yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leaders.map((leader, idx) => {
              const colors = colorClasses[idx % colorClasses.length];
              return (
                <div
                  key={leader.id}
                  className={`bg-white border ${colors.border} rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all group`}
                >
                  <div className="w-16 h-16 rounded-full p-0.5 bg-white border border-gray-200 mb-3 relative">
                    <img
                      src={
                        leader.avatar_url ||
                        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                          leader.name || 'Leader'
                        )}`
                      }
                      alt={leader.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest mb-1 ${colors.text}`}
                  >
                    {leader.role}
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 mb-4">
                    {leader.name || 'Leader'}
                  </h4>

                  <button
                    onClick={() =>
                      showToast(
                        leader.whatsapp_number
                          ? `Opening WhatsApp with ${leader.name}...`
                          : 'WhatsApp contact not available',
                        'info'
                      )
                    }
                    className="w-full py-2 rounded-lg bg-[#25D366] hover:bg-[#20b85a] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageSquare size={14} fill="white" /> WhatsApp
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderServicesContent = () => (
    <div className="pt-4 animate-fade-in">
      {!selectedService ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: 'student',
              title: 'Student Support',
              icon: <GraduationCap size={28} />,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
            },
            {
              id: 'legal',
              title: 'Legal Advisor',
              icon: <Scale size={28} />,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
            {
              id: 'career',
              title: 'Career Coach',
              icon: <Briefcase size={28} />,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
            },
            {
              id: 'local',
              title: 'Local Connector',
              icon: <Users size={28} />,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
            },
          ].map((s) => (
            <div
              key={s.id}
              onClick={() => setSelectedService(s.id)}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center"
            >
              <div
                className={`w-12 h-12 ${s.bg} ${s.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
              >
                {s.icon}
              </div>
              <h3 className="font-bold text-sm text-gray-800 mb-2">{s.title}</h3>
              <span className="text-[10px] font-bold text-gray-400 group-hover:text-blue-600 uppercase tracking-wide flex items-center gap-1">
                Request Info <ArrowRight size={10} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 relative animate-fade-in">
          <button
            onClick={() => setSelectedService(null)}
            className="text-xs font-bold text-gray-500 hover:text-gray-900 flex items-center gap-1 mb-4"
          >
            <ArrowRight size={12} className="rotate-180" /> Back to Services
          </button>

          <h3 className="font-black text-lg text-gray-900 mb-4">Request Form</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all"
              placeholder="Applicant Name"
              defaultValue={fullName}
            />
            <input
            type="text"
           className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all"
           placeholder="Current Location"
          defaultValue={profile?.city_abroad || profile?.country_of_residence || ""}
/>

          </div>
          <textarea
            className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:border-blue-500 transition-all resize-none h-24 mb-4"
            placeholder="Describe your requirement..."
          ></textarea>
          <button
            onClick={() => {
              showToast('Application Submitted!');
              setSelectedService(null);
            }}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
          >
            <Send size={14} /> Submit Request
          </button>
        </div>
      )}
    </div>
  );

  const renderEventsContent = () => (
    <div className="pt-4 animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-4">
      {events.length === 0 ? (
        <div className="text-xs text-gray-500">No events found.</div>
      ) : (
        events.map((event) => {
          const md = getMonthDay(event.event_date);
          return (
            <div
              key={event.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="bg-gray-900 text-white w-16 h-16 rounded-lg flex flex-col items-center justify-center shrink-0 group-hover:bg-pink-600 transition-colors">
                <span className="text-[9px] font-black uppercase">{md.month}</span>
                <span className="text-2xl font-black leading-none">{md.day}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm text-gray-900 leading-tight mb-1">
                  {event.title}
                </h4>
                <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                  <MapPin size={10} /> {event.city || 'TBA'}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showToast('RSVP Confirmed!');
                }}
                className="px-4 py-1.5 border-2 border-gray-100 text-gray-600 font-bold text-[10px] rounded hover:bg-gray-50 transition-colors uppercase tracking-wide"
              >
                RSVP
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  const renderNotificationsContent = () => (
    <div className="pt-4 animate-fade-in">
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="p-4 text-xs text-gray-500">No notifications yet.</div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className="p-4 flex gap-3 hover:bg-gray-50 transition-colors group cursor-pointer"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  n.is_read ? 'bg-blue-50 text-blue-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {n.is_read ? <Bell size={16} /> : <AlertCircle size={16} />}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-gray-900">{n.title}</h4>
                  <span className="text-[9px] font-medium text-gray-400">
                    {formatDate(n.created_at)}
                  </span>
                </div>
                {n.body && (
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // Reusable Accordion Item
  const AccordionItem = ({
    id,
    title,
    icon,
    content,
    summary,
    color,
  }: {
    id: SectionKey;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
    summary: React.ReactNode;
    color: string;
  }) => {
    const isOpen = expandedSection === id;

    return (
      <div
        className={`
            transition-all duration-300 ease-out mb-3 rounded-xl border overflow-hidden group
            ${isOpen ? 'bg-white border-gray-300 shadow-xl ring-1 ring-black/5 z-10' : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'}
        `}
      >
        {/* Header Bar */}
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 outline-none transition-colors relative overflow-hidden"
        >
          {/* Background highlighting on hover/active */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isOpen ? 'bg-gray-50/80' : 'bg-white group-hover:bg-gray-50'
            }`}
          ></div>

          <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
            {/* Icon Box */}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0
                ${isOpen ? color + ' text-white shadow-md' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}
            `}
            >
              {icon}
            </div>

            {/* Title & Summary Container */}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span
                className={`text-sm font-black tracking-tight transition-colors ${
                  isOpen ? 'text-gray-900 text-base' : 'text-gray-700'
                }`}
              >
                {title}
              </span>

              {/* Summary (Fade out when open, Fade in when closed) */}
              <div
                className={`transition-all duration-300 origin-top w-full ${
                  isOpen ? 'h-0 opacity-0 scale-y-0 hidden' : 'h-auto opacity-100 scale-y-100 block'
                }`}
              >
                {summary}
              </div>
            </div>
          </div>

          {/* Chevron */}
          <div
            className={`
            w-6 h-6 rounded-full flex items-center justify-center ml-3 transition-all duration-300 shrink-0 relative z-10
            ${isOpen ? 'bg-gray-200 text-gray-800 rotate-180' : 'text-gray-400'}
          `}
          >
            <ChevronDown size={16} />
          </div>
        </button>

        {/* Expanded Content Body */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-4 pb-6 sm:px-6 border-t border-gray-100 bg-white relative z-10">
            {content}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col animate-fade-in font-sans bg-gray-100/95 backdrop-blur-sm">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up ${
            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
          <span className="text-xs font-bold uppercase tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-white border-b border-gray-200 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ysrcp-blue rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
            YSRC
          </div>
          <div>
           <h1 className="font-black text-lg text-gray-900 tracking-tight leading-none">
  {role ? `${role} Dashboard` : "My Portal"}
</h1>

            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">
              ● {loadingDashboard ? 'Syncing…' : 'Online'}
            </p>
          </div>
        </div>
       <div className="flex items-center gap-2">
  {/* Logout - MOBILE */}
  <button
    onClick={onLogout}
    title="Logout"
    className="flex sm:hidden w-9 h-9 items-center justify-center
               text-red-600 bg-white border border-red-200 rounded-full
               hover:bg-red-50 hover:border-red-300 hover:text-red-700
               transition-all shadow-sm"
  >
    <LogOut size={16} />
  </button>

  {/*  Logout - DESKTOP  */}
  <button
    onClick={onLogout}
    className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide
               text-red-600 bg-white border border-red-200 rounded-lg
               hover:bg-red-50 hover:border-red-300 hover:text-red-700
               transition-all shadow-sm"
  >
    <LogOut size={14} />
    Logout
  </button>

  {/* Close Button - Neutral */}
  <button
    onClick={onClose}
    className="w-9 h-9 flex items-center justify-center
               text-gray-500 bg-white border border-gray-200 rounded-full
               hover:bg-gray-100 hover:text-gray-900
               transition-all shadow-sm"
  >
    <X size={18} />
  </button>
</div>

  

      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-10">
        <div className="max-w-7xl mx-auto pb-20">
          <AccordionItem
            id="profile"
            title="Complete Profile"
            summary={renderProfileSummary()}
            icon={<User size={20} />}
            content={renderProfileContent()}
            color="bg-indigo-600"
          />

          <AccordionItem
            id="referrals"
            title="My Network"
            summary={renderReferralsSummary()}
            icon={<Users size={20} />}
            content={renderReferralsContent()}
            color="bg-emerald-600"
          />

          <AccordionItem
            id="connect"
            title="Leadership Connect"
            summary={renderConnectSummary()}
            icon={<MessageSquare size={20} />}
            content={renderConnectContent()}
            color="bg-blue-600"
          />

          <AccordionItem
            id="services"
            title="Services Hub"
            summary={renderServicesSummary()}
            icon={<Briefcase size={20} />}
            content={renderServicesContent()}
            color="bg-amber-500"
          />

          <AccordionItem
            id="events"
            title="Events & Summits"
            summary={renderEventsSummary()}
            icon={<Calendar size={20} />}
            content={renderEventsContent()}
            color="bg-pink-600"
          />

          <AccordionItem
            id="notifications"
            title="Notifications"
            summary={renderNotificationsSummary()}
            icon={<Bell size={20} />}
            content={renderNotificationsContent()}
            color="bg-red-500"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
