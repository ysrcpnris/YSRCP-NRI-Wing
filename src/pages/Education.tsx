import Header from "../components/Header";
import Footer from "../components/Footer";

type EducationProps = {
  setAuthMode: (mode: 'signin' | 'signup') => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function Education({ setAuthMode, setShowAuthModal }: EducationProps) {
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
  <h1 className="text-3xl font-bold text-primary-700 mb-4">Education Initiatives</h1>
  <p className="text-gray-700 max-w-2xl mx-auto mb-8">
    Under YSRCP leadership, numerous education initiatives like free coaching,
    scholarships for underprivileged students, and infrastructure development in schools
    were launched to ensure quality education for every child.
  </p>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Key Education Programs</h2>
    <ul className="list-disc list-inside space-y-2 text-gray-600">
      <li>Free coaching for competitive exams like JEE, NEET, and civil services</li>
      <li>Full fee reimbursement for higher education</li>
      <li>Scholarships for students from economically weaker sections</li>
      <li>Construction of new classrooms and school buildings</li>
      <li>Digital classrooms with smart boards and computers</li>
      <li>Teacher training programs for quality education</li>
      <li>Mid-day meal programs to ensure nutrition</li>
    </ul>
  </div>

  <div className="max-w-4xl mx-auto text-left mb-8">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Impact and Achievements</h2>
    <p className="text-gray-600 mb-4">
      Our education initiatives have transformed the learning landscape in Andhra Pradesh,
      with increased enrollment rates and improved academic performance. Thousands of students
      have benefited from scholarships and coaching programs, enabling them to pursue their dreams.
    </p>
    <p className="text-gray-600">
      We have built modern educational infrastructure and equipped schools with the latest
      technology, creating an environment conducive to learning and innovation.
    </p>
  </div>

  <div className="max-w-4xl mx-auto text-left">
    <h2 className="text-2xl font-semibold text-gray-800 mb-4">Future Plans</h2>
    <p className="text-gray-600">
      We are committed to further enhancing our education system with international collaborations,
      skill-based learning programs, and research facilities. Our vision is to make Andhra Pradesh
      a hub of educational excellence and innovation.
    </p>
  </div>
</section>


      <Footer />
    </>
  );
}
