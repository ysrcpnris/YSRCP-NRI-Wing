import React, { useState, useRef, useEffect } from "react";
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

// Video data
const ALL_VIDEOS = [
  { title: 'Analysis on YS Jagan Hyderabad Tour & Future Plans', url: 'https://www.youtube.com/watch?v=yO6KKcmShCU', views: '12K', time: '2h ago' },
  { title: 'Powerful Speech at YSRCP Formation Day Celebrations', url: 'https://www.youtube.com/watch?v=yUhWgtzhd7w', views: '45K', time: '5h ago' },
  { title: 'Sensational Press Meet: Addressing Key State Issues', url: 'https://www.youtube.com/watch?v=mdCCuomaBc4', views: '89K', time: '1d ago' },
  { title: 'YS Jagan Mohan Reddy Speech At Narsipatnam Public Meeting', url: 'https://www.youtube.com/watch?v=gVEHRqxh5hQ', views: '32K', time: '1d ago' },
  { title: 'Cabinet Meeting Highlights: New Welfare Schemes 2024', url: 'https://www.youtube.com/watch?v=5H-qNq1sP7g', views: '15K', time: '2d ago' },
  { title: 'Review on Education Reforms & School Infrastructure', url: 'https://www.youtube.com/watch?v=yO6KKcmShCU', views: '22K', time: '2d ago' },
  { title: 'Visakhapatnam Industrial Summit Keynote Address', url: 'https://www.youtube.com/watch?v=yUhWgtzhd7w', views: '10K', time: '3d ago' },
  { title: 'Interactive Session with Farmers on Rythu Bharosa', url: 'https://www.youtube.com/watch?v=mdCCuomaBc4', views: '56K', time: '3d ago' },
  { title: 'Polavaram Project Site Visit & Progress Review', url: 'https://www.youtube.com/watch?v=gVEHRqxh5hQ', views: '28K', time: '4d ago' },
  { title: 'Inauguration of 5 New Medical Colleges Across AP', url: 'https://www.youtube.com/watch?v=5H-qNq1sP7g', views: '41K', time: '5d ago' },
  { title: 'Press Briefing on Annual Welfare Calendar Release', url: 'https://www.youtube.com/watch?v=yO6KKcmShCU', views: '18K', time: '6d ago' },
  { title: 'Global Investors Summit: AP as the Destination', url: 'https://www.youtube.com/watch?v=yUhWgtzhd7w', views: '95K', time: '1w ago' },
];

