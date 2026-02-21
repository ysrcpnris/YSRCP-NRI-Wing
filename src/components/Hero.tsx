import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  const desktopSlides = [
    { img: "/Slider/simg1.png" },
    { img: "/Slider/simg2.jpg" },
    //{ img: "/Slider/simg3.jpg" },
    { img: "/Slider/simg4.jpg" },
    //{ img: "/Slider/simg5.jpg" },
    //{ img: "/Slider/simg6.jpeg" },
  ];

  const mobileSlides = [{ img: "/Slider/msimg1.jpeg" }];

  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Determine if mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Slider interval (only if desktop)
  useEffect(() => {
    if (isMobile) return; // no autoplay for mobile (only one slide)
    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % desktopSlides.length);
    }, 4500);
    return () => clearInterval(id);
  }, [isMobile]);

  const slides = isMobile ? mobileSlides : desktopSlides;

  return (
    <section
      id="hero"
      className="relative w-full flex items-end justify-center text-center text-white pb-20 px-4 overflow-hidden"
      style={{ height: isMobile ? "calc(140vh - 72px)" : "calc(110vh - 72px)" }}
    >
      {/* Background Slider */}
      <div className="absolute inset-0 bg-fixed bg-center bg-cover bg-no-repeat transition-all duration-[1200ms]">
        {slides.map((s, index) => (
          <img
            key={index}
            src={s.img}
            className={`absolute ${
              isMobile
                ? "left-1/2 top-0 transform -translate-x-1/2 w-auto h-full"
                : "inset-0 w-full h-full"
            } object-cover transition-all duration-[1200ms] ${
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
      {!isMobile && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
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
      )}
    </section>
  );
};

export default Hero;
