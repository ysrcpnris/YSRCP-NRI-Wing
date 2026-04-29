import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User as UserIcon, Phone, ShieldCheck, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type AvailableTeam = {
  id: string;
  name: string;
  description: string | null;
};

// Combined login + register page mounted at `/support-teams`. Two tabs.
// Register: forces role='support_team' in user_metadata + persists the picked
// team_id in metadata + localStorage so AuthContext can claim it server-side
// once the email is verified. Login: standard signInWithPassword followed by
// a role-based redirect.
export default function SupportTeamAuthPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  // Once a support-team user is authenticated, get out of the auth page.
  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) return;
    if (profile.role === "support_team") {
      navigate("/support-team/dashboard", { replace: true });
    } else if (profile.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  const [mode, setMode] = useState<"login" | "register">("register");

  // Shared
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);

  // Register-only
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [mobile, setMobile]       = useState("");
  const [teamId, setTeamId]       = useState("");

  // Available teams (active + unclaimed). Re-fetched whenever someone
  // claims a seat so the dropdown stays accurate.
  const [teams, setTeams] = useState<AvailableTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const fetchTeams = async () => {
    setTeamsLoading(true);
    const { data, error } = await supabase
      .from("support_teams")
      .select("id, name, description, claimed_by_profile_id, is_active")
      .eq("is_active", true)
      .is("claimed_by_profile_id", null)
      .order("name", { ascending: true });
    if (!error && data) {
      setTeams(data as unknown as AvailableTeam[]);
    }
    setTeamsLoading(false);
  };

  useEffect(() => {
    fetchTeams();
    // Live refresh: a different signup landing or admin force-release
    // changes which seats are open; reflect that immediately.
    const channel = supabase
      .channel("support-teams-availability")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_teams" },
        () => fetchTeams()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === teamId) || null,
    [teams, teamId]
  );

  // ---------------- LOGIN ----------------
  const handleLogin = async () => {
    setErr(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setErr("Email and password are required.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials")) {
        setErr("Invalid email or password.");
      } else if (msg.includes("email not confirmed")) {
        setErr("Please verify your email first.");
      } else {
        setErr(error.message);
      }
      return;
    }
    if (!data.user) {
      setErr("Login failed. Please try again.");
      return;
    }
    // The AuthContext effect above redirects once profile loads.
    setInfo("Signed in. Redirecting…");
  };

  // ---------------- REGISTER ----------------
  const handleRegister = async () => {
    setErr(null);
    setInfo(null);

    // Field validation.
    if (!firstName.trim()) return setErr("First name is required.");
    if (!email.trim())     return setErr("Email is required.");
    if (!password)         return setErr("Password is required.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    if (!teamId)           return setErr("Pick a support team to join.");

    setBusy(true);

    // Belt-and-suspenders pre-check: the unique-index will reject collisions
    // anyway, but giving a clean message before sending an email is friendlier.
    const { data: stillFree } = await supabase
      .from("support_teams")
      .select("id, name, claimed_by_profile_id, is_active")
      .eq("id", teamId)
      .maybeSingle();

    if (!stillFree || stillFree.is_active === false) {
      setBusy(false);
      setErr("That team is no longer available. Pick another.");
      fetchTeams();
      setTeamId("");
      return;
    }
    if (stillFree.claimed_by_profile_id) {
      setBusy(false);
      setErr("Someone just claimed that team. Pick another.");
      fetchTeams();
      setTeamId("");
      return;
    }

    // Persist target team in localStorage so AuthContext can claim it after
    // the email-verification round-trip (mobile email apps frequently open
    // the link in a different browser, which kills user_metadata too).
    try {
      localStorage.setItem("support_team_id", teamId);
    } catch {
      // ignore — metadata fallback below still works in same-browser flows.
    }

    const meta: Record<string, unknown> = {
      first_name: firstName.trim(),
      last_name: lastName.trim() || null,
      full_name: [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || null,
      mobile_number: mobile.trim() || null,
      role: "support_team",
      support_team_id: teamId,
    };

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/email-verified`,
        data: meta,
      },
    });

    setBusy(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already registered") || msg.includes("user already")) {
        setErr("This email is already registered. Try logging in.");
        return;
      }
      setErr(error.message);
      return;
    }

    if (!data.user) {
      setErr("Signup failed. Please try again.");
      return;
    }

    setInfo("Account created. Check your email to verify, then log in here.");
    // Sign them out so the verify-email page can do its thing cleanly.
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    setMode("login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-emerald-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-lg leading-tight">Support Team Portal</h1>
              <p className="text-[11px] text-white/80">
                Sign in or register a seat assigned by the admin.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-gray-100">
          <button
            onClick={() => { setMode("login");    setErr(null); setInfo(null); }}
            className={`py-3 text-sm font-bold transition ${
              mode === "login"
                ? "text-primary-700 border-b-2 border-primary-600 bg-primary-50/50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode("register"); setErr(null); setInfo(null); }}
            className={`py-3 text-sm font-bold transition ${
              mode === "register"
                ? "text-primary-700 border-b-2 border-primary-600 bg-primary-50/50"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Register
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-3">
          {mode === "register" && (
            <>
              <Field
                icon={<UserIcon size={16} />}
                placeholder="First name"
                value={firstName}
                onChange={setFirstName}
                autoFocus
              />
              <Field
                icon={<UserIcon size={16} />}
                placeholder="Last name (optional)"
                value={lastName}
                onChange={setLastName}
              />
              <Field
                icon={<Phone size={16} />}
                placeholder="Mobile number (optional)"
                value={mobile}
                onChange={setMobile}
              />
            </>
          )}

          <Field
            icon={<Mail size={16} />}
            type="email"
            placeholder="Email"
            value={email}
            onChange={setEmail}
            autoComplete={mode === "login" ? "username" : "email"}
          />

          <div className="relative">
            <Field
              icon={<Lock size={16} />}
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === "register" && (
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">
                Support team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">
                  {teamsLoading
                    ? "Loading available seats…"
                    : teams.length === 0
                    ? "No seats available right now"
                    : "Pick a support team…"}
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {selectedTeam?.description && (
                <p className="text-[11px] text-gray-500 mt-1 italic">
                  {selectedTeam.description}
                </p>
              )}
              <p className="text-[11px] text-gray-400 mt-1">
                One email = one team. The seat unlocks again only if you delete your account
                or the admin releases the team.
              </p>
            </div>
          )}

          {err && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded">
              {err}
            </p>
          )}
          {info && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded">
              {info}
            </p>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={busy}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm rounded-lg py-2.5 inline-flex items-center justify-center gap-2"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : mode === "login" ? (
              "Sign in"
            ) : (
              "Register"
            )}
          </button>

          <p className="text-[11px] text-center text-gray-500">
            {mode === "login" ? (
              <>Don't have a seat yet?{" "}
                <button
                  onClick={() => { setMode("register"); setErr(null); setInfo(null); }}
                  className="font-bold text-primary-700 hover:underline"
                >
                  Register
                </button>
              </>
            ) : (
              <>Already have a seat?{" "}
                <button
                  onClick={() => { setMode("login"); setErr(null); setInfo(null); }}
                  className="font-bold text-primary-700 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Tiny field wrapper to keep the body terse.
function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  autoFocus,
  autoComplete,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        {icon}
      </span>
      <input
        type={type}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 pl-9 pr-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      />
    </div>
  );
}
