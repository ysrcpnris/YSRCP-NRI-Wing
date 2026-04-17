import React from "react";
import nriLogo from "./nrilogo.png";

// Images array
const images = [
  { src: "/images/jagan1.jpg.jpg" },
  { src: "/images/jagan2.jpg.jpg" },
  { src: "/images/jagan3.jpg.jpg" },
  { src: "/images/jagan4.jpg.jpg" },
];

export default function GlimpseGallery() {
  return (
    <section id="glimpse" className="py-12 sm:py-16 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-600 mb-2 flex items-center justify-center gap-3">
            <img
              src={nriLogo}
              alt="YSRCP Logo"
              className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full object-cover shadow-sm"
            />
            YSRCP
          </h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Explore key moments from the gallery.
          </p>
        </div>

        {/* Single auto-scroll row */}
        <div className="overflow-hidden">
          <div className="flex animate-scroll gap-3 sm:gap-4">
            {images.concat(images).map((img, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-60 h-72 sm:w-72 sm:h-80 md:w-80 md:h-96 overflow-hidden rounded-xl relative group bg-white shadow-md"
              >
                <img
                  src={img.src}
                  alt={`Glimpse ${index + 1}`}
                  className="w-full h-full object-contain object-center bg-blue-100 transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Animation */}
      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .animate-scroll {
            animation: scroll 25s linear infinite;
          }
        `}
      </style>
    </section>
  );
}
