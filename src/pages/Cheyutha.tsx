import Header from "../components/Header";
import Footer from "../components/Footer";

type CheyuthaProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Cheyutha({ setAuthMode, setShowAuthModal }: CheyuthaProps) {
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
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Jagananna Cheyutha</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Skill development program for rural youth and women to enhance employability.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            Comprehensive skill development training for rural youth and women to improve their employability
            and entrepreneurial capabilities. The program covers various vocational skills and business training.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Free skill development training</li>
            <li>Covers IT, healthcare, hospitality, and other sectors</li>
            <li>Entrepreneurship development programs</li>
            <li>Placement assistance and job linkages</li>
            <li>Certification and recognition</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Training Areas</h2>
          <p className="text-gray-600 mb-4">
            The program offers training in high-demand sectors including information technology,
            healthcare services, hospitality, retail management, and traditional crafts.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Over 2 lakh youth and women have been trained under this program, leading to better employment
            opportunities and economic empowerment in rural areas.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
