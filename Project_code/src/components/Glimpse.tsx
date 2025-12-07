import React from "react";
import { Download } from "lucide-react";

// Images array
const images = [
  { src: "/images/jagan1.jpg.jpg", highRes: "/images/jagan1.jpg.jpg" },
  { src: "/images/jagan2.jpg.jpg", highRes: "/images/jagan2.jpg.jpg" },
  { src: "/images/jagan3.jpg.jpg", highRes: "/images/jagan3.jpg.jpg" },
  { src: "/images/jagan4.jpg.jpg", highRes: "/images/jagan4.jpg.jpg" },
];

export default function GlimpseGallery() {
  return (
    <section id="glimpse" className="py-12 sm:py-16 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-blue-600 mb-2">
            📸 Glimpses of YSCP Party
          </h2>
          <p className="text-gray-700 text-sm sm:text-base">
            Explore key moments and download high-resolution wallpapers directly
            from the gallery.
          </p>
        </div>

        {/* Auto-scroll two-row gallery */}
        <div className="overflow-hidden">
          {/* Row 1 */}
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

                <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-80 cursor-pointer">
                  <Download size={14} />
                  <a href={img.highRes} download className="hover:underline">
                    Download
                  </a>
                </span>
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex animate-scroll-reverse gap-3 sm:gap-4 mt-3 sm:mt-4">
            {images.concat(images).map((img, index) => (
              <div
                key={index + images.length}
                className="flex-shrink-0 w-60 h-72 sm:w-72 sm:h-80 md:w-80 md:h-96 overflow-hidden rounded-xl relative group bg-white shadow-md"
              >
                <img
                  src={img.src}
                  alt={`Glimpse ${index + 1}`}
                  className="w-full h-full object-contain object-center bg-blue-100 transition-transform duration-300 group-hover:scale-105"
                />

                <span className="absolute bottom-2 left-2 flex items-center gap-1 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-80 cursor-pointer">
                  <Download size={14} />
                  <a href={img.highRes} download className="hover:underline">
                    Download
                  </a>
                </span>
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
          @keyframes scroll-reverse {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-scroll {
            animation: scroll 40s linear infinite;
          }
          .animate-scroll-reverse {
            animation: scroll-reverse 50s linear infinite;
          }
        `}
      </style>
    </section>
  );
}
