import React, { useEffect } from "react";
import "./social.css";

declare global {
  interface Window {
    twttr?: any;
    FB?: any;
  }
}

const SocialMedia: React.FC = () => {
  // Load Twitter (X)
  useEffect(() => {
    const loadTwitter = () => {
      if (!document.getElementById("twitter-wjs")) {
        const script = document.createElement("script");
        script.id = "twitter-wjs";
        script.src = "https://platform.twitter.com/widgets.js";
        script.async = true;
        script.onload = () => {
          // Force reload of widgets after script loads
          setTimeout(() => {
            window.twttr?.widgets?.load();
          }, 1000);
        };
        document.body.appendChild(script);
      } else {
        // Reload existing widgets
        setTimeout(() => {
          window.twttr?.widgets?.load();
        }, 500);
      }
    };

    loadTwitter();

    // Refresh Twitter timeline every 5 minutes
    const twitterInterval = setInterval(() => {
      window.twttr?.widgets?.load();
    }, 300000);

    return () => clearInterval(twitterInterval);
  }, []);

  // Load Facebook SDK
  useEffect(() => {
    const loadFacebook = () => {
      if (!document.getElementById("facebook-jssdk")) {
        const script = document.createElement("script");
        script.id = "facebook-jssdk";
        script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
        script.async = true;
        script.onload = () => {
          // Initialize Facebook SDK
          window.fbAsyncInit = function() {
            window.FB.init({
              appId: null,
              xfbml: true,
              version: 'v18.0'
            });
            // Parse XFBML after initialization
            setTimeout(() => {
              window.FB?.XFBML?.parse();
            }, 1000);
          };
        };
        document.body.appendChild(script);
      } else {
        // Re-parse existing Facebook elements
        setTimeout(() => {
          window.FB?.XFBML?.parse();
        }, 500);
      }
    };

    loadFacebook();

    // Refresh Facebook plugin every 5 minutes
    const facebookInterval = setInterval(() => {
      window.FB?.XFBML?.parse();
    }, 300000);

    return () => clearInterval(facebookInterval);
  }, []);

  return (
    <section className="social-section">
      <h2 className="social-title">SOCIAL MEDIA</h2>

      <div className="social-container">
        {/* Twitter */}
        <div className="social-card twitter">
          <h3>X (Twitter)</h3>
          <div className="social-embed">
            <a
              className="twitter-timeline"
              data-height="500"
              href="https://x.com/ysjagan?ref_src=twsrc%5Etfw"
            >
              Tweets by @ysjagan
            </a>
          </div>
        </div>

        {/* Instagram */}
        <div className="social-card instagram">
          <h3>Instagram</h3>
          <div className="social-embed">
            <iframe
              src="https://www.instagram.com/ysjagan/embed"
              width="100%"
              height="500"
              frameBorder="0"
              scrolling="yes"
              allowTransparency={true}
              title="Instagram Feed"
            ></iframe>
          </div>
        </div>

        {/* Facebook */}
        <div className="social-card facebook">
          <h3>Facebook</h3>
          <div className="social-embed">
            <div
              className="fb-page"
              data-href="https://www.facebook.com/ysrcpofficial"
              data-tabs="timeline"
              data-width="400"
              data-height="500"
              data-small-header="false"
              data-adapt-container-width="true"
              data-hide-cover="false"
              data-show-facepile="false"
            >
              <blockquote
                cite="https://www.facebook.com/ysrcpofficial"
                className="fb-xfbml-parse-ignore"
              >
                <a href="https://www.facebook.com/ysrcpofficial">
                  YSR Congress Party Official
                </a>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialMedia;
