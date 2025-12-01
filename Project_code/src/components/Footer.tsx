import React from 'react';
import { Globe, Mail, Phone, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const Footer: React.FC = () => {
  const footerLinks = {
    services: [
      'Document Services',
      'Property Assistance',
      'Business Support',
      'Education Services',
      'Legal Help',
      'Investment Guidance'
    ],
    quickLinks: [
      'About YSRCP',
      'Leadership',
      'Policies',
      'Press Releases',
      'Career Opportunities',
      'Privacy Policy'
    ],
    regions: [
      'USA & Canada',
      'Middle East',
      'Europe & UK',
      'Australia & New Zealand',
      'Singapore & Malaysia',
      'Other Regions'
    ]
  };

  return (
    <footer className="bg-gray-900 text-white relative">
      {/* Background image */}
      <div className="absolute inset-0 opacity-10">
        <img 
          src="/ECOd9I9UYAAkV4h.jpg" 
          alt="YSRCP Background" 
          className="w-full h-full object-cover"
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-16">

        {/* TOP GRID */}
        <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-12">
          
          {/* LOGO + SOCIAL ICONS */}
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 
              rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">YSRCP</h3>
                <p className="text-gray-400 text-sm">NRI Portal</p>
              </div>
            </div>

            <p className="text-gray-400 mb-6 leading-relaxed text-sm md:text-base">
              Connecting Non-Resident Indians worldwide with the YSR Congress Party. 
              Building bridges between Andhra Pradesh and the global Telugu community.
            </p>

            {/* Social Icons */}
            <div className="flex space-x-4 sm:justify-start justify-center">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center 
                  hover:bg-blue-700 transition-all"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* SERVICES */}
          <div>
            <h4 className="text-lg font-semibold mb-6">NRI Services</h4>
            <ul className="space-y-3 text-sm md:text-base">
              {footerLinks.services.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* QUICK LINKS */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm md:text-base">
              {footerLinks.quickLinks.map((link, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* REGIONS */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Regional Presence</h4>
            <ul className="space-y-3 text-sm md:text-base">
              {footerLinks.regions.map((region, i) => (
                <li key={i}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {region}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CONTACT GRID */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 text-sm md:text-base">

            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Email Support</p>
                <p className="text-gray-400 text-sm">nri@ysrcp.in</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Phone className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">24/7 Helpline</p>
                <p className="text-gray-400 text-sm">+91-40-1234-5678</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Globe className="w-5 h-5 text-blue-400" />
              <div>
                <p className="font-medium">Website</p>
                <p className="text-gray-400 text-sm">www.ysrcp.in</p>
              </div>
            </div>

          </div>
        </div>

        {/* COPYRIGHT */}
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-gray-400 text-xs md:text-sm leading-relaxed">
          © 2025 YSR Congress Party. All rights reserved.
          <br className="sm:hidden" />
          <span className="ml-1">
            | <a href="#" className="hover:text-white">Terms of Service</a>
            | <a href="#" className="hover:text-white ml-1">Privacy Policy</a>
            | <a href="#" className="hover:text-white ml-1">Cookie Policy</a>
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
