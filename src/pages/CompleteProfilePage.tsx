import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, User, Heart } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import { sanitizeTrim } from "../lib/sanitize";
import ConstituencyPicker, { EMPTY_GEO, type GeoValue } from "../components/ConstituencyPicker";
import { countriesData } from "../lib/countryCodes";

/**
 * Post-verification profile wizard.
 *
 * Registration now asks for six things. This asks for the rest, in four
 * sections, AFTER the account exists and the email is verified.
 *
 * The order matters more than it looks. A stranger filling a signup form
 * abandons it when asked to recall their home constituency; a verified
 * member who has already committed answers the same question. Same
 * fields, far better completion — and section 1 pays off immediately by
 * naming the chapter and coordinator the member has just joined.
 *
 * Country, city, constituency and gender gate the dashboard — plus
 * mandal, but only where that constituency has mandals loaded.
 * Everything else is visible here with an "optional" label so
 * nobody has to go hunting for it later, and skippable so nobody is
 * blocked by it. The gate is enforced in the database by
 * profile_is_complete() — this page must not be the only thing that
 * knows the rules.
 */

const REQUIRED_HINT = "Needed before your dashboard opens";

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // section 1 — where you live
  const [country, setCountry] = useState("");
  const [stateAbroad, setStateAbroad] = useState("");
  const [city, setCity] = useState("");

  // section 2 — roots in AP
  const [geo, setGeo] = useState<GeoValue>(EMPTY_GEO);

  // section 3 — about you
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [profession, setProfession] = useState("");
  const [organization, setOrganization] = useState("");

  // section 4 — how you can help (all optional)
  const [areas, setAreas] = useState<string[]>([]);
  const [hasVote, setHasVote] = useState<boolean | null>(null);
  const [epic, setEpic] = useState("");

  useEffect(() => {
    if (!profile) return;
    setCountry(profile.country_of_residence ?? "");
    setStateAbroad(profile.state_abroad ?? "");
    setCity(profile.city_abroad ?? "");
    setGender(profile.gender ?? "");
    setDob(profile.dob ?? "");
    setProfession(profile.profession ?? "");
    setOrganization(profile.organization ?? "");
    setGeo({
      constituency: profile.assembly_constituency ?? "",
      constituency_id: null,
      district: profile.district ?? "",
      mandal: profile.mandal ?? "",
      mandal_id: null,
      village: profile.village ?? "",
    });
    setLoading(false);
  }, [profile]);

  // A member who already finished has no business here — send them on
  // rather than making them re-confirm what they have already answered.
  useEffect(() => {
    if (profile?.onboarding_completed_at) navigate("/dashboard", { replace: true });
  }, [profile, navigate]);

  // Mandal is required only where that constituency has mandals loaded
  // — the same rule profile_is_complete() applies in the database
  // (migration 20260804110000). Requiring it everywhere would block
  // every member behind an empty dropdown until all ~670 are seeded.
  const [mandalRequired, setMandalRequired] = useState(false);
  useEffect(() => {
    if (!geo.constituency) { setMandalRequired(false); return; }
    (async () => {
      const { data } = await supabase.rpc("constituency_has_mandals", {
        p_name: geo.constituency,
      });
      setMandalRequired(Boolean(data));
    })();
  }, [geo.constituency]);

  const missing = {
    country: !country.trim(),
    city: !city.trim(),
    constituency: !geo.constituency.trim(),
    ...(mandalRequired ? { mandal: !geo.mandal.trim() } : {}),
    gender: !gender.trim(),
  };
  const totalRequired = Object.keys(missing).length;
  const requiredDone = Object.values(missing).filter((m) => !m).length;
  const canSubmit = requiredDone === totalRequired;

  const toggleArea = (a: string) =>
    setAreas((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const save = async () => {
    if (!user?.id || !canSubmit) return;
    setSaving(true);
    setError(null);

    const updates: Record<string, unknown> = {
      country_of_residence: sanitizeTrim(country),
      state_abroad: sanitizeTrim(stateAbroad) || null,
      city_abroad: sanitizeTrim(city),
      indian_state: "Andhra Pradesh",
      district: sanitizeTrim(geo.district) || null,
      assembly_constituency: sanitizeTrim(geo.constituency),
      mandal: sanitizeTrim(geo.mandal),
      village: sanitizeTrim(geo.village) || null,
      gender,
      dob: dob || null,
      profession: sanitizeTrim(profession) || null,
      organization: sanitizeTrim(organization) || null,
      contribution: areas.length ? areas.join(", ") : null,
      updated_at: new Date().toISOString(),
    };

    // Voter fields are only sent when answered. `has_vote` is
    // three-state — yes, no, and not-answered — and writing `false` for
    // someone who skipped the question would be a different claim.
    if (hasVote !== null) {
      updates.has_vote = hasVote;
      if (hasVote && epic.trim()) updates.epic_number = sanitizeTrim(epic).toUpperCase();
    }

    const { error: err } = await supabase.from("profiles").update(updates).eq("id", user.id);
    setSaving(false);

    if (err) {
      console.error("complete-profile save failed:", err);
      setError(
        err.message.includes("profiles_epic_unique")
          ? "That EPIC number is already recorded against another member. Check the digits, or leave it blank."
          : "Could not save your details. Please try again."
      );
      return;
    }

    await refreshProfile();
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-primary-600" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
        <p className="text-sm text-gray-600 mt-1 mb-5">
          Four short sections. The{" "}
          <span className="font-semibold text-red-600">required</span> fields open your
          dashboard — the rest you can leave blank and come back to.
        </p>

        {/* progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-600">{requiredDone} of {totalRequired} required fields</span>
            <span className={canSubmit ? "text-green-700 font-semibold" : "text-amber-600 font-semibold"}>
              {canSubmit ? "Ready" : "Dashboard locked"}
            </span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${canSubmit ? "bg-green-600" : "bg-primary-500"}`}
              style={{ width: `${(requiredDone / totalRequired) * 100}%` }}
            />
          </div>
        </div>

        {/* 1 — where you live */}
        <Section icon={<MapPin size={16} />} n={1} title="Where you live" required>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="input-label">
                Country <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">Choose…</option>
                {countriesData.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label">
                State <span className="text-xs font-normal text-gray-500">optional</span>
              </label>
              <input className="input-field" value={stateAbroad} onChange={(e) => setStateAbroad(e.target.value)} />
            </div>
            <div>
              <label className="input-label">
                City <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                placeholder="Where you live now"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* 2 — roots in AP */}
        <Section icon={<MapPin size={16} />} n={2} title="Your roots in Andhra Pradesh" required>
          <ConstituencyPicker value={geo} onChange={setGeo} />
          <p className="text-xs text-gray-500 mt-3">
            This is what connects you to your MLA and mandal president in Local Connect.
          </p>
        </Section>

        {/* 3 — about you */}
        <Section icon={<User size={16} />} n={3} title="About you" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                Gender <span className="text-red-500">*</span>
              </label>
              <select className="input-field" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Choose…</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
                <option>Prefer not to say</option>
              </select>
            </div>
            <div>
              <label className="input-label">
                Date of birth <span className="text-xs font-normal text-gray-500">optional</span>
              </label>
              <input type="date" className="input-field" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div>
              <label className="input-label">
                Profession <span className="text-xs font-normal text-gray-500">optional</span>
              </label>
              <input className="input-field" value={profession} onChange={(e) => setProfession(e.target.value)} />
            </div>
            <div>
              <label className="input-label">
                Organisation <span className="text-xs font-normal text-gray-500">optional</span>
              </label>
              <input className="input-field" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
          </div>
        </Section>

        {/* 4 — how you can help */}
        <Section icon={<Heart size={16} />} n={4} title="How you can help" optional>
          <label className="input-label">Areas you can contribute to</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {["Social Media", "Technology", "Political"].map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleArea(a)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  areas.includes(a)
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-700 hover:border-primary-300"
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          <label className="input-label">Do you have a vote in Andhra Pradesh?</label>
          <div className="flex gap-2 mb-3">
            {[
              { label: "Yes", v: true },
              { label: "No", v: false },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setHasVote(hasVote === o.v ? null : o.v)}
                className={`px-5 py-2 rounded-lg border text-sm font-medium transition ${
                  hasVote === o.v
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-200 text-gray-700 hover:border-primary-300"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {hasVote === true && (
            <div className="max-w-xs">
              <label className="input-label">
                EPIC number <span className="text-xs font-normal text-gray-500">optional</span>
              </label>
              <input
                className="input-field uppercase"
                placeholder="ABC1234567"
                value={epic}
                onChange={(e) => setEpic(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your voter ID number. Visible only to wing administrators — never to
                coordinators or other members.
              </p>
            </div>
          )}
        </Section>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={!canSubmit || saving}
          className="btn-gradient w-full py-3 text-base rounded-xl disabled:opacity-60
                     disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving…
            </>
          ) : canSubmit ? (
            "Save and continue"
          ) : (
            "Fill the required fields to continue"
          )}
        </button>

        {!canSubmit && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Still needed:{" "}
            {Object.entries(missing)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function Section({
  n,
  title,
  icon,
  required,
  optional,
  children,
}: {
  n: number;
  title: string;
  icon: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-4">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 grid place-items-center">
          {icon}
        </span>
        <span className="font-semibold text-gray-900 text-sm flex-1">
          {n} · {title}
        </span>
        {required && (
          <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            Required
          </span>
        )}
        {optional && (
          <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            All optional
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
      {required && <span className="sr-only">{REQUIRED_HINT}</span>}
    </div>
  );
}
