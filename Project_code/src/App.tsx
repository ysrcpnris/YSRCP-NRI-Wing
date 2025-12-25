import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Mission from './components/Mission';
import Initiatives from './components/Initiatives';
import TenPillars from './components/TenPillar';
import PillarPage from './components/PillarPage';
import PillarDetailWrapper from './components/PillarDetailWrapper';
import Development from './components/development';
import Events from './components/Events';
import News from './components/News';
import Contact from './components/Contact';
import ImpactMap from './components/ImpactMap';
import Testimonials from './components/Testimonials';
import Glimpse from './components/Glimpse';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import SocialMedia from './components/SocialMedia';
import JaganMark from './components/JaganMark';
import PoliticalJourney from './components/PoliticalJourney';

import Health from './pages/Health';
import Agriculture from './pages/Agriculture';
import Education from './pages/Education';
import Women from './pages/Women';
import StudentYouth from './pages/Studentyouth';
import ReferralRedirect from "./pages/ReferralRedirect";

import AmmaVodi from './pages/AmmaVodi';
import VidyaDeevena from './pages/VidyaDeevena';
import VasathiDeevena from './pages/VasathiDeevena';
import NriConnect from './pages/NriConnect';
import Gorumudda from './pages/Gorumudda';
import Cheyutha from './pages/Cheyutha';
import Yuvanestham from './pages/Yuvanestham';
import LiveStreamPage from './pages/LiveStream';
import RegisterPage from './pages/RegisterPage';

// ✅ ADMIN
import AdminLogin from './AdminDashboard/AdminLogin';
import AdminDashboard from './AdminDashboard/AdminDashboard';
import AdminRoute from './routes/AdminRoute';

// ✅ PROFESSION DASHBOARDS
import JobDashboard from "./components/dashboard/JobDashboard";
import BusinessDashboard from "./components/dashboard/BusinessDashboard";
import StudentDashboard from "./components/dashboard/StudentDashboard";

function MainLandingPage({
  setAuthMode,
  setShowAuthModal,
  showAuthModal,
  authMode,
}) {
  return (
    <div className="min-h-screen bg-white">
      <Header
        onSignIn={() => {
          setAuthMode('signin');
          setShowAuthModal(true);
        }}
        onSignUp={() => {
          setAuthMode('signup');
          setShowAuthModal(true);
        }}
      />

      <Hero
        onJoinNow={() => {
          setAuthMode('signup');
          setShowAuthModal(true);
        }}
      />

      <About />
      <Mission />
      <PoliticalJourney />
      <Initiatives />
      <TenPillars />
      <Development />
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
            setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
          }
        />
      )}
    </div>
  );
}
function AppContent() {
  const { loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* MAIN SITE */}
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

        {/* WELFARE */}
        <Route path="/welfare/amma-vodi" element={<AmmaVodi setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/vidya-deevena" element={<VidyaDeevena setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/vasathi-deevena" element={<VasathiDeevena setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/nri-connect" element={<NriConnect setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/gorumudda" element={<Gorumudda setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/cheyutha" element={<Cheyutha setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/yuvanestham" element={<Yuvanestham setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />

        <Route
          path="/contact"
          element={
            <Contact
              setAuthMode={setAuthMode}
              setShowAuthModal={setShowAuthModal}
            />
          }
        />

        {/* Redirect old suggestions path to new Glimpse (Gallery) */}
        <Route path="/suggestions" element={<Navigate to="/glimpse" replace />} />
        <Route path="/glimpse" element={<Glimpse />} />
        <Route path="/ref/:name/:code" element={<ReferralRedirect />} />


        {/* Services page mapping to Initiatives */}
        <Route path="/services" element={<Initiatives />} />

        {/* Pillars Page */}
        <Route path="/pillars" element={<PillarPage onBack={() => window.history.back()} onPillarSelect={() => {}} />} />
        
        {/* Pillar Detail Wrapper (from direct navigation) */}
        <Route path="/pillars/:id" element={<PillarDetailWrapper />} />

        
        <Route path="/register" element={<RegisterPage />} />

        {/* ADMIN */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

{/* MAIN DASHBOARD ENTRY */}
<Route
  path="/dashboard"
  element={<Navigate to="/dashboard/job" replace />}
/>



        {/* ✅ PROFESSION DASHBOARDS */}
        <Route path="/dashboard/job" element={<JobDashboard />} />
        <Route path="/dashboard/business" element={<BusinessDashboard />} />
        <Route path="/dashboard/student" element={<StudentDashboard />} />
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
