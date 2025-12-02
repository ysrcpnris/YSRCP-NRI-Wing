import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  const slides = [
    { img: "/ECOd9I9UYAAkV4h.jpg" },
    { img: "/ECOe4WuUIAAFYiH.jpg" },
    { img: "/ECVhnUTVUAAin44.jpg" },
    { img: "/GcUMiSybkAMyZCL.jpg" },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative w-full h-[70vh] sm:h-[85vh] lg:h-screen mt-[72px] flex items-end justify-center text-center text-white pb-20 px-4 overflow-hidden">

      {/* Background Slider */}
      <div className="absolute inset-0 bg-fixed bg-center bg-cover bg-no-repeat transition-all duration-[1200ms]">
        {slides.map((s, index) => (
          <img
            key={index}
            src={s.img}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-[1200ms] ${
              current === index ? "opacity-100 scale-100" : "opacity-0 scale-110"
            }`}
          />
        ))}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/45"></div>
      </div>

      {/* Text Content */}
      <div className="relative z-10 max-w-[95%] pb-10 animate-fade-in-up mt-14 sm:mt-10">
        <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">
          Connecting NRIs with the Vision of a Progressive Andhra Pradesh
        </h1>

        <div className="h-1 w-24 bg-ysrcp-green mx-auto mt-5 rounded-full"></div>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-3 h-3 rounded-full transition-all ${
              idx === current ? "bg-white scale-150 shadow" : "bg-white/40 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
