import Header from "../components/Header";
import Footer from "../components/Footer";

type HealthProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Health({ setAuthMode, setShowAuthModal }: HealthProps) {
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
  <h1 className="text-3xl font-bold text-primary-700 mb-4">Health Initiatives</h1>
  <p className="text-gray-700 max-w-2xl mx-auto mb-8">
    Under YSRCP leadership, numerous health initiatives like free medical camps,
    upgraded rural hospitals, and emergency care services were launched to ensure
    quality healthcare for every citizen.
  </p>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Health Programs</h2>
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      <li>Free medical camps in rural areas providing basic healthcare services</li>
      <li>Upgradation of rural hospitals with modern medical equipment</li>
      <li>Emergency care services with 108 ambulance network</li>
      <li>Maternal and child health programs</li>
      <li>Cancer screening and treatment facilities</li>
      <li>Telemedicine services for remote areas</li>
      <li>Health insurance schemes for vulnerable populations</li>
    </ul>
  </div>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact and Achievements</h2>
    <p className="text-gray-600 mb-4">
      The health initiatives have significantly improved healthcare access across Andhra Pradesh,
      reducing infant mortality rates and increasing life expectancy. Thousands of lives have been
      saved through timely medical interventions and preventive care programs.
    </p>
    <p className="text-gray-600">
      Our commitment to healthcare continues with ongoing investments in medical infrastructure,
      training of healthcare professionals, and innovative health programs that address the
      unique needs of our communities.
    </p>
  </div>

  <div className="max-w-4xl mx-auto text-left">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
    <p className="text-gray-600">
      We are expanding our health initiatives to include advanced treatments, mental health support,
      and digital health solutions. Our goal is to make Andhra Pradesh a model state for healthcare
      delivery in India, ensuring that every citizen has access to world-class medical services.
    </p>
  </div>
</section>


      <Footer />
    </>
  );
}
