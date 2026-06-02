import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft, Anchor, Users, ShieldCheck, TrendingUp, Heart, Building2, Leaf, Zap,
  Coins, GraduationCap, Landmark, Factory, Scale, Map, Globe, Ship,
  BarChart3, Target, Info, Activity, Briefcase, Building
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
  description?: string;
  detailStatement?: string;
  metrics?: { label: string; value: string; }[];
}

interface PillarSection {
  title: string;
  icon: React.ReactNode;
  image: string;
  points: string[];
  description?: string;
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
  1:  {
    fullTitle: "Healthcare & Aarogya Andhra Pradesh",
    subTitle: "Aarogya Andhra Pradesh — Universal, Accessible Care",
    vision: "Creating an 'Aarogya Andhra Pradesh' where every citizen, especially the poor and marginalised, receives accessible, affordable and high-quality health services without financial hardship.",
    themeColor: "from-rose-800 to-rose-600",
    accentColor: "rose-600",
    accentHex: "#e11d48",
    impactPoints: ["Universal Health Coverage", "YSR Arogyasri ₹25L", "Village Clinics", "Family Doctor", "Digital Telehealth", "17 New Med Colleges", "Last-mile Services", "COVID Resilience"],
    sections: [
      {
        title: "Vision",
        icon: <Heart size={18} />,
        image: "/pillar-images/Healthcare.png",
        points: ["Aarogya Andhra Pradesh", "Health as a right, not charity"],
        description: `The health care vision under the JaganAnna Government (2019–2024) centered on creating an "Aarogya Andhra Pradesh" — a state where every citizen, especially the poor and marginalized, receives accessible, affordable, and high-quality health services without financial hardship. Drawing from Dr. YS Rajasekhara Reddy's legacy, it emphasized preventive, curative, and rehabilitative care with saturation coverage, zero out-of-pocket expenses for serious illnesses, and seamless integration of primary, secondary, and tertiary levels. Core principles included universal health coverage, social justice, women-centric delivery, and rural empowerment. Flagship initiatives included expanding YSR Arogyasri to ₹25 lakh cashless coverage, launching YSR Village Clinics, the Family Doctor system, YSR Kanti Velugu, and Jagananna Arogya Suraksha camps. The model treated health as a right, seeking to reduce infant/maternal mortality, control NCDs, and set a national benchmark for inclusive healthcare.`
      },
      {
        title: "Arogyasri",
        icon: <ShieldCheck size={18} />,
        image: "/pillar-images/Healthcare.png",
        points: ["₹25 Lakh cashless cover", "2,500+ network hospitals", "Covers 4.25 crore beneficiaries"],
        description: `YSR Arogyasri, comprehensively revamped and expanded under JaganAnna (2019–2024), emerged as the cornerstone of public health insurance in Andhra Pradesh, redefining access to quality healthcare for the poor and vulnerable. The scheme provided end-to-end cashless treatment for serious and life-threatening illnesses to over 4.25 crore beneficiaries, significantly reducing out-of-pocket medical expenses. Coverage was extended to families with annual incomes below ₹5 lakh, including those with pre-existing conditions, with an enhanced annual health cover of up to ₹25 lakh for thousands of procedures across multiple medical specialities. Implemented through robust public–private partnerships, the network expanded to over 2,500 empanelled hospitals. Arogyasri ensured seamless services covering screening, pre-authorization, hospitalization, surgeries, and post-hospitalization support, protecting families from catastrophic health expenditures and substantially improving health equity and social security across the state.`
      },
      {
        title: "Strengthening Health Infrastructure",
        icon: <Landmark size={18} />,
        image: "/pillar-images/Healthcare.png",
        points: ["17 new medical colleges", "Nadu-Nedu upgrades", "10,000+ village clinics"],
        description: `Under JaganAnna's Leadership, sustained investments of over ₹10,000 crore annually modernized and expanded the public healthcare system. A key milestone was the sanctioning of 17 new medical colleges, aimed at improving doctor availability and regional access to tertiary healthcare. Under the Nadu-Nedu program, more than 16,000 hospitals, PHCs, CHCs, and medical institutions were upgraded with modern equipment, better sanitation, and improved patient facilities. The introduction of YSR Village Clinics and Family Doctor services brought primary healthcare directly to rural and underserved populations. Emergency response capabilities were strengthened through 108 services and bike ambulances to serve remote and inaccessible areas. These interventions bridged rural–urban healthcare gaps, enhanced emergency care, generated large-scale health-sector employment, and laid the foundation for a resilient, inclusive, and future-ready public health ecosystem.`
      },
      {
        title: "Last Mile Health Services",
        icon: <Users size={18} />,
        image: "/pillar-images/Healthcare.png",
        points: ["YSR Village Clinics 24x7", "Family Doctor household care", "Jagananna Arogya Suraksha camps"],
        description: `Last-mile healthcare delivery became a defining feature of the governance model under JaganAnna, with a strong emphasis on reaching rural, remote, and underserved communities. The YSR Village Clinics initiative ensured one clinic per village, offering 24×7 access to primary healthcare, basic diagnostics, medicines, and first-line treatment close to people's homes. Complementing this, the Family Doctor system enabled continuous household-level health monitoring, early detection of illnesses, and timely medical advice. Jagananna Arogya Suraksha camps strengthened outreach by conducting doorstep health surveys, screening for non-communicable diseases, maternal and child health assessments, immunization checks, and structured referrals to higher facilities. An enhanced ambulance network, including bike ambulances for difficult terrain, ensured rapid emergency response. These measures ensured continuity of care, reduced hospital overload, strengthened preventive healthcare, and significantly improved health outcomes across rural Andhra Pradesh.`
      },
      {
        title: "Digital Health Care",
        icon: <Globe size={18} />,
        image: "/pillar-images/Healthcare.png",
        points: ["Telemedicine hubs", "Arogyasri app integration", "EHR & CM Dashboard"],
        description:`Digital health initiatives fundamentally transformed service delivery under the JaganAnna Regime, leveraging technology to improve access, efficiency, and accountability in healthcare. Telehealth platforms such as YSR Telemedicine connected rural and remote populations with qualified specialists through 1,000+ telemedicine hubs, enabling real-time consultations without long-distance travel. The Arogyasri mobile app streamlined hospital authorizations, beneficiary verification, and network hospital locations, improving transparency and patient convenience. CM Health Dashboards enabled continuous monitoring of service delivery, treatment volumes, and outcomes, supporting data-driven governance and timely interventions. Digitized health records maintained at Village and Ward Secretariats ensured continuity of care, faster referrals, and better follow-up. Integration with national digital health systems strengthened interoperability and patient tracking. Together, these initiatives reduced hospital overcrowding, lowered patient costs, enabled e-prescriptions, and marked a decisive shift toward a tech-enabled, patient-centric public healthcare ecosystem`  
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Heart size={18} />, image: "/health.png", points: ["Universal care focus", "Prevention & advanced treatment", "Family Doctor system"] },
      { id: 'Arogyasri', title: 'YSR Arogyasri', icon: <ShieldCheck size={18} />, image: "/aro.png", detailStatement: 'Cashless cover up to ₹25 Lakh for serious illnesses.', metrics: [{label: 'Coverage', value: '4.25 Cr+'}, {label: 'Hospitals', value: '2,500+'}], points: ['Cashless high-cost care', 'Post-hospital follow-up'] },
      { id: 'Infrastructure', title: 'Health Infra', icon: <Landmark size={18} />, image: "/pillar-images/185793409_4116145448405891_1422686474075524799_n.jpg", detailStatement: 'New colleges & Nadu-Nedu upgrades.', metrics: [{label: 'Colleges', value: '17+'}, {label: 'Clinics', value: '10,000+'}], points: ['Medical colleges', 'Village Clinics & upgrades'] },
      { id: 'Digital', title: 'Telehealth', icon: <Globe size={18} />, image: "/pillar-images/Healthcare.png", detailStatement: 'Telemedicine & integrated apps.', metrics: [{label: 'Hubs', value: '1,000+'}, {label: 'Consults', value: 'Lakhs/yr'}], points: ['Telemedicine for specialty care', 'Arogyasri app integration'] }
    ]
  },

