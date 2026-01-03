import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Leaf, GraduationCap, HeartHandshake, Landmark, Construction, Factory, Users, Scale, Map, Activity, Heart, TrendingUp } from 'lucide-react';

const PILLARS = [
  {
    id: 1,
    title: "Blue Economy",
    info: "Ports, shipping, fisheries, aquaculture, coastal trade and marine livelihoods.",
    image: "/blueeconomy.png",
    icon: <Globe className="text-blue-500" />
  },
  {
    id: 2,
    title: "Agricultural Reforms",
    info: "Farmer income security, MSP, irrigation, crop planning and agri exports.",
    image: "/agricultue.png",
    icon: <Leaf className="text-green-500" />
  },
  {
    id: 3,
    title: "Education, Skill Development & Youth",
    info: "Education reforms, skill universities, employability and youth empowerment.",
    image: "/education.png",
    icon: <GraduationCap className="text-indigo-500" />
  },
  {
    id: 4,
    title: "Welfare Architecture",
    info: "Direct Benefit Transfer, pensions, farmer welfare and social security delivery.",
    image: "/welfare.png",
    icon: <HeartHandshake className="text-red-500" />
  },
  {
    id: 5,
    title: "Governance Reforms",
    info: "Village and Ward Secretariats, volunteer system, transparency and citizen-centric service delivery.",
    image: "/governance.png",
    icon: <Landmark className="text-ysrcp-blue" />
  },
  {
    id: 6,
    title: "Infrastructure Development",
    info: "Roads, housing, water supply, sanitation and public infrastructure.",
    image: "/infrastructure.png",
    icon: <Construction className="text-amber-600" />
  },
  {
    id: 7,
    title: "Industrial & Employment Growth",
    info: "Industrial parks, MSMEs, manufacturing, investment facilitation and job creation.",
    image: "/growth.png",
    icon: <Factory className="text-slate-600" />
  },
  {
    id: 8,
    title: "Women Empowerment",
    info: "SHGs, entrepreneurship, credit linkage and financial inclusion.",
    image: "/women.png",
    icon: <Users className="text-pink-500" />
  },
  {
    id: 9,
    title: "Social Justice",
    info: "SC, ST, BC, minority welfare and inclusive development.",
    image: "/justice.png",
    icon: <Scale className="text-purple-600" />
  },
  {
    id: 10,
    title: "Decentralised Development",
    info: "Regional balance, district empowerment and grassroots leadership.",
    image: "/centra.png",
    icon: <Map className="text-emerald-600" />
  },
  {
    id: 11,
    title: "Healthcare Reforms",
    info: "Free treatment via Arogyasri, medical colleges, and village clinics for strong public health.",
    image: "/health.png",
    icon: <Heart className="text-red-500" />
  },
  {
    id: 12,
    title: "Economic Growth",
    info: "Welfare-led growth putting money in people's hands and strengthening local markets.",
    image: "/economy.png",
    icon: <TrendingUp className="text-ysrcp-blue" />
  }
];

interface TenPillarsProps {
  onPillarSelect?: (pillar: any) => void;
}

const TenPillars: React.FC<TenPillarsProps> = ({ onPillarSelect }) => {
  const navigate = useNavigate();

  const handlePillarClick = (pillar: any) => {
    onPillarSelect?.(pillar);
    // Navigate to the pillar details page with the pillar ID
    navigate(`/pillars/${pillar.id}`);
  };
  return (
    <section id="section-pillars" className="py-24 px-6 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="px-4 py-1.5 bg-ysrcp-blue/10 text-ysrcp-blue rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Vision & Strategy</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tight">The Pillars of Progress</h2>
          <div className="w-24 h-2 bg-ysrcp-green mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {PILLARS.map((pillar, idx) => {
            return (
              <div 
                key={idx}
                onClick={() => handlePillarClick(pillar)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 border border-gray-100 shadow-sm hover:shadow-xl h-[300px] hover:scale-[1.02] active:scale-95"
              >
                {/* Background Image */}
                <img 
                  src={pillar.image} 
                  alt={pillar.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-500 opacity-80 group-hover:opacity-90"></div>

                {/* Content */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <div className="mb-2">
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-lg inline-block transform transition-transform group-hover:scale-110">
                      {pillar.icon}
                    </div>
                  </div>
                  
                  <h3 className="font-black uppercase tracking-tight leading-tight transition-all duration-300 text-sm mb-2 group-hover:text-ysrcp-yellow">
                    {pillar.title}
                  </h3>
                  
                  <p className="text-gray-200 text-[10px] font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300 line-clamp-2">
                    {pillar.info}
                  </p>

                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-ysrcp-green flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    View Detailed Roadmap &rarr;
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TenPillars;