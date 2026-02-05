import React from "react";

const TESTIMONIALS_DATA = [
  {
    quote:
      "Jagan Anna's people-first governance inspires NRIs worldwide. His welfare schemes changed lives—proud to stand with him! Come back stronger!",
    author: "MR. Bharath Kandula",
    role: "Australia",
    //initials: "",
  },
  {
    quote:
      "From telemedicine top rank to industrial investments—Jagan Anna balanced welfare with strong economic development!",
    author: "Vamsi",
    role: "Australia",
    //initials: "DR",
  },
  {
    quote:
      "Being able to contribute directly to educational reforms gave me a strong sense of pride and connection.",
    author: "MS. L. REDDY",
    role: "TECH LEAD, UK",
    initials: "LR",
  },
];

const Testimonials: React.FC = () => {
  const marqueeItems = [...TESTIMONIALS_DATA, ...TESTIMONIALS_DATA];

  return (
    <section className="relative bg-white py-10 overflow-hidden">
      {/* Heading */}
      <div className="text-center mb-6">
        <h2
          className="text-xl sm:text-2xl font-black uppercase text-blue-600"
          style={{ fontFamily: "Times New Roman, serif" }}
        >
          Voices of Our Global Community
        </h2>
      </div>

      {/* Marquee */}
      <div className="relative w-full overflow-hidden">
        {/* Fade edges */}
        <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="flex gap-6 w-max animate-marquee px-6">
          {marqueeItems.map((item, idx) => {
            const isGreen = idx % 2 === 0;

            const borderColor = isGreen
              ? "border-l-green-600"
              : "border-l-blue-600";

            const textColor = isGreen
              ? "text-green-700"
              : "text-blue-700";

            const avatarBg = isGreen
              ? "bg-green-600"
              : "bg-blue-600";

            return (
              <div
                key={idx}
                className={`
                  w-[85vw] sm:w-[380px]
                  min-h-[240px]
                  bg-white
                  rounded-2xl
                  shadow-md
                  border border-gray-200
                  border-l-[6px] ${borderColor}
                  p-6
                  flex flex-col justify-between
                `}
              >
                {/* Quote */}
                <p
                  className={`italic text-sm sm:text-base leading-relaxed ${textColor}`}
                >
                  “{item.quote}”
                </p>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-6">
                  <div
                    className={`
                      w-10 h-10 rounded-full
                      ${avatarBg} text-white
                      font-black flex items-center justify-center text-sm
                    `}
                  >
                    {item.initials}
                  </div>

                  <div>
                    <p
                      className={`font-black text-xs uppercase ${textColor}`}
                    >
                      {item.author}
                    </p>
                    <p className="text-gray-400 text-[10px] uppercase font-semibold">
                      {item.role}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-marquee {
          animation: marquee 25s linear infinite;
        }

        @media (max-width: 640px) {
          .animate-marquee {
            animation-duration: 60s;
          }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
