/**
 * Handles & Links — built to docs/design/nri-wing-prototype.html
 * (a-links).
 *
 * Terms/Privacy: checked with the user — bare URL fields, reusing
 * app_settings (same key/value table ContentControl.tsx already uses).
 * Whether real policy text lives at that URL is an operational
 * responsibility, not something this screen can guarantee.
 *
 * No "Publish" button — app_settings has no draft/live concept
 * anywhere else it's used; every field here saves immediately, like
 * ContentControl.tsx's toggle already does.
 *
 * The party-website URL discrepancy (Footer.tsx hardcoded
 * ysrcongress.com, the seeded national handle says ysrcparty.com) is
 * resolved by making this screen — and the footer — read the one
 * seeded row, not by guessing which was right.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Handle = { id: string; platform: string; label: string; url: string; handle: string | null };
type ChapterHandle = {
  id: string; chapter_name: string; platform: string; label: string; handle: string | null;
  published_by_name: string | null; published_at: string; url: string;
};

const NATIONAL_PLATFORMS = ["x", "facebook", "instagram", "youtube", "whatsapp"] as const;
const PLATFORM_LABEL: Record<string, string> = {
  x: "X", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", whatsapp: "WhatsApp", telegram: "Telegram", website: "Website",
};

export default function AdminLinks() {
  const [national, setNational] = useState<Handle[]>([]);
  const [partyWebsite, setPartyWebsite] = useState<Handle | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [chapterHandles, setChapterHandles] = useState<ChapterHandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [nat, set, ch] = await Promise.all([
      supabase.from("social_handles").select("id, platform, label, url, handle").eq("scope", "national"),
      supabase.from("app_settings").select("key, value").in("key", ["footer_terms_url", "footer_privacy_url", "footer_contact_email", "footer_contact_phone"]),
      supabase.rpc("my_chapter_handles_admin"),
    ]);
    const rows = (nat.data as (Handle & { platform: string })[]) ?? [];
    setNational(rows.filter((r) => r.platform !== "website"));
    setPartyWebsite(rows.find((r) => r.platform === "website" && r.label.includes("Party")) ?? null);
    const s: Record<string, string> = {};
    for (const row of (set.data as { key: string; value: unknown }[]) ?? []) {
      s[row.key] = typeof row.value === "string" ? row.value : JSON.stringify(row.value ?? "");
    }
    setSettings(s);
    setChapterHandles((ch.data as ChapterHandle[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const saveSetting = async (key: string, value: string) => {
    await supabase.from("app_settings").update({ value }).eq("key", key);
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
  };

  const saveHandleUrl = async (id: string, url: string) => {
    await supabase.from("social_handles").update({ url }).eq("id", id);
    setSavedKey(id);
    setTimeout(() => setSavedKey((k) => (k === id ? null : k)), 1500);
  };

  const exportCsv = () => {
    const header = ["Chapter", "Platform", "Handle", "Published by", "When"];
    const lines = chapterHandles.map((h) => [
      h.chapter_name, PLATFORM_LABEL[h.platform] ?? h.platform, h.handle ?? "",
      h.published_by_name ?? "—", new Date(h.published_at).toLocaleDateString(),
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "chapter-handles.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Handles & Links</h2>
        <p className="text-sm text-gray-600 mt-1">Every field here saves immediately.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3">Official party handles</h3>
          <div className="space-y-3">
            {NATIONAL_PLATFORMS.map((platform) => {
              const h = national.find((n) => n.platform === platform);
              return (
                <div key={platform} className="flex items-center gap-2">
                  <span className="w-24 text-xs font-bold text-gray-500 flex-shrink-0">{PLATFORM_LABEL[platform]}</span>
                  <input
                    defaultValue={h?.url ?? ""}
                    placeholder="https://…"
                    onBlur={(e) => h && e.target.value !== h.url && void saveHandleUrl(h.id, e.target.value)}
                    className="flex-1 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
                  />
                  {savedKey === h?.id && <span className="text-xs text-emerald-600 font-bold">Saved</span>}
                  {!h && <span className="text-xs text-gray-400">not on file</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-3">Footer links</h3>
          <div className="space-y-3">
            {[
              { key: "footer_terms_url", label: "Terms of use" },
              { key: "footer_privacy_url", label: "Privacy policy" },
              { key: "footer_contact_email", label: "Contact email" },
              { key: "footer_contact_phone", label: "Contact phone" },
            ].map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <span className="w-32 text-xs font-bold text-gray-500 flex-shrink-0">{f.label}</span>
                <input
                  defaultValue={settings[f.key] ?? ""}
                  onBlur={(e) => e.target.value !== settings[f.key] && void saveSetting(f.key, e.target.value)}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
                />
                {savedKey === f.key && <span className="text-xs text-emerald-600 font-bold">Saved</span>}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="w-32 text-xs font-bold text-gray-500 flex-shrink-0">Party website</span>
              <input
                defaultValue={partyWebsite?.url ?? ""}
                placeholder="https://…"
                onBlur={(e) => partyWebsite && e.target.value !== partyWebsite.url && void saveHandleUrl(partyWebsite.id, e.target.value)}
                className="flex-1 text-sm border border-gray-300 rounded-lg px-2.5 py-1.5"
              />
              {savedKey === partyWebsite?.id && <span className="text-xs text-emerald-600 font-bold">Saved</span>}
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            EU members carry GDPR Article 9 protections — a dead Privacy link is a compliance gap for
            roughly 700 members resident in the EU, not just a broken anchor.
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Chapter handles</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Members see only their own chapter's handles, plus national ones — the secretariat sees every
              chapter. That split exists to limit impersonation risk.
            </p>
          </div>
          <button onClick={exportCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
            Export
          </button>
        </div>
        {chapterHandles.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No chapter handles yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Chapter</th>
                  <th className="py-2 px-4 font-bold">Platform</th>
                  <th className="py-2 px-4 font-bold">Handle</th>
                  <th className="py-2 px-4 font-bold">Published by</th>
                  <th className="py-2 px-4 font-bold">When</th>
                  <th className="py-2 px-4 font-bold">View</th>
                </tr>
              </thead>
              <tbody>
                {chapterHandles.map((h) => (
                  <tr key={h.id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{h.chapter_name}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{PLATFORM_LABEL[h.platform] ?? h.platform}</span>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{h.handle ?? "—"}</td>
                    <td className="py-2.5 px-4 text-gray-700">{h.published_by_name ?? "—"}</td>
                    <td className="py-2.5 px-4 text-gray-500 text-xs">{new Date(h.published_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-4">
                      <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary-700 hover:underline">Open</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
