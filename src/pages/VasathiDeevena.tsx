import Header from "../components/Header";
import Footer from "../components/Footer";

type VasathiDeevenaProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function VasathiDeevena({ setAuthMode, setShowAuthModal }: VasathiDeevenaProps) {
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
        <h1 className="text-3xl font-bold text-primary-700 mb-4">Jagananna Vasathi Deevena</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Accommodation and food support for students staying away from home.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            Provides hostel accommodation and nutritious meals to students pursuing higher education away from their homes.
            This ensures that students can focus on their studies without worrying about basic needs.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>Free hostel accommodation for outstation students</li>
            <li>Nutritious meals provided daily</li>
            <li>Covers students in professional colleges</li>
            <li>Modern hostel facilities with study areas</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Eligibility & Application</h2>
          <p className="text-gray-600 mb-4">
            Students admitted to professional courses who are from outside the district are eligible.
            Priority is given to students from economically weaker sections.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Over 1 lakh students have benefited from this scheme, enabling them to pursue quality education
            and achieve academic excellence without financial stress.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
