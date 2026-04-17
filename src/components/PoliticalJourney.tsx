import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { journeyData } from "../lib/politicalJourneyData";
import NotificationsFeed from "./NotificationsFeed";
import NewsCarousel from "./NewsCarousel";

export default function PoliticalJourney() {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const navigate = useNavigate();

  const years = Object.keys(journeyData).map(Number).sort((a, b) => a - b);
  const totalYears = years.length;

  const getTeaser = (year: number) => {
    const first = journeyData[year].points[0] || "";
    return first.length > 140 ? first.slice(0, 140).trim() + "..." : first;
  };

  const handleReadMore = (year: number) => {
    navigate(`/political-journey/${year}`);
  };

  // Smart alignment: edges align to the button side, middle centers
  const getPopupAlignment = (index: number) => {
    if (index <= 1) return "left-0"; // first two years → align popup left edge to button
    if (index >= totalYears - 2) return "right-0"; // last two years → align right edge
    return "left-1/2 -translate-x-1/2"; // center
  };

  return (
    <section
      className="w-full bg-gradient-to-br from-[#063A7A] via-[#0a4a9a] to-[#063A7A] pt-14 pb-14 md:pb-16 text-white flex flex-col relative overflow-hidden"
      id="journey"
    >
      {/* Decorative background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {/* SECTION LABEL */}
      <div className="text-center mb-6 relative z-10">
        <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-semibold tracking-widest uppercase text-white/90">
          Stay Connected
        </span>
      </div>

      {/* TOP AREA: Notifications (left) + News (right) */}
      <div className="max-w-7xl mx-auto w-full px-4 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-16 relative z-10">
        <div className="min-h-[500px]">
          <NotificationsFeed />
        </div>
        <div className="min-h-[500px]">
          <NewsCarousel />
        </div>
      </div>

      {/* Section divider */}
      <div className="max-w-xs mx-auto w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-10 relative z-10" />

      <h2
        className="text-center text-lg sm:text-xl md:text-2xl font-extrabold mb-1 relative z-10"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        Our Political Journey: The Path to People's Trust
      </h2>
      <p className="text-center text-white/70 text-xs sm:text-sm mb-5 max-w-xl mx-auto px-4 relative z-10">
        Hover a year to preview, then click to explore the full story.
      </p>

      {/* YEAR TIMELINE */}
      <div className="flex justify-center gap-2 sm:gap-3 flex-wrap px-4 relative z-10">
        {years.map((year, idx) => {
          const data = journeyData[year];
          const isActive = hoveredYear === year;

          return (
            <div
              key={year}
              className="relative"
              onMouseEnter={() => setHoveredYear(year)}
              onMouseLeave={() => setHoveredYear(null)}
            >
              <button
                onClick={() => handleReadMore(year)}
                className={`
                  px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3
                  rounded-lg font-semibold text-sm sm:text-base
                  transition-all duration-200
                  ${
                    isActive
                      ? "bg-accent-500 text-white shadow-xl scale-110"
                      : "border-2 border-white/60 text-white hover:border-white"
                  }
                `}
                style={{ fontFamily: "Times New Roman, serif" }}
              >
                {year}
              </button>

              {/* Popup — directly above button, smart edge alignment */}
              {isActive && (
                <div
                  className={`absolute bottom-full pb-2 ${getPopupAlignment(idx)} z-30 w-72 sm:w-80`}
                >
                  <div className="bg-white text-gray-900 rounded-xl shadow-2xl border-2 border-accent-500 overflow-hidden animate-fade-in">
                    <img
                      src={data.image}
                      alt={data.title}
                      className="w-full h-36 object-cover object-[50%_35%]"
                    />
                    <div className="p-4">
                      <h3
                        className="text-sm font-bold text-[#063A7A] mb-2 leading-tight"
                        style={{ fontFamily: "Times New Roman, serif" }}
                      >
                        {data.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">
                        {getTeaser(year)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReadMore(year);
                        }}
                        className="text-xs sm:text-sm font-semibold text-accent-600 hover:text-accent-700 transition"
                      >
                        Click here to read more →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
