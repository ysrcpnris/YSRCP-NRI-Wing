import { useState } from 'react';
import { GraduationCap, Briefcase, MapPin, Calendar, MessageSquare, Users, Search, X } from 'lucide-react';

export default function Initiatives() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInitiative, setSelectedInitiative] = useState<typeof initiatives[0] | null>(null);
  const initiatives = [
    {
      icon: <GraduationCap className="w-10 h-10" />,
      title: 'Student Assistance',
      description: 'University guidance, exam prep support, fee discounts, and mentor matching for students',
      color: 'from-blue-500 to-blue-600',
      details: 'Comprehensive support for students including university selection guidance, exam preparation resources, fee discount partnerships with educational institutions, and one-on-one mentoring from successful NRIs. Access to scholarship opportunities and career counseling sessions.',
      benefits: ['University Selection', 'Exam Prep Resources', 'Fee Discounts', 'Mentor Matching', 'Scholarships']
    },
    {
      icon: <Briefcase className="w-10 h-10" />,
      title: 'Job Assistance',
      description: 'NRI job postings, career referrals, internship opportunities, and skill development',
      color: 'from-green-500 to-green-600',
      details: 'Exclusive job portal for NRIs with opportunities in India and abroad. Career counseling, resume building, interview preparation, and skill development workshops. Direct referrals to top companies and networking events.',
      benefits: ['Job Postings', 'Career Counseling', 'Skill Development', 'Networking Events', 'Resume Building']
    },
    {
      icon: <MapPin className="w-10 h-10" />,
      title: 'Local Leader Connect',
      description: 'Direct access to MLAs, constituency in-charges, and local coordinators in AP',
      color: 'from-blue-600 to-cyan-500',
      details: 'Direct communication channel with local leaders in Andhra Pradesh. Get updates on constituency developments, connect with MLAs and local coordinators, and participate in local governance initiatives.',
      benefits: ['MLA Access', 'Constituency Updates', 'Local Coordination', 'Governance Participation', 'Community Projects']
    },
    // {
    //   icon: <Calendar className="w-10 h-10" />,
    //   title: 'Community Events',
    //   description: 'Virtual meetings, cultural celebrations, fundraisers, and networking events worldwide',
    //   color: 'from-green-600 to-teal-500',
    //   details: 'Regular virtual and in-person events including cultural celebrations, professional networking, fundraising for community projects, and social gatherings. Connect with fellow NRIs and strengthen community bonds.',
    //   benefits: ['Virtual Meetings', 'Cultural Events', 'Fundraisers', 'Networking', 'Social Gatherings']
    // },
    // {
    //   icon: <MessageSquare className="w-10 h-10" />,
    //   title: 'Grievance Redressal',
    //   description: 'Submit and track grievances with assigned coordinators and transparent resolution',
    //   color: 'from-blue-500 to-indigo-500',
    //   details: 'Transparent grievance redressal system with dedicated coordinators. Submit complaints, track progress, and receive timely resolutions. All grievances are handled with priority and confidentiality.',
    //   benefits: ['Quick Submission', 'Progress Tracking', 'Dedicated Coordinators', 'Transparent Process', 'Confidential Handling']
    // },
    // {
    //   icon: <Users className="w-10 h-10" />,
    //   title: 'Supporter Stories',
    //   description: 'Connect with fellow NRIs in your city abroad and share experiences',
    //   color: 'from-green-500 to-emerald-600',
    //   details: 'Community platform to share success stories, connect with NRIs in your city, exchange experiences, and build lasting friendships. Access to mentorship programs and peer support networks.',
    //   benefits: ['Success Stories', 'Local Connections', 'Experience Sharing', 'Mentorship', 'Peer Support']
    // }
  ];

  const filteredInitiatives = initiatives.filter(initiative =>
    initiative.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    initiative.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section id="initiatives" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Key Initiatives</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive programs designed to support NRIs and strengthen ties with Andhra Pradesh
          </p>
        </div>

        <div className="mb-8">
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search initiatives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredInitiatives.map((initiative, index) => (
            <div
              id={initiative.title === 'Student Assistance' ? 'student-assistance' : undefined}
              key={index}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${initiative.color} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {initiative.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{initiative.title}</h3>
              <p className="text-gray-600 leading-relaxed mb-4">{initiative.description}</p>
              <button
                onClick={() => setSelectedInitiative(initiative)}
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                Learn More
              </button>
            </div>
          ))}
        </div>

        {selectedInitiative && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${selectedInitiative.color} rounded-xl flex items-center justify-center text-white`}>
                      {selectedInitiative.icon}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{selectedInitiative.title}</h3>
                      <p className="text-gray-600">{selectedInitiative.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInitiative(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Detailed Information</h4>
                  <p className="text-gray-600 leading-relaxed">{selectedInitiative.details}</p>
                </div>

                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Key Benefits</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedInitiative.benefits.map((benefit: string, index: number) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setSelectedInitiative(null)}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                  <button className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition">
                    Join Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
