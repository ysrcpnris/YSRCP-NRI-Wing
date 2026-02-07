import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, Profile } from "../lib/supabase";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isVerified: boolean;
  signUp: (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<Session | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const initializingRef = useRef(true);
  const killingSessionRef = useRef(false);

  const clearAdminFlag = () => {
    localStorage.removeItem("is_admin");
  };

  const setAdminFlag = (p: Profile | null) => {
    if (p?.role === "admin") {
      localStorage.setItem("is_admin", "true");
    } else {
      localStorage.removeItem("is_admin");
    }
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchProfile error:", error);
      return null;
    }

    return data;
  };

  const hardResetState = () => {
    setUser(null);
    setProfile(null);
    setIsVerified(false);
    clearAdminFlag();
  };

  const killUnverifiedSession = async () => {
    if (killingSessionRef.current) return;
    killingSessionRef.current = true;
    try {
      await supabase.auth.signOut();
    } catch (_) {
    } finally {
      hardResetState();
      killingSessionRef.current = false;
    }
  };

  /**
   * This runs after we've verified the session and fetched the profile.
   * We also attempt referral processing here (idempotent check).
   */
  const processReferralIfNeeded = async (currentUserId: string, p: Profile | null) => {
    try {
      const referralCode = localStorage.getItem("referral_code");
      if (!referralCode) return;

      // Check if a referral already exists for this user (prevent duplicates)
      const { data: existingReferral, error: existingErr } = await supabase
        .from("referrals")
        .select("id")
        .eq("referred_id", currentUserId)
        .limit(1)
        .maybeSingle();

      if (existingErr) {
        console.error("error checking existing referral:", existingErr);
        return;
      }
      if (existingReferral) {
        // referral already exists, clean up and return
        localStorage.removeItem("referral_code");
        return;
      }

      // find direct referrer by referral_code
      const { data: referrerProfile, error: referrerErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      if (referrerErr || !referrerProfile?.id) {
        // no valid referrer found, just clear and return
        localStorage.removeItem("referral_code");
        return;
      }

      const directReferrerId = referrerProfile.id;

      // insert direct referral (active)
      const { error: insertDirectErr } = await supabase.from("referrals").insert({
        referrer_id: directReferrerId,
        referred_id: currentUserId,
        source: "active",
      });

      if (insertDirectErr) {
        console.error("error inserting direct referral:", insertDirectErr);
      }

      // attempt to find parent referral (one level up) and insert passive
      const { data: parentReferral, error: parentErr } = await supabase
        .from("referrals")
        .select("referrer_id")
        .eq("referred_id", directReferrerId)
        .limit(1)
        .maybeSingle();

      if (!parentErr && parentReferral?.referrer_id) {
        const { error: insertPassiveErr } = await supabase.from("referrals").insert({
          referrer_id: parentReferral.referrer_id,
          referred_id: currentUserId,
          source: "passive",
        });

        if (insertPassiveErr) {
          console.error("error inserting passive referral:", insertPassiveErr);
        }
      }

      // cleanup localstorage
      localStorage.removeItem("referral_code");
    } catch (err) {
      console.error("processReferralIfNeeded error:", err);
    }
  };

  const applyVerifiedSession = async (session: Session) => {
    setUser(session.user);
    setIsVerified(true);
    let p = await fetchProfile(session.user.id);

    // If profile not found, try to create it from auth user metadata (populated during signup)
    if (!p) {
      try {
        const meta: any = session.user.user_metadata || {};

        const insertPayload: any = {
          id: session.user.id,
          email: session.user.email,
          first_name: meta.first_name || meta.full_name || "",
          last_name: meta.last_name || "",
          full_name: meta.full_name || `${meta.first_name || ""} ${meta.last_name || ""}`.trim() || null,
          mobile_number: meta.mobile_number || null,
          whatsapp_number: meta.whatsapp_number || null,
          country_of_residence: meta.country_of_residence || null,
          indian_state: meta.indian_state || null,
          district: meta.district || null,
          assembly_constituency: meta.assembly_constituency || null,
          mandal: meta.mandal || null,
          city_abroad: meta.city_abroad || null,
          state_abroad: meta.state_abroad || null,
          profession: meta.profession || null,
          organization: meta.organization || null,
          designation: meta.designation || null,
          contribution: meta.contribution || null,
          referral_code: meta.referral_code || null,
          role: meta.role || 'user',
          auth_user_id: session.user.id,
        };

        const { error: insertErr } = await supabase.from('profiles').insert(insertPayload);
        if (insertErr) {
          // Log and continue — insertion may fail due to unique constraints or triggers
          console.error('Failed to insert profile after verification:', insertErr);
        } else {
          // Refresh fetched profile
          p = await fetchProfile(session.user.id);
        }
      } catch (e) {
        console.error('Error creating profile after verification:', e);
      }
    }

    setProfile(p);
    setAdminFlag(p);

    // After profile exists, try processing referral (idempotent)
    await processReferralIfNeeded(session.user.id, p);
  };

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      hardResetState();
      return;
    }

    const isRecovery =
      session.user.recovery_sent_at ||
      session.user.user_metadata?.recovery === true;

    if (!session.user.email_confirmed_at && !isRecovery) {
      await killUnverifiedSession();
      return;
    }

    await applyVerifiedSession(session);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      await handleSession(session);

      if (mounted) {
        setLoading(false);
        initializingRef.current = false;
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (initializingRef.current) return;
      if (!mounted) return;

      // Handle auth changes in background without toggling the global
      // loading state — avoid showing the full-page loader when the
      // tab regains focus or the token refreshes.
      void handleSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
    setAdminFlag(p);

    // After refreshing profile, ensure referral processed (idempotent)
    await processReferralIfNeeded(user.id, p);
  };

  /**
   * UPDATED signUp:
   * - Do NOT insert into `profiles` from the frontend.
   * - Send collected form/profile data as `options.data` (raw_user_meta_data).
   * - Let the DB trigger read raw_user_meta_data and create profiles atomically.
   */
  const signUp = async (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => {
    // Build the metadata payload with only relevant keys (sanitized)
    const meta: Record<string, unknown> = {};
    // Include common profile fields so DB trigger can create profiles after verification
    const keys: (keyof typeof profileData)[] = [
      'first_name',
      'last_name',
      'full_name',
      'mobile_number',
      'whatsapp_number',
      'country_of_residence',
      'state_abroad',
      'city_abroad',
      'indian_state',
      'district',
      'assembly_constituency',
      'mandal',
      'village',
      'profession',
      'organization',
      'designation',
      'contribution',
      'participate_campaign',
      'instagram_id',
      'facebook_id',
      'twitter_id',
      'linkedin_id',
      'referral_code',
    ];

    for (const k of keys) {
      const v = profileData[k];
      if (v !== undefined && v !== null && v !== '') meta[k as string] = v;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-verified`,
        data: meta,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Signup failed");
    }

    // IMPORTANT: do NOT attempt profile insert or delete auth here.
    // The DB trigger will create the profile and ensure atomicity.
    // We still sign the user out here to force email verification flow (existing behavior).
    await killUnverifiedSession();
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    const user = data.user;

    if (!user) {
      throw new Error("Login failed");
    }

    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error("Please verify your email before logging in");
    }

    return data;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      if (err?.name !== "AuthSessionMissingError") {
        throw err;
      }
    } finally {
      hardResetState();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isVerified,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}