import { useRef, useEffect } from "react";

// type Scheme = {
//   title: string;
//   description: string;
//   image: string;
//   url: string;/
// };

// export const SCHEMES: Scheme[] = [
//   { title: 'Medical Colleges', description: 'Establishing new medical colleges.', image: '/medical college.png', url: 'https://www.linkedin.com/posts/ysjagan_from-1923-until-2019-andhra-pradesh-had-activity-7369974675151515648-swRv' },
//   { title: 'Grama Sachivalayams', description: 'Village secretariats.', image: '/sachivalyam.png', url: 'https://www.ysrcongress.com/news/ap-village-secretariat-69595' },
//   { title: 'RBKS', description: 'Rythu Bharosa Kendras.', image: '/images/jagan3.jpg.jpg', url: 'https://www.ysrcongress.com/top-stories/naidu-pushes-farmers-crisis-99264' },
//   { title: 'Nadu-Nedu', description: 'Revamping schools & hospitals.', image: '/nadu nedu.png.png', url: 'https://www.ysrcongress.com/top-stories/mana-badi-nadu-nedu-will-70175' },
//   { title: 'Health Infra', description: 'Strengthening healthcare systems.', image: '/healthinfra.png', url: 'https://www.ysrcongress.com/special-news/ysrcp%E2%80%99s-statewide-protest-98775' },
//   { title: 'Amma Vodi', description: 'Financial support to mothers.', image: '/images/jagan2.jpg.jpg', url: 'https://www.ysrcongress.com/top-stories/amma-vodi-scheme-announced-70962' },
//   { title: 'YSR Pension Kanuka', description: 'Social security pensions.', image: '/images/jagan3.jpg.jpg', url: 'https://services.india.gov.in/service/detail/ysr-pension-kanuka-sanction-of-new-pension-in-andhra-pradesh-1' },
//   { title: 'Jagananna Housing', description: 'Housing for the poor.', image: '/images/jagan4.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
//   { title: 'Kapu Nestham', description: 'Financial aid for Kapu women.', image: '/images/jagan1.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
//   { title: 'Public Welfare', description: 'Comprehensive welfare.', image: '/images/jagan2.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
//   { title: 'Ports', description: 'Developing new ports.', image: '/images/jagan3.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
//   { title: 'Harbours', description: 'Fishing harbours.', image: '/images/jagan4.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
//   { title: 'Industries', description: 'Industrial development.', image: '/images/jagan1.jpg.jpg', url: 'https://www.ysrcongress.com/en' },
// ];

// export default function DevelopmentShowcase() {
//   const scrollRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//   const speed = 0.5; // fast & smooth
//   let animationFrame: number;

//   const autoScroll = () => {
//     const el = scrollRef.current;
//     if (el) {
//       el.scrollLeft += speed;

//       // ✅ reset exactly at half (because content is duplicated)
//       if (el.scrollLeft >= el.scrollWidth / 2) {
//         el.scrollLeft = 0;
//       }
//     }

//     animationFrame = requestAnimationFrame(autoScroll);
//   };

//   animationFrame = requestAnimationFrame(autoScroll);

//   return () => cancelAnimationFrame(animationFrame);
// }, []);


//   return (
//     <div id="development" className="w-full py-10">
//       <h2 className="text-center text-3xl md:text-4xl font-bold mb-8 text-[#0A3E8C]">
//         JAGAN MARK DEVELOPMENT
//       </h2>

//       <div
//         ref={scrollRef}
//         id="development-slider"
//         className="flex gap-4 overflow-x-hidden px-4 md:px-10 pb-4"
//         style={{
//           scrollbarWidth: "none",
//           msOverflowStyle: "none"
//         }}
//       >
//         {/* Hide scrollbar */}
//         <style>{`
//           #development-slider::-webkit-scrollbar {
//             display: none;
//           }
//         `}</style>

//         {SCHEMES.concat(SCHEMES).map((item, i) => (
//           <a
//             key={i}
//             href={item.url}
//             target="_blank"
//             rel="noopener noreferrer"
//             className="min-w-[260px] h-[260px] rounded-xl overflow-hidden relative shadow-lg flex-shrink-0 transition-transform hover:scale-105 bg-white"
//           >
    //         <img
    //           src={item.image}
    //           alt={item.title}
    //           className="w-full h-full object-contain bg-gray-100 select-none pointer-events-none"
    //         />

    //         <div className="absolute bottom-0 left-0 w-full bg-white/60 px-2 py-2 text-center">
    //           <span className="text-black text-lg md:text-xl font-bold tracking-wide">
    //             {item.title}
    //           </span>
    //         </div>
    //       </a>
    //     ))}
    //   </div>
    // </div>
  // );
// }
