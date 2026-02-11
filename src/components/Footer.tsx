import React, { useState } from "react";
import {
  Globe,
  Mail,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronDown,
} from "lucide-react";

const Footer: React.FC = () => {
  const [open, setOpen] = useState<string | null>(null);

  const sections = [
    {
      title: "NRI Services",
      items: [
        "Document Services",
        "Property Assistance",
        "Business Support",
        "Education Services",
        "Legal Help",
        "Investment Guidance",
      ],
    },
    {
      title: "Quick Links",
      items: [
        "About YSRCP",
        "Leadership",
        "Policies",
        "Press Releases",
        "Careers",
        "Privacy Policy",
      ],
    },
    {
      title: "Regions",
      items: [
        "USA & Canada",
        "Middle East",
        "Europe & UK",
        "Australia & NZ",
        "Singapore & Malaysia",
      ],
    },
  ];

  /* ✅ YSRCP PARTY SOCIAL LINKS */
  const footerSocialLinks = [
    {
      icon: Facebook,
      url: "https://www.instagram.com/ysrcongress/?hl=en",
    },
    {
      icon: Twitter,
      url: "https://x.com/YSRCParty",
    },
    {
      icon: Instagram,
      url: "https://www.instagram.com/ysrcongress/?hl=en",
    },
    {
      icon: Youtube,
      url: "https://www.youtube.com/@ysrcpofficial",
    },
  ];

  return (
    <footer className="relative bg-gray-900 text-white overflow-hidden">
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src="/ECOd9I9UYAAkV4h.jpg"
          alt="YSRCP background"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-4">
        {/* TOP */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* LOGO */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">YSRCP</h3>
              <p className="text-[11px] text-gray-400">NRI Portal</p>
            </div>
          </div>

          {/* ✅ SOCIAL ICONS WITH REAL LINKS */}
          <div className="flex gap-2">
            {footerSocialLinks.map(({ icon: Icon, url }, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-7 h-7 bg-blue-600/90 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
                aria-label="YSRCP social link"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </div>

        {/* MOBILE ACCORDION */}
        <div className="md:hidden mt-3 border-t border-gray-800">
          {sections.map((sec) => (
            <div key={sec.title} className="border-b border-gray-800">
              <button
                onClick={() => setOpen(open === sec.title ? null : sec.title)}
                className="w-full flex justify-between items-center py-2.5 text-sm font-medium"
              >
                {sec.title}
                <ChevronDown
                  className={`w-4 h-4 transition ${
                    open === sec.title ? "rotate-180" : ""
                  }`}
                />
              </button>
              {open === sec.title && (
                <ul className="pb-2 space-y-1 text-xs text-gray-400">
                  {sec.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {/* DESKTOP GRID */}
        <div className="hidden md:grid grid-cols-3 gap-5 mt-5 text-sm">
          {sections.map((sec) => (
            <div key={sec.title}>
              <h4 className="font-semibold mb-2 text-sm">{sec.title}</h4>
              <ul className="space-y-1 text-gray-400 text-xs">
                {sec.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CONTACT */}
        <div className="mt-4 pt-3 border-t border-gray-800 flex flex-col sm:flex-row gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-400" />
            globalcoordinator@ysrcpnriwing.org
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-400" />
            9515511111
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            www.ysrcongress.com
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="mt-2 text-center text-[11px] text-gray-400">
          © 2025 YSR Congress Party ·
          <a href="#" className="mx-1 hover:text-white">
            Terms
          </a>
          |
          <a href="#" className="mx-1 hover:text-white">
            Privacy
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
