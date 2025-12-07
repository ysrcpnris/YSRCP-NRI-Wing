import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import nriLogo from "./nrilogo.png";
import AuthModal from "./AuthModal";

type HeaderProps = {
onSignUp?: () => void;
};

export default function Header({ onSignUp }: HeaderProps) {
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
const [openJaganMenu, setOpenJaganMenu] = useState(false);
const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
const [showAuth, setShowAuth] = useState(false);

const navigate = useNavigate();
const location = useLocation();

useEffect(() => {
const handleClickOutside = (event: any) => {
if (!event.target.closest(".jagan-dropdown")) {
setOpenJaganMenu(false);
}
};
document.addEventListener("click", handleClickOutside);
return () => document.removeEventListener("click", handleClickOutside);
}, []);

const scrollToSection = (id: string) => {
if (location.pathname !== "/") {
navigate("/");
setTimeout(() => {
const el = document.getElementById(id);
if (el) el.scrollIntoView({ behavior: "smooth" });
}, 400);
} else {
const el = document.getElementById(id);
if (el) el.scrollIntoView({ behavior: "smooth" });
}
setMobileMenuOpen(false);
};

return (
<> <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50"> <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> <div className="flex justify-between items-center h-16">


        {/* Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img src={nriLogo} alt="logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-700">YSRCP NRI Wing</h1>
            <p className="text-xs text-gray-600">Global Unity, Local Impact</p>
          </div>
        </div>

        {/* LIVE Button */}
        <button
          onClick={() => navigate("/live")}
          className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-1 rounded-full font-bold shadow-[0_0_12px_rgba(56,189,248,0.6)] hover:shadow-[0_0_20px_rgba(74,222,128,0.8)] transition duration-300"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300"></span>
          </span>
          LIVE
        </button>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-6 font-medium">
          <button onClick={() => scrollToSection("hero")} className="hover:text-blue-600">Home</button>
          <button onClick={() => scrollToSection("journey")} className="hover:text-blue-600">About</button>
          <button onClick={() => scrollToSection('services')} className="hover:text-blue-600">Services</button>

          {/* Jagan-Mark Dropdown */}
          <div className="relative jagan-dropdown">
            <button
              onClick={() => setOpenJaganMenu(!openJaganMenu)}
              className="font-semibold hover:text-blue-600 flex items-center gap-1"
            >
              Jagan-Mark ▾
            </button>

            {openJaganMenu && (
              <div className="absolute bg-white shadow-lg rounded-md mt-2 w-48 border z-50">
                {/* Development Submenu */}
                <div className="relative group">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 font-medium flex justify-between items-center">
                    Development ▸
                  </button>
                  <div className="absolute left-full top-0 bg-white border shadow-md rounded-md w-52 hidden group-hover:block">
                    <button onClick={() => navigate("/health")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Health</button>
                    <button onClick={() => navigate("/education")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Education</button>
                    <button onClick={() => navigate("/agriculture")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Agriculture</button>
                    <button onClick={() => navigate("/women")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Women Empowerment</button>
                    <button onClick={() => navigate("/students")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Student / Youth</button>
                  </div>
                </div>

                {/* Welfare Submenu */}
                <div className="relative group">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 font-medium flex justify-between items-center">
                    Welfare ▸
                  </button>
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

                <button onClick={() => navigate("/reforms")} className="block w-full text-left px-4 py-2 hover:bg-gray-100">Reforms</button>
              </div>
            )}
          </div>

          <button onClick={() => scrollToSection('glimpse')} className="hover:text-blue-600">Gallery</button>

          {/* Login/Register */}
          <button
            onClick={() => { setAuthMode("signin"); setShowAuth(true); }}
            className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold hover:bg-green-500"
          >
            Login
          </button>
          <button
            onClick={() => { setAuthMode("signup"); setShowAuth(true); }}
            className="bg-blue-600 text-white px-5 py-2 rounded-full font-bold hover:bg-green-500"
          >
            Register
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-gray-700">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden py-4 space-y-3 border-t">
          <button onClick={() => scrollToSection("hero")} className="block w-full text-left py-2">Home</button>
          <button onClick={() => { scrollToSection("journey"); }} className="block w-full text-left py-2">About</button>

          <p className="font-semibold text-gray-800 px-2 pt-2">Jagan-Mark</p>
          <button onClick={() => navigate('/development')} className="block w-full text-left py-2 pl-4">Development</button>
          <button onClick={() => navigate('/welfare')} className="block w-full text-left py-2 pl-4">Welfare</button>
          <button onClick={() => navigate('/reforms')} className="block w-full text-left py-2 pl-4">Reforms</button>

          <button onClick={() => { scrollToSection('services'); }} className="block w-full text-left py-2">Services</button>
          <button onClick={() => { scrollToSection('glimpse'); }} className="block w-full text-left py-2">Gallery</button>

          <button
            onClick={() => { setAuthMode("signin"); setShowAuth(true); setMobileMenuOpen(false); }}
            className="w-full bg-blue-600 text-white py-2 rounded-full font-bold hover:bg-green-500"
          >
            Login
          </button>
          <button
            onClick={() => { setAuthMode("signup"); setShowAuth(true); setMobileMenuOpen(false); }}
            className="w-full bg-blue-600 text-white py-2 rounded-full font-bold hover:bg-green-500"
          >
            Register
          </button>
        </div>
      )}
    </nav>
  </header>

  {/* Auth Modal */}
  {showAuth && (
    <AuthModal
      mode={authMode}
      onClose={() => setShowAuth(false)}
      onSwitchMode={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
    />
  )}
</>


);
}
