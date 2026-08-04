import { useCallback, useEffect, useState } from "react";
import { Megaphone, Copy, Check, Eye, Share2 } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Digital Army — campaigns members can amplify.
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT
 *   It counts links we generated being clicked. It does not know, and
 *   deliberately cannot know, whether a member liked or reposted
 *   anything on X, Facebook or Instagram:
 *     · X's developer terms forbid deriving political affiliation from
 *       platform data — which is precisely what "who liked the party's
 *       post" would be.
 *     · Instagram's Basic Display API was withdrawn in December 2024.
 *     · Around 700 members are in the EU, where political opinion is an
 *       Article 9 special category.
 *
 *   So sharing happens through intent URLs: we hand the member a
 *   pre-written post and open the platform's own composer. What they do
 *   there is between them and the platform. We count the clicks on our
 *   own link, which is our property to measure.
 *
 * A share is recorded when the member opens the composer — intent, not
 * proof of posting. The numbers are labelled accordingly: "opened to
 * share", never "posts".
 */

type Campaign = {
  id: string;
  title: string;
  brief: string | null;
  share_text: string;
  target_url: string;
  hashtags: string | null;
  image_url: string | null;
  platforms: string[];
  ends_at: string | null;
  my_shares: number;
  my_clicks: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  link: "Copy link",
};

/** Composer URLs. Each opens the platform's own share sheet — we never
 *  post on a member's behalf and hold no platform credentials. */
function intentUrl(platform: string, text: string, url: string): string | null {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(url);
  switch (platform) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
    default:
      // Instagram has no web composer that accepts pre-filled text, so
      // those fall through to copy-and-paste rather than a broken link.
      return null;
  }
}

export default function DigitalArmy() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_campaigns");
    if (error) console.error("my_campaigns failed:", error);
    setCampaigns((data as Campaign[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Records the share, then opens the composer with the member's own
   * tracked link.
   *
   * The window is opened BEFORE the await in the popup-blocker case
   * would matter — browsers only allow window.open synchronously from a
   * click. So we open a blank tab first and set its location once the
   * RPC returns; otherwise the composer silently never appears.
   */
  const share = useCallback(
    async (c: Campaign, platform: string) => {
      const key = `${c.id}-${platform}`;
      setBusy(key);

      const tab =
        platform === "link" ? null : window.open("", "_blank", "noopener");

      const { data, error } = await supabase.rpc("record_share", {
        p_campaign_id: c.id,
        p_platform: platform,
      });
      setBusy(null);

      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row?.share_id) {
        tab?.close();
        console.error("record_share failed:", error);
        return;
      }

      // Built from this origin, not baked into the database — otherwise
      // staging would hand out links pointing at production.
      const trackedUrl = `${window.location.origin}/c/${row.share_id}`;
      const text = [c.share_text, c.hashtags].filter(Boolean).join(" ");

      if (platform === "link") {
        await navigator.clipboard.writeText(`${text} ${trackedUrl}`);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
      } else {
        const target = intentUrl(platform, text, trackedUrl);
        if (tab && target) tab.location.href = target;
        else tab?.close();
      }

      load();
    },
    [load]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">Digital Army</h2>
        <p className="text-sm text-gray-600 mt-1">
          Campaigns you can amplify. Every link is yours, so you can see how
          far it travels.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <div className="p-8 bg-gray-50 border border-gray-200 rounded-xl text-center">
          <Megaphone size={22} className="mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-gray-900">No campaigns right now</p>
          <p className="text-sm text-gray-600 mt-1">
            When there’s something to share, it’ll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <div className="p-5">
                <p className="font-bold text-gray-900">{c.title}</p>
                {c.brief && (
                  <p className="text-sm text-gray-600 mt-1">{c.brief}</p>
                )}

                {/* The pre-written post, shown as what it is. Members
                    should not have to compose party messaging. */}
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-800">{c.share_text}</p>
                  {c.hashtags && (
                    <p className="text-sm text-primary-700 font-semibold mt-1">
                      {c.hashtags}
                    </p>
                  )}
                </div>

                {(c.my_shares > 0 || c.my_clicks > 0) && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Share2 size={12} />
                      <span className="tabular-nums">{c.my_shares}</span>
                      {/* Opening the composer is intent, not proof of
                          posting — the wording says so. */}
                      opened to share
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} />
                      <span className="tabular-nums">{c.my_clicks}</span>
                      {c.my_clicks === 1 ? "click" : "clicks"} on your link
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
                {c.platforms.map((p) => {
                  const key = `${c.id}-${p}`;
                  return (
                    <button
                      key={p}
                      onClick={() => share(c, p)}
                      disabled={busy === key}
                      className="h-9 px-4 rounded-lg bg-primary-600 text-white text-sm
                                 font-bold hover:bg-primary-700 disabled:opacity-50
                                 transition-colors"
                    >
                      {busy === key ? "…" : `Share on ${PLATFORM_LABEL[p] ?? p}`}
                    </button>
                  );
                })}
                <button
                  onClick={() => share(c, "link")}
                  disabled={busy === `${c.id}-link`}
                  className="h-9 px-4 rounded-lg border border-gray-300 text-sm font-bold
                             text-gray-700 hover:border-primary-300 inline-flex
                             items-center gap-2 disabled:opacity-50"
                >
                  {copied === `${c.id}-link` ? (
                    <>
                      <Check size={14} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        We count clicks on the links we give you. We don’t track your social
        accounts, and we can’t see what you like or repost.
      </p>
    </div>
  );
}
