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
      <div className="absolute inset-0 opacity-10">
        <img 
          src="/ECOd9I9UYAAkV4h.jpg" 
          alt="YSRCP Background" 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">YSRCP</h3>
                <p className="text-gray-400 text-sm">NRI Portal</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Connecting Non-Resident Indians worldwide with the YSR Congress Party. 
              Building bridges between Andhra Pradesh and the global Telugu community.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">NRI Services</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {footerLinks.quickLinks.map((link, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6">Regional Presence</h4>
            <ul className="space-y-3 mb-6">
              {footerLinks.regions.map((region, index) => (
                <li key={index}>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {region}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="grid md:grid-cols-3 gap-6">
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

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © 2025 YSR Congress Party. All rights reserved. | 
            <a href="#" className="hover:text-white transition-colors"> Terms of Service</a> | 
            <a href="#" className="hover:text-white transition-colors"> Privacy Policy</a> | 
            <a href="#" className="hover:text-white transition-colors"> Cookie Policy</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;