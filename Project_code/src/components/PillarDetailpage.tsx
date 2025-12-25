import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, CheckCircle, Anchor, Users, ShieldCheck, TrendingUp, Heart, Leaf, Zap, 
  Coins, GraduationCap, Award, Landmark, Factory, Scale, Map, Globe, Ship, 
  BarChart3, Target, Check, Info, Activity, Briefcase 
} from 'lucide-react';
import Footer from './Footer';

interface Pillar {
  id: number;
  title: string;
  info: string;
  image: string;
}

interface PillarTab {
  id: string;
  title: string;
  icon: React.ReactNode;
  image: string;
  points: string[];
  visionStatement?: string;
  detailStatement?: string;
  metrics?: { label: string; value: string; }[];
}

interface PillarSection {
  title: string;
  icon: React.ReactNode;
  image: string;
  points: string[];
}

interface PillarDetailContent {
  fullTitle: string;
  subTitle?: string;
  vision: string;
  tabs?: PillarTab[];
  sections?: PillarSection[];
  impactPoints?: string[];
  themeColor: string;
  accentColor: string;
  accentHex: string;
}

const UNIVERSAL_PILLAR_DETAILS: Record<number, PillarDetailContent> = {
  1: {
    fullTitle: "Blue Economy Transformation",
    subTitle: "Welfare-Led Coastal Development",
    vision: "Transforming Andhra Pradesh’s long coastline into a source of dignity, income security, and global opportunity.",
    themeColor: "from-[#003366] to-ysrcp-blue",
    accentColor: "ysrcp-blue",
    accentHex: "#0055a5",
    sections: [
      { title: "Marine Vision", icon: <Ship size={18} />, image: "/blueeconomy.png", points: ["Focus on welfare of coastal families", "Sustainable coastal development", "Marine livelihood protection"] },
      { title: "Port Network", icon: <Anchor size={18} />, image: "/machilipatnam.png", points: ["Ramayapatnam Port construction", "Machilipatnam Port progress", "Bhavanapadu Port development"] },
      { title: "Modern Fisheries", icon: <Target size={18} />, image: "/fish.png", points: ["₹10,000 cash support", "10 modern fishing harbours", "Subsidized diesel/power"] },
      { title: "Economic Growth", icon: <TrendingUp size={18} />, image: "/fisheconomy.png", points: ["Skill development centers", "Marine processing MSMEs", "Global trade gateway"] }
    ]
  },
  2: {
    fullTitle: "Agriculture & Livestock Reforms",
    subTitle: "Farmer-Centric Growth & Income Security",
    vision: "Placing farmers at the center of governance through input security, risk protection, and local support systems.",
    themeColor: "from-green-800 to-ysrcp-green",
    accentColor: "ysrcp-green",
    accentHex: "#28a745",
    impactPoints: ["Zero Distress", "Stable Incomes", "Direct Support", "Local Access", "Crop Insurance", "Women SHG Dairy", "MSP Security", "Modern Tech"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Leaf size={18} />, image: "/livestock.png", visionStatement: "Farmer dignity is the state's prosperity.", points: ["Agriculture as top priority", "₹1.5 lakh crore spending", "Middlemen-free delivery"] },
      { id: 'Support', title: 'Rythu Bharosa', icon: <Coins size={18} />, image: "/agricultue.png", detailStatement: "Direct income for 52 lakh farmers.", metrics: [{label: "Annual Aid", value: "₹13,500"}, {label: "Total DBT", value: "₹34K Cr"}], points: ["Annual financial support", "Free 9-hour power supply", "Zero interest crop loans"] },
      { id: 'RBKs', title: 'RBK Network', icon: <ShieldCheck size={18} />, image: "/agricultue.png", detailStatement: "Bringing government to fields.", metrics: [{label: "RBKs", value: "10,700+"}, {label: "MSP Crops", value: "24 Items"}], points: ["Village level support hubs", "Free crop insurance premium", "Price stabilization fund"] },
      { id: 'Amila', title: 'Amila / Dairy', icon: <Users size={18} />, image: "/agricultue.png", detailStatement: "Economic power to rural women.", metrics: [{label: "Dairy Units", value: "4.6 Lakh"}, {label: "Women SHGs", value: "9.0 Lakh"}], points: ["Free cows and buffaloes", "Paala Velluva collection", "Veterinary services at doorstep"] }
    ]
  },
  3: {
    fullTitle: "Global Education Revolution",
    subTitle: "Empowering Future Generations",
    vision: "YS Jagan Mohan Reddy believed education is the key to social equality. Bridging the gap through quality English medium education and modern infrastructure.",
    themeColor: "from-indigo-800 to-indigo-600",
    accentColor: "indigo-600",
    accentHex: "#4f46e5",
    impactPoints: ["Zero Dropouts", "Global Confidence", "Modern Schools", "Digital Learning", "Higher Enrolment", "Fee Security", "Women Education", "Skill Readiness"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <GraduationCap size={18} />, image: "/education.png", visionStatement: "Quality education is the key to social equality.", points: ["English medium transformation", "Nadu-Nedu school revamp", "Digital boards in villages"] },
      { id: 'Support', title: 'Direct Aid', icon: <Coins size={18} />, image: "/education.png", detailStatement: "Removing financial barriers.", metrics: [{label: "Amma Vodi", value: "₹15,000"}, {label: "Full Fee", value: "100% Reimb"}], points: ["Amma Vodi annual support", "Vidya Deevena fee reimbursement", "Vasathi Deevena lodging aid"] },
      { id: 'Kit', title: 'Vidya Kanuka', icon: <Briefcase size={18} />, image: "/education.png", detailStatement: "Basic needs for every child.", metrics: [{label: "Kits", value: "45 Lakh"}, {label: "Items", value: "7 Types"}], points: ["Bags, Shoes, Uniforms, Books", "Nutritious Mid-day meals", "Free tabs for 8th graders"] },
      { id: 'Skills', title: 'Employability', icon: <TrendingUp size={18} />, image: "/education.png", detailStatement: "Job-oriented higher education.", metrics: [{label: "New Univs", value: "2 Nodes"}, {label: "Courses", value: "Job-Ready"}], points: ["Curriculum mapping with industry", "Skill development hubs", "Microsoft certification aid"] }
    ]
    
  },
  4: {
    fullTitle: "Navaratnalu Welfare Architecture",
    subTitle: "Inclusive Development & Poverty Alleviation",
    vision: "Ensuring every eligible household receives welfare benefits transparently through DBT and doorstep delivery with dignity.",
    themeColor: "from-red-800 to-red-600",
    accentColor: "red-600",
    accentHex: "#dc2626",
    impactPoints: ["Zero Leakage", "Dignity in Life", "Direct DBT", "No Corruption", "Women Empowerment", "Housing for All", "Pension Security", "Health Safety"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Heart size={18} />, image: "/welfare.png", visionStatement: "Welfare is a right that reaches every home.", points: ["Navaratnalu core foundation", "₹2.55 lakh crore DBT", "Saturation-based delivery"] },
      { id: 'Pensions', title: 'Social Security', icon: <Users size={18} />, image: "/welfare.png", detailStatement: "Support for the vulnerable.", metrics: [{label: "Monthly Pension", value: "₹3,000"}, {label: "Beneficiaries", value: "66 Lakh"}], points: ["Old age and widow support", "Disabled pension increase", "Doorstep pension on day one"] },
      { id: 'Housing', title: 'Mega Housing', icon: <Landmark size={18} />, image: "/welfare.png", detailStatement: "Dignity through ownership.", metrics: [{label: "House Sites", value: "31 Lakh"}, {label: "Townships", value: "17,000"}], points: ["Free house sites for poor", "Basic infra in new layouts", "Registry in name of women"] },
      { id: 'Finance', title: 'Livelihoods', icon: <Coins size={18} />, image: "/welfare.png", detailStatement: "Empowering specific sectors.", metrics: [{label: "Cheyutha", value: "₹75,000"}, {label: "Asara", value: "Loan Waiver"}], points: ["YSR Cheyutha for women", "YSR Asara for SHG groups", "Nethanna Nestham for weavers"] }
    ]
  },
  5: {
    fullTitle: "Governance Reforms",
    subTitle: "Doorstep Governance & Transparent Admin",
    vision: "Inspired by Gandhiji’s vision of Gram Swarajya, bringing power back to the common man through local secretariats.",
    themeColor: "from-blue-800 to-ysrcp-blue",
    accentColor: "ysrcp-blue",
    accentHex: "#0055a5",
    impactPoints: ["Zero Corruption", "24hr Response", "Citizen Power", "Village Growth", "Verified Trust", "Digital Access", "Volunteer Care", "Fast Justice"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Landmark size={18} />, image: "\governance.png", visionStatement: "Governance that respects every citizen's voice.", points: ["Village Secretariat system", "Recruitment of 1.35 lakh youth", "Decentralised administration"] },
      { id: 'Secretariat', title: 'GSWS System', icon: <Activity size={18} />, image: "\governance.png", detailStatement: "Service at the doorstep.", metrics: [{label: "Services", value: "540+"}, {label: "Units", value: "15,000"}], points: ["No more traveling to district HQ", "Transparent service tracking", "Saturation of benefits"] },
      { id: 'Volunteers', title: 'Volunteer Force', icon: <Users size={18} />, image: "\governance.png", detailStatement: "One person for 50 homes.", metrics: [{label: "Volunteers", value: "2.6 Lakh"}, {label: "Coverage", value: "100% Homes"}], points: ["Doorstep delivery of pensions", "Pandemic crisis management", "Resolving local grievances"] },
      { id: 'Safety', title: 'Disha / Safety', icon: <ShieldCheck size={18} />, image: "\governance.png", detailStatement: "Justice for every woman.", metrics: [{label: "Disha Apps", value: "1 Cr+"}, {label: "Stations", value: "18 Nodes"}], points: ["Disha Act for rapid justice", "Fast-track legal support", "Free sand for housing"] }
    ]
  },
  6: {
    fullTitle: "Infrastructure Development",
    subTitle: "People-Centric & Region-Balanced Growth",
    vision: "Developing infrastructure that directly impacts livelihoods, connected to jobs, housing, and rural markets.",
    themeColor: "from-amber-800 to-amber-600",
    accentColor: "amber-600",
    accentHex: "#d97706",
    impactPoints: ["Regional Balance", "Air Connectivity", "Road Safety", "Water Security", "New Townships", "Local Jobs", "MSME Support", "Village Infra"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Landmark size={18} />, image: "/infrastructure.png", visionStatement: "Building assets that empower common citizens.", points: ["Balanced regional development", "Infrastructure linked to jobs", "Irrigation for every acre"] },
      { id: 'Connectivity', title: 'Roads & Air', icon: <TrendingUp size={18} />, image: "/infrastructure.png", detailStatement: "Gatey to the world.", metrics: [{label: "Airports", value: "Bhogapuram"}, {label: "Highways", value: "8,000 KM"}], points: ["International air terminal", "National Highway corridors", "Inter-district bypass roads"] },
      { id: 'Water', title: 'Water Security', icon: <Leaf size={18} />, image: "/infrastructure.png", detailStatement: "Irrigating the future.", metrics: [{label: "Polavaram", value: "Priority"}, {label: "Lift Irrigation", value: "12 Nodes"}], points: ["Accelerated project works", "Rehabilitation of families", "Drinking water in every tap"] },
      { id: 'Housing', title: 'Infrastructure', icon: <Landmark size={18} />, image: "/infrastructure.png", detailStatement: "Building 17,000 Townships.", metrics: [{label: "Units", value: "31 Lakh"}, {label: "Amenities", value: "Full Scale"}], points: ["Underground power & drain", "Schools in every layout", "Community health centers"] }
    ]
  },
  7: {
    fullTitle: "Industrial & Employment Growth",
    subTitle: "Jobs, Local Industry & Youth Empowerment",
    vision: "Focusing on creating jobs for local youth, ensuring industries benefit nearby villages and towns with a balanced regional growth approach.",
    themeColor: "from-slate-800 to-slate-600",
    accentColor: "slate-600",
    accentHex: "#475569",
    impactPoints: ["Youth Jobs", "Local Economy", "Zero Migration", "MSME Growth", "State Revenue", "Clean Energy", "Transparent Policy", "Skill Mapping"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Users size={18} />, image: "/growth.png", visionStatement: "Industrialisation must serve the local community.", points: ["Focus on job creation", "Sustainable industrial nodes", "Transparency in approvals"] },
      { id: 'Policy', title: 'Support Policy', icon: <Factory size={18} />, image: "/growth.png", detailStatement: "Ease of doing business.", metrics: [{label: "Single Window", value: "Fast Track"}, {label: "Incentives", value: "Clear Dues"}], points: ["Timely release of incentives", "MSME protection scheme", "Support for local entrepreneurs"] },
      { id: 'Energy', title: 'Green Jobs', icon: <Zap size={18} />, image: "/growth.png", detailStatement: "Powering the next decade.", metrics: [{label: "Green Storage", value: "World Class"}, {label: "Capacity", value: "10 GW"}], points: ["Greenko storage project", "Renewable energy corridor", "Low carbon footprint units"] },
      { id: 'Skills', title: 'Employment', icon: <TrendingUp size={18} />, image: "/growth.png", detailStatement: "Direct Jobs for Youth.", metrics: [{label: "New Jobs", value: "2.0 Lakh"}, {label: "Placements", value: "Skill Based"}], points: ["Local hiring mandates", "Corporate skill partnerships", "Job fairs in every district"] }
    ]
  },
  8: {
    fullTitle: "Women Empowerment",
    subTitle: "Financial Security, Dignity & Safety",
    vision: "Placing women at the center of development, believing that their empowerment strengthens the entire family and state.",
    themeColor: "from-pink-800 to-pink-600",
    accentColor: "pink-600",
    accentHex: "#db2777",
    impactPoints: ["Financial Power", "Social Dignity", "Safety Security", "Decision Making", "Health Access", "Girl Education", "SHG Strength", "Legal Justice"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Users size={18} />, image: "/women.png", visionStatement: "Empowered women build empowered nations.", points: ["Household dignity focus", "Safety as top priority", "Economic independence drive"] },
      { id: 'Economics', title: 'Financial Aid', icon: <Coins size={18} />, image: "/women.png", detailStatement: "YSR Asara & Cheyutha.", metrics: [{label: "Cheyutha", value: "₹75,000"}, {label: "Asara", value: "Zero Debt"}], points: ["SHG loan burdens cleared", "Support for women 45-60", "Direct bank transfers"] },
      { id: 'Livelihoods', title: 'New Income', icon: <Briefcase size={18} />, image: "/women.png", detailStatement: "Dairy & Livestock units.", metrics: [{label: "Dairy Units", value: "4.6 Lakh"}, {label: "Paala Velluva", value: "Active"}], points: ["Free cows and buffaloes", "Sheep and goat distribution", "Collection centers for milk"] },
      { id: 'Safety', title: 'Disha Safety', icon: <ShieldCheck size={18} />, image: "/women.png", detailStatement: "Response in 10 minutes.", metrics: [{label: "Disha Apps", value: "1.1 Cr"}, {label: "Stations", value: "Dedicated"}], points: ["Zero tolerance for crimes", "Disha police stations", "Special courts for fast trials"] }
    ]
  },
  9: {
    fullTitle: "Social Justice Reforms",
    subTitle: "Equality, Inclusion & Dignity for All",
    vision: "Ensuring that welfare and opportunities reach SC, ST, BC, and Minority communities without any discrimination or bias.",
    themeColor: "from-purple-800 to-purple-600",
    accentColor: "purple-600",
    accentHex: "#9333ea",
    impactPoints: ["Zero Inequality", "Total Inclusion", "Dignity for All", "DBT Accuracy", "Equal Opportunity", "Housing Rights", "Social Security", "Admin Justice"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Scale size={18} />, image: "/justice.png", visionStatement: "Uplifting the weakest links of society.", points: ["Discrimination-free delivery", "Constitutional rights focus", "Equitable resource split"] },
      { id: 'Education', title: 'Future Access', icon: <GraduationCap size={18} />, image: "/justice.png", detailStatement: "Global Ed for everyone.", metrics: [{label: "Fee Reimb", value: "100%"}, {label: "Scholarships", value: "Direct"}], points: ["Vidya Deevena for SC/ST", "English medium Govt schools", "Removal of poverty barrier"] },
      { id: 'Empowerment', title: 'Economics', icon: <TrendingUp size={18} />, image: "/justice.png", detailStatement: "Targeted Livelihood Aid.", metrics: [{label: "Nethanna", value: "₹24,000"}, {label: "Chedodu", value: "Artisans"}], points: ["Aid for weavers & tailors", "Support for washermen", "Street vendor interest-free loans"] },
      { id: 'Representation', title: 'Admin Power', icon: <Landmark size={18} />, image: "/justice.png", detailStatement: "Voice in Governance.", metrics: [{label: "Nominated", value: "50% SC/ST"}, {label: "Secretariats", value: "All Castes"}], points: ["Local youth recruitment", "BC/SC corporation revamp", "Equal share in power"] }
    ]
  },
  10: {
    fullTitle: "Decentralised Development",
    subTitle: "Balanced Growth & Power to the People",
    vision: "Rejecting over-dependence on a single city, ensuring development and jobs reach every corner of Andhra Pradesh.",
    themeColor: "from-emerald-800 to-emerald-600",
    accentColor: "emerald-600",
    accentHex: "#059669",
    impactPoints: ["Balanced Growth", "Local Admin", "Quick Services", "No Migration", "3 Capital Power", "Dist Empowerment", "Village Focus", "Jobs for All"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Landmark size={18} />, image: "/centra.png", visionStatement: "Development must reach every region.", points: ["Reduction in imbalances", "Government close to people", "Region-specific strategy"] },
      { id: 'Capitals', title: 'Three Capitals', icon: <Map size={18} />, image: "/centra.png", detailStatement: "Inclusive growth hubs.", metrics: [{label: "Vizag", value: "Executive"}, {label: "Kurnool", value: "Judicial"}], points: ["Visakhapatnam as IT Hub", "Amaravati as Legislative", "Kurnool for legal infra"] },
      { id: 'Districts', title: 'New Districts', icon: <ShieldCheck size={18} />, image: "/centra.png", detailStatement: "Administration at Door.", metrics: [{label: "Districts", value: "26 Nodes"}, {label: "Monitoring", value: "Local"}], points: ["Increased from 13 to 26", "One district per MP seat", "Reduced citizens' travel time"] },
      { id: 'Grassroots', title: 'Village Power', icon: <Users size={18} />, image: "/centra.png", detailStatement: "Decentralised Welfare.", metrics: [{label: "Secretariats", value: "15,000"}, {label: "Clinics", value: "Village"}], points: ["RBKs for village farmers", "Family Doctor system", "Preventive local care"] }
    ]
  },
  11: {
    fullTitle: "COVID Crisis Response",
    subTitle: "Saving Lives, Protecting Families",
    vision: "Treating the pandemic as a humanitarian crisis, ensuring healthcare and welfare reached every family without interruption.",
    themeColor: "from-red-900 to-red-700",
    accentColor: "red-700",
    accentHex: "#b91c1c",
    impactPoints: ["Low Mortality", "Free Testing", "Oxygen Supply", "DBT Continuation", "Vaccine Reach", "Village Tracking", "MSME Relief", "Zero Hunger"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Heart size={18} />, image: "/covid.png", visionStatement: "Saving lives is our ultimate priority.", points: ["Humanitarian governance", "Profit-free healthcare", "Comprehensive protection"] },
      { id: 'Testing', title: 'Free Support', icon: <ShieldCheck size={18} />, image: "/covid.png", detailStatement: "Early detection model.", metrics: [{label: "Tests", value: "60K / Day"}, {label: "Cost Cap", value: "Affordable"}], points: ["Free RT-PCR tests", "Oxygen plants installed", "Black fungus treatment free"] },
      { id: 'Village', title: 'Local Response', icon: <Activity size={18} />, image: "/covid.png", detailStatement: "Tracking every home.", metrics: [{label: "Volunteers", value: "Doorstep"}, {label: "Tracking", value: "Family Dr"}], points: ["Fever surveys by volunteers", "Medicine kits at home", "Bike ambulances for tribals"] },
      { id: 'Welfare', title: 'Unbroken Aid', icon: <Coins size={18} />, image: "/covid.png", detailStatement: "Welfare despite Lockdowns.", metrics: [{label: "Pensions", value: "Contd"}, {label: "MSME Relief", value: "Special"}], points: ["Pensions reached day one", "Amma Vodi paid on time", "Support for small industries"] }
    ]
  },
  12: {
    fullTitle: "Healthcare Reforms",
    subTitle: "Free Treatment & Preventive Public Health",
    vision: "Transforming healthcare into a basic right through free advanced treatment and village-level diagnostic support.",
    themeColor: "from-rose-800 to-rose-600",
    accentColor: "rose-600",
    accentHex: "#e11d48",
    impactPoints: ["Zero Med-Debt", "New Med Colleges", "Family Doctor", "Free Eye Care", "Modern Hospitals", "Emergency 108", "Doorstep Tests", "Chronic Support"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <Heart size={18} />, image: "/health.png", visionStatement: "Health is the foundation of happiness.", points: ["Free treatment for poor", "Modernizing Govt hospitals", "Emphasis on prevention"] },
      { id: 'Arogyasri', title: 'YSR Arogyasri', icon: <ShieldCheck size={18} />, image: "/health.png", detailStatement: "Free till ₹25 Lakh.", metrics: [{label: "Diseases", value: "3,000+"}, {label: "Coverage", value: "90% Pop"}], points: ["Free care in Pvt hospitals", "Cancer & Heart surgeries", "Includes COVID & Black Fungus"] },
      { id: 'Clinics', title: 'Village Clinics', icon: <Activity size={18} />, image: "/health.png", detailStatement: "The Family Doctor.", metrics: [{label: "Clinics", value: "10,000+"}, {label: "Tests", value: "Free Local"}], points: ["Family Dr village visits", "NCD tracking (BP, Sugar)", "Free essential medicines"] },
      { id: 'Medical', title: 'Med Education', icon: <GraduationCap size={18} />, image: "/health.png", detailStatement: "Colleges for All.", metrics: [{label: "New Colleges", value: "17 Nodes"}, {label: "Seats", value: "Double"}], points: ["One college per MP seat", "Infrastructure under Nadu-Nedu", "MBBS for rural students"] }
    ]
  },
  13: {
    fullTitle: "Economic Growth",
    subTitle: "Welfare-Led Economy & Strong State Growth",
    vision: "Putting money in people's hands to drive domestic demand and strengthening local rural-urban markets.",
    themeColor: "from-sky-800 to-sky-600",
    accentColor: "sky-600",
    accentHex: "#0284c7",
    impactPoints: ["Strong Markets", "Stable Incomes", "MSME Security", "Investor Trust", "Port Revenue", "Skill Ready", "Crisis Resilience", "State GDP+"],
    tabs: [
      { id: 'Vision', title: 'Vision', icon: <TrendingUp size={18} />, image: "/economy.png", visionStatement: "Prosperity through people's empowerment.", points: ["Welfare as economic fuel", "Balanced region growth", "Long-term revenue assets"] },
      { id: 'Markets', title: 'DBT Drive', icon: <Coins size={18} />, image: "/economy.png", detailStatement: "Fueling local consumption.", metrics: [{label: "DBT Infusion", value: "₹2.5L Cr"}, {label: "Market Vel", value: "High"}], points: ["Boost to village shops", "Increased spending power", "Protection from recession"] },
      { id: 'Industry', title: 'Ports & MSME', icon: <Factory size={18} />, image: "/economy.png", detailStatement: "Sustainable production.", metrics: [{label: "Ports", value: "4 Nodes"}, {label: "GIS Summit", value: "Huge Inv"}], points: ["Clearing long pending dues", "Organising global summits", "Support during COVID period"] },
      { id: 'Confidence', title: 'Investor Trust', icon: <Globe size={18} />, image: "/economy.png", detailStatement: "Transparent Governance.", metrics: [{label: "EoDB", value: "#1 Rank"}, {label: "Growth", value: "Double Digit"}], points: ["Online approval systems", "Zero corruption mandate", "Stable policy environment"] }
    ]
  }
};

