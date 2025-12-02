import React from "react";
import {
  Video, Play, Calendar, Eye, Share2, Radio, Youtube,
  MessageCircle, Facebook, Linkedin, Instagram, Twitter, Send,
  Shield, Code, ArrowUpRight
} from "lucide-react";

// ============================
// 🎥 VIDEO DATA
// ============================
const ALL_VIDEOS = [
  { title: 'Analysis on YS Jagan Hyderabad Tour & Future Plans', src: 'https://www.youtube.com/embed/yO6KKcmShCU?rel=0', views: '12K', time: '2h ago' },
  { title: 'Powerful Speech at YSRCP Formation Day Celebrations', src: 'https://www.youtube.com/embed/yUhWgtzhd7w?rel=0', views: '45K', time: '5h ago' },
  { title: 'Sensational Press Meet: Addressing Key State Issues', src: 'https://www.youtube.com/embed/mdCCuomaBc4?rel=0', views: '89K', time: '1d ago' },
  { title: 'YS Jagan Mohan Reddy Speech At Narsipatnam Public Meeting', src: 'https://www.youtube.com/embed/gVEHRqxh5hQ?rel=0', views: '32K', time: '1d ago' },
  { title: 'Cabinet Meeting Highlights: New Welfare Schemes 2024', src: 'https://www.youtube.com/embed/5H-qNq1sP7g?rel=0', views: '15K', time: '2d ago' },
  { title: 'Review on Education Reforms & School Infrastructure', src: 'https://www.youtube.com/embed/yO6KKcmShCU?rel=0', views: '22K', time: '2d ago' },

  { title: 'Visakhapatnam Industrial Summit Keynote Address', src: 'https://www.youtube.com/embed/yUhWgtzhd7w?rel=0', views: '10K', time: '3d ago' },
  { title: 'Interactive Session with Farmers on Rythu Bharosa', src: 'https://www.youtube.com/embed/mdCCuomaBc4?rel=0', views: '56K', time: '3d ago' },
  { title: 'Polavaram Project Site Visit & Progress Review', src: 'https://www.youtube.com/embed/gVEHRqxh5hQ?rel=0', views: '28K', time: '4d ago' },
  { title: 'Inauguration of 5 New Medical Colleges Across AP', src: 'https://www.youtube.com/embed/5H-qNq1sP7g?rel=0', views: '41K', time: '5d ago' },
  { title: 'Press Briefing on Annual Welfare Calendar Release', src: 'https://www.youtube.com/embed/yO6KKcmShCU?rel=0', views: '18K', time: '6d ago' },
  { title: 'Global Investors Summit: AP as the Destination', src: 'https://www.youtube.com/embed/yUhWgtzhd7w?rel=0', views: '95K', time: '1w ago' },
];

// ============================
// 🗣 TESTIMONIAL DATA
// ============================
const TESTIMONIALS_DATA = [
  // { quote: "The NRI cell was incredibly helpful in resolving a documentation issue back home. The process was swift and transparent, reflecting the government's commitment.", author: "Dr. V. Rao", role: "Cardiologist, USA", initials: "DR", color: "text-blue-700", borderColor: "border-blue-600", bgColor: "bg-blue-50" },
  // { quote: "Being able to contribute directly to educational reforms through the portal gave me a sense of pride and connection I hadn't felt before. A true global platform.", author: "Ms. L. Reddy", role: "Tech Lead, UK", initials: "LR", color: "text-green-700", borderColor: "border-green-600", bgColor: "bg-green-50" },
  // { quote: "The investment guidance provided for the new industrial corridor was exceptional. It gave us the confidence to start our manufacturing unit in Visakhapatnam.", author: "Mr. K. Sharma", role: "Entrepreneur, Dubai", initials: "KS", color: "text-amber-700", borderColor: "border-amber-600", bgColor: "bg-amber-50" },
  // { quote: "Watching the school renovation projects from abroad makes me happy. My donation reached the right place, and I get regular updates.", author: "Mrs. P. Lakshmi", role: "Teacher, Australia", initials: "PL", color: "text-blue-700", borderColor: "border-blue-600", bgColor: "bg-blue-50" },
  // { quote: "Connecting with my local MLA through this portal solved a land dispute that was pending for years. Thank you Jagan Anna for this initiative.", author: "Mr. S. Reddy", role: "Senior Citizen, Canada", initials: "SR", color: "text-green-700", borderColor: "border-green-600", bgColor: "bg-green-50" },
  // { quote: "The streamlined process for NRI voting registration is a game changer. I feel more connected to my democracy than ever.", author: "Mr. A. Kumar", role: "Engineer, Singapore", initials: "AK", color: "text-blue-700", borderColor: "border-blue-600", bgColor: "bg-blue-50" },
];

