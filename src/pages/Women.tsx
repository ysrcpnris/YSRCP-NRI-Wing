import Header from "../components/Header";
import Footer from "../components/Footer";

type WomenProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Women({ setAuthMode, setShowAuthModal }: WomenProps) {
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
  <h1 className="text-3xl font-bold text-primary-700 mb-4">Women Empowerment Initiatives</h1>
  <p className="text-gray-700 max-w-2xl mx-auto mb-8">
    Under YSRCP leadership, numerous women initiatives like self-help groups,
    skill development programs, and financial assistance for women entrepreneurs
    were launched to empower women and promote gender equality.
  </p>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Women Empowerment Programs</h2>
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      <li>Self-help groups formation and financial support</li>
      <li>Skill development and vocational training programs</li>
      <li>Financial assistance for women entrepreneurs</li>
      <li>Micro-credit facilities and loan schemes</li>
      <li>Women helpline and protection services</li>
      <li>Education scholarships for girl children</li>
      <li>Women representation in local governance</li>
    </ul>
  </div>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact and Achievements</h2>
    <p className="text-gray-600 mb-4">
      Our women empowerment initiatives have transformed the lives of millions of women
      in Andhra Pradesh, providing them with economic independence and social recognition.
      We have created a supportive ecosystem that enables women to participate actively
      in all spheres of life.
    </p>
    <p className="text-gray-600">
      Through comprehensive programs and policies, we have ensured that women have equal
      opportunities in education, employment, and decision-making processes.
    </p>
  </div>

  <div className="max-w-4xl mx-auto text-left">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
    <p className="text-gray-600">
      We are committed to further strengthening women's participation in leadership roles,
      expanding digital literacy programs, and creating more employment opportunities.
      Our vision is to make Andhra Pradesh a model state for gender equality and women empowerment.
    </p>
  </div>
</section>


      <Footer />
    </>
  );
}
