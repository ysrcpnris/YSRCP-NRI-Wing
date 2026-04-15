import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';




import { countriesData } from '../lib/countryCodes';
const getPasswordError = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Must include at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Must include at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Must include at least one number";
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    return "Must include at least one special character";
  return null;
};


export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [passwordError, setPasswordError] = useState<string | null>(null);

 const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '+91',
    whatsapp_number: '',
    email: '',
    password: '',
    country_of_residence: '',
    state_abroad: '',
    city_abroad: '',
    indian_state: '',
    district: '',
    assembly_constituency: '',
    mandal: '',
    village: '',
    gender: '',
    dob: '',
    profession: '',
    organization: '',
    role_designation: '',
    contribution: '',
    participate_campaign: '',
    suggestions: '',
    instagram_id: '',
    facebook_id: '',
    twitter_id: '',
    linkedin_id: '',
    // referred_by: '',
  });

  const countryCodes = countriesData.map(country => ({
    name: country.name,
    code: '+' + country.code
  }));

  // Close country dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setShowCountryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Expected national number lengths (approximate) for validation (digits after country code)
  const phoneLengths: Record<string, number> = {
    '+91': 10,
    '+1': 10,
    '+44': 10,
    '+61': 9,
    '+971': 9,
    '+966': 9,
    '+65': 8,
    '+81': 10,
    '+82': 9,
    '+353': 9,
    '+60': 9,
    '+852': 8,
    '+886': 9,
    '+86': 11,
    '+92': 10,
    '+880': 10,
    '+94': 9,
    '+358': 9,
    '+420': 9,
  };

  const professions = ['Job', 'Business', 'Student'];

  // Helper function to get country code from country name
  // Helper function to get country code from country name
  const getCountryCode = (countryName: string): string => {
    const found = countryCodes.find(cc => cc.name === countryName);
    return found ? found.code.replace('+', '') : '91'; // default to India, return without +
  };

  const getCountryCodeFromCountryName = (countryName: string): string => {
    const found = countryCodes.find(cc => cc.name === countryName);
    return found ? found.code : '+91'; // default to India
  };

  // Helper function to extract current country code from mobile number
  const getCurrentCountryCode = (): string => {
    // Sort by code length descending to match longer codes first (e.g., +880 before +1)
    const sortedCodes = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
    for (const cc of sortedCodes) {
      if (formData.mobile_number.startsWith(cc.code)) {
        return cc.code;
      }
    }
    return '+91'; // default
  };

  const countryData: Record<string, { name: string; cities: string[] }[]> = {
    USA: [
      { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'] },
      { name: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio'] },
      { name: 'Florida', cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'] },
      { name: 'New York', cities: ['New York City', 'Buffalo', 'Rochester', 'Albany'] },
      { name: 'Illinois', cities: ['Chicago', 'Springfield', 'Peoria', 'Naperville'] },
    ],
    UK: [
      { name: 'England', cities: ['London', 'Manchester', 'Liverpool', 'Birmingham', 'Leeds'] },
      { name: 'Scotland', cities: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'] },
      { name: 'Wales', cities: ['Cardiff', 'Swansea', 'Newport', 'Wrexham'] },
      { name: 'Northern Ireland', cities: ['Belfast', 'Londonderry', 'Lisburn', 'Newry'] },
    ],
    Canada: [
      { name: 'Ontario', cities: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London'] },
      { name: 'British Columbia', cities: ['Vancouver', 'Victoria', 'Kelowna', 'Surrey'] },
      { name: 'Quebec', cities: ['Montreal', 'Quebec City', 'Laval', 'Gatineau'] },
      { name: 'Alberta', cities: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'] },
    ],
    Australia: [
      { name: 'New South Wales', cities: ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta'] },
      { name: 'Victoria', cities: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'] },
      { name: 'Queensland', cities: ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville'] },
      { name: 'Western Australia', cities: ['Perth', 'Fremantle', 'Joondalup', 'Albany'] },
    ],
    Germany: [
      { name: 'Bavaria', cities: ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'] },
      { name: 'Berlin', cities: ['Berlin'] },
      { name: 'North Rhine-Westphalia', cities: ['Cologne', 'Düsseldorf', 'Dortmund', 'Bonn'] },
      { name: 'Hesse', cities: ['Frankfurt', 'Wiesbaden', 'Kassel'] },
    ],
    UAE: [
      { name: 'Dubai', cities: ['Dubai City', 'Jumeirah', 'Deira', 'Bur Dubai'] },
      { name: 'Abu Dhabi', cities: ['Abu Dhabi City', 'Al Ain', 'Mussafah'] },
      { name: 'Sharjah', cities: ['Sharjah City', 'Al Nahda', 'Khor Fakkan'] },
      { name: 'Ajman', cities: ['Ajman City', 'Al Jurf'] },
    ],
    Singapore: [
      { name: 'Central Region', cities: ['Singapore City', 'Marina Bay', 'Bukit Merah'] },
      { name: 'East Region', cities: ['Tampines', 'Bedok', 'Pasir Ris'] },
      { name: 'North Region', cities: ['Woodlands', 'Yishun', 'Sembawang'] },
    ],
    Malaysia: [
      { name: 'Selangor', cities: ['Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Klang'] },
      { name: 'Penang', cities: ['George Town', 'Bayan Lepas', 'Butterworth'] },
      { name: 'Kuala Lumpur', cities: ['Kuala Lumpur City', 'Ampang', 'Setapak'] },
      { name: 'Johor', cities: ['Johor Bahru', 'Batu Pahat', 'Muar'] },
    ],
    NewZealand: [
      { name: 'Auckland', cities: ['Auckland City', 'Manukau', 'Waitakere'] },
      { name: 'Wellington', cities: ['Wellington City', 'Lower Hutt', 'Porirua'] },
      { name: 'Canterbury', cities: ['Christchurch', 'Timaru', 'Ashburton'] },
      { name: 'Otago', cities: ['Dunedin', 'Queenstown', 'Oamaru'] },
    ],
    Netherlands: [
      { name: 'North Holland', cities: ['Amsterdam', 'Haarlem', 'Hilversum'] },
      { name: 'South Holland', cities: ['Rotterdam', 'The Hague', 'Leiden', 'Delft'] },
      { name: 'Utrecht', cities: ['Utrecht City', 'Amersfoort', 'Nieuwegein'] },
      { name: 'Gelderland', cities: ['Nijmegen', 'Arnhem', 'Apeldoorn'] },
    ],
  };

    // Indian States → Districts → Assembly Constituencies → Mandals
  const indianAddressData: Record<
    string,
    {
      name: string;
      constituencies: {
        name: string;
        mandals: string[];
      }[];
    }[]
  > = {
    "Andhra Pradesh": [
      {
        name: "Prakasam",
        constituencies: [
          {
            name: "Yerragondapalem",
            mandals: ["Dornala", "Peddaraveedu", "Pullalacheruvu", "Tripuranthakam", "Yerragondapalem"],
          },
          {
            name: "Ongole",
            mandals: ["Ongole MC Ongole", "Kothapatnam", "Ongole"],
          },
          {
            name: "Santhanuthalapadu",
            mandals: ["Ongole MC SNPADU", "Chimakurthi", "Maddipadu", "Naguluppala Padu", "Santhanuthalapadu", "Chimakurthy (NP)"],
          },
          {
            name: "Markapuram",
            mandals: ["Konakanamitla", "Markapuram", "Podili", "Tarlupadu", "Markapur Municipality", "Podili (NP)"],
          },
          {
            name: "Kanigiri",
            mandals: ["Chandra Sekhara Puram", "Hanumanthunipadu", "Kanigiri", "Pamur", "Pedacherlo Palle", "Veligandla", "Kanigiri (NP)"],
          },
          {
            name: "Giddalur",
            mandals: ["Ardhaveedu", "Bestavaripeta", "Cumbum", "Giddalur", "Komarolu", "Racherla", "Giddalur (NP)"],
          },
          {
            name: "Kondapi",
            mandals: ["Kondapi", "Marripudi", "Ponnaluru", "Singarayakonda", "Tangutur", "Zarugumalli"],
          },
          {
            name: "Darsi",
            mandals: ["Darsi", "Donakonda", "Kurichedu", "Mundlamuru", "Tallur", "Darsi (NP)"],
          },
        ],
      },
      {
        name: "Kurnool",
        constituencies: [
          {
            name: "Yemmiganur",
            mandals: ["Gonegandla", "Nandavaram", "Yemmiganur", "Yemmiganur Municipality"],
          },
          {
            name: "Kurnool",
            mandals: ["Kurnool MC Kurnool"],
          },
          {
            name: "Adoni",
            mandals: ["Adoni", "Adoni Municipality"],
          },
          {
            name: "Nandikotkur",
            mandals: ["Jupadu Bungalow", "Kothapalle", "Midthur", "Nandikotkur", "Pagidyala", "Pamulapadu", "Nandikotkur Municipality"],
          },
          {
            name: "Panyam",
            mandals: ["Gadivemula", "Orvakal", "Panyam"],
          },
          {
            name: "Kodumur",
            mandals: ["Kurnool MC Kodumuru", "Kurnool MC Koduru", "Guduru", "C.Belagal", "Kodumur", "Guduru Municipality"],
          },
          {
            name: "Pattikonda",
            mandals: ["Krishnagiri", "Maddikera East", "Pattikonda", "Tuggali", "Veldurthi"],
          },
          {
            name: "Mantralayam",
            mandals: ["Kosigi", "Kowthalam", "Mantralayam", "Peddakadubur"],
          },
          {
            name: "aluru",
            mandals: ["Alur", "Aspari", "Chippagiri", "Devanakonda", "Halaharvi", "Holagunda"],
          },
        ],
      },
      {
        name: "Anakapalle",
        constituencies: [
          {
            name: "Yelamanchili",
            mandals: ["Atchutapuram", "Munagapaka", "Rambilli", "Yelamanchili", "Yelamanchili Municipality"],
          },
          {
            name: "Narsipatnam",
            mandals: ["Golugonda", "Makavarapalem", "Nathavaram", "Narsipatnam", "Narsipatnam Municipality"],
          },
          {
            name: "Anakapalle",
            mandals: ["Anakapalle", "Kasimkota", "GVMC (anakapalli)"],
          },
          {
            name: "Madugula",
            mandals: ["Cheedikada", "Devarapalle Ank", "K.Kotapadu", "Madugula"],
          },
          {
            name: "Pendurthi (P)",
            mandals: ["Paravada", "Pendurthi", "Sabbavaram", "GVMC (pendurthi)", "GVMC Pendurthi"],
          },
          {
            name: "Payakaraopeta",
            mandals: ["Kotauratla", "Nakkapalle", "Payakaraopeta", "S.Rayavaram"],
          },
          {
            name: "Chodavaram",
            mandals: ["Rolugunta", "Chodavaram", "Butchayyapeta", "Ravikamatham"],
          },
        ],
      },
      {
        name: "Vizianagaram",
        constituencies: [
          {
            name: "Vizianagaram",
            mandals: ["Vizianagaram"],
          },
          {
            name: "Srungavarapukota",
            mandals: ["Jami", "Kothavalasa", "Lakkavarapukota", "Srungavarapukota", "Vepada"],
          },
          {
            name: "Rajam",
            mandals: ["Rajam", "Regidi Amadalavalasa", "Santhakaviti", "Vangara", "Rajam Municipality"],
          },
          {
            name: "Nellimarla",
            mandals: ["Bhogapuram", "Denkada", "Nellimarla", "Pusapatirega", "Nellimarla (NP)"],
          },
          {
            name: "Bobbili",
            mandals: ["Badangi", "Bobbili", "Ramabhadrapuram", "Therlam", "Bobbili Municipality"],
          },
          {
            name: "Cheepurupalli",
            mandals: ["Cheepurupalli", "Garividi", "Gurla", "Merakamudidam"],
          },
          {
            name: "Gajapathinagaram",
            mandals: ["Bondapalle", "Dattirajeru", "Gajapathinagaram", "Gantyada"],
          },
        ],
      },
      {
        name: "Visakhapatnam",
        constituencies: [
          {
            name: "Visakhapatnam West",
            mandals: ["GVMC West"],
          },
          {
            name: "Visakhapatnam South",
            mandals: ["GVMC south"],
          },
          {
            name: "Visakhapatnam North",
            mandals: ["GVMC North"],
          },
          {
            name: "Visakhapatnam East",
            mandals: ["GVMC EAST"],
          },
          {
            name: "Gajuwaka",
            mandals: ["GVMC Gajuwaka"],
          },
          {
            name: "Bhimili",
            mandals: ["GVMC (Bhimilli)", "Anandapuram", "Bheemunipatnam", "Padmanabham"],
          },
        ],
      },
      {
        name: "Palnadu",
        constituencies: [
          {
            name: "Vinukonda",
            mandals: ["Bollapalle", "Ipur", "Nuzendla", "Savalyapuram", "Vinukonda", "Vinukonda Municipality"],
          },
          {
            name: "Narasaraopeta",
            mandals: ["Narasaraopet", "Rompicherla N", "Narasaraopeta Municipality"],
          },
          {
            name: "Sattenapalli",
            mandals: ["Muppalla", "Nekarikallu", "Rajupalem", "Sattenapalli", "Sattenapalli Municipality"],
          },
          {
            name: "Pedakurapadu",
            mandals: ["Amaravathi", "Atchampet", "Bellamkonda", "Krosuru", "Pedakurapadu"],
          },
          {
            name: "Macherla",
            mandals: ["Durgi", "Karempudi", "Macherla", "Rentachintala", "Veldurthie", "Macherla Municipality"],
          },
          {
            name: "Gurajala",
            mandals: ["Dachepalle", "Gurajala", "Machavaram", "Piduguralla", "Dachepalli (NP)", "Gurajala (NP)", "Piduguralla Municipality"],
          },
          {
            name: "Chilakaluripeta",
            mandals: ["Chilakaluripet", "Edlapadu", "Nadendla", "Chilakaluripet Municipality"],
          },
        ],
      },
      {
        name: "NTR",
        constituencies: [
          {
            name: "Vijayawada West",
            mandals: ["Viajayawada MC West"],
          },
          {
            name: "Vijayawada East",
            mandals: ["Vijayawada MC East"],
          },
          {
            name: "Vijayawada Central",
            mandals: ["Vijayawada MC central"],
          },
          {
            name: "Tiruvuru",
            mandals: ["A.Konduru", "Gampalagudem", "Tiruvuru", "Vissannapet", "Tiruvuru (NP)"],
          },
          {
            name: "Nandigama",
            mandals: ["Chandarlapadu", "Kanchikacherla", "Nandigama", "Veerullapadu", "Nandigama (NP)"],
          },
          {
            name: "Jaggayyapeta",
            mandals: ["Jaggayyapeta", "Penuganchiprolu", "Vatsavai", "Jaggayyapeta Municipality"],
          },
          {
            name: "Mylavaram",
            mandals: ["G.Konduru", "Ibrahimpatnam", "Mylavaram", "Reddigudem", "Vijayawada (Rural) M", "Kondapalli Municipality"],
          },
        ],
      },
      {
        name: "SPS Nellore",
        constituencies: [
          {
            name: "Venkatagiri (P)",
            mandals: ["Balayapalle", "Dakkili", "Venkatagiri", "Venkatagiri Municipality", "Kaluvoya", "Rapur", "Sydapuram"],
          },
          {
            name: "Udayagiri",
            mandals: ["Duttalur", "Jaladanki", "Kaligiri", "Kondapuram", "Seetharamapuram", "Udayagiri", "Varikuntapadu", "Vinjamur"],
          },
          {
            name: "Nellore Rural",
            mandals: ["Nellore MC Rural", "Nellore Rural"],
          },
          {
            name: "Nellore City",
            mandals: ["Nellore MC City"],
          },
          {
            name: "Sullurpeta",
            mandals: ["Doravarisatram", "Naidupeta", "Ozili", "Pellakuru", "Sullurpeta", "Tada", "Naidupeta Municipality", "Sullurpet Municipality"],
          },
          {
            name: "Sarvepalli",
            mandals: ["Manubolu", "Muthukur", "Podalakur", "Thotapalligudur", "Venkatachalam"],
          },
          {
            name: "Kandukur",
            mandals: ["Gudluru", "Kandukur", "Lingasamudram", "Ulavapadu", "Voletivaripalem", "Kandukur Municipality"],
          },
          {
            name: "Kavali",
            mandals: ["Allur", "Bogole", "Dagadarthi", "Kavali", "Alluru (NP)", "Kavali Municipality"],
          },
          {
            name: "Gudur",
            mandals: ["Gudur", "Gudur Municipality", "Chillakur", "Chittamur", "Kota", "Vakadu"],
          },
          {
            name: "Atmakur",
            mandals: ["Ananthasagaram", "Anumasamudrampeta", "Atmakur", "Chejerla", "Marripadu", "Sangam", "Atmakur Municipality"],
          },
          {
            name: "Kovur",
            mandals: ["Buchireddipalem", "Indukurpet", "Kodavalur", "Kovur", "Vidavalur", "Buchireddypalem (NP)"],
          },
        ],
      },
      {
        name: "Bapatla",
        constituencies: [
          {
            name: "Vemuru",
            mandals: ["Amruthalur", "Bhattiprolu", "Kollur", "Tsundur", "Vemuru"],
          },
          {
            name: "Repalle",
            mandals: ["Cherukupalle", "Nagaram", "Nizampatnam", "Repalle", "Repalle Municipality"],
          },
          {
            name: "Parchuru",
            mandals: ["Chinaganjam", "Inkollu", "Karamchedu", "Martur", "Parchur", "Yaddanapudi"],
          },
          {
            name: "Chirala",
            mandals: ["Chirala", "Vetapalem", "Chirala Municipality"],
          },
          {
            name: "Bapatla",
            mandals: ["Bapatla", "Karlapalem", "Pittalavanipalem", "Bapatla Municipality"],
          },
          {
            name: "Addanki",
            mandals: ["Addanki", "Ballikurava", "Janakavarampanguluru", "Korisapadu", "Santhamaguluru", "Addanki (NP)"],
          },
        ],
      },
      {
        name: "Ananthapuramu",
        constituencies: [
          {
            name: "Uravakonda",
            mandals: ["Beluguppa", "Kudair", "Uravakonda", "Vajrakarur", "Vidapanakal"],
          },
          {
            name: "Tadipatri",
            mandals: ["Peddapappur", "Peddavadugur", "Tadipatri", "Yadiki", "Tadipatri Municipality"],
          },
          {
            name: "Singanamala",
            mandals: ["Bukkarayasamudram", "Garladinne", "Narpala", "Putlur", "Singanamala", "Yellanur"],
          },
          {
            name: "Rayadurg",
            mandals: ["Bommanahal", "D.Hirehal", "Gummagatta", "Kanekal", "Rayadurg", "Rayadurg Municipality"],
          },
          {
            name: "Gunthakal",
            mandals: ["Gooty", "Guntakal", "Pamidi", "Gooty Municipality", "Guntakal Municipality", "Pamidi (NP)"],
          },
          {
            name: "Kalyandurg",
            mandals: ["Brahmasamudram", "Kalyandurg", "Kambadur", "Kundurpi", "Settur", "Kalyanadurgam Municipality"],
          },
          {
            name: "Ananthapur Urban",
            mandals: ["Anantapur MC", "Anantapur (Rural)"],
          },
        ],
      },
      {
        name: "Eluru",
        constituencies: [
          {
            name: "Unguturu",
            mandals: ["Bhimadole", "Ganapavaram", "Nidamarru", "Unguturu"],
          },
          {
            name: "Nuzivid",
            mandals: ["Agiripalle", "Chatrai", "Musunuru", "Nuzvid", "Nuzividu Municipality"],
          },
          {
            name: "Kaikalur",
            mandals: ["Kaikalur", "Kalidindi", "Mandavalli", "Mudinepalle"],
          },
          {
            name: "Polavaram",
            mandals: ["Buttayagudem", "Jeelugumilli", "Koyyalagudem", "Kukunoor", "Polavaram", "T.Narasapuram", "Velairpadu"],
          },
          {
            name: "Chinthalapudi",
            mandals: ["Chintalapudi", "Jangareddigudem", "Kamavarapukota", "Lingapalem", "Jangareddygudem Municipality", "Chinthalapudi (NP)"],
          },
          {
            name: "Denduluru",
            mandals: ["Denduluru", "Eluru", "Pedapadu", "Pedavegi"],
          },
          {
            name: "Eluru",
            mandals: ["Eluru MC"],
          },
        ],
      },
      {
        name: "West Godavari",
        constituencies: [
          {
            name: "Undi",
            mandals: ["Akividu", "Kalla", "Palacoderu", "Undi", "Akivedu (NP)"],
          },
          {
            name: "Tanuku",
            mandals: ["Attili", "Iragavaram", "Tanuku", "Tanuku Municipality"],
          },
          {
            name: "Tadepalligudem",
            mandals: ["Pentapadu", "Tadepalligudem", "Tadepalligudem Municipality"],
          },
          {
            name: "Narasapuram",
            mandals: ["Mogalthur", "Narasapuram", "Narasapur Municipality"],
          },
          {
            name: "Palacole",
            mandals: ["Poduru Palacole", "Elamanchili", "Palacole", "Palacole Municipality"],
          },
          {
            name: "Bhimavaram",
            mandals: ["Bhimavaram", "Veeravasaram", "Bhimavaram Municipality"],
          },
          {
            name: "Achanta",
            mandals: ["Achanta", "Penugonda", "Penumantra", "Poduru"],
          },
        ],
      },
      {
        name: "Kakinada",
        constituencies: [
          {
            name: "Tuni",
            mandals: ["Kotananduru", "Thondangi", "Tuni", "Tuni Municipality"],
          },
          {
            name: "Prathipadu",
            mandals: ["Prathipadu", "Rowthulapudi", "Sankhavaram", "Yeleswaram", "Yeleswaram (NP)"],
          },
          {
            name: "Pithapuram",
            mandals: ["Gollaprolu", "Pithapuram", "U. Kothapalli", "Gollaprollu (NP)", "Pithapuram Municipality"],
          },
          {
            name: "Peddapuram",
            mandals: ["Peddapuram", "Samalkota", "Peddapuram Municipality", "Samalkot Municipality"],
          },
          {
            name: "Kakinada Rural",
            mandals: ["Kakinada MC Rural", "Kakinada Rural", "Karapa"],
          },
          {
            name: "Kakinada City",
            mandals: ["Kakinada MC City"],
          },
          {
            name: "Jaggampeta (P)",
            mandals: ["Gandepalle", "Jaggampeta", "Kirlampudi"],
          },
        ],
      },
      {
        name: "East Godavari",
        constituencies: [
          {
            name: "Rajanagaram",
            mandals: ["Korukonda", "Rajanagaram", "Seethanagaram"],
          },
          {
            name: "Rajahmundry Rural",
            mandals: ["Kadiam", "Rajahmundry Rural", "Rajahmundry MC Rural"],
          },
          {
            name: "Rajahmundry City",
            mandals: ["Rajahmundry MC City"],
          },
          {
            name: "Nidadavole",
            mandals: ["Nidadavole", "Peravali", "Undrajavaram", "Nidadavole Municipality"],
          },
          {
            name: "Gopalapuram (P)",
            mandals: ["Dwarakatirumala", "Devarapalle", "Gopalapuram", "Nallajerla"],
          },
          {
            name: "Anaparthi (P)",
            mandals: ["Pedapudi", "Anaparthi", "Biccavolu", "Rangampeta"],
          },
          {
            name: "Kovvur",
            mandals: ["Chagallu", "Kovvur", "Tallapudi", "Kovvur Municipality"],
          },
        ],
      },
      {
        name: "Guntur",
        constituencies: [
          {
            name: "Guntur West",
            mandals: ["GMC West"],
          },
          {
            name: "Guntur East",
            mandals: ["GMC EAST"],
          },
          {
            name: "Mangalagiri",
            mandals: ["Duggirala", "Tadepalle", "Mangalagiri", "MTMC"],
          },
          {
            name: "Tenali",
            mandals: ["Tenali", "Kollipara", "Tenali Municipality"],
          },
          {
            name: "Sattenapalli",
            mandals: ["Muppalla", "Nekarikallu", "Rajupalem", "Sattenapalli", "Sattenapalli Municipality"],
          },
          {
            name: "Tadikonda",
            mandals: ["Medikonduru", "Phirangipuram", "Tadikonda", "Thullur"],
          },
          {
            name: "Prathipadu (SC)",
            mandals: ["GMC Prathipadu", "Guntur", "Kakumanu", "Pedanandipadu", "Prathipadu (SC)", "Vatticherukuru"],
          },
          {
            name: "Ponnur",
            mandals: ["Chebrolu", "Pedakakani", "Ponnur", "Ponnur Municipality"],
          },
        ],
      },
      {
        name: "Krishna",
        constituencies: [
          {
            name: "Penamaluru",
            mandals: ["Kankipadu", "Penamaluru", "Vuyyuru", "YSR Tadigadapa Municipality", "Vuyyuru (NP)"],
          },
          {
            name: "Pedana",
            mandals: ["Bantumilli", "Gudurru", "Kruthivennu", "Pedana", "Pedana Municipality"],
          },
          {
            name: "Pamarru",
            mandals: ["Movva", "Pamarru", "Pamidimukkala", "Pedaparupudi", "Thotlavalluru"],
          },
          {
            name: "Gudivada",
            mandals: ["Gudivada", "Gudlavalleru", "Nandivada", "Gudivada Municipality"],
          },
          {
            name: "Gannavaram",
            mandals: ["Bapulapadu", "Gannavaram", "Vijayawada (Rural) G"],
          },
          {
            name: "Machilipatnam",
            mandals: ["Machilipatnam MC", "Machilipatnam"],
          },
          {
            name: "Avanigadda",
            mandals: ["Avanigadda", "Challapalli", "Ghantasala", "Koduru", "Mopidevi", "Nagayalanka"],
          },
        ],
      },
      {
        name: "Tirupati",
        constituencies: [
          {
            name: "Tirupati",
            mandals: ["Tirupati MC (Tirupati)"],
          },
          {
            name: "Srikalahasti",
            mandals: ["Renigunta", "Srikalahasthi", "Thottambedu", "Yerpedu", "Srikalahasti Municipality"],
          },
          {
            name: "Satyavedu",
            mandals: ["Buchinaidu Kandriga", "K.V.B.Puram", "Nagalapuram", "Narayanavanam", "Pichatur", "Satyavedu", "Varadaiahpalem"],
          },
          {
            name: "Chandragiri",
            mandals: ["Chandragiri", "Chinnagottigallu", "Pakala", "Rama chandrapuram", "Tirupati Rural", "Yerravaripalem"],
          },
        ],
      },
      {
        name: "Annamaya",
        constituencies: [
          {
            name: "Thamballapalle",
            mandals: ["B.Kothakota", "Kurabalakota", "Mulakalacheruvu", "Peddamandyam", "Peddatippasamudram", "Thamballapalle", "B.Kothakota (NP)"],
          },
          {
            name: "Rayachoty",
            mandals: ["Chinnamandem", "Galiveedu", "Lakkireddipalle", "Ramapuram", "Rayachoti", "Sambepalle", "Rayachoty Municipality"],
          },
          {
            name: "Rajampeta (P)",
            mandals: ["Vontimitta", "Nandalur", "Rajampet", "T Sundupalle", "Veeraballe", "Rajampeta Municipality"],
          },
          {
            name: "Railway Kodur",
            mandals: ["Chitvel", "Obulavaripalle", "Penagalur", "Pullampeta", "Kodur"],
          },
          {
            name: "Madanapalle",
            mandals: ["Madanapalle", "Nimmanapalle", "Ramasamudram", "Madanapalle Municipality"],
          },
          {
            name: "Pileru",
            mandals: ["Gurramkonda", "Kalakada", "Kalikiri", "Kambhamvaripalle", "Pileru", "Valmikipuram"],
          },
        ],
      },
      {
        name: "Chittoor",
        constituencies: [
          {
            name: "Chittoor",
            mandals: ["Chittoor", "Gudipala", "Chitoor corporation"],
          },
          {
            name: "Punganur",
            mandals: ["Chowdepalle", "Pulicherla", "Punganur", "Rompicherla", "Sodam", "Somala", "Punganur Municipality"],
          },
          {
            name: "Kuppam",
            mandals: ["Gudupalle", "Kuppam", "Ramakuppam", "Santhipuram", "Kuppam Municipality"],
          },
          {
            name: "Puthalapattu",
            mandals: ["Bangarupalem", "Irala", "Puthalapattu", "Thavanampalle", "Yadamarri"],
          },
          {
            name: "Palamaneru",
            mandals: ["Baireddipalle", "Gangavaramu", "Palamaner", "Peddapanjani", "Venkatagirikota", "Palamaneru Municipality"],
          },
          {
            name: "Nagari (P)",
            mandals: ["Puttur", "Puttur Municipality", "Vadamalapeta", "Nagari", "Nindra", "Vijayapuram", "Nagari Municipality"],
          },
          {
            name: "Gangadhara Nellore",
            mandals: ["Gangadhara Nellore", "Karvetinagar", "Palasamudram", "Penumuru", "Srirangarajapuram", "Vedurukuppam"],
          },
        ],
      },
      {
        name: "Srikakulam",
        constituencies: [
          {
            name: "Srikakulam",
            mandals: ["Srikakulam MC", "Gara", "Srikakulam"],
          },
          {
            name: "Amadalavalasa",
            mandals: ["Amadalavalasa", "Burja", "Ponduru", "Sarubujjili", "Amadalavalasa Municipality"],
          },
          {
            name: "Palasa",
            mandals: ["Mandasa", "Palasa", "Vajrapukothuru", "Palasa-Kasibugga Municipality"],
          },
          {
            name: "Ichapuram",
            mandals: ["Ichapuram", "Kanchili", "Kaviti", "Sompeta", "Ichapuram Municipality"],
          },
          {
            name: "Pathapatnam",
            mandals: ["Hiramandalam", "Kothuru", "Lakshminarsupeta", "Meliaputti", "Pathapatnam"],
          },
          {
            name: "Tekkali",
            mandals: ["Kotabommali", "Nandigam", "Santhabommali", "Tekkali"],
          },
          {
            name: "Narasannapeta",
            mandals: ["Jalumuru", "Narasannapeta", "Polaki", "Saravakota"],
          },
          {
            name: "Etcherla",
            mandals: ["Etcherla", "Ganguvarisigadam", "Laveru", "Ranastalam"],
          },
        ],
      },
      {
        name: "Nandyala",
        constituencies: [
          {
            name: "Srisailam",
            mandals: ["Atmakur Srisailam", "Bandi Atmakur", "Mahanandi", "Velugodu", "Srisailam", "Atmakuru Municipality"],
          },
          {
            name: "Nandyala",
            mandals: ["Gospadu", "Nandyal", "Nandyal Municipality"],
          },
          {
            name: "Nandikotkur",
            mandals: ["Jupadu Bungalow", "Kothapalle", "Midthur", "Nandikotkur", "Pagidyala", "Pamulapadu", "Nandikotkur Municipality"],
          },
          {
            name: "Allagadda",
            mandals: ["Allagadda", "Chagalamarri", "Dornipadu", "Rudravaram", "Sirvel", "Uyyalawada", "Allagadda Municipality"],
          },
          {
            name: "Banaganapalle",
            mandals: ["Banaganapalle", "Koilkuntla", "Kolimigundla", "Owk", "Sanjamala"],
          },
          {
            name: "Dhone",
            mandals: ["Bethamcherla", "Dhone", "Peapally", "Dhone Municipality", "Bethamcherla (NP)"],
          },
          {
            name: "Panyam (P)",
            mandals: ["Gadivemula", "Orvakal", "Panyam"],
          },
        ],
      },
      {
        name: "Parvathipuram Manyam",
        constituencies: [
          {
            name: "Parvathipuram",
            mandals: ["Balijipeta", "Parvathipuram", "Seethanagaram Araku", "Parvathipuram Municipality"],
          },
          {
            name: "Salur (P)",
            mandals: ["Makkuva", "Pachipenta", "Salur", "Salur Municipality", "Mentada"],
          },
          {
            name: "Palakonda",
            mandals: ["Bhamini", "Palakonda", "Seethampeta", "Veeraghattam", "Palakonda (NP)"],
          },
          {
            name: "Kurupam",
            mandals: ["Garugubilli", "Gummalakshmipuram", "Jiyyammavalasa", "Komarada", "Kurupam"],
          },
        ],
      },
      {
        name: "Dr. B.R. Ambedkar Konaseema",
        constituencies: [
          {
            name: "Razole",
            mandals: ["Mamidikuduru Razole", "Malikipuram", "Razole", "Sakhinetipalle"],
          },
          {
            name: "Ramachandrapuram (P)",
            mandals: ["K Gangavaram", "Ramachandrapuram", "Ramachandrapuram Municipality", "Kajuluru"],
          },
          {
            name: "Mandapeta",
            mandals: ["Kapileswarapuram", "Mandapeta", "Rayavaram", "Mandapeta Municipality"],
          },
          {
            name: "Kothapeta",
            mandals: ["Alamuru", "Atreyapuram", "Kothapeta", "Ravulapalem"],
          },
          {
            name: "Mummidivaram (P)",
            mandals: ["I. Polavaram", "Katrenikona", "Mummidivaram", "Mummidivaram (NP)", "Thallarevu"],
          },
          {
            name: "P. Gannavaram",
            mandals: ["Mamidikuduru PGVaram", "Ainavilli", "Ambajipeta", "P.Gannavaram"],
          },
          {
            name: "Amalapuram",
            mandals: ["Allavaram", "Amalapuram", "Uppalaguptam", "Amalapuram Municipality"],
          },
        ],
      },
      {
        name: "Alluri Sitharama Raju",
        constituencies: [
          {
            name: "Araku",
            mandals: ["Ananthagiri", "Araku Valley", "Dumbriguda", "Hukumpeta", "Munchingiputtu", "Peda Bayalu"],
          },
          {
            name: "Paderu",
            mandals: ["Chintapalle", "G.Madugula", "Gudem Kotha Veedhi", "Koyyuru", "Paderu"],
          },
          {
            name: "Rampachodavaram",
            mandals: ["Addateegala", "Chintur", "Devipatnam", "Gangavaram", "Kunavaram", "Maredumilli", "Nellipaka", "Rajavommangi", "Rampachodavaram", "Vararamachandrapuram", "Y. Ramavaram"],
          },
        ],
      },
      {
        name: "Sri Sathya Sai",
        constituencies: [
          {
            name: "Raptadu (P)",
            mandals: ["Anantapur (Rural) R", "Atmakur ATP", "Raptadu", "Chennekothapalle", "Kanaganapalle", "Ramagiri"],
          },
          {
            name: "Puttaparthi",
            mandals: ["Amadagur", "Bukkapatnam", "Kothacheruvu", "Nallamada", "Obuladevaracheruvu", "Puttaparthi", "Puttaparthi (NP)"],
          },
          {
            name: "Penukonda",
            mandals: ["Gorantla", "Parigi", "Penukonda", "Roddam", "Somandepalle", "Penukonda (NP)"],
          },
          {
            name: "Kadiri",
            mandals: ["Gandlapenta", "Kadiri", "Nallacheruvu", "Nambulipulikunta", "Talupula", "Tanakal", "Kadiri Municipality"],
          },
          {
            name: "Madakasira",
            mandals: ["Agali", "Amarapuram", "Gudibanda", "Madakasira", "Rolla", "Madakasira (NP)"],
          },
          {
            name: "Dharmavaram",
            mandals: ["Bathalapalle", "Dharmavaram", "Mudigubba", "Tadimarri", "Dharmavaram Municipality"],
          },
          {
            name: "Hindupur",
            mandals: ["Chilamathur", "Hindupur", "Lepakshi", "Hindupur Municipality"],
          },
        ],
      },
      {
        name: "YSR",
        constituencies: [
          {
            name: "Pulivendula",
            mandals: ["Chakrayapeta", "Lingala", "Pulivendula", "Simhadripuram", "Thondur", "Vempalle", "Vemula", "Pulivendula Municipality"],
          },
          {
            name: "Proddatur",
            mandals: ["Proddatur", "Rajupalem (YSR)", "Proddatur Municipality"],
          },
          {
            name: "Kadapa",
            mandals: ["Kadapa MC Kadapa", "Kadapa"],
          },
          {
            name: "Kamalapuram",
            mandals: ["Kadapa MC Kamalapuram", "Chennur", "Chinthakommadinne", "Kamalapuram", "Pendlimarri", "Vallur", "Veerapunayunipalle", "Kamalapuram (NP)"],
          },
          {
            name: "Badvel",
            mandals: ["Atlur", "B.Kodur", "Badvel", "Gopavaram", "Kalasapadu", "Porumamilla", "Sri Avadhutha Kasinayana", "Badvel Municipality"],
          },
          {
            name: "Mydukur",
            mandals: ["Brahmamgarimattam", "Chapadu", "Duvvur", "Khajipeta", "Mydukur", "Mydukur Municipality"],
          },
          {
            name: "Jammalamadugu",
            mandals: ["Jammalamadugu", "Kondapuram YSR", "Muddanur", "Mylavaram YSR", "Peddamudium", "Yerraguntla", "Jammalamadugu (NP)", "Yerraguntla (NP)"],
          },
        ],
      },
    ],

    Telangana: [
      {
        name: "Hyderabad",
        constituencies: [
          {
            name: "Khairatabad",
            mandals: ["Khairatabad"],
          },
          {
            name: "Jubilee Hills",
            mandals: ["Jubilee Hills"],
          },
          {
            name: "Serilingampally",
            mandals: ["Serilingampally"],
          },
          {
            name: "Sanathnagar",
            mandals: ["Sanathnagar"],
          },
          {
            name: "Amberpet",
            mandals: ["Amberpet"],
          },
          {
            name: "Malakpet",
            mandals: ["Malakpet"],
          },
          {
            name: "Karwan",
            mandals: ["Karwan"],
          },
          {
            name: "Goshamahal",
            mandals: ["Goshamahal"],
          },
          {
            name: "Charminar",
            mandals: ["Charminar"],
          },
          {
            name: "Yakutpura",
            mandals: ["Yakutpura"],
          },
        ],
      },
      {
        name: "Rangareddy",
        constituencies: [
          {
            name: "Ibrahimpatnam",
            mandals: ["Ibrahimpatnam"],
          },
          {
            name: "L.B. Nagar",
            mandals: ["L.B. Nagar"],
          },
          {
            name: "Maheshwaram",
            mandals: ["Maheshwaram"],
          },
          {
            name: "Rajendranagar",
            mandals: ["Rajendranagar"],
          },
          {
            name: "Chevella",
            mandals: ["Chevella"],
          },
          {
            name: "Vikarabad",
            mandals: ["Vikarabad"],
          },
        ],
      },
    ],
  };

const handleSubmit = async (e: React.FormEvent) => {
 
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
     const pwdError = getPasswordError(formData.password);
     if (formData.password !== confirmPassword) {
  throw new Error("Passwords do not match");
}

if (pwdError) {
  throw new Error(pwdError);
}

    // validations
    if (formData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const currentCode = getCurrentCountryCode();
    const numberOnly = formData.mobile_number.slice(currentCode.length);
    const expected = phoneLengths[currentCode];
    if (expected && numberOnly.length !== expected) {
      throw new Error(`Mobile number must be ${expected} digits`);
    }

    const profilePayload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      mobile_number: formData.mobile_number,
      country_of_residence: formData.country_of_residence,
      state_abroad: formData.state_abroad,
      city_abroad: formData.city_abroad,
      indian_state: formData.indian_state,
      district: formData.district,
      assembly_constituency: formData.assembly_constituency,
      mandal: formData.mandal,
    };

    // SIGN UP
await signUp(
  formData.email,
  formData.password,
  profilePayload
);

navigate("/verify-email", {
  state: { email: formData.email },
});

return;

  } catch (err: any) {
    console.error(err);
    setError(err.message || 'Signup failed');
  } finally {
    setLoading(false);
  }
};



  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  const isPasswordInvalid = !!passwordError || (confirmPassword !== formData.password);
return (
  <>
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />

    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-4 px-2 sm:py-12 sm:px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <div
          className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg sm:shadow-xl md:shadow-2xl p-3 sm:p-6 md:p-8"
          style={{ border: '2px sm:border-4 solid #1e88e5' }}
        >
          <button
            onClick={() => navigate('/')}
            className="mb-3 sm:mb-4 inline-block text-blue-600 hover:text-blue-700 font-semibold text-xs sm:text-sm md:text-base"
          >
            ← Back to Home
          </button>

          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-2 text-white bg-gradient-to-r from-[#1356aed2] to-[#1E6BD6] p-2 sm:p-3 md:p-4 rounded-lg shadow">
            Join YSRCP NRI Wing
          </h2>

          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Register to become part of our global community
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg mb-4 text-sm sm:text-base">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Personal Information */}
            <div className="border-b pb-3 sm:pb-4">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 p-2 sm:p-2.5 rounded bg-blue-600">
                Personal Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-blue-400 rounded-lg bg-blue-50 focus:ring-2 focus:ring-green-500 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-blue-400 rounded-lg bg-blue-50 focus:ring-2 focus:ring-green-500 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div className="relative" ref={countryDropdownRef}>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Country You Currently Live In <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={countrySearch}
                    placeholder="Search or select a country"
                    onChange={(e) => {
                      setCountrySearch(e.target.value);
                      setShowCountryDropdown(true);
                      if (formData.country_of_residence) {
                        setFormData({
                          ...formData,
                          country_of_residence: '',
                          mobile_number: '',
                          state_abroad: '',
                          city_abroad: '',
                        });
                      }
                    }}
                    onFocus={() => setShowCountryDropdown(true)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {showCountryDropdown && (
                    <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                      {countryCodes
                        .filter((country) =>
                          country.name.toLowerCase().includes(countrySearch.toLowerCase())
                        )
                        .map((country) => (
                          <li
                            key={country.name}
                            onClick={() => {
                              const countryCode = getCountryCodeFromCountryName(country.name);
                              setFormData({
                                ...formData,
                                country_of_residence: country.name,
                                mobile_number: countryCode,
                                state_abroad: '',
                                city_abroad: '',
                              });
                              setCountrySearch(`${country.name} (+${country.code.replace('+', '')})`);
                              setShowCountryDropdown(false);
                              setPhoneError('');
                            }}
                            className="px-3 sm:px-4 py-2 text-sm sm:text-base cursor-pointer hover:bg-blue-50"
                          >
                            {country.name} (+{country.code.replace('+', '')})
                          </li>
                        ))}
                      {countryCodes.filter((country) =>
                        country.name.toLowerCase().includes(countrySearch.toLowerCase())
                      ).length === 0 && (
                        <li className="px-3 sm:px-4 py-2 text-sm text-gray-400">No countries found</li>
                      )}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    State / Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state_abroad}
                    placeholder="Enter your state or province"
                    onChange={(e) => setFormData({ ...formData, state_abroad: e.target.value })}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city_abroad}
                    placeholder="Enter your city"
                    onChange={(e) => setFormData({ ...formData, city_abroad: e.target.value })}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <div className="flex">
                      <div className="flex items-center border border-gray-300 rounded-l-lg bg-gray-50 px-2">
                        <select
                          required
                          value={getCurrentCountryCode()}
                          onChange={(e) => {
                            const newCode = e.target.value;
                            const prevCode = getCurrentCountryCode();
                            const numberOnly = formData.mobile_number.slice(prevCode.length);
                            setFormData({ ...formData, mobile_number: newCode + numberOnly });
                            const expected = phoneLengths[newCode];
                            if (expected && numberOnly.length > 0 && numberOnly.length !== expected) {
                              setPhoneError(`Mobile number must be ${expected} digits for ${newCode}`);
                            } else {
                              setPhoneError('');
                            }
                          }}
                          className="bg-transparent text-sm sm:text-base outline-none px-2 py-2"
                        >
                          {countryCodes.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.code}
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="tel"
                        required
                        value={formData.mobile_number.slice(getCurrentCountryCode().length)}
                        onChange={(e) => {
                          const currentCode = getCurrentCountryCode();
                          let digits = e.target.value.replace(/\D/g, '');
                          const expected = phoneLengths[currentCode];
                          if (expected) digits = digits.slice(0, expected);
                          setFormData({ ...formData, mobile_number: currentCode + digits });
                          if (expected && digits.length > 0 && digits.length !== expected) {
                            setPhoneError(`Mobile number must be ${expected} digits for ${currentCode}`);
                          } else {
                            setPhoneError('');
                          }
                        }}
                        className="flex-1 px-3 py-2.5 text-sm sm:text-base border-t border-b border-r border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder=" "
                      />
                    </div>
                    {phoneError && <p className="text-sm text-red-600 mt-1">{phoneError}</p>}
                  </div>
                </div>

                {/* empty cell for md layout (optional) */}
                <div className="hidden md:block" />
              </div>
            </div>

            {/* Security Section */}
            <div className="border-b pb-3 sm:pb-4">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 p-2 sm:p-2.5 rounded bg-blue-600">
                Security
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, password: value });
                        setPasswordError(getPasswordError(value));
                      }}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-600 text-sm mt-1">{passwordError}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 text-sm sm:text-base pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>

                  {confirmPassword && confirmPassword !== formData.password && (
                    <p className="text-red-600 text-sm mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === formData.password && !passwordError && (
                    <p className="text-green-600 text-sm mt-1">Passwords match</p>
                  )}
                </div>
              </div>
            </div>

            {/* INDIA ADDRESS DETAILS */}
            <div className="border-b pb-3 sm:pb-4 mb-3 sm:mb-4">
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-blue-600 mb-2 sm:mb-3 flex items-center">
                <MapPin size={18} className="mr-2 text-blue-600 flex-shrink-0" />
                INDIA ADDRESS DETAILS
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.indian_state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        indian_state: e.target.value,
                        district: '',
                        assembly_constituency: '',
                      })
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {Object.keys(indianAddressData).map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.district}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        district: e.target.value,
                        assembly_constituency: '',
                      })
                    }
                    disabled={!formData.indian_state}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select District</option>
                    {formData.indian_state &&
                      indianAddressData[formData.indian_state]?.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Assembly Constituency <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.assembly_constituency}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assembly_constituency: e.target.value,
                        mandal: '',
                      })
                    }
                    disabled={!formData.district}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Assembly Constituency</option>
                    {formData.indian_state &&
                      formData.district &&
                      indianAddressData[formData.indian_state]
                        ?.find((d) => d.name === formData.district)
                        ?.constituencies.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Mandal / Municipality <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.mandal}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mandal: e.target.value,
                      })
                    }
                    disabled={!formData.assembly_constituency}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value="">Select Mandal / Municipality</option>
                    {formData.indian_state &&
                      formData.district &&
                      formData.assembly_constituency &&
                      indianAddressData[formData.indian_state]
                        ?.find((d) => d.name === formData.district)
                        ?.constituencies.find((c) => c.name === formData.assembly_constituency)
                        ?.mandals.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0B4DA2] to-[#1E6BD6] text-white py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:shadow-lg transition disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-sm sm:text-base text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/', { state: { openLogin: true } })}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  </>
);
}