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
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session } | null>;
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
      // ignore
    } finally {
      hardResetState();
      killingSessionRef.current = false;
    }
  };

  const sleep = (ms: number) =>
    new Promise<void>((res) => {
      setTimeout(() => res(), ms);
    });

  /**
   * This runs after we've verified the session and fetched the profile.
   * We also attempt referral processing here (idempotent check).
   */
  const processReferralIfNeeded = async (
    currentUserId: string,
    p: Profile | null,
    currentUser?: User | null
  ) => {
    try {
      // Admins should never be inserted into anyone's referral tree — they
      // don't count as "referred members" and we don't want them showing up
      // in the user's Active Referrals list or earning the referrer credits.
      if (p?.role === "admin") {
        try {
          localStorage.removeItem("referral_code");
        } catch {
          // ignore
        }
        return;
      }

      // Resolve the referrer's code from any source we have. Order:
      //   1. localStorage          (fresh from /ref/:code redirect this session)
      //   2. user_metadata         (survives the email round-trip)
      //   3. profile.referred_by   (persisted on first login — survives forever)
      // If all three are empty, there's no referral to process.
      //
      // IMPORTANT: we accept currentUser as a parameter rather than reading
      // from the React `user` state. At the time this is called from
      // applyVerifiedSession, setUser(session.user) was just dispatched but
      // not yet committed — so the closured `user` is still the previous
      // (null) value. Using session.user directly fixes that silently-broken
      // metadata fallback.
      let referralCode = "";
      try {
        referralCode = localStorage.getItem("referral_code") || "";
      } catch {
        // localStorage may be unavailable (private mode, mobile webviews)
      }
      if (!referralCode) {
        const sourceUser = currentUser ?? user;
        const meta = (sourceUser?.user_metadata as Record<string, unknown> | undefined) || {};
        if (typeof meta.referred_by === "string") {
          referralCode = meta.referred_by;
        }
      }
      if (!referralCode && p?.referred_by) {
        referralCode = p.referred_by;
      }
      if (!referralCode) return;

      // Delegate the entire flow to the SECURITY DEFINER RPC. The RPC:
      //   - looks up the referrer by code (profiles RLS would otherwise
      //     block a brand-new user from seeing anyone else's profile),
      //   - inserts the active row (which fires the +50 credit trigger),
      //   - inserts the passive row for the grandparent if applicable,
      //   - is idempotent (no-op if a referrals row already exists for me).
      // We pass `currentUserId` explicitly via auth context — auth.uid()
      // inside the RPC resolves to the calling user's id.
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        "process_my_referral",
        { p_code: referralCode }
      );

      if (rpcError) {
        console.error("process_my_referral error:", rpcError);
      } else if (rpcResult && rpcResult.ok === false) {
        // Reasons: not_authenticated | no_code | caller_is_admin |
        //          unknown_code | self_referral | referrer_is_admin
        // Most of these are normal early-returns (e.g. unknown_code), so
        // we don't want to spam the console. Log only unexpected ones.
        if (
          rpcResult.reason !== "self_referral" &&
          rpcResult.reason !== "unknown_code" &&
          rpcResult.reason !== "caller_is_admin"
        ) {
          console.warn("process_my_referral skipped:", rpcResult.reason);
        }
      }

      // Suppress the unused-variable warning while keeping the value
      // available for ad-hoc debugging in dev tools.
      void currentUserId;

      // cleanup localstorage
      localStorage.removeItem("referral_code");
    } catch (err) {
      console.error("processReferralIfNeeded error:", err);
    }
  };

  /**
   * Apply a verified session: set user, mark verified and load profile.
   * If profile is not yet present (DB trigger delay), retry a few times before signing out.
   */
  const applyVerifiedSession = async (session: Session) => {
    setUser(session.user);
    setIsVerified(true);

    // Try to fetch profile immediately
    let p = await fetchProfile(session.user.id);

    // Only create a profile if one does NOT already exist (first-time login).
    // Use upsert with ignoreDuplicates so it's idempotent with the auth trigger —
    // the trigger may have already created the profile. Never overwrite existing rows.
    if (!p) {
      await supabase
        .from("profiles")
        .upsert({
          id: session.user.id,
          auth_user_id: session.user.id,
          email: session.user.email,

          first_name:
            session.user.user_metadata?.first_name ||
            session.user.user_metadata?.full_name?.split(" ")[0] ||
            "User",

          last_name:
            session.user.user_metadata?.last_name ||
            session.user.user_metadata?.full_name?.split(" ")[1] ||
            "change last name",

          full_name: session.user.user_metadata?.full_name ||
            [session.user.user_metadata?.first_name, session.user.user_metadata?.last_name].filter(Boolean).join(" ") ||
            null,

          mobile_number: session.user.user_metadata?.mobile_number || null,
          country_of_residence: session.user.user_metadata?.country_of_residence || null,
          state_abroad: session.user.user_metadata?.state_abroad || null,
          city_abroad: session.user.user_metadata?.city_abroad || null,
          indian_state: session.user.user_metadata?.indian_state || null,
          district: session.user.user_metadata?.district || null,
          assembly_constituency: session.user.user_metadata?.assembly_constituency || null,
          mandal: session.user.user_metadata?.mandal || null,

          // The REFERRER's code (i.e. who referred this user). Stored
          // permanently so referral processing can be retried later even if
          // localStorage and user_metadata are both gone. profiles.referral_code
          // (this user's OWN code) is generated by the DB trigger separately.
          referred_by: session.user.user_metadata?.referred_by || null,

          // referral_code is auto-generated by the DB trigger (profiles_autofill_codes).
          // Never set it from user_metadata — that field holds the REFERRER's code,
          // not this user's own code, and storing it here would break their referral link.
          //
          // Honour the support_team role from user_metadata so the fallback profile
          // creation path stays consistent with the DB trigger.
          role:
            session.user.user_metadata?.role === "support_team"
              ? "support_team"
              : "user",
          created_at: new Date().toISOString(),
        }, { onConflict: "id", ignoreDuplicates: true });
    }

    // If profile not found, retry a few times with backoff to allow DB trigger / insert to finish.
    if (!p) {
      const maxAttempts = 6;
      for (let attempt = 1; attempt <= maxAttempts && !p; attempt++) {
        const waitMs = 500 * attempt; // progressive backoff: 500, 1000, 1500 ...
        await sleep(waitMs);
        p = await fetchProfile(session.user.id);
      }
    }

    // If still missing after retries, then sign the user out (this preserves the original behavior,
    // but avoids immediate logout when a DB trigger is simply taking a moment).
    if (!p) {
      console.error("Profile still missing after retries for user:", session.user.id);
      await killUnverifiedSession();
      return;
    }

    setProfile(p);
    setAdminFlag(p);

    // After profile exists, try processing referral (idempotent).
    // Pass session.user explicitly so metadata fallback works even on the
    // first signup, when React's `user` state hasn't committed yet.
    await processReferralIfNeeded(session.user.id, p, session.user);

    // If the user is registering as a support-team member, claim the team
    // they picked on the signup form. The team id is read from
    // localStorage first (set on submit) then user_metadata (survives the
    // email-verification round-trip across browsers). Idempotent — the RPC
    // returns ok:true with reason:"already_claimed" if already done.
    if (p.role === "support_team") {
      let targetTeamId = "";
      try {
        targetTeamId = localStorage.getItem("support_team_id") || "";
      } catch { /* ignore */ }
      if (!targetTeamId) {
        const meta = (session.user.user_metadata as Record<string, unknown>) || {};
        if (typeof meta.support_team_id === "string") {
          targetTeamId = meta.support_team_id;
        }
      }
      if (targetTeamId) {
        const { error: claimErr, data: claimData } = await supabase.rpc(
          "claim_support_team",
          { p_team_id: targetTeamId }
        );
        if (claimErr) {
          console.error("claim_support_team error:", claimErr);
        } else if (claimData && claimData.ok === false) {
          console.warn("claim_support_team skipped:", claimData.reason);
        }
        try { localStorage.removeItem("support_team_id"); } catch { /* ignore */ }
      }
    }
  };

  /**
   * Helper: Attempt to exchange tokens from URL into a Supabase session.
   * Returns the exchanged session (or null).
   */
  // const tryExchangeUrlForSession = async (): Promise<Session | null> => {
  //   try {
  //     // supabase.auth.getSessionFromUrl will parse hash/search and store session if present.
  //     // storeSession:true ensures client-side session is stored.
  //     // If there's no token in URL this resolves to { data: { session: null } }.
  //     const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
  //     if (error) {
  //       console.warn("getSessionFromUrl error:", error);
  //     }
  //     const session = data?.session ?? null;

  //     // Clean the URL to remove tokens (prevents repeated processing).
  //     try {
  //       const url = new URL(window.location.href);
  //       if (url.hash) {
  //         url.hash = "";
  //         window.history.replaceState({}, document.title, url.toString());
  //       } else if (url.searchParams.has("access_token") || url.searchParams.has("refresh_token")) {
  //         // remove query params that Supabase might have left
  //         url.searchParams.delete("access_token");
  //         url.searchParams.delete("refresh_token");
  //         url.searchParams.delete("type");
  //         url.searchParams.delete("provider_token");
  //         window.history.replaceState({}, document.title, url.toString());
  //       }
  //     } catch (e) {
  //       // ignore URL clean errors
  //     }

  //     return session;
  //   } catch (err) {
  //     console.error("tryExchangeUrlForSession unexpected error:", err);
  //     return null;
  //   }
  // };

  const handleSession = async (session: Session | null) => {
    if (!session?.user) {
      hardResetState();
      return;
    }

    const isRecovery =
      session.user.recovery_sent_at ||
      session.user.user_metadata?.recovery === true;

    const path = window.location.pathname;

const isEmailVerificationRedirect = path === "/email-verified";
const isPasswordResetRedirect = path === "/reset-password-confirm";


    if (
  !session.user.email_confirmed_at &&
  !isRecovery &&
  !isEmailVerificationRedirect &&
  !isPasswordResetRedirect
) {

      await killUnverifiedSession();
      return;
    }

    await applyVerifiedSession(session);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // small delay to allow Supabase to parse URL hash if any (helps in SPA flows)
      await new Promise((res) => setTimeout(res, 120));

      // If the current URL likely contains a Supabase auth token (email verify link),
      // attempt to exchange it into a session first.
      const pathname = window.location.pathname;
      const hasHashAccessToken = window.location.hash && window.location.hash.includes("access_token");
      const hasQueryAccessToken = window.location.search && window.location.search.includes("access_token");
      const isEmailVerifiedPath = pathname === "/email-verified";

      let exchangedSession: Session | null = null;
      // if (isEmailVerifiedPath || hasHashAccessToken || hasQueryAccessToken) {
      //   exchangedSession = await tryExchangeUrlForSession();
      // }

      // If nothing exchanged, fallback to current stored session (if any)
      let {
        data: { session },
      } = await supabase.auth.getSession();

      // prefer exchanged session if present
      if (exchangedSession) session = exchangedSession;

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
      // During initialisation we avoid handling the event; once initialisation done, we handle
      // auth state changes. This prevents double processing during the page load token exchange.
      if (initializingRef.current) return;
      if (!mounted) return;

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
  const normalizedEmail = email.trim().toLowerCase();

  // Normalise mobile identically to the DB trigger (profiles_normalize_mobile):
  // keep only digits, prepend a single '+' if the input had one. This ensures
  // our pre-check via mobile_exists() matches what the UNIQUE index enforces,
  // so "+91 98765 43210" and "+919876543210" correctly collide.
  const rawMobile = (profileData.mobile_number || "").trim();
  const hadPlus = rawMobile.startsWith("+");
  const digitsOnly = rawMobile.replace(/[^0-9]/g, "");
  const normalizedMobile = digitsOnly
    ? (hadPlus ? "+" : "") + digitsOnly
    : "";
  // Write the normalised value back so profiles.mobile_number is seeded correctly
  // through user_metadata and the DB sees the same value the UI displays.
  if (normalizedMobile) {
    profileData = { ...profileData, mobile_number: normalizedMobile };
  }

  // 🔴 STEP 1a — check if email already exists in profiles
  const { data: existingUser, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (checkError) {
    console.error("Profile lookup error:", checkError);
    throw new Error("Unable to register. Please try again.");
  }

  if (existingUser) {
    // 🛑 BLOCK signup immediately
    throw new Error("User already registered. Please login instead.");
  }

  // 🔴 STEP 1b — check if mobile number already exists
  //     Uses the mobile_exists() RPC (SECURITY DEFINER) because anon visitors
  //     cannot SELECT other rows from profiles directly under RLS.
  //     The DB also enforces this via a UNIQUE index, so this is just a
  //     friendly pre-check before we hit auth.signUp.
  if (normalizedMobile) {
    const { data: mobileTaken, error: mobileCheckError } = await supabase.rpc(
      "mobile_exists",
      { p_mobile: normalizedMobile }
    );

    if (mobileCheckError) {
      console.error("Mobile lookup error:", mobileCheckError);
      throw new Error("Unable to register. Please try again.");
    }

    if (mobileTaken) {
      throw new Error(
        "This mobile number is already registered. Please login or use a different number."
      );
    }
  }

  // 🔵 STEP 2 — build metadata for DB trigger
  const meta: Record<string, unknown> = {};
  const keys: (keyof typeof profileData)[] = [
    "first_name",
    "last_name",
    "full_name",
    "mobile_number",
    "whatsapp_number",
    "country_of_residence",
    "state_abroad",
    "city_abroad",
    "indian_state",
    "district",
    "assembly_constituency",
    "mandal",
    "village",
    "profession",
    "organization",
    "designation",
    "contribution",
    "participate_campaign",
    "instagram_id",
    "facebook_id",
    "twitter_id",
    "linkedin_id",
    "referral_code",
    // The referrer's code (i.e. who referred this new user). Stored in
    // user_metadata so it survives the email-verification round-trip even if
    // localStorage is cleared (very common on mobile, where the verify email
    // is opened in a different browser/app than the one that set localStorage).
    "referred_by",
  ];

  for (const k of keys) {
    const v = profileData[k];
    if (v !== undefined && v !== null && v !== "") meta[k as string] = v;
  }

  // 🔵 STEP 3 — call Supabase signup only if safe
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/email-verified`,
      data: meta,
    },
  });

  if (error) {
    // Surface the real cause to the console so we can diagnose 500s from the
    // Supabase auth-side triggers (e.g. handle_new_user), instead of hiding
    // them behind a generic "Unable to register" message.
    console.error("[signUp] auth.signUp error:", error, { meta });

    const msg = error.message.toLowerCase();

    if (msg.includes("already registered") || msg.includes("user already registered")) {
      throw new Error("User already registered. Please login.");
    }
    if (msg.includes("rate limit")) {
      throw new Error("Too many signup attempts. Please wait a few minutes.");
    }
    if (msg.includes("password")) {
      throw new Error(`Password issue: ${error.message}`);
    }
    if (msg.includes("invalid email") || msg.includes("email")) {
      throw new Error(`Email issue: ${error.message}`);
    }

    // Pass the underlying error up so the user (and us) can see the cause.
    throw new Error(`Registration failed: ${error.message || "unknown error"}`);
  }

  if (!data.user) {
    throw new Error("Signup failed. Please try again.");
  }

  // 🔴 force email verification flow
  await killUnverifiedSession();
};


const signIn = async (email: string, password: string) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // 🔴 Handle Supabase auth errors clearly
    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("invalid login credentials")) {
        throw new Error("Invalid email or password.");
      }

      if (msg.includes("email not confirmed")) {
        throw new Error("Please verify your email before logging in.");
      }

      throw new Error("Unable to login. Please try again.");
    }

    const user = data?.user;

    if (!user) {
      throw new Error("Invalid email or password.");
    }

    // 🔴 Block login if email not verified
    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      throw new Error("Please verify your email before logging in.");
    }

    // 🔴 Ensure profile exists
    const profileRow = await fetchProfile(user.id);
    if (!profileRow) {
      await supabase.auth.signOut();
      throw new Error("Registration incomplete. Contact support.");
    }

    return data;

  } catch (err: any) {
    if (err instanceof Error) {
      throw err; // pass real message to UI
    }
    throw new Error("Something went wrong. Please try again.");
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
