import React from "react";
import "./social.css";

const SocialMedia: React.FC = () => {
  return (
    <section id="socialmedia" className="social-section">
      <h2 className="social-title">SOCIAL MEDIA</h2>

      {/* Row 1 - YSR Congress Party */}
      <h3 className="social-subtitle">YSR Congress Party Official</h3>
      <div className="social-container">
        <div className="social-card twitter">
          <h3>Twitter</h3>
          <div className="social-embed small">
            <span className="streaming-text">🔄 Fetching Latest Tweets...</span>
          </div>
        </div>

        <div className="social-card instagram">
          <h3>Instagram</h3>
          <div className="social-embed small">
            <span className="streaming-text">📸 Loading Instagram Feed...</span>
          </div>
        </div>

        <div className="social-card facebook">
          <h3>Facebook</h3>
          <div className="social-embed small">
            <span className="streaming-text">🌐 Connecting to Facebook Page...</span>
          </div>
        </div>

        <div className="social-card youtube">
          <h3>YouTube</h3>
          <div className="social-embed small">
            <span className="streaming-text">▶️ Streaming Recent Videos...</span>
          </div>
        </div>
      </div>

      {/* Row 2 - YS Jagan Mohan Reddy */}
      <h3 className="social-subtitle">Hon’ble CM Y.S. Jagan Mohan Reddy</h3>
      <div className="social-container">
        <div className="social-card twitter">
          <h3>Twitter</h3>
          <div className="social-embed small">
            <span className="streaming-text">🔁 Refreshing CM’s Tweets...</span>
          </div>
        </div>

        <div className="social-card instagram">
          <h3>Instagram</h3>
          <div className="social-embed small">
            <span className="streaming-text">📲 Loading Instagram Stories...</span>
          </div>
        </div>

        <div className="social-card facebook">
          <h3>Facebook</h3>
          <div className="social-embed small">
            <span className="streaming-text">📡 Fetching CM’s Page Updates...</span>
          </div>
        </div>

        <div className="social-card youtube">
          <h3>YouTube</h3>
          <div className="social-embed small">
            <span className="streaming-text">🎥 Streaming Recent Speeches...</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialMedia;