interface PillarDetailPageProps {
  pillar: Pillar;
  onBack: () => void;
}

const PillarDetailPage: React.FC<PillarDetailPageProps> = ({ pillar, onBack }) => {
  // Use a generic state for the current active item (Tab or Section)
  const [activeItemId, setActiveItemId] = useState<string>('');

  const details = useMemo(() => UNIVERSAL_PILLAR_DETAILS[pillar.id] || UNIVERSAL_PILLAR_DETAILS[1], [pillar.id]);

  // Scroll to top when pillar detail page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pillar.id]);
  // Initialize active item when details change (useEffect for side-effects)
  useEffect(() => {
    if (details.sections && details.sections.length > 0) {
      setActiveItemId(details.sections[0].title);
    } else if (details.tabs && details.tabs.length > 0) {
      setActiveItemId(details.tabs[0].id);
    } else {
      setActiveItemId('');
    }
  }, [details]);

  const currentItem = useMemo(() => {
    if (details.sections) {
      return details.sections.find(s => s.title === activeItemId) || details.sections[0];
    }
    if (details.tabs) {
      return details.tabs.find(t => t.id === activeItemId) || details.tabs[0];
    }
    return null;
  }, [details, activeItemId]);

  return (
    <div className="min-h-screen bg-white animate-fade-in pb-0 font-sans w-full overflow-x-hidden">
      
      {/* 1. Hero Section */}
      <div className="relative h-[48vh] w-full overflow-hidden">
        <div className={`w-full h-full bg-gradient-to-br ${details.themeColor}`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        <div className="absolute inset-0 flex flex-col justify-end px-4 md:px-12 pb-10">
           <div className="w-full">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-white/90 hover:text-white font-black mb-6 transition-all uppercase text-[10px] tracking-widest bg-white/10 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-white/20"
              >
                <ArrowLeft size={14} /> Back to Pillars
              </button>
              
              <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] font-black text-white uppercase tracking-tighter leading-[0.9] mb-2 drop-shadow-2xl">
                {details.fullTitle}
              </h1>
              {details.subTitle && (
                <p className="text-ysrcp-yellow font-black uppercase tracking-[0.2em] text-xs mb-4 drop-shadow-lg">
                  {details.subTitle}
                </p>
              )}
              
              <div className="max-w-3xl border-l-4 border-ysrcp-yellow pl-4 py-1 bg-black/5">
                 <p className="text-base md:text-lg text-white font-bold leading-tight drop-shadow-md italic">
                   {details.vision}
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* 2. Content Section */}
      <section className="w-full py-10 bg-white">
         <div className="px-4 md:px-12">
            <div className="space-y-6">
                
                {/* Section 1: The 3-Part Layout */}
                <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-gray-100 min-h-[600px]">
                  
                  {/* Part A: Navigation Panel (18% width) */}
                  <div className="w-full lg:w-[18%] bg-gray-50/50 p-8 border-r border-gray-100 flex flex-col gap-2 shrink-0 z-20 relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-ysrcp-blue/5"></div>
                      <div className="mb-10 px-2">
                          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-2">Navigation</h3>
                          <p className="text-xs font-bold text-gray-800">Operational Focus</p>
                      </div>
                      <div className="space-y-4">
                        {(details.sections || details.tabs || []).map((item) => {
                          const itemId = (item as PillarTab).id || (item as PillarSection).title;
                          const itemTitle = (item as PillarTab).title || (item as PillarSection).title;
                          return (
                            <button
                                key={itemId}
                                onClick={() => setActiveItemId(itemId)}
                                className={`
                                    w-full flex items-center gap-4 px-4 py-5 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all duration-300 text-left relative group
                                    ${activeItemId === itemId 
                                        ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] translate-x-2' 
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}
                                `}
                                style={{ color: activeItemId === itemId ? details.accentHex : undefined }}
                            >
                                {activeItemId === itemId && (
                                    <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-full" style={{ backgroundColor: details.accentHex }}></span>
                                )}
                                <span className={`
                                    ${activeItemId === itemId ? 'scale-110' : 'text-gray-300'} 
                                    group-hover:scale-110 transition-all duration-300
                                `}>
                                    {item.icon}
                                </span>
                                {itemTitle}
                            </button>
                          );
                        })}
                      </div>
                  </div>

                  {/* Part B: Content Area (57% width) */}
                  <div className="w-full lg:w-[82%] flex flex-col md:flex-row animate-fade-in relative z-10 overflow-hidden">
                      {currentItem && (
                        <div className="w-full lg:w-[57%] p-10 lg:p-12 flex flex-col items-start bg-white border-r border-gray-100 relative overflow-hidden">
                          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-ysrcp-blue/5 rounded-full blur-3xl pointer-events-none"></div>

                          <div className="relative z-10 w-full flex flex-col items-start h-full">
                            <div className="flex items-center gap-5 mb-8">
                                <div className="w-14 h-14 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-200" style={{ backgroundColor: details.accentHex }}>
                                    {currentItem.icon}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">
                                      {(currentItem as PillarTab).title || (currentItem as PillarSection).title}
                                    </h2>
                                    <div className="h-1 w-10 bg-ysrcp-green rounded-full"></div>
                                </div>
                            </div>

                            {/* Conditional Statements (Only for non-Blue Economy pillars using Tabs) */}
                            {details.tabs && (
                              activeItemId === 'Vision' ? (
                                <div className={`mb-10 p-7 bg-gradient-to-br ${details.themeColor} rounded-[1.5rem] shadow-xl shadow-blue-100 relative overflow-hidden group w-full`}>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                    <p className="text-white font-bold italic text-base lg:text-lg leading-relaxed relative z-10">
                                      "{(currentItem as PillarTab).visionStatement}"
                                    </p>
                                </div>
                              ) : (currentItem as PillarTab).detailStatement && (
                                <div className="mb-8 p-6 bg-ysrcp-green/5 rounded-[1.25rem] border-l-8 border-ysrcp-green shadow-sm w-full">
                                    <p className="text-gray-800 font-bold italic text-sm lg:text-base leading-relaxed">
                                      "{(currentItem as PillarTab).detailStatement}"
                                    </p>
                                </div>
                              )
                            )}

                            <div className="flex items-center gap-3 mb-6 w-full">
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-ysrcp-green">Key Initiatives</span>
                                <div className="flex-1 h-px bg-gray-100"></div>
                            </div>

                            <ul className="space-y-6 mb-10 w-full">
                                {(currentItem?.points || []).map((point, idx) => (
                                    <li key={idx} className="flex items-start gap-4 text-gray-700 text-base font-bold leading-snug group/item text-left">
                                        <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center shrink-0 mt-0.5 border border-green-100 group-hover/item:bg-ysrcp-green group-hover/item:text-white transition-all duration-300">
                                            <Check size={12} />
                                        </div>
                                        <span className="group-hover/item:text-gray-900 transition-colors">{point}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Metrics Area (Specific to standard pillars using Tabs) */}
                            {details.tabs && (currentItem as PillarTab).metrics && (
                              <div className="grid grid-cols-2 gap-4 mt-auto bg-gray-50/50 p-5 rounded-[1.5rem] border border-gray-100 shadow-inner w-full">
                                {((currentItem as PillarTab).metrics || []).map((metric, mIdx) => (
                                  <div key={mIdx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-1 group/metric hover:shadow-md transition-all">
                                      <div className="flex items-center justify-between">
                                        <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center group-hover/metric:bg-ysrcp-blue group-hover/metric:text-white transition-colors" style={{ color: details.accentHex }}>
                                          {mIdx === 0 ? <BarChart3 size={14} /> : <Target size={14} />}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-0.5">{metric.label}</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tighter">{metric.value}</p>
                                      </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Part C: Image Panel (43% width) */}
                      {currentItem && (
                        <div className="w-full lg:w-[36%] relative h-[200px] md:h-auto overflow-hidden bg-gray-900">
                            <img 
                              key={activeItemId}
                              src={currentItem.image} 
                              alt={(currentItem as PillarTab).title || (currentItem as PillarSection).title} 
                              className="absolute inset-0 w-full h-full object-cover transition-all duration-700 animate-fade-in"
                            />
                            <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                            <div className="absolute bottom-6 right-6 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl">
                              <p className="text-white text-[9px] font-black uppercase tracking-widest">Progress Visualized</p>
                            </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* BLUE ECONOMY STATIC IMPACT SECTIONS */}
                {pillar.id === 1 && (
                  <>
                    {/* 1. Static Impact Analysis Strip */}
                    <div id="BlueImpactStrip" className="max-w-7xl mx-auto w-full px-4 py-0 mb-4">
                      <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-5 shadow-sm border-l-4 border-ysrcp-blue">
                          <div className="flex flex-col lg:flex-row items-center gap-6">
                            <div className="shrink-0 flex items-center gap-3 lg:border-r lg:border-gray-200 lg:pr-6">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shadow-inner text-ysrcp-blue">
                                    <Info size={18} />
                                </div>
                                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] leading-none whitespace-nowrap">Impact Analysis</h3>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-x-8 gap-y-2.5 w-full">
                                {["Income Security", "Modern Ports", "No Migration", "Marine Exports", "Local Jobs", "Community Dignity", "Coastal Safety", "Market Stability"].map((point, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-[11px] font-bold text-gray-600 leading-none group transition-all hover:text-ysrcp-blue">
                                        <div className="w-1.5 h-1.5 bg-ysrcp-green rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-sm"></div>
                                        <span className="truncate">{point}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                      </div>
                    </div>
                  </>
                )}

                {/* OTHER PILLARS IMPACT SECTIONS (Dynamic) */}
                {pillar.id !== 1 && details.impactPoints && (
                  <>
                    <div id="PillarImpactStrip" className="max-w-7xl mx-auto w-full px-4 py-0 mb-4">
                      <div className="bg-gray-50/80 border border-gray-100 rounded-3xl p-5 shadow-sm border-l-4" style={{ borderLeftColor: details.accentHex }}>
                          <div className="flex flex-col lg:flex-row items-center gap-6">
                            <div className="shrink-0 flex items-center gap-3 lg:border-r lg:border-gray-200 lg:pr-6">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shadow-inner" style={{ color: details.accentHex }}>
                                    <Info size={18} />
                                </div>
                                <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-[0.25em] leading-none whitespace-nowrap">Impact Analysis</h3>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-x-8 gap-y-2.5 w-full">
                                {details.impactPoints.slice(0, 8).map((point, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-[11px] font-bold text-gray-600 leading-none group transition-all hover:text-ysrcp-blue">
                                        <div className="w-1.5 h-1.5 bg-ysrcp-green rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-sm"></div>
                                        <span className="truncate">{point}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Exclude Lasting Impact colorful grid for Agriculture (ID 2) as requested */}
                    {pillar.id !== 2 && (
                      <div className="max-w-7xl mx-auto w-full px-4">
                        <div className={`relative pt-12 pb-14 rounded-[3.5rem] overflow-hidden bg-gradient-to-br ${details.themeColor} px-6 md:px-10 shadow-2xl`}>
                            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            <div className="relative z-10">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                  {details.impactPoints.slice(0, 6).map((point, idx) => {
                                      const colors = [
                                          'bg-white/10 border-blue-400/30', 'bg-white/10 border-emerald-400/30', 'bg-white/10 border-amber-400/30',
                                          'bg-white/10 border-purple-400/30', 'bg-white/10 border-rose-400/30', 'bg-white/10 border-sky-400/30'
                                      ];
                                      return (
                                          <div key={idx} className={`p-6 rounded-[2rem] border backdrop-blur-sm shadow-xl flex flex-col gap-4 transition-all hover:shadow-black/20 hover:-translate-y-1 group ${colors[idx % colors.length]}`}>
                                              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner">
                                                  <CheckCircle size={20} className="text-white" />
                                              </div>
                                              <span className="font-black text-sm lg:text-base leading-tight uppercase tracking-tight text-white">{point}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                            </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                
              </div>
         </div>
      </section>

      <Footer />
      <div className="w-full h-2 bg-gradient-to-r from-ysrcp-blue via-ysrcp-green to-ysrcp-yellow"></div>
    </div>
  );
};

export default PillarDetailPage;