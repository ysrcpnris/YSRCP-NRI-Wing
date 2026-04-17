import React, { useEffect, useState } from "react";

type HeroProps = {
  onJoinNow: () => void;
};

const Hero: React.FC<HeroProps> = () => {
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
      className="relative w-full overflow-hidden bg-black"
    >
      {/* Image area — full viewport height so next section doesn't peek in */}
      <div className="relative w-full h-screen min-h-[520px]">
        {slides.map((s, index) => (
          <img
            key={index}
            src={s.img}
            alt={`Slide ${index + 1}`}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ${
              current === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Gradient overlay — darker at bottom (for text readability), fades up */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none" />

        {/* Subtle vignette on edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none" />

        {/* Text Content */}
        <div className="absolute inset-0 flex items-end justify-center text-center text-white pb-16 sm:pb-20 md:pb-24 px-4">
          <div className="max-w-4xl">
            <h1
              className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight"
              style={{
                textShadow:
                  "0 2px 8px rgba(0,0,0,0.85), 0 4px 24px rgba(0,0,0,0.6)",
              }}
            >
              Connecting <span className="text-accent-400">NRIs</span> with the Vision of a{" "}
              <span className="text-accent-400">Progressive</span> Andhra Pradesh
            </h1>
            <div className="h-1 w-20 sm:w-28 bg-accent-500 mx-auto mt-4 sm:mt-5 rounded-full shadow-lg" />
          </div>
        </div>

        {/* Indicators (Desktop Only) */}
        {!isMobile && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex space-x-2.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === current
                    ? "w-8 bg-white shadow-lg"
                    : "w-2 bg-white/50 hover:bg-white/80"
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
