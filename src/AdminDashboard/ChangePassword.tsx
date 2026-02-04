
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  LogOut,
  ArrowLeft,
} from "lucide-react";

/* =============================================================================
   TYPES
============================================================================= */

type StrengthLevel =
  | "empty"
  | "very-weak"
  | "weak"
  | "medium"
  | "strong"
  | "very-strong";

type BannerType = "success" | "error" | "info" | null;

type BannerState = {
  type: BannerType;
  message: string;
};

type VisibilityState = {
  old: boolean;
  next: boolean;
  confirm: boolean;
};

type ValidationResult = {
  ok: boolean;
  reasons: string[];
};

/* =============================================================================
   CONSTANTS
============================================================================= */

const MIN_PASSWORD_LENGTH = 8;

const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  "empty": "bg-gray-200",
  "very-weak": "bg-red-500",
  "weak": "bg-orange-500",
  "medium": "bg-yellow-500",
  "strong": "bg-green-500",
  "very-strong": "bg-emerald-600",
};

const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  "empty": "Enter a password",
  "very-weak": "Very weak",
  "weak": "Weak",
  "medium": "Medium",
  "strong": "Strong",
  "very-strong": "Very strong",
};

const COMMON_PASSWORDS = new Set<string>([
  "password",
  "password123",
  "12345678",
  "qwertyui",
  "admin123",
  "letmein",
  "welcome",
]);

/* =============================================================================
   HELPER FUNCTIONS
============================================================================= */

function hasUppercase(v: string) {
  return /[A-Z]/.test(v);
}

function hasLowercase(v: string) {
  return /[a-z]/.test(v);
}

function hasNumber(v: string) {
  return /\d/.test(v);
}

function hasSpecial(v: string) {
  return /[^A-Za-z0-9]/.test(v);
}

function calculateStrength(password: string): StrengthLevel {
  if (!password) return "empty";

  let score = 0;

  if (password.length >= MIN_PASSWORD_LENGTH) score++;
  if (hasUppercase(password)) score++;
  if (hasLowercase(password)) score++;
  if (hasNumber(password)) score++;
  if (hasSpecial(password)) score++;
  if (password.length >= 12) score++;

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return "very-weak";
  }

  if (score <= 1) return "very-weak";
  if (score === 2) return "weak";
  if (score === 3) return "medium";
  if (score === 4) return "strong";
  return "very-strong";
}

