import { useEffect, useRef, useState } from "react";
import {
  Video,
  Calendar,
  Eye,
  Share2,
  Radio,
  Youtube,
  MessageCircle,
  Facebook,
  Instagram,
  Twitter,
  Send,
  Shield,
  Code,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const CHANNEL_ID = "UCM3lYQQxJZTzQzYO35-_JCw";
const MAX_VIDEOS = 12;
const REFRESH_INTERVAL = 30 * 60 * 1000;

const formatRelativeTime = (publishedAt: string) => {
  const diff = Date.now() - new Date(publishedAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

const SocialIcon = ({ icon: Icon, bg, text, url }: any) => {
  const node = (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} ${text} hover:scale-110 transition`}>
      <Icon size={18} />
    </div>
  );
  return url ? <a href={url} target="_blank" rel="noopener noreferrer">{node}</a> : node;
};

// Drive video carousel: replace the placeholder IDs with your Google Drive file IDs
const DRIVE_VIDEOS: Array<{ id: string; title?: string; thumb?: string }> = [
  { id: 'PUT_FILE_ID_1', title: 'Video 1', thumb: 'https://drive.google.com/drive/folders/16NCReh6abEs-NI5WEgsWGoCts9q3Xjzd?usp=drive_link' },
  { id: 'PUT_FILE_ID_2', title: 'Video 2', thumb: 'https://drive.google.com/drive/folders/1sxDHbUpU_2L3i3O-DIJ9mxbEziP3MkGf?usp=drive_link' },
  { id: 'PUT_FILE_ID_3', title: 'Video 3', thumb: 'https://drive.google.com/drive/folders/1Kel4Ini7mas87K5Wra_Wp6T-2w7m3gbQ?usp=drive_link' },
  { id: 'PUT_FILE_ID_4', title: 'Video 4', thumb: 'https://drive.google.com/drive/folders/16CAnbnJM-LpJo5fRcZpgJDaxZdbC0IwB?usp=drive_link' },
  { id: 'PUT_FILE_ID_5', title: 'Video 5', thumb: '' },
  { id: 'PUT_FILE_ID_6', title: 'Video 6', thumb: '' },
  { id: 'PUT_FILE_ID_7', title: 'Video 7', thumb: '' },
];

function DriveCarousel({ videos = DRIVE_VIDEOS }: { videos?: Array<{ id: string; title?: string; thumb?: string }> }) {
  const [idx, setIdx] = useState(0);

  const goPrev = () => setIdx((i) => (i - 1 + videos.length) % videos.length);
  const goNext = () => setIdx((i) => (i + 1) % videos.length);

  const current = videos[idx];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative bg-black rounded-lg overflow-hidden">
        <div className="aspect-w-16 aspect-h-9">
          <iframe
            title={current?.title || 'Drive Video'}
            src={current?.id && current.id !== 'PUT_FILE_ID_1' ? `https://drive.google.com/file/d/${current.id}/preview` : ''}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
          {!current?.id || current.id.startsWith('PUT_FILE_ID') ? (
            <div className="absolute inset-0 flex items-center justify-center text-white bg-black/60">
              <div className="text-center">
                <div className="text-2xl font-bold">Drive video not configured</div>
                <div className="text-sm mt-2">Replace file IDs in the component with your Drive file IDs.</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Controls */}
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/30 rounded-full p-2">‹</button>
        <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/30 rounded-full p-2">›</button>
      </div>

      {/* Thumbnails */}
      <div className="flex items-center gap-2 mt-3 overflow-x-auto px-2">
        {videos.map((v, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`shrink-0 rounded-md overflow-hidden border ${i === idx ? 'ring-2 ring-ysrcp-blue' : 'border-gray-200'}`}>
            {v.thumb ? (
              <img src={v.thumb} alt={v.title} className="w-36 h-20 object-cover" />
            ) : (
              <div className="w-36 h-20 bg-gray-200 flex items-center justify-center text-sm">No thumb</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

const BottomCards: React.FC = () => {
  // Both cards now route straight to the Jagananna Tech Force portal —
  // it owns the actual ORM / App-Building team applications.
  const TECH_FORCE_URL = "https://jaganannatechforce.org/";
  const goToTechForce = () => {
    window.open(TECH_FORCE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div
          role="button"
          tabIndex={0}
          onClick={goToTechForce}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToTechForce();
            }
          }}
          className="bg-gradient-to-br from-[#004AAD] to-[#00897B] rounded-xl p-4 text-white shadow cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
        >
          <div className="flex justify-between items-center">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield size={20} />
            </div>
            <span className="bg-blue-400 text-ysrcp-green px-2 py-0.5 text-[10px] font-black rounded">
              JOIN
            </span>
          </div>
          <h4 className="mt-3 text-sm font-black text-center">Contribute for ORM</h4>
          <p className="text-[10px] text-blue-100 text-center">Join the Digital Defense Team.</p>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={goToTechForce}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              goToTechForce();
            }
          }}
          className="bg-gradient-to-br from-[#004AAD] to-[#00897B] rounded-xl p-4 text-white shadow cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition"
        >
          <div className="flex justify-between items-center">
            <div className="bg-green-900/30 p-2 rounded-lg">
              <Code size={20} />
            </div>
            <span className="bg-blue-400 text-ysrcp-green px-2 py-0.5 text-[10px] font-black rounded">
              JOIN
            </span>
          </div>
          <h4 className="mt-3 text-sm font-black text-center">App Building Team</h4>
          <p className="text-[10px] text-green-100 text-center">Tech volunteers needed.</p>
        </div>
      </div>
    </div>
  );
};

export default function PressMeetsAndSocial() {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Videos shown on the home page are now admin-curated via the
    // "Featured Videos" admin tab — no runtime YouTube Data API call.
    // We read straight from public.youtube_videos, ordered by the
    // sort_order the admin chose, and only show is_active rows.
    const fetchVideos = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("youtube_videos")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("published_at", { ascending: false })
          .limit(MAX_VIDEOS);

        if (error) throw error;

        // Some stored thumbnail URLs use the legacy `img.youtube.com` host,
        // which our CSP blocks (img-src only allows *.ytimg.com). Rewrite
        // the host on read so old rows render without re-saving them.
        const fixThumb = (u: string | null | undefined, id: string | null) => {
          const fixed = (u || "").replace(
            /^https?:\/\/img\.youtube\.com\//,
            "https://i.ytimg.com/"
          );
          if (fixed) return fixed;
          return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
        };

        const videoData = (data || []).map((v: any) => ({
          title: v.title || "Untitled",
          url:
            v.video_url ||
            (v.video_id ? `https://www.youtube.com/watch?v=${v.video_id}` : ""),
          image: fixThumb(v.thumbnail_url, v.video_id),
          time: v.published_at ? formatRelativeTime(v.published_at) : "",
          views: "—",
          isLive: false,
        }));
        setVideos(videoData);
      } catch {
        setVideos([]);
      }
      setLoading(false);
    };

    fetchVideos();

    // Realtime: refresh whenever an admin adds, removes, or reorders a
    // video so the home page stays in sync without a manual refresh.
    const channel = supabase
      .channel("featured-videos-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "youtube_videos" },
        fetchVideos
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Don't start scrolling until videos are loaded (scrollWidth would be 0 otherwise)
    if (!videos.length) return;

    let rafId1 = 0, rafId2 = 0;

    const scroll = (ref: any): number => {
      let x = 0, d = 1;
      let currentRaf = 0;
      const step = () => {
        const el = ref.current;
        if (el && !paused.current) {
          const max = el.scrollWidth - el.clientWidth;
          if (max > 0) {
            x += 0.6 * d;
            if (x <= 0) { x = 0; d = 1; }
            else if (x >= max) { x = max; d = -1; }
            el.scrollLeft = x;
          }
        }
        currentRaf = requestAnimationFrame(step);
      };
      currentRaf = requestAnimationFrame(step);
      return currentRaf;
    };

    rafId1 = scroll(row1Ref);
    rafId2 = scroll(row2Ref);

    return () => {
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
    };
  }, [videos.length]);

  const Card = (v: any, i: number) => (
    <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
       className="bg-white/10 rounded-xl w-[220px] sm:w-[260px] shrink-0 overflow-hidden hover:bg-white/15 transition">
      <div className="relative h-[125px] sm:h-[150px] bg-gray-800">
        {v.image ? (
          <img
            src={v.image}
            alt={v.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-xs">
            No thumbnail
          </div>
        )}
        {v.isLive && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded flex gap-1">
            <Radio size={12} /> LIVE
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex gap-1">
          <Youtube size={12} /> YSRCP
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-white font-bold text-sm line-clamp-2">{v.title}</h3>
        <div className="flex gap-3 text-xs text-blue-200 mt-2">
          <span className="flex gap-1"><Calendar size={12} /> {v.time}</span>
          <span className="flex gap-1"><Eye size={12} /> {v.views}</span>
        </div>
      </div>
    </a>
  );

  return (
    <div className="flex flex-col lg:flex-row w-full bg-white">
      <div className="lg:w-[65%] bg-gradient-to-br from-[#0055a5] to-[#003366] p-4 sm:p-6">
        <h2 className="text-white font-black text-lg sm:text-xl text-center mb-4 sm:mb-6 flex justify-center items-center gap-2">
          <Video size={20} /> Jagan Anna On Air
        </h2>

        {/* If DRIVE_VIDEOS are configured (replace placeholder IDs), show Drive carousel */}
        {DRIVE_VIDEOS[0].id && !DRIVE_VIDEOS[0].id.startsWith('PUT_FILE_ID') ? (
          <div className="mb-6">
            <DriveCarousel videos={DRIVE_VIDEOS} />
          </div>
        ) : null}

        {loading && !videos.length && (
          <div className="text-white text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading videos...</p>
            </div>
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="text-white text-center py-12">
            <div className="mb-4">
              <Video size={48} className="mx-auto opacity-50 mb-4" />
            </div>
            <p className="text-lg font-semibold">Videos coming soon</p>
            <p className="text-sm text-blue-200 mt-2">Subscribe to our YouTube channel for the latest updates</p>
            <a 
              href="https://www.youtube.com/@YSJaganMohanReddy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold transition"
            >
              Visit YouTube Channel
            </a>
          </div>
        )}

        <div ref={row1Ref} onMouseEnter={() => paused.current = true} onMouseLeave={() => paused.current = false}
             className="flex gap-3 sm:gap-4 overflow-x-auto mb-4 sm:mb-6 scrollbar-none scroll-smooth">
          {videos.slice(0, 6).map(Card)}
        </div>

        <div ref={row2Ref} onMouseEnter={() => paused.current = true} onMouseLeave={() => paused.current = false}
             className="flex gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth">
          {videos.slice(6, 12).map(Card)}
        </div>
      </div>

      <div className="lg:w-[35%] bg-gray-50 p-4 sm:p-6">
        <h2 className="font-black text-center mb-4 flex justify-center items-center gap-2 text-lg sm:text-xl">
          <Share2 size={20} /> Digital Channels
        </h2>

        {/* SOCIAL CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {[
            {
              title: "Jagan Anna",
              desc: "Official Leader Handles",
              colors: [
                { icon: Facebook, bg: "bg-blue-100", text: "text-primary-700", url: "https://www.facebook.com/ysjagan/" },
                { icon: Twitter, bg: "bg-sky-100", text: "text-sky-600", url: "https://x.com/ysjagan/" },
                { icon: Instagram, bg: "bg-pink-100", text: "text-pink-600", url: "https://www.instagram.com/ysjagan/" },
                { icon: MessageCircle, bg: "bg-green-100", text: "text-green-600", url: "https://whatsapp.com/channel/0029Va4JGNi42DccmaxNjf0q" },
                { icon: Send, bg: "bg-cyan-100", text: "text-cyan-600", url: "https://t.me/s/JaganSpeaks?q=%23YSJagan&before=4121" },
              ],
            },
            {
              title: "YSRCP Party",
              desc: "Official Party Updates",
              colors: [
                { icon: Facebook, bg: "bg-blue-100", text: "text-primary-700", url: "https://www.instagram.com/ysrcongress/?hl=en" },
                { icon: Twitter, bg: "bg-sky-100", text: "text-sky-600", url: "https://x.com/YSRCParty" },
                { icon: Instagram, bg: "bg-pink-100", text: "text-pink-600", url: "https://www.instagram.com/ysrcongress/?hl=en" },
                { icon: MessageCircle, bg: "bg-green-100", text: "text-green-600", url: "https://whatsapp.com/channel/0029Va4JGNi42DccmaxNjf0q" },
                { icon: Send, bg: "bg-cyan-100", text: "text-cyan-600", url: "https://www.ysrcongress.com/" },
              ],
            },
          ].map((c, idx) => (
            <div
              key={idx}
              className="bg-white p-4 sm:p-5 border-l-[5px] sm:border-l-[6px] border-ysrcp-blue rounded-r-xl shadow flex flex-col justify-between"
            >
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-black">{c.title}</h3>
                <p className="text-[10px] sm:text-xs text-gray-500 uppercase">{c.desc}</p>
              </div>
              <div className="flex justify-center gap-3 sm:gap-4 mt-3 sm:mt-4">
                {c.colors.map((ic, i) => (
                  <SocialIcon key={i} icon={ic.icon} bg={ic.bg} text={ic.text} url={(ic as any).url} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <BottomCards />
      </div>
    </div>
  );
}