  2: {
    fullTitle: "Global Education Revolution",
    subTitle: "Empowering Future Generations",
    vision: "JaganAnna believed education is the key to social equality. Bridging the gap through quality English medium education and modern infrastructure.",
    themeColor: "from-indigo-800 to-indigo-600",
    accentColor: "indigo-600",
    accentHex: "#4f46e5",
    impactPoints: ["Zero Dropouts", "Global Confidence", "Modern Schools", "Digital Learning", "Higher Enrolment", "Fee Security", "Women Education", "Skill Readiness"],
    tabs: [
      {
        id: 'Overview',
        title: 'Overview',
        icon: <GraduationCap size={18} />,
        image: "/pillar-images/education.png",
        points: ["English medium transformation", "Nadu-Nedu school revamp", "Digital boards in villages"],
        description: `JaganAnna envisioned education and skill development in Andhra Pradesh as a pathway to producing global citizens — knowledgeable, skilled, multilingual, and competitive on the world stage. He transformed the state's education system into a modern, inclusive, and world-class model through Navaratnalu initiatives, introducing English-medium education from Class 1 in government schools, supported by bilingual textbooks, teacher training, and digital classrooms. Schemes like Jagananna Amma Vodi, Vidya Deevena, and Vidya Kanuka ensured access for marginalized students, fostering equity and global readiness. Infrastructure upgrades brought smart labs and technology to rural classrooms. The YSR Skill Development Scheme trained over 10 lakh youth in IT, technical trades, and industry-aligned programs through global partnerships.The proposed YSR Skill University focused on international standards, innovation, and employability, creating confident individuals ready for global industries and knowledge economies.`
      },
      {
        id: 'Support',
        title: 'Direct Aid',
        icon: <Coins size={18} />,
        image: "/pillar-images/education.png",
      
       
        points: ["Amma Vodi annual support", "Vidya Deevena fee reimbursement", "Vasathi Deevena lodging aid"],
        description: `JaganAnna implemented transformative reforms in school education to make it accessible, quality-driven, and inclusive for every child, particularly those from rural and marginalized communities. The flagship Jagananna Amma Vodi scheme provided ₹15,000 annually to mothers for every child attending government schools, benefiting over 42 lakh mothers and significantly reducing dropout rates. English-medium education was pioneered in all government schools from Class 1, supported by bilingual textbooks, teacher training, and digital resources. Jagananna Vidya Kanuka distributed free school kits annually, while Vidyalaya Deevena upgraded infrastructure with smart classrooms, digital labs, and modern facilities. Mid-day meals were enriched with eggs and milk to boost attendance and health. These Navaratnalu-aligned reforms improved enrollment, learning outcomes, and infrastructure, positioning government schools as competitive institutions and standing as JaganAnna's enduring legacy for an empowered, equitable education system in Andhra Pradesh.`
      },
      {
        id: 'Kit',
        title: 'Jagananna Vidya Deevena',
        icon: <Briefcase size={18} />,
        image: "/pillar-images/education.png",
       
        points: ["Bags, Shoes, Uniforms, Books", "Nutritious Mid-day meals", "Free tabs for 8th graders"],
        description: `JaganAnna introduced comprehensive reforms in higher education to make it accessible, industry-aligned, flexible, and skill-oriented for students from all backgrounds. The flagship JaganAnna Vidya Deevena provided full fee reimbursement — covering tuition, hostel, mess, and books — for SC/ST/BC/Minority and economically backward students pursuing degree, PG, and professional courses, benefiting over 20 lakh students. Curriculum reforms through the Choice-Based Credit System enabled multiple entry/exit options, interdisciplinary learning, and flexible credits. The single-minor system allowed students to pursue additional subjects like data analytics or management alongside their major. Mandatory internships with academic credits bridged the academia-industry gap. Industry-oriented courses in AI, data science, biotechnology, and renewable energy ensured job-ready graduates. Vasthi Deevena supported hostel and mess expenses for rural students. These Navaratnalu-aligned reforms boosted enrollment, reduced dropouts, improved employability, and positioned Andhra Pradesh's higher education as globally competitive.`
      },
      {
        id: 'Skills',
        title: 'Employability',
        icon: <TrendingUp size={18} />,
        image: "/pillar-images/education.png",
      

        points: ["Curriculum mapping with industry", "Skill development hubs", "Microsoft certification aid"],
        description: `JaganAnna envisioned skill development as a critical driver for youth empowerment, unemployment reduction, and making Andhra Pradesh a hub of globally ready skilled workforce. He launched the YSR Skill Development Scheme, training over 10 lakh youth in IT, technical trades, soft skills, and emerging technologies like AI, data science, and renewable energy through strong industry partnerships. Over 100 ITIs and polytechnic colleges were upgraded with state-of-the-art labs, advanced machinery, and digital tools for hands-on practical training. Plans for a dedicated YSR Skill University were initiated to offer specialized programs aligned with international standards, fostering innovation and entrepreneurship. Mandatory internships and apprenticeships with academic credits provided real-world industry exposure. English proficiency and soft skills training were integrated across all programs to enhance global employability. These Navaratnalu-aligned reforms bridged the skill gap and created lakhs of opportunities for Andhra Pradesh's youth.`
      }
    ]
    
  },

