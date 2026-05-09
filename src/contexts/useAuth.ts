import { createContext, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "../lib/supabase";

// =====================================================================
// Auth context shape + the `useAuth()` hook live in their own module so
// the AuthContext.tsx file (which exports the `AuthProvider` React
// component) is "component-only". Vite's Fast Refresh treats files with
// mixed component / non-component exports as un-refreshable, which used
// to cause a full page reload every time AuthContext.tsx was edited.
// Splitting them keeps HMR snappy.
// =====================================================================

export type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isVerified: boolean;
  signUp: (
    email: string,
    password: string,
    profileData: Partial<Profile>
  ) => Promise<void>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ user: User; session: Session } | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
