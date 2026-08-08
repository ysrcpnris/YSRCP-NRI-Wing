/**
 * Welcome Message — built to docs/design/nri-wing-prototype.html (a-welcome).
 *
 * Every version in welcome_messages is immutable once published (see
 * 20260808210000_admin_welcome.sql). This screen only ever edits the one
 * mutable draft row — admin_welcome_ensure_draft() fetches it, creating a
 * fresh one (seeded from whatever is currently live) the first time it's
 * opened or right after a publish. Restoring an old version copies its
 * content into that same kind of fresh draft; it never rewrites history.
 *
 * "Save draft" and "Publish" are deliberately two separate actions, unlike
 * a-appt's single-step publish — this content is reviewed before it goes
 * live (the mock's own "needs approval from his office" note), so silent
 * autosave-and-you're-live isn't appropriate here. Publish always saves
 * the current form first, so it can never ship stale content.
 *
 * The mock's header carries a separate "Version history" button; dropped
 * here since the Recent versions card already sits on the same page — a
 * second control that scrolls to it would be chrome with no new function.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";
import { countriesData } from "../lib/countryCodes";
import { renderParagraphs } from "../lib/richText";

type VersionRow = {
  id: string;
  eyebrow: string | null;
  heading_te: string | null;
  is_published: boolean;
  created_by_name: string | null;
  created_at: string;
  published_at: string | null;
};

type Audience = "all" | "countries" | "off";

type FormState = {
  eyebrow: string;
  heading_te: string;
  subheading: string;
  body: string;
  signed_by_name: string;
  signed_by_title: string;
  signed_by_initials: string;
  audience: Audience;
  audience_countries: string[];
  show_at_onboarding: boolean;
  retrievable_from_profile: boolean;
  reshow_to_existing: boolean;
};

const EMPTY_FORM: FormState = {
  eyebrow: "",
  heading_te: "",
  subheading: "",
  body: "",
  signed_by_name: "",
  signed_by_title: "",
  signed_by_initials: "",
  audience: "all",
  audience_countries: [],
  show_at_onboarding: true,
  retrievable_from_profile: true,
  reshow_to_existing: false,
};

const COUNTRY_NAMES = countriesData.map((c) => c.name).sort();

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function Toggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
        on ? "bg-primary-600" : "bg-gray-300"
      } disabled:opacity-60`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AdminWelcome() {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadDraft = useCallback(async (id: string) => {
    const { data } = await supabase.rpc("admin_welcome_version", { p_id: id });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return;
    setForm({
      eyebrow: row.eyebrow ?? "",
      heading_te: row.heading_te ?? "",
      subheading: row.subheading ?? "",
      body: row.body ?? "",
      signed_by_name: row.signed_by_name ?? "",
      signed_by_title: row.signed_by_title ?? "",
      signed_by_initials: row.signed_by_initials ?? "",
      audience: (row.audience as Audience) ?? "all",
      audience_countries: row.audience_countries ?? [],
      show_at_onboarding: row.show_at_onboarding ?? true,
      retrievable_from_profile: row.retrievable_from_profile ?? true,
      reshow_to_existing: row.reshow_to_existing ?? false,
    });
  }, []);

  const fetchAll = useCallback(async () => {
    const [{ data: draft }, { data: vers, error: versErr }] = await Promise.all([
      supabase.rpc("admin_welcome_ensure_draft"),
      supabase.rpc("admin_welcome_versions"),
    ]);
    if (versErr) {
      toast.error("Could not load version history");
    }
    setVersions((vers as VersionRow[]) ?? []);
    if (draft) {
      setDraftId(draft as string);
      await loadDraft(draft as string);
    }
    setLoading(false);
  }, [loadDraft]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const currentlyPublished = useMemo(() => versions.find((v) => v.is_published), [versions]);

  const saveDraft = useCallback(async (): Promise<boolean> => {
    if (!draftId) return false;
    const { data, error } = await supabase.rpc("save_welcome_draft", {
      p_id: draftId,
      p_eyebrow: form.eyebrow,
      p_heading_te: form.heading_te,
      p_subheading: form.subheading,
      p_body: form.body,
      p_signed_by_name: form.signed_by_name,
      p_signed_by_title: form.signed_by_title,
      p_signed_by_initials: form.signed_by_initials,
      p_audience: form.audience,
      p_audience_countries: form.audience === "countries" ? form.audience_countries : null,
      p_show_at_onboarding: form.show_at_onboarding,
      p_retrievable_from_profile: form.retrievable_from_profile,
      p_reshow_to_existing: form.reshow_to_existing,
    });
    if (error || !data) {
      toast.error("Could not save the draft");
      return false;
    }
    return true;
  }, [draftId, form]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveDraft();
    setSaving(false);
    if (ok) {
      toast.success("Draft saved");
      void fetchAll();
    }
  };

  const handlePublish = async () => {
    if (!draftId) return;
    if (form.audience === "countries" && form.audience_countries.length === 0) {
      toast.error("Pick at least one country, or change who sees this message");
      return;
    }
    if (!form.heading_te.trim() && !form.body.trim()) {
      toast.error("Write a heading or a message before publishing");
      return;
    }
    setPublishing(true);
    const saved = await saveDraft();
    if (!saved) {
      setPublishing(false);
      return;
    }
    const { data, error } = await supabase.rpc("publish_welcome_message", { p_id: draftId });
    setPublishing(false);
    if (error || !data) {
      toast.error("Could not publish");
      return;
    }
    toast.success("Published — live for new members immediately");
    void fetchAll();
  };

  const handleRestore = async (id: string) => {
    setRestoringId(id);
    const { data, error } = await supabase.rpc("restore_welcome_version", { p_id: id });
    setRestoringId(null);
    if (error || !data) {
      toast.error("Could not restore that version");
      return;
    }
    toast.success("Restored — now editing as a new draft. Publish to make it live.");
    setDraftId(data as string);
    await loadDraft(data as string);
    void fetchAll();
  };

  const toggleCountry = (name: string) => {
    setForm((f) => ({
      ...f,
      audience_countries: f.audience_countries.includes(name)
        ? f.audience_countries.filter((c) => c !== name)
        : [...f.audience_countries, name],
    }));
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-gray-900">Welcome Message</h2>
          <p className="text-sm text-gray-600 mt-1">
            Shown to every new member at the end of onboarding. Edit it here — no deployment needed.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleSave()}
            disabled={saving || publishing}
            className="text-sm font-bold px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={() => void handlePublish()}
            disabled={saving || publishing}
            className="text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-gray-900">Edit</h3>
                <p className="text-xs text-gray-500 mt-0.5">Preview updates as you type</p>
              </div>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "#FDF0E7", color: "#D9641A" }}
              >
                Draft · unpublished
              </span>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Eyebrow</label>
                  <input
                    value={form.eyebrow}
                    onChange={(e) => setForm({ ...form, eyebrow: e.target.value })}
                    placeholder="Mission 2029"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Show this message</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">To every new member</option>
                    <option value="countries">To members in selected countries</option>
                    <option value="off">Turn off</option>
                  </select>
                </div>
              </div>

              {form.audience === "countries" && (
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Countries</label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-36 overflow-y-auto flex flex-wrap gap-1.5">
                    {form.audience_countries.length === 0 && (
                      <span className="text-xs text-gray-400 px-1 py-1">Pick from the list below</span>
                    )}
                    {form.audience_countries.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCountry(c)}
                        className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-800"
                      >
                        {c} ×
                      </button>
                    ))}
                  </div>
                  <select
                    value=""
                    onChange={(e) => e.target.value && toggleCountry(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 mt-1.5"
                  >
                    <option value="">Add a country…</option>
                    {COUNTRY_NAMES.filter((c) => !form.audience_countries.includes(c)).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Heading — Telugu</label>
                <input
                  value={form.heading_te}
                  onChange={(e) => setForm({ ...form, heading_te: e.target.value })}
                  placeholder="మీ రాకకు స్వాగతం"
                  className="w-full text-base border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Sub-heading — English</label>
                <input
                  value={form.subheading}
                  onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                  placeholder="Welcome — you've come home to us"
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Message</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  style={{ minHeight: 190, lineHeight: 1.6 }}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Blank line starts a new paragraph. Wrap text in <span className="font-mono">**stars**</span> to bold it.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Signed by</label>
                  <input
                    value={form.signed_by_name}
                    onChange={(e) => setForm({ ...form, signed_by_name: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Title</label>
                  <input
                    value={form.signed_by_title}
                    onChange={(e) => setForm({ ...form, signed_by_title: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1">Initials</label>
                  <input
                    value={form.signed_by_initials}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, signed_by_initials: e.target.value.toUpperCase() })}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Where it appears</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">End of onboarding</div>
                  <div className="text-xs text-gray-500">Step 4, before the dashboard opens</div>
                </div>
                <Toggle
                  on={form.show_at_onboarding}
                  onClick={() => setForm({ ...form, show_at_onboarding: !form.show_at_onboarding })}
                />
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Retrievable from the profile</div>
                  <div className="text-xs text-gray-500">Members can read it again later</div>
                </div>
                <Toggle
                  on={form.retrievable_from_profile}
                  onClick={() => setForm({ ...form, retrievable_from_profile: !form.retrievable_from_profile })}
                />
              </div>
              <div className="border-t border-gray-100" />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900">Re-show to existing members</div>
                  <div className="text-xs text-gray-500">Members who already saw an earlier version see this one once</div>
                </div>
                <Toggle
                  on={form.reshow_to_existing}
                  onClick={() => setForm({ ...form, reshow_to_existing: !form.reshow_to_existing })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Recent versions</h3>
            </div>
            {versions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No versions yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <th className="py-2 px-4 font-bold">Version</th>
                      <th className="py-2 px-4 font-bold">Changed by</th>
                      <th className="py-2 px-4 font-bold">When</th>
                      <th className="py-2 px-4 font-bold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((v) => {
                      const isDraft = v.id === draftId && !v.is_published;
                      return (
                        <tr key={v.id} className="border-b border-gray-100">
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-gray-900">{v.eyebrow || v.heading_te || "Untitled"}</div>
                            {isDraft && <div className="text-xs text-gray-500">Current draft</div>}
                          </td>
                          <td className="py-2.5 px-4 text-gray-700">{v.created_by_name ?? "—"}</td>
                          <td className="py-2.5 px-4 text-gray-500">{fmtDate(v.published_at ?? v.created_at)}</td>
                          <td className="py-2.5 px-4 text-right">
                            {isDraft ? (
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "#FDF0E7", color: "#D9641A" }}
                              >
                                Draft
                              </span>
                            ) : v.is_published ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">Live</span>
                            ) : (
                              <button
                                onClick={() => void handleRestore(v.id)}
                                disabled={restoringId === v.id}
                                className="text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300 disabled:opacity-50"
                              >
                                {restoringId === v.id ? "Restoring…" : "Restore"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Preview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Exactly what a new member sees</p>
            </div>
            <div className="p-5 bg-gray-50">
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div
                  className="px-6 pt-5 pb-4 text-white relative"
                  style={{ background: "linear-gradient(122deg, #0d356b 0%, #1E6BD6 52%, #0E7536 100%)" }}
                >
                  <div className="text-[10px] tracking-[0.22em] uppercase opacity-70 font-semibold">
                    {form.eyebrow || "—"}
                  </div>
                  <div className="font-serif text-2xl font-semibold mt-1" style={{ letterSpacing: "-0.015em" }}>
                    {form.heading_te || "—"}
                  </div>
                  <div className="text-xs opacity-80 mt-1">{form.subheading || "—"}</div>
                </div>
                <div className="px-6 py-5 bg-white">
                  <div className="text-sm text-gray-800">{renderParagraphs(form.body, "Your message will appear here as you type.")}</div>
                  <div className="flex items-center gap-3 pt-3.5 mt-3.5 border-t border-gray-100">
                    <div
                      className="w-11 h-11 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ background: "linear-gradient(140deg, #1E6BD6 0%, #0E7536 100%)" }}
                    >
                      {form.signed_by_initials || "—"}
                    </div>
                    <div>
                      <div className="font-serif text-sm font-semibold text-gray-900">{form.signed_by_name || "—"}</div>
                      <div className="text-xs text-gray-500">{form.signed_by_title || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 mb-3">Before publishing</h3>
            <div className="space-y-2.5 text-xs text-gray-700">
              <div className="flex items-start gap-2">
                <span style={{ color: "#D9641A" }}>!</span>
                <span>Content attributed to a senior leader needs approval from their office. The system won't check that — someone has to.</span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: "#D9641A" }}>!</span>
                <span>Check the Telugu renders correctly on Android as well as iOS. Telugu conjuncts break in some older system fonts.</span>
              </div>
              <div className="flex items-start gap-2">
                <span style={{ color: "#16A34A" }}>✓</span>
                <span>
                  Publishing affects new members only unless you switch on <i>Re-show to existing members</i>
                  {currentlyPublished ? "." : " — nothing is live yet."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
