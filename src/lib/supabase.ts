import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});


export type Profile = {
  id: string;
  // Personal Information
  first_name?: string;
  last_name?: string;
  mobile_number?: string;
  whatsapp_number?: string;
  email: string;
  country_of_residence?: string;
  state_abroad?: string;
  city_abroad?: string;

  // Indian Address Details
  indian_state?: string;
  district?: string;
  assembly_constituency?: string;
  mandal?: string;
  village?: string;

  // Demographics & Professional Details
  gender?: string;
  dob?: string;
  profession?: string;
  organization?: string;
  role_designation?: string;

  // Engagement & Participation
  contribution?: string;
  participate_campaign?: string;
  suggestions?: string;
  // Referral Information
  referred_by?: string;
  referral_code?: string;
  public_user_code?: string;
  designation?: string;

  // Active family member in the party (optional — only filled when the user
  // identifies as an active YSRCP family). At most one per profile.
  family_relation?: string;
  family_name?: string;
  family_mobile?: string;
  family_village?: string;
  family_designation?: string;

  // Social Media Handles
  instagram_id?: string;
  facebook_id?: string;
  twitter_id?: string;
  linkedin_id?: string;
  


  // Legacy fields (for backward compatibility)
  full_name?: string;
  phone?: string;
  profile_photo?: string;
  occupation?: string;
  native_district?: string;
  native_constituency?: string;
  native_mandal?: string;
  native_village?: string;
  current_country?: string;
  current_state?: string;
  current_city?: string;

  role: 'member' | 'coordinator' | 'admin' | 'support_team' | 'user';
  status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type Wing = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  created_at: string;
};

export type LocalLeader = {
  id: string;
  name: string;
  designation: string;
  district?: string;
  constituency?: string;
  mandal?: string;
  phone?: string;
  email?: string;
  photo?: string;
  party_position?: string;
  created_at: string;
};

export type StudentRequest = {
  id: string;
  profile_id: string;
  request_type: 'university_guidance' | 'exam_prep' | 'fee_discount' | 'mentorship';
  course_level?: string;
  field_of_study?: string;
  target_country?: string;
  description?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  assigned_mentor_id?: string;
  created_at: string;
  updated_at: string;
};

export type JobPosting = {
  id: string;
  posted_by: string;
  title: string;
  company: string;
  location?: string;
  country?: string;
  job_type: 'full_time' | 'part_time' | 'internship';
  description?: string;
  requirements?: string;
  salary_range?: string;
  application_email?: string;
  status: 'active' | 'closed';
  created_at: string;
  expires_at?: string;
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  event_type: 'meeting' | 'webinar' | 'celebration' | 'fundraiser';
  date: string;
  time?: string;
  venue?: string;
  virtual_link?: string;
  country?: string;
  state?: string;
  banner_image?: string;
  organizer_id?: string;
  max_attendees?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  author_id?: string;
  category: 'news' | 'announcement' | 'press_release';
  country_scope?: string;
  published: boolean;
  created_at: string;
  published_at?: string;
};

export type Grievance = {
  id: string;
  profile_id: string;
  subject: string;
  category: 'general' | 'local_issue' | 'party_matter' | 'technical';
  description: string;
  country?: string;
  state?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to?: string;
  response?: string;
  created_at: string;
  updated_at: string;
};

export type Coordinator = {
  id: string;
  profile_id: string;
  region: string;
  country?: string;
  state?: string;
  position: string;
  created_at: string;
  profile?: Profile;
};

