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
  ArrowUpRight,
} from "lucide-react";

const CHANNEL_ID = "UCxGLOR0FC_Ix8_gFLaGSsGg";
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

const BottomCards: React.FC = () => {
  const [openModal, setOpenModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; description: string }>({ title: "", description: "" });

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
          <h4 className="mt-3 text-sm font-black">Contribute for ORM</h4>
          <p className="text-[10px] text-blue-100">Join the Digital Defense Team.</p>
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
          <h4 className="mt-3 text-sm font-black">App Building Team</h4>
          <p className="text-[10px] text-green-100">Tech volunteers needed.</p>
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

            {/* Coming Soon Section */}
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="text-6xl animate-bounce">🚀</div>
              <span className="text-lg sm:text-xl font-semibold text-gray-500 tracking-wide">
                Coming Soon
              </span>
              <button
                className="mt-4 bg-gradient-to-r from-gray-400 to-gray-500 text-white px-8 py-3 rounded-full font-bold cursor-not-allowed shadow-md"
                disabled
              >
                Stay Tuned ✨
              </button>
            </div>
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

  useEffect(() => {
    const fetchVideos = async () => {
      const key = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!key) return;

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=${MAX_VIDEOS}&type=video&key=${key}`
      );

      const json = await res.json();
      if (!json.items) return;

      setVideos(
        json.items.map((v: any) => ({
          title: v.snippet.title,
          url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
          image: v.snippet.thumbnails.medium.url,
          time: formatRelativeTime(v.snippet.publishedAt),
          views: "—",
          isLive: v.snippet.liveBroadcastContent === "live",
        }))
      );
    };

    fetchVideos();
    const i = setInterval(fetchVideos, REFRESH_INTERVAL);
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
      <div className="relative h-[150px]">
        <img src={v.image} className="w-full h-full object-cover" />
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
