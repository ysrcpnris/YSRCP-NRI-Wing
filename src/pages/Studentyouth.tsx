import Header from "../components/Header";
import Footer from "../components/Footer";

type StudentYouthProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function StudentYouth({ setAuthMode, setShowAuthModal }: StudentYouthProps) {
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
  <h1 className="text-3xl font-bold text-primary-700 mb-4">Student / Youth Initiatives</h1>
  <p className="text-gray-700 max-w-2xl mx-auto mb-8">
    Under YSRCP leadership, numerous student and youth initiatives like skill development programs,
    scholarships for higher education, and entrepreneurship support were launched to empower
    the younger generation and promote their overall development.
  </p>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Student and Youth Programs</h2>
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      <li>Free coaching for competitive examinations</li>
      <li>Scholarships and financial assistance for higher education</li>
      <li>Skill development and vocational training programs</li>
      <li>Entrepreneurship incubation centers</li>
      <li>Sports and cultural development initiatives</li>
      <li>Youth leadership and personality development</li>
      <li>Internship and job placement programs</li>
    </ul>
  </div>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact and Achievements</h2>
    <p className="text-gray-600 mb-4">
      Our student and youth initiatives have created unprecedented opportunities for the
      younger generation in Andhra Pradesh. We have equipped thousands of students with
      the skills and knowledge needed to succeed in the modern world.
    </p>
    <p className="text-gray-600">
      Through comprehensive education and skill development programs, we have transformed
      the youth into confident leaders and productive citizens who contribute positively
      to society and the economy.
    </p>
  </div>

  <div className="max-w-4xl mx-auto text-left">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
    <p className="text-gray-600">
      We are expanding our youth programs to include advanced technology training,
      international exchange programs, and innovation hubs. Our goal is to create
      a generation of skilled, innovative, and socially responsible young leaders.
    </p>
  </div>
</section>


      <Footer />
    </>
  );
}
