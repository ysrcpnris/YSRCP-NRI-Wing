import React from "react";
import { Globe, Mail, Phone, Facebook, Twitter, Instagram, Youtube } from "lucide-react";

const Footer: React.FC = () => {
  const footerLinks = {
    services: [
      "Document Services",
      "Property Assistance",
      "Business Support",
      "Education Services",
      "Legal Help",
      "Investment Guidance",
    ],
    quickLinks: [
      "About YSRCP",
      "Leadership",
      "Policies",
      "Press Releases",
      "Career Opportunities",
      "Privacy Policy",
    ],
    regions: [
      "USA & Canada",
      "Middle East",
      "Europe & UK",
      "Australia & New Zealand",
      "Singapore & Malaysia",
      "Other Regions",
    ],
  };

  return (
    <footer className="relative bg-gray-900 text-white">
      {/* BACKGROUND IMAGE */}
      <div className="absolute inset-0 opacity-10 hidden md:block">
        <img
          src="/ECOd9I9UYAAkV4h.jpg"
          alt="YSRCP Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
        {/* TOP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* LOGO + SOCIAL */}
          <div>
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">YSRCP</h3>
                <p className="text-gray-400 text-sm">NRI Portal</p>
              </div>
            </div>

            <p className="text-gray-400 mb-6 text-sm leading-relaxed">
              Connecting Non-Resident Indians worldwide with the YSR Congress Party.
            </p>

            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* SERVICES */}
          <div>
            <h4 className="text-lg font-semibold mb-4">NRI Services</h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.services.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.quickLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* REGIONS */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Regional Presence</h4>
            <ul className="space-y-2 text-sm">
              {footerLinks.regions.map((region, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white">
                    {region}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CONTACT INFO */}
        <div className="border-t border-gray-800 mt-10 pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-gray-400">nri@ysrcp.in</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Phone className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">24/7 Helpline</p>
              <p className="text-gray-400">+91-40-1234-5678</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium">Website</p>
              <p className="text-gray-400">www.ysrcp.in</p>
            </div>
          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-gray-400 text-xs">
          © 2025 YSR Congress Party. All rights reserved.
          <div className="mt-2">
            <a href="#" className="hover:text-white mx-1">Terms</a> |
            <a href="#" className="hover:text-white mx-1">Privacy</a> |
            <a href="#" className="hover:text-white mx-1">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
