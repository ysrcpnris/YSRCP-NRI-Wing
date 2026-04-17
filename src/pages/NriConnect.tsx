import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

type NriConnectProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function NriConnect({ setAuthMode, setShowAuthModal }: NriConnectProps) {
  return (
    <>
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

      <section className="pt-24 p-10 text-center">
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Jagananna NRI Connect</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Empowering NRIs to stay connected with welfare initiatives and contribute to state development.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            A dedicated platform for Non-Resident Indians to engage with Andhra Pradesh's development initiatives,
            contribute to welfare schemes, and stay connected with their roots.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Online platform for NRI engagement</li>
            <li>Investment opportunities in state projects</li>
            <li>Donation portal for welfare schemes</li>
            <li>Regular updates on state development</li>
            <li>Networking events and business opportunities</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">NRI Benefits</h2>
          <p className="text-gray-600 mb-4">
            NRIs can contribute to various welfare schemes, invest in state infrastructure projects,
            and participate in the overall development of Andhra Pradesh.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Thousands of NRIs have connected through this platform, contributing millions towards
            state development and welfare initiatives, strengthening the bond between diaspora and homeland.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
