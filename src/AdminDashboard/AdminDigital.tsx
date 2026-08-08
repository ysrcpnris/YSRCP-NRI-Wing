/**
 * Digital Army — built to docs/design/nri-wing-prototype.html (a-digital).
 *
 * Campaign management moved here from WingManagement.tsx's CampaignsTab
 * (removed in the same commit) — checked with the user, matching how
 * AdminAbroad already superseded pieces of that same file elsewhere in
 * this batch. campaign_stats() is a faithful diff (+status/+ends_at/
 * +top_channel), everything else about it — including its coordinator-
 * scoping gate — is unchanged.
 *
 * Audience targeting — checked with the user: the mock's picker also
 * offers "Members with X handles" and "Social Media contributors,"
 * neither of which any campaign RPC actually filters by. Scoped down
 * to All members / One country, the two campaigns.country already
 * backs, rather than shipping options that don't change delivery.
 *
 * Handle coverage — X is real (member_x_connections), currently reads
 * 0 because X integration is off in this environment, not faked to
 * look populated. Instagram has no verification mechanism anywhere in
 * the schema (Basic Display API killed Dec 2024) — there is no
 * "Instagram verified" number here at all, not a zero standing in for
 * one.
 *
 * "Live X amplification" only lists campaigns with an x_post_id —
 * "Prompted" is real audience size (who the campaign is visible to),
 * "Tapped repost/like" are x_actions intent signals (not confirmed
 * platform engagement, which X does not expose), "Took the link" is
 * the one hard, first-party number.
 *
 * "Add from X" registers a post's URL as a campaign — it does not pull
 * @YSRCParty's timeline automatically, which the mock's own note says
 * needs a paid X API tier this hasn't been provisioned for.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Stats = {
  live_campaigns: number; ending_this_month: number;
  shares_this_month: number; shares_last_month: number;
  people_reached: number; active_sharers: number; total_members: number;
};
type Channel = { platform: string; clicks: number; pct: number };
type HandleCoverage = { total_members: number; x_on_file: number; x_verified: number; instagram_on_file: number; neither: number };
type CampaignRow = {
  campaign_id: string; title: string; country: string | null; status: string; ends_at: string | null;
  sharers: number; shares: number; clicks: number; clicks_per_share: number | null; top_channel: string | null;
};
type Amplifier = { profile_id: string; full_name: string; country: string | null; shares: number; clicks: number; twitter_id: string | null; x_verified: boolean; instagram_id: string | null };
type XPost = { campaign_id: string; title: string; x_post_id: string; country: string | null; prompted: number; tapped_repost: number; tapped_like: number; took_the_link: number; created_at: string };

const PLATFORM_LABEL: Record<string, string> = {
  x: "X", whatsapp: "WhatsApp", facebook: "Facebook", instagram: "Instagram", youtube: "YouTube", link: "Direct / copied",
};
const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  live: { bg: "#DCFCE7", fg: "#166534", label: "Live" },
  scheduled: { bg: "#DBEAFE", fg: "#1E40AF", label: "Scheduled" },
  closed: { bg: "#F3F4F6", fg: "#4B5563", label: "Closed" },
  draft: { bg: "#FEF3C7", fg: "#92400E", label: "Draft" },
};

function ageLabel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function xPostIdFromUrl(url: string): string | null {
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

export default function AdminDigital() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [handles, setHandles] = useState<HandleCoverage | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [amplifiers, setAmplifiers] = useState<Amplifier[]>([]);
  const [xPosts, setXPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [xUrl, setXUrl] = useState("");
  const [xAudience, setXAudience] = useState("");
  const [pullingX, setPullingX] = useState(false);
  const [xMsg, setXMsg] = useState<string | null>(null);

  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [form, setForm] = useState({ title: "", brief: "", share_text: "", target_url: "", hashtags: "", country: "" });
  const [creating, setCreating] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [s, c, h, cs, a, x] = await Promise.all([
      supabase.rpc("admin_digital_stats"),
      supabase.rpc("admin_digital_channel_breakdown"),
      supabase.rpc("admin_digital_handle_coverage"),
      supabase.rpc("campaign_stats"),
      supabase.rpc("admin_digital_top_amplifiers", { p_limit: 20 }),
      supabase.rpc("admin_digital_x_amplification"),
    ]);
    setStats((Array.isArray(s.data) ? s.data[0] : s.data) ?? null);
    setChannels((c.data as Channel[]) ?? []);
    setHandles((Array.isArray(h.data) ? h.data[0] : h.data) ?? null);
    setCampaigns((cs.data as CampaignRow[]) ?? []);
    setAmplifiers((a.data as Amplifier[]) ?? []);
    setXPosts((x.data as XPost[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  const pullInX = async () => {
    const postId = xPostIdFromUrl(xUrl);
    if (!postId) { setXMsg("Couldn't find a post ID in that URL."); return; }
    setPullingX(true);
    const { error } = await supabase.from("campaigns").insert({
      title: `X post ${postId}`,
      share_text: "Repost this to spread the word.",
      target_url: xUrl.trim(),
      platforms: ["x"],
      country: xAudience || null,
      x_post_id: postId,
      is_published: true,
    });
    setPullingX(false);
    setXMsg(error ? "Could not pull in that post." : `Post pulled in — now live for ${stats?.total_members ?? "all"} members`);
    if (!error) { setXUrl(""); void fetchAll(); }
  };

  const createCampaign = async () => {
    setCreating(true);
    const { error } = await supabase.from("campaigns").insert({
      title: form.title, brief: form.brief || null, share_text: form.share_text,
      target_url: form.target_url, hashtags: form.hashtags || null,
      country: form.country || null, is_published: true,
    });
    setCreating(false);
    setFormMsg(error
      ? (form.country ? "Could not create — you may not cover that country." : "A wing-wide campaign can only be created by an administrator.")
      : "Campaign published.");
    if (!error) {
      setForm({ title: "", brief: "", share_text: "", target_url: "", hashtags: "", country: "" });
      setShowNewCampaign(false);
      void fetchAll();
    }
  };

  const exportCsv = () => {
    const header = ["Campaign", "Country", "Status", "Sharers", "Shares", "Clicks", "Per share", "Top channel"];
    const lines = campaigns.map((c) => [
      c.title, c.country ?? "Whole wing", STATUS_PILL[c.status]?.label ?? c.status,
      String(c.sharers), String(c.shares), String(c.clicks), c.clicks_per_share != null ? String(c.clicks_per_share) : "",
      c.top_channel ? (PLATFORM_LABEL[c.top_channel] ?? c.top_channel) : "",
    ].map((v) => `"${v.replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "campaign-performance.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !stats) {
    return <div className="p-6 text-center text-gray-400">Loading…</div>;
  }

  const sharesDelta = stats.shares_last_month > 0
    ? Math.round((100 * (stats.shares_this_month - stats.shares_last_month)) / stats.shares_last_month)
    : null;
  const maxChannel = Math.max(1, ...channels.map((c) => c.clicks));
  const handleTotal = handles?.total_members ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900">Digital Army</h2>
          <p className="text-sm text-gray-600 mt-1">
            Campaign reach driven by members, measured through the wing's own links.
          </p>
        </div>
        <button onClick={() => setShowNewCampaign(true)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700">
          New campaign
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-gray-900 mb-1">Turn an X post into a campaign</h3>
        <p className="text-xs text-gray-500 mb-3">Paste the URL — members get a Repost link in one tap</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/YSRCParty/status/1847…" className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2" />
          <select value={xAudience} onChange={(e) => setXAudience(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
            <option value="">All members</option>
            {[...new Set(campaigns.map((c) => c.country).filter((c): c is string => !!c))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => void pullInX()} disabled={pullingX || !xUrl.trim()} className="text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
            {pullingX ? "Pulling…" : "Pull in"}
          </button>
        </div>
        {xMsg && <p className="text-xs text-gray-600 mt-2">{xMsg}</p>}
        <div className="mt-4 space-y-2 text-xs text-gray-600">
          <p><b className="text-gray-900">Free, no API key.</b> The post is rendered from its public URL and the action buttons use X's own intent links.</p>
          <p><b className="text-gray-900">Auto-pull is optional.</b> Reading @YSRCParty's own timeline into a suggestions queue needs a paid X tier — this hasn't been provisioned.</p>
          <p><b className="text-gray-900">What you won't get.</b> X does not report who reposted or liked. You'll see how many members were prompted, not how many acted.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Live X amplification</h3>
          <p className="text-xs text-gray-500 mt-0.5">Posts pushed to members for direct action</p>
        </div>
        {xPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No X posts registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Post</th>
                  <th className="py-2 px-4 font-bold">Pushed to</th>
                  <th className="py-2 px-4 font-bold text-right">Prompted</th>
                  <th className="py-2 px-4 font-bold text-right">Tapped repost</th>
                  <th className="py-2 px-4 font-bold text-right">Tapped like</th>
                  <th className="py-2 px-4 font-bold text-right">Took the link</th>
                  <th className="py-2 px-4 font-bold text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {xPosts.map((p) => (
                  <tr key={p.campaign_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4 font-semibold text-gray-900">{p.title}</td>
                    <td className="py-2.5 px-4 text-gray-700">{p.country ?? "All members"}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{p.prompted}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{p.tapped_repost}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{p.tapped_like}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{p.took_the_link}</td>
                    <td className="py-2.5 px-4 text-right text-gray-500">{ageLabel(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
          <b>How to read these columns.</b> "Tapped repost/like" counts members who opened X with the action loaded — not confirmed
          engagement, which X will not report. "Took the link" is the only hard number here, because it's measured on our own domain.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Live campaigns</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.live_campaigns}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.ending_this_month} ending this month</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Shares this month</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.shares_this_month}</div>
          {sharesDelta !== null && (
            <div className="text-xs mt-1" style={{ color: sharesDelta >= 0 ? "#16A34A" : "#DC2626" }}>
              {sharesDelta >= 0 ? "+" : ""}{sharesDelta}% on last month
            </div>
          )}
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">People reached</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.people_reached.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">link clicks, all campaigns</div>
        </div>
        <div className="p-5 bg-white border border-gray-200 rounded-xl">
          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1">Active sharers</div>
          <div className="text-3xl font-black text-gray-900 tabular-nums">{stats.active_sharers.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">{stats.total_members > 0 ? Math.round((100 * stats.active_sharers) / stats.total_members) : 0}% of members</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Where reach actually comes from</h3>
          <p className="text-xs text-gray-500 mb-3">Clicks by channel, last 30 days</p>
          {channels.length === 0 ? (
            <div className="text-sm text-gray-400">No clicks in the last 30 days.</div>
          ) : (
            <div className="space-y-2.5">
              {channels.map((c) => (
                <div key={c.platform} className="flex items-center gap-2 text-sm">
                  <span className="w-28 flex-shrink-0 text-gray-700 truncate">{PLATFORM_LABEL[c.platform] ?? c.platform}</span>
                  <span className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <span className="block h-full rounded-full bg-primary-500" style={{ width: `${Math.round((100 * c.clicks) / maxChannel)}%` }} />
                  </span>
                  <span className="w-10 text-right font-semibold text-gray-900 tabular-nums">{c.pct}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-gray-900 mb-1">Handle coverage</h3>
          <p className="text-xs text-gray-500 mb-3">Where members say their reach is</p>
          {handles && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">X handle on file — {handles.x_on_file} · {handles.x_verified} verified</span>
                </div>
                <span className="block h-2 bg-gray-100 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${handleTotal > 0 ? Math.round((100 * handles.x_on_file) / handleTotal) : 0}%`, background: "#16A34A" }} />
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Instagram handle on file — {handles.instagram_on_file}</span>
                </div>
                <span className="block h-2 bg-gray-100 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${handleTotal > 0 ? Math.round((100 * handles.instagram_on_file) / handleTotal) : 0}%`, background: "#D9641A" }} />
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Neither — {handles.neither}</span>
                </div>
                <span className="block h-2 bg-gray-100 rounded-full overflow-hidden">
                  <span className="block h-full rounded-full bg-gray-400" style={{ width: `${handleTotal > 0 ? Math.round((100 * handles.neither) / handleTotal) : 0}%` }} />
                </span>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-4">
            <b className="text-gray-900">Instagram can't be verified.</b> Its API for reading a member's own account was discontinued
            in 2024 and never covered personal accounts even before that — Instagram numbers here are self-declared, not confirmed.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Campaign performance</h3>
          <button onClick={exportCsv} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:border-primary-300">
            Export
          </button>
        </div>
        {campaigns.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No campaigns yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Campaign</th>
                  <th className="py-2 px-4 font-bold">Status</th>
                  <th className="py-2 px-4 font-bold text-right">Shares</th>
                  <th className="py-2 px-4 font-bold text-right">Clicks</th>
                  <th className="py-2 px-4 font-bold text-right">Per share</th>
                  <th className="py-2 px-4 font-bold">Top channel</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.campaign_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-gray-900">{c.title}</div>
                      <div className="text-xs text-gray-500">{c.country ?? "Whole wing"}</div>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_PILL[c.status]?.bg, color: STATUS_PILL[c.status]?.fg }}>
                        {STATUS_PILL[c.status]?.label ?? c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.shares}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.clicks}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums">{c.clicks_per_share ?? "—"}</td>
                    <td className="py-2.5 px-4 text-gray-700">{c.top_channel ? (PLATFORM_LABEL[c.top_channel] ?? c.top_channel) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Top amplifiers</h3>
          <p className="text-xs text-gray-500 mt-0.5">By reach driven, all campaigns</p>
        </div>
        {amplifiers.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">Nobody has shared a campaign yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <th className="py-2 px-4 font-bold">Member</th>
                  <th className="py-2 px-4 font-bold">Country</th>
                  <th className="py-2 px-4 font-bold text-right">Reach</th>
                </tr>
              </thead>
              <tbody>
                {amplifiers.map((a) => (
                  <tr key={a.profile_id} className="border-b border-gray-100">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-gray-900">{a.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {a.twitter_id ? `@${a.twitter_id}${a.x_verified ? " · verified" : ""}` : a.instagram_id ? "Instagram only" : "No handle on file"}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-gray-700">{a.country ?? "—"}</td>
                    <td className="py-2.5 px-4 text-right tabular-nums font-semibold">{a.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
          Reach is counted from wing links only. A member's influence and their platform handle status are not the same thing.
        </div>
      </div>

      {showNewCampaign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNewCampaign(false)}>
          <div className="bg-white rounded-xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">New campaign</h3>
              <button onClick={() => setShowNewCampaign(false)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {formMsg && <p className="text-xs text-gray-600 mb-3">{formMsg}</p>}
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2">
                <option value="">All members</option>
                {[...new Set(campaigns.map((c) => c.country).filter((c): c is string => !!c))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={form.target_url} onChange={(e) => setForm({ ...form, target_url: e.target.value })} placeholder="Link to share (https://…)" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <input value={form.hashtags} onChange={(e) => setForm({ ...form, hashtags: e.target.value })} placeholder="#YSRCP #NRIWing" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2" />
              <textarea value={form.share_text} onChange={(e) => setForm({ ...form, share_text: e.target.value })} rows={3} placeholder="The post members will share" className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 resize-none" />
              <button onClick={() => void createCampaign()} disabled={creating || !form.title || !form.share_text || !form.target_url} className="w-full text-sm font-bold px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">
                {creating ? "Publishing…" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
