import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

const Hero: React.FC<HeroProps> = ({ onJoinNow }) => {
  const desktopSlides = [
    { img: "/Slider/simg1.jpeg" },
    { img: "/Slider/simg2.jpeg" },
    { img: "/Slider/simg3.jpeg" },
    { img: "/Slider/simg4.png" },
  ];

  const mobileSlides = [{ img: "/Slider/msimg1.jpeg" }];

  const [current, setCurrent] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);

    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Autoplay only for desktop
  useEffect(() => {
    if (isMobile) return;

    const id = setInterval(() => {
      setCurrent((prev) => (prev + 1) % desktopSlides.length);
    }, 4500);

    return () => clearInterval(id);
  }, [isMobile]);

  const slides = isMobile ? mobileSlides : desktopSlides;

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-white pt-10"
    >

    
      <div className="relative w-full">
        {slides.map((s, index) => (
          <img
            key={index}
            src={s.img}
            alt={`Slide ${index + 1}`}
            className={`w-full h-auto object-contain transition-opacity duration-1000 ${
              current === index
                ? "opacity-100 relative"
                : "opacity-0 absolute inset-0"
            }`}
          />
        ))}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/45 pointer-events-none"></div>

        {/* Text Content */}
        <div className="absolute inset-0 flex items-end justify-center text-center text-white pb-20 px-4">
          <div className="max-w-[95%] pb-10 mt-14 sm:mt-10">
            <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black leading-tight drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">
              Connecting NRIs with the Vision of a Progressive Andhra Pradesh
            </h1>
            <div className="h-1 w-24 bg-ysrcp-green mx-auto mt-5 rounded-full"></div>
          </div>
        </div>

        {/* Indicators (Desktop Only) */}
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
      </div>
    </section>
  );
};

export default Hero;