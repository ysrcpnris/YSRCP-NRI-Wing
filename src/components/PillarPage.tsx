import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import PillarDetailPage from './PillarDetailpage';

interface Pillar {
  id: number;
  title: string;
  info: string;
  image: string;
}

const PILLARS_DATA: Pillar[] = [
  { id: 1, title: "Blue Economy", info: "Ports, shipping, fisheries, aquaculture, coastal trade and marine livelihoods.", image: "/pillar-images/120476277_3461056323914810_8311003136894606010_n.jpg" },
  { id: 2, title: "Agricultural Reforms", info: "Farmer income security, MSP support, irrigation, crop planning and agri exports.", image: "/pillar-images/120845568_3486235731396869_3213998884289559140_n.jpg" },
  { id: 3, title: "Education, Skill Development & Youth", info: "School and college reforms, skill universities, employability and youth empowerment.", image: "/pillar-images/121991841_3521006071253168_1513702069054059060_n.jpg" },
  { id: 4, title: "Welfare Architecture", info: "Direct Benefit Transfer, pensions, student welfare and social security delivery.", image: "/pillar-images/123612893_3558817750805333_7054388378066863652_n.jpg" },
  { id: 5, title: "Governance Reforms", info: "Village and Ward Secretariats, volunteer system, transparency and citizen-centric service delivery.", image: "/pillar-images/126074903_3603380963015678_1722865307381731174_n.jpg" },
  { id: 6, title: "Infrastructure Development", info: "Roads, housing, water supply, sanitation and public infrastructure.", image: "/pillar-images/126074903_3603380963015678_1722865307381731174_n.jpg" },
  { id: 7, title: "Industrial & Employment Growth", info: "Industrial parks, MSMEs, manufacturing, investment facilitation and job creation.", image: "/pillar-images/128702759_3643024099051364_7728079183867142972_n.jpg" },
  { id: 8, title: "Women Empowerment", info: "SHGs, credit linkage, entrepreneurship and financial inclusion.", image: "/pillar-images/129776776_3661070970580010_1067747446361922249_n.jpg" },
  { id: 9, title: "Social Justice", info: "SC, ST, BC, minority welfare, inclusive policies and equal opportunity.", image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg" },
  { id: 10, title: "Decentralised Development", info: "Regional balance, district empowerment and grassroots leadership.", image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg" },
  { id: 11, title: "Healthcare Reforms", info: "Free treatment via Arogyasri, medical colleges, and village clinics for strong public health.", image: "/pillar-images/159622322_3921148761238895_2124063265924097094_n.jpg" },
  { id: 12, title: "Economic Growth", info: "Welfare-led growth putting money in people's hands and strengthening local markets.", image: "/pillar-images/169429874_3979683545385416_1322175490806280655_n.jpg" }
];

interface PillarsPageProps {
  onBack: () => void;
  onPillarSelect?: (pillar: Pillar) => void;
}

const PillarsPage: React.FC<PillarsPageProps> = ({ onBack, onPillarSelect: onPillarSelectProp }) => {
  const navigate = useNavigate();
  const [selectedPillar, setSelectedPillar] = useState<Pillar | null>(null);

  const handlePillarSelect = (pillar: Pillar) => {
    setSelectedPillar(pillar);
    onPillarSelectProp?.(pillar);
  };

  const handleBackFromDetail = () => {
    setSelectedPillar(null);
  };

  // If a pillar is selected, show the detail page
  if (selectedPillar) {
    return <PillarDetailPage pillar={selectedPillar} onBack={handleBackFromDetail} />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 bg-gray-50 pt-10 pb-20 px-6 animate-fade-in mt-16">
        <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-ysrcp-blue font-bold mb-10 hover:gap-3 transition-all uppercase text-sm"
        >
          <ArrowLeft size={20} /> Back to Home
        </button>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-black text-ysrcp-blue uppercase tracking-tight mb-4">The Pillars of Progress</h1>
          <p className="text-gray-600 max-w-2xl mx-auto font-medium">Explore the detailed vision and strategic roadmap for the development of Andhra Pradesh across key sectors.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PILLARS_DATA.map((pillar) => (
            <div 
              key={pillar.id}
              onClick={() => handlePillarSelect(pillar)}
              className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2 border border-gray-100"
            >
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={pillar.image} 
                  alt={pillar.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                   <span className="bg-white text-ysrcp-blue px-4 py-2 rounded-full font-bold text-xs uppercase">View Details</span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-ysrcp-blue mb-3 leading-tight group-hover:text-ysrcp-green transition-colors uppercase">
                  {pillar.title}
                </h3>
                <p className="text-gray-500 text-sm line-clamp-2">{pillar.info}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default PillarsPage;