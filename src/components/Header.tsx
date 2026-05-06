import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import nriLogo from "./nrilogo.png";
import AuthModal from "./AuthModal";
import { supabase } from "../lib/supabase";

type HeaderProps = {
  onSignUp?: () => void;
};

export default function Header({ onSignUp }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openJaganMenu, setOpenJaganMenu] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showAuth, setShowAuth] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Live press-meet link, set by admin in Content Control. When present we
  // show a pulsing "Watch Live" pill in the navbar that opens the URL in a
  // new tab. When the active row is empty/null, the pill is hidden.
  const [liveLink, setLiveLink] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("content_live_links")
        .select("live_url")
        .eq("is_active", true)
        .maybeSingle();
      if (!alive) return;
      const url = (data?.live_url || "").trim();
      setLiveLink(url || null);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  // Shrink + shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    const doScroll = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const headerEl = document.querySelector("header") as HTMLElement | null;
      const headerHeight = headerEl ? headerEl.offsetHeight : 80;
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top, behavior: "smooth" });
      setMobileMenuOpen(false);
    };

    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(doScroll, 400);
    } else {
      doScroll();
    }
  };

  const navLink =
    "relative text-gray-700 hover:text-primary-600 transition-colors duration-200 font-medium " +
    "after:content-[''] after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 after:bg-primary-600 after:transition-all after:duration-300 hover:after:w-full";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-md shadow-md"
            : "bg-white/85 backdrop-blur-sm shadow-sm"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex justify-between items-center transition-all duration-300 ${
              scrolled ? "h-14" : "h-16"
            }`}
          >
            {/* Logo */}
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary-100 group-hover:ring-primary-300 transition-all duration-300">
                <img src={nriLogo} alt="logo" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base lg:text-lg font-bold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent leading-tight">
                  YSRCP NRI Wing
                </h1>
                <p className="text-[10px] lg:text-xs text-gray-500 tracking-wide">
                  Global Unity, Local Impact
                </p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
              <button onClick={() => scrollToSection("hero")} className={navLink}>
                Home
              </button>
              <button onClick={() => navigate("/about")} className={navLink}>
                About
              </button>
              <button onClick={() => scrollToSection("services")} className={navLink}>
                Services
              </button>
              <div
                className="relative jagan-dropdown"
                onMouseEnter={() => setOpenJaganMenu(true)}
                onMouseLeave={() => setOpenJaganMenu(false)}
              >
                <button
                  onClick={() => scrollToSection("section-pillars")}
                  className={navLink}
                >
                  Jagan-Mark
                </button>
              </div>
              <button onClick={() => scrollToSection("glimpse")} className={navLink}>
                Gallery
              </button>

              {/* Watch Live — only when admin has configured a live URL */}
              {liveLink && (
                <a
                  href={liveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Watch live press meet"
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 hover:border-rose-300 transition"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>LIVE</span>
                </a>
              )}

              {/* Desktop Login/Register Buttons */}
              <button
                onClick={() => {
                  setAuthMode("signin");
                  setShowAuth(true);
                }}
                className="px-5 py-2 text-sm font-semibold text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-all duration-200"
              >
                Login
              </button>

              <button
                onClick={() => navigate("/register")}
                className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                Register
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ${
              mobileMenuOpen ? "max-h-[500px] pb-4" : "max-h-0"
            }`}
          >
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <button
                onClick={() => scrollToSection("hero")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                Home
              </button>
              <button
                onClick={() => navigate("/about")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                About
              </button>
              <button
                onClick={() => scrollToSection("services")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                Services
              </button>
              <button
                onClick={() => scrollToSection("section-pillars")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                Jagan-Mark
              </button>
              <button
                onClick={() => scrollToSection("glimpse")}
                className="block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                Gallery
              </button>

              {liveLink && (
                <a
                  href={liveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span>LIVE — Watch press meet</span>
                </a>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  onClick={() => {
                    setAuthMode("signin");
                    setShowAuth(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50 transition"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    navigate("/register");
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg shadow-sm hover:shadow-md transition"
                >
                  Register
                </button>
              </div>
            </div>
          </div>
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
