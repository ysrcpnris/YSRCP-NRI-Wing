import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, Profile } from "../lib/supabase";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;

  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- PROFILE FETCH ---------------- */
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  };

  const refreshProfile = async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  };

  /* ---------------- AUTH STATE ---------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        }
        setLoading(false);
      })();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await fetchProfile(session.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

const signUp = async (
  email: string,
  password: string,
  profileData: Partial<Profile>
) => {
  /* STEP 1: Create auth user */
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) throw new Error("User creation failed");

  /* STEP 2: Sanitize profile payload */
  const sanitizedProfile: Record<string, unknown> = Object.fromEntries(
    Object.entries(profileData || {}).filter(([, v]) => {
      if (v === undefined || v === null) return false;
      if (typeof v === "string") return v.trim() !== "";
      return true;
    })
  );

  /* STEP 3: Insert profile */
  const profilePayload = {
    id: data.user.id,
    email,
    ...sanitizedProfile,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .insert(profilePayload);

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    throw profileError;
  }

  /* ===============================
     REFERRAL LOGIC (ACTIVE + PASSIVE)
     =============================== */

  const referralCode = localStorage.getItem("referral_code");

  if (referralCode) {
    // 1️⃣ Find DIRECT referrer
    const { data: referrerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (referrerProfile) {
      const directReferrerId = referrerProfile.id;

      // 2️⃣ ACTIVE referral
      await supabase.from("referrals").insert({
        referrer_id: directReferrerId,
        referred_id: data.user.id,
        source: "active",
      });

      // 3️⃣ Find parent of referrer (for PASSIVE)
      const { data: parentReferral } = await supabase
        .from("referrals")
        .select("referrer_id")
        .eq("referred_id", directReferrerId)
        .limit(1)
        .single();

      // 4️⃣ PASSIVE referral
      if (parentReferral?.referrer_id) {
        await supabase.from("referrals").insert({
          referrer_id: parentReferral.referrer_id,
          referred_id: data.user.id,
          source: "passive",
        });
      }
    }

    // cleanup
    localStorage.removeItem("referral_code");
  }
};

 /* ---------------- SIGN IN ---------------- */
const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data; // ✅ VERY IMPORTANT
};

 /* ---------------- SIGN OUT ---------------- */
const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (err: any) {
    // Ignore error if session is already missing
    if (err?.name !== "AuthSessionMissingError") {
      throw err;
    }
  } finally {
    setUser(null);
    setProfile(null);
  }
};


  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
