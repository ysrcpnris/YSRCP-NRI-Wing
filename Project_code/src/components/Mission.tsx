import { Globe, Heart, Award } from 'lucide-react';

export default function Mission() {
  const missions = [
    {
      icon: <Globe className="w-12 h-12 text-blue-600" />,
      title: 'Global Unity',
      description:
        'Connecting NRIs worldwide to support Andhra Pradesh development and YSR Congress Party initiatives'
    },
    {
      icon: <Heart className="w-12 h-12 text-green-600" />,
      title: 'Service to Society',
      description:
        'Facilitating education, employment, and welfare programs for students and job seekers in AP'
    },
    {
      icon: <Award className="w-12 h-12 text-blue-600" />,
      title: 'Andhra Pride',
      description:
        'Strengthening the bond between NRIs and their homeland through active participation and support'
    }
  ];

  return (
    <section
      id="mission"
      className="py-14 md:py-20"
      style={{
        background:
          'linear-gradient(135deg, rgba(0, 72, 181, 0.75), rgba(233, 232, 232, 0.66), rgba(0, 150, 70, 0.37))'
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-3 md:mb-4">
            Our Mission
          </h2>
          <div className="w-20 md:w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto"></div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {missions.map((mission, index) => (
            <div
              key={index}
              className="
                bg-white/70 
                backdrop-blur-md 
                p-6 md:p-8 
                rounded-2xl 
                shadow-lg 
                hover:shadow-2xl 
                transition-all 
                duration-300 
                hover:-translate-y-2 
                border border-gray-200
              "
            >
              <div className="flex justify-center mb-5 md:mb-6">
                <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
                  {mission.icon}
                </div>
              </div>

              <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 text-center">
                {mission.title}
              </h3>

              <p className="text-gray-700 text-center leading-relaxed text-sm md:text-base">
                {mission.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
