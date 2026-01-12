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
  { id: 1, title: "Blue Economy", info: "Ports, shipping, fisheries, aquaculture, coastal trade and marine livelihoods.", image: "/blueeconomy.png" },
  { id: 2, title: "Agricultural Reforms", info: "Farmer income security, MSP support, irrigation, crop planning and agri exports.", image: "/agricultue.png" },
  { id: 3, title: "Education, Skill Development & Youth", info: "School and college reforms, skill universities, employability and youth empowerment.", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800" },
  { id: 4, title: "Welfare Architecture", info: "Direct Benefit Transfer, pensions, student welfare and social security delivery.", image: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800" },
  { id: 5, title: "Governance Reforms", info: "Village and Ward Secretariats, volunteer system, transparency and citizen-centric service delivery.", image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=800" },
  { id: 6, title: "Infrastructure Development", info: "Roads, housing, water supply, sanitation and public infrastructure.", image: "https://images.unsplash.com/photo-1541888946425-d81bb19480c5?q=80&w=800" },
  { id: 7, title: "Industrial & Employment Growth", info: "Industrial parks, MSMEs, manufacturing, investment facilitation and job creation.", image: "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?q=80&w=800" },
  { id: 8, title: "Women Empowerment", info: "SHGs, credit linkage, entrepreneurship and financial inclusion.", image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=800" },
  { id: 9, title: "Social Justice", info: "SC, ST, BC, minority welfare, inclusive policies and equal opportunity.", image: "https://images.unsplash.com/photo-1589216532372-1c2a11f90e4a?q=80&w=800" },
  { id: 10, title: "Decentralised Development", info: "Regional balance, district empowerment and grassroots leadership.", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=800" },
  { id: 11, title: "COVID Crisis Response", info: "Saving lives, free treatment, oxygen infrastructure and uninterrupted welfare.", image: "https://images.unsplash.com/photo-1584483766114-2cea6facdf57?q=80&w=800" },
  { id: 12, title: "Healthcare Reforms", info: "Free treatment via Arogyasri, medical colleges, and village clinics for strong public health.", image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800" },
  { id: 13, title: "Economic Growth", info: "Welfare-led growth putting money in people's hands and strengthening local markets.", image: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800" }
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
