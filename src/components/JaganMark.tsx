import { useNavigate } from "react-router-dom";

export default function JaganMark() {
  const navigate = useNavigate();

  return (
    <section id="jagan-mark" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Jagan-Mark</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Celebrating the transformative leadership of Y.S. Jagan Mohan Reddy through key pillars of progress.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Development */}
          <div
            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition cursor-pointer"
            onClick={() => navigate('/development')}
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Development</h3>
            <p className="text-gray-600 text-center">
              Infrastructure development, smart cities, and sustainable growth initiatives that have transformed Andhra Pradesh into a model state for progress and innovation.
            </p>
          </div>
          {/* Welfare */}
          <div
            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition cursor-pointer"
            onClick={() => navigate('/welfare')}
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Welfare</h3>
            <p className="text-gray-600 text-center">
              Comprehensive welfare schemes including free healthcare, education, and direct benefit transfers that ensure no one is left behind in Andhra Pradesh's journey towards prosperity.
            </p>
          </div>
          {/* Reforms */}
          <div
            className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition cursor-pointer"
            onClick={() => navigate('/reforms')}
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">Reforms</h3>
            <p className="text-gray-600 text-center">
              Administrative reforms, digital governance, and policy innovations that have streamlined government processes and enhanced transparency and accountability.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
