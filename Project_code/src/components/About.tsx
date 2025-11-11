export default function About() {
  return (
    <section id="about" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">About YSRCP NRI Wing</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Empowering Non-Resident Indians to contribute to Andhra Pradesh's development and strengthen the YSR Congress Party's global network.
          </p>
        </div>

        {/* About YSRCP Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl border border-blue-200">
            <h3 className="text-2xl font-bold text-blue-900 mb-6">About YSRCP</h3>
            <p className="text-blue-800 mb-4">
              The Yuvajana Sramika Rythu Congress Party (YSRCP) is a major political party in Andhra Pradesh, India, founded by the late Chief Minister Dr. Y.S. Rajasekhara Reddy in 2009.
            </p>
            <p className="text-blue-800 mb-4">
              Under the leadership of Y.S. Jagan Mohan Reddy, YSRCP has been committed to welfare schemes, rural development, and inclusive growth for all sections of society.
            </p>
            <p className="text-blue-800">
              The party believes in empowering the youth, farmers, and working class through transparent governance and people-centric policies.
            </p>
          </div>
          {/* <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-8 rounded-2xl border border-green-200">
            <h3 className="text-2xl font-bold text-green-900 mb-6">Our History</h3>
            <p className="text-green-800 mb-4">
              Founded in 2009 by Dr. Y.S. Rajasekhara Reddy, YSRCP emerged as a powerful force in Andhra Pradesh politics, winning a landslide victory in 2009.
            </p>
            <p className="text-green-800 mb-4">
              After Dr. Reddy's untimely demise, his son Y.S. Jagan Mohan Reddy took over the leadership, continuing the legacy of welfare governance.
            </p>
            <p className="text-green-800">
              YSRCP has implemented numerous welfare schemes including free power, education, healthcare, and direct benefit transfers to millions of beneficiaries.
            </p>
          </div> */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-8 rounded-2xl border border-purple-200">
            <h3 className="text-2xl font-bold text-purple-900 mb-6">Our Vision</h3>
            <p className="text-purple-800 mb-6">
              To create a unified platform where NRIs can actively participate in Andhra Pradesh's progress, share their expertise, and support community development initiatives.
            </p>
            <h3 className="text-2xl font-bold text-purple-900 mb-6">Our Mission</h3>
            <p className="text-purple-800 mb-6">
              Bridge the gap between NRIs and their homeland by providing comprehensive support services, fostering community engagement, and facilitating meaningful contributions to Andhra's growth.
            </p>
            {/* <h3 className="text-2xl font-bold text-purple-900 mb-6">Our Values</h3>
            <ul className="text-purple-800 space-y-2">
              <li>• Unity and Inclusivity</li>
              <li>• Transparency and Accountability</li>
              <li>• Innovation and Progress</li>
              <li>• Community Empowerment</li>
            </ul> */}
          </div>
        </div>

        {/* Vision, Mission, Values */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">

          {/* <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Key Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-600 font-medium">Registered NRIs</span>
                <span className="font-bold text-blue-600 text-lg">10,000+</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-600 font-medium">Countries Covered</span>
                <span className="font-bold text-green-600 text-lg">50+</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="text-gray-600 font-medium">Community Events</span>
                <span className="font-bold text-blue-600 text-lg">200+</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-gray-600 font-medium">Success Stories</span>
                <span className="font-bold text-green-600 text-lg">500+</span>
              </div>
            </div>
          </div> */}
        </div>

        {/* Our History - Single Grid */}
        {/* <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-8">Our History</h3>
          <div className="bg-gradient-to-br from-orange-50 to-red-100 p-8 rounded-2xl border border-orange-200 max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-bold text-orange-900">Founded in 2019</h4>
                <p className="text-orange-700">Connecting Global Telugu Diaspora</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-orange-800" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-orange-800 font-medium">50+ Countries</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-red-800" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
                <p className="text-orange-800 font-medium">Hundreds of Events</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6 text-orange-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-orange-800 font-medium">Community Impact</p>
              </div>
            </div>
            <p className="text-orange-800 text-center text-lg leading-relaxed">
              Founded in 2019, the YSRCP NRI Wing was established to connect the global Telugu diaspora with their roots in Andhra Pradesh. Starting with a small group of dedicated volunteers, we've grown into a vibrant community spanning over 50 countries, organizing hundreds of events and supporting thousands of initiatives for Andhra's development.
            </p>
          </div>
        </div> */}

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h4 className="text-xl font-bold text-gray-900 mb-4">Leadership Message</h4>
            <p className="text-gray-600">
              "Our NRIs are the backbone of Andhra's progress. Through this platform, we unite our global family to build a prosperous future together." - Y.S. Jagan Mohan Reddy
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h4 className="text-xl font-bold text-gray-900 mb-4">Organizational Structure</h4>
            <p className="text-gray-600">
              Led by dedicated coordinators across countries and states, our wing operates through specialized departments including Media, Technology, Medical, and Youth wings.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg text-center">
            <h4 className="text-xl font-bold text-gray-900 mb-4">Global Impact</h4>
            <p className="text-gray-600">
              From organizing medical camps to supporting education initiatives, our NRI community has made significant contributions to Andhra Pradesh's development.
            </p>
          </div>
        </div>

        {/* <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-8">Join Our Global Family</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Whether you're a student, professional, or entrepreneur, there's a place for you in the YSRCP NRI Wing. Connect with fellow NRIs, contribute to Andhra's growth, and be part of something bigger.
          </p>
          <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition">
            Register Now
          </button>
        </div> */}
      </div>
    </section>
  );
}
