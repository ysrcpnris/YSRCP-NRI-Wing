import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Gavel, UsersRound, Briefcase, X, Check, ArrowRight } from "lucide-react";

type Service = {
  title: string;
  icon: React.ReactNode;
  short: string;
  long: string;
  accent: string; // tailwind bg class for icon wrapper
};

export default function Initiatives() {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const services: Service[] = [
    {
      title: "Student Support",
      icon: <GraduationCap className="w-7 h-7 text-white" />,
      short: "Guidance for academic & growth",
      long: `• Assistance with foreign education guidance
• Scholarship updates & documentation help
• Career suggestions for students abroad
• Mentorship from NRI professionals`,
      accent: "bg-gradient-to-br from-primary-500 to-primary-700",
    },
    {
      title: "Legal Advisor",
      icon: <Gavel className="w-7 h-7 text-white" />,
      short: "Professional legal assistance",
      long: `• Visa / immigration documentation help
• Overseas legal dispute consultation
• NRI property-related legal support
• Access to verified legal partners`,
      accent: "bg-gradient-to-br from-accent-500 to-accent-700",
    },
    {
      title: "Career Coach",
      icon: <Briefcase className="w-7 h-7 text-white" />,
      short: "Career planning & opportunities",
      long: `• Resume building & portfolio improvement
• Job opportunities through NRI network
• Skill development guidance
• Interview preparation support`,
      accent: "bg-gradient-to-br from-gold-400 to-gold-600",
    },
    {
      title: "Local Connector",
      icon: <UsersRound className="w-7 h-7 text-white" />,
      short: "Connecting with community",
      long: `• Connect with local NRI groups
• Join country-specific communities
• Volunteer opportunities
• Cultural / event support networks`,
      accent: "bg-gradient-to-br from-primary-600 to-accent-600",
    },
  ];

  const bullets = [
    {
      title: "Direct Connect with Party Leadership",
      desc: "Engage directly with key decision-makers.",
    },
    {
      title: "Exclusive Updates & Inside Information",
      desc: "Receive timely insights not available elsewhere.",
    },
    {
      title: "Play a Constructive Role in the Comeback",
      desc: "Contribute actively to the mission's success.",
    },
  ];

  return (
    <section id="services" className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute -left-32 top-32 w-96 h-96 bg-primary-100/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-24 bottom-16 w-96 h-96 bg-accent-100/40 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 relative z-10">
        {/* LEFT — Mission */}
        <div>
          <span className="inline-block px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary-700 bg-primary-50 border border-primary-100 rounded-full">
            Our Vision
          </span>

          <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mt-4">
            <span className="text-gray-900">Why Join</span>{" "}
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              The Mission?
            </span>
          </h2>

          <p className="text-gray-600 mt-4 text-base md:text-lg leading-relaxed max-w-xl">
            Your connection to the homeland is vital. We provide the platform to connect,
            contribute, and grow together.
          </p>

          {/* Bullet card */}
          <div className="mt-8 bg-white border border-gray-100 rounded-2xl shadow-card p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              Why Join the Movement?
            </h3>
            <div className="space-y-4">
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center group-hover:bg-accent-500 group-hover:text-white transition-colors">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.title}</p>
                    <p className="text-gray-500 text-sm mt-0.5">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Services */}
        <div className="bg-gradient-to-br from-gray-50 via-white to-primary-50/40 rounded-3xl p-6 sm:p-8 md:p-10 border border-gray-100 shadow-card relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary-200/40 rounded-full blur-3xl" />

          <div className="relative z-10 text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Our Services
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Comprehensive support ecosystem for NRIs
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {services.map((s, index) => (
              <button
                key={index}
                onClick={() => setSelectedService(s)}
                className="group text-left bg-white p-5 rounded-2xl border border-gray-100 shadow-sm
                           hover:shadow-card-hover hover:-translate-y-1 hover:border-primary-200
                           transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${s.accent}
                              group-hover:scale-110 transition-transform duration-300`}
                >
                  {s.icon}
                </div>
                <h3 className="font-bold text-gray-900 mt-4 text-sm md:text-base">
                  {s.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.short}</p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn more <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {selectedService && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4 animate-fade-in"
          onClick={() => setSelectedService(null)}
        >
          <div
            className="bg-white w-full max-w-md rounded-2xl shadow-modal relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 z-10 transition"
              onClick={() => setSelectedService(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className={`p-6 text-center ${selectedService.accent}`}>
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                {selectedService.icon}
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white mt-3">
                {selectedService.title}
              </h2>
            </div>

            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-line text-sm leading-relaxed">
                {selectedService.long}
              </p>
              <button
                onClick={() => {
                  setSelectedService(null);
                  navigate("/register");
                }}
                className="mt-6 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
