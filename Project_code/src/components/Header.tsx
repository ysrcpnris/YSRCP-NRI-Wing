import React, { useState } from 'react';
import { Menu, X, User, LayoutDashboard } from 'lucide-react';

interface HeaderProps {
  onRegisterClick: () => void;
  onLoginClick: () => void;
  isLoggedIn?: boolean;
  onDashboardClick?: () => void;
  onPillarsClick?: () => void; // New callback for screen navigation
}

const Header: React.FC<HeaderProps> = ({ 
  onRegisterClick, 
  onLoginClick, 
  isLoggedIn = false, 
  onDashboardClick,
  onPillarsClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  const handlePillarsClick = () => {
    if (onPillarsClick) {
      onPillarsClick();
      setIsMenuOpen(false);
    } else {
      scrollToSection('section-pillars');
    }
  };

  return (
    <header className="sticky top-0 left-0 w-full bg-white/95 backdrop-blur-sm z-50 px-6 py-3 shadow-sm transition-all duration-300 flex justify-between items-center border-b border-gray-100">
      <div className="text-xl md:text-2xl font-black text-ysrcp-blue flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
        <div className="w-8 h-8 bg-ysrcp-blue rounded flex items-center justify-center text-white font-bold text-xs shadow-lg">YSRC</div>
        <span className="tracking-tight">Global NRI</span>
      </div>

      {/* Desktop Nav */}
      <nav className="hidden xl:flex items-center gap-6 font-bold text-xs uppercase tracking-wide">
        <button onClick={() => scrollToSection('section-2')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Our Journey</button>
        <button onClick={handlePillarsClick} className="text-ysrcp-blue font-black hover:bg-blue-50 px-3 py-1 rounded border border-blue-100">10 Pillars</button>
        <button onClick={() => scrollToSection('section-3')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Services</button>
        <button onClick={() => scrollToSection('section-4')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Jagan Mark</button>
        <button onClick={() => scrollToSection('section-5')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Leader's Message</button>
        <button onClick={() => scrollToSection('section-6')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Links</button>
        <button onClick={() => scrollToSection('section-7')} className="text-gray-600 hover:text-ysrcp-blue transition-colors hover:bg-blue-50 px-3 py-1 rounded">Gallery</button>
        
        <div className="ml-2 flex gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
               <button 
                className="px-4 py-2 bg-blue-50 text-ysrcp-blue font-bold rounded-md hover:bg-blue-100 transition-all uppercase text-xs flex items-center gap-2"
                onClick={onDashboardClick}
               >
                <LayoutDashboard size={16} /> Dashboard
               </button>
               <div className="w-8 h-8 bg-ysrcp-green rounded-full flex items-center justify-center text-white font-bold cursor-pointer" onClick={onDashboardClick}>
                 <User size={16} />
               </div>
            </div>
          ) : (
            <>
              <button 
                className="px-5 py-2 border-2 border-ysrcp-blue text-ysrcp-blue font-bold rounded-md hover:bg-ysrcp-blue hover:text-white transition-all uppercase text-xs"
                onClick={onLoginClick}
              >
                Login
              </button>
              <button 
                className="px-5 py-2 bg-ysrcp-green text-white font-bold rounded-md hover:bg-green-700 transition-all uppercase text-xs shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                onClick={onRegisterClick}
              >
                Register
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile Menu Toggle */}
      <button className="xl:hidden text-ysrcp-blue p-2" onClick={toggleMenu}>
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-t shadow-xl flex flex-col p-6 space-y-4 xl:hidden animate-fade-in z-50 h-screen">
          <button onClick={() => scrollToSection('section-2')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Our Journey</button>
          <button onClick={handlePillarsClick} className="text-left text-ysrcp-blue font-black text-lg border-b pb-2">10 Pillars</button>
          <button onClick={() => scrollToSection('section-3')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Services</button>
          <button onClick={() => scrollToSection('section-4')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Jagan Mark</button>
          <button onClick={() => scrollToSection('section-5')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Leader's Message</button>
          <button onClick={() => scrollToSection('section-6')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Links</button>
          <button onClick={() => scrollToSection('section-7')} className="text-left text-ysrcp-blue font-bold text-lg border-b pb-2">Gallery</button>
          
          <div className="flex flex-col gap-3 mt-4">
             {isLoggedIn ? (
                <button 
                    className="w-full py-3 bg-ysrcp-blue text-white font-bold rounded uppercase flex items-center justify-center gap-2"
                    onClick={() => { onDashboardClick && onDashboardClick(); toggleMenu(); }}
                >
                    <LayoutDashboard size={18} /> My Dashboard
                </button>
             ) : (
                <>
                    <button className="w-full py-3 border-2 border-ysrcp-blue text-ysrcp-blue font-bold rounded uppercase" onClick={() => { onLoginClick(); toggleMenu();}}>Login</button>
                    <button 
                        className="w-full py-3 bg-ysrcp-green text-white font-bold rounded uppercase shadow-md" 
                        onClick={() => {
                            onRegisterClick(); 
                            toggleMenu();
                        }}
                    >
                        Register
                    </button>
                </>
             )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
