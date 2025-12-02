import React from 'react';

const TESTIMONIALS_DATA = [
  {
    quote: "The NRI cell was incredibly helpful in resolving a documentation issue back home. The process was swift and transparent, reflecting the government's commitment.",
    author: "Dr. V. Rao",
    role: "Cardiologist, USA",
    initials: "DR",
    color: "text-blue-700",
    borderColor: "border-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    quote: "Being able to contribute directly to educational reforms through the portal gave me a sense of pride and connection I hadn't felt before. A true global platform.",
    author: "Ms. L. Reddy",
    role: "Tech Lead, UK",
    initials: "LR",
    color: "text-green-700",
    borderColor: "border-green-600",
    bgColor: "bg-green-50",
  },
  {
    quote: "The investment guidance provided for the new industrial corridor was exceptional. It gave us the confidence to start our manufacturing unit in Visakhapatnam.",
    author: "Mr. K. Sharma",
    role: "Entrepreneur, Dubai",
    initials: "KS",
    color: "text-amber-700",
    borderColor: "border-amber-600",
    bgColor: "bg-amber-50",
  },
  {
    quote: "Watching the school renovation projects from abroad makes me happy. My donation reached the right place, and I get regular updates.",
    author: "Mrs. P. Lakshmi",
    role: "Teacher, Australia",
    initials: "PL",
    color: "text-blue-700",
    borderColor: "border-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    quote: "Connecting with my local MLA through this portal solved a land dispute that was pending for years. Thank you Jagan Anna for this initiative.",
    author: "Mr. S. Reddy",
    role: "Senior Citizen, Canada",
    initials: "SR",
    color: "text-green-700",
    borderColor: "border-green-600",
    bgColor: "bg-green-50",
  },
  {
    quote: "The streamlined process for NRI voting registration is a game changer. I feel more connected to my democracy than ever.",
    author: "Mr. A. Kumar",
    role: "Engineer, Singapore",
    initials: "AK",
    color: "text-blue-700",
    borderColor: "border-blue-600",
    bgColor: "bg-blue-50",
  },
];

const Testimonials: React.FC = () => {
  const marqueeItems = [...TESTIMONIALS_DATA, ...TESTIMONIALS_DATA];

  const marqueeStyle = {
    animation: 'marquee 40s linear infinite',
    display: 'flex',
  } as React.CSSProperties;

  return (
    <section className="h-full flex flex-col justify-center bg-white overflow-hidden pt-10 pb-4 relative border-l border-gray-100">

      {/* Background world map */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/World_map_blank_without_borders.svg/2000px-World_map_blank_without_borders.svg.png")',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      ></div>

      {/* Title */}
      <div className="w-full px-4 text-center relative z-20 mb-8 shrink-0">
        <h2
          className="text-2xl font-black uppercase tracking-tight text-blue-600"
          style={{ fontFamily: 'Times New Roman, serif' }}
        >
          Voices of Our Global Community
        </h2>
      </div>

      {/* Scrolling Section */}
      <div className="flex-1 w-full relative flex flex-col justify-center">
        <div className="w-full overflow-hidden group relative">

          {/* Fade gradients */}
          <div className="absolute top-0 left-0 h-full w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
          <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

          {/* Marquee track */}
          <div className="gap-8 w-max px-10" style={marqueeStyle}>
            {marqueeItems.map((item, idx) => (
              <div
                key={idx}
                className={`
                  shrink-0 w-[550px] bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl
                  transition-all duration-300 border border-gray-100 group/card cursor-pointer
                  border-l-[6px] ${item.borderColor} transform hover:-translate-y-2 mx-2
                `}
              >
                {/* Quote mark */}
                <div
                  className={`text-8xl ${item.color} opacity-10 absolute top-0 right-4 font-serif leading-none`}
                >
                  "
                </div>

                <p className="text-gray-700 italic text-lg leading-relaxed mb-6 font-medium line-clamp-3">
                  "{item.quote}"
                </p>

                {/* User */}
                <div className="flex items-center gap-4 border-t border-gray-100 pt-4 mt-auto">
                  <div
                    className={`w-12 h-12 ${item.bgColor} ${item.color} rounded-full flex items-center justify-center font-black text-sm`}
                  >
                    {item.initials}
                  </div>

                  <div>
                    <p className={`font-black uppercase tracking-wider text-sm ${item.color}`}>
                      {item.author}
                    </p>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Marquee Animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default Testimonials;
