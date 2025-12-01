import React from "react";

const images = [
"/images/jagan1.jpg.jpg",
"/images/jagan2.jpg.jpg",
"/images/jagan3.jpg.jpg",
"/images/jagan4.jpg.jpg",
"/images/jagan1.jpg.jpg",
"/images/jagan2.jpg.jpg",
"/images/jagan3.jpg.jpg",
"/images/jagan4.jpg.jpg",
"/images/jagan1.jpg.jpg",
"/images/jagan2.jpg.jpg",
"/images/jagan3.jpg.jpg",
"/images/jagan4.jpg.jpg",
];

export default function Glimpse() {
return ( <section className="py-12 sm:py-16 bg-blue-50"> <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> <div className="text-center mb-10 sm:mb-12"> <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
Glimpses of Progress </h2> <p className="text-gray-700 text-sm sm:text-base">
Explore key moments and download high-resolution wallpapers directly from the gallery. </p> </div>


    {/* Auto-scroll two-row gallery */}
    <div className="overflow-hidden">
      {/* Row 1 */}
      <div className="flex animate-scroll gap-3 sm:gap-4">
        {images.concat(images).map((src, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-48 sm:w-64 md:w-72 lg:w-80 overflow-hidden rounded-xl relative group"
          >
            <img
              src={src}
              alt={`Glimpse ${index + 1}`}
              className="w-full h-36 sm:h-48 md:h-56 lg:h-64 object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-80">
              GALLERY
            </span>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="flex animate-scroll-reverse gap-3 sm:gap-4 mt-3 sm:mt-4">
        {images.concat(images).map((src, index) => (
          <div
            key={index + images.length}
            className="flex-shrink-0 w-48 sm:w-64 md:w-72 lg:w-80 overflow-hidden rounded-xl relative group"
          >
            <img
              src={src}
              alt={`Glimpse ${index + 1}`}
              className="w-full h-36 sm:h-48 md:h-56 lg:h-64 object-cover transform group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute bottom-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-80">
              GALLERY
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>

  {/* Inline styles for auto-scroll animation */}
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
        display: flex;
        width: max-content;
        animation: scroll 40s linear infinite;
      }

      .animate-scroll-reverse {
        display: flex;
        width: max-content;
        animation: scroll-reverse 50s linear infinite;
      }
    `}
  </style>
</section>


);
}
