/**
 * My Profile — built to docs/design/nri-wing-prototype.html (screen
 * `m-profile`), which is the design source for the NRI Wing.
 *
 * WHY THIS IS A NEW FILE RATHER THAN AN EDIT TO Dashboard.tsx
 *   Dashboard.tsx is 6,500 lines and the old profile section is woven
 *   through it. The prototype's screen is a different shape — two new
 *   sections, a three-card rail, and a restricted/unrestricted write
 *   split — so converting in place would have meant a long stretch where
 *   half the fields were on the new layout and half on the old.
 *
 * THE WRITE SPLIT, WHICH IS THE PART THAT MATTERS
 *   Two groups of fields go down two different paths:
 *
 *     ordinary columns  ->  PATCH /rest/v1/profiles
 *     restricted        ->  update_my_private_profile()
 *
 *   dob, family_*, has_vote, epic_number and voter_constituency are
 *   revoked from `authenticated` at the COLUMN level. A member cannot
 *   read them, so a plain form submit would send '' and erase whatever
 *   was stored — destroying a value the form was never able to display.
 *   They are loaded by my_private_profile() and written by the RPC,
 *   which treats NULL as "leave alone" and needs an explicit p_clear_*
 *   to blank anything.
 *
 *   `privateLoaded` gates the whole restricted half: if the RPC failed,
 *   we send nothing rather than sending blanks.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/useAuth";
import "../styles/prototype-tokens.css";

/** The prototype's three contribution areas, in its order. */
const CONTRIBUTION_AREAS = [
  { key: "social_media", label: "Social Media" },
  { key: "technology", label: "Technology" },
  { key: "political", label: "Political" },
] as const;

/**
 * Same behaviour as docs/design/nri-wing-prototype.html, validated there
 * first: closing a section opens the next one after it in this order —
 * "next" is position, not current state, so it reveals what's actually
 * coming up rather than skipping ones already open. Opening a section
 * does NOT cascade; only closing does, so peeking at one section never
 * balloons into two more open.
 */
const SECTION_ORDER = [
  "voter", "contribute", "personal", "livenow", "apland", "work", "family", "social", "campaign",
] as const;
type SectionKey = (typeof SECTION_ORDER)[number];

/**
 * "Would you like to join the organisation formally?" — the mock's copy
 * promises a real consequence ("a coordinator will contact you"), but
 * there is no column for it yet (see the profile-mapping review: the
 * obvious candidate, participate_campaign, already means something
 * else — see CAMPAIGN_OPTIONS below). Rendered, but NOT sent anywhere,
 * and labelled as such, rather than accepting input that silently goes
 * nowhere.
 */
const JOIN_OPTIONS = [
  { key: "yes", label: "Yes" },
  { key: "not_yet", label: "Not yet" },
  { key: "tell_me_more", label: "Tell me more" },
] as const;

/**
 * participate_campaign is an EXISTING column — collected at signup,
 * per the mock, though no control in the current signup form actually
 * writes to it (checked: AuthModal.tsx never renders it, and it is
 * null on every staging profile). It keeps its original meaning here
 * rather than being repurposed for "join formally?" above.
 */
const CAMPAIGN_OPTIONS = [
  "Participate in election campaigns physically",
  "Support digitally from abroad",
  "Fund and sponsor",
  "Not at this time",
];

type PrivateFields = {
  dob: string | null;
  family_relation: string | null;
  family_name: string | null;
  family_mobile: string | null;
  family_village: string | null;
  family_designation: string | null;
  has_vote: boolean | null;
  epic_number: string | null;
  voter_constituency: string | null;
};

const EMPTY_PRIVATE: PrivateFields = {
  dob: null, family_relation: null, family_name: null, family_mobile: null,
  family_village: null, family_designation: null, has_vote: null,
  epic_number: null, voter_constituency: null,
};

/** A restricted field that never loaded renders as an em dash, never a crash. */
function Restricted({ value, loaded }: { value: string | null; loaded: boolean }) {
  if (!loaded) return <span style={{ color: "var(--ink-4)" }}>—</span>;
  return <>{value || <span style={{ color: "var(--ink-4)" }}>—</span>}</>;
}

/** Rotates to point right when its section is collapsed, matching the mock. */
function Chevron({ open }: { open: boolean }) {
  return (
    <span
      style={{
        marginLeft: "auto", color: "var(--ink-4)", fontSize: 11,
        transition: "transform .18s ease",
        transform: open ? "none" : "rotate(-90deg)",
      }}
    >
      ▾
    </span>
  );
}

