import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  { id: 6, title: "Infrastructure Development", info: "Roads, housing, water supply, sanitation and public infrastructure.", image: "/pillar-images/128702759_3643024099051364_7728079183867142972_n.jpg" },
  { id: 7, title: "Industrial & Employment Growth", info: "Industrial parks, MSMEs, manufacturing, investment facilitation and job creation.", image: "/pillar-images/129776776_3661070970580010_1067747446361922249_n.jpg" },
  { id: 8, title: "Women Empowerment", info: "SHGs, credit linkage, entrepreneurship and financial inclusion.", image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg" },
  { id: 9, title: "Social Justice", info: "SC, ST, BC, minority welfare, inclusive policies and equal opportunity.", image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg" },
  { id: 10, title: "Decentralised Development", info: "Regional balance, district empowerment and grassroots leadership.", image: "/pillar-images/159622322_3921148761238895_2124063265924097094_n.jpg" },
  { id: 11, title: "COVID Crisis Response", info: "Saving lives, free treatment, oxygen infrastructure and uninterrupted welfare.", image: "/pillar-images/169429874_3979683545385416_1322175490806280655_n.jpg" },
  { id: 12, title: "Healthcare Reforms", info: "Free treatment via Arogyasri, medical colleges, and village clinics for strong public health.", image: "/pillar-images/185793409_4116145448405891_1422686474075524799_n.jpg" },
  { id: 13, title: "Economic Growth", info: "Welfare-led growth putting money in people's hands and strengthening local markets.", image: "/pillar-images/188534877_4138181079535661_95786078523168019_n.jpg" }
];

const PillarDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const pillar = useMemo(() => {
    const pillarId = parseInt(id || '1', 10);
    return PILLARS_DATA.find(p => p.id === pillarId) || PILLARS_DATA[0];
  }, [id]);

  const handleBack = () => {
    navigate('/pillars');
  };

  return <PillarDetailPage pillar={pillar} onBack={handleBack} />;
};

export default PillarDetailWrapper;
