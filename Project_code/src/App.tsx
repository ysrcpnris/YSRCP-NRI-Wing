import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Mission from './components/Mission';
import Initiatives from './components/Initiatives';
import Events from './components/Events';
import News from './components/News';
import Contact from './components/Contact';
import ImpactMap from './components/ImpactMap';
import Testimonials from './components/Testimonials';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import AuthModal from './components/AuthModal';
import SocialMedia from './components/SocialMedia';

// ❌ Removed JaganMark from landing import
import JaganMark from './components/JaganMark';

import Health from './pages/Health';
import Agriculture from './pages/Agriculture';
import Education from './pages/Education';
import Women from './pages/Women';
import StudentYouth from './pages/Studentyouth';
import AdminLogin from './AdminDashboard/AdminLogin';
import AdminDashboard from './AdminDashboard/AdminDashboard';
import AdminRoute from './routes/AdminRoute';

// Import welfare scheme pages
import AmmaVodi from './pages/AmmaVodi';
import VidyaDeevena from './pages/VidyaDeevena';
import VasathiDeevena from './pages/VasathiDeevena';
import NriConnect from './pages/NriConnect';
import Gorumudda from './pages/Gorumudda';
import Cheyutha from './pages/Cheyutha';
import Yuvanestham from './pages/Yuvanestham';
import LiveStreamPage from './pages/LiveStream';
// import Suggestions from './pages/Suggestions';


type MainLandingPageProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
  showAuthModal: boolean;
  authMode: 'signin' | 'signup';
};

function MainLandingPage({
  setAuthMode,
  setShowAuthModal,
  showAuthModal,
  authMode,
}: MainLandingPageProps) {
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

      {/* ❌ Removed JaganMark from landing page */}
      {/* <JaganMark /> */}

      <Initiatives />
      <Events />
      <News />
      <Contact
  setAuthMode={setAuthMode}
  setShowAuthModal={setShowAuthModal}
/>
      <ImpactMap />
      <Testimonials />
      <SocialMedia />
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
  const { user, profile, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

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

  if (user && profile) {
    return <Dashboard />;
  }

  // ✅ Helper functions for modal (used everywhere)
  const onSignIn = () => {
    setAuthMode('signin');
    setShowAuthModal(true);
  };

  const onSignUp = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  return (
    <>
      <Routes>

        {/* 🏠 Landing Page */}
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

        {/* 🧭 Subpages — headers/footers already included inside each */}
        <Route path="/health" element={ <Health setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal}/> } />
  <Route path="/education" element={<Education setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
<Route path="/agriculture" element={<Agriculture setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
<Route path="/women" element={<Women setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
<Route path="/students" element={<StudentYouth setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />

        {/* Welfare scheme pages */}
        <Route path="/welfare/amma-vodi" element={<AmmaVodi setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/vidya-deevena" element={<VidyaDeevena setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/vasathi-deevena" element={<VasathiDeevena setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/nri-connect" element={<NriConnect setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/gorumudda" element={<Gorumudda setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/cheyutha" element={<Cheyutha setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />
        <Route path="/welfare/yuvanestham" element={<Yuvanestham setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} />

        {/* (Optional) Jagan-Mark page */}
        <Route path="/jagan-mark" element={<JaganMark />} />

        {/* <Route path="/suggestions" element={<Suggestions setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />} /> */}
        <Route
  path="/contact"
  element={<Contact setAuthMode={setAuthMode} setShowAuthModal={setShowAuthModal} />}
/>

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
      </Routes>
      

      {/* ✅ Global Auth Modal (works on every page) */}
      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
          onSwitchMode={() =>
            setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
          }
        />
      )}
    </>
  );
}


function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
{/*
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LiveStream from "./pages/LiveStream";
import LiveButton from "./components/LiveButton";

function App() {
  return (
    <BrowserRouter>
      {/* Example Nav or Dashboard *}
      <div className="p-4">
        <LiveButton />
      </div>

      <Routes>
        <Route path="/live" element={<LiveStream />} />
      </Routes>
    </BrowserRouter>
  );
}


*/}
export default App;  