// Social Icon
const SocialIcon = ({ icon: Icon, bg, text, url }: { icon: any; bg: string; text: string; url?: string }) => {
  const content = (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} ${text} transition hover:scale-110`}>
      <Icon size={18} />
    </div>
  );
  
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    content
  );
};

// BottomCards with modal
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
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-3xl relative">
            <button
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setOpenModal(false)}
            >
              ×
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{modalContent.title}</h2>
            <p className="text-sm sm:text-md text-gray-700 mb-6">{modalContent.description}</p>
            <button
              className="bg-gray-400 text-white px-6 py-3 rounded font-bold cursor-not-allowed"
              disabled
            >
              Coming Soon
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main component
const PressMeetsAndSocial: React.FC = () => {
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);

  // Continuous smooth scrolling
  useEffect(() => {
    const scrollRow = (rowRef: React.RefObject<HTMLDivElement>, speed: number) => {
      if (!rowRef.current) return;
      const el = rowRef.current;

      let scrollLeft = 0;
      let direction = 1;

      const step = () => {
        if (!el) return;
        scrollLeft += speed * direction;
        if (scrollLeft >= el.scrollWidth - el.clientWidth) direction = -1;
        if (scrollLeft <= 0) direction = 1;
        el.scrollTo({ left: scrollLeft, behavior: "smooth" });
        requestAnimationFrame(step);
      };
      step();
    };

    scrollRow(row1Ref, 0.5); // slightly faster
    scrollRow(row2Ref, 0.5);
  }, []);

  const renderVideoCard = (video: any, idx: number) => (
    <a
      key={idx}
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 w-[220px] sm:w-[260px] md:w-[290px] shrink-0 transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
    >
      <div className="relative h-[140px] sm:h-[150px] bg-black overflow-hidden">
        <img
          src={`https://img.youtube.com/vi/${new URL(video.url).searchParams.get("v")}/hqdefault.jpg`}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
        />
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-[9px] sm:text-[10px] rounded flex gap-1 items-center">
          <Radio size={10} /> LIVE
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-[8px] sm:text-[9px] rounded flex gap-1 items-center">
          <Youtube size={10} /> YSRCP
        </div>
      </div>

      <div className="p-2 sm:p-3">
        <h3 className="font-bold text-white text-[9px] sm:text-xs line-clamp-2">{video.title}</h3>
        <div className="flex gap-2 sm:gap-3 text-[8px] sm:text-[10px] text-blue-100 mt-1 sm:mt-2">
          <span className="flex items-center gap-1"><Eye size={10} /> {video.views}</span>
          <span className="flex items-center gap-1"><Calendar size={10} /> {video.time}</span>
        </div>
        <div className="flex justify-between items-center mt-1 sm:mt-2 pt-1 border-t border-white/10">
          <span className="text-[9px] sm:text-[10px] font-black text-yellow-400">Watch Now →</span>
          <Share2 size={12} className="text-blue-200 hover:text-white" />
        </div>
      </div>
    </a>
  );

  return (
    <div className="w-full flex flex-col lg:flex-row bg-white">
      {/* LEFT SIDE — VIDEOS */}
      <div className="w-full lg:w-[65%] bg-gradient-to-br from-[#0055a5] to-[#003366] py-6 sm:py-8 px-4 sm:px-6 flex flex-col gap-8">
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-500 px-6 sm:px-8 py-2 rounded-md shadow-lg">
            <h2 className="text-white uppercase font-black text-lg sm:text-xl flex gap-2 items-center justify-center">
              <Video size={20} className="text-yellow-300" /> Jagan Anna <span className="text-yellow-300">On Air</span>
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:gap-6">
          <div ref={row1Ref} className="overflow-x-hidden">
            <div className="flex gap-3 sm:gap-4 min-w-max">{ALL_VIDEOS.slice(0,6).map(renderVideoCard)}</div>
          </div>
          <div ref={row2Ref} className="overflow-x-hidden">
            <div className="flex gap-3 sm:gap-4 min-w-max">{ALL_VIDEOS.slice(6,12).map(renderVideoCard)}</div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — SOCIAL */}
      <div className="w-full lg:w-[35%] bg-gray-50 px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-4 sm:gap-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-black text-ysrcp-blue uppercase flex gap-2 justify-center items-center">
            <Share2 size={20} /> Digital Channels
          </h2>
          <p className="text-xs sm:text-sm text-gray-500">Connect with the pulse of Andhra Pradesh</p>
        </div>

        {/* SOCIAL CARDS */}
        {[ 
          { title: "Jagan Anna", desc: "Official Leader Handles", colors: [
            { icon: Facebook, bg: "bg-blue-100", text: "text-blue-700", url: "https://www.facebook.com/ysjagan/" },
            { icon: Twitter, bg: "bg-sky-100", text: "text-sky-600", url: "https://x.com/ysjagan/" },
            { icon: Instagram, bg: "bg-pink-100", text: "text-pink-600", url: "https://www.instagram.com/ysjagan/" },
            { icon: MessageCircle, bg: "bg-green-100", text: "text-green-600",url:"https://whatsapp.com/channel/0029Va4JGNi42DccmaxNjf0q " },
            { icon: Send, bg: "bg-cyan-100", text: "text-cyan-600",url:"https://t.me/s/JaganSpeaks?q=%23YSJagan&before=4121" },
          ] },
          { title: "YSRCP Party", desc: "Official Party Updates", colors: [
            { icon: Facebook, bg: "bg-blue-100", text: "text-blue-700",url:"https://www.instagram.com/ysrcongress/?hl=en"},
            { icon: Twitter, bg: "bg-sky-100", text: "text-sky-600",url:"https://x.com/YSRCParty" },
            { icon: Instagram, bg: "bg-pink-100", text: "text-pink-600",url:"https://www.instagram.com/ysrcongress/?hl=en" },
            { icon: MessageCircle, bg: "bg-green-100", text: "text-green-600",url:"https://whatsapp.com/channel/0029Va4JGNi42DccmaxNjf0q"},
            { icon: Send, bg: "bg-cyan-100", text: "text-cyan-600",url:"https://www.ysrcongress.com/" },
          ] },
          { title: "NRI Community", desc: "Direct Connect", colors: [
            { icon: Facebook, bg: "bg-blue-50", text: "text-blue-600" },
            { icon: Twitter, bg: "bg-sky-50", text: "text-sky-600" },
            { icon: Instagram, bg: "bg-pink-50", text: "text-pink-600" },
            { icon: MessageCircle, bg: "bg-green-50", text: "text-green-600" },
            { icon: Send, bg: "bg-cyan-50", text: "text-cyan-600" },
          ] },
        ].map((c, idx) => (
          <div key={idx} className="bg-white p-4 sm:p-5 border-l-[5px] sm:border-l-[6px] border-ysrcp-blue rounded-r-xl shadow flex flex-col justify-between">
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

        {/* BOTTOM CARDS WITH MODAL */}
        <BottomCards />
      </div>
    </div>
  );
};

export default PressMeetsAndSocial;
