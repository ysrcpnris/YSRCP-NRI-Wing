import Header from "../components/Header";
import Footer from "../components/Footer";

type AgricultureProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Agriculture({ setAuthMode, setShowAuthModal }: AgricultureProps) {
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
  <h1 className="text-3xl font-bold text-blue-700 mb-4">Agriculture Initiatives</h1>
  <p className="text-gray-700 max-w-2xl mx-auto mb-8">
    Under YSRCP leadership, numerous agriculture initiatives like free seeds distribution,
    financial assistance for farmers, and irrigation projects were launched to ensure
    sustainable farming and improved livelihoods.
  </p>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Agriculture Programs</h2>
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      <li>Free distribution of quality seeds and fertilizers</li>
      <li>Financial assistance and crop insurance schemes</li>
      <li>Major and minor irrigation projects</li>
      <li>Organic farming promotion and certification</li>
      <li>Modern farming equipment and technology adoption</li>
      <li>Market linkages and fair price procurement</li>
      <li>Climate-resilient crop varieties development</li>
    </ul>
  </div>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact and Achievements</h2>
    <p className="text-gray-600 mb-4">
      Our agriculture initiatives have revolutionized farming practices in Andhra Pradesh,
      increasing crop yields and farmer incomes. We have implemented sustainable farming
      techniques that protect the environment while ensuring food security.
    </p>
    <p className="text-gray-600">
      Through comprehensive irrigation projects and modern technology adoption,
      we have transformed agriculture into a profitable and sustainable enterprise
      for millions of farmers across the state.
    </p>
  </div>

  <div className="max-w-4xl mx-auto text-left">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
    <p className="text-gray-600">
      We are investing in precision agriculture, smart farming technologies, and
      export-oriented agriculture. Our goal is to make Andhra Pradesh a global leader
      in sustainable agriculture and food production.
    </p>
  </div>
</section>

      <Footer />
    </>
  );
}
