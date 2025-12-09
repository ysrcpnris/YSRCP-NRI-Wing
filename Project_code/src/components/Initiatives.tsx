import { useState } from "react";
import { GraduationCap, Gavel, UsersRound, Briefcase, X } from "lucide-react";

export default function Initiatives() {
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const services = [
    {
      title: "Student Support",
      icon: <GraduationCap className="w-10 h-10 text-[#E7A95B]" />,
      short: "Guidance for academic & growth",
      long: `
        • Assistance with foreign education guidance  
        • Scholarship updates & documentation help  
        • Career suggestions for students abroad  
        • Mentorship from NRI professionals  
      `,
    },
    {
      title: "Legal Advisor",
      icon: <Gavel className="w-10 h-10 text-[#D97C54]" />,
      short: "Professional legal assistance",
      long: `
        • Visa / immigration documentation help  
        • Overseas legal dispute consultation  
        • NRI property-related legal support  
        • Access to verified legal partners  
      `,
    },
    {
      title: "Career Coach",
      icon: <Briefcase className="w-10 h-10 text-[#F4A261]" />,
      short: "Career planning & opportunities",
      long: `
        • Resume building & portfolio improvement  
        • Job opportunities through NRI network  
        • Skill development guidance  
        • Interview preparation support  
      `,
    },
    {
      title: "Local Connector",
      icon: <UsersRound className="w-10 h-10 text-[#D97706]" />,
      short: "Connecting with community",
      long: `
        • Connect with local NRI groups  
        • Join country-specific communities  
        • Volunteer opportunities  
        • Cultural/event support networks  
      `,
    },
  ];

  return (
    <section id="services" className="py-14 md:py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-10">

        {/* LEFT SECTION */}
        <div>
          <h4 className="text-blue-600 font-semibold tracking-wide uppercase text-sm md:text-base">
            Our Vision
          </h4>

          <h2 className="text-3xl md:text-5xl font-extrabold leading-snug mt-3">
            <span className="text-blue-700">Why Join</span>{" "}
            <span className="text-green-600">The Mission?</span>
          </h2>

          <p className="text-gray-600 mt-4 text-base md:text-lg leading-relaxed">
            Your connection to the homeland is vital. We provide the platform to
            connect, contribute, and grow together.
          </p>

          {/* Features */}
          <div className="mt-8 space-y-4 md:space-y-5">
            <div className="p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="font-semibold text-gray-800">
                Direct Connect with Party Leadership
              </p>
              <p className="text-gray-500 text-sm">
                Engage directly with key decision-makers.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="font-semibold text-gray-800">
                Exclusive Updates & Inside Information
              </p>
              <p className="text-gray-500 text-sm">
                Receive timely insights not available elsewhere.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="font-semibold text-gray-800">
                Play a Constructive Role in Comeback
              </p>
              <p className="text-gray-500 text-sm">
                Contribute actively to the mission’s success.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SECTION */}
        <div className="bg-[#FFF6EE] rounded-2xl p-6 sm:p-10 relative overflow-hidden">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#5B3E2B]">
            Our Services
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Comprehensive support ecosystem for NRIs
          </p>

          {/* SERVICE CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-5 mt-8">
            {services.map((s, index) => (
              <div
                key={index}
                onClick={() => setSelectedService(s)}
                className="bg-white p-4 md:p-5 rounded-xl shadow border border-gray-100 cursor-pointer
                           hover:shadow-md hover:-translate-y-1 transition"
              >
                {s.icon}
                <h3 className="font-bold text-gray-800 mt-3 text-sm md:text-base">
                  {s.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{s.short}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MODAL POPUP ================= */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white w-[90%] sm:w-96 p-6 rounded-2xl shadow-2xl relative">

            {/* Close Button */}
            <button
              className="absolute top-3 right-3 text-gray-600 hover:text-black"
              onClick={() => setSelectedService(null)}
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex justify-center mb-4">{selectedService.icon}</div>

            <h2 className="text-xl md:text-2xl font-bold text-center text-gray-900">
              {selectedService.title}
            </h2>

            <p className="text-gray-700 mt-4 whitespace-pre-line text-sm leading-relaxed">
              {selectedService.long}
            </p>

            <button
              onClick={() => setSelectedService(null)}
              className="mt-6 w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition"
            >
              Close
            </button>

          </div>
        </div>
      )}
    </section>
  );
}
