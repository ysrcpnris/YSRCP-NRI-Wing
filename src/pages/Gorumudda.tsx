import Header from "../components/Header";
import Footer from "../components/Footer";

type GorumuddaProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Gorumudda({ setAuthMode, setShowAuthModal }: GorumuddaProps) {
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
        <h1 className="text-3xl font-bold text-blue-700 mb-4">Jagananna Gorumudda</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Nutritious meals provided to school children to improve health and education outcomes.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            Provides hot, nutritious meals to all school children from Class 1 to 10.
            The program ensures that children receive balanced nutrition to support their learning and development.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Hot, nutritious meals served daily</li>
            <li>Covers students from Class 1 to 10</li>
            <li>Balanced diet with proteins, vitamins, and minerals</li>
            <li>Prepared in hygienic school kitchens</li>
            <li>Reduces malnutrition and improves concentration</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Implementation</h2>
          <p className="text-gray-600 mb-4">
            Meals are prepared in centralized kitchens and distributed to schools across Andhra Pradesh.
            The program is monitored regularly to ensure quality and nutrition standards.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Over 50 lakh children benefit daily from this program, leading to improved attendance,
            better health outcomes, and enhanced learning capabilities.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
