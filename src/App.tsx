import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { supabase } from "./lib/supabase";

import Header from "./components/Header";
import Hero from "./components/Hero";
import ProtectedRoute from "./routes/ProtectedRoute";

import About from "./components/About";
import Mission from "./components/Mission";
import Initiatives from "./components/Initiatives";
import TenPillars from "./components/TenPillar";
import PillarPage from "./components/PillarPage";
import PillarDetailWrapper from "./components/PillarDetailWrapper";
import Events from "./components/Events";
import News from "./components/News";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import EmailVerifiedPage from "./pages/EmailVerifiedPage";
import Contact from "./components/Contact";
import ImpactMap from "./components/ImpactMap";
import Testimonials from "./components/Testimonials";
import Glimpse from "./components/Glimpse";
import Footer from "./components/Footer";
import AuthModal from "./components/AuthModal";
import SocialMedia from "./components/SocialMedia";
import PoliticalJourney from "./components/PoliticalJourney";

import Health from "./pages/Health";
import Agriculture from "./pages/Agriculture";
import Education from "./pages/Education";
import Women from "./pages/Women";
import StudentYouth from "./pages/Studentyouth";
import ReferralRedirect from "./pages/ReferralRedirect";

import AmmaVodi from "./pages/AmmaVodi";
import NewsDetail from "./pages/NewsDetail";
import VidyaDeevena from "./pages/VidyaDeevena";
import VasathiDeevena from "./pages/VasathiDeevena";
import NriConnect from "./pages/NriConnect";
import Gorumudda from "./pages/Gorumudda";
import Cheyutha from "./pages/Cheyutha";
import Yuvanestham from "./pages/Yuvanestham";
import LiveStreamPage from "./pages/LiveStream";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordConfirmPage from "./pages/ResetPasswordConfirmPage";

import AdminDashboard from "./AdminDashboard/AdminDashboard";
import AdminRoute from "./routes/AdminRoute";
import ChangePassword from "./AdminDashboard/ChangePassword";

import Dashboard from "./components/Dashboard";

import SupportTeamAuthPage from "./pages/SupportTeamAuthPage";
import SupportTeamDashboard from "./pages/SupportTeamDashboard";
import SupportTeamRoute from "./routes/SupportTeamRoute";

function MainLandingPage({
  setAuthMode,
  setShowAuthModal,
  showAuthModal,
  authMode,
}: any) {
  return (
    <div className="min-h-screen bg-white">
      <Header
        onSignIn={() => {
          setAuthMode("signin");
          setShowAuthModal(true);
        }}
        onSignUp={() => {
          setAuthMode("signup");
          setShowAuthModal(true);
        }}
      />

      <Hero
        onJoinNow={() => {
          setAuthMode("signup");
          setShowAuthModal(true);
        }}
      />

      <Mission />
      <PoliticalJourney />
      <Initiatives />
      <TenPillars />
      <Events />
      <News />
      <Contact setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />
      <ImpactMap />
      <Testimonials />
      <SocialMedia />
      <Glimpse />
      <Footer />

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() =>
            setAuthMode(authMode === "signin" ? "signup" : "signin")
          }
        />
      )}
    </div>
  );
}

function AppContent() {
  const { loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  useEffect(() => {
    const blockedRoutes = ["/verify-email", "/email-verified"];

    if (
      location.state?.openLogin &&
      !blockedRoutes.includes(location.pathname)
    ) {
      setAuthMode("signin");
      setShowAuthModal(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, location.pathname]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        navigate("/reset-password-confirm", { replace: true });
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  // ============================================================
  // SPECIAL GUARD:
  // If the user is visiting the email verification pages, render
  // only those routes (and the auth modal) to prevent other global
  // redirect logic from immediately sending them to "/".
  // This ensures the user actually sees the "Email Verified" screen.
  // ============================================================
  if (location.pathname === "/email-verified" || location.pathname === "/verify-email") {
    return (
      <>
        <Routes>
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/email-verified" element={<EmailVerifiedPage />} />
        </Routes>

        {showAuthModal && (
          <AuthModal
            mode={authMode}
            onClose={() => setShowAuthModal(false)}
            onSwitchMode={() =>
              setAuthMode(authMode === "signin" ? "signup" : "signin")
            }
          />
        )}
      </>
    );
  }
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <MainLandingPage
              setAuthMode={setAuthMode}
              setShowAuthModal={setShowAuthModal}
              showAuthModal={showAuthModal}
              authMode={authMode}
            />
          }
        />

        <Route path="/live" element={<LiveStreamPage />} />
        <Route path="/health" element={<Health setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/education" element={<Education setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/agriculture" element={<Agriculture setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/women" element={<Women setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/students" element={<StudentYouth setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
         <Route
  path="/reset-password-confirm"
  element={<ResetPasswordConfirmPage />}
/>
<Route path="/verify-email" element={<VerifyEmailPage />} />
<Route path="/email-verified" element={<EmailVerifiedPage />} />
 
        <Route path="/suggestions" element={<Navigate to="/glimpse" replace />} />
        <Route path="/glimpse" element={<Glimpse />} />
        <Route path="/ref/:code" element={<ReferralRedirect />} />

        <Route
          path="/about"
          element={
            <div className="min-h-screen bg-white flex flex-col">
              <Header
                onSignIn={() => {
                  setAuthMode("signin");
                  setShowAuthModal(true);
                }}
                onSignUp={() => {
                  setAuthMode("signup");
                  setShowAuthModal(true);
                }}
              />
              <main className="flex-1">
                <About />
              </main>
              <Footer />
            </div>
          }
        />

        <Route path="/services" element={<Initiatives />} />
        <Route path="/pillars" element={<PillarPage onBack={() => window.history.back()} onPillarSelect={() => {}} />} />
        <Route path="/pillars/:id" element={<PillarDetailWrapper />} />
        <Route path="/news/:id" element={<NewsDetail setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />

        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <AdminRoute>
              <ChangePassword />
            </AdminRoute>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Support team auth (unified login + register) */}
        <Route path="/support-teams" element={<SupportTeamAuthPage />} />
        {/* Support team dashboard */}
        <Route
          path="/support-team/dashboard"
          element={
            <SupportTeamRoute>
              <SupportTeamDashboard />
            </SupportTeamRoute>
          }
        />
      </Routes>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() =>
            setAuthMode(authMode === "signin" ? "signup" : "signin")
          }
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
