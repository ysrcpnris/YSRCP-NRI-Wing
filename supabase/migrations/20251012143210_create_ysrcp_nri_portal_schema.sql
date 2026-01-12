/*
  # YSRCP NRI Wing Portal - Complete Database Schema

  ## 1. New Tables

  ### User Management
    - `profiles` - Extended user profiles with native place and current location
      - `id` (uuid, references auth.users)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `profile_photo` (text, URL)
      - `occupation` (text)
      - `native_district` (text)
      - `native_constituency` (text)
      - `native_mandal` (text)
      - `native_village` (text)
      - `current_country` (text)
      - `current_state` (text)
      - `current_city` (text)
      - `role` (text: member, coordinator, admin)
      - `status` (text: pending, verified, rejected)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `wings` - Different organizational wings (Doctors, Media, IT, Youth, etc.)
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `icon` (text)
      - `created_at` (timestamptz)

    - `profile_wings` - Many-to-many relationship between profiles and wings
      - `profile_id` (uuid, references profiles)
      - `wing_id` (uuid, references wings)
      - `created_at` (timestamptz)

  ### Local Leader Mapping
    - `local_leaders` - AP local leaders mapped to constituencies
      - `id` (uuid, primary key)
      - `name` (text)
      - `designation` (text: MLA, Ex-MLA, District In-charge, etc.)
      - `district` (text)
      - `constituency` (text)
      - `mandal` (text, nullable)
      - `phone` (text)
      - `email` (text)
      - `photo` (text, URL)
      - `party_position` (text)
      - `created_at` (timestamptz)

  ### Student Assistance
    - `student_requests` - Student assistance applications
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `request_type` (text: university_guidance, exam_prep, fee_discount, mentorship)
      - `course_level` (text: undergraduate, graduate, postgraduate)
      - `field_of_study` (text)
      - `target_country` (text)
      - `description` (text)
      - `status` (text: pending, assigned, in_progress, completed)
      - `assigned_mentor_id` (uuid, references profiles, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ### Job Assistance
    - `job_postings` - Job openings posted by NRIs
      - `id` (uuid, primary key)
      - `posted_by` (uuid, references profiles)
      - `title` (text)
      - `company` (text)
      - `location` (text)
      - `country` (text)
      - `job_type` (text: full_time, part_time, internship)
      - `description` (text)
      - `requirements` (text)
      - `salary_range` (text, nullable)
      - `application_email` (text)
      - `status` (text: active, closed)
      - `created_at` (timestamptz)
      - `expires_at` (timestamptz)

    - `job_applications` - Applications for job postings
      - `id` (uuid, primary key)
      - `job_id` (uuid, references job_postings)
      - `applicant_id` (uuid, references profiles)
      - `resume_url` (text)
      - `cover_letter` (text)
      - `status` (text: applied, shortlisted, rejected, hired)
      - `created_at` (timestamptz)

  ### Events & Meetings
    - `events` - All events and meetings
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `event_type` (text: meeting, webinar, celebration, fundraiser)
      - `date` (timestamptz)
      - `time` (text)
      - `venue` (text, nullable)
      - `virtual_link` (text, nullable)
      - `country` (text, nullable)
      - `state` (text, nullable)
      - `banner_image` (text, URL)
      - `organizer_id` (uuid, references profiles)
      - `max_attendees` (integer, nullable)
      - `status` (text: upcoming, ongoing, completed, cancelled)
      - `created_at` (timestamptz)

    - `event_rsvps` - Event registrations
      - `id` (uuid, primary key)
      - `event_id` (uuid, references events)
      - `profile_id` (uuid, references profiles)
      - `status` (text: yes, no, maybe)
      - `created_at` (timestamptz)

  ### Media & News
    - `news_articles` - News and announcements
      - `id` (uuid, primary key)
      - `title` (text)
      - `content` (text)
      - `excerpt` (text)
      - `featured_image` (text, URL)
      - `author_id` (uuid, references profiles)
      - `category` (text: news, announcement, press_release)
      - `country_scope` (text, nullable)
      - `published` (boolean, default false)
      - `created_at` (timestamptz)
      - `published_at` (timestamptz, nullable)

    - `media_gallery` - Photos and videos
      - `id` (uuid, primary key)
      - `title` (text)
      - `media_type` (text: photo, video)
      - `media_url` (text)
      - `thumbnail_url` (text, nullable)
      - `event_id` (uuid, references events, nullable)
      - `uploaded_by` (uuid, references profiles)
      - `created_at` (timestamptz)

  ### Grievance & Feedback
    - `grievances` - Grievance submissions
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `subject` (text)
      - `category` (text: general, local_issue, party_matter, technical)
      - `description` (text)
      - `country` (text)
      - `state` (text, nullable)
      - `status` (text: open, in_progress, resolved, closed)
      - `assigned_to` (uuid, references profiles, nullable)
      - `response` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  ### Coordinators
    - `coordinators` - Regional coordinators
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references profiles)
      - `region` (text: North America, Europe, Middle East, Asia Pacific, etc.)
      - `country` (text, nullable)
      - `state` (text, nullable)
      - `position` (text: Global Coordinator, Country Coordinator, State Coordinator)
      - `created_at` (timestamptz)

  ### Volunteer Tasks
    - `volunteer_tasks` - Tasks for digital volunteering
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `task_type` (text: content_creation, translation, phone_banking, social_media)
      - `status` (text: open, assigned, in_progress, completed)
      - `assigned_to` (uuid, references profiles, nullable)
      - `created_by` (uuid, references profiles)
      - `due_date` (timestamptz, nullable)
      - `created_at` (timestamptz)

  ## 2. Security

  All tables have RLS enabled with appropriate policies for:
    - Authenticated users can read their own data
    - Authenticated users can read public information
    - Coordinators and admins can manage data
    - Members can submit requests and applications
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  profile_photo text,
  occupation text,
  native_district text,
  native_constituency text,
  native_mandal text,
  native_village text,
  current_country text,
  current_state text,
  current_city text,
  role text DEFAULT 'member',
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Wings table
CREATE TABLE IF NOT EXISTS wings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Profile wings junction table
CREATE TABLE IF NOT EXISTS profile_wings (
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  wing_id uuid REFERENCES wings(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (profile_id, wing_id)
);

-- Local leaders table
CREATE TABLE IF NOT EXISTS local_leaders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  designation text NOT NULL,
  district text,
  constituency text,
  mandal text,
  phone text,
  email text,
  photo text,
  party_position text,
  created_at timestamptz DEFAULT now()
);

-- Student requests table
CREATE TABLE IF NOT EXISTS student_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  request_type text NOT NULL,
  course_level text,
  field_of_study text,
  target_country text,
  description text,
  status text DEFAULT 'pending',
  assigned_mentor_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Job postings table
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  posted_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  company text NOT NULL,
  location text,
  country text,
  job_type text NOT NULL,
  description text,
  requirements text,
  salary_range text,
  application_email text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Job applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id uuid REFERENCES job_postings(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  resume_url text,
  cover_letter text,
  status text DEFAULT 'applied',
  created_at timestamptz DEFAULT now()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL,
  date timestamptz NOT NULL,
  time text,
  venue text,
  virtual_link text,
  country text,
  state text,
  banner_image text,
  organizer_id uuid REFERENCES profiles(id),
  max_attendees integer,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);

-- Event RSVPs table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'yes',
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, profile_id)
);

-- News articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text,
  featured_image text,
  author_id uuid REFERENCES profiles(id),
  category text NOT NULL,
  country_scope text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz
);

-- Media gallery table
CREATE TABLE IF NOT EXISTS media_gallery (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  media_type text NOT NULL,
  media_url text NOT NULL,
  thumbnail_url text,
  event_id uuid REFERENCES events(id),
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Grievances table
CREATE TABLE IF NOT EXISTS grievances (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  country text,
  state text,
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES profiles(id),
  response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Coordinators table
CREATE TABLE IF NOT EXISTS coordinators (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  region text NOT NULL,
  country text,
  state text,
  position text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Volunteer tasks table
CREATE TABLE IF NOT EXISTS volunteer_tasks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  task_type text NOT NULL,
  status text DEFAULT 'open',
  assigned_to uuid REFERENCES profiles(id),
  created_by uuid REFERENCES profiles(id),
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_wings ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE coordinators ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_tasks ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Wings policies (public read)
CREATE POLICY "Anyone can view wings"
  ON wings FOR SELECT
  TO authenticated
  USING (true);

-- Profile wings policies
CREATE POLICY "Users can manage own wing memberships"
  ON profile_wings FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Local leaders policies (public read)
CREATE POLICY "Authenticated users can view local leaders"
  ON local_leaders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage local leaders"
  ON local_leaders FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Student requests policies
CREATE POLICY "Users can view own student requests"
  ON student_requests FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR assigned_mentor_id = auth.uid());

CREATE POLICY "Users can create student requests"
  ON student_requests FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Admins can manage student requests"
  ON student_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Job postings policies
CREATE POLICY "Authenticated users can view active jobs"
  ON job_postings FOR SELECT
  TO authenticated
  USING (status = 'active' OR posted_by = auth.uid());

CREATE POLICY "Users can create job postings"
  ON job_postings FOR INSERT
  TO authenticated
  WITH CHECK (posted_by = auth.uid());

CREATE POLICY "Users can update own job postings"
  ON job_postings FOR UPDATE
  TO authenticated
  USING (posted_by = auth.uid())
  WITH CHECK (posted_by = auth.uid());

-- Job applications policies
CREATE POLICY "Users can view own applications"
  ON job_applications FOR SELECT
  TO authenticated
  USING (
    applicant_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM job_postings
      WHERE job_postings.id = job_applications.job_id AND job_postings.posted_by = auth.uid()
    )
  );

CREATE POLICY "Users can create job applications"
  ON job_applications FOR INSERT
  TO authenticated
  WITH CHECK (applicant_id = auth.uid());

-- Events policies
CREATE POLICY "Authenticated users can view events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Coordinators can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );

CREATE POLICY "Event organizers can update events"
  ON events FOR UPDATE
  TO authenticated
  USING (organizer_id = auth.uid())
  WITH CHECK (organizer_id = auth.uid());

-- Event RSVPs policies
CREATE POLICY "Users can manage own RSVPs"
  ON event_rsvps FOR ALL
  TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Event organizers can view RSVPs"
  ON event_rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_rsvps.event_id AND events.organizer_id = auth.uid()
    )
  );

-- News articles policies
CREATE POLICY "Authenticated users can view published articles"
  ON news_articles FOR SELECT
  TO authenticated
  USING (published = true OR author_id = auth.uid());

CREATE POLICY "Admins can manage news articles"
  ON news_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Media gallery policies
CREATE POLICY "Authenticated users can view media"
  ON media_gallery FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can upload media"
  ON media_gallery FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Grievances policies
CREATE POLICY "Users can view own grievances"
  ON grievances FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can create grievances"
  ON grievances FOR INSERT
  TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Assigned coordinators can update grievances"
  ON grievances FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Admins can manage all grievances"
  ON grievances FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );

-- Coordinators policies
CREATE POLICY "Authenticated users can view coordinators"
  ON coordinators FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage coordinators"
  ON coordinators FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Volunteer tasks policies
CREATE POLICY "Authenticated users can view tasks"
  ON volunteer_tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update assigned tasks"
  ON volunteer_tasks FOR UPDATE
  TO authenticated
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

CREATE POLICY "Coordinators can manage tasks"
  ON volunteer_tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'coordinator')
    )
  );
