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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (!event.target.closest(".jagan-dropdown")) {
        setOpenJaganMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Smooth scroll logic
  const scrollToSection = (id: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: "smooth" });
      }, 400);
    } else {
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-lg shadow-md z-50">
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
              className="relative hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-green-500 text-white px-4 py-1 rounded-full font-bold"
            >
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-300"></span>
              </span>
              LIVE
            </button>

            {/* DESKTOP MENU */}
            <div className="hidden md:flex items-center space-x-6 font-medium">

              <button onClick={() => scrollToSection("hero")} className="hover:text-blue-600">
                Home
              </button>

              <button onClick={() => scrollToSection("about")} className="hover:text-blue-600">
                About
              </button>

              <button onClick={() => scrollToSection("student-assistance")} className="hover:text-blue-600">
                Services
              </button>

              {/* JAGAN Dropdown */}
              <div className="relative jagan-dropdown">
                <button
                  onClick={() => setOpenJaganMenu(!openJaganMenu)}
                  className="font-semibold hover:text-blue-600"
                >
                  Jagan-Mark ▾
                </button>

                {openJaganMenu && (
                  <div className="absolute bg-white shadow-md rounded-md mt-2 w-48 border z-50 right-0">
                    <button className="px-4 py-2 w-full text-left hover:bg-gray-100">
                      Development
                    </button>

                    <button className="px-4 py-2 w-full text-left hover:bg-gray-100">
                      Welfare
                    </button>

                    <button
                      onClick={() => navigate("/reforms")}
                      className="px-4 py-2 w-full text-left hover:bg-gray-100"
                    >
                      Reforms
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => scrollToSection("suggestions")} className="hover:text-blue-600">
                Suggestions
              </button>

              {/* Login */}
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setShowAuth(true);
                }}
                className="bg-blue-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-green-600 transition"
              >
                Login
              </button>

              {/* Register */}
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuth(true);
                }}
                className="bg-blue-600 text-white px-5 py-2 rounded-md font-semibold hover:bg-green-600 transition"
              >
                Register
              </button>
            </div>

            {/* MOBILE MENU BUTTON */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700"
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>

          {/* MOBILE MENU */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-4 border-t font-medium">

              <button onClick={() => scrollToSection("hero")} className="block w-full text-left">
                Home
              </button>

              <button onClick={() => scrollToSection("about")} className="block w-full text-left">
                About
              </button>

              <button onClick={() => scrollToSection("student-assistance")} className="block w-full text-left">
                Services
              </button>

              <button onClick={() => scrollToSection("suggestions")} className="block w-full text-left">
                Suggestions
              </button>

              {/* Mobile Login */}
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setShowAuth(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-md font-bold hover:bg-green-600"
              >
                Login
              </button>

              {/* Mobile Register */}
              <button
                onClick={() => {
                  setAuthMode("signup");
                  setShowAuth(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-md font-bold hover:bg-green-600"
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
