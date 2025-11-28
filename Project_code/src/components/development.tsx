import { useState } from "react";

type DevelopmentItem = {
title: string;
image: string;
description: string;
};

const developments: DevelopmentItem[] = [
{
title: "Health Infra",
image: "/images/jagan1.jpg.jpg",
description:
"Historic transformation in medical infrastructure including YSR Aarogyasri, village clinics, new medical colleges, and modernized government hospitals.",
},
{
title: "Nadu-Nedu",
image: "/images/jagan2.jpg.jpg",
description:
"Revolutionary upgrade of school infrastructure across Andhra Pradesh including digital classrooms, clean toilets, drinking water and compound walls.",
},
{
title: "Jagananna Housing",
image: "/images/jagan3.jpg.jpg",
description:
"World's largest housing project for the poor, providing over 30 lakh house sites and construction support to families.",
},
{
title: "YSR Pension Kanuka",
image: "/images/jagan4.jpg.jpg",
description:
"Timely monthly pensions delivered at doorstep with increased amounts benefiting millions.",
},
{
title: "Public Welfare",
image: "/images/jagan2.jpg.jpg",
description:
"Massive welfare schemes focusing on farmers, women, students, elderly and weaker sections.",
},
];

export default function Development() {
return ( <div className="w-full bg-[#EAF3FF] py-12">
{/* TOP BANNER IMAGE */} 

  <h2 className="text-center text-4xl font-bold mb-10 text-[#0A3E8C]">
    JAGAN MARK DEVELOPMENT
  </h2>

  {/* DEVELOPMENT CARDS */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-10">
    {developments.map((item, index) => (
      <div
        key={index}
        className="rounded-xl overflow-hidden shadow-lg bg-white flex flex-col items-center p-4"
      >
        <div className="w-full h-32 flex justify-center items-center bg-gray-100">
          <img
            src={item.image}
            alt={item.title}
            className="max-h-full w-auto object-contain"
          />
        </div>
        <div className="text-center mt-4">
          <h3 className="text-lg font-bold">{item.title}</h3>
          <p className="text-gray-700 text-sm mt-2">{item.description}</p>
        </div>
      </div>
    ))}
  </div>
</div>


);
}
