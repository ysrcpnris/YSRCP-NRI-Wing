import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

export default function Hero({ onJoinNow }: HeroProps) {
  const slides = [
    {
      img: "/ECOd9I9UYAAkV4h.jpg",
      quote:
        "Our NRI community is not just living abroad — they are ambassadors of Andhra Pradesh’s culture and values.",
      cite: "— Y.S. Jagan Mohan Reddy",
      sub: "Global Telugu Conference",
    },
    {
      img: "/ECOe4WuUIAAFYiH.jpg",
      quote:
        "Together, we can build an ecosystem that boosts Andhra Pradesh through education, innovation, and investment.",
      cite: "— NRI Wing",
      sub: "Advantage Andhra",
    },
    {
      img: "/ECVhnUTVUAAin44.jpg",
      quote:
        "When NRIs collaborate with local communities, progress becomes sustainable and inclusive.",
      cite: "— Community Leader",
      sub: "International Meet",
    },
    {
      img: "/GcUMiSybkAMyZCL.jpg",
      quote:
        "Our global exposure can transform and uplift our home state.",
      cite: "— Global Delegate",
      sub: "Summit 2025",
    },
  ];

  const [current, setCurrent] = useState(0);

  // Auto-slide every 4.5 sec
  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="hero" className="w-full mt-[72px] bg-white">

      {/* Grid → Stacks on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[80vh] lg:min-h-[90vh]">

        {/* LEFT SECTION — QUOTE BOX + BANNER */}
        <div className="flex items-center justify-center px-5 py-10 md:p-10 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-600 text-white">

          <div className="w-full max-w-xl backdrop-blur-xl bg-white/10 p-6 md:p-8 rounded-3xl shadow-2xl border border-white/20">

            {/* Banner Image */}
            <img
              src="/Banner.jpg"
              alt="NRI Wing Banner"
              className="w-full mb-5 md:mb-6 rounded-xl shadow-lg object-cover max-h-48 md:max-h-64"
            />

            <h1 className="text-2xl md:text-4xl font-extrabold mb-4 md:mb-6 leading-tight drop-shadow-lg">
              Inspiring the Global Telugu Community
            </h1>

            <p className="text-base md:text-xl italic mb-3 md:mb-4">
              {slides[current].quote}
            </p>

            <p className="text-sm font-semibold">{slides[current].cite}</p>

            <p className="text-xs opacity-80 mt-1">{slides[current].sub}</p>

            {/* Join Now Button */}
            <button
              onClick={onJoinNow}
              className="mt-6 w-full md:w-auto px-7 py-3 rounded-xl bg-white text-blue-900 font-bold shadow-xl hover:bg-gray-200 active:scale-95 transition"
            >
              Join Now
            </button>

          </div>
        </div>

        {/* RIGHT SECTION — SLIDESHOW */}
        <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-full overflow-hidden bg-black">

          {slides.map((s, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-all duration-[1200ms] ease-in-out ${
                current === index
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-110"
              }`}
            >
              <img
                src={s.img}
                alt="Slide"
                className="w-full h-full object-cover"
              />
            </div>
          ))}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`w-3 h-3 rounded-full transition-all ${
                  idx === current
                    ? "bg-white scale-150 shadow"
                    : "bg-white/40 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
