import { useEffect, useState } from "react";
import { MessageCircle, Phone, MapPin, Landmark, Users } from "lucide-react";
import { supabase } from "../lib/supabase";

/**
 * Local Connect — the leaders of the member's OWN home constituency.
 *
 * A member in Frankfurt whose family is in Nandyal gets Nandyal's
 * assembly coordinator, Nandyal district's president, and the state
 * leadership. Contact details come from my_local_connect(), which is
 * SECURITY DEFINER and scoped to auth.uid() — the client cannot ask for
 * anyone else's constituency.
 *
 * WHY WHATSAPP AND NOT A PHONE LINK FIRST
 *   Every one of the 305 leaders has a WhatsApp number; the audience is
 *   abroad, where an India call is expensive and a message is not.
 *   Calling stays available as the secondary action.
 */

type Leader = {
  tier: "constituency" | "district" | "state";
  role: string;
  leader_name: string;
  whatsapp: string | null;
  whatsapp_alt: string | null;
  photo_url: string | null;
  place: string | null;
};

const TIERS = [
  {
    key: "constituency" as const,
    label: "Your constituency",
    blurb: "The coordinator for your own assembly segment.",
    Icon: MapPin,
  },
  {
    key: "district" as const,
    label: "Your district",
    blurb: "District leadership for the area your constituency sits in.",
    Icon: Landmark,
  },
  {
    key: "state" as const,
    label: "State leadership",
    blurb: "Party leadership for Andhra Pradesh.",
    Icon: Users,
  },
];

/** Two letters, skipping the honorifics that prefix most leader names. */
function initials(name: string): string {
  const skip = /^(sri|smt|dr|kum|shri|mr|mrs|ms)\.?$/i;
  const parts = name
    .replace(/[(),]/g, " ")
    .split(/\s+/)
    .filter((p) => p && !skip.test(p));
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Digits only, defaulting to +91 — leader numbers are Indian. */
function waLink(number: string, name: string): string {
  const digits = number.replace(/\D/g, "");
  const withCc = digits.length === 10 ? `91${digits}` : digits;
  const text = encodeURIComponent(
    `Namaskaram ${name} garu, I am a YSRCP NRI Wing member writing from abroad.`
  );
  return `https://wa.me/${withCc}?text=${text}`;
}

function LeaderCard({ leader }: { leader: Leader }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPhoto = leader.photo_url && !imgFailed;

  return (
    <div
      className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl
                 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      {showPhoto ? (
        <img
          src={leader.photo_url as string}
          alt=""
          onError={() => setImgFailed(true)}
          className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-primary-100"
        />
      ) : (
        /* Blue→green gradient is the identity mark across the product;
           flat green would read as an outcome badge instead. */
        <div
          className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center
                     bg-gradient-to-br from-primary-500 to-accent-500
                     text-white font-black text-lg tracking-tight"
          aria-hidden="true"
        >
          {initials(leader.leader_name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-bold text-gray-900 leading-snug truncate">
          {leader.leader_name}
        </p>
        <p className="text-sm text-gray-600 truncate">{leader.role}</p>
        {leader.place && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{leader.place}</p>
        )}
      </div>

      {leader.whatsapp && (
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`tel:${leader.whatsapp}`}
            aria-label={`Call ${leader.leader_name}`}
            className="w-10 h-10 rounded-lg border border-gray-200 text-gray-500
                       flex items-center justify-center hover:border-primary-300
                       hover:text-primary-600 transition-colors"
          >
            <Phone size={17} />
          </a>
          <a
            href={waLink(leader.whatsapp, leader.leader_name)}
            target="_blank"
            rel="noopener noreferrer"
            className="h-10 px-4 rounded-lg bg-primary-600 text-white text-sm font-bold
                       flex items-center gap-2 hover:bg-primary-700 transition-colors"
          >
            <MessageCircle size={16} />
            <span className="hidden sm:inline">Message</span>
          </a>
        </div>
      )}
    </div>
  );
}

export default function LocalConnect() {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("my_local_connect");
      if (error) {
        setFailed(true);
      } else {
        setLeaders((data as Leader[]) ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
        We couldn’t load your local leaders just now. Please refresh the page.
      </div>
    );
  }

  const hasHome = leaders.some((l) => l.tier === "constituency");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-gray-900">Local Connect</h2>
        <p className="text-sm text-gray-600 mt-1">
          The party leaders for your home constituency in Andhra Pradesh.
        </p>
      </div>

      {/* Honest empty state. A member who has not set a constituency is
          not shown a spinner or an invented leader — they are told what
          to do, and the state tier below still gives them something. */}
      {!hasHome && (
        <div className="p-5 bg-primary-50 border border-primary-100 rounded-xl">
          <p className="text-sm font-bold text-primary-900">
            Add your home constituency
          </p>
          <p className="text-sm text-primary-800/80 mt-1">
            Once we know which assembly segment your family is from, we can show
            you your coordinator and district president.
          </p>
          <a
            href="/dashboard?tab=profile"
            className="inline-flex mt-3 h-10 px-4 items-center rounded-lg bg-primary-600
                       text-white text-sm font-bold hover:bg-primary-700 transition-colors"
          >
            Update my profile
          </a>
        </div>
      )}

      {TIERS.map(({ key, label, blurb, Icon }) => {
        const group = leaders.filter((l) => l.tier === key);
        if (group.length === 0) return null;
        return (
          <section key={key}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className="text-primary-600" />
              <h3 className="font-bold text-gray-900">{label}</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">{blurb}</p>
            <div className="space-y-3">
              {group.map((l, i) => (
                <LeaderCard key={`${l.role}-${l.leader_name}-${i}`} leader={l} />
              ))}
            </div>
          </section>
        );
      })}

      {/* A constituency with no coordinator on record: say so plainly
          rather than rendering an empty section. 5 of 175 are in this
          state (migration 20260804170000). */}
      {hasHome && !leaders.some((l) => l.tier === "district") && (
        <p className="text-sm text-gray-500">
          No district president is listed for your district yet.
        </p>
      )}
    </div>
  );
}
