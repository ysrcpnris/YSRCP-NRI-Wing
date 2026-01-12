import Header from "../components/Header";
import Footer from "../components/Footer";

type AmmaVodiProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function AmmaVodi({ setAuthMode, setShowAuthModal }: AmmaVodiProps) {
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
        <h1 className="text-3xl font-bold text-blue-700 mb-4">Jagananna Amma Vodi</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Financial assistance for mothers to support children's education.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            Jagananna Amma Vodi provides ₹15,000 per year to mothers of children studying from Class 1 to Intermediate.
            This scheme ensures that financial constraints do not hinder a child's education.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Annual financial assistance of ₹15,000 per child</li>
            <li>Covers students from Class 1 to Intermediate</li>
            <li>Direct bank transfer to mother's account</li>
            <li>No income criteria - universal coverage</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Eligibility & Application</h2>
          <p className="text-gray-600 mb-4">
            All mothers with children studying in Andhra Pradesh schools are eligible.
            Applications are processed through the Jagananna Amma Vodi portal.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Over 5 million children have benefited from this scheme, significantly reducing school dropout rates
            and ensuring quality education for all.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
