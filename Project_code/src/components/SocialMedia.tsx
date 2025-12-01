import React from "react";
import "./social.css";

const videoCards = [
{ title: "Review on Education Reforms & School Infrastructure", views: "22K", timeAgo: "2d ago", url: "[https://youtube.com/watch?v=VIDEO_ID1](https://youtube.com/watch?v=VIDEO_ID1)" },
{ title: "Analysis on YS Jagan Hyderabad Tour & Future Plans", views: "12K", timeAgo: "2h ago", url: "[https://youtube.com/watch?v=VIDEO_ID2](https://youtube.com/watch?v=VIDEO_ID2)" },
{ title: "Inauguration of 5 New Medical Colleges Across AP", views: "41K", timeAgo: "5d ago", url: "[https://youtube.com/watch?v=VIDEO_ID3](https://youtube.com/watch?v=VIDEO_ID3)" },
{ title: "Press Briefing on Annual Welfare Calendar Release", views: "18K", timeAgo: "6d ago", url: "[https://youtube.com/watch?v=VIDEO_ID4](https://youtube.com/watch?v=VIDEO_ID4)" },
{ title: "Tour of Amaravati Development Projects", views: "30K", timeAgo: "3d ago", url: "[https://youtube.com/watch?v=VIDEO_ID5](https://youtube.com/watch?v=VIDEO_ID5)" },
{ title: "Discussion on Digital India Initiatives", views: "25K", timeAgo: "1d ago", url: "[https://youtube.com/watch?v=VIDEO_ID6](https://youtube.com/watch?v=VIDEO_ID6)" },
{ title: "Education Reforms – Updates & Progress", views: "15K", timeAgo: "4d ago", url: "[https://youtube.com/watch?v=VIDEO_ID7](https://youtube.com/watch?v=VIDEO_ID7)" },
];

const socialLinks = {
jaganAnna: { facebook:"#", twitter:"#", linkedin:"#", instagram:"#", whatsapp:"#", telegram:"#"},
ysrcpParty: { facebook:"#", twitter:"#", instagram:"#", whatsapp:"#", telegram:"#"},
nriCommunity: { facebook:"#", twitter:"#", instagram:"#", whatsapp:"#", telegram:"#"},
};

const SocialMedia: React.FC = () => {
// Split videos into two rows
const mid = Math.ceil(videoCards.length / 2);
const row1 = videoCards.slice(0, mid);
const row2 = videoCards.slice(mid);

return ( <div className="social-container flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 bg-gray-100">


  {/* Video Section */}
  <div className="videos-section flex-1">
    <h2 className="bg-blue-800 text-white px-4 py-2 rounded mb-4 inline-block text-lg sm:text-xl">
      JAGAN ANNA ON AIR
    </h2>

    <div className="scrolling-videos flex flex-col gap-4">
      {/* First Row */}
      <div className="video-row flex gap-4 animate-scroll">
        {row1.concat(row1).map((video, index) => (
          <div key={index} className="video-card min-w-[240px] bg-blue-900 text-white rounded-lg overflow-hidden">
            <div className="video-placeholder h-36 flex items-center justify-center bg-black">
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold">
                Watch on YouTube
              </a>
            </div>
            <div className="p-2">
              <h3 className="text-sm sm:text-base font-semibold">{video.title}</h3>
              <p className="text-xs text-gray-300">{video.views} • {video.timeAgo}</p>
              <button className="mt-1 px-2 py-1 bg-yellow-400 text-black rounded font-bold text-xs">WATCH NOW →</button>
            </div>
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="video-row flex gap-4 animate-scroll-reverse">
        {row2.concat(row2).map((video, index) => (
          <div key={index} className="video-card min-w-[240px] bg-blue-900 text-white rounded-lg overflow-hidden">
            <div className="video-placeholder h-36 flex items-center justify-center bg-black">
              <a href={video.url} target="_blank" rel="noopener noreferrer" className="text-yellow-400 font-bold">
                Watch on YouTube
              </a>
            </div>
            <div className="p-2">
              <h3 className="text-sm sm:text-base font-semibold">{video.title}</h3>
              <p className="text-xs text-gray-300">{video.views} • {video.timeAgo}</p>
              <button className="mt-1 px-2 py-1 bg-yellow-400 text-black rounded font-bold text-xs">WATCH NOW →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Digital Channels Section */}
  <div className="digital-section flex-none w-full lg:w-64">
    <h2 className="text-blue-800 font-bold mb-4 text-lg sm:text-xl">DIGITAL CHANNELS</h2>

    {["jaganAnna", "ysrcpParty", "nriCommunity"].map((key) => (
      <div key={key} className={`social-card ${key} mb-4 p-4 bg-white rounded-lg shadow`}>
        <p className="font-bold mb-2">{key === "jaganAnna" ? "JAGAN ANNA" : key === "ysrcpParty" ? "YSRCP PARTY" : "NRI COMMUNITY"}</p>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(socialLinks[key]).map(([name, url]) => (
            <a key={name} href={url} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-600 text-white text-xs">{name.toUpperCase()}</a>
          ))}
        </div>
      </div>
    ))}
  </div>

  {/* Inline CSS for auto-scroll */}
  <style>
    {`
      .scrolling-videos {
        overflow-x: hidden;
      }
      .video-row {
        display: flex;
        gap: 1rem;
      }
      .animate-scroll {
        animation: scroll 50s linear infinite;
      }
      .animate-scroll-reverse {
        animation: scroll-reverse 50s linear infinite;
      }
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes scroll-reverse {
        0% { transform: translateX(-50%); }
        100% { transform: translateX(0); }
      }
    `}
  </style>
</div>


);
};

export default SocialMedia;
