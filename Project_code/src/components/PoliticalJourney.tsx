import { useState } from "react";

const journeyData: Record<number, { title: string; points: string[] }> = {
  2011: {
    title: "2011: The Inception",
    points: [
      "YS Jagan Mohan Reddy founded YSRCP on March 12, inspired by the vision of Y.S. Rajasekhara Reddy.",
      "The party emerged as a strong voice for people after the tragic passing of YSR.",
      "Focused on welfare, integrity, and public service.",
    ],
  },
  2012: {
    title: "2012: Strengthening the Party",
    points: [
      "Mass outreach programs to connect with people across Andhra Pradesh.",
      "Committed to continuing YSR’s welfare legacy.",
      "Built strong organizational support at grassroots level.",
    ],
  },
  2014: {
    title: "2014: First Major Electoral Test",
    points: [
      "Contested state elections with welfare-driven agenda.",
      "Secured strong public support despite challenges.",
      "Continued fighting for special category status for AP.",
    ],
  },
  2017: {
    title: "2017: Praja Sankalpa Yatra",
    points: [
      "YS Jagan undertook a record-breaking 3,648 km padayatra.",
      "Direct interaction with lakhs of people strengthened public trust.",
      "Documented real issues of farmers, women, students, and workers.",
    ],
  },
  2018: {
    title: "2018: Welfare Commitments",
    points: [
      "Announced Navaratnalu — 9 flagship welfare promises.",
      "Focused on education, farmers, healthcare, women, and job creation.",
    ],
  },
  2019: {
    title: "2019: Historic Victory",
    points: [
      "YSRCP won with a record-breaking 151/175 seats.",
      "YS Jagan became the Chief Minister of Andhra Pradesh.",
      "Started implementing welfare promises immediately.",
    ],
  },
  2021: {
    title: "2021: Governance Strengthened",
    points: [
      "Delivered 95% Navaratnalu promises.",
      "Transparent DBT schemes transformed welfare delivery.",
      "Recognized nationally for governance reforms.",
    ],
  },
  2024: {
    title: "2024: Continued Commitment",
    points: [
      "Reaffirmed dedication to people-first governance.",
      "Strengthened welfare and developmental initiatives.",
      "Focus on youth empowerment, women safety, and digital AP.",
    ],
  },
};

const getImageByYear = (year: number): string => {
  if (year <= 2012) return "/images/jagan1.jpg.jpg";
  if (year <= 2014) return "/images/jagan2.jpg.jpg";
  if (year <= 2018) return "/images/jagan3.jpg.jpg";
  return "/images/jagan4.jpg.jpg";
};

export default function PoliticalJourney() {
  const [selectedYear, setSelectedYear] = useState<number>(2011);

  return (
    <section
      className="w-full bg-[#063A7A] py-14 md:py-20 text-white"
      id="journey"
    >
      <h2 className="text-center text-3xl md:text-4xl font-bold mb-10 md:mb-12 px-4">
        Our Political Journey: The Path to People's Trust
      </h2>

      {/* CARD */}
      <div
        className="
        max-w-6xl mx-auto bg-white text-black rounded-xl shadow-lg 
        p-4 sm:p-6 md:p-8 
        flex flex-col md:flex-row gap-6 items-start md:items-center
      "
      >

        {/* LEFT IMAGE — FIXED VISIBILITY */}
        <div className="w-full md:w-1/2 flex justify-center items-center bg-black rounded-lg p-2">
          <img
            src={getImageByYear(selectedYear)}
            alt="YS Jagan"
            className="
              w-full 
              max-h-[350px]
              rounded-lg
              object-contain     /* no cropping */
              bg-black
              shadow-lg
            "
          />
        </div>

        {/* RIGHT CONTENT */}
        <div className="w-full md:w-1/2">
          <h3 className="text-xl md:text-2xl font-bold text-[#0A3C81] mb-3 md:mb-4">
            {journeyData[selectedYear].title}
          </h3>

          <ul className="list-disc ml-4 space-y-2 text-gray-700 text-sm md:text-base">
            {journeyData[selectedYear].points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* YEAR BUTTONS */}
      <div className="flex justify-center mt-8 gap-3 flex-wrap px-3">
        {Object.keys(journeyData).map((yr) => {
          const year = Number(yr);
          return (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`
                px-4 md:px-6 py-2 
                rounded-lg font-semibold border text-sm md:text-base 
                transition 
                ${
                  selectedYear === year
                    ? "bg-[#0A9A4A] text-white border-[#0A9A4A]"
                    : "border-white text-white hover:bg-white hover:text-[#063A7A]"
                }
              `}
            >
              {year}
            </button>
          );
        })}
      </div>
    </section>
  );
}
