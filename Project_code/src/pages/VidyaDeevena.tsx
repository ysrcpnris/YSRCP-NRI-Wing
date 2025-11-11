import Header from "../components/Header";
import Footer from "../components/Footer";

type VidyaDeevenaProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function VidyaDeevena({ setAuthMode, setShowAuthModal }: VidyaDeevenaProps) {
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
        <h1 className="text-3xl font-bold text-blue-700 mb-4">Jagananna Vidya Deevena</h1>
        <p className="text-gray-700 max-w-2xl mx-auto mb-8">
          Full fee reimbursement for students pursuing higher education.
        </p>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Program Details</h2>
          <p className="text-gray-600 mb-4">
            Complete fee reimbursement for professional courses including Engineering, Medicine, Law, and other degree programs.
            This scheme ensures that merit-based education is accessible to all deserving students.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>100% fee reimbursement for professional courses</li>
            <li>Covers tuition, examination, and other academic fees</li>
            <li>Available for Engineering, Medicine, Law, and other professional courses</li>
            <li>Merit-based selection process</li>
          </ul>
        </div>

        <div className="max-w-4xl mx-auto text-left mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Eligibility & Application</h2>
          <p className="text-gray-600 mb-4">
            Students who secure admission in professional courses through entrance examinations are eligible.
            Applications are submitted through the official Vidya Deevena portal.
          </p>
        </div>

        <div className="max-w-4xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact</h2>
          <p className="text-gray-600">
            Thousands of students have pursued their dream careers without financial burden,
            contributing to the development of skilled professionals in Andhra Pradesh.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
