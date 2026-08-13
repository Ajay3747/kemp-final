import React from 'react';
import { Instagram } from 'lucide-react';
import { POWERED_BY_TEXT } from '../config/branding';

// X (formerly Twitter) icon component
const XIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

export default function Footer() {
  const scrollToAbout = () => {
    // If already on home page, scroll to section
    if (window.location.pathname === '/home') {
      const element = document.getElementById('about-us');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // Navigate to home and then scroll
      window.location.href = '/home#about-us';
    }
  };

  return (
    <footer className="bg-gray-950 text-gray-400 py-12 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-8 md:space-y-0">
          
          {/* Brand and Slogan */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className="text-yellow-400 text-3xl font-extrabold tracking-tight mb-2">
              KONGU<span className="text-white"> E-MARKET PLACE</span>
            </h1>
            <p className="text-gray-500 max-w-xs">
              Your one-stop marketplace for everything on campus.
            </p>
          </div>
          
          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-8 text-center md:text-left">
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><button onClick={scrollToAbout} className="hover:text-yellow-400 transition-colors">About Us</button></li>
                <li><a href="#" className="hover:text-yellow-400 transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-bold text-white mb-4">Policies</h4>
              <ul className="space-y-2">
                <li><a href="#" className="hover:text-yellow-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-yellow-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-yellow-400 transition-colors">Refunds</a></li>
              </ul>
            </div>
          </div>
          
          {/* Social Media */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <h4 className="text-lg font-bold text-white mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://www.instagram.com/kongu_emp?igsh=MWUwZXhuMDU3NjhjdQ==" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors transform hover:scale-110">
                <Instagram size={24} />
              </a>
              <a href="https://x.com/AjayKs1186796" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition-colors transform hover:scale-110">
                <XIcon size={24} />
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-gray-800 text-center space-y-1.5">
          <p className="text-sm text-gray-600">
            &copy; 2025 KONGU E-MARKET PLACE. All rights reserved.
          </p>
          <p className="text-xs text-gray-600 tracking-wide">
            {POWERED_BY_TEXT}
          </p>
        </div>
      </div>
    </footer>
  );
}