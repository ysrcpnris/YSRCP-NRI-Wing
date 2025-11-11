import { Globe, Heart, Award } from 'lucide-react';

export default function Mission() {
  const missions = [
    {
      icon: <Globe className="w-12 h-12 text-blue-600" />,
      title: 'Global Unity',
      description: 'Connecting NRIs worldwide to support Andhra Pradesh development and YSR Congress Party initiatives'
    },
    {
      icon: <Heart className="w-12 h-12 text-green-600" />,
      title: 'Service to Society',
      description: 'Facilitating education, employment, and welfare programs for students and job seekers in AP'
    },
    {
      icon: <Award className="w-12 h-12 text-blue-600" />,
      title: 'Andhra Pride',
      description: 'Strengthening the bond between NRIs and their homeland through active participation and support'
    }
  ];

  return (
    <section id="mission" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {missions.map((mission, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              <div className="flex justify-center mb-6">
                {mission.icon}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">{mission.title}</h3>
              <p className="text-gray-600 text-center leading-relaxed">{mission.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