export default function MyProfile() {
  const { user, profile, refreshProfile } = useAuth();

  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; kind: "ok" | "err" } | null>(null);

  // ── restricted half ────────────────────────────────────────────────
  const [priv, setPriv] = useState<PrivateFields>(EMPTY_PRIVATE);
  const [privateLoaded, setPrivateLoaded] = useState(false);

  // ── form state ─────────────────────────────────────────────────────
  const [form, setForm] = useState({
    first_name: "", last_name: "", mobile_number: "", whatsapp_number: "",
    gender: "", country_of_residence: "", state_abroad: "", city_abroad: "",
    indian_state: "", district: "", assembly_constituency: "", mandal: "", village: "",
    profession: "", organization: "", designation: "",
    facebook_id: "", twitter_id: "", instagram_id: "", linkedin_id: "",
    contribution_note: "", participate_campaign: "",
  });
  // "Join formally?" is UI-only — see the comment on JOIN_OPTIONS.
  const [joinFormally, setJoinFormally] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [hasVote, setHasVote] = useState<boolean | null>(null);
  const [epic, setEpic] = useState("");
  const [voterConstituency, setVoterConstituency] = useState("");
  const [dob, setDob] = useState("");
  const [family, setFamily] = useState({
    relation: "", name: "", mobile: "", village: "", designation: "",
  });

  // ── accordion ──────────────────────────────────────────────────────
  const [openSections, setOpenSections] = useState<Set<SectionKey>>(new Set());
  const [flash, setFlash] = useState<SectionKey | null>(null);
  const sectionRefs = useRef<Partial<Record<SectionKey, HTMLElement | null>>>({});
  const accordionInited = useRef(false);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      const wasOpen = next.has(key);
      if (wasOpen) next.delete(key); else next.add(key);
      // Only closing cascades — see the note on SECTION_ORDER above.
      if (wasOpen) {
        const i = SECTION_ORDER.indexOf(key);
        SECTION_ORDER.slice(i + 1, i + 2).forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const jumpToSection = (key: SectionKey) => {
    setOpenSections((prev) => new Set(prev).add(key));
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(key);
    setTimeout(() => setFlash(null), 900);
  };

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── load ───────────────────────────────────────────────────────────
  // formLoaded flips only once `form` genuinely holds real data. The
  // accordion-init effect below depends on THIS, not on `profile` —
  // depending on `profile` fired the init effect in the same
  // effect-flush as this one, before `setForm` had actually taken
  // effect, so it always computed completeness off the still-empty
  // initial `form` and (wrongly) opened every section. Caught by
  // actually loading the page in a browser, not by any exploit test —
  // the API-level checks never render a UI, so this class of bug is
  // invisible to them by construction.
  const [formLoaded, setFormLoaded] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const p = profile as Record<string, unknown>;
    const s = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
    setForm({
      first_name: s("first_name"), last_name: s("last_name"),
      mobile_number: s("mobile_number"), whatsapp_number: s("whatsapp_number"),
      gender: s("gender"), country_of_residence: s("country_of_residence"),
      state_abroad: s("state_abroad"), city_abroad: s("city_abroad"),
      indian_state: s("indian_state"), district: s("district"),
      assembly_constituency: s("assembly_constituency"), mandal: s("mandal"),
      village: s("village"), profession: s("profession"),
      organization: s("organization"), designation: s("designation"),
      facebook_id: s("facebook_id"), twitter_id: s("twitter_id"),
      instagram_id: s("instagram_id"), linkedin_id: s("linkedin_id"),
      contribution_note: s("contribution_note"),
      participate_campaign: s("participate_campaign"),
    });
    setAreas(Array.isArray(p.contribution_areas) ? (p.contribution_areas as string[]) : []);
    setFormLoaded(true);
  }, [profile]);

  const loadPrivate = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_private_profile");
    if (error) {
      // Not fatal. privateLoaded stays false, the restricted inputs stay
      // read-only, and the save path sends none of them.
      console.error("my_private_profile failed:", error);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as PrivateFields | undefined;
    if (!row) return;
    setPriv(row);
    setPrivateLoaded(true);
    setDob(row.dob ?? "");
    setEpic(row.epic_number ?? "");
    setVoterConstituency(row.voter_constituency ?? "");
    setHasVote(row.has_vote);
    setFamily({
      relation: row.family_relation ?? "", name: row.family_name ?? "",
      mobile: row.family_mobile ?? "", village: row.family_village ?? "",
      designation: row.family_designation ?? "",
    });
  }, []);

  useEffect(() => { void loadPrivate(); }, [loadPrivate]);

  // ── profile strength, from what is actually filled ─────────────────
  // Each check carries the section it belongs to. That mapping is the
  // single source both the accordion's initial open/closed state and
  // the checklist's click-to-jump use — one definition of "done" rather
  // than two that could drift apart.
  const strength = useMemo(() => {
    const checks: { label: string; done: boolean; section: SectionKey }[] = [
      { label: "Personal details", section: "personal", done: !!(form.first_name && form.last_name && form.mobile_number) },
      { label: "Address abroad", section: "livenow", done: !!(form.country_of_residence && form.city_abroad) },
      { label: "Constituency & mandal", section: "apland", done: !!(form.assembly_constituency && form.mandal) },
      { label: "Work", section: "work", done: !!form.profession },
      { label: "Family contact in AP", section: "family", done: privateLoaded && !!family.name },
      { label: "Contribution areas", section: "contribute", done: areas.length > 0 },
      { label: "EPIC number", section: "voter", done: privateLoaded && !!epic },
      { label: "Second number", section: "personal", done: !!form.whatsapp_number },
      {
        label: "Social handles", section: "social",
        done: !!(form.facebook_id || form.twitter_id || form.instagram_id || form.linkedin_id),
      },
    ];
    const done = checks.filter((c) => c.done).length;
    return { checks, pct: Math.round((done / checks.length) * 100) };
  }, [form, areas, epic, family.name, privateLoaded]);

  const verdict =
    strength.pct >= 80 ? "Strong" : strength.pct >= 60 ? "Good" : "Needs attention";

  // Open exactly the sections that need attention, once — computed from
  // the checklist above so it can never disagree with what the rail
  // shows. Gated on formLoaded, NOT profile — see the comment on
  // formLoaded above for why that distinction is the whole fix. The
  // ref makes sure this only ever WRITES state that one time, so it
  // never fights a manual toggle made after.
  useEffect(() => {
    if (accordionInited.current || !formLoaded) return;
    accordionInited.current = true;
    const incomplete = new Set<SectionKey>(
      strength.checks.filter((c) => !c.done).map((c) => c.section)
    );
    // Not a completeness question — force open like the mock, since
    // it's the flagged gap, not something to bury by default.
    incomplete.add("campaign");
    setOpenSections(incomplete);
  }, [formLoaded, strength]);

  // ── save ───────────────────────────────────────────────────────────
  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMsg(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...form,
          contribution_areas: areas.length ? areas : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) throw error;

      // Restricted half. Only when this session actually read them —
      // otherwise every field below would be submitted blank.
      if (privateLoaded) {
        const { error: pErr } = await supabase.rpc("update_my_private_profile", {
          p_dob: dob.trim() || null,
          p_family_relation: family.relation.trim() || null,
          p_family_name: family.name.trim() || null,
          p_family_mobile: family.mobile.trim() || null,
          p_family_village: family.village.trim() || null,
          p_family_designation: family.designation.trim() || null,
          p_has_vote: hasVote,
          p_epic_number: epic.trim() || null,
          p_voter_constituency: voterConstituency.trim() || null,
          // Clearing is an explicit act: the field had a value and the
          // member emptied it. An unloaded field never reaches here.
          p_clear_dob: !!priv.dob && !dob.trim(),
          p_clear_family: !!priv.family_name && !family.name.trim() && !family.mobile.trim(),
          p_clear_voter: !!priv.voter_constituency && !voterConstituency.trim(),
        });
        if (pErr) throw pErr;
        await loadPrivate();
      }

      await refreshProfile();
      setMsg({ text: "Profile saved.", kind: "ok" });
      setEdit(false);
    } catch (e) {
      console.error(e);
      setMsg({ text: "Could not save. Nothing was changed.", kind: "err" });
    } finally {
      setSaving(false);
    }
  };

  const ro = !edit;

  const Field = ({
    label, value, onChange, hint, type = "text", disabled,
  }: {
    label: string; value: string; onChange: (v: string) => void;
    hint?: string; type?: string; disabled?: boolean;
  }) => (
    <div className="pt-field">
      <label>{label}</label>
      <input
        className="pt-inp" type={type} value={value} disabled={disabled ?? ro}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );

  return (
    <div style={{ background: "var(--ground)", padding: "24px 26px 60px", minHeight: "100%" }}>
      <div className="pt-sec-title">My Profile</div>
      <p className="pt-sec-note">
        What you record here decides which requests reach you, which leaders you're
        connected to, and how the wing counts its strength in your constituency.
      </p>

      {msg && (
        <div className={`pt-note ${msg.kind === "ok" ? "go" : "warn"}`} style={{ marginBottom: 14 }}>
          {msg.text}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {ro ? (
          <button className="pt-btn pt-btn-out" onClick={() => setEdit(true)}>
            Edit profile
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="pt-btn pt-btn-go" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button className="pt-btn pt-btn-out" onClick={() => { setEdit(false); setMsg(null); }}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="pt-page">
        {/* ── main column ─────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Are you on the voter roll? */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.voter = el; }}
            style={flash === "voter" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("voter")}>
              <div style={{ flex: 1 }}>
                <h3>Are you on the voter roll?</h3>
                <div className="sub">
                  Helps the wing map NRI voters constituency by constituency
                </div>
              </div>
              <span className="pt-pill pt-p-green">New</span>
              <Chevron open={openSections.has("voter")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("voter") ? undefined : "none" }}>
              <div className="pt-field">
                <label>Do you have a vote in Andhra Pradesh?</label>
                <div className="pt-radio-row">
                  {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((o) => (
                    <label key={o.l} className={`pt-chk ${hasVote === o.v ? "on" : ""}`}>
                      <input
                        type="radio" name="has_vote" checked={hasVote === o.v}
                        disabled={ro || !privateLoaded}
                        onChange={() => setHasVote(o.v)}
                      />
                      {o.l}
                    </label>
                  ))}
                </div>
                {!privateLoaded && (
                  <div className="hint">
                    Voter details could not be loaded, so they cannot be edited here.
                  </div>
                )}
              </div>

              <Field
                label="EPIC number (optional)" value={epic} onChange={setEpic}
                disabled={ro || !privateLoaded}
                hint="Your voter ID card number. Optional — we can still map your constituency without it. Visible only to wing administrators."
              />
              <Field
                label="Registered constituency" value={voterConstituency}
                onChange={setVoterConstituency} disabled={ro || !privateLoaded}
                hint="Where you are registered to vote. Separate from where you are from, below."
              />
            </div>
          </section>

          {/* How can you contribute? */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.contribute = el; }}
            style={flash === "contribute" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("contribute")}>
              <div style={{ flex: 1 }}>
                <h3>How can you contribute?</h3>
                <div className="sub">Pick everything that applies — this is how organisers find you</div>
              </div>
              <span className="pt-pill pt-p-green">New</span>
              <Chevron open={openSections.has("contribute")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("contribute") ? undefined : "none" }}>
              <div className="pt-field">
                <label>Areas you can help with</label>
                <div className="pt-checks">
                  {CONTRIBUTION_AREAS.map((a) => {
                    const on = areas.includes(a.key);
                    return (
                      <label key={a.key} className={`pt-chk ${on ? "on" : ""}`}>
                        <input
                          type="checkbox" checked={on} disabled={ro}
                          onChange={() =>
                            setAreas((prev) =>
                              on ? prev.filter((k) => k !== a.key) : [...prev, a.key]
                            )
                          }
                        />
                        {a.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-field">
                <label>Tell us more (optional)</label>
                <textarea
                  className="pt-inp" value={form.contribution_note} disabled={ro}
                  maxLength={1000}
                  onChange={(e) => set("contribution_note")(e.target.value)}
                />
                <div className="hint">Free text, up to 1,000 characters.</div>
              </div>

              <div className="pt-field">
                <label>Would you like to join the organisation formally?</label>
                <div className="pt-radio-row">
                  {JOIN_OPTIONS.map((o) => (
                    <label
                      key={o.key}
                      className={`pt-chk ${joinFormally === o.key ? "on" : ""}`}
                    >
                      <input
                        type="radio" name="join" disabled={ro}
                        checked={joinFormally === o.key}
                        onChange={() => setJoinFormally(o.key)}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                <div className="hint" style={{ color: "var(--saffron)" }}>
                  Not saved yet — there is no coordinator follow-up behind this
                  answer today. Coming soon.
                </div>
              </div>
            </div>
          </section>

          {/* Campaign participation — the existing field the mock flags as
              a gap: collected at signup with no edit UI until now. */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.campaign = el; }}
            style={flash === "campaign" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("campaign")}>
              <div style={{ flex: 1 }}>
                <h3>Campaign participation</h3>
                <div className="sub">Collected at signup — not editable until now</div>
              </div>
              <span className="pt-pill" style={{ background: "var(--saffron-soft)", color: "var(--saffron)" }}>Gap</span>
              <Chevron open={openSections.has("campaign")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("campaign") ? undefined : "none" }}>
              <div className="pt-field" style={{ marginBottom: 0 }}>
                <label>How would you like to take part?</label>
                <select
                  className="pt-inp" disabled={ro}
                  value={form.participate_campaign}
                  onChange={(e) => set("participate_campaign")(e.target.value)}
                >
                  <option value="">— Select —</option>
                  {CAMPAIGN_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Personal details */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.personal = el; }}
            style={flash === "personal" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("personal")}>
              <div style={{ flex: 1 }}><h3>Personal details</h3></div>
              <Chevron open={openSections.has("personal")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("personal") ? undefined : "none" }}>
              <div className="pt-grid pt-g2">
                <Field label="First name" value={form.first_name} onChange={set("first_name")} />
                <Field label="Last name" value={form.last_name} onChange={set("last_name")} />
              </div>
              <div className="pt-grid pt-g2">
                <Field label="Mobile" value={form.mobile_number} onChange={set("mobile_number")} />
                <Field label="Second number" value={form.whatsapp_number} onChange={set("whatsapp_number")} />
              </div>
              <div className="pt-grid pt-g2">
                <Field label="Gender" value={form.gender} onChange={set("gender")} />
                <div className="pt-field">
                  <label>Date of birth</label>
                  {privateLoaded ? (
                    <input
                      className="pt-inp" value={dob} disabled={ro}
                      placeholder="dd.mm.yyyy"
                      onChange={(e) => setDob(e.target.value)}
                    />
                  ) : (
                    <div className="pt-inp" style={{ background: "var(--card-2)" }}>
                      <Restricted value={priv.dob} loaded={privateLoaded} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Where you live now */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.livenow = el; }}
            style={flash === "livenow" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("livenow")}>
              <div style={{ flex: 1 }}><h3>Where you live now</h3></div>
              <Chevron open={openSections.has("livenow")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("livenow") ? undefined : "none" }}>
              <div className="pt-grid pt-g2">
                <Field label="Country of residence" value={form.country_of_residence} onChange={set("country_of_residence")} />
                <Field label="State abroad" value={form.state_abroad} onChange={set("state_abroad")} />
              </div>
              <Field label="City abroad" value={form.city_abroad} onChange={set("city_abroad")} />
            </div>
          </section>

          {/* Your place in Andhra Pradesh */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.apland = el; }}
            style={flash === "apland" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("apland")}>
              <div style={{ flex: 1 }}>
                <h3>Your place in Andhra Pradesh</h3>
                <div className="sub">Where you are from — separate from where you vote</div>
              </div>
              <Chevron open={openSections.has("apland")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("apland") ? undefined : "none" }}>
              <div className="pt-grid pt-g2">
                <Field label="State" value={form.indian_state} onChange={set("indian_state")} />
                <Field label="District" value={form.district} onChange={set("district")} />
              </div>
              <div className="pt-grid pt-g2">
                <Field label="Assembly constituency" value={form.assembly_constituency} onChange={set("assembly_constituency")} />
                <Field label="Mandal" value={form.mandal} onChange={set("mandal")} />
              </div>
              <Field label="Village" value={form.village} onChange={set("village")} />
            </div>
          </section>

          {/* Work */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.work = el; }}
            style={flash === "work" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("work")}>
              <div style={{ flex: 1 }}><h3>Work</h3></div>
              <Chevron open={openSections.has("work")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("work") ? undefined : "none" }}>
              <div className="pt-grid pt-g2">
                <Field label="Profession" value={form.profession} onChange={set("profession")} />
                <Field label="Organisation" value={form.organization} onChange={set("organization")} />
              </div>
              <Field label="Designation" value={form.designation} onChange={set("designation")} />
            </div>
          </section>

          {/* Active family member in AP */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.family = el; }}
            style={flash === "family" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("family")}>
              <div style={{ flex: 1 }}>
                <h3>Active family member in AP</h3>
                <div className="sub">Optional — fill only if you have an active YSRCP family member</div>
              </div>
              <Chevron open={openSections.has("family")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("family") ? undefined : "none" }}>
              {!privateLoaded && (
                <div className="pt-note warn" style={{ marginBottom: 12 }}>
                  These fields could not be loaded, so they are shown read-only.
                  Saving will leave them exactly as they are.
                </div>
              )}
              <div className="pt-grid pt-g2">
                <Field label="Relationship" value={family.relation}
                  onChange={(v) => setFamily((f) => ({ ...f, relation: v }))}
                  disabled={ro || !privateLoaded} />
                <Field label="Name" value={family.name}
                  onChange={(v) => setFamily((f) => ({ ...f, name: v }))}
                  disabled={ro || !privateLoaded} />
              </div>
              <div className="pt-grid pt-g2">
                <Field label="Mobile" value={family.mobile}
                  onChange={(v) => setFamily((f) => ({ ...f, mobile: v }))}
                  disabled={ro || !privateLoaded} />
                <Field label="Village" value={family.village}
                  onChange={(v) => setFamily((f) => ({ ...f, village: v }))}
                  disabled={ro || !privateLoaded} />
              </div>
              <Field label="Party role, if any" value={family.designation}
                onChange={(v) => setFamily((f) => ({ ...f, designation: v }))}
                disabled={ro || !privateLoaded} />
            </div>
          </section>

          {/* Social handles */}
          <section
            className="pt-card"
            ref={(el) => { sectionRefs.current.social = el; }}
            style={flash === "social" ? { boxShadow: "0 0 0 2px var(--navy)" } : undefined}
          >
            <div className="pt-card-h pt-card-h-toggle" onClick={() => toggleSection("social")}>
              <div style={{ flex: 1 }}><h3>Social handles</h3></div>
              <Chevron open={openSections.has("social")} />
            </div>
            <div className="pt-card-b" style={{ display: openSections.has("social") ? undefined : "none" }}>
              <div className="pt-grid pt-g2">
                <Field label="Facebook" value={form.facebook_id} onChange={set("facebook_id")} />
                <Field label="X / Twitter" value={form.twitter_id} onChange={set("twitter_id")} />
              </div>
              <div className="pt-grid pt-g2">
                <Field label="Instagram" value={form.instagram_id} onChange={set("instagram_id")} />
                <Field label="LinkedIn" value={form.linkedin_id} onChange={set("linkedin_id")} />
              </div>
            </div>
          </section>
        </div>

        {/* ── right rail ──────────────────────────────────────────── */}
        <aside className="pt-rail" style={{ position: "sticky", top: 18,
          display: "flex", flexDirection: "column", gap: 14 }}>

          <section className="pt-card">
            <div className="pt-card-h"><h3>Why we ask</h3></div>
            <div className="pt-card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Voter status</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
                  Tells the wing which constituencies its diaspora actually votes in.
                  That's the difference between a mailing list and a political base.
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>Contribution areas</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
                  When a campaign needs fifty people who can run social media in Telugu,
                  this is the only way to find them quickly.
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>EPIC number</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.55 }}>
                  Optional. It lets the wing verify roll entries in bulk rather than one
                  by one. Only administrators can see it.
                </div>
              </div>
            </div>
          </section>

          <section className="pt-card">
            <div className="pt-card-h"><h3>Profile strength</h3></div>
            <div className="pt-card-b">
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                  {strength.pct}% complete
                </span>
                <b style={{ color: "var(--navy)" }}>{verdict}</b>
              </div>
              <div className="pt-bar" style={{ marginBottom: 14 }}>
                <i style={{ width: `${strength.pct}%` }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {strength.checks.map((c) => (
                  <div
                    key={c.label}
                    onClick={c.done ? undefined : () => jumpToSection(c.section)}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, fontSize: 12.5,
                      cursor: c.done ? "default" : "pointer",
                      margin: "0 -6px", padding: "2px 6px", borderRadius: 6,
                    }}
                  >
                    <span style={{ color: c.done ? "var(--navy)" : "var(--ink-4)", width: 14 }}>
                      {c.done ? "✓" : "○"}
                    </span>
                    <span style={{ color: c.done ? "var(--ink-2)" : "var(--ink-4)" }}>
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>
              {strength.checks.some((c) => !c.done) && (
                <div className="hint" style={{ marginTop: 9 }}>
                  Click an open circle to jump to that section.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