const PressMeetsAndSocial: React.FC = () => {
  const row1 = ALL_VIDEOS.slice(0, 6);
  const row2 = ALL_VIDEOS.slice(6, 12);
  const marqueeItems = [...TESTIMONIALS_DATA, ...TESTIMONIALS_DATA];

  const renderVideoCard = (video: any, idx: number) => (
    <div key={idx} className="group relative bg-white/10 backdrop-blur-md rounded-xl overflow-hidden border border-white/20 hover:border-white/50 w-[290px] shrink-0 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
      <div className="relative h-[150px] bg-black overflow-hidden">
        <iframe src={video.src} className="absolute inset-0 w-full h-full opacity-80 group-hover:opacity-100 transition" allowFullScreen></iframe>
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white text-[10px] rounded-sm flex gap-1 items-center">
          <Radio size={10} /> LIVE
        </div>
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-[9px] rounded flex gap-1 items-center">
          <Youtube size={10} /> YSRCP
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-white text-xs line-clamp-2">{video.title}</h3>
        <div className="flex gap-3 text-[10px] text-blue-100 mt-2">
          <span className="flex items-center gap-1"><Eye size={10} /> {video.views}</span>
          <span className="flex items-center gap-1"><Calendar size={10} /> {video.time}</span>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
          <button className="text-[10px] font-black text-yellow-400 hover:text-white">Watch Now →</button>
          <Share2 size={12} className="text-blue-200 hover:text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full flex bg-white">

      {/* LEFT SIDE — VIDEOS + TESTIMONIALS */}
      <div className="w-[65%] bg-gradient-to-br from-[#0055a5] to-[#003366] py-8 px-6 flex flex-col gap-12">

        {/* VIDEO SECTION */}
        <div className="text-center pb-5">
          <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-500 px-8 py-2 rounded-md shadow-lg">
            <h2 className="text-white uppercase font-black text-xl flex gap-2 items-center">
              <Video size={22} className="text-yellow-300" /> Jagan Anna <span className="text-yellow-300">On Air</span>
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <div className="overflow-hidden">
            <div className="flex gap-4 animate-marquee" style={{ animationDuration: "50s" }}>
              {[...row1, ...row1].map((v, i) => renderVideoCard(v, i))}
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="flex gap-4 animate-marquee" style={{ animationDuration: "60s" }}>
              {[...row2, ...row2].map((v, i) => renderVideoCard(v, i))}
            </div>
          </div>
        </div>

        {/* TESTIMONIALS SECTION */}
        <div className="w-full overflow-hidden mt-12 relative">
          {/* <h2 className="text-2xl font-black uppercase tracking-tight text-yellow-300 mb-6 text-center" style={{ fontFamily: 'Times New Roman, serif' }}>
            Voices of Our Global Community
          </h2> */}
          <div className="flex gap-8 w-max px-10 animate-marquee">
            {marqueeItems.map((item, idx) => (
              <div key={idx} className={`shrink-0 w-[550px] bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 border-l-[6px] ${item.borderColor} transform hover:-translate-y-2 mx-2 relative`}>
                <div className={`text-8xl ${item.color} opacity-10 absolute top-0 right-4 font-serif leading-none`}>"</div>
                <p className="text-gray-700 italic text-lg leading-relaxed mb-6 font-medium line-clamp-3">{item.quote}</p>
                <div className="flex items-center gap-4 border-t border-gray-100 pt-4 mt-auto">
                  <div className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-full flex items-center justify-center font-black text-sm`}>{item.initials}</div>
                  <div>
                    <p className={`font-black uppercase tracking-wider text-sm ${item.color}`}>{item.author}</p>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RIGHT SIDE — SOCIAL SECTION */}
      <div className="w-[35%] bg-gray-50 px-8 py-10 overflow-y-auto">

        <h2 className="text-2xl font-black text-ysrcp-blue uppercase flex gap-2 items-center">
          <Share2 size={20} /> Digital Channels
        </h2>
        <p className="text-sm text-gray-500 -mt-1 mb-5">Connect with the pulse of Andhra Pradesh</p>

        <div className="flex flex-col gap-5">

          {/* Jagan Anna */}
          <div className="bg-white p-5 border-l-[6px] border-ysrcp-blue rounded-r-xl shadow">
            <h3 className="text-lg font-black">Jagan Anna</h3>
            <p className="text-xs text-gray-500 uppercase">Official Leader Handles</p>
            <div className="flex gap-3 mt-3 overflow-x-auto">
              <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center"><Facebook size={16} /></div>
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center"><Twitter size={16} /></div>
              <div className="w-10 h-10 rounded-full bg-[#0077b5] text-white flex items-center justify-center"><Linkedin size={16} /></div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 text-white flex items-center justify-center"><Instagram size={16} /></div>
              <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center"><MessageCircle size={16} /></div>
              <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center"><Send size={16} /></div>
            </div>
          </div>

          {/* Party */}
          <div className="bg-white p-5 border-l-[6px] border-ysrcp-green rounded-r-xl shadow">
            <h3 className="text-lg font-black">YSRCP Party</h3>
            <p className="text-xs text-gray-500 uppercase">Official Party Updates</p>
            <div className="flex gap-3 mt-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center"><Facebook size={16} /></div>
              <div className="w-9 h-9 rounded-lg bg-gray-200 text-black flex items-center justify-center"><Twitter size={16} /></div>
              <div className="w-9 h-9 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center"><Instagram size={16} /></div>
              <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><MessageCircle size={16} /></div>
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center"><Send size={16} /></div>
            </div>
          </div>

          {/* NRI */}
          <div className="bg-white p-5 border-l-[6px] border-ysrcp-yellow rounded-r-xl shadow">
            <h3 className="text-lg font-black">NRI Community</h3>
            <p className="text-xs text-gray-500 uppercase">Direct Connect</p>
            <div className="flex gap-3 mt-3">
              <div className="w-9 h-9 rounded-lg border bg-blue-50 text-blue-600 flex items-center justify-center"><Facebook size={16} /></div>
              <div className="w-9 h-9 rounded-lg border bg-gray-50 text-black flex items-center justify-center"><Twitter size={16} /></div>
              <div className="w-9 h-9 rounded-lg border bg-pink-50 text-pink-600 flex items-center justify-center"><Instagram size={16} /></div>
              <div className="w-9 h-9 rounded-lg border bg-green-50 text-green-600 flex items-center justify-center"><MessageCircle size={16} /></div>
              <div className="w-9 h-9 rounded-lg border bg-sky-50 text-sky-600 flex items-center justify-center"><Send size={16} /></div>
            </div>
          </div>

        </div>

        {/* Bottom Cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gradient-to-br from-[#004AAD] to-[#00897B] rounded-xl p-4 text-white shadow">
            <div className="flex justify-between">
              <div className="bg-white/20 p-1.5 rounded-lg"><Shield size={20} /></div>
              <ArrowUpRight size={16} />
            </div>
            <h4 className="mt-3 text-sm font-black">Contribute for ORM</h4>
            <p className="text-[10px] text-blue-100">Join the Digital Defense Team.</p>
          </div>
          <div className="bg-gradient-to-br from-ysrcp-green to-[#1e7e34] rounded-xl p-4 text-white shadow">
            <div className="flex justify-between items-center">
              <div className="bg-white/20 p-1.5 rounded-lg"><Code size={20} /></div>
              <div className="text-ysrcp-green bg-white px-2 py-0.5 text-[10px] font-black rounded">APPLY</div>
            </div>
            <h4 className="mt-3 text-sm font-black">App Building Team</h4>
            <p className="text-[10px] text-green-100">Tech volunteers needed.</p>
          </div>
        </div>

      </div>

      {/* Marquee animation style */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 40s linear infinite;
        }
      `}</style>

    </div>
  );
};

export default PressMeetsAndSocial;