function validateNewPassword(
  next: string,
  confirm: string
): ValidationResult {
  const reasons: string[] = [];

  if (!next) {
    reasons.push("New password cannot be empty.");
  }

  if (next.length < MIN_PASSWORD_LENGTH) {
    reasons.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  if (!hasUppercase(next)) {
    reasons.push("Include at least one uppercase letter.");
  }

  if (!hasLowercase(next)) {
    reasons.push("Include at least one lowercase letter.");
  }

  if (!hasNumber(next)) {
    reasons.push("Include at least one number.");
  }

  if (!hasSpecial(next)) {
    reasons.push("Include at least one special character.");
  }

  if (COMMON_PASSWORDS.has(next.toLowerCase())) {
    reasons.push("This password is too common.");
  }

  if (next !== confirm) {
    reasons.push("New password and confirmation do not match.");
  }

  return {
    ok: reasons.length === 0,
    reasons,
  };
}

/* =============================================================================
   SMALL PRESENTATIONAL COMPONENTS
============================================================================= */

function Banner({ state }: { state: BannerState }) {
  if (!state.type) return null;

  const base =
    "mb-6 rounded-lg border px-4 py-3 flex items-start gap-3 text-sm";

  if (state.type === "success") {
    return (
      <div className={`${base} bg-green-50 border-green-200 text-green-700`}>
        <CheckCircle2 size={18} className="mt-0.5" />
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.type === "error") {
    return (
      <div className={`${base} bg-red-50 border-red-200 text-red-700`}>
        <XCircle size={18} className="mt-0.5" />
        <span>{state.message}</span>
      </div>
    );
  }

  return (
    <div className={`${base} bg-blue-50 border-blue-200 text-blue-700`}>
      <ShieldCheck size={18} className="mt-0.5" />
      <span>{state.message}</span>
    </div>
  );
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onToggle,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-[#1368d6]"
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const strength = calculateStrength(password);

  const bars = useMemo(() => {
    const order: StrengthLevel[] = [
      "very-weak",
      "weak",
      "medium",
      "strong",
      "very-strong",
    ];

    const index = order.indexOf(strength);

    return order.map((lvl, i) => {
      const active =
        strength !== "empty" && index >= i ? STRENGTH_COLORS[strength] : "bg-gray-200";
      return (
        <div
          key={lvl}
          className={`h-2 rounded transition-all ${active}`}
        />
      );
    });
  }, [strength]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-2">{bars}</div>
      <div className="text-xs text-gray-600">
        Strength: <span className="font-medium">{STRENGTH_LABELS[strength]}</span>
      </div>
    </div>
  );
}

/* =============================================================================
   MAIN COMPONENT
============================================================================= */

export default function ChangePassword() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [visibility, setVisibility] = useState<VisibilityState>({
    old: false,
    next: false,
    confirm: false,
  });

  const [banner, setBanner] = useState<BannerState>({
    type: "info",
    message:
      "For security reasons, please confirm your current password before setting a new one.",
  });

  const [submitting, setSubmitting] = useState(false);
  const mountedRef = useRef(true);

  /* ---------------------------------------------------------------------------
     CLEANUP
  --------------------------------------------------------------------------- */
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------------------------------------------------------------------
     DERIVED STATE
  --------------------------------------------------------------------------- */
  const validation = useMemo(
    () => validateNewPassword(newPassword, confirmPassword),
    [newPassword, confirmPassword]
  );

  const strength = useMemo(
    () => calculateStrength(newPassword),
    [newPassword]
  );

  const canSubmit =
    !submitting &&
    !!oldPassword &&
    validation.ok &&
    strength !== "very-weak" &&
    strength !== "empty";

  /* ---------------------------------------------------------------------------
     HANDLERS
  --------------------------------------------------------------------------- */

  const toggleVisibility = useCallback(
    (key: keyof VisibilityState) => {
      setVisibility((v) => ({ ...v, [key]: !v[key] }));
    },
    []
  );

  const resetForm = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setVisibility({ old: false, next: false, confirm: false });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setBanner({ type: null, message: "" });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw new Error("Unable to identify current user session.");
      }

      const { error: reauthError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: oldPassword,
        });

      if (reauthError) {
        throw new Error("Current password is incorrect.");
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
        });

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!mountedRef.current) return;

      setBanner({
        type: "success",
        message:
          "Password updated successfully. You will be logged out for security reasons.",
      });

      resetForm();

      setTimeout(async () => {
        await handleLogout();
      }, 2000);
    } catch (err: any) {
      if (!mountedRef.current) return;

      setBanner({
        type: "error",
        message: err?.message || "Something went wrong. Please try again.",
      });
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
  --------------------------------------------------------------------------- */

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-8 relative">
      {/* Back Button */}
      <button
        onClick={() => navigate("/admin/dashboard")}
        className="absolute top-6 right-6 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
      >
        <ArrowLeft size={20} />
      </button>

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Lock size={26} className="text-[#1368d6]" />
        <div>
          <h1 className="text-2xl font-bold text-[#1368d6]">
            Change Password
          </h1>
          <p className="text-sm text-gray-500">
            Update your admin account password securely
          </p>
        </div>
      </div>

      {/* BANNER */}
      <Banner state={banner} />

      {/* FORM */}
      <div className="space-y-6">
        <PasswordInput
          label="Current Password"
          value={oldPassword}
          onChange={setOldPassword}
          visible={visibility.old}
          onToggle={() => toggleVisibility("old")}
          placeholder="Enter current password"
          disabled={submitting}
        />

        <div className="space-y-3">
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            visible={visibility.next}
            onToggle={() => toggleVisibility("next")}
            placeholder="Enter new password"
            disabled={submitting}
          />
          <StrengthMeter password={newPassword} />
        </div>

        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          visible={visibility.confirm}
          onToggle={() => toggleVisibility("confirm")}
          placeholder="Re-enter new password"
          disabled={submitting}
        />

        {/* VALIDATION MESSAGES */}
        {!validation.ok && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <div className="font-medium mb-2 flex items-center gap-2">
              <ShieldAlert size={16} />
              Password requirements:
            </div>
            <ul className="list-disc pl-5 space-y-1">
              {validation.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-white transition-all ${
              canSubmit
                ? "bg-gradient-to-r from-[#1368d6] to-[#00a86b] hover:opacity-95"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Update Password
              </>
            )}
          </button>

          <button
            onClick={handleLogout}
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 hover:bg-gray-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}