  3: {
    fullTitle: "Agriculture & Livestock Reforms",
    subTitle: "Farmer-Centric Growth & Income Security",
    vision: "Placing farmers at the center of governance through input security, risk protection, and local support systems.",
    themeColor: "from-green-800 to-ysrcp-green",
    accentColor: "ysrcp-green",
    accentHex: "#28a745",
    impactPoints: ["Zero Distress", "Stable Incomes", "Direct Support", "Local Access", "Crop Insurance", "Women SHG Dairy", "MSP Security", "Modern Tech"],
    tabs: [
      {
        id: 'Overview',
        title: 'Vision',
        icon: <Leaf size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Agriculture as top priority", "₹1.5 lakh crore spending", "Middlemen-free delivery"],
        description: `JaganAnna placed agriculture at the core of his vision for rural prosperity, making farming profitable, sustainable, and dignified for small and marginal farmers. His flagship YSR Rythu Bharosa provided direct annual assistance of ₹13,500 per farmer family, disbursing over ₹34,000 crore to 53 lakh beneficiaries. YSR Sunna Vaddi ensured zero-interest crop loans, while government-funded crop insurance premiums made Andhra Pradesh a national leader. Rythu Bharosa Kendras in every village offered quality inputs, soil testing, expert advisory, and direct procurement, eliminating middlemen. Foodgrain production rose from 154 to over 166 lakh tonnes, with dairy, poultry, and fisheries expanding significantly. Natural farming through ZBNF, strengthened Rythu Bazars, and e-NAM integration improved market access. These Navaratnalu-aligned reforms ensured income security, reduced farmer risks, and established JaganAnna's enduring legacy for a self-reliant, farmer-friendly Andhra Pradesh.`
      },
      { 
        id: 'Support', 
        title: 'Rythu Bharosa', 
        icon: <Coins size={18} />, 
        image: "/pillar-images/Decentrilization.png", 
        description: `JaganAnna launched the YSR Rythu Bharosa Scheme on October 15, 2019, delivering direct financial support of ₹13,500 annually per farmer family in three installments — integrating PM-KISAN's ₹6,000 with an additional ₹7,500 from the state, totaling ₹67,500 over five years. Over 53 lakh farmers, including tenants and RoFR holders, received more than ₹34,000 crore through transparent DBT transfers to Aadhaar-linked accounts. Rythu Bharosa Kendras supplied quality inputs, soil testing, advisory services, and direct MSP procurement. The government paid full crop insurance premiums under PMFBY, making Andhra Pradesh a national leader in coverage. YSR Sunna Vaddi offered zero-interest loans, while free borewells and input subsidies strengthened financial security. These measures ensured income stability, boosted foodgrain production from 154 to over 166 lakh tonnes, and significantly improved the state's agricultural ranking.`,
        points: ["Annual financial support", "Free 9-hour power supply", "Zero interest crop loans"] 
      },
      { 
        id: 'RBKs', 
        title: 'RBK Network', 
        icon: <ShieldCheck size={18} />, 
        image: "/pillar-images/Decentrilization.png", 
        description: `JaganAnna launched over 10,778 Rythu Bharosa Kendras as village-level one-stop centers, revolutionizing agricultural support delivery across Andhra Pradesh. These RBKs provided quality inputs, seeds, fertilizers, soil testing, expert advisory services, e-crop registration, and direct procurement at MSP, significantly reducing middlemen exploitation while promoting modern and sustainable farming practices. Over 53 lakh farmers, including small and marginal landholders, tenant farmers, and RoFR pattadar holders from marginalized communities, benefited through transparent DBT transfers, ensuring elimination of intermediaries. Agricultural growth turned positive, foodgrain production rose from 154 lakh tonnes to over 166 lakh tonnes, and the state improved its national agriculture ranking alongside reduced debt burdens and rural migration. Aligned with Navaratnalu promises, RBKs emphasized farmer dignity, income security, and inclusive growth, remaining a celebrated legacy of JaganAnna's commitment to transforming agriculture and rural prosperity in Andhra Pradesh.`,
        points: ["Village level support hubs", "Free crop insurance premium", "Price stabilization fund"] },
      { 
        id: 'Markets', 
        title: 'Market Reforms', 
        icon: <Briefcase size={18} />, 
        image: "/pillar-images/Decentrilization.png", 
        description: `JaganAnna introduced key market reforms during his tenure to empower farmers by ensuring fair prices, reducing middlemen exploitation, and providing direct market access. Over 10,778 Rythu Bharosa Kendras served as procurement hubs for crops like paddy, maize, and pulses at Minimum Support Price, enabling direct government purchases and timely payments. These Kendras integrated with e-NAM for online trading, connecting farmers to wider markets and better rates while eliminating intermediaries. Rythu Bazars were modernized with improved infrastructure, cold storage, and quality testing facilities to facilitate direct consumer sales. Price stabilization measures including buffer stocks and intervention purchases protected farmers from market volatility. Contract farming was encouraged for chillies, tobacco, and horticulture to secure assured buyers. These reforms strengthened the APMC system with transparency and farmer-centric mechanisms, improving farmer incomes, reducing post-harvest losses, and building stronger market linkages across Andhra Pradesh`,
        points: ["RBK procurement", "Market access", "Price stabilization"] },
      
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
    sections: [
      {
        title: "Vision",
        icon: <Heart size={18} />,
        image: "/pillar-images/Welfare.png",
        points: ["People-first governance", "Inclusive development"],
        description: `JaganAnna's welfare architecture revolves around a "people-first" governance model inherited from Mahanetha Dr. YS Rajasekhara Reddy garu. It emphasizes inclusive development, social justice, and empowerment of marginalized communities through the Navaratnalu framework, treating welfare as a fundamental right rather than charity. The approach focuses on citizen-centric reforms, decentralization through Village and Ward Secretariats, and a saturation model ensuring no eligible beneficiary is excluded, irrespective of caste, creed, or political affiliation. Direct state–citizen engagement is enabled through over 2.6 lakh volunteers delivering doorstep services, supported by data-driven governance and sustained investment in human capital. The overarching objective is to build an equitable welfare state by reducing poverty, enhancing dignity, and ensuring economic security for vulnerable groups — SC/ST/BCs, minorities, the elderly, persons with disabilities, and women — with technology-driven transparency and efficiency.`
        },
      {
        title: "DBT",
        icon: <Coins size={18} />,
        image: "/pillar-images/Welfare.png",
        points: ["₹2.5–2.7 Lakh Cr disbursed", "Aadhaar-linked DBT"],
        description: `JaganAnna's welfare architecture, implemented from 2019 to 2024, disbursed approximately ₹2.5–2.7 lakh crore through Direct Benefit Transfer under Navaratnalu and allied schemes, benefiting nearly 1.4–2 crore households with saturation coverage across Andhra Pradesh. Major allocations included ₹90,602 crore for YSR Pension Kanuka, ₹34,378 crore for YSR Rythu Bharosa, ₹26,000 crore for Jagananna Amma Vodi, ₹12,609 crore for Jagananna Vidya Deevena, and ₹19,189 crore for YSR Cheyutha, along with substantial support for housing, health, and livelihood programs. Funds were credited directly into Aadhaar-linked bank accounts, largely in women's names, ensuring transparency, reducing leakages, and promoting financial inclusion. This unprecedented scale of welfare delivery significantly reduced poverty, enhanced dignity, and ensured economic security for vulnerable communities including SC/ST/BCs, minorities, women, and the elderly across the state.`
      },
      {
        title: "Saturation",
        icon: <Users size={18} />,
        image: "/pillar-images/Welfare.png",
        points: ["Universal coverage", "No eligible beneficiary excluded"],
        description: `JaganAnna's saturation approach in welfare architecture ensures universal coverage by reaching every eligible beneficiary without caps or exclusions, reflecting the principle of "no one left behind." Implemented across Navaratnalu, it uses Aadhaar-linked data, household surveys, and digital platforms to cover education, health, agriculture, housing, and social security. Amma Vodi supports all mothers with school-going children; Rythu Bharosa assists small, marginal, and tenant farmers; Vidya and Vasathi Deevena remove fee burdens for backward and EBC students; Pension Kanuka covers eligible elderly, widows, and persons with disabilities; Cheyutha and Asara empower qualifying women and SHGs; Arogyasri provides comprehensive health cover to low-income families; and Pedalandariki Illu targets over 25 lakh houses, predominantly registered in women's names, ensuring dignity, ownership, and long-term financial security for vulnerable households across Andhra Pradesh.`
      },
      {
        title: "Digital Governance",
        icon: <Globe size={18} />,
        image: "/pillar-images/Welfare.png",
        points: ["Spandana, e-Pragati, JnanaBhumi", "AP State FibreNet"],
        description: `JaganAnna's digital governance architecture transformed administration by leveraging technology for efficiency, transparency, and last-mile accessibility. Core platforms such as Spandana for grievance redressal, the CM Dashboard for real-time scheme monitoring, JnanaBhumi for education DBTs, and AI/ML-driven e-governance enabled data-based decision-making across all departments. Over 15,000 Village and Ward Secretariats delivered 500+ services directly to citizens, eliminating intermediaries and reducing corruption. Rythu Bharosa Kendras supported farmers through digital kiosks, e-Crop registration, expert advisories, and procurement tracking. AP State FibreNet provided high-speed broadband connectivity to villages, enabling seamless digital service delivery in remote areas. Aadhaar-linked DBT transfers ensured direct, leakage-free disbursement of welfare benefits worth over ₹2.5 lakh crore. Together, these digital initiatives bridged the urban-rural divide, empowered citizens with information, and established Andhra Pradesh as a national leader in technology-driven, citizen-centric governance.`
      },
      {
        title: "Grievance Redressal",
        icon: <Info size={18} />,
        image: "/pillar-images/Welfare.png",
        points: ["Spandana Portal", "1902 CM Call Centre"],
        description:`JaganAnna streamlined grievance redressal through the Spandana Portal and integrated digital systems to ensure transparent and time-bound resolution. Citizens could lodge complaints via multiple channels — online, Village and Ward Secretariats, police stations, or the 24/7 toll-free 1902 CM Call Centre — each assigned a unique ID with fixed timelines, escalations, and monthly collector reviews. Jagananna Suraksha camps reached approximately 1.6 crore families at the village level, resolving issues related to documents and scheme access. Supported by 2.6 lakh volunteers and digital feedback loops, the system resolved millions of grievances efficiently, reduced administrative delays, and improved public trust significantly. Real-time monitoring ensured accountability at every level, preventing complaints from being ignored or delayed. Together, these mechanisms enabled faster DBT disbursals, strengthened citizen-government relationships, and established a responsive, corruption-free grievance ecosystem across Andhra Pradesh under JaganAnna's people-first governance model.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Heart size={18} />, image: "/pillar-images/Welfare.png", points: ["Navaratnalu core foundation", "₹2.55 lakh crore DBT", "Saturation-based delivery"] },
      { id: 'Pensions', title: 'Social Security', icon: <Users size={18} />, image: "/pillar-images/Welfare.png", detailStatement: "Support for the vulnerable." },
      { id: 'Housing', title: 'Mega Housing', icon: <Landmark size={18} />, image: "/pillar-images/Welfare.png", detailStatement: "Dignity through ownership.", metrics: [{label: "House Sites", value: "31 Lakh"}, {label: "Townships", value: "17,000"}], points: ["Free house sites for poor", "Basic infra in new layouts", "Registry in name of women"] },
      { id: 'Finance', title: 'Livelihoods', icon: <Coins size={18} />, image: "/pillar-images/Welfare.png", detailStatement: "Empowering specific sectors.", metrics: [{label: "Cheyutha", value: "₹75,000"}, {label: "Asara", value: "Loan Waiver"}], points: ["YSR Cheyutha for women", "YSR Asara for SHG groups", "Nethanna Nestham for weavers"] }
    ]
  },
  
  5: {
    fullTitle: "Infrastructure Development",
    subTitle: "Modern, Inclusive Andhra Pradesh",
    vision: "Creating a modern, people-centric Andhra Pradesh by prioritizing rapid, high-quality and inclusive infrastructure to drive growth and jobs.",
    themeColor: "from-amber-800 to-amber-600",
    accentColor: "amber-600",
    accentHex: "#d97706",
    impactPoints: ["Balanced Growth", "Roads & Ports", "Housing for All", "Water Security", "Industrial Parks", "Digital Connectivity", "Green Energy", "Village Access"],
    sections: [
      {
        title: "Vision",
        icon: <Landmark size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Modern, Inclusive Andhra Pradesh", "Saturation & sustainability"],
        description: `JaganAnna's infrastructure development vision aimed at creating a "Modern, Inclusive Andhra Pradesh" by prioritizing rapid, high-quality, and people-centric infrastructure to drive economic growth, generate employment, and enhance quality of life for rural and urban populations. Inspired by Dr. YS Rajasekhara Reddy's legacy, the vision focused on saturation coverage, sustainable practices, women-owned assets, and convergence with welfare schemes. Massive investments emphasized roads, ports, housing, water supply, urban renewal, industrial corridors, digital connectivity, and social facilities, ensuring balanced regional development and equitable growth across the state. The approach integrated welfare and infrastructure delivery through Village and Ward Secretariats, enabling seamless last-mile connectivity. By prioritizing marginalized communities, backward regions, and underserved populations, JaganAnna laid the foundation for a resilient, future-ready Andhra Pradesh built on the principles of dignity, inclusivity, and sustained prosperity for every citizen`
      },
      {
        title: "Roads, Ports & Connectivity",
        icon: <TrendingUp size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["1.2 lakh km roads", "5,000+ km 4-lane", "Port modernisation"],
        description: `JaganAnna's era witnessed unprecedented infrastructure growth in roads, ports, and connectivity across Andhra Pradesh. The government constructed over 1.2 lakh km of roads, including more than 5,000 km of new four-lane highways, 10,000+ km of black-topped village roads, and 2,000+ km of coastal highways improving regional connectivity. Ports were modernized with investments exceeding ₹20,000 crore, boosting combined cargo capacity and export potential. Four new greenfield ports — Machilipatnam, Ramayapatnam, Mulapeta, and Kakinada Gateway — were planned along the 974 km coastline, targeting an additional 100–145 million tonnes per annum cargo capacity. Existing ports at Visakhapatnam, Kakinada, and Krishna were upgraded with modern berths, equipment, and logistics facilities. Airport upgrades strengthened air connectivity across the state. These comprehensive infrastructure investments created large numbers of construction and logistics jobs, reduced transportation costs, and laid a strong foundation for sustained economic growth throughout Andhra Pradesh.`
      },
      {
        title: "Housing, Water & Urban Infrastructure",
        icon: <Map size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Pedalandariki Illu: 25 Lakh target", "Mission Bhagiratha: piped water", "Smart Townships & AMRUT"],
        description: `JaganAnna's administration implemented transformative infrastructure projects spanning housing, drinking water, and urban development to improve living standards across Andhra Pradesh. Under the Pedalandariki Illu program, 25 lakh houses were sanctioned with over 18 lakh completed by 2024, with ownership titles predominantly registered in women's names, strengthening social security and asset ownership. Mission Bhagiratha expanded access to safe drinking water by providing piped connections to nearly 1.5 crore households, reducing dependence on unsafe sources and lowering waterborne diseases. Urban infrastructure received a major boost through Smart Cities, AMRUT, PMAY, and large-scale slum redevelopment, upgrading sanitation systems, drainage, roads, and public amenities. Together, these interventions improved health outcomes, enhanced urban resilience, reduced inequality between informal and planned settlements, and elevated overall quality of life in cities and towns across Andhra Pradesh.`
      },
      {
        title: "Industrial & Economic Infrastructure",
        icon: <Factory size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Three industrial corridors", "50+ industrial clusters", "₹15 Lakh Cr MoUs"],
        description:`JaganAnna's government pursued a comprehensive industrial growth strategy aimed at diversification, job creation, and regional balance. Major industrial corridors were developed alongside over 50 industrial clusters and mega parks across electronics, pharmaceuticals, textiles, food processing, and defence manufacturing. Large-scale MoUs anchored investments, while SEZs, logistics parks, and renewable energy plants strengthened the supporting ecosystem. Special emphasis on port-led development ensured seamless connectivity between industrial zones, ports, highways, and rail networks, reducing logistics costs and improving export competitiveness. MSME-focused schemes provided credit access, infrastructure support, and market linkages, enabling small enterprises to scale and integrate into value chains. Together, these initiatives generated hundreds of thousands of direct jobs, boosted exports, attracted global investors, and built a resilient, future-ready industrial ecosystem that balanced growth across regions, positioning Andhra Pradesh as a competitive manufacturing and logistics hub.`       
      },
      {
        title: "Digital & Social Infrastructure",
        icon: <Globe size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["AP State FibreNet", "Nadu-Nedu digital schools", "Village Secretariats services"],
        description: `JaganAnna's era laid a strong and future-oriented foundation for digital and social infrastructure, transforming governance and public service delivery across Andhra Pradesh. Village and Ward Secretariats brought governance closer to citizens, delivering 500+ services at the doorstep with greater transparency, accountability, and reduced dependence on intermediaries. Digital connectivity was strengthened through fiber optic networks, enabling seamless administrative coordination and real-time data flow across mandals and district offices. The Nadu–Nedu program upgraded government schools with modern classrooms, digital boards, furniture, and sanitation facilities, narrowing the quality gap between public and private institutions. Parallel investments in health and social assets — including new medical colleges, village clinics, sports complexes, and community halls — expanded access to essential services. These initiatives bridged the digital divide, strengthened social infrastructure, improved governance efficiency, and ensured inclusive, technology-enabled development across urban and rural Andhra Pradesh.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Landmark size={18} />, image: "/infrastructure.png", points: ["Modern inclusive vision", "People-centric projects", "Large investment push"] },
      { id: 'Connectivity', title: 'Roads & Ports', icon: <TrendingUp size={18} />, image: "/roads.png", detailStatement: 'Major expansion in roads, ports and airports.', metrics: [{label: 'Roads', value: '1.2 Lakh KM+'}, {label: 'Ports Capacity', value: '200 MTPA+'}], points: ['Highways, coastal corridors', 'Port modernisation & new terminals'] },
      { id: 'Housing', title: 'Housing & Water', icon: <Map size={18} />, image: "/housing.png", detailStatement: 'Pedalandariki Illu & Mission Bhagiratha.', metrics: [{label: 'Houses', value: '18 Lakh+ Completed'}, {label: 'Households Water', value: '1.5 Cr+'}], points: ['Free houses for poor', 'Piped drinking water coverage'] },
      { id: 'Industry', title: 'Industrial Parks', icon: <Factory size={18} />, image: "/industry.png", detailStatement: 'Corridors, clusters and SEZs to boost jobs.', metrics: [{label: 'Clusters', value: '50+'}, {label: 'MoUs', value: '₹15 Lakh Cr+'}], points: ['Mega parks & logistics hubs', 'MSME & export promotion'] },
      { id: 'Digital', title: 'Digital & Social', icon: <Globe size={18} />, image: "/digital.png", detailStatement: 'FibreNet, SDWAN & Nadu-Nedu scale-up.', metrics: [{label: 'Villages Connected', value: '15,000+'}, {label: 'Schools Upgraded', value: '45,000+'}], points: ['High-speed broadband', 'Digital classrooms & services'] }
    ]
  },
  6: {
    fullTitle: "Industrial & Employment Growth",
    subTitle: "Jobs, Local Industry & Youth Empowerment",
    vision: "Focusing on creating jobs for local youth, ensuring industries benefit nearby villages and towns with a balanced regional growth approach.",
    themeColor: "from-slate-800 to-slate-600",
    accentColor: "slate-600",
    accentHex: "#475569",
    impactPoints: ["Youth Jobs", "Local Economy", "Zero Migration", "MSME Growth", "State Revenue", "Clean Energy", "Transparent Policy", "Skill Mapping"],
    sections: [
      {
        title: "Industries",
        icon: <Factory size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Manufacturing expansion", "IT & knowledge industries", "Renewables & green energy"],
        description: `JaganAnna envisioned transforming Andhra Pradesh into a vibrant industrial hub through welfare-linked economic growth. His administration prioritized creating a business-friendly environment with top-tier infrastructure to attract investments in manufacturing, IT, renewables, and emerging sectors. Key initiatives included industrial corridors, skill development programs, and incentives for sustainable industries. RBI data confirms strong industrial growth during 2019–2024, with Andhra Pradesh leading South India in manufacturing GVA. JaganAnna emphasized decentralized industrial hubs for balanced regional progress. His 2019 US visit laid a roadmap for trade and investments with USIBC. Vision Visakha positioned Visakhapatnam as a growth engine with projects spanning ports, tourism, and urban development. His strategy integrated social welfare with economic reforms, registering over 2 lakh new MSMEs and fostering job-oriented industries. This holistic approach aimed to make Andhra Pradesh a global knowledge and industrial powerhouse, focusing on equitable and inclusive growth over centralized development models`
      },
      {
        title: "Decentralized Industries",
        icon: <Map size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Regional industrial clusters", "Green decentralized energy", "Local value chains"],
        description: `JaganAnna's tenure made decentralized industries a core policy for balanced regional development across Andhra Pradesh. He firmly rejected single-capital models in favor of multi-hub strategies, emphasizing that decentralization was the only way forward. This included specialized clusters — Rayalaseema as an electronics and automobile hub, Prakasam with major paper mills, and distributed projects such as pumped storage units, cement factories in Anantapur and Kurnool, and electronics ecosystems in Kopparthi and Sri City. RBI data highlights diversified industrial growth, with Andhra Pradesh leading South India in manufacturing. Initiatives like Reliance CBG plants exemplified green, decentralized energy projects. His government promoted infrastructure in backward areas, establishing 311 major industries and creating over 1.3 lakh jobs through dispersed investments. This approach focused on equitable wealth distribution and administrative decentralization, fostering inclusive growth across new industrial clusters throughout the state.`
      },
      {
        title: "MoUs & GIS Vizag",
        icon: <Globe size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Large MoUs at GIS 2023", "Cross-sector investments", "Follow-through and implementation"],
        description: `JaganAnna's Global Investors Summit 2023 in Visakhapatnam attracted massive investments through landmark MoUs. On day one alone, 92 MoUs worth ₹11.87 lakh crore were signed, projecting 6 million jobs across 20 sectors. Key deals involved NTPC, JSW Group, and others in energy, manufacturing, and infrastructure. By mid-2023, 352 total MoUs were signed, with 100 under implementation, yielding ₹2,739 crore in investments and 6,858 jobs. The IT sector secured 88 MoUs worth ₹44,963 crore. JaganAnna positioned GIS as a platform for global partnerships, highlighting Andhra Pradesh's second national ranking in ease of doing business. Post-summit, 38 firms planned operations from January 2024, boosting renewables, pharma, and emerging sectors. While not all MoUs materialize, the administration demonstrated strong follow-through, setting a benchmark for investment summits and reinforcing Andhra Pradesh's reputation as a premier investment destination.`
      },
      {
        title: "MSME & Local Entrepreneurs",
        icon: <Briefcase size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["ReSTART relief package", "2 lakh new MSMEs", "Local supply chain development"],
        description: `JaganAnna strongly supported MSMEs and local entrepreneurs across Andhra Pradesh. The ReSTART package provided ₹1,110 crore in incentives, benefiting 97,428 units and over 10 lakh employees during COVID. In 2021, ₹1,124 crore was disbursed to MSMEs and spinning mills. Between 2019–2023, over 2 lakh new MSMEs were registered, generating 12.62 lakh jobs, with total MSME units reaching 1 lakh and employing 10 lakh people. Initiatives included ₹450 crore initial aid, cluster parks, and integration with larger investments through GIS MoUs. The government promoted local supply chains in textiles, food processing, and allied sectors, while encouraging youth entrepreneurship under the "one family, one entrepreneur" vision. These efforts positioned Andhra Pradesh prominently in ease of doing business for small enterprises, fostering grassroots innovation, economic empowerment, and inclusive industrial growth throughout the state.`
      },
      {
        title: "Job Creation",
        icon: <BarChart3 size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["6.16 lakh jobs (2019-2024)", "2.06 lakh permanent govt jobs", "1.3 lakh industrial jobs"],
        description: `JaganAnna's tenure witnessed significant job creation totaling over 6.16 lakh opportunities across Andhra Pradesh. This included 2.06 lakh permanent government jobs, 37,908 contract roles, and 3.71 lakh outsourcing positions. Industrial growth from 311 major units added 1.3 lakh jobs, with RBI data confirming robust manufacturing expansion and Andhra Pradesh leading South India in manufacturing growth. GIS 2023 MoUs projected 6 million jobs, while MSMEs contributed 12.62 lakh employments through 2 lakh new registrations. Government jobs increased to 2.39 lakh, far surpassing the 34,000 added under the previous regime. Welfare-linked schemes, including 17 new medical colleges, boosted employment in health and infrastructure sectors. The focus on decentralized opportunities ensured diversified job growth across sectors, prioritizing youth employment, inclusive development, and equitable economic prosperity throughout Andhra Pradesh.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Users size={18} />, image: "/pillar-images/129776776_3661070970580010_1067747446361922249_n.jpg", points: ["Focus on job creation", "Sustainable industrial nodes", "Transparency in approvals"] },
      { id: 'Policy', title: 'Support Policy', icon: <Factory size={18} />, image: "/pillar-images/129776776_3661070970580010_1067747446361922249_n.jpg", detailStatement: "Ease of doing business.", metrics: [{label: "Single Window", value: "Fast Track"}, {label: "Incentives", value: "Clear Dues"}], points: ["Timely release of incentives", "MSME protection scheme", "Support for local entrepreneurs"] },
      { id: 'Energy', title: 'Green Jobs', icon: <Zap size={18} />, image: "/pillar-images/129776776_3661070970580010_1067747446361922249_n.jpg", detailStatement: "Powering the next decade.", metrics: [{label: "Green Storage", value: "World Class"}, {label: "Capacity", value: "10 GW"}], points: ["Greenko storage project", "Renewable energy corridor", "Low carbon footprint units"] },
      { id: 'Skills', title: 'Employment', icon: <TrendingUp size={18} />, image: "/pillar-images/120476277_3461056323914810_8311003136894606010_n.jpg", detailStatement: "Direct Jobs for Youth.", metrics: [{label: "New Jobs", value: "2.0 Lakh"}, {label: "Placements", value: "Skill Based"}], points: ["Local hiring mandates", "Corporate skill partnerships", "Job fairs in every district"] }
    ]
  },

  7: {
    fullTitle: "Governance Reforms",
    subTitle: "Transparent, Accountable, Citizen-Centric Administration",
    themeColor: "from-blue-800 to-blue-600",
    accentColor: "blue-600",
    accentHex: "#2563eb",
    impactPoints: ["Citizen-Centric Delivery", "Transparency & Accountability", "Decentralized Administration", "Technology-Driven Governance", "15,714 Village Secretariats", "Direct Benefit Transfers", "Volunteer System", "Real-Time Monitoring"],
    sections: [
      {
        title: "Vision",
        icon: <Heart size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Transparent, accountable governance", "Citizen-centric delivery", "Decentralized power"],
        description: `JaganAnna's core vision was to shift from office-centric, bureaucratic systems to people-centric delivery, where services reach citizens at their doorstep without delay, discrimination, or corruption. By decentralizing power, leveraging technology, and strengthening last-mile institutions like Village and Ward Secretariats, his government aimed to restore public trust in the system. Over 15,714 Village and Ward Secretariats were established, bringing governance closer to people. Real-time monitoring, digital dashboards, and direct benefit transfers ensured benefits reached the right person without intermediaries. JaganAnna's guiding principle was simple: "Government should serve, not rule." This vision made governance responsive, efficient, and inclusive, ensuring every citizen — especially the poor and marginalized — experienced a corruption-free, time-bound administration. These institutional reforms fundamentally transformed the relationship between the state and its citizens, establishing a new benchmark for accountable governance across Andhra Pradesh.`
      },
      {
        title: "Citizen-Centric Service Delivery",
        icon: <Users size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["15,714 village and ward secretariats", "1.3 lakh volunteers", "Direct benefit transfers"],
        description: `JaganAnna placed citizen-centric service delivery at the heart of his governance reforms, bringing essential government services directly to people's doorsteps. The establishment of 15,714 Village and Ward Secretariats, along with 3,000+ mandal-level offices, made administration accessible at the local level. Over 1.3 lakh village and ward volunteers were deployed to deliver services like pensions, housing pattas, ration cards, birth/death certificates, and welfare applications without intermediaries. This eliminated the need for people to visit distant offices or pay bribes. Direct benefit transfers ensured funds reached beneficiaries' bank accounts instantly. The model reduced dependence on middlemen, saved time and money for citizens, and made government services fast, fair, and hassle-free. By placing the citizen at the center, JaganAnna transformed governance into a powerful tool for empowerment, convenience, and dignity for every household across Andhra Pradesh.`
      },
      {
        title: "Transparency & Accountability",
        icon: <ShieldCheck size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Digital platforms and dashboards", "Direct benefit transfers ₹2.5 lakh crore", "Grievance redressal systems"],
        description: `JaganAnna made transparency and accountability non-negotiable pillars of his governance reforms. Digital platforms, real-time dashboards, and online monitoring systems tracked every scheme, expenditure, and performance metric across Andhra Pradesh. Direct benefit transfers worth over ₹2.5 lakh crore bypassed middlemen, ensuring zero leakages and full financial integrity. Public dashboards displayed scheme progress, fund utilization, and beneficiary lists openly for citizen verification. Grievance redressal was streamlined through dedicated apps and helplines, with time-bound resolutions ensuring swift justice. Village Secretariats and volunteers enabled community-level monitoring and continuous feedback mechanisms. Strict anti-corruption measures, including digital audits and paperless processes, minimized opportunities for malpractice at every administrative level. These comprehensive reforms restored public trust, made officials directly accountable to citizens, and ensured every rupee reached its intended beneficiary without diversion. Transparency became the defining foundation of JaganAnna's clean, responsive, and citizen-friendly administration throughout Andhra Pradesh.`
      },
      {
        title: "Decentralized Administration",
        icon: <Map size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Empowered districts and mandals", "Direct funds to local bodies", "Multi-capital concept"],
        description: `JaganAnna's decentralized administration empowered districts, mandals, and village-level institutions to make faster, locally relevant decisions. Village and Ward Secretariats were granted financial and administrative powers to implement schemes directly, while mandal-level officers were empowered to approve applications on the spot. Funds were transferred directly to local bodies, significantly reducing delays from higher offices and eliminating bureaucratic bottlenecks. The multi-capital concept and regional focus further strengthened decentralization across the state. Over 1.3 lakh volunteers acted as local facilitators, ensuring decisions reflected ground realities and community needs. This model effectively addressed unique regional requirements, reduced bureaucratic red tape, and dramatically improved administrative efficiency. District collectors were given greater autonomy to prioritize local development needs, ensuring schemes were implemented with speed and accountability. By devolving power downward, JaganAnna made governance more responsive, inclusive, and effective, ensuring development reached every corner of Andhra Pradesh without centralized bottlenecks or unnecessary delays.`
      },
      {
        title: "Technology-Driven Governance",
        icon: <Globe size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Digital tools and apps", "Paperless processes", "Real-time monitoring"],
        description: `Technology-driven governance revolutionized service delivery under Jagananna. Digital tools, data analytics, and paperless systems made administration efficient, fast, and fair. The village/ward secretariat app enabled real-time application processing, tracking, and approvals. Direct benefit transfers used digital banking for instant, transparent disbursals. Online dashboards monitored scheme progress, while apps facilitated grievance redressal and feedback. Paperless processes eliminated corruption and delays. Skill hubs and digital classrooms enhanced education delivery. Fiber optic networks improved rural connectivity. These innovations ensured services were time-bound, corruption-free, and accessible. Technology bridged the gap between government and citizens, making governance inclusive, accountable, and future-ready for every section of society.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Heart size={18} />, image: "/pillar-images/governce.png", points: ["Citizen-centric transformation", "Decentralized power", "Technology integration"] },
      { id: 'Citizen', title: 'Citizen-Centric', icon: <Users size={18} />, image: "/pillar-images/governce.png", detailStatement: 'Services at doorstep via secretariats and volunteers.', metrics: [{label: 'Secretariats', value: '15,714'}, {label: 'Volunteers', value: '1.3 Lakh'}], points: ['Local administration access', 'Direct benefit transfers'] },
      { id: 'Transparency', title: 'Transparency', icon: <ShieldCheck size={18} />, image: "/pillar-images/governce.png", detailStatement: 'Digital monitoring and zero-leakage systems.', metrics: [{label: 'DBT Amount', value: '₹2.5 Lakh Cr'}, {label: 'Dashboards', value: 'Real-Time'}], points: ['Public scheme tracking', 'Grievance redressal'] },
      { id: 'Decentralized', title: 'Decentralized', icon: <Map size={18} />, image: "/pillar-images/governce.png", detailStatement: 'Power to local institutions for faster decisions.', metrics: [{label: 'Mandal Offices', value: '3,000+'}, {label: 'Funds Direct', value: 'Local Bodies'}], points: ['Empowered districts', 'Regional focus'] },
      { id: 'Technology', title: 'Technology', icon: <Globe size={18} />, image: "/pillar-images/governce.png", detailStatement: 'Digital apps and paperless governance.', metrics: [{label: 'Apps', value: 'Multiple'}, {label: 'Connectivity', value: 'Fiber Optic'}], points: ['Real-time processing', 'Corruption-free systems'] }
    ]
  },

  8: {
  fullTitle: "Decentralization",
  subTitle: "Balanced Growth Through People-Centric Governance",
  vision: "Ensuring equitable development by taking administration, infrastructure, and economic opportunities closer to every citizen across Andhra Pradesh.",
  themeColor: "from-[#5A2D82] to-ysrcp-blue",
  accentColor: "ysrcp-blue",
  accentHex: "#0055a5",
  impactPoints: [
    "Balanced Regional Growth",
    "Reduced Migration",
    "Grassroots Empowerment",
    "Local Employment",
    "Inclusive Development",
    "Responsive Governance",
    "Equitable Infrastructure",
    "People-Centric Administration"
  ],
  sections: [
    {
      title: "Decentralization Vision",
      icon: <Globe size={18} />,
      image: "/pillar-images/Decentrilization.png",
      points: [
        "Equitable regional development",
        "Development closer to people",
        "Multi-hub growth model"
      ],
      description: `Jagan Anna, championed decentralized development as the key to equitable growth in Andhra Pradesh (2019-2024). His vision was to ensure that progress and opportunities reach every region, not just a few urban centers. By taking development closer to people, districts, mandals, and villages became hubs of economic activity, employment, and service delivery. Through spreading administration, investments, industries, and welfare across the state, the model aimed to reduce regional imbalances, curb rural-urban migration, and minimize inequality. Decentralization strengthened local governance, empowered grassroots institutions, and ensured decisions aligned with local needs. Jagan rejected the single-capital model, advocating for balanced, multi-hub development. His famous statement, “Development should knock at every door,” reflected this commitment. The approach made growth inclusive, sustainable, and people-centric, transforming Andhra Pradesh into a state where prosperity is shared equally across all regions.`
    },
    {
      title: "Administrative Decentralization",
      icon: <Building size={18} />,
      image: "/pillar-images/Decentrilization.png",
      points: [
        "Village/Ward Secretariats",
        "Volunteer-driven governance",
        "Direct fund transfers"
      ],
      description:`JaganAnna made administrative decentralization a core pillar of his governance vision, strengthening districts, mandals, and villages through empowered local institutions. The government established 15,714 Village and Ward Secretariats, bringing administration directly closer to people. Over 2.7 lakh village and ward volunteers were appointed to deliver services at doorsteps, significantly improving governance efficiency and accountability. Field-level institutions were empowered with financial and decision-making authority for better service delivery. Direct fund transfers to local bodies reduced bureaucratic delays and eliminated intermediaries. This model ensured transparent, responsive governance, with services like pensions, housing pattas, and health schemes reaching beneficiaries faster than ever before. By devolving power downward, JaganAnna made government accountable and accessible to every citizen, strengthening grassroots democracy and enabling needs-based development across all regions. This decentralized approach became a defining hallmark of inclusive, citizen-friendly administration throughout Andhra Pradesh.`
    },
    {
      title: "Regional Economic Hubs",
      icon: <Factory size={18} />,
      image: "/pillar-images/Decentrilization.png",
      points: [
        "Multi-region industrial clusters",
        "Local employment creation",
        "Balanced economic growth"
      ],
      description:  `JaganAnna focused on creating multiple regional economic hubs to generate local employment and drive balanced growth across Andhra Pradesh. Decentralized industrialization established specialized clusters in backward areas — Rayalaseema as an electronics and automobile hub, Prakasam for paper mills, Anantapur and Kurnool for cement factories, and coastal districts for ports and logistics. Over 311 major industries were set up, creating 1.3 lakh jobs across diverse regions. The Global Investors Summit 2023 attracted investments distributed across all regions rather than concentrated urban centers. Agro-clusters and food processing units were promoted in rural districts, while electronics ecosystems flourished in Kopparthi and Sri City. This multi-hub approach prevented economic concentration in few cities, reduced rural migration, and boosted local economies. By developing growth centers in every region, JaganAnna ensured economic opportunities reached every district and mandal, fostering sustainable, inclusive regional prosperity throughout Andhra Pradesh.`
    },
    {
      title: "Infrastructure Closer to People",
      icon: <Building2 size={18} />,
      image: "/pillar-images/Decentrilization.png",
      points: [
        "Healthcare in every district",
        "Housing and irrigation",
        "Education and digital access"
      ],
      description: `JaganAnna prioritized building infrastructure closer to people, ensuring citizens no longer had to travel far for essential services. Seventeen new medical colleges were sanctioned, enhancing healthcare access across every district. Over 25 lakh pucca houses under Pedalandariki Illu were constructed in rural areas, with ownership registered predominantly in women's names. Roads, irrigation projects like Polavaram and Handri-Neeva, and drinking water schemes under Mission Bhagiratha reached remote mandals. Digital connectivity was strengthened through fiber optic networks and digital classrooms across government schools. Educational institutions, including skill hubs and regional universities, were established across backward regions. This widespread infrastructure development ensured hospitals, colleges, roads, and connectivity became locally accessible, significantly reducing urban dependence. By bringing essential infrastructure to every corner of Andhra Pradesh, JaganAnna empowered rural and backward communities with self-sufficiency, improved quality`
    },
    {
      title: "Local Participation & Accountability",
      icon: <Users size={18} />,
      image: "/pillar-images/Decentrilization.png",
      points: [
        "Empowered local bodies",
        "Community monitoring",
        "Transparent governance"
      ],
      description: `JaganAnna made local participation and accountability integral to his decentralized governance model. Panchayats, municipalities, and ward committees were empowered with greater roles in planning and implementation. Over 1.3 lakh village and ward volunteers acted as community bridges, ensuring transparency and effective grievance redressal at the grassroots level. Rythu Bharosa Kendras, Rythu Nestham, and Self-Help Groups encouraged active community involvement in agriculture and livelihoods. People's participation was fostered through direct benefit transfers, public audits, and community monitoring of schemes. Local bodies were granted financial powers and decision-making authority for needs-based development. This approach made governance transparent, responsive, and accountable, ensuring development genuinely reflected local aspirations while preventing corruption. By actively involving communities in governance, JaganAnna strengthened grassroots institutions, restored public trust, and built a participatory democracy that empowered every citizen across Andhra Pradesh.`
    }
  ]
},


  
  9: {
  fullTitle: "Economic Growth",
  subTitle: "Welfare-Led Economy & Strong State Growth",
  vision: "Putting money in people's hands to drive domestic demand and strengthening local rural-urban markets.",
  themeColor: "from-sky-800 to-sky-600",
  accentColor: "sky-600",
  accentHex: "#0284c7",
  impactPoints: [
    "Strong Markets",
    "Stable Incomes",
    "MSME Security",
    "Investor Trust",
    "Port Revenue",
    "Skill Ready Workforce",
    "Crisis Resilience",
    "Higher State GDP"
  ],
  sections: [
    {
      title: "Vision",
      icon: <TrendingUp size={18} />,
      image: "/pillar-images/economic .png",
      points: [
        "Inclusive, job-led prosperity",
        "Welfare as economic investment",
        "Regional equity"
      ],
      description: `JaganAnna envisioned economic growth as inclusive, resilient, and truly people-centric during his tenure in Andhra Pradesh. The core objective was to build a strong economy generating jobs, raising incomes, and enhancing quality of life for every citizen — especially farmers, workers, women, youth, and small entrepreneurs. Growth was not judged solely by GDP figures but by its reach to common people. His administration balanced welfare with development, strengthened local economies, attracted large-scale investments, and ensured economic progress translated into employment, financial stability, and regional equity. Through the Navaratnalu framework, direct benefits worth over ₹2.5 lakh crore reached the grassroots, while flagship initiatives like the Global Investors Summit 2023, decentralized industrialization, and agricultural reforms drove sustainable broad-based growth. JaganAnna emphasized that real development occurs only when prosperity touches every household and region, creating a vibrant, self-reliant Andhra Pradesh.`
    },
    {
      title: "Job-Led Growth",
      icon: <Briefcase size={18} />,
      image: "/pillar-images/economic .png",
      points: [
        "Focus on employment across sectors",
        "Skill hubs and MSME growth",
        "Reduced migration"
      ],
      description: `JaganAnna made job-led growth the cornerstone of his economic vision, prioritizing employment creation across industry, MSMEs, infrastructure, agriculture, and services. His government delivered over 6.16 lakh jobs, including 2.06 lakh permanent government positions, 37,908 contract roles, 3.71 lakh outsourcing positions, and 1.3 lakh jobs from 311 major industrial units. The Global Investors Summit 2023 projected 6 million additional jobs through landmark MoUs. Over 2 lakh new MSMEs were registered, generating 12.62 lakh employments across diverse sectors. Skill hubs in every constituency and strong industry partnerships equipped youth with market-ready skills. Decentralized industrial clusters in backward areas ensured opportunities reached rural and local youth, significantly reducing migration. Transparent, reservation-based recruitment and self-employment schemes like Cheyutha and Aasara further empowered women and marginalized communities, ensuring inclusive, broad-based employment growth throughout Andhra Pradesh.`
    },
    {
      title: "Investment & Industrial Development",
      icon: <Globe size={18} />,
      image: "/pillar-images/economic .png",
      points: [
        "Large-scale MoUs and industrial hubs",
        "Single-window clearances and incentives",
        "Port-led infrastructure"
      ],
      description: `Show more13:34Claude responded: JaganAnna aggressively pursued domestic and global investments to fuel industrial development across Andhra Pradesh.JaganAnna aggressively pursued domestic and global investments to fuel industrial development across Andhra Pradesh. The state improved its ease of doing business ranking to second nationally under his leadership. The landmark Global Investors Summit 2023 in Visakhapatnam attracted 352 MoUs worth ₹11.87 lakh crore on day one, covering energy, manufacturing, IT, renewables, and pharmaceuticals. Key projects included industrial parks, ports, logistics hubs, and sector-specific clusters like Sri City and Kopparthi for electronics. Decentralized industrialization placed hubs in backward regions — Rayalaseema for electronics and automobiles, Prakasam for paper mills — establishing 311 major industries and creating 1.3 lakh jobs. Single-window clearances, targeted incentives, and robust infrastructure support made Andhra Pradesh highly investor-friendly. These combined efforts positioned the state as a premier investment destination, driving sustained industrial growth and employment generation throughout the region.`
    },
    {
      title: "Strengthening Agriculture & Rural Economy",
      icon: <Leaf size={18} />,
      image: "/pillar-images/economic .png",
      points: [
        "Direct farmer support and irrigation",
        "Value addition and market access",
        "Rural infrastructure and housing"
      ],
      description: `JaganAnna made strengthening agriculture and the rural economy a top priority to ensure widespread rural prosperity. Farmers received direct income support through YSR Rythu Bharosa at ₹13,500 per annum, complemented by free borewells and zero-interest crop loans under YSR Sunna Vaddi. Major irrigation projects like Polavaram, Handri-Neeva, and others were accelerated, benefiting lakhs of acres across the state. Value addition and food processing were promoted through dedicated clusters and MoUs with companies like Amul, ITC, and Hindustan Unilever. Market access improved significantly through Rythu Bharosa Kendras, e-markets, and direct procurement centers. Rural infrastructure — roads, electricity, housing under Pedalandariki Illu, and drinking water through Mission Bhagiratha — was substantially enhanced, creating a resilient rural economy. Under JaganAnna, agriculture became profitable, sustainable, and a powerful driver of overall inclusive growth throughout Andhra Pradesh.`
    },
    {
      title: "Inclusive & Balanced Growth",
      icon: <Users size={18} />,
      image: "/pillar-images/economic .png",
      points: [
        "Decentralized development and regional equity",
        "Welfare targeted to vulnerable groups",
        "MSME and entrepreneurship support"
      ],
      description: `JaganAnna ensured inclusive and balanced growth by extending benefits to backward regions and vulnerable communities, reducing inequality and building long-term economic stability. Decentralized development placed industries, universities, skill hubs, and infrastructure in neglected areas like Rayalaseema and north coastal districts. The multi-capital concept addressed historical regional imbalances effectively. Over 90% of welfare benefits targeted women, SC/ST/BC/minorities, and the poor. MSMEs and entrepreneurship programs empowered grassroots economies, while GIS 2023 investments were distributed equitably across regions. Uniform implementation of schemes like Amma Vodi, Cheyutha, and Pedalandariki Illu prevented urban-rural divides. This approach reduced migration, bridged regional gaps, and created equitable prosperity throughout the state. By ensuring no region or community was left behind, JaganAnna built a foundation for sustainable, inclusive economic progress that genuinely transformed lives across every district of Andhra Pradesh.`
    }
]
},

  10: {
    fullTitle: "Social Justice Reforms",
    subTitle: "Equality, Inclusion & Dignity for All",
    vision: "Ensuring that welfare and opportunities reach SC, ST, BC, and Minority communities without any discrimination or bias.",
    themeColor: "from-purple-800 to-purple-600",
    accentColor: "purple-600",
    accentHex: "#9333ea",
    impactPoints: ["Zero Inequality", "Total Inclusion", "Dignity for All", "DBT Accuracy", "Equal Opportunity", "Housing Rights", "Social Security", "Admin Justice"],
    sections: [
      {
        title: "Vision",
        icon: <Users size={18} />,
        image: "/pillar-images/Socialjustic.png",
        points: ["Inclusive governance", "Navaratnalu uplift", "Service to the last person"],
        description: `Jagan Anna envisioned social justice as the bedrock of governance during his tenure (2019-2024). His philosophy was to build a society where every citizen enjoys dignity, security, and equal opportunity, irrespective of caste, class, gender, religion, or region. Through the Navaratnalu framework, the government acted as an active enabler to rectify historical injustices, uplift marginalized communities, and ensure development is truly inclusive, equitable, and people-centric. Special focus was given to the poor, backward classes, SCs, STs, minorities, women, and other vulnerable sections. Over 30 welfare schemes delivered direct, transparent benefits to crores of people, bypassing middlemen and corruption. The vision transformed welfare into a powerful tool for social transformation, creating an empathetic, just society where no one is left behind and progress is shared by all.`
      },
      {
        title: "Equality of Opportunity",
        icon: <GraduationCap size={18} />,
        image: "/pillar-images/Socialjustic.png",
        points: ["Universal education support", "Merit-based recruitment", "Uniform public services"],
        description: `Jagananna’s vision ensured genuine equality of opportunity by removing barriers so birth or background never decides a person’s future. Key initiatives included Amma Vodi providing ₹15,000 annually to mothers of school-going children, Vidya Deevena and Vasathi Deevena reimbursing tuition and hostel fees directly to mothers’ accounts, and transparent recruitments that filled over 2.06 lakh permanent government jobs with adherence to reservations. Healthcare access expanded with 17 new medical colleges and strengthened YSR Arogyasri, while housing pattas and pensions were delivered directly and uniformly. These measures dismantled systemic inequalities and empowered the underprivileged.`
      },
      {
        title: "Economic Inclusion",
        icon: <Coins size={18} />,
        image: "/pillar-images/Socialjustic.png",
        points: ["Direct benefit transfers", "Livelihood support", "MSME & skilling push"],
        description: `Economic inclusion was a cornerstone of Jagananna’s social justice vision, aimed at integrating the poor, vulnerable, and marginalized communities into the mainstream economy in a sustainable manner. Through transparent and technology-driven governance, direct benefit transfers exceeding ₹2.5 lakh crore were delivered directly into beneficiaries’ bank accounts, eliminating leakages and ensuring dignity. Flagship schemes such as YSR Cheyutha, YSR Aasara, and YSR Sunna Vaddi provided financial relief, credit support, and interest-free assistance to women, self-help groups, and small entrepreneurs. Livelihood-focused programs like EBC Nestham and Kapu Nestham empowered traditionally disadvantaged communities by strengthening income-generating opportunities. In parallel, the government facilitated the registration of over 2 lakh new MSMEs, leading to the creation of 12.62 lakh jobs across sectors. Skill hubs, entrepreneurship initiatives, and targeted training programs focused on youth from backward communities, fostering self-reliance, financial stability, and long-term economic resilience.`
      },
      {
        title: "Inclusive Development",
        icon: <Map size={18} />,
        image: "/pillar-images/Socialjustic.png",
        points: ["Decentralized industrialization", "Regional infrastructure", "Equitable MoU distribution"],
        description: `JaganAnna prioritized inclusive development with the clear objective of ensuring that economic growth benefited every region and community, while consciously correcting historical imbalances between urban and rural areas as well as forward and backward regions. His governance model emphasized decentralized industrialization, promoting the establishment of sector-specific industrial clusters in backward and underdeveloped districts to generate local employment and reduce distress migration. Infrastructure development—covering roads, ports, irrigation, power, and digital connectivity—was strategically focused on long-neglected regions to unlock their economic potential. Initiatives such as the Global Investors Summit were designed to attract equitable and regionally balanced investments rather than concentrated urban growth. The multi-capital concept and the establishment of regional universities further strengthened administrative access and higher education opportunities across districts. Together, these measures addressed long-standing regional disparities, curbed excessive urban migration, fostered balanced development, and ensured sustainable, inclusive growth across the state.`
      },
      {
        title: "Dignity & Social Security",
        icon: <Heart size={18} />,
        image: "/pillar-images/Socialjustic.png",
        points: ["Enhanced pensions", "Housing pattas in women’s name", "Universal health coverage"],
        description: `Y. S. Jagan Mohan Reddy (Jagananna) guaranteed dignity, security, and social justice for the elderly, women, persons with disabilities, and other vulnerable sections through a strong and compassionate welfare framework. Pension schemes were significantly enhanced and expanded, ensuring timely and reliable financial support to millions of beneficiaries, thereby reducing dependency and improving quality of life. The landmark “Pedalandariki Illu” initiative provided house-site pattas in the names of women, empowering them with asset ownership and creating long-term, intergenerational wealth for economically weaker families. In the healthcare sector, the expansion of YSR Arogyasri brought comprehensive cashless treatment to a wider population, covering major medical procedures and reducing catastrophic health expenses. Together, these interventions offered safety, stability, and self-respect to marginalized groups, strengthened the social security net, and reaffirmed the government’s commitment to inclusive governance rooted in human dignity and welfare-driven development.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Scale size={18} />, image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg", points: ["Discrimination-free delivery", "Constitutional rights focus", "Equitable resource split"] },
      { id: 'Education', title: 'Future Access', icon: <GraduationCap size={18} />, image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg", detailStatement: "Global Ed for everyone.", metrics: [{label: "Fee Reimb", value: "100%"}, {label: "Scholarships", value: "Direct"}], points: ["Vidya Deevena for SC/ST", "English medium Govt schools", "Removal of poverty barrier"] },
      { id: 'Empowerment', title: 'Economics', icon: <TrendingUp size={18} />, image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg", detailStatement: "Targeted Livelihood Aid.", metrics: [{label: "Nethanna", value: "₹24,000"}, {label: "Chedodu", value: "Artisans"}], points: ["Aid for weavers & tailors", "Support for washermen", "Street vendor interest-free loans"] },
      { id: 'Representation', title: 'Admin Power', icon: <Landmark size={18} />, image: "/pillar-images/152063017_3880516031968835_205946512579517484_n.jpg", detailStatement: "Voice in Governance.", metrics: [{label: "Nominated", value: "50% SC/ST"}, {label: "Secretariats", value: "All Castes"}], points: ["Local youth recruitment", "BC/SC corporation revamp", "Equal share in power"] }
    ]
  },


  11: {
    fullTitle: "Blue Economy Transformation",
    subTitle: "Welfare-Led Coastal Development",
    vision: "Transforming Andhra Pradesh’s long coastline into a source of dignity, income security, and global opportunity.",
    themeColor: "from-[#003366] to-ysrcp-blue",
    accentColor: "ysrcp-blue",
    accentHex: "#0055a5",
    impactPoints: ["Income Security", "Modern Ports", "No Migration", "Marine Exports", "Local Jobs", "Community Dignity", "Coastal Safety", "Market Stability"],
    sections: [
      {
        title: "Marine Vision",
        icon: <Ship size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Welfare of coastal families", "Sustainable coastal development", "Marine livelihood protection"],
        description: `JaganAnna envisioned Andhra Pradesh as a major driver of India's Blue Economy, leveraging the state's 974 km coastline — second longest in the country. His vision revolved around port-led development as the primary engine of progress. With one major port at Visakhapatnam, five operational state ports, and several notified ports handling over 170 million tonnes of cargo annually, Andhra Pradesh ranked second only to Gujarat. JaganAnna aimed to expand this infrastructure by developing four new ports and ten modern fishing harbors, with planned investments of approximately ₹16,000 crore. The overarching goal was to elevate the state's share of national exports from 4% to 10% by 2030. Key sectors included fisheries, aquaculture, shipbuilding, coastal tourism, petrochemical industries, and marine biotechnology. Andhra Pradesh achieved the top rank in Ease of Doing Business in 2020, largely credited to streamlined port policies. JaganAnna's Blue Economy vision laid a strong foundation for unlocking Andhra Pradesh's coastal economic potential.`
      },
      {
        title: "Greenfield Ports",
        icon: <Anchor size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["Ramayapatnam Port", "Machilipatnam Port", "Mulapeta/Bhavanapadu", "Kakinada Gateway/SEZ"],
        description: `JaganAnna spearheaded the ambitious development of four new greenfield ports to unlock Andhra Pradesh's Blue Economy potential. With a 974 km coastline, he aimed to drive port-led growth, boost maritime trade, exports, and sectors like fisheries, aquaculture, shipbuilding, and coastal industries. The four ports — Machilipatnam in Krishna district, Ramayapatnam in Prakasam, Mulapeta in Srikakulam, and Kakinada Gateway SEZ in East Godavari — were planned with investments of ₹16,000–17,000 crore. These projects targeted an additional 100–145 million tonnes per annum cargo capacity, creating lakhs of direct and indirect jobs while decongesting Visakhapatnam port. JaganAnna personally laid foundation stones and initiated land acquisition, environmental clearances, and early construction works, aligning these projects with national Sagarmala initiatives for sustainable and inclusive coastal development throughout Andhra Pradesh.`
      },
      {
        title: "Fishing Harbours",
        icon: <Target size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["10 modern harbours", "Fish landing centres", "Support for fisher folk"],
        description: `JaganAnna spearheaded the ambitious development of four new greenfield ports to unlock Andhra Pradesh's vast Blue Economy potential. With a 974 km coastline — second longest in India — he aimed to drive port-led growth, boost maritime trade, exports, and sectors like fisheries, aquaculture, shipbuilding, and coastal industries. The four ports — Machilipatnam in Krishna district, Ramayapatnam in Prakasam, Mulapeta in Srikakulam, and Kakinada Gateway SEZ in East Godavari — were planned with investments of ₹16,000–17,000 crore. These projects targeted an additional 100–145 million tonnes per annum cargo capacity, creating lakhs of direct and indirect jobs while decongesting Visakhapatnam port. JaganAnna personally laid foundation stones and initiated land acquisition, environmental clearances, and early construction works, aligning these projects with national Sagarmala initiatives for sustainable and inclusive coastal development throughout Andhra Pradesh.`
      },
      {
        title: "Coastal Industrial Corridors",
        icon: <Globe size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["VCIC acceleration", "VK-PCPIR revival", "Coastal economic zones"],
        description: `JaganAnna prioritized sea-based industrial corridors and coastal initiatives as core elements of his Blue Economy vision. He accelerated the Visakhapatnam-Chennai Industrial Corridor and pushed rapid infrastructure development in coastal nodes like Nakkapalli, Atchutapuram, and Kakinada, focusing on petrochemicals, pharmaceuticals, food processing, and logistics parks. The VK-PCPIR project was revived and coastal economic zones were promoted around new ports, integrating industries with maritime infrastructure for export-oriented growth and large-scale job creation. Special Economic Zones along the coastline attracted domestic and global investors, strengthening Andhra Pradesh's position as a premier maritime industrial destination. These integrated coastal corridors ensured seamless connectivity between ports, highways, and rail networks, reducing logistics costs and improving export competitiveness. JaganAnna's sea-based industrial strategy transformed Andhra Pradesh's coastline into a powerful engine of sustainable economic growth and employment generation.`
      },
      {
        title: "Aquaculture & Fisheries Support",
        icon: <Ship size={18} />,
        image: "/pillar-images/Decentrilization.png",
        points: ["YSR Matsyakara Bharosa", "Diesel subsidy", "Aqua labs & hubs"],
        description: `JaganAnna strongly supported fishermen and aquaculture farmers as a vital part of his Blue Economy vision. The YSR Matsyakara Bharosa scheme provided ₹10,000 annual financial assistance to fishermen families, ensuring income stability and preventing distress migration. Additional support included diesel subsidies, low-cost power for aqua farmers, and enhanced ex-gratia and compensation schemes during natural calamities. The establishment of the Andhra Pradesh Aquaculture Development Authority, dedicated aqua labs, and aqua hubs significantly boosted production, quality standards, and marine exports. These institutions provided technical guidance, disease management support, and market linkages to thousands of aquaculture farmers. Cold storage facilities and processing units were strengthened to reduce post-harvest losses. These comprehensive measures prevented coastal migration, drove sustained fisheries growth, and positioned Andhra Pradesh as a leading marine exports state, empowering lakhs of fishing and aquaculture communities across the coastline.`
      }
    ]
  },

  12: {
    fullTitle: "Women Empowerment",
    subTitle: "Financial Security, Dignity & Safety",
    vision: "Placing women at the center of development, believing that their empowerment strengthens the entire family and state.",
    themeColor: "from-pink-800 to-pink-600",
    accentColor: "pink-600",
    accentHex: "#db2777",
    impactPoints: ["Financial Power", "Social Dignity", "Safety Security", "Decision Making", "Health Access", "Girl Education", "SHG Strength", "Legal Justice"],
    sections: [
      {
        title: "Vision",
        icon: <Users size={18} />,
        image: "/pillar-images/Woman.png",
        points: ["Women-centric governance", "Navaratnalu welfare focus", "Leadership & inclusion"],
        description: `Jagan Anna made women empowerment the cornerstone of his governance in Andhra Pradesh (2019-2024). He believed that empowering women leads to stronger families and a prosperous society. Under the Navaratnalu framework, over 90% of welfare benefits were directed towards women through innovative schemes like YSR Cheyutha, YSR Aasara, YSR Sunna Vaddi, and Amma Vodi. His administration implemented more than 32 dedicated schemes for women’s progress, including zero-interest loans for Self-Help Groups (SHGs), direct cash transfers, skill training, and entrepreneurship support. Jagan pioneered 50% reservation for women in nominated posts, ensuring their presence in leadership roles across local bodies, corporations, and party structures. This vision focused on economic independence, political inclusion, education, and asset ownership, aiming to create self-reliant, secure, and empowered women across all castes and regions.`
      },
      {
        title: "Economic Independence",
        icon: <Coins size={18} />,
        image: "/pillar-images/Woman.png",
        points: ["YSR Aasara & Cheyutha", "Zero-interest SHG loans", "Market linkages & MoUs"],
        description: `JaganAnna placed economic empowerment at the forefront, enabling lakhs of women to earn, save, and control their finances across Andhra Pradesh. The flagship YSR Aasara scheme waived outstanding SHG loans with high recovery rates, freeing women from devastating debt traps. YSR Cheyutha provided ₹75,000 over four years to 23 lakh women, supporting self-employment through MoUs with companies like ITC, Amul, and HUL for training and market access. YSR Sunna Vaddi offered zero-interest loans to SHGs, while other targeted schemes extended support for diverse business ventures. Over ₹1.18 lakh crore in direct financial assistance reached women beneficiaries, transforming them into confident entrepreneurs and empowered household decision-makers. These initiatives strengthened women's financial independence, enhanced their social status, and created a powerful ecosystem of grassroots economic empowerment throughout Andhra Pradesh.`
      },
      {
        title: "Reservation & Leadership",
        icon: <ShieldCheck size={18} />,
        image: "/pillar-images/Woman.png",
        points: ["50% reservation in nominated posts", "Women in high offices", "Party & institutional inclusion"],
        description: `JaganAnna took bold and transformative steps to strengthen women's political and institutional representation, recognizing gender equality as central to democratic governance. His government enacted 50% reservation for women in all nominated posts, a pioneering reform that went beyond prevailing national norms and set a new benchmark for inclusive leadership. This legislative move ensured women were not merely symbolic participants but active decision-makers in governance structures. Women were systematically encouraged to assume leadership roles across panchayats, municipalities, municipal corporations, and party organizations, creating pathways for grassroots-to-state-level political participation. Capacity-building, administrative exposure, and institutional backing helped women overcome long-standing social and structural barriers. Women gained greater visibility, authority, and confidence in public life. These measures deepened democratic representation, strengthened local governance, and institutionalized women's leadership as a permanent and integral feature of Andhra Pradesh's political ecosystem.`
      },
      {
        title: "Education & Skills",
        icon: <GraduationCap size={18} />,
        image: "/pillar-images/Woman.png",
        points: ["Amma Vodi support", "Vidya & Vasathi Deevena", "Skill hubs & Bhavita programs"],
        description: `JaganAnna made education and skill development a central pillar of his women's empowerment vision, recognizing education as the most powerful tool for long-term social and economic transformation. The Amma Vodi scheme provided ₹15,000 annually to mothers of school-going children, directly incentivizing education and significantly reducing dropout rates, especially among girls from disadvantaged families. Vidya Deevena and Vasathi Deevena ensured full reimbursement of tuition fees and hostel expenses, with funds credited directly to mothers' bank accounts, reinforcing financial control and dignity. Targeted skill development initiatives including Bhavita programs and constituency-level skill hubs equipped women and young girls with industry-relevant skills. These programs were aligned with industry partnerships, entrepreneurship opportunities, and local employment needs. Together, these interventions expanded access to education, enhanced employability, promoted economic independence, and positioned women as active contributors to Andhra Pradesh's growth story.`
      },
      {
        title: "Housing Ownership",
        icon: <Map size={18} />,
        image: "/pillar-images/Woman.png",
        points: ["House pattas in women’s name", "Pucca houses for poor women", "Generational asset creation"],
        description: `Under the Pedalandariki Illu program, the government led by JaganAnna implemented one of the largest housing and asset-creation initiatives in the country, with a strong emphasis on women’s empowerment. The scheme ensured the distribution of house-site pattas and the construction of pakka houses, with legal ownership registered exclusively in women’s names across Andhra Pradesh. As a result, over 25 lakh houses were constructed and 31.19 lakh house-site pattas were allotted to women beneficiaries, creating long-term security and intergenerational wealth for economically weaker households. Ownership rights strengthened women’s social standing, financial independence, and bargaining power within families and communities. Beyond shelter, the initiative provided access to basic infrastructure such as roads, water supply, sanitation, and electricity in new housing layouts. By guaranteeing legal ownership and permanent assets, Pedalandariki Illu offered a robust safety net, dignity, and stability to millions of marginalized women and families statewide.`
      }
    ],
    tabs: [
      { id: 'Overview', title: 'Overview', icon: <Users size={18} />, image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg", points: ["Household dignity focus", "Safety as top priority", "Economic independence drive"] },
      { id: 'Economics', title: 'Financial Aid', icon: <Coins size={18} />, image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg", detailStatement: "YSR Asara & Cheyutha.", metrics: [{label: "Cheyutha", value: "₹75,000"}, {label: "Asara", value: "Zero Debt"}], points: ["SHG loan burdens cleared", "Support for women 45-60", "Direct bank transfers"] },
      { id: 'Livelihoods', title: 'New Income', icon: <Briefcase size={18} />, image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg", detailStatement: "Dairy & Livestock units.", metrics: [{label: "Dairy Units", value: "4.6 Lakh"}, {label: "Paala Velluva", value: "Active"}], points: ["Free cows and buffaloes", "Sheep and goat distribution", "Collection centers for milk"] },
      { id: 'Safety', title: 'Disha Safety', icon: <ShieldCheck size={18} />, image: "/pillar-images/151325803_3847299201957185_2939687180828012790_n.jpg", detailStatement: "Response in 10 minutes.", metrics: [{label: "Disha Apps", value: "1.1 Cr"}, {label: "Stations", value: "Dedicated"}], points: ["Zero tolerance for crimes", "Disha police stations", "Special courts for fast trials"] }
    ]
  },



  



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
      <div className="relative h-[50vh] w-full overflow-hidden">
        <img
          src={'/Pillarbackground.jpeg'}
          alt="background"
          className="absolute inset-0 w-full h-full object-cover opacity-100 z-0"
        />
        <div className={`absolute inset-0 w-full h-full bg-gradient-to-br ${details.themeColor} opacity-50 z-10`}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-20"></div>

        <div className="absolute inset-0 flex flex-col justify-end px-4 md:px-12 pb-10 z-30">
           <div className="w-full">
              <button 
                onClick={onBack}
                className="flex items-center gap-2 text-white/90 hover:text-white font-black mb-6 transition-all uppercase text-[10px] tracking-widest bg-white/10 backdrop-blur-md px-4 py-2 rounded-full w-fit border border-white/20"
              >
                <ArrowLeft size={14} /> Back to Home
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
         <div className="px-3 sm:px-4 md:px-8 lg:px-12">
            <div className="space-y-6">
                
                {/* Section 1: The 3-Part Layout */}
                <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-[3rem] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] border border-gray-100 min-h-[600px]">
                  
                  {/* Part A: Navigation Panel (18% width) */}
                  <div className="w-full lg:w-[20%] bg-gray-50/50 p-4 sm:p-6 lg:p-8 border-r border-gray-100 flex flex-col gap-2 shrink-0 z-20 relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-ysrcp-blue/5"></div>
                        {/* Navigation header removed per design: hide 'Navigation' and 'Operational Focus' labels */}
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
                  <div className="w-full lg:w-[100%] flex flex-col md:flex-row items-stretch animate-fade-in relative z-10 overflow-hidden">
                      {currentItem && (
                        <div className="w-full lg:w-[80%] p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col items-start bg-white border-r border-gray-100 relative overflow-hidden">
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

                            {/* Show detailStatement only (vision quotes removed). */}
                            {details.tabs && (currentItem as PillarTab).detailStatement && (
                              <div className="mb-8 p-6 bg-ysrcp-green/5 rounded-[1.25rem] border-l-8 border-ysrcp-green shadow-sm w-full">
                                  <p className="text-gray-800 font-bold italic text-sm lg:text-base leading-relaxed">
                                    "{(currentItem as PillarTab).detailStatement}"
                                  </p>
                              </div>
                            )}

                            {/* Section description (full paragraphs) shown when available */}
                            {(currentItem as PillarTab)?.description ? (
                              <div className="mb-6">
                                <div className="p-6 rounded-2xl bg-white border-2 shadow-sm text-gray-800 leading-relaxed" style={{ borderColor: details.accentHex }}>
                                  {(currentItem as PillarTab).description!.split('\n\n').map((p: string, i: number) => (
                                    <p key={i} className="mb-4 text-justify" style={{ textAlign: 'justify' }}>{p}</p>
                                  ))}
                                </div>
                              </div>
                            ) : null}

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
                        <div className="w-full lg:w-[36%] relative overflow-hidden flex items-stretch self-stretch">
                            <img
                              key={activeItemId}
                              src={currentItem.image}
                              alt={(currentItem as PillarTab).title || (currentItem as PillarSection).title}
                              className="w-full h-full object-cover transition-all duration-700 animate-fade-in"
                            />
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
                                    <div key={idx} className={`flex items-center gap-2 leading-none group transition-all ${idx < 4 ? 'text-[13px] font-black text-ysrcp-blue' : 'text-[11px] font-bold text-gray-500 hover:text-ysrcp-blue'}`}>
                                        <div className={`rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-sm ${idx < 4 ? 'w-2.5 h-2.5 bg-ysrcp-blue' : 'w-1.5 h-1.5 bg-ysrcp-green'}`}></div>
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
                                    <div key={idx} className={`flex items-center gap-2 leading-none group transition-all ${idx < 4 ? 'text-[13px] font-black' : 'text-[11px] font-bold text-gray-500 hover:text-ysrcp-blue'}`} style={idx < 4 ? { color: details.accentHex } : {}}>
                                        <div className={`rounded-full shrink-0 group-hover:scale-125 transition-transform shadow-sm ${idx < 4 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5 bg-ysrcp-green'}`} style={idx < 4 ? { backgroundColor: details.accentHex } : {}}></div>
                                        <span className="truncate">{point}</span>
                                    </div>
                                ))}
                            </div>
                          </div>
                      </div>
                    </div>

                    {/* Colorful 6-card impact grid removed per request - keep only the small Impact Analysis strip above */}
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
