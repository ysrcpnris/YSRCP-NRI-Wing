import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  ArrowUpRight,
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
  const [openModal, setOpenModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; description: string }>({ title: "", description: "" });
  const navigate = useNavigate();

  const handleCardClick = (title: string, description: string) => {
    setModalContent({ title, description });
    setOpenModal(true);
  };

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div
          className="bg-gradient-to-br from-[#004AAD] to-[#00897B] rounded-xl p-4 text-white shadow cursor-pointer"
          onClick={() =>
            handleCardClick("Contribute for ORM", "Join the Digital Defense Team and help manage digital outreach, monitor social platforms, and support online campaigns.")
          }
        >
          <div className="flex justify-between">
            <div className="bg-white/20 p-2 rounded-lg">
              <Shield size={20} />
            </div>
            <ArrowUpRight size={16} />
          </div>
          <h4 className="mt-3 text-sm font-black text-center">Contribute for ORM</h4>
          <p className="text-[10px] text-blue-100 text-center">Join the Digital Defense Team.</p>
        </div>

        <div
          className="bg-gradient-to-br from-[#004AAD] to-[#00897B] rounded-xl p-4 text-white shadow cursor-pointer"
          onClick={() =>
            handleCardClick("App Building Team", "Tech volunteers needed to develop apps, automate workflows, and enhance user engagement.")
          }
        >
          <div className="flex justify-between items-center">
            <div className="bg-green-900/30 p-2 rounded-lg">
              <Code size={20} />
            </div>
            <span className="bg-blue-400 text-ysrcp-green px-2 py-0.5 text-[10px] font-black rounded">
              APPLY
            </span>
          </div>
          <h4 className="mt-3 text-sm font-black text-center">App Building Team</h4>
          <p className="text-[10px] text-green-100 text-center">Tech volunteers needed.</p>
        </div>
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl relative animate-fadeIn">
            {/* Close Button */}
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-3xl font-bold transition"
              onClick={() => setOpenModal(false)}
              aria-label="Close"
            >
              ×
            </button>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-3 text-gray-900 text-center">
              {modalContent.title}
            </h2>

            {/* Description */}
            <p className="text-sm sm:text-md text-gray-600 mb-8 text-center max-w-2xl mx-auto">
              {modalContent.description}
            </p>

            {/* Coming Soon / Action Section */}
            {modalContent.title === "Contribute for ORM" ? (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-6xl animate-bounce">🚀</div>
                <span className="text-lg sm:text-xl font-semibold text-gray-500 tracking-wide">Join the team</span>
                <button
                  onClick={() => {
                    setOpenModal(false);
                    navigate('/register');
                  }}
                  className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-green-500"
                >
                  Register Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="text-6xl animate-bounce">🚀</div>
                <span className="text-lg sm:text-xl font-semibold text-gray-500 tracking-wide">Join the App Building Team</span>
                <button
                  onClick={() => {
                    setOpenModal(false);
                    navigate('/register');
                  }}
                  className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-green-500"
                >
                  Register Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
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
    const fetchVideos = async () => {
      setLoading(true);
      const key = import.meta.env.VITE_YOUTUBE_API_KEY;
      
      // Try YouTube API first
      if (key) {
        try {
          // Search for the official YS Jagan Mohan Reddy channel
          const channelRes = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=YS%20Jagan%20Mohan%20Reddy%20Official&type=channel&maxResults=1&key=${key}`
          );

          const channelJson = await channelRes.json();
          
          if (channelJson.error) {
            throw new Error(channelJson.error.message || "Channel API Error");
          }
          
          if (!channelJson.items || channelJson.items.length === 0) {
            throw new Error("Official channel not found");
          }

          const foundChannelId = channelJson.items[0].id.channelId;
          
          // Now fetch videos from this channel
          const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${foundChannelId}&order=date&maxResults=${MAX_VIDEOS}&type=video&key=${key}`
          );

          const json = await res.json();
          
          if (json.error) {
            throw new Error(json.error.message || "Video API Error");
          }
          
          if (!json.items || json.items.length === 0) {
            throw new Error("No items in response");
          }

          const videoData = json.items.map((v: any) => ({
            title: v.snippet?.title || 'Untitled',
            url: `https://www.youtube.com/watch?v=${v.id?.videoId || ''}`,
            image: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.default?.url || '',
            time: formatRelativeTime(v.snippet?.publishedAt || new Date().toISOString()),
            views: "—",
            isLive: v.snippet?.liveBroadcastContent === "live",
          }));

          setVideos(videoData);
          setLoading(false);
          return;
        } catch (error) {
          // YouTube API failed, will use Supabase fallback
        }
      }

      // Fallback: Fetch from Supabase
      try {
        const { data, error } = await supabase
          .from('youtube_videos')
          .select('*')
          .order('published_at', { ascending: false })
          .limit(MAX_VIDEOS);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const videoData = data.map((v: any) => ({
            title: v.title,
            url: v.video_url,
            image: v.thumbnail_url || v.thumbnail || "",
            time: formatRelativeTime(v.published_at),
            views: "—",
            isLive: false,
          }));
          setVideos(videoData);
        }
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchVideos();
    // Increase refresh interval to 1 hour to avoid quota issues
    const i = setInterval(fetchVideos, 60 * 60 * 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const scroll = (ref: any) => {
      let x = 0, d = 1;
      const step = () => {
        if (ref.current && !paused.current) {
          x += 0.4 * d;
          if (x <= 0 || x >= ref.current.scrollWidth - ref.current.clientWidth) d *= -1;
          ref.current.scrollLeft = x;
        }
        requestAnimationFrame(step);
      };
      step();
    };
    scroll(row1Ref);
    scroll(row2Ref);
  }, []);

  const Card = (v: any, i: number) => (
    <a key={i} href={v.url} target="_blank" rel="noopener noreferrer"
       className="bg-white/10 rounded-xl w-[260px] shrink-0 overflow-hidden">
      <div className="relative h-[150px] bg-gray-800">
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
      <div className="lg:w-[65%] bg-gradient-to-br from-[#0055a5] to-[#003366] p-6">
        <h2 className="text-white font-black text-xl text-center mb-6 flex justify-center gap-2">
          <Video /> Jagan Anna On Air
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
             className="flex gap-4 overflow-x-auto mb-6">
          {videos.slice(0, 6).map(Card)}
        </div>

        <div ref={row2Ref} onMouseEnter={() => paused.current = true} onMouseLeave={() => paused.current = false}
             className="flex gap-4 overflow-x-auto">
          {videos.slice(6, 12).map(Card)}
        </div>
      </div>

      <div className="lg:w-[35%] bg-gray-50 p-6">
        <h2 className="font-black text-center mb-4 flex justify-center gap-2">
          <Share2 /> Digital Channels
        </h2>

        {/* SOCIAL CARDS */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {[
            {
              title: "Jagan Anna",
              desc: "Official Leader Handles",
              colors: [
                { icon: Facebook, bg: "bg-blue-100", text: "text-blue-700", url: "https://www.facebook.com/ysjagan/" },
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
                { icon: Facebook, bg: "bg-blue-100", text: "text-blue-700", url: "https://www.instagram.com/ysrcongress/?hl=en" },
                { icon: Twitter, bg: "bg-sky-100", text: "text-sky-600", url: "https://x.com/YSRCParty" },
                { icon: Instagram, bg: "bg-pink-100", text: "text-pink-600", url: "https://www.instagram.com/ysrcongress/?hl=en" },
                { icon: MessageCircle, bg: "bg-green-100", text: "text-green-600", url: "https://whatsapp.com/channel/0029Va4JGNi42DccmaxNjf0q" },
                { icon: Send, bg: "bg-cyan-100", text: "text-cyan-600", url: "https://www.ysrcongress.com/" },
              ],
            },
            {
              title: "NRI Community",
              desc: "Direct Connect",
              colors: [
                { icon: Facebook, bg: "bg-blue-50", text: "text-blue-600" },
                { icon: Twitter, bg: "bg-sky-50", text: "text-sky-600" },
                { icon: Instagram, bg: "bg-pink-50", text: "text-pink-600" },
                { icon: MessageCircle, bg: "bg-green-50", text: "text-green-600" },
                { icon: Send, bg: "bg-cyan-50", text: "text-cyan-600" },
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
