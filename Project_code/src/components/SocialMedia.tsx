import React from "react";
import "./social.css";

// Video card data
const videoCards = [
  {
    title: "Review on Education Reforms & School Infrastructure",
    views: "22K",
    timeAgo: "2d ago",
    url: "https://youtube.com/watch?v=VIDEO_ID1",
  },
  {
    title: "Analysis on YS Jagan Hyderabad Tour & Future Plans",
    views: "12K",
    timeAgo: "2h ago",
    url: "https://youtube.com/watch?v=VIDEO_ID2",
  },
  {
    title: "Inauguration of 5 New Medical Colleges Across AP",
    views: "41K",
    timeAgo: "5d ago",
    url: "https://youtube.com/watch?v=VIDEO_ID3",
  },
  {
    title: "Press Briefing on Annual Welfare Calendar Release",
    views: "18K",
    timeAgo: "6d ago",
    url: "https://youtube.com/watch?v=VIDEO_ID4",
  },
];

// Social media links
const socialLinks = {
  jaganAnna: {
    facebook: "#",
    twitter: "#",
    linkedin: "#",
    instagram: "#",
    whatsapp: "#",
    telegram: "#",
  },
  ysrcpParty: {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    whatsapp: "#",
    telegram: "#",
  },
  nriCommunity: {
    facebook: "#",
    twitter: "#",
    instagram: "#",
    whatsapp: "#",
    telegram: "#",
  },
};

const SocialMedia: React.FC = () => {
  return (
    <div className="social-container">

      {/* Video Section */}
      <section className="videos-section">
        <h2>JAGAN ANNA ON AIR</h2>

        <div className="video-grid">
          {videoCards.map((video, index) => (
            <div key={index} className="video-card">
              <div className="video-placeholder">
                <a href={video.url} target="_blank" rel="noopener noreferrer">
                  Watch on YouTube
                </a>
              </div>

              <h3>{video.title}</h3>
              <p>
                {video.views} • {video.timeAgo}
              </p>

              <button>WATCH NOW →</button>
            </div>
          ))}
        </div>
      </section>

      {/* Digital Channels Section */}
      <section className="digital-section">
        <h2>DIGITAL CHANNELS</h2>

        {/* JAGAN ANNA */}
        <div className="social-card jagan">
          <p>JAGAN ANNA</p>
          <div className="icons">
            <a href={socialLinks.jaganAnna.facebook}>FB</a>
            <a href={socialLinks.jaganAnna.twitter}>TW</a>
            <a href={socialLinks.jaganAnna.linkedin}>IN</a>
            <a href={socialLinks.jaganAnna.instagram}>IG</a>
            <a href={socialLinks.jaganAnna.whatsapp}>WA</a>
            <a href={socialLinks.jaganAnna.telegram}>TG</a>
          </div>
        </div>

        {/* YSRCP PARTY */}
        <div className="social-card ysrcp">
          <p>YSRCP PARTY</p>
          <div className="icons">
            <a href={socialLinks.ysrcpParty.facebook}>FB</a>
            <a href={socialLinks.ysrcpParty.twitter}>TW</a>
            <a href={socialLinks.ysrcpParty.instagram}>IG</a>
            <a href={socialLinks.ysrcpParty.whatsapp}>WA</a>
            <a href={socialLinks.ysrcpParty.telegram}>TG</a>
          </div>
        </div>

        {/* NRI COMMUNITY */}
        <div className="social-card nri">
          <p>NRI COMMUNITY</p>
          <div className="icons">
            <a href={socialLinks.nriCommunity.facebook}>FB</a>
            <a href={socialLinks.nriCommunity.twitter}>TW</a>
            <a href={socialLinks.nriCommunity.instagram}>IG</a>
            <a href={socialLinks.nriCommunity.whatsapp}>WA</a>
            <a href={socialLinks.nriCommunity.telegram}>TG</a>
          </div>
        </div>
      </section>

    </div>
  );
};

export default SocialMedia;
