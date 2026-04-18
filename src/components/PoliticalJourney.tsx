import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { journeyData } from "../lib/politicalJourneyData";
import { supabase } from "../lib/supabase";
import NotificationsFeed from "./NotificationsFeed";
import NewsCarousel from "./NewsCarousel";

export default function PoliticalJourney() {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(2018);
  const [showStayConnected, setShowStayConnected] = useState<boolean | null>(null); // null = loading
  const navigate = useNavigate();

  const years = Object.keys(journeyData).map(Number).sort((a, b) => a - b);
  const totalYears = years.length;

  // Fetch the toggle setting
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "show_stay_connected")
        .maybeSingle();

      if (!mounted) return;

      if (data) {
        const v = data.value;
        setShowStayConnected(v === true || v === "true");
      } else {
        // Default: ON if setting doesn't exist yet
        setShowStayConnected(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getTeaser = (year: number) => {
    const first = journeyData[year].points[0] || "";
    return first.length > 140 ? first.slice(0, 140).trim() + "..." : first;
  };

  const handleReadMore = (year: number) => {
    navigate(`/political-journey/${year}`);
  };

  // Smart alignment for hover popups (enhanced view only)
  const getPopupAlignment = (index: number) => {
    if (index <= 1) return "left-0";
    if (index >= totalYears - 2) return "right-0";
    return "left-1/2 -translate-x-1/2";
  };

  // While loading, render nothing (prevents flash of wrong layout)
  if (showStayConnected === null) {
    return (
      <section
        className="w-full bg-[#063A7A] pt-20 pb-20 text-white"
        id="journey"
      />
    );
  }

  // ================================================================
  // OFF VIEW — original layout (heading → centered card → year buttons)
  // ================================================================
  if (!showStayConnected) {
    const selected = journeyData[selectedYear];
    return (
      <section
        className="w-full bg-[#063A7A] py-10 md:py-14 text-white"
        id="journey"
      >
        <h2
          className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6"
          style={{ fontFamily: "Times New Roman, serif" }}
        >
          Our Political Journey: The Path to People's Trust
        </h2>

        {/* Centered card: image + title + bullet points */}
        <div
          className="max-w-6xl mx-auto bg-white text-black rounded-2xl shadow-2xl
                     p-4 sm:p-5 md:p-6
                     flex flex-col md:flex-row gap-4 md:gap-6 items-center
                     border-4 border-accent-500/30"
        >
          <div className="w-full md:w-3/5">
            <div className="bg-white border-4 border-accent-500 rounded-xl shadow-xl p-2 w-full">
              <img
                src={selected.image}
                alt={selected.title}
                className="w-full h-[260px] sm:h-[340px] md:h-[420px] rounded-lg shadow-lg object-cover object-[50%_35%]"
              />
            </div>
          </div>

          <div className="w-full md:w-2/5">
            <h3
              className="text-xl sm:text-2xl md:text-3xl font-bold text-[#063A7A] mb-3 underline underline-offset-4 decoration-accent-500 text-justify"
              style={{ fontFamily: "Times New Roman, serif" }}
            >
              {selected.title}
            </h3>

            <ul className="list-disc ml-4 space-y-2 text-gray-800 text-sm sm:text-base leading-relaxed text-justify">
              {selected.points.map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>

            <button
              onClick={() => handleReadMore(selectedYear)}
              className="mt-4 text-sm font-semibold text-accent-600 hover:text-accent-700 transition"
            >
              Read full story →
            </button>
          </div>
        </div>

        {/* YEAR SELECTOR */}
        <div className="flex justify-center mt-6 md:mt-8 gap-2 sm:gap-3 flex-wrap px-2">
          {years.map((year) => {
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

  // ================================================================
  // ON VIEW — enhanced layout (Stay Connected + year timeline at bottom)
  // ================================================================
  return (
    <section
      className="w-full bg-gradient-to-br from-[#063A7A] via-[#0a4a9a] to-[#063A7A] pt-10 pb-10 md:pt-12 md:pb-12 text-white flex flex-col relative overflow-hidden"
      id="journey"
    >
      {/* Decorative background accents */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      {/* SECTION LABEL */}
      <div className="text-center mb-4 relative z-10">
        <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-xs font-semibold tracking-widest uppercase text-white/90">
          Stay Connected
        </span>
      </div>

      {/* TOP AREA: Notifications (narrower, left) + News (wider, right) */}
      <div className="max-w-7xl mx-auto w-full px-4 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-5 mb-10 relative z-10">
        <div className="lg:col-span-2 min-h-[460px]">
          <NotificationsFeed />
        </div>
        <div className="lg:col-span-3 min-h-[460px]">
          <NewsCarousel />
        </div>
      </div>

      {/* Section divider */}
      <div className="max-w-xs mx-auto w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mb-6 relative z-10" />

      <h2
        className="text-center text-lg sm:text-xl md:text-2xl font-extrabold mb-1 relative z-10"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        Our Political Journey: The Path to People's Trust
      </h2>
      <p className="text-center text-white/70 text-xs sm:text-sm mb-5 max-w-xl mx-auto px-4 relative z-10">
        Hover a year to preview, then click to explore the full story.
      </p>

      {/* YEAR TIMELINE WITH HOVER POPUPS */}
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
