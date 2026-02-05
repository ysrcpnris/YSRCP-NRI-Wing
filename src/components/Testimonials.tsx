import React from "react";

const TESTIMONIALS_DATA = [
  {
    quote:
      "Jagan Anna's people-first governance inspires NRIs worldwide. His welfare schemes changed lives—proud to stand with him! Come back stronger!",
    author: "MR. Bharath Kandula",
    role: "Australia",
    //initials: "SR",
  },
  {
    quote:
      "From telemedicine top rank to industrial investments—Jagan Anna balanced welfare with strong economic development! ",
    author: "MR. Vamsi",
    role: "Australia",
  },
  {
    quote:
      "Under Jagan garu, AP topped Ease of Doing Business for consecutive years. Investor-friendly policies attracted global giants—economic boom!",
    author: "MR. Brahma Reddy",
    role: "Australia",
  },
  {
    quote:
      "Jagan garu's Global Investors Summit sealed Rs 13 lakh cr MoUs! Energy, IT, manufacturing—huge job creation for Andhra's future!",
    author: "MR. Bujje Babu",
    role: "Newzealand",
  },
  {
    quote:
      "Jagan Mohan Reddy's port & airport expansions + incentives drove exports & manufacturing. AP's economy transformed!",
    author: "MR. Krishna Reddy",
    role: "Australia",
  },
  /*{
    quote:
      "Legacy of Jagan garu: Massive investments, IT hubs, port growth—Andhra Pradesh's economic engine revved up under his vision!",
    author: "MR. Balaram Raju",
    role: "Baharain",
  },
  {
    quote:
      "Door-step governance & Navaratnalu delivered promises honestly. Jagan Mohan Reddy brought transparency & welfare to every household!",
    author: "MR. Elias",
    role: "GCC",
  },
  {
    quote:
      "Jagan garu's BC, SC, ST & minority empowerment schemes uplifted millions. Inclusive growth at its best—AP shines because of him!",
    author: "MR. Balireddy",
    role: "Kuwait",
  },
  {
    quote:
      "Youth skill training & job placements under Jagan's rule created opportunities. His focus on employment changed young Andhra!",
    author: "MR. Sashikiran",
    role: "Qatar",
  },
  {
    quote:
      "Jagan Anna's port-led industrialization unlocked AP's coastline potential. New ports & investments boosted economy massively! True visionary leader.",
    author: "MR. Shiva Annapareddy",
    role: "USA",
  },
  {
    quote:
      "Under Jagan garu, AP achieved No.1 Ease of Doing Business rank for years. Plug-and-play industries attracted huge global investments!",
    author: "MR. K V Reddy",
    role: "USA",
  },
  {
    quote:
      "Jagan Mohan Reddy's vision doubled manufacturing & trade via ports, airports, corridors. AP's GSDP soared to 11.43% growth—economic powerhouse!",
    author: "MR. Krishna Koduru",
    role: "USA",
  },
  {
    quote:
      "Infosys Development Center & Adani's massive data park in Vizag under Jagan's rule. IT boom created thousands of jobs & positioned AP as tech hub!",
    author: "MR. Subba Reddy Pammi",
    role: "USA",
  },
  {
    quote:
      "Jagan Anna pushed IT policy with incentives, subsidies & three IT Concept Cities. Futuristic reforms made AP fastest-growing state economically!",
    author: "MR. Chandrahas Peddamallu",
    role: "USA",
  },
  {
    quote:
      "Port expansions like Ramayapatnam & Machilipatnam under Jagan garu drove cargo growth & blue economy. AP's industrial rise is unmatched! ",
    author: "MR. Venu CH",
    role: "Canada",
  },
  {
    quote:
      "Jagan's industrial corridors (Hyderabad-Bangalore, Vizag-Chennai) & green energy push attracted Rs. lakhs cr investments. Economic revival!",
    author: "MR. Bhaskar Nallamilli",
    role: "Malaysia",
  },
  {
    quote:
      "From Rs. 13 lakh cr at GIS Summit to MSME job surge—Jagan Mohan Reddy's policies generated lakhs of jobs & boosted AP's economy! ",
    author: "MR. Murali Krishna",
    role: "Singapore",
  },
  {
    quote:
      "Jagan garu's transparent governance & investor-friendly policies ranked AP No.1 in EoDB. Industries flourished despite challenges! ",
    author: "MR. Karthik",
    role: "Netherlands",
  },
  {
    quote:
      "Adani's 300 MW data centers & tech park in Vizag—Jagan Anna's efforts connected AP to global IT ecosystem & created massive employment! ",
    author: "Dr. Pradeep Chinta",
    role: "UK",
  },
  {
    quote:
      "High GSDP growth, per capita income rise & double-digit sector GVAs under Jagan Mohan Reddy—silent economic revolution!",
    author: "MR. Obul Reddy",
    role: "UK",
  },
  {
    quote:
      "Amma Vodi, Vidya Kanuka, & health cards touched every family. Jagan's Navaratnalu made welfare direct & effective!",
    author: "MR. Vikram",
    role: "South Africa",
  },*/
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

        <div className="marquee flex gap-6 w-max animate-marquee px-6">
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
                  className={`italic text-sm sm:text-base leading-relaxed text-justify hyphens-auto ${textColor}`}
                >
                  “{item.quote}”
                </p>

                {/* Footer */}
                <div className="flex items-center gap-3 mt-6">
                  {/* -- */}

                  <div className="text-right flex-1">
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

        /* pause on hover */
        .marquee:hover {
        animation-play-state: paused;
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

/* here testimonals retrieve from database and display in the same format as above but add database code.
import React from "react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
}

interface TestimonialsProps {
  testimonials: Testimonial[];
}

const Testimonials: React.FC<TestimonialsProps> = ({ testimonials }) => {
  if (!testimonials || testimonials.length === 0) return null;

  const marqueeItems = [...testimonials, ...testimonials];

  return (
    <section className="relative bg-white py-10 overflow-hidden">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black uppercase text-blue-600">
          Voices of Our Global Community
        </h2>
      </div>

      <div className="relative w-full overflow-hidden">
        <div className="absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-white to-transparent z-10" />

        <div className="marquee flex gap-6 w-max animate-marquee px-6">
          {marqueeItems.map((item, idx) => {
            const isGreen = idx % 2 === 0;
            const borderColor = isGreen
              ? "border-l-green-600"
              : "border-l-blue-600";
            const textColor = isGreen
              ? "text-green-700"
              : "text-blue-700";

            return (
              <div
                key={idx}
                className={`w-[85vw] sm:w-[380px] min-h-[240px]
                bg-white rounded-2xl shadow-md border border-gray-200
                border-l-[6px] ${borderColor}
                p-6 flex flex-col justify-between`}
              >
                <p
                  className={`italic text-sm sm:text-base leading-relaxed text-justify hyphens-auto ${textColor}`}
                >
                  “{item.quote}”
                </p>

                <div className="mt-6 text-right">
                  <p className={`font-black text-xs uppercase ${textColor}`}>
                    {item.author}
                  </p>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">
                    {item.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }

        /* pause on hover 
        .marquee:hover {
        animation-play-state: paused;
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
*/