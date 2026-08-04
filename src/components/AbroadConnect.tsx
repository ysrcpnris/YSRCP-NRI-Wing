import { useEffect, useState } from "react";
import { Users, ExternalLink, Globe } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Abroad Connect — the member's chapter handles and groups, plus the
 * party's national accounts.
 *
 * The visibility rule is enforced by my_social_handles(): a member sees
 * their OWN chapter and everything national, never another country's.
 * Someone in Frankfurt has no use for the Dallas WhatsApp group, and
 * showing it would bury the one that matters.
 *
 * WHATSAPP MEMBER COUNTS ARE ALWAYS SHOWN WITH A DATE
 *   WhatsApp exposes no group-size API. The number is whatever an
 *   organiser last typed in, so it is rendered as "≈240 · as of 12 Jul"
 *   rather than as a live figure. A stale number that looks live is
 *   worse than no number.
 */

type Handle = {
  scope: "national" | "chapter";
  platform: "x" | "facebook" | "instagram" | "youtube" | "whatsapp" | "telegram" | "website";
  label: string;
  url: string;
  handle: string | null;
  chapter: string | null;
  member_count: number | null;
  count_as_of: string | null;
  description: string | null;
};

/* Brand colours, used at low opacity for the tile background and full
   strength for the glyph — the earlier all-brand-colour tiles read as
   too dark and dominating. */
const PLATFORM: Record<
  Handle["platform"],
  { name: string; tint: string; fg: string; glyph: JSX.Element }
> = {
  x: {
    name: "X",
    tint: "bg-gray-100",
    fg: "text-gray-900",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.9 2H22l-7.3 8.3L23 22h-6.6l-5.2-6.8L5.2 22H2l7.8-8.9L1.4 2H8l4.7 6.2L18.9 2Zm-1.2 18h1.8L6.4 3.8H4.5L17.7 20Z" />
      </svg>
    ),
  },
  facebook: {
    name: "Facebook",
    tint: "bg-blue-50",
    fg: "text-[#1877F2]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
      </svg>
    ),
  },
  instagram: {
    name: "Instagram",
    tint: "bg-pink-50",
    fg: "text-[#C13584]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2A6.6 6.6 0 1 0 18.6 12 6.6 6.6 0 0 0 12 5.4Zm0 10.9A4.3 4.3 0 1 1 16.3 12 4.3 4.3 0 0 1 12 16.3Zm6.9-11.1a1.5 1.5 0 1 1-1.5-1.5 1.5 1.5 0 0 1 1.5 1.5Z" />
      </svg>
    ),
  },
  youtube: {
    name: "YouTube",
    tint: "bg-red-50",
    fg: "text-[#FF0000]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23 12s0-3.2-.4-4.8a2.5 2.5 0 0 0-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.8.4a2.5 2.5 0 0 0-1.8 1.8C1 8.8 1 12 1 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C4.8 19 12 19 12 19s7.2 0 8.8-.4a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12ZM9.8 15.3V8.7l6 3.3Z" />
      </svg>
    ),
  },
  whatsapp: {
    name: "WhatsApp",
    tint: "bg-emerald-50",
    fg: "text-[#25D366]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1a8.2 8.2 0 0 1-4-3.5c-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5s-.7-1.6-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.7.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.5-.3ZM12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm0 18.3a8.3 8.3 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3Z" />
      </svg>
    ),
  },
  telegram: {
    name: "Telegram",
    tint: "bg-sky-50",
    fg: "text-[#229ED9]",
    glyph: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 6.9-1.6 7.4c-.1.5-.4.7-.9.4l-2.4-1.8-1.2 1.1c-.1.1-.2.2-.5.2l.2-2.5 4.5-4c.2-.2 0-.3-.3-.1l-5.5 3.5-2.4-.8c-.5-.2-.5-.5.1-.8l9.4-3.6c.4-.2.8.1.6.9Z" />
      </svg>
    ),
  },
  website: {
    name: "Website",
    tint: "bg-primary-50",
    fg: "text-primary-600",
    glyph: <Globe className="w-5 h-5" />,
  },
};

function HandleCard({ h }: { h: Handle }) {
  const meta = PLATFORM[h.platform];
  const isGroup = h.platform === "whatsapp" || h.platform === "telegram";

  return (
    <a
      href={h.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 p-4 bg-white border border-gray-200
                 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div
        className={`w-12 h-12 shrink-0 rounded-xl ${meta.tint} ${meta.fg}
                    flex items-center justify-center`}
      >
        {meta.glyph}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900 text-sm truncate">{h.label}</p>
        <p className="text-xs text-gray-500 truncate">
          {h.handle ? h.handle : h.description || meta.name}
        </p>
        {/* Never a bare number: WhatsApp cannot tell us the real size, so
            the date it was last checked travels with it. */}
        {isGroup && h.member_count != null && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Users size={11} />
            <span className="tabular-nums">≈{h.member_count}</span>
            {h.count_as_of && (
              <span>
                · as of{" "}
                {new Date(h.count_as_of).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
          </p>
        )}
      </div>

      <ExternalLink
        size={15}
        className="shrink-0 text-gray-300 group-hover:text-primary-500 transition-colors"
      />
    </a>
  );
}

export default function AbroadConnect() {
  const [handles, setHandles] = useState<Handle[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("my_social_handles");
      if (error) {
        console.error("my_social_handles failed:", error);
        setFailed(true);
      } else {
        setHandles((data as Handle[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        We couldn’t load the community links just now. Please refresh the page.
      </div>
    );
  }

  const chapter = handles.filter((h) => h.scope === "chapter");
  const national = handles.filter((h) => h.scope === "national");
  const chapterName = chapter[0]?.chapter;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Abroad Connect</h2>
        <p className="text-sm text-gray-600 mt-1">
          Your chapter’s groups, and the party’s official channels.
        </p>
      </div>

      <section>
        <h3 className="font-bold text-gray-900 mb-1">
          {chapterName ? `${chapterName} chapter` : "Your chapter"}
        </h3>
        {chapter.length === 0 ? (
          /* Honest empty state — a member in a city with no chapter yet
             is told so, rather than shown another country's groups. */
          <div className="p-5 bg-primary-50 border border-primary-100 rounded-xl">
            <p className="text-sm font-bold text-primary-900">
              No chapter for your city yet
            </p>
            <p className="text-sm text-primary-800/80 mt-1">
              We haven’t set up a chapter where you live. The party’s national
              channels below are open to every member.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Groups and accounts for members near you.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chapter.map((h) => (
                <HandleCard key={`${h.platform}-${h.label}`} h={h} />
              ))}
            </div>
          </>
        )}
      </section>

      {national.length > 0 && (
        <section>
          <h3 className="font-bold text-gray-900 mb-1">Party channels</h3>
          <p className="text-sm text-gray-500 mb-4">
            Official YSR Congress Party accounts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {national.map((h) => (
              <HandleCard key={`${h.platform}-${h.label}`} h={h} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
