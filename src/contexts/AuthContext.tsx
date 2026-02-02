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

  const applyVerifiedSession = async (session: Session) => {
    setUser(session.user);
    setIsVerified(true);
    const p = await fetchProfile(session.user.id);
    setProfile(p);
    setAdminFlag(p);
  };

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      hardResetState();
      return;
    }

    if (!session.user.email_confirmed_at) {
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
      setLoading(true);
      await handleSession(session);
      if (mounted) {
        setLoading(false);
      }
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
  };

  const signUp = async (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-verified`,
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Signup failed");
    }

    const sanitizedProfile: Record<string, unknown> = Object.fromEntries(
      Object.entries(profileData || {}).filter(([, v]) => {
        if (v === undefined || v === null) return false;
        if (typeof v === "string") return v.trim() !== "";
        return true;
      })
    );

    const profilePayload = {
      id: data.user.id,
      email,
      ...sanitizedProfile,
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .insert(profilePayload);

    if (profileError) {
      try {
        await supabase.auth.admin.deleteUser(data.user.id);
      } catch (_) {
      }
      throw profileError;
    }

    const referralCode = localStorage.getItem("referral_code");

    if (referralCode) {
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

      if (referrerProfile?.id) {
        const directReferrerId = referrerProfile.id;

        await supabase.from("referrals").insert({
          referrer_id: directReferrerId,
          referred_id: data.user.id,
          source: "active",
        });

        const { data: parentReferral } = await supabase
          .from("referrals")
          .select("referrer_id")
          .eq("referred_id", directReferrerId)
          .limit(1)
          .single();

        if (parentReferral?.referrer_id) {
          await supabase.from("referrals").insert({
            referrer_id: parentReferral.referrer_id,
            referred_id: data.user.id,
            source: "passive",
          });
        }
      }

      localStorage.removeItem("referral_code");
    }

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
