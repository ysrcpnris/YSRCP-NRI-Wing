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

  // NEW → AuthModal Controls
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
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* LOGO */}
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <img src={nriLogo} alt="logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-blue-700">YSRCP NRI Wing</h1>
                <p className="text-xs text-gray-600">Global Unity, Local Impact</p>
              </div>
            </div>

            {/* LIVE BUTTON */}
            <button
              onClick={() => navigate("/live")}
              className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-1 rounded-full font-bold"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300"></span>
              </span>
              LIVE
            </button>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center space-x-6">
              <button onClick={() => scrollToSection("hero")}>Home</button>
              <button onClick={() => scrollToSection("about")}>About</button>
              <button onClick={() => scrollToSection("student-assistance")}>
                Services
              </button>

              {/* JAGAN Dropdown */}
              <div className="relative jagan-dropdown">
                <button
                  onClick={() => setOpenJaganMenu(!openJaganMenu)}
                  className="font-semibold"
                >
                  Jagan-Mark ▾
                </button>

                {openJaganMenu && (
                  <div className="absolute bg-white shadow-lg rounded-md mt-2 w-48 border z-50">
                    <button className="px-4 py-2 block w-full text-left hover:bg-gray-100">
                      Development
                    </button>
                    <button className="px-4 py-2 block w-full text-left hover:bg-gray-100">
                      Welfare
                    </button>
                    <button
                      onClick={() => navigate("/reforms")}
                      className="px-4 py-2 block w-full text-left hover:bg-gray-100"
                    >
                      Reforms
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => scrollToSection("suggestions")}>
                Suggestions
              </button>

              {/* LOGIN opens AuthModal */}
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setShowAuth(true);
                }}
                className="bg-blue-600 text-white px-6 py-2 font-bold hover:bg-green-500 rounded-md"
              >
                Login
              </button>

              {/* REGISTER opens AuthModal */}
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuth(true);
                }}
                className="bg-blue-600 text-white px-6 py-2 font-bold hover:bg-green-500 rounded-md"
              >
                Register
              </button>
            </div>

            {/* BURGER ICON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* MOBILE MENU */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-3 border-t">
              <button onClick={() => scrollToSection("hero")}>Home</button>
              <button onClick={() => scrollToSection("about")}>About</button>
              <button onClick={() => scrollToSection("student-assistance")}>
                Services
              </button>
              <button onClick={() => scrollToSection("suggestions")}>
                Suggestions
              </button>

              {/* MOBILE LOGIN */}
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setShowAuth(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-blue-600 text-white px-6 py-2 font-bold hover:bg-green-500 rounded-md"
              >
                Login
              </button>

              {/* MOBILE REGISTER */}
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuth(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-blue-600 text-white px-6 py-2 font-bold hover:bg-green-500 rounded-md"
              >
                Register
              </button>
            </div>
          )}
        </nav>
      </header>

      {/* AUTH MODAL */}
      {showAuth && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSwitchMode={() =>
            setAuthMode(authMode === "signin" ? "signup" : "signin")
          }
        />
      )}
    </>
  );
}
