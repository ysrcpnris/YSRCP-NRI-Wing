import Header from "../components/Header";
import Footer from "../components/Footer";

type YuvanesthamProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Yuvanestham({ setAuthMode, setShowAuthModal }: YuvanesthamProps) {
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
        <h1 className="text-3xl font-bold text-blue-700 mb-4">Jagananna Yuvanestham</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Comprehensive support program for youth development and empowerment.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            A holistic program that provides financial assistance, skill training, and entrepreneurial support
            to youth aged 18-35 years. The program aims to create job creators rather than job seekers.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Financial assistance for self-employment ventures</li>
            <li>Skill development and vocational training</li>
            <li>Entrepreneurship mentoring and guidance</li>
            <li>Seed capital for business startups</li>
            <li>Market linkages and business development support</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Eligibility & Benefits</h2>
          <p className="text-gray-600 mb-4">
            Youth between 18-35 years with innovative business ideas or vocational skills training needs are eligible.
            The program provides up to ₹5 lakhs for business startups and comprehensive training support.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Thousands of youth have been empowered through this program, leading to the creation of
            sustainable businesses and employment opportunities across Andhra Pradesh.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
