import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

export default function Hero({ onJoinNow }: HeroProps) {
  const slides = [
    {
      img: "/ECOd9I9UYAAkV4h.jpg",
      quote:
        "Our NRI community is not just living abroad, they are ambassadors of Andhra Pradesh's culture and values.",
      cite: "— Y.S. Jagan Mohan Reddy",
      sub: "Global Telugu Conference",
    },
    {
      img: "/ECOe4WuUIAAFYiH.jpg",
      quote:
        "Together we can create an ecosystem that supports Andhra's growth — across education, innovation, and investment.",
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
        "Our collective experience abroad can be a catalyst to modernize and uplift our home state.",
      cite: "— Global Delegate",
      sub: "Summit 2025",
    },
  ];

  const [current, setCurrent] = useState(0);
  const length = slides.length;

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % length);
    }, 4000);
    return () => clearInterval(id);
  }, [length]);

  return (
    <>
      {/* HERO SECTION — WhatsApp image fully visible, just below header */}
      <section
        id="hero"
        className="relative flex items-center justify-center overflow-hidden bg-white mt-[80px] h-auto"
      >
        {/* NRI WING Banner */}
        <div className="w-full max-h-[80vh] overflow-hidden">
          <img src="/Banner.jpg" alt="NRI Wing Banner"
            className="w-full h-full object-contain"
            />
        </div>
      </section>

      {/* SLIDER SECTION — directly below hero, no gap */}
      <section className="relative h-[60vh] md:h-[70vh] lg:h-[80vh] overflow-hidden">
        {/* Slide Images */}
        <div className="absolute inset-0">
          {slides.map((s, idx) => (
            <div
              key={s.img}
              className={`absolute inset-0 transition-opacity duration-700 ${
                idx === current ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={idx === current ? "false" : "true"}
            >
              <img
                src={s.img}
                alt={`Slide ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Transparent overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-none"></div>

        {/* Quote box on the right */}
        <div className="absolute inset-0 flex items-center justify-end pointer-events-auto">
          <div className="max-w-md mr-6 md:mr-12">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 border border-white/30">
              <blockquote className="text-right">
                <p
                  className="text-lg md:text-xl text-white font-medium leading-relaxed mb-4 italic drop-shadow-lg"
                  aria-live="polite"
                >
                  {slides[current].quote}
                </p>
                <footer className="text-white/90">
                  <cite className="text-base font-semibold not-italic drop-shadow-lg">
                    {slides[current].cite}
                  </cite>
                  <p className="text-sm mt-1 text-white/80 drop-shadow-lg">
                    {slides[current].sub}
                  </p>
                </footer>
              </blockquote>
            </div>
          </div>
        </div>

        {/* Dots / manual slide control */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                idx === current
                  ? "bg-white scale-125"
                  : "bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      </section>
    </>
  );
}
