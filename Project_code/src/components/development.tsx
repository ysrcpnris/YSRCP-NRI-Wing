import { useRef } from "react";

type Scheme = {
  title: string;
  description: string;
  image: string;
  url: string;
};

export const SCHEMES: Scheme[] = [
  { title: 'Medical Colleges', description: 'Establishing new medical colleges.', image: '/images/jagan1.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Grama Sachivalayams', description: 'Village secretariats.', image: '/images/jagan2.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'RBKS', description: 'Rythu Bharosa Kendras.', image: '/images/jagan3.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Nadu-Nedu', description: 'Revamping schools & hospitals.', image: '/images/jagan4.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Health Infra', description: 'Strengthening healthcare systems.', image: '/images/jagan1.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Amma Vodi', description: 'Financial support to mothers.', image: '/images/jagan2.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'YSR Pension Kanuka', description: 'Social security pensions.', image: '/images/jagan3.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Jagananna Housing', description: 'Housing for the poor.', image: '/images/jagan4.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Kapu Nestham', description: 'Financial aid for Kapu women.', image: '/images/jagan1.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Public Welfare', description: 'Comprehensive welfare.', image: '/images/jagan2.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Ports', description: 'Developing new ports.', image: '/images/jagan3.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Harbours', description: 'Fishing harbours.', image: '/images/jagan4.jpg.jpg', url: 'https://ysrcp.in' },
  { title: 'Industries', description: 'Industrial development.', image: '/images/jagan1.jpg.jpg', url: 'https://ysrcp.in' },
];

export default function DevelopmentShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div id="development" className="w-full py-10">
      <h2 className="text-center text-3xl md:text-4xl font-bold mb-8 text-[#0A3E8C]">
        JAGAN MARK DEVELOPMENT
      </h2>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-4 md:px-10 pb-4"
        style={{
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none" // IE/Edge
        }}
      >
        {/* Hide scrollbar for Chrome/Safari */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {SCHEMES.map((item, i) => (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            key={i}
            className="min-w-[260px] h-[260px] rounded-xl overflow-hidden relative shadow-lg flex-shrink-0 transition-transform hover:scale-105 bg-white"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-contain bg-gray-100 select-none pointer-events-none"
            />

            <div className="absolute bottom-0 left-0 w-full bg-black/60 px-2 py-2 text-center">
              <span className="text-white text-lg md:text-xl font-bold tracking-wide">
                {item.title}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
