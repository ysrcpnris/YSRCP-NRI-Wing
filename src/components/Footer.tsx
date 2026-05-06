import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Globe,
  Mail,
  Phone,
  ChevronDown,
} from "lucide-react";
import {
  FacebookBrand,
  XBrand,
  InstagramBrand,
  YouTubeBrand,
} from "./BrandIcons";
import nriLogo from "./nrilogo.png";

// Each Quick Link routes to one of:
//   • '#anchor'  — smooth-scrolls to a home-page section (or navigates
//                   to home first when the user is on another route).
//   • '/path'    — react-router push to that path.
//   • absolute URL with `external: true` — opens in a new tab.
type LinkItem = { label: string; to: string; external?: boolean };

const NRI_SERVICES: LinkItem[] = [
  { label: "Document Services",   to: "#services" },
  { label: "Property Assistance", to: "#services" },
  { label: "Business Support",    to: "#services" },
  { label: "Education Services",  to: "#services" },
  { label: "Legal Help",          to: "#services" },
  { label: "Investment Guidance", to: "#services" },
];

const QUICK_LINKS: LinkItem[] = [
  { label: "About YSRCP",         to: "/about" },
  { label: "Home",                to: "#hero" },
  { label: "Services",            to: "#services" },
  // Jagan-mark click takes the user to the Pillars of Progress
  // section (id="section-pillars" on TenPillar).
  { label: "Jagan-mark",          to: "#section-pillars" },
  { label: "Jagan anna on air",   to: "#onair" },
  { label: "Digital channels",    to: "#digital-channels" },
  { label: "Gallery",             to: "#glimpse" },
];

const REGIONS: LinkItem[] = [
  { label: "USA & Canada",         to: "#" },
  { label: "Middle East",          to: "#" },
  { label: "Europe & UK",          to: "#" },
  { label: "Australia & NZ",       to: "#" },
  { label: "Singapore & Malaysia", to: "#" },
];

const Footer: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const sections: { title: string; items: LinkItem[] }[] = [
    { title: "NRI Services", items: NRI_SERVICES },
    { title: "Quick Links",  items: QUICK_LINKS },
    { title: "Regions",      items: REGIONS },
  ];

  // Smooth-scroll to a hash anchor. If the user is on a different
  // route, navigate to '/' first and scroll once the home page has
  // painted (two RAF ticks gives React time to mount the section).
  const scrollToAnchor = (hash: string) => {
    if (!hash || hash === "#") return;
    if (location.pathname !== "/") {
      navigate("/");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(hash);
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      return;
    }
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Render a Quick Link with the right element based on its `to`:
  //   '#anchor' → button that smooth-scrolls
  //   '/path'   → react-router <Link> (handles history + relative paths)
  //   external  → <a target="_blank">
  const renderLinkItem = (item: LinkItem, className: string) => {
    if (item.external) {
      return (
        <a
          href={item.to}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {item.label}
        </a>
      );
    }
    if (item.to.startsWith("/")) {
      return (
        <Link
          to={item.to}
          className={className}
          onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
        >
          {item.label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => scrollToAnchor(item.to)}
        className={className}
      >
        {item.label}
      </button>
    );
  };

  // Mirror the same handles used in the Jagan Anna / YSRCP Party
  // cards on the home page — those URLs are the client-confirmed
  // working ones. YouTube kept as the YSRCP official channel since
  // the Jagan Anna card doesn't have a YouTube entry.
  const footerSocialLinks = [
    { icon: FacebookBrand,  url: "https://www.facebook.com/ysjagan/",     label: "Facebook" },
    { icon: XBrand,         url: "https://x.com/ysjagan/",                label: "Twitter" },
    { icon: InstagramBrand, url: "https://www.instagram.com/ysjagan/",    label: "Instagram" },
    { icon: YouTubeBrand,   url: "https://www.youtube.com/@ysrcpofficial", label: "YouTube" },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-primary-900 text-white overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 hidden md:block pointer-events-none">
        <img
          src="/ECOd9I9UYAAkV4h.jpg"
          alt=""
          className="w-full h-full object-cover object-top opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-gray-900/80 to-black/90" />
      </div>

      {/* Decorative glow */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* TOP */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-8 border-b border-white/10">
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-primary-300">
              <img src={nriLogo} alt="YSRCP NRI Portal Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h3 className="font-bold text-base bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
                YSRCP NRI Wing
              </h3>
              <p className="text-xs text-gray-400">Global Unity, Local Impact</p>
            </div>
          </div>

          {/* SOCIAL ICONS */}
          <div className="flex gap-2">
            {footerSocialLinks.map(({ icon: Icon, url, label }, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-gradient-to-br hover:from-primary-500 hover:to-primary-700 backdrop-blur-sm flex items-center justify-center border border-white/10 hover:border-transparent transition-all duration-300 hover:scale-110"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* MOBILE ACCORDION */}
        <div className="md:hidden mt-4">
          {sections.map((sec) => (
            <div key={sec.title} className="border-b border-white/10">
              <button
                onClick={() => setOpen(open === sec.title ? null : sec.title)}
                className="w-full flex justify-between items-center py-3 text-sm font-semibold text-white"
              >
                {sec.title}
                <ChevronDown
                  className={`w-4 h-4 text-primary-300 transition-transform duration-300 ${
                    open === sec.title ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  open === sec.title ? "max-h-96 pb-3" : "max-h-0"
                }`}
              >
                <ul className="space-y-2 text-xs text-gray-400">
                  {sec.items.map((item, i) => (
                    <li key={i}>
                      {renderLinkItem(
                        item,
                        "text-left hover:text-white cursor-pointer transition"
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP GRID */}
        <div className="hidden md:grid grid-cols-3 gap-8 mt-10 text-sm">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h4 className="font-bold mb-4 text-sm uppercase tracking-wider text-primary-300">
                {sec.title}
              </h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                {sec.items.map((item, i) => (
                  <li key={i}>
                    {renderLinkItem(
                      item,
                      "inline-block text-left hover:text-white hover:translate-x-1 transition-all duration-200 cursor-pointer"
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CONTACT */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm text-gray-300">
          <a
            href="mailto:globalcoordinator@ysrcpnriwing.org"
            className="flex items-center gap-2 hover:text-white transition"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Mail className="w-4 h-4 text-primary-300" />
            </div>
            globalcoordinator@ysrcpnriwing.org
          </a>
          <a href="tel:9515511111" className="flex items-center gap-2 hover:text-white transition">
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-primary-300" />
            </div>
            9515511111
          </a>
          <a
            href="https://www.ysrcongress.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary-300" />
            </div>
            www.ysrcongress.com
          </a>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div>© 2026 YSR Congress Party · All rights reserved</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition">Terms</a>
            <a href="#" className="hover:text-white transition">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
