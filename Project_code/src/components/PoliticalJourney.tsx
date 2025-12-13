import { useState } from "react";

// ===========================================
// JOURNEY DATA
// ===========================================
const journeyData: Record<
  number,
  { title: string; points: string[]; image: string }
> = {
  2011: {
    title: "2011: The Inception",
    points: [
      "Founded on March 12 by Y.S. Jagan Mohan Reddy, inspired by Y.S. Rajasekhara Reddy’s welfare governance.",
      "Formed to uphold YSR’s legacy and give people a strong voice.",
      "Focused on pro-poor policies and governance reforms amid AP bifurcation debates.",
    ],
    image: "/images/jagan1.jpg.jpg",
  },
  2012: {
    title: "2012: Electoral Breakthrough",
    points: [
      "Won Nellore Lok Sabha seat and 15 of 18 Assembly by-elections.",
      "Established YSRCP as a major opposition force.",
      "Captured strong grassroots support challenging major political parties.",
    ],
    image: "/images/jagan2.jpg.jpg",
  },
  2014: {
    title: "2014: Pro-Poor Voice",
    points: [
      "Contested elections and won 70 Assembly & 9 Lok Sabha seats.",
      "Positioned as a strong pro-poor alternative.",
      "Highlighted welfare, social justice, and anti-corruption as key agenda.",
    ],
    image: "/images/jagan3.jpg.jpg",
  },
  2017: {
    title: "2017: Strategic Partnership",
    points: [
      "Partnered with strategist Prashant Kishor to strengthen organization.",
      "Executed data-driven voter outreach and booth-level planning.",
      "Deepened grassroots engagement statewide.",
    ],
    image: "/images/jagan4.jpg.jpg",
  },
  2018: {
    title: "2018: Praja Sankalpa Yatra",
    points: [
      "YS Jagan launched a massive statewide padayatra covering thousands of kilometers.",
      "Millions participated, voicing local issues and aspirations.",
      "Communicated welfare promises and anti-corruption agenda.",
    ],
    image: "/images/jagan1.jpg.jpg",
  },
  2019: {
    title: "2019: Landslide Victory",
    points: [
      "Won 151/175 Assembly seats and 22 Lok Sabha seats.",
      "Introduced historic welfare schemes like Amma Vodi and enhanced pensions.",
      "Proved commitment to social justice and development.",
    ],
    image: "/images/jagan2.jpg.jpg",
  },
  2021: {
    title: "2021: Local Dominance",
    points: [
      "Won 80%+ ZPTC and MPTC seats, sweeping rural elections.",
      "Grassroots network strengthened public trust.",
      "Reinforced governance reforms and welfare delivery.",
    ],
    image: "/images/jagan3.jpg.jpg",
  },
  2024: {
    title: "2024: Committed Opposition",
    points: [
      "Secured 11 Assembly & 4 Lok Sabha seats as opposition.",
      "Continued advocacy for welfare-based governance.",
      "Maintained influence with 15 MPs, ensuring national representation.",
    ],
    image: "/images/jagan4.jpg.jpg",
  },
};

// ===========================================
// COMPONENT
// ===========================================
export default function PoliticalJourney() {
  const [selectedYear, setSelectedYear] = useState<number>(2011);

  const selected = journeyData[selectedYear];

  return (
    <section className="w-full bg-[#063A7A] py-12 md:py-16 text-white" id="journey">
      {/* MAIN TITLE */}
      <h2
        className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 sm:mb-8 tracking-wide"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        Our Political Journey: The Path to People's Trust
      </h2>

      {/* MAIN CARD */}
      <div
        className="
          max-w-5xl sm:max-w-6xl mx-auto bg-white text-black rounded-2xl shadow-2xl 
          p-4 sm:p-6 md:p-10 
          flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center
          border-4 border-[#00C85350]
        "
      >
        {/* LEFT IMAGE FRAME */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div className="bg-white border-4 border-[#00C853] rounded-xl shadow-xl p-2">
            <img
              src={selected.image}
              alt={selected.title}
              className="
                w-full 
                h-[350px] sm:h-[420px] md:h-[500px]
                rounded-lg object-cover shadow-lg
              "
            />
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="w-full md:w-1/2">
          <h3
            className="text-xl sm:text-2xl md:text-3xl font-bold text-[#063A7A] mb-3 sm:mb-4 underline underline-offset-4 decoration-[#00C853]"
            style={{ fontFamily: "Times New Roman, serif" }}
          >
            {selected.title}
          </h3>

          <ul className="list-disc ml-4 space-y-2 sm:space-y-3 text-gray-800 text-sm sm:text-base leading-relaxed">
            {selected.points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* YEAR BUTTONS */}
      <div className="flex justify-center mt-6 md:mt-10 gap-2 sm:gap-3 flex-wrap px-2 sm:px-3">
        {Object.keys(journeyData).map((yr) => {
          const year = Number(yr);
          const active = year === selectedYear;

          return (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`
                px-3 sm:px-5 md:px-7 py-1.5 sm:py-2 md:py-2.5
                rounded-lg font-semibold text-xs sm:text-sm md:text-base
                transition-all duration-200
                ${
                  active
                    ? "bg-[#00C853] text-white shadow-lg scale-105"
                    : "border border-white text-white hover:bg-white hover:text-[#063A7A]"
                }
              `}
              style={{ fontFamily: "Times New Roman, serif" }}
            >
              {year}
            </button>
          );
        })}
      </div>
    </section>
  );
}
