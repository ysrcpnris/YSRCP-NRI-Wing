import { useEffect, useRef } from "react";

type DevelopmentItem = {
title: string;
description: string;
image: string;
bgColor: string;
};

const developments: DevelopmentItem[] = [
{ title: "Health Infra", description: "Historic transformation in medical infrastructure including YSR Aarogyasri, village clinics, new medical colleges, and modernized government hospitals.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFD9D9" },
{ title: "Nadu-Nedu", description: "Revolutionary upgrade of school infrastructure across Andhra Pradesh including digital classrooms, clean toilets, drinking water and compound walls.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9F0FF" },
{ title: "Jagananna Housing", description: "World's largest housing project for the poor, providing over 30 lakh house sites and construction support to families.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFF0D9" },
{ title: "YSR Pension Kanuka", description: "Timely monthly pensions delivered at doorstep with increased amounts benefiting millions.", image: "/images/jagan1.jpg.jpg", bgColor: "#E0FFD9" },
{ title: "Public Welfare", description: "Massive welfare schemes focusing on farmers, women, students, elderly and weaker sections.", image: "/images/jagan1.jpg.jpg", bgColor: "#F9D9FF" },
{ title: "Mission Bhagiratha", description: "Clean drinking water provided to every household in Andhra Pradesh through extensive water infrastructure projects.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9FFF6" },
{ title: "YSR Rythu Bharosa", description: "Financial assistance for farmers ensuring their crops and livelihoods are secured.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFE6D9" },
{ title: "Aarogyasri Expansion", description: "Enhanced healthcare coverage with free treatments for all serious ailments.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9E6FF" },
{ title: "Digital Classrooms", description: "Introduction of e-learning facilities in schools to modernize education.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFF9D9" },
{ title: "YSR Cheyutha", description: "Empowering women of weaker sections with financial support and skill development.", image: "/images/jagan1.jpg.jpg", bgColor: "#F0D9FF" },
{ title: "YSR Pension Enhancement", description: "Increasing monthly pension amounts for senior citizens, disabled, and widows.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9FFF0" },
{ title: "Road Infrastructure", description: "Development of new highways, roads, and rural connectivity across the state.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFE0D9" },
{ title: "Urban Development", description: "Modernization of city infrastructure including parks, roads, and public transport.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9F7FF" },
{ title: "Education Scholarships", description: "Financial support and scholarships for students to continue their education.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFF2D9" },
{ title: "Skill Development Programs", description: "Training programs to improve employment opportunities for youth.", image: "/images/jagan1.jpg.jpg", bgColor: "#EAD9FF" },
{ title: "Smart Villages", description: "Rural modernization projects including sanitation, electricity, and internet connectivity.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9FFF5" },
{ title: "Housing for All", description: "Providing affordable and quality housing to economically weaker sections.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFEAD9" },
{ title: "Women Empowerment Schemes", description: "Programs focused on enhancing women participation in economy and society.", image: "/images/jagan1.jpg.jpg", bgColor: "#D9E9FF" },
{ title: "Student Kits & Supplies", description: "Distribution of free educational kits and resources to students in government schools.", image: "/images/jagan1.jpg.jpg", bgColor: "#FFF6D9" },
{ title: "Healthcare Facilities Expansion", description: "Upgrading district hospitals and primary healthcare centers across the state.", image: "/images/jagan1.jpg.jpg", bgColor: "#F2D9FF" },
];

export default function DevelopmentShowcase() {
const scrollRef1 = useRef<HTMLDivElement>(null);
const scrollRef2 = useRef<HTMLDivElement>(null);

useEffect(() => {
const scrollContainers = [scrollRef1.current, scrollRef2.current];
const scrollStep = 2; // faster


const interval = setInterval(() => {
  scrollContainers.forEach((scrollContainer) => {
    if (!scrollContainer) return;
    let currentScroll = scrollContainer.scrollLeft + scrollStep;
    if (currentScroll >= scrollContainer.scrollWidth / 2) currentScroll = 0;
    scrollContainer.scrollTo({
      left: currentScroll,
      behavior: "smooth",
    });
  });
}, 15); // slightly faster interval

return () => clearInterval(interval);


}, []);

const firstRow = developments.slice(0, 10);
const secondRow = developments.slice(10, 20);

const renderRow = (items: DevelopmentItem[], ref: React.RefObject<HTMLDivElement>) => ( <div
   ref={ref}
   className="flex gap-4 overflow-x-hidden px-4 md:px-10 mb-6"
 >
{items.concat(items).map((item, index) => (
<div
key={index}
className="min-w-[150px] flex-shrink-0 rounded-lg overflow-hidden shadow-md flex flex-col items-center p-3"
style={{ backgroundColor: item.bgColor }}
> <div className="w-full h-24 flex justify-center items-center rounded-md"> <img
           src={item.image}
           alt={item.title}
           className="max-h-full w-auto object-contain"
         /> </div> <div className="text-center mt-3"> <h3 className="text-sm font-semibold">{item.title}</h3> <p className="text-gray-700 text-xs mt-1">{item.description}</p> </div> </div>
))} </div>
);

return ( <div className="w-full py-8"> <h2 className="text-center text-3xl md:text-4xl font-bold mb-8 text-[#0A3E8C]">
JAGAN MARK DEVELOPMENT SHOWCASE </h2>


  {renderRow(firstRow, scrollRef1)}
  {renderRow(secondRow, scrollRef2)}
</div>


);
}
