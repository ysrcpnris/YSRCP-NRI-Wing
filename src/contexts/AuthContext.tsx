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
import { MESSAGES } from "../constants/messages";


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
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchProfile error:", error);
      return null;
    }
    return data as Profile | null;
  } catch (err) {
    console.error("fetchProfile unexpected error:", err);
    return null;
  }
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
 // If profile missing → block session
if (!p) {
  console.error("Profile missing for verified user");
  await killUnverifiedSession();
  return;
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
  const normalizedEmail = (email || "").trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // If auth failed
    if (error) {
      // Check if this email exists in auth by attempting password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: window.location.origin }
      );

      if (!resetError) {
        // Email exists but login failed -> either wrong password or unverified
        throw new Error(MESSAGES.EMAIL_NOT_VERIFIED);
      }

      // Email truly doesn't exist
      throw new Error(MESSAGES.NOT_REGISTERED);
    }

    const user = data?.user;

    if (!user) {
      throw new Error(MESSAGES.WRONG_CREDENTIALS);
    }

    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error(MESSAGES.EMAIL_NOT_VERIFIED);
    }

    const profileRow = await fetchProfile(user.id);
    if (!profileRow) {
      await supabase.auth.signOut();
      throw new Error(MESSAGES.REGISTRATION_INCOMPLETE);
    }

    return data;
  } catch (err: any) {
    if (err instanceof Error && Object.values(MESSAGES).includes(err.message)) {
      throw err;
    }
    throw new Error(MESSAGES.GENERIC_ERROR);
  }
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