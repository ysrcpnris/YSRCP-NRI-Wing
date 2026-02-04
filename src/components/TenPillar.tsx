import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Leaf, GraduationCap, HeartHandshake, Landmark, Construction, Factory, Users, Scale, Map, Heart, TrendingUp } from 'lucide-react';

const PILLARS = [
  {
    id: 1,
    title: "Blue Economy",
    info: "Ports, shipping, fisheries, aquaculture, coastal trade and marine livelihoods.",
    image: "/pillar-images/159622322_3921148761238895_2124063265924097094_n.jpg",
    icon: <Globe className="text-blue-500" />
  },
  {
    id: 2,
    title: "Agricultural Reforms",
    info: "Farmer income security, MSP, irrigation, crop planning and agri exports.",
    image: "/pillar-images/128702759_3643024099051364_7728079183867142972_n.jpg",
    icon: <Leaf className="text-green-500" />
  },
  {
    id: 3,
    title: "Education, Skill Development & Youth",
    info: "Education reforms, skill universities, employability and youth empowerment.",
    image: "/pillar-images/495170491_1241218450705754_4998350073252110290_n.jpg",
    icon: <GraduationCap className="text-indigo-500" />
  },
  {
    id: 4,
    title: "Welfare Architecture",
    info: "Direct Benefit Transfer, pensions, farmer welfare and social security delivery.",
    image: "/pillar-images/600215068_1417738646387066_7593797886179697001_n.jpg",
    icon: <HeartHandshake className="text-red-500" />
  },
  {
    id: 5,
    title: "Governance Reforms",
    info: "Village and Ward Secretariats, volunteer system, transparency and citizen-centric service delivery.",
    image: "/pillar-images/468959763_8971065816247139_3372442148156847674_n.jpg",
    icon: <Landmark className="text-ysrcp-blue" />
  },
  {
    id: 6,
    title: "Infrastructure Development",
    info: "Roads, housing, water supply, sanitation and public infrastructure.",
    image: "/pillar-images/510788596_1276223217205277_8615475189619476412_n.jpg",
    icon: <Construction className="text-amber-600" />
  },
  {
    id: 7,
    title: "Industrial & Employment Growth",
    info: "Industrial parks, MSMEs, manufacturing, investment facilitation and job creation.",
    image: "/pillar-images/470042453_9007435769276810_2323383073333999001_n.jpg",
    icon: <Factory className="text-slate-600" />
  },
  {
    id: 8,
    title: "Women Empowerment",
    info: "SHGs, entrepreneurship, credit linkage and financial inclusion.",
    image: "/pillar-images/616827092_1443499287144335_5964224249188115272_n.jpg",
    icon: <Users className="text-pink-500" />
  },
  {
    id: 9,
    title: "Social Justice",
    info: "SC, ST, BC, minority welfare and inclusive development.",
    image: "/pillar-images/480737493_9446382862048763_929632864761132216_n.jpg",
    icon: <Scale className="text-purple-600" />
  },
  {
    id: 10,
    title: "Decentralised Development",
    info: "Regional balance, district empowerment and grassroots leadership.",
    image: "/pillar-images/482100581_9488420077845041_2943274274254903894_n.jpg",
    icon: <Map className="text-emerald-600" />
  },
  {
    id: 11,
    title: "Healthcare Reforms",
    info: "Free treatment via Arogyasri, medical colleges, and village clinics for strong public health.",
    image: "/pillar-images/487072673_9604201229600258_7691177371061798975_n.jpg",
    icon: <Heart className="text-red-500" />
  },
  {
    id: 12,
    title: "Economic Growth",
    info: "Welfare-led growth putting money in people's hands and strengthening local markets.",
    image: "/pillar-images/525018991_1302193227941609_2585825087392610829_n.jpg",
    icon: <TrendingUp className="text-ysrcp-blue" />
  }
];

interface Pillar {
  id: number;
  title: string;
  info: string;
  image: string;
  icon: React.ReactNode;
}

interface TenPillarsProps {
  onPillarSelect?: (pillar: Pillar) => void;
} 

const TenPillars: React.FC<TenPillarsProps> = ({ onPillarSelect }) => {
  const navigate = useNavigate();

  const [currentIdx, setCurrentIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = cardRefs.current.findIndex(el => el === entry.target);
          if (idx >= 0) setCurrentIdx(idx);
        }
      });
    }, { root, threshold: 0.6 });

    cardRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handlePillarClick = (pillar: Pillar) => {
    onPillarSelect?.(pillar);
    // Navigate to the pillar details page with the pillar ID
    navigate(`/pillars/${pillar.id}`);
  };
  return (
    <section id="section-pillars" className="pt-0 pb-24 px-6 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="px-6 py-2 bg-gradient-to-r from-ysrcp-blue to-ysrcp-green text-black rounded-full text-sm font-black uppercase tracking-widest mb-4 inline-block">Vision & Strategy</span>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-tight">The Pillars of Progress</h2>
          <div className="w-24 h-2 bg-ysrcp-green mx-auto rounded-full"></div>
        </div>

        {/* Mobile horizontal carousel (snap-x) - fully visible cards on small screens */}
        <div className="sm:hidden">
          <div className="relative">
            <div ref={containerRef} className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-4 px-4 py-4">
              {PILLARS.map((pillar, idx) => (
                <div key={pillar.id} ref={el => (cardRefs.current[idx] = el)} className="snap-start min-w-[80vw] h-[320px] rounded-2xl overflow-hidden relative">
                  <img src={pillar.image} alt={pillar.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  <div className="relative z-10 p-4 text-white flex flex-col justify-end h-full">
                    <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-3 rounded-lg shadow-sm">
                      {pillar.icon}
                    </div>
                    <div className="pt-10">
                      <h3 className="text-xl font-black uppercase">{pillar.title}</h3>
                      <p className="mt-2 text-sm text-white/90 line-clamp-3">{pillar.info}</p>
                      <div className="mt-4">
                        <button onClick={() => handlePillarClick(pillar)} className="bg-ysrcp-green text-white px-4 py-2 rounded-full font-bold">View Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel controls */}
            <button
              onClick={() => { if (containerRef.current) containerRef.current.scrollBy({ left: -Math.round(window.innerWidth * 0.8), behavior: 'smooth' }); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-40 bg-black/40 text-white p-2 rounded-full shadow-md"
              aria-label="Previous"
            >
              ‹
            </button>

            <button
              onClick={() => { if (containerRef.current) containerRef.current.scrollBy({ left: Math.round(window.innerWidth * 0.8), behavior: 'smooth' }); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-40 bg-black/40 text-white p-2 rounded-full shadow-md"
              aria-label="Next"
            >
              ›
            </button>

            {/* Dots */}
            <div className="flex items-center gap-2 justify-center mt-4">
              {PILLARS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { if (cardRefs.current[i] && containerRef.current) { containerRef.current.scrollTo({ left: (cardRefs.current[i] as HTMLElement).offsetLeft, behavior: 'smooth' }); } }}
                  className={`w-2 h-2 rounded-full transition ${i === currentIdx ? 'bg-ysrcp-green' : 'bg-white/40'}`}
                  aria-label={`Go to pillar ${i+1}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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