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
import nriLogo from "./nrilogo.png";

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

  const footerSocialLinks = [
    { icon: Facebook, url: "https://www.instagram.com/ysrcongress/?hl=en", label: "Facebook" },
    { icon: Twitter, url: "https://x.com/YSRCParty", label: "Twitter" },
    { icon: Instagram, url: "https://www.instagram.com/ysrcongress/?hl=en", label: "Instagram" },
    { icon: Youtube, url: "https://www.youtube.com/@ysrcpofficial", label: "YouTube" },
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
                    <li key={i} className="hover:text-white cursor-pointer transition">
                      {item}
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
                  <li
                    key={i}
                    className="hover:text-white hover:translate-x-1 transition-all duration-200 cursor-pointer"
                  >
                    {item}
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
