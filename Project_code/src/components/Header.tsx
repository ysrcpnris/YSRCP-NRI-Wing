import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import nriLogo from './nrilogo.png';

type HeaderProps = {
  onSignIn: () => void;
  onSignUp: () => void;
};

export default function Header({ onSignIn, onSignUp }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openJaganMenu, setOpenJaganMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close Jagan menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (!event.target.closest('.jagan-dropdown')) {
        setOpenJaganMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // ✅ Enhanced scroll handler that works from any page
  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      // If user is not on home page, go to home first, then scroll
      navigate('/');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 400);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src={nriLogo} alt="NRI Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-blue-700">YSRCP NRI Wing</h1>
              <p className="text-xs text-gray-600">Global Unity, Local Impact</p>
            </div>
          </div>
          
          {/* Live Button */}
          {/*<button className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md font-semibold animate-pulse">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-ping"></span>LIVE
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-1 rounded-full font-semibold shadow-[0_0_10px_rgba(34,197,94,0.6)]">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
              </span>Live
          </button>*/}

          <button className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-1 rounded-full font-bold shadow-[0_0_12px_rgba(56,189,248,0.6)] hover:shadow-[0_0_20px_rgba(74,222,128,0.8)] transition duration-300">
            {/* Blinking Star Dot */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300 shadow-[0_0_6px_rgba(250,204,21,0.8)]"></span>
              </span>
              {/* Text */}
              <span className="tracking-widest uppercase font-extrabold drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]">
                LIVE </span>
          </button>

          




          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            <button onClick={() => scrollToSection('hero')} className="text-gray-700 hover:text-blue-600 transition">Home</button>
            <button onClick={() => scrollToSection('about')} className="text-gray-700 hover:text-blue-600 transition">About</button>
            <button onClick={() => scrollToSection('student-assistance')} className="text-gray-700 hover:text-blue-600 transition">Services</button>

            {/* ✅ Jagan-Mark Dropdown */}
            <div className="relative jagan-dropdown">
              <button
                onClick={() => setOpenJaganMenu(!openJaganMenu)}
                className="text-gray-700 hover:text-blue-600 transition font-semibold flex items-center gap-1"
              >
                Jagan-Mark ▾
              </button>

              {openJaganMenu && (
                <div className="absolute bg-white shadow-lg rounded-md mt-2 w-48 border z-50">

                  {/* Development main item with nested submenu */}
                  <div className="relative group">
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 font-medium flex justify-between items-center">
                      Development ▸
                    </button>

                    {/* Second-level submenu */}
                    <div className="absolute left-full top-0 bg-white border shadow-md rounded-md w-52 hidden group-hover:block">
                      <button onClick={() => navigate('/health')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Health</button>
                      <button onClick={() => navigate('/education')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Education</button>
                      <button onClick={() => navigate('/agriculture')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Agriculture</button>
                      <button onClick={() => navigate('/women')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Women Empowerment</button>
                      <button onClick={() => navigate('/students')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Student / Youth</button>
                    </div>
                  </div>

                  {/* Welfare main item with nested submenu */}
                  <div className="relative group">
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 font-medium flex justify-between items-center">
                      Welfare ▸
                    </button>

                    {/* Second-level submenu for Welfare schemes */}
                    <div className="absolute left-full top-0 bg-white border shadow-md rounded-md w-64 hidden group-hover:block">
                      <button onClick={() => navigate('/welfare/amma-vodi')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Amma Vodi</button>
                      <button onClick={() => navigate('/welfare/vidya-deevena')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Vidya Deevena</button>
                      <button onClick={() => navigate('/welfare/vasathi-deevena')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Vasathi Deevena</button>
                      <button onClick={() => navigate('/welfare/nri-connect')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna NRI Connect</button>
                      <button onClick={() => navigate('/welfare/gorumudda')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Gorumudda</button>
                      <button onClick={() => navigate('/welfare/cheyutha')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Cheyutha</button>
                      <button onClick={() => navigate('/welfare/yuvanestham')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Jagananna Yuvanestham</button>
                    </div>
                  </div>

                  {/* Remaining top-level links */}
                  <button onClick={() => navigate('/reforms')} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Reforms</button>
                </div>
              )}
            </div>

            <button onClick={() => scrollToSection('contact')} className="text-gray-700 hover:text-blue-600 transition">Suggestions</button>
            <button onClick={onSignIn} className="text-blue-600 hover:text-blue-700 font-medium transition">Sign In</button>
            <button
              onClick={onSignUp}
              className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-full hover:shadow-lg transition"
            >
              Register
            </button>
            <button onClick={() => scrollToSection('socialmedia')} className="text-gray-700 hover:text-blue-600 transition">Social Media</button>
          </div>

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-700">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* ✅ Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t">
            <button onClick={() => scrollToSection('hero')} className="block w-full text-left py-2">Home</button>
            <button onClick={() => scrollToSection('about')} className="block w-full text-left py-2">About</button>
            <p className="font-semibold text-gray-800 px-2 pt-2">Jagan-Mark</p>
            <button onClick={() => navigate('/development')} className="block w-full text-left py-2 pl-4">Development</button>
            <button onClick={() => navigate('/welfare')} className="block w-full text-left py-2 pl-4">Welfare</button>
            <button onClick={() => navigate('/reforms')} className="block w-full text-left py-2 pl-4">Reforms</button>
            <button onClick={() => scrollToSection('student-assistance')} className="block w-full text-left py-2">Services</button>
            <button onClick={() => scrollToSection('suggestions')} className="block w-full text-left py-2">Suggestions</button>
            <button onClick={onSignIn} className="text-blue-600 block w-full text-left font-medium py-2">Sign In</button>
            <button onClick={onSignUp} className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-2 rounded-full">
              Register
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
