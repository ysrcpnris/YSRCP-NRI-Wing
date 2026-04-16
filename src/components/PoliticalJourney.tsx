import { useState } from "react";

// ===========================================
// JOURNEY DATA
// ===========================================
const journeyData: Record<
  number,
  { title: string; points: string[]; image: string }
> = {
  2011: {
    title: "2011: The Birth of a People's Revolution",
    points: [
      "On March 12, Jagan anna ignited a historic flame by founding YSRCP, rising from the ashes of betrayal to carry forward the sacred legacy of YSR.",
      "A fearless break from the old order, born to champion the oppressed, the farmer, the youth, and the worker.",
      "Jagan's triumphant Kadapa Lok Sabha victory in May became the first thunderous roar of the awakening.",
      "The party emerged as the unbreakable shield for the voiceless and the sword against corruption.",
      "A new era of justice, welfare, and hope dawned for Andhra Pradesh."
    ],
    image: "/Political_Journey/1y.jpg",
  },
  2012: {
    title: "2012: Unstoppable Rise Against All Odds",
    points: [
      "In a blaze of glory, YSRCP stormed by-elections—conquering 15 of 18 assembly seats and Nellore Lok Sabha in June, defying every storm.",
      "Even as their leader was unjustly imprisoned, the people's unbreakable faith turned adversity into triumph.",
      "YSRCP stood tall as the fearless champion of the poor, proving no force could silence the roar of the awakened people."
    ],
    image: "/Political_Journey/2012.jpeg",
  },
  2014: {
    title: "2014: The Dawn of a Mighty Opposition",
    points: [
      "In the crucible of post-bifurcation elections, YSRCP forged an iron opposition—securing 67 seats and nearly 40% vote share.",
      "YS Jagan rose as the indomitable Leader of Opposition, a beacon of resistance against injustice.",
      "The mandate echoed the people's hunger for true welfare and dignity.",
      "A heroic stand that planted the seeds for an epic comeback.",
      "The lion roared, promising to reclaim the throne for the masses."
    ],
    image: "/Political_Journey/2014.jpeg",
  },
  2017: {
    title: "2017: The Legendary March That Shook the State",
    points: [
      "November 6: YS Jagan embarked on the monumental Praja Sankalpa Padayatra from Idupulapaya—the longest, most heroic foot march in history.",
      "Walking over 3,600 km, he became one with the people, absorbing their pain and igniting hope.",
      "Lakhs poured out their hearts, turning villages into fortresses of support.",
      "A divine vow to end farmer suicides, unemployment, and betrayal.",
      "The yatra became the heartbeat of a revolution."
    ],
    image: "/Political_Journey/4y.jpg",
  },
  2018: {
    title: "2018: The Unyielding Flame of the Yatra",
    points: [
      "The epic Praja Sankalpa Yatra blazed on, covering vast lands and touching crores of souls.",
      "Even in temporary pause, the fire never dimmed—cadre galvanized, public fury against TDP mounted.",
      "Jagan exposed every injustice with unyielding courage.",
      "The longest padayatra in memory became legend, forging an unbreakable bond with the people.",
      "Victory was no longer a dream—it was destiny."
    ],
    image: "/Political_Journey/5y.jpg",
  },
  2019: {
    title: "2019: Triumph of the People's Will",
    points: [
      "May 2019: A historic tsunami—151 of 175 assembly seats and 22 of 25 Lok Sabha seats swept in divine mandate.",
      "YS Jagan ascended as Chief Minister on May 30, fulfilling the sacred promise made on dusty village paths.",
      "Navaratnalu welfare schemes rose like pillars of light for every household.",
      "The padayatra's vows transformed into reality—power returned to the poor.",
      "YSRCP became the invincible guardian of Andhra's destiny."
    ],
    image: "/Political_Journey/2019.jpeg",
  },
  2021: {
    title: "2021: Conquest of Hearts in Urban Battlegrounds",
    points: [
      "March 2021: An unstoppable wave—YSRCP captured 73 of 75 municipalities and 11 of 12 municipal corporations.",
      "Mid-tenure dominance proved the unbreakable trust of the people.",
      "Amma Vodi, Rythu Bharosa, and Aarogyasri shone as beacons of hope across cities and towns.",
      "Local governance became a fortress of welfare and justice.",
      "The heroic legacy grew stronger, defying every challenge."
    ],
    image: "/Political_Journey/7y.jpg",
  },
  2025: {
    title: "2025: The Rebirth – YSRCP 2.0 Rises Again",
    points: [
      "From the ashes of 2024, the phoenix awakens—YSRCP stands as the fierce sentinel of truth in opposition.",
      "YS Jagan declares the sacred statewide padayatra to reclaim justice for 2029.",
      "Relentless fight against farmer betrayal, healthcare collapse, and lawlessness.",
      "The legacy of Navaratnalu roars back—welfare shall rise again.",
      "A new chapter of heroism begins; the people's champion returns stronger."
    ],
    image: "/Political_Journey/2025.jpeg",
  },
};

// ===========================================
// COMPONENT
// ===========================================
export default function PoliticalJourney() {
  const [selectedYear, setSelectedYear] = useState<number>(2018);
  const selected = journeyData[selectedYear];

  return (
    <section
      className="w-full bg-[#063A7A] py-10 md:py-14 text-white"
      id="journey"
    >
      {/* TITLE */}
      <h2
        className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        Our Political Journey: The Path to People's Trust
      </h2>

      {/* CARD */}
      <div
        className="
          max-w-6xl mx-auto bg-white text-black rounded-2xl shadow-2xl
          p-4 sm:p-5 md:p-6
          flex flex-col md:flex-row gap-4 md:gap-6 items-center
          border-4 border-[#00C85350]
        "
      >
        {/* IMAGE SECTION */}
        <div className="w-full md:w-3/5">
          <div className="bg-white border-4 border-accent-500 rounded-xl shadow-xl p-2 w-full">
            <img
              src={selected.image}
              alt={selected.title}
              className="
                w-full
                h-[300px] sm:h-[360px] md:h-[440px]
                rounded-lg shadow-lg
                object-cover object-[50%_35%]
              "
            />
          </div>
        </div>

        {/* TEXT SECTION */}
        <div className="w-full md:w-2/5">
          <h3
            className="text-xl sm:text-2xl md:text-3xl font-bold text-[#063A7A] mb-3 underline underline-offset-4 decoration-accent-500 text-justify"
            style={{ fontFamily: 'Times New Roman, serif' }}
          >
            {selected.title}
          </h3>

          <ul className="list-disc ml-4 space-y-2 text-gray-800 text-sm sm:text-base leading-relaxed text-justify">
            {selected.points.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* YEAR SELECTOR */}
      <div className="flex justify-center mt-6 md:mt-8 gap-2 sm:gap-3 flex-wrap px-2">
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
                    ? "bg-accent-500 text-white shadow-lg scale-105"
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
