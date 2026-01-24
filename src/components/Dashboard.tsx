
import React, { useState, useEffect, useMemo ,useRef} from 'react';
import { Listbox } from "@headlessui/react";
//Coontry → States → Cities
const countryData: Record<
  string,
  { name: string; cities: string[] }[]
> = {
  USA: [
    { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'] },
    { name: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio'] },
  ],
  UK: [
    { name: 'England', cities: ['London', 'Manchester', 'Liverpool'] },
    { name: 'Scotland', cities: ['Edinburgh', 'Glasgow'] },
  ],
  Canada: [
    { name: 'Ontario', cities: ['Toronto', 'Ottawa'] },
    { name: 'British Columbia', cities: ['Vancouver', 'Surrey'] },
  ],
  UAE: [
    { name: 'Dubai', cities: ['Dubai City', 'Jumeirah', 'Deira'] },
    { name: 'Abu Dhabi', cities: ['Abu Dhabi City', 'Al Ain'] },
  ],
Singapore: [
  {
    name: "Central Region",
    cities: [
      "Orchard",
      "Marina Bay",
      "CBD",
      "Tiong Bahru",
      "Bukit Timah",
      "Novena",
      "Bishan",
      "Toa Payoh",
    ],
  },
  {
    name: "East Region",
    cities: [
      "Tampines",
      "Pasir Ris",
      "Bedok",
      "Changi",
      "Simei",
    ],
  },
  {
    name: "West Region",
    cities: [
      "Jurong East",
      "Jurong West",
      "Bukit Batok",
      "Bukit Panjang",
      "Clementi",
    ],
  },
  {
    name: "North Region",
    cities: [
      "Woodlands",
      "Yishun",
      "Sembawang",
      "Admiralty",
    ],
  },
  {
    name: "North-East Region",
    cities: [
      "Hougang",
      "Sengkang",
      "Punggol",
      "Serangoon",
    ],
  },
],


  Netherlands: [
  {
    name: "North Holland",
    cities: ["Amsterdam", "Haarlem", "Zaandam"],
  },
  {
    name: "South Holland",
    cities: ["Rotterdam", "The Hague", "Leiden"],
  },
  {
    name: "Utrecht",
    cities: ["Utrecht", "Amersfoort"],
  },
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
const SERVICE_CONFIG = {
  student: {
    label: "Student Support",
    subs: {
      "Education Guidance": [
        "Course Selection",
        "University Shortlisting",
        "Scholarship Assistance",
      ],
      "Visa Support": [
        "Student Visa",
        "Documentation Review",
        "Interview Preparation",
      ],
    },
  },

  legal: {
    label: "Legal Advisor",
    subs: {
      "Immigration Law": [
        "PR / Citizenship",
        "Visa Extension",
      ],
      "Property Issues": [
        "Land Dispute",
        "Registration Help",
      ],
    },
  },

  career: {
    label: "Career Coach",
    subs: {
      "Job Support": [
        "Resume Review",
        "Interview Preparation",
      ],
      "Career Switch": [
        "IT Transition",
        "Skill Roadmap",
      ],
    },
  },

  local: {
    label: "Local Connector",
    subs: {
      "Community Help": [
        "Local Events",
        "Volunteer Groups",
      ],
      "Government Services": [
        "Certificates",
        "Office Guidance",
      ],
    },
  },
};

import {
  User,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  MapPin,
  ChevronDown,
  LogOut,
  Briefcase,
  GraduationCap,
  Scale,
  Check,
  ArrowRight,
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';


type SectionKey =
  | 'profile'
  | 'referrals'
  | 'connect'
  | 'services'
  | 'events'
 // | 'notifications'
  | 'suggestions';


type Referral = {
  id: number;
  member_name: string;
  location: string | null;
  type: 'active' | 'passive';
  created_at: string;
};
type LeaderAssignmentRow = {
  role: string;
  sort_order: number | null;
  leaders_master: {
    id: string;
    name: string;
    whatsapp_number: string | null;
    is_active: boolean;   
  };
};


type EventItem = {
  id: string;          // uuid
  title: React.ReactNode;

  info: string | null; // admin message
  status: string;      // Draft | Sent
  created_at: string;
};



// NOTIFICATIONS DISABLED
// type NotificationItem = {
//   id: number;
//   title: string;
//   body: string | null;
//   created_at: string;
//   is_read: boolean;
// };

const Dashboard: React.FC = () => {
  const { user, refreshProfile, profile, signOut } = useAuth();
// ---------------- AUTH GUARD (AFTER HOOKS) ----------------
if (!user) {
  window.location.replace("/");
  return null;
}
  const [expandedSection, setExpandedSection] =
    useState<SectionKey | null>("profile");
    const [eventsSeen, setEventsSeen] = useState(false);
 const [selectedService, setSelectedService] = useState<string | null>(null);
const [selectedSub, setSelectedSub] = useState<string | null>(null);
const [selectedInner, setSelectedInner] = useState<string | null>(null);
  useEffect(() => {
    setSelectedSub(null);
    setSelectedInner(null);
  }, [selectedService]);
  const [activeReferralCount, setActiveReferralCount] = useState<number>(0);

  const [submittingService, setSubmittingService] = useState(false);
const [contributionTypes, setContributionTypes] = useState<
  { id: number; name: string }[]
>([]);

const [selectedContributions, setSelectedContributions] = useState<number[]>([]);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info";
  } | null>(null);

// ✅ FIXED: ACTIVE REFERRAL COUNT (USES profile.id)
useEffect(() => {
  if (!profile?.id) return;

  const fetchReferralCount = async () => {
    const { count, error } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", profile.id); // ✅ CORRECT KEY

    if (error) {
      console.error("Referral count error:", error);
      return;
    }

    setActiveReferralCount(count ?? 0);
  };

  fetchReferralCount();
}, [profile?.id]);

const normalizedCountry = profile?.country_of_residence
  ?.trim()
  .toLowerCase();
const countryConfig = useMemo(() => {
  if (!normalizedCountry) return undefined;

  return Object.entries(countryData).find(
    ([key]) => key.toLowerCase() === normalizedCountry
  )?.[1];
}, [normalizedCountry]);


const normalizeDistrict = (value: string) => {
  return value.replace(/district/i, "").trim();
};

const normalizeMandal = (value: string) => {
  return value.replace(/mandal/i, "").trim();
};

const normalizeAssembly = (value: string) => {
  return value.replace(/assembly constituency|ac/i, "").trim();
};

// ---------------- CONTRIBUTIONS ----------------
const toggleContribution = async (
  contributionTypeId: number,
  checked: boolean
) => {
  if (!user) return;

  if (checked) {
    // Optimistic UI update
    setSelectedContributions((prev) => [
      ...prev,
      contributionTypeId,
    ]);

    const { error } = await supabase
      .from("user_contributions")
      .insert({
        user_id: user.id,
        contribution_type_id: contributionTypeId,
      });

    if (error) {
      console.error("Insert error:", error);
      // rollback
      setSelectedContributions((prev) =>
        prev.filter((id) => id !== contributionTypeId)
      );
    }
  } else {
    // Optimistic UI update
    setSelectedContributions((prev) =>
      prev.filter((id) => id !== contributionTypeId)
    );

    const { error } = await supabase
      .from("user_contributions")
      .delete()
      .eq("user_id", user.id)
      .eq("contribution_type_id", contributionTypeId);

    if (error) {
      console.error("Delete error:", error);
      // rollback
      setSelectedContributions((prev) => [
        ...prev,
        contributionTypeId,
      ]);
    }
  }
};

const roleOptions: Record<string, string[]> = {
  Job: [
    "Software Engineer",
    "Manager",
    "Doctor",
    "Teacher",
    "Government Employee",
    "Private Employee",
    "Other",
  ],
  Business: [
    "Founder",
    "Co-Founder",
    "Partner",
    "Entrepreneur",
    "Self Employed",
    "Other",
  ],
  Student: [
    "School Student",
    "Undergraduate",
    "Postgraduate",
    "Research Scholar",
    "Other",
  ],
};


  // ---------------- PHOTO UPLOAD STATE ----------------
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [countryOfResidence, setCountryOfResidence] = useState("India");
const [stateAbroad, setStateAbroad] = useState("");
const [cityAbroad, setCityAbroad] = useState("");

  const [indianState, setIndianState] = useState("");
const [district, setDistrict] = useState("");
const [assembly, setAssembly] = useState("");
const [mandal, setMandal] = useState("");
const [profession, setProfession] = useState<string>(
  profile?.profession || ""
);
const [roleDesignation, setRoleDesignation] = useState<string>(
  profile?.role_designation || ""
);
useEffect(() => {
  if (profile?.role_designation) {
    setRoleDesignation(profile.role_designation);
  }
}, [profile?.role_designation]);

useEffect(() => {
  if (profile?.profession) {
    setProfession(profile.profession);
  }
}, [profile?.profession]);
useEffect(() => {
  if (!user) return;
 


  const loadContributions = async () => {
    // Load contribution options
    const { data: types } = await supabase
      .from("contribution_types")
      .select("id, name")
      .order("id");

    setContributionTypes(types || []);

    // Load user's selections
    const { data: userContribs } = await supabase
      .from("user_contributions")
      .select("contribution_type_id")
      .eq("user_id", user.id);

    setSelectedContributions(
      (userContribs || []).map((c) => c.contribution_type_id)
    );
  };

  loadContributions();
}, [user]);
useEffect(() => {
  if (!profile) return;

  setCountryOfResidence(profile.country_of_residence || "India");

  if (profile.country_of_residence !== "India") {
    setStateAbroad(profile.state_abroad || "");
    setCityAbroad(profile.city_abroad || "");
  } else {
    setStateAbroad("");
    setCityAbroad("");
  }
}, [profile]);


useEffect(() => {
  if (!profile) return;

  setIndianState(profile.indian_state?.trim() || "");

  setDistrict(
    profile.district
      ? normalizeDistrict(profile.district)
      : ""
  );

  setAssembly(
    profile.assembly_constituency
      ? normalizeAssembly(profile.assembly_constituency)
      : ""
  );

  setMandal(
    profile.mandal
      ? normalizeMandal(profile.mandal)
      : ""
  );
}, [profile]);

  // ---------------- DYNAMIC DATA ----------------
  const [activeReferrals, setActiveReferrals] = useState<Referral[]>([]);
  const [passiveReferrals, setPassiveReferrals] = useState<Referral[]>([]);
  const [leadersByRole, setLeadersByRole] = useState<
  Record<
    string,
    {
      id: string;
      name: string;
      whatsapp_number: string | null;
    }[]
  >
>({});


  const [events, setEvents] = useState<EventItem[]>([]);
  //const [notifications, setNotifications] =
    //useState<NotificationItem[]>([]);

  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const serviceMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestionRef = useRef<HTMLTextAreaElement | null>(null);

 // ---------------- REFERRAL STATS ----------------
  const referralStats = useMemo(() => {
    const active = activeReferrals.length;
    const passive = passiveReferrals.length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const createdThisWeek = [...activeReferrals, ...passiveReferrals].filter(
      (r) => new Date(r.created_at) >= weekAgo
    ).length;

    return {
      active,
      passive,
      newThisWeek: createdThisWeek,
    };
  }, [activeReferrals, passiveReferrals]);

  // ---------------- TOAST ----------------
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (
    msg: string,
    type: "success" | "info" = "success"
  ) => {
    setToast({ msg, type });
  };
const toggleSection = (section: SectionKey) => {
  setExpandedSection((prev) => {
    const next = prev === section ? null : section;

    if (section === "events") {
      setEventsSeen(true); // 👁 user opened Events
    }

    return next;
  });
};

const handleSubmitService = async () => {
  const message = serviceMessageRef.current?.value.trim();

  if (!selectedService || !selectedSub || !selectedInner) {
    showToast("Please complete service selection", "info");
    return;
  }

  if (!message) {
    showToast("Please describe your requirement", "info");
    return;
  }

  if (!user) return;

  try {
    setSubmittingService(true);

    const { error } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        applicant_name: fullName,
        current_location: profile?.country_of_residence || "India",
        service_type: selectedService,
        service_category: selectedSub,
        service_option: selectedInner,
        description: message,
        status: "pending",
      });

    if (error) throw error;

    serviceMessageRef.current!.value = "";
    setSelectedService(null);
    setSelectedSub(null);
    setSelectedInner(null);

    showToast("Service request submitted successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to submit request", "info");
  } finally {
    setSubmittingService(false);
  }
};





const handleRemovePhoto = async () => {
  if (!user || !profile?.profile_photo) {
    showToast("No profile photo to remove", "info");
    return;
  }

  try {
    // Extract storage path from public URL
    const filePath = profile.profile_photo.split(
      "/storage/v1/object/public/profile-photos/"
    )[1];

    if (!filePath) {
      showToast("Invalid photo path", "info");
      return;
    }

    // 1️⃣ Remove from storage
    const { error: storageError } = await supabase.storage
      .from("profile-photos")
      .remove([filePath]);

    if (storageError) throw storageError;

    // 2️⃣ Remove from DB
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ profile_photo: null })
      .eq("id", user.id);

    if (dbError) throw dbError;

    // 3️⃣ Update UI
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);

    await refreshProfile();
    showToast("Profile photo removed", "success");
  } catch (err) {
    console.error("Remove photo error:", err);
    showToast("Failed to remove photo", "info");
  }
};

  // Photo handlers
  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !user) {
      showToast('No file selected or user not available', 'info');
      return;
    }

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `profile-photos/${user.id}_${Date.now()}.${fileExt}`;
     const { error: uploadError } = await supabase.storage
  .from('profile-photos')
  .upload(filePath, photoFile, { upsert: true });

if (uploadError) {
  console.error('Storage upload error', uploadError);
  throw uploadError;
}

// ✔ Correct Supabase v2 syntax
const { data: publicUrlData } = supabase.storage
  .from('profile-photos')
  .getPublicUrl(filePath);

const publicUrl = publicUrlData.publicUrl;

// Save public URL in DB
const { error: updateError } = await supabase
  .from('profiles')
  .update({ profile_photo: publicUrl })
  .eq('id', user.id);


      if (updateError) {
        console.error('Profile update error', updateError);
        throw updateError;
      }

      await refreshProfile();
      showToast('Profile photo updated', 'success');

      setPhotoFile(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
    } catch (err: any) {
      console.error('Upload error', err);
      const msg = err?.message || err?.error_description || 'Upload failed';
      showToast(msg, 'info');
    } finally {
      setUploading(false);
    }
  };

  /// Fetch dashboard data from Supabase
useEffect(() => {
  if (!user) return;

  const loadDashboard = async () => {
    setLoadingDashboard(true);

    try {

// ---------------- ACTIVE REFERRALS ----------------
const { data: activeData, error: activeError } = await supabase
  .from("referrals")
  .select(`
    id,
    created_at,
    source,
    profiles:referred_id (
      first_name,
      last_name,
      country_of_residence
    )
  `)
  .eq("referrer_id", profile.id)
  .in("source", ["direct", "active"])
  .order("created_at", { ascending: false });

if (activeError) {
  console.error("Active referral error:", activeError);
}

setActiveReferrals(
  (activeData || []).map((r: any) => {
    const first = r.profiles?.first_name ?? "";
    const last = r.profiles?.last_name ?? "";

    return {
      id: r.id,
      member_name: last && last !== first ? `${first} ${last}` : first,
      location: r.profiles?.country_of_residence ?? "—",
      type: "active",
      created_at: r.created_at,
    };
  })
);


// ---------------- PASSIVE REFERRALS ----------------
const { data: passiveData, error: passiveError } = await supabase
  .from("referrals")
  .select(`
    id,
    created_at,
    profiles:referred_id (
      first_name,
      last_name,
      country_of_residence
    )
  `)
  .eq("referrer_id", profile.id)
  .eq("source", "passive")
  .order("created_at", { ascending: false });

if (passiveError) {
  console.error("Passive referral error:", passiveError);
}

setPassiveReferrals(
  (passiveData || []).map((r: any) => {
    const first = r.profiles?.first_name ?? "";
    const last = r.profiles?.last_name ?? "";

    return {
      id: r.id,
      member_name: last && last !== first ? `${first} ${last}` : first,
      location: r.profiles?.country_of_residence ?? "—",
      type: "passive",
      created_at: r.created_at,
    };
  })
);

     // 2. Leaders (NEW NORMALIZED LOGIC)
    // 🔒 Clear leaders if district or assembly missing
if (!district || !assembly) {

  setLeadersByRole({});
  return;
}
// ✅ ADD THIS LOG HERE
console.log("LEADERS QUERY FILTERS", {
  district: normalizeDistrict(district),
  constituency: normalizeAssembly(assembly),
});
const { data, error } = await supabase
  .from("leader_assignments")
  .select(`
    role,
    sort_order,
    leaders_master (
      id,
      name,
      whatsapp_number,
      is_active
    )
  `)
  
  .eq("district", normalizeDistrict(district))
  .eq("constituency", normalizeAssembly(assembly))
  .eq("is_active", true) // leader_assignments.is_active
  .order("sort_order", { ascending: true });

if (error) {
  console.error("Leaders fetch error:", error);
  return;
}

const grouped = (data as LeaderAssignmentRow[]).reduce(
  (acc, item) => {
    if (!item.leaders_master?.is_active) return acc;

    if (!acc[item.role]) acc[item.role] = [];

    acc[item.role].push({
      id: item.leaders_master.id,
      name: item.leaders_master.name,
      whatsapp_number: item.leaders_master.whatsapp_number,
    });

    return acc;
  },
  {} as Record<
    string,
    { id: string; name: string; whatsapp_number: string | null }[]
  >
);

setLeadersByRole(grouped);




      // =======================
      // 3. EVENTS
      // =======================
  const { data: eventsData, error: eventsError } = await supabase
  .from("events")
  .select("id, title, info, status, created_at")
  .eq("status", "Sent")
  .order("created_at", { ascending: false });

if (eventsError) {
  console.error("Events fetch error:", eventsError);
} else {
  setEvents(eventsData as EventItem[]);
}


      // =======================
      // 4. NOTIFICATIONS
      // =======================
      //const { data: notifData } = await supabase
        //.from("notifications")
        //.select("*")
        //.eq("referrer_id", profile.id)

        //.order("created_at", { ascending: false });

      //if (notifData) setNotifications(notifData as NotificationItem[]);
    } finally {
      setLoadingDashboard(false);
    }
  };

  loadDashboard();
}, [user, profile,district, assembly]);

const isNewEvent = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);

  const diffHours =
    (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  return diffHours <= 24; // new if within 24 hours
};
const hasNewEvents = events.some(
  (e) => isNewEvent(e.created_at)
);

  // Helper to format dates like "Jan 12, 2025"
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getMonthDay = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { month: '', day: '' };
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      day: d.getDate().toString(),
    };
  };

const fullName = profile?.first_name
  ? profile.last_name && profile.last_name !== profile.first_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.first_name
  : "Member";


      // ======>Uncommet this after buying the domain==========
// const referralLink =
//   profile?.referral_code && profile?.first_name
//     ? `https://ysrcpnriwing.org/ref/${profile.first_name.toLowerCase()}/${profile.referral_code}`
//     : '';

const referralLink =
  profile?.referral_code && profile?.first_name
    ? `${window.location.origin}/ref/${profile.first_name.toLowerCase()}/${profile.referral_code}`
    : '';



 // const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  // ---------------- PROFILE COMPLETION & MISSING FIELDS ----------------
  // 🔹 Profile completion calculation
const profileCompletion = useMemo(() => {
  if (!profile) return 0;

  const TOTAL_SECTIONS = 8;
  let completed = 0;

  // 1️⃣ Name
  if (profile.first_name) completed++;

  // 2️⃣ Mobile
  if (profile.mobile_number) completed++;

  // 3️⃣ DOB
  if (profile.dob) completed++;

  // 4️⃣ Photo
  if (profile.profile_photo) completed++;

  // 5️⃣ Address
  const country = profile.country_of_residence?.toLowerCase();
  const isIndia = !country || country === "india";

 if (
  isIndia
    ? profile.indian_state &&
      profile.district &&
      profile.assembly_constituency &&
      profile.mandal
    : profile.state_abroad && profile.city_abroad
) {
  completed++;
}


  // 6️⃣ Profession + Role
  if (profile.profession && profile.role_designation) {
    completed++;
  }

  // 7️⃣ Socials (ALL REQUIRED)
  if (
    profile.facebook_id &&
    profile.twitter_id &&
    profile.linkedin_id &&
    profile.instagram_id
  ) {
    completed++;
  }

  // 8️⃣ Contribution (ONE required)
  if (Array.isArray(selectedContributions) && selectedContributions.length > 0) {
    completed++;
  }

  return Math.round((completed / TOTAL_SECTIONS) * 100);
}, [profile, selectedContributions]);

// 🔹 Missing profile fields detection

const missingProfileFields = useMemo(() => {
  if (!profile) return [];

  const missing: { key: string; label: string }[] = [];

  if (!profile.profile_photo)
    missing.push({ key: "photo", label: "Add Profile Photo" });

  if (!profile.mobile_number)
    missing.push({ key: "mobile", label: "Add Mobile Number" });
if (!profile.dob) {
  missing.push({
    key: "dob",
    label: "Add Date of Birth",
  });
}

  const country = profile.country_of_residence?.trim().toLowerCase();
  const isIndia = !country || country === "india";

  if (isIndia) {
    if (!profile.indian_state)
      missing.push({ key: "state", label: "Select State" });
    if (!profile.district)
      missing.push({ key: "district", label: "Select District" });
    if (!profile.assembly_constituency)
      missing.push({ key: "assembly", label: "Select Assembly" });
    if (!profile.mandal)
      missing.push({ key: "mandal", label: "Select Mandal" });
  }

  if (!profile.facebook_id)
    missing.push({ key: "facebook", label: "Add Facebook" });
  if (!profile.twitter_id)
    missing.push({ key: "twitter", label: "Add Twitter" });
  if (!profile.linkedin_id)
    missing.push({ key: "linkedin", label: "Add LinkedIn" });
  if (!profile.instagram_id)
    missing.push({ key: "instagram", label: "Add Instagram" });

  if (!profile.profession)
    missing.push({ key: "profession", label: "Select Profession" });

  if (!profile.role_designation)
    missing.push({ key: "role", label: "Select Role / Designation" });
// 🌍 Abroad State & City (for NRIs)
if (!isIndia) {
  if (!profile.state_abroad)
    missing.push({ key: "state_abroad", label: "Select Abroad State" });

  if (!profile.city_abroad)
    missing.push({ key: "city_abroad", label: "Select Abroad City" });
}

  // ✅ CONTRIBUTION CHECK
  if (!selectedContributions || selectedContributions.length === 0) {
    missing.push({
      key: "contribution",
      label: "Select Contribution Area",
    });
  }

  return missing;
}, [profile, selectedContributions]);


  // --- ENRICHED SUMMARY RENDERERS (Visible when Collapsed) ---

 const renderProfileSummary = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
          <span>Profile Completion</span>
          {/* still static for now, you can compute this later from filled fields */}
          <span className="text-indigo-600">{profileCompletion}%</span>

        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
       <div
  className="h-full bg-indigo-600 rounded-full shadow-sm"
  style={{ width: `${profileCompletion}%` }}
></div>

        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 sm:border-l sm:border-gray-200 sm:pl-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={14} className="text-green-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-500" />
          <span>Socials Pending</span>
        </div>
      </div>
    </div>
  );

  const renderReferralsSummary = () => (
    <div className="flex flex-wrap items-center gap-6 w-full mt-1 opacity-90">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-emerald-600 leading-none">
          {referralStats.active}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>
      <div className="w-px bg-gray-200 h-6 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-blue-600 leading-none">
          {referralStats.passive}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Passive
          </span>
        </div>
      </div>
      <div className="flex-1 text-right hidden md:block">
        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
          +{referralStats.newThisWeek} this week
        </span>
      </div>
    </div>
  ); 
const renderConnectSummary = () => {
  const allLeaders = Object.values(leadersByRole).flat();
  const firstRole = Object.keys(leadersByRole)[0];

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {allLeaders.slice(0, 4).map((leader) => (
            <div
              key={leader.id}
              className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden"
            >
              <img
                src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                  leader.name || "Leader"
                )}`}
                alt={leader.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <span className="text-xs font-bold text-gray-600">
          {firstRole || "Leadership Contacts"}{" "}
          {allLeaders.length > 1 ? `& ${allLeaders.length - 1} Others` : ""}
        </span>
      </div>
    </div>
  );
};


  const renderServicesSummary = () => (
    <div className="flex flex-wrap items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100">
          Student
        </span>
        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-bold uppercase border border-purple-100">
          Legal
        </span>
        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase border border-amber-100">
          Career
        </span>
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase border border-emerald-100">
        Local Connector
      </span>
      </div>
    </div>
  );
const renderEventsSummary = () => {
  const latest = events[0];

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      {latest ? (
        <>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-center min-w-[36px]">
              <span className="block text-[9px] font-black uppercase">
                {formatDate(latest.created_at)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-800">
                {latest.title}
              </span>
            </div>
          </div>
        
        </>
      ) : (
        <div className="text-xs text-gray-500">No updates yet.</div>
      )}
    </div>
  );
};


 //  NOTIFICATIONS DISABLED
// const renderNotificationsSummary = () => (
//   <div className="w-full mt-1 flex items-center justify-between opacity-90">
//     <div className="flex items-center gap-2">
//       <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
//         {unreadNotificationsCount}
//       </span>
//       <span className="text-xs text-gray-500 font-medium">
//         Unread updates
//       </span>
//     </div>
//   </div>
// );


const handleSaveProfile = async () => {
  if (!user) return;

  try {
    const fullName =
      (document.getElementById("fullName") as HTMLInputElement)?.value || "";

    const mobile_number =
      (document.getElementById("mobile_number") as HTMLInputElement)?.value || "";
const dob =
  (document.getElementById("dob") as HTMLInputElement)?.value || null;

    const facebook =
      (document.getElementById("facebook") as HTMLInputElement)?.value || "";

    const twitter =
      (document.getElementById("twitter") as HTMLInputElement)?.value || "";

    const linkedin =
      (document.getElementById("linkedin") as HTMLInputElement)?.value || "";

    const instagram =
      (document.getElementById("instagram") as HTMLInputElement)?.value || "";
const nameParts = fullName.trim().split(/\s+/);

const first_name = nameParts[0];
const last_name =
  nameParts.length > 1
    ? nameParts.slice(1).join(" ")
    : ""; 

   
const updates = {
  first_name,
  last_name,
  mobile_number,
  dob,
  profession,
  role_designation: roleDesignation,
  facebook_id: facebook,
  twitter_id: twitter,
  linkedin_id: linkedin,
  instagram_id: instagram,
  updated_at: new Date().toISOString(),

  // 🌍 Abroad (current residence)
  country_of_residence: profile?.country_of_residence || null,
  state_abroad: stateAbroad || profile?.state_abroad || null,
  city_abroad: cityAbroad || profile?.city_abroad || null,

  // 🇮🇳 Indian (permanent address)
  indian_state: indianState || profile?.indian_state || null,
  district: district || profile?.district || null,
  assembly_constituency: assembly || profile?.assembly_constituency || null,
  mandal: mandal || profile?.mandal || null,
};


    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      throw error;
    }

    await refreshProfile();
    showToast("Profile Updated Successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to update profile", "info");
  }
};


const handleSubmitSuggestion = async () => {
  const message = suggestionRef.current?.value.trim() || "";

  if (!message) {
    showToast("Please enter your suggestion", "info");
    return;
  }

  try {
    setSubmittingSuggestion(true);

    const { error } = await supabase.from("suggestions").insert({
      name: fullName,
      country: profile?.country_of_residence || "India",
      suggestion: message,
      suggestion_date: new Date().toISOString().split("T")[0], // ✅ CORRECT
    });

    if (error) throw error;

    if (suggestionRef.current) {
      suggestionRef.current.value = "";
    }

    showToast("Suggestion submitted successfully!", "success");
  } catch (err) {
    console.error("Suggestion error:", err);
    showToast("Failed to submit suggestion", "info");
  } finally {
    setSubmittingSuggestion(false);
  }
};



  // --- EXPANDED CONTENT RENDERERS ---

 
  const renderProfileContent = () => (
    <div className="pt-4 ">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Photo Block */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden bg-gray-100 mb-3">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  No Photo
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <label className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-lg cursor-pointer text-xs font-bold">
                Select
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
              </label>
              <button
                onClick={() => {
                  setPhotoFile(null);
                  if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                  }
                  setPhotoPreview(null);
                }}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3">
              <button
                disabled={!photoFile || uploading}
                onClick={handleUploadPhoto}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
            {profile?.profile_photo && (
  <div className="mt-2">
    <button
      onClick={handleRemovePhoto}
      className="px-3 py-1 bg-red-50 text-red-600 border border-red-200
                 rounded-lg text-xs font-bold hover:bg-red-100"
    >
      Remove Photo
    </button>
  </div>
)}

          </div>
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="text-center relative z-10">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-indigo-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-white"
                    strokeDasharray={`${profileCompletion} ${100 - profileCompletion}`}

                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black">{profileCompletion}%</span>

                </div>
              </div>
             <h3 className="text-base font-bold">
  Profile Completion Status
</h3>

<p className="text-indigo-200 text-xs mb-3">
  Your profile is {profileCompletion}% complete
</p>

             

            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Missing Info
            </h4>
           <div className="space-y-2">
 {profileCompletion === 100 ? (
  <div className="text-xs text-green-600 font-bold">
    🎉 Profile fully completed
  </div>
) : (

    missingProfileFields.map((item) => (
      <div
        key={item.key}
        onClick={() => setExpandedSection("profile")}
        className="flex items-center justify-between p-2 bg-white
                   border border-gray-200 rounded hover:border-indigo-300
                   cursor-pointer transition-all"
      >
        <span className="text-xs font-bold text-gray-600">
          {item.label}
        </span>
        <ArrowRight size={12} className="text-indigo-500" />
      </div>
    ))
  )}
</div>

          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2 space-y-6">

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
              id="fullName"
                type="text"
                defaultValue={fullName}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
              id="email"
                type="email"
                defaultValue={profile?.email ?? ''}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Mobile Number
  </label>
  <input
    id="mobile_number"
    type="tel"
    defaultValue={profile?.mobile_number || ""}
    placeholder="Mobile Number"
    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700"
  />
</div>
<div>
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Date of Birth
  </label>
  <input
    id="dob"
    type="date"
    defaultValue={profile?.dob || ""}
    className="w-full p-3 bg-gray-50 border border-gray-200
               rounded-lg text-sm font-bold text-gray-700
               focus:bg-white focus:ring-2 focus:ring-indigo-500
               outline-none transition-all"
  />
</div>

{/* 🌍 Current Residency */}
<div className="md:col-span-2 mt-4">
  <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">
    Current Residency
  </label>

  {/* COUNTRY (read-only) */}
  <div
    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg
               text-sm font-bold text-gray-700 cursor-not-allowed"
  >
    {profile?.country_of_residence || "India"}
  </div>
{/* 🌍 STATE + CITY (ONLY IF ABROAD) */}
{profile?.country_of_residence !== "India" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">

    {/* ===== STATE ===== */}
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">
        State / Province
      </label>

      <Listbox
        value={stateAbroad}
        onChange={(value) => {
          setStateAbroad(value);
          setCityAbroad("");
        }}
      >
        <div className="relative">
          <Listbox.Button
            className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                       rounded-lg flex justify-between items-center
                       text-sm font-semibold"
          >
            <span>{stateAbroad || "Select State / Province"}</span>
            <ChevronDown size={18} />
          </Listbox.Button>

          <Listbox.Options
            className="absolute z-50 mt-1 w-full bg-white
                       border border-gray-300 rounded-lg
                       shadow-lg max-h-60 overflow-auto text-sm"
          >
            {countryConfig?.map((s) => (
              <Listbox.Option
                key={s.name}
                value={s.name}
                className="cursor-pointer px-3 py-2 hover:bg-gray-100"
              >
                {s.name}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>

    {/* ===== CITY ===== */}
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">
        City
      </label>

      <Listbox
        value={cityAbroad}
        onChange={setCityAbroad}
        disabled={!stateAbroad}
      >
        <div className="relative">
          <Listbox.Button
            className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                       rounded-lg flex justify-between items-center
                       text-sm font-semibold disabled:bg-gray-100"
          >
            <span>{cityAbroad || "Select City"}</span>
            <ChevronDown size={18} />
          </Listbox.Button>

          <Listbox.Options
            className="absolute z-50 mt-1 w-full bg-white
                       border border-gray-300 rounded-lg
                       shadow-lg max-h-60 overflow-auto text-sm"
          >
            {countryConfig
              ?.find((s) => s.name === stateAbroad)
              ?.cities.map((city) => (
                <Listbox.Option
                  key={city}
                  value={city}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                >
                  {city}
                </Listbox.Option>
              ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>

  </div>
)}


</div>

{/* 📍 Address Details */}
<div className="md:col-span-2 mt-4 ">
  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
   Indian Address 
  </h4>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    {/* State */}
   {/* ===== STATE ===== */}
<Listbox
  value={indianState}
  onChange={(value) => {
    setIndianState(value);
    setDistrict("");
    setAssembly("");
    setMandal("");
  }}
>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {indianState || "Select State"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {["Andhra Pradesh", "Telangana"].map((state) => (
        <Listbox.Option
          key={state}
          value={state}
          className={({ active }) =>
            `cursor-pointer px-3 py-2 ${
              active ? "bg-gray-100 text-gray-900" : "text-gray-900"
            }`
          }
        >
          {state}
        </Listbox.Option>
      ))}
    </Listbox.Options>
  </div>
</Listbox>


    {/* District */}
{/* District (Mobile Friendly) */}
<div className="relative">
  <Listbox
    value={district}
    onChange={(value) => {
      setDistrict(value);
      setAssembly("");
      setMandal("");
    }}
  >
    {/* Button */}
    <Listbox.Button
  className="
     w-full h-11 px-3
    bg-gray-50 border border-gray-300 rounded-lg
    text-left text-[16px] md:text-sm font-semibold text-gray-900
    flex items-center justify-between
    focus:bg-white focus:ring-2 focus:ring-indigo-500
    outline-none
  "
>
  <span className="truncate">
    {district || "Select District"}
  </span>

  <ChevronDown
    size={18}
    className="text-gray-500 shrink-0"
  />
</Listbox.Button>


    {/* Dropdown Options */}
    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-200
        shadow-lg
        text-sm
      "
    >
      {indianState &&
        indianAddressData[indianState]?.map((d) => (
          <Listbox.Option
            key={d.name}
            value={d.name}
            className={({ active }) =>
              `cursor-pointer px-3 py-2 ${
                active
                  ? "bg-indigo-100 text-indigo-900"
                  : "text-gray-900"
              }`
            }
          >
            {d.name}
          </Listbox.Option>
        ))}
    </Listbox.Options>
  </Listbox>
</div>


    {/* Assembly */}
{/* ===== ASSEMBLY ===== */}
<Listbox
  value={assembly}
  onChange={(value) => {
    setAssembly(value);
    setMandal("");
  }}
>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {assembly || "Select Assembly Constituency"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {indianState &&
        district &&
        indianAddressData[indianState]
          ?.find((d) => d.name === district)
          ?.constituencies.map((c) => (
            <Listbox.Option
              key={c.name}
              value={c.name}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active ? "bg-gray-100 text-gray-900" : "text-gray-900"
                }`
              }
            >
              {c.name}
            </Listbox.Option>
          ))}
    </Listbox.Options>
  </div>
</Listbox>


    {/* Mandal */}
  {/* ===== MANDAL ===== */}
<Listbox value={mandal} onChange={setMandal}>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {mandal || "Select Mandal"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {indianState &&
        district &&
        assembly &&
        indianAddressData[indianState]
          ?.find((d) => d.name === district)
          ?.constituencies.find((c) => c.name === assembly)
          ?.mandals.map((m) => (
            <Listbox.Option
              key={m}
              value={m}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active ? "bg-gray-100 text-gray-900" : "text-gray-900"
                }`
              }
            >
              {m}
            </Listbox.Option>
          ))}
    </Listbox.Options>
  </div>
</Listbox>

 
  </div>
</div>
          </div>  


          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider">
              Professional & Social
            </h4>

<div className="mb-4">
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Professional Category
  </label>

  <Listbox
    value={profession}
    onChange={(value) => {
      setProfession(value);
      setRoleDesignation(""); // reset role when category changes
    }}
  >
    <div className="relative">
      <Listbox.Button className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-between text-sm font-semibold">
        <span>{profession || "Select Category"}</span>
        <ChevronDown size={18} />
      </Listbox.Button>

      <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
        {["Job", "Business", "Student"].map((opt) => (
          <Listbox.Option
            key={opt}
            value={opt}
            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
          >
            {opt}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>
<div className="mb-4">
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Role / Designation
  </label>

  <Listbox
    value={roleDesignation}
    onChange={setRoleDesignation}
    disabled={!profession}
  >
    <div className="relative">
      <Listbox.Button
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   flex items-center justify-between text-sm font-semibold
                   disabled:opacity-50"
      >
        <span>{roleDesignation || "Select Role"}</span>
        <ChevronDown size={18} />
      </Listbox.Button>

      <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
        {(roleOptions[profession] || []).map((role) => (
          <Listbox.Option
            key={role}
            value={role}
            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
          >
            {role}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>

            {/* Social Media Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Facebook className="absolute left-3 top-3 text-blue-600" size={16} />
                <input
                id="facebook"
                  type="text"
                  defaultValue={profile?.facebook_id ?? ''}
                  placeholder="Facebook Profile URL / ID"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-3 top-3 text-black" size={16} />
                <input
                id="twitter"
                  type="text"
                  defaultValue={profile?.twitter_id ?? ''}
                  placeholder="X (Twitter) Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 text-blue-700" size={16} />
                <input
                id="linkedin"
                  type="text"
                  defaultValue={profile?.linkedin_id ?? ''}
                  placeholder="LinkedIn Profile URL"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 text-pink-600" size={16} />
                <input
                id="instagram"
                  type="text"
                  defaultValue={profile?.instagram_id ?? ''}
                  placeholder="Instagram Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

<div className="mt-6">
  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
    I want to contribute via:
  </h4>

  <div className="flex flex-wrap gap-2">
    {contributionTypes.map((opt) => {
      console.log(
        "OPT ID:", opt.id,
        "SELECTED:", selectedContributions
      );

      return (
        <label
          key={opt.id}
          className="flex items-center gap-2 px-3 py-2
                     border border-gray-200 rounded-lg cursor-pointer
                     hover:border-indigo-500 hover:bg-indigo-50"
        >
          <input
            type="checkbox"
            checked={selectedContributions.includes(Number(opt.id))}
            onChange={(e) =>
              toggleContribution(Number(opt.id), e.target.checked)
            }
          />
          <span className="text-xs font-bold">{opt.name}</span>
        </label>
      );
    })}
  </div>
</div>



          <div className="flex justify-end pt-2">
            <button
  onClick={handleSaveProfile}
              className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-black transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Check size={14} /> Save Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReferralsContent = () => (
    <div className="pt-4">
      {/* Top Row */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div>
          <h4 className="font-black text-xl mb-1">Refer & Earn</h4>
          <p className="text-emerald-100 text-xs max-w-md">
            Share your unique link. Top referrers get exclusive meeting invites with party
            leadership.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
          <code className="text-xs font-mono text-white px-2 truncate max-w-[200px]">
            {referralLink}
          </code>
          <button
            onClick={() => {
              navigator.clipboard
                ?.writeText(referralLink)
                .then(() => showToast('Referral Link Copied!'))
                .catch(() => showToast('Could not copy link', 'info'));
            }}
            className="bg-white text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tables - SCROLLABLE for large lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Active Referrals
            </h4>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              {activeReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {activeReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No active referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Passive Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Passive Tree
            </h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              {passiveReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {passiveReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No passive referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {passiveReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

const renderConnectContent = () => {
  // 🔹 Flatten leadersByRole → single array with role included
  const flatLeaders = Object.entries(leadersByRole).flatMap(
    ([role, leaders]) =>
      leaders.map((leader) => ({
        ...leader,
        role,
      }))
  );

  const colorClasses = [
    { text: "text-purple-600", border: "border-purple-200" },
    { text: "text-blue-600", border: "border-blue-200" },
    { text: "text-emerald-600", border: "border-emerald-200" },
    { text: "text-orange-600", border: "border-orange-200" },
  ];

  return (
    <div className="pt-4">
      {flatLeaders.length === 0 ? (
        <div className="text-xs text-gray-500">
          No leadership contacts configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {flatLeaders.map((leader, idx) => {
            const colors = colorClasses[idx % colorClasses.length];

            return (
              <div
                key={leader.id}
                className={`bg-white border ${colors.border}
                rounded-xl p-4 flex flex-col items-center text-center
                shadow-sm hover:shadow-md transition-all`}
              >
                {/* ROLE */}
                <span
                  className={`text-[9px] font-black uppercase tracking-widest mb-1 ${colors.text}`}
                >
                  {leader.role}
                </span>

                {/* AVATAR */}
                <div
                  className="w-16 h-16 rounded-full bg-gray-100
                             border border-gray-300 flex items-center
                             justify-center mb-3"
                >
                  <span className="text-lg font-black text-gray-600">
                    {leader.name?.charAt(0) || "L"}
                  </span>
                </div>

                {/* NAME */}
                <h4 className="text-sm font-bold text-gray-900 mb-4">
                  {leader.name || "Leader"}
                </h4>

                {/* WHATSAPP BUTTON */}
                <button
                  onClick={() => {
                    if (!leader.whatsapp_number) {
                      showToast("WhatsApp contact not available", "info");
                      return;
                    }

                    const phone = leader.whatsapp_number.replace(/\D/g, "");
                    window.open(`https://wa.me/${phone}`, "_blank");

                    showToast(
                      `Opening WhatsApp with ${leader.name}`,
                      "info"
                    );
                  }}
                  className="w-full py-2 rounded-lg bg-[#25D366]
                             hover:bg-[#20b85a] text-white font-bold
                             text-xs flex items-center justify-center
                             gap-1.5 transition-colors shadow-sm"
                >
                  <MessageSquare size={14} fill="white" /> WhatsApp
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SERVICE_UI = {
  student: {
    icon: <GraduationCap size={22} className="text-blue-600" />,
    bg: "bg-blue-50",
  },
  legal: {
    icon: <Scale size={22} className="text-purple-600" />,
    bg: "bg-purple-50",
  },
  career: {
    icon: <Briefcase size={22} className="text-orange-600" />,
    bg: "bg-orange-50",
  },
  local: {
    icon: <Users size={22} className="text-green-600" />,
    bg: "bg-green-50",
  },
};

const renderServicesContent = () => (
  <div className="pt-4">
    {/* ================= SERVICES GRID ================= */}
    {!selectedService ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
          const ui = SERVICE_UI[key as keyof typeof SERVICE_UI];

          return (
            <div
              key={key}
              onClick={() => {
                setSelectedService(key);
                setSelectedSub(null);
                setSelectedInner(null);
              }}
              className="bg-white border border-gray-200 rounded-2xl px-6 py-8
                         text-center cursor-pointer transition-all
                         hover:border-indigo-400 hover:shadow-md"
            >
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-2xl
                            flex items-center justify-center ${ui.bg}`}
              >
                {ui.icon}
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {cfg.label}
              </h3>

              <span className="text-[11px] font-bold text-gray-400 uppercase">
                Request Info →
              </span>
            </div>
          );
        })}
      </div>
    ) : (

      /* ================= REQUEST FORM ================= */
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">

        {/* BACK */}
        <button
          onClick={() => {
            setSelectedService(null);
            setSelectedSub(null);
            setSelectedInner(null);
          }}
          className="text-xs font-bold text-gray-500 mb-4"
        >
          ← Back to Services
        </button>

        <h3 className="text-lg font-black mb-6">
          {SERVICE_CONFIG[selectedService].label}
        </h3>

        {/* NAME + COUNTRY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <input
            value={fullName}
            disabled
            className="w-full p-3 bg-gray-100 border rounded-lg
                       text-xs font-bold"
          />
          <input
            value={profile?.country_of_residence || "India"}
            disabled
            className="w-full p-3 bg-gray-100 border rounded-lg
                       text-xs font-bold"
          />
        </div>

        {/* CATEGORY */}
       <div className="mb-4">
  <label className="text-xs font-bold block mb-2">
    Select Category
  </label>

  <Listbox
    value={selectedSub}
    onChange={(value) => {
      setSelectedSub(value);
      setSelectedInner(null);
    }}
  >
    <div className="relative">
      <Listbox.Button
        className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                   rounded-lg flex items-center justify-between
                   text-sm font-semibold"
      >
        <span className="truncate">
          {selectedSub || "Select Category"}
        </span>
        <ChevronDown size={18} className="text-gray-500" />
      </Listbox.Button>

      <Listbox.Options
        className="absolute z-50 mt-1 w-full max-h-56 overflow-auto
                   rounded-lg bg-white border border-gray-200
                   shadow-lg text-sm"
      >
        {Object.keys(SERVICE_CONFIG[selectedService].subs)
          .filter((sub) => sub !== selectedSub) // ⭐ same trick
          .map((sub) => (
            <Listbox.Option
              key={sub}
              value={sub}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active
                    ? "bg-indigo-100 text-indigo-900"
                    : "text-gray-900"
                }`
              }
            >
              {sub}
            </Listbox.Option>
          ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>


        {/* OPTION (ADDRESS-STYLE LISTBOX) */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Select Option
          </label>

          <Listbox
            value={selectedInner}
            onChange={setSelectedInner}
            disabled={!selectedSub}
          >
            <div className="relative">
              <Listbox.Button
                className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                           rounded-lg flex items-center justify-between
                           text-sm font-semibold disabled:bg-gray-100"
              >
                <span className="truncate">
                  {selectedInner || "Select Option"}
                </span>
                <ChevronDown size={18} className="text-gray-500" />
              </Listbox.Button>

              <Listbox.Options
                className="absolute z-50 mt-1 w-full max-h-56 overflow-auto
                           rounded-lg bg-white border border-gray-200
                           shadow-lg text-sm"
              >
                {selectedSub &&
                  SERVICE_CONFIG[selectedService].subs[selectedSub]
                    .filter((opt) => opt !== selectedInner) // ⭐ KEY LINE
                    .map((opt) => (
                      <Listbox.Option
                        key={opt}
                        value={opt}
                        className={({ active }) =>
                          `cursor-pointer px-3 py-2 ${
                            active
                              ? "bg-indigo-100 text-indigo-900"
                              : "text-gray-900"
                          }`
                        }
                      >
                        {opt}
                      </Listbox.Option>
                    ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* MESSAGE */}
        <textarea
          ref={serviceMessageRef}
          rows={4}
          className="w-full p-3 border rounded-lg text-xs mb-4"
          placeholder="Describe your requirement..."
        />

        {/* SUBMIT */}
        <button
          onClick={handleSubmitService}
          disabled={!selectedInner || submittingService}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg
                     text-xs font-bold disabled:opacity-60"
        >
          {submittingService ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    )}
  </div>
);


  
const renderEventsContent = () => (
  <div className="pt-4">
    {events.length === 0 ? (
      <div className="text-xs text-gray-500">No events or notifications.</div>
    ) : (
      events.map((event) => (
        <div
          key={event.id}
          className={`rounded-xl border p-4 mb-3 ${
            event.status === "Sent"
              ? "bg-red-50 border-red-200"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm text-gray-900">
              {event.title}
            </h4>
            <span className="text-[10px] font-bold text-gray-500">
              {formatDate(event.created_at)}
            </span>
          </div>

          {event.info && (
            <p className="text-xs text-gray-600 mt-1">
              {event.info}
            </p>
          )}

         
        </div>
      ))
    )}
  </div>
);

const renderSuggestionsContent = () => (
  <div className="pt-4">
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">

      {/* Title + Subtitle */}
      <div>
        <h3 className="text-sm font-black text-gray-800">
          Suggestions
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Share your ideas & feedback
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Name
        </label>
        <input
          value={fullName}
          disabled
          className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg
                     text-sm font-bold text-gray-600 cursor-not-allowed"
        />
      </div>

      {/* Country */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Country
        </label>
        <input
          value={profile?.country_of_residence || "India"}
          disabled
          className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg
                     text-sm font-bold text-gray-600 cursor-not-allowed"
        />
      </div>

      {/* Suggestion */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Your Suggestion
        </label>

        <textarea
          ref={suggestionRef}
          rows={4}
          className="w-full p-3 bg-white border border-gray-300 rounded-lg
                     text-sm outline-none focus:ring-2 focus:ring-indigo-500
                     resize-none"
          placeholder="Write your suggestion here..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmitSuggestion}
          disabled={submittingSuggestion}
          className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold
                     rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {submittingSuggestion ? "Submitting..." : "Submit Suggestion"}
        </button>
      </div>

    </div>
  </div>
);


  //  NOTIFICATIONS DISABLED
// const renderNotificationsContent = () => (
//   <div className="pt-4 ">
//     <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
//       {notifications.length === 0 ? (
//         <div className="p-4 text-xs text-gray-500">No notifications yet.</div>
//       ) : (
//         notifications.map((n) => (
//           <div key={n.id}>{n.title}</div>
//         ))
//       )}
//     </div>
//   </div>
// );

  // Reusable Accordion Item
  const AccordionItem = ({
    id,
    title,
    icon,
    content,
    summary,
    color,
  }: {
    id: SectionKey;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
    summary?: React.ReactNode;
    color: string;
  }) => {
    const isOpen = expandedSection === id;

    return (
    <div
  className={`
    mb-3 rounded-xl border overflow-hidden group
    ${isOpen
      ? 'bg-white border-gray-300 shadow-xl ring-1 ring-black/5 z-10'
      : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'}
  `}
>


        {/* Header Bar */}
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 outline-none transition-colors relative overflow-hidden"
        >
          {/* Background highlighting on hover/active */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isOpen ? 'bg-gray-50/80' : 'bg-white group-hover:bg-gray-50'
            }`}
          ></div>

          <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
            {/* Icon Box */}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0
                ${isOpen ? color + ' text-white shadow-md' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}
            `}
            >
              {icon}
            </div>

            {/* Title & Summary Container */}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span
                className={`text-sm font-black tracking-tight transition-colors ${
                  isOpen ? 'text-gray-900 text-base' : 'text-gray-700'
                }`}
              >
                {title}
              </span>

              {/* Summary (Fade out when open, Fade in when closed) */}
              <div
                className={`transition-all duration-300 origin-top w-full ${
                  isOpen ? 'h-0 opacity-0 scale-y-0 hidden' : 'h-auto opacity-100 scale-y-100 block'
                }`}
              >
                {summary}
              </div>
            </div>
          </div>

          {/* Chevron */}
          <div
            className={`
            w-6 h-6 rounded-full flex items-center justify-center ml-3 transition-all duration-300 shrink-0 relative z-10
            ${isOpen ? 'bg-gray-200 text-gray-800 rotate-180' : 'text-gray-400'}
          `}
          >
            <ChevronDown size={16} />
          </div>
        </button>

        
        {/* Expanded Content Body */}
<div
  className={`px-4 pb-6 sm:px-6 border-t border-gray-100 bg-white
    ${isOpen ? "block" : "hidden"}
  `}
>
  {content}
</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col font-sans bg-gray-100/95 backdrop-blur-sm">

      {/* Toast Notification */}
      {toast && (
        <div
       className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${
  toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-blue-600 text-white'
}`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
          <span className="text-xs font-bold uppercase tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-white border-b border-gray-200 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ysrcp-blue rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
            YSRC
          </div>
          <div>
      <h1 className="font-black text-lg text-gray-900 tracking-tight leading-none">
  {profile?.profession
    ? `${profile.profession} Dashboard`
    : "My Portal"}
</h1>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">
              ● {loadingDashboard ? 'Syncing…' : 'Online'}
            </p>
          </div>
        </div>
       <div className="flex items-center gap-2">
 {/* Logout - MOBILE */}
<button
  onClick={async () => {
    await signOut();
    window.location.href = "/";
  }}
  title="Logout"
  className="flex sm:hidden w-9 h-9 items-center justify-center
             text-red-600 bg-white border border-red-200 rounded-full
             hover:bg-red-50 hover:border-red-300 hover:text-red-700
             transition-all shadow-sm"
>
  <LogOut size={16} />
</button>

{/* Logout - DESKTOP */}
<button
  onClick={async () => {
    await signOut();
    window.location.href = "/";
  }}
  className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide
             text-red-600 bg-white border border-red-200 rounded-lg
             hover:bg-red-50 hover:border-red-300 hover:text-red-700
             transition-all shadow-sm"
>
  <LogOut size={14} />
  Logout
</button>


 
</div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-10 ">

        <div className="max-w-7xl mx-auto pb-20">
          <AccordionItem
            id="profile"
            title="Complete Profile"
            summary={renderProfileSummary()}
            icon={<User size={20} />}
            content={renderProfileContent()}
            color="bg-indigo-600"
          />

          <AccordionItem
            id="referrals"
            title="My Network"
            summary={renderReferralsSummary()}
            icon={<Users size={20} />}
            content={renderReferralsContent()}
            color="bg-emerald-600"
          />

          <AccordionItem
            id="connect"
            title="Leadership Connect"
            summary={renderConnectSummary()}
            icon={<MessageSquare size={20} />}
            content={renderConnectContent()}
            color="bg-blue-600"
          />

          <AccordionItem
            id="services"
            title="Services Hub"
            summary={renderServicesSummary()}
            icon={<Briefcase size={20} />}
            content={renderServicesContent()}
            color="bg-amber-500"
          />
<AccordionItem
  id="events"
  title={
    <span className="inline-flex items-center gap-2">
      <span>Events & Notifications</span>

      {hasNewEvents && !eventsSeen && (
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
      )}
    </span>
  }
  summary={renderEventsSummary()}
  icon={<Calendar size={20} />}
  content={renderEventsContent()}
  color="bg-pink-600"
/>



{/*  NOTIFICATIONS DISABLED
<AccordionItem
  id="notifications"
  title="Notifications"
  summary={renderNotificationsSummary()}
  icon={<Bell size={20} />}
  content={renderNotificationsContent()}
  color="bg-red-500"
/>
*/}

<AccordionItem
  id="suggestions"
  title="Suggestions"
  icon={<MessageSquare size={20} />}
  content={renderSuggestionsContent()}
  color="bg-indigo-600"
/>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useMemo ,useRef} from 'react';
import { Listbox } from "@headlessui/react";
//Coontry → States → Cities
const countryData: Record<
  string,
  { name: string; cities: string[] }[]
> = {
  USA: [
    { name: 'California', cities: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'] },
    { name: 'Texas', cities: ['Houston', 'Dallas', 'Austin', 'San Antonio'] },
  ],
  UK: [
    { name: 'England', cities: ['London', 'Manchester', 'Liverpool'] },
    { name: 'Scotland', cities: ['Edinburgh', 'Glasgow'] },
  ],
  Canada: [
    { name: 'Ontario', cities: ['Toronto', 'Ottawa'] },
    { name: 'British Columbia', cities: ['Vancouver', 'Surrey'] },
  ],
  UAE: [
    { name: 'Dubai', cities: ['Dubai City', 'Jumeirah', 'Deira'] },
    { name: 'Abu Dhabi', cities: ['Abu Dhabi City', 'Al Ain'] },
  ],
Singapore: [
  {
    name: "Central Region",
    cities: [
      "Orchard",
      "Marina Bay",
      "CBD",
      "Tiong Bahru",
      "Bukit Timah",
      "Novena",
      "Bishan",
      "Toa Payoh",
    ],
  },
  {
    name: "East Region",
    cities: [
      "Tampines",
      "Pasir Ris",
      "Bedok",
      "Changi",
      "Simei",
    ],
  },
  {
    name: "West Region",
    cities: [
      "Jurong East",
      "Jurong West",
      "Bukit Batok",
      "Bukit Panjang",
      "Clementi",
    ],
  },
  {
    name: "North Region",
    cities: [
      "Woodlands",
      "Yishun",
      "Sembawang",
      "Admiralty",
    ],
  },
  {
    name: "North-East Region",
    cities: [
      "Hougang",
      "Sengkang",
      "Punggol",
      "Serangoon",
    ],
  },
],


  Netherlands: [
  {
    name: "North Holland",
    cities: ["Amsterdam", "Haarlem", "Zaandam"],
  },
  {
    name: "South Holland",
    cities: ["Rotterdam", "The Hague", "Leiden"],
  },
  {
    name: "Utrecht",
    cities: ["Utrecht", "Amersfoort"],
  },
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
const SERVICE_CONFIG = {
  student: {
    label: "Student Support",
    subs: {
      "Education Guidance": [
        "Course Selection",
        "University Shortlisting",
        "Scholarship Assistance",
      ],
      "Visa Support": [
        "Student Visa",
        "Documentation Review",
        "Interview Preparation",
      ],
    },
  },

  legal: {
    label: "Legal Advisor",
    subs: {
      "Immigration Law": [
        "PR / Citizenship",
        "Visa Extension",
      ],
      "Property Issues": [
        "Land Dispute",
        "Registration Help",
      ],
    },
  },

  career: {
    label: "Career Coach",
    subs: {
      "Job Support": [
        "Resume Review",
        "Interview Preparation",
      ],
      "Career Switch": [
        "IT Transition",
        "Skill Roadmap",
      ],
    },
  },

  local: {
    label: "Local Connector",
    subs: {
      "Community Help": [
        "Local Events",
        "Volunteer Groups",
      ],
      "Government Services": [
        "Certificates",
        "Office Guidance",
      ],
    },
  },
};

import {
  User,
  Users,
  Calendar,
  MessageSquare,
  Bell,
  MapPin,
  ChevronDown,
  LogOut,
  Briefcase,
  GraduationCap,
  Scale,
  Check,
  ArrowRight,
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';


type SectionKey =
  | 'profile'
  | 'referrals'
  | 'connect'
  | 'services'
  | 'events'
 // | 'notifications'
  | 'suggestions';


type Referral = {
  id: number;
  member_name: string;
  location: string | null;
  type: 'active' | 'passive';
  created_at: string;
};
type LeaderAssignmentRow = {
  role: string;
  sort_order: number | null;
  leaders_master: {
    id: string;
    name: string;
    whatsapp_number: string | null;
    is_active: boolean;   
  };
};


type EventItem = {
  id: string;          // uuid
  title: React.ReactNode;

  info: string | null; // admin message
  status: string;      // Draft | Sent
  created_at: string;
};



// NOTIFICATIONS DISABLED
// type NotificationItem = {
//   id: number;
//   title: string;
//   body: string | null;
//   created_at: string;
//   is_read: boolean;
// };

const Dashboard: React.FC = () => {
  const { user, refreshProfile, profile, signOut } = useAuth();
// ---------------- AUTH GUARD (AFTER HOOKS) ----------------
if (!user) {
  window.location.replace("/");
  return null;
}
  const [expandedSection, setExpandedSection] =
    useState<SectionKey | null>("profile");
    const [eventsSeen, setEventsSeen] = useState(false);
 const [selectedService, setSelectedService] = useState<string | null>(null);
const [selectedSub, setSelectedSub] = useState<string | null>(null);
const [selectedInner, setSelectedInner] = useState<string | null>(null);
  useEffect(() => {
    setSelectedSub(null);
    setSelectedInner(null);
  }, [selectedService]);
  const [activeReferralCount, setActiveReferralCount] = useState<number>(0);

  const [submittingService, setSubmittingService] = useState(false);
const [contributionTypes, setContributionTypes] = useState<
  { id: number; name: string }[]
>([]);

const [selectedContributions, setSelectedContributions] = useState<number[]>([]);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info";
  } | null>(null);

// ✅ FIXED: ACTIVE REFERRAL COUNT (USES profile.id)
useEffect(() => {
  if (!profile?.id) return;

  const fetchReferralCount = async () => {
    const { count, error } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", profile.id); // ✅ CORRECT KEY

    if (error) {
      console.error("Referral count error:", error);
      return;
    }

    setActiveReferralCount(count ?? 0);
  };

  fetchReferralCount();
}, [profile?.id]);

const normalizedCountry = profile?.country_of_residence
  ?.trim()
  .toLowerCase();
const countryConfig = useMemo(() => {
  if (!normalizedCountry) return undefined;

  return Object.entries(countryData).find(
    ([key]) => key.toLowerCase() === normalizedCountry
  )?.[1];
}, [normalizedCountry]);


const normalizeDistrict = (value: string) => {
  return value.replace(/district/i, "").trim();
};

const normalizeMandal = (value: string) => {
  return value.replace(/mandal/i, "").trim();
};

const normalizeAssembly = (value: string) => {
  return value.replace(/assembly constituency|ac/i, "").trim();
};

// ---------------- CONTRIBUTIONS ----------------
const toggleContribution = async (
  contributionTypeId: number,
  checked: boolean
) => {
  if (!user) return;

  if (checked) {
    // Optimistic UI update
    setSelectedContributions((prev) => [
      ...prev,
      contributionTypeId,
    ]);

    const { error } = await supabase
      .from("user_contributions")
      .insert({
        user_id: user.id,
        contribution_type_id: contributionTypeId,
      });

    if (error) {
      console.error("Insert error:", error);
      // rollback
      setSelectedContributions((prev) =>
        prev.filter((id) => id !== contributionTypeId)
      );
    }
  } else {
    // Optimistic UI update
    setSelectedContributions((prev) =>
      prev.filter((id) => id !== contributionTypeId)
    );

    const { error } = await supabase
      .from("user_contributions")
      .delete()
      .eq("user_id", user.id)
      .eq("contribution_type_id", contributionTypeId);

    if (error) {
      console.error("Delete error:", error);
      // rollback
      setSelectedContributions((prev) => [
        ...prev,
        contributionTypeId,
      ]);
    }
  }
};

const roleOptions: Record<string, string[]> = {
  Job: [
    "Software Engineer",
    "Manager",
    "Doctor",
    "Teacher",
    "Government Employee",
    "Private Employee",
    "Other",
  ],
  Business: [
    "Founder",
    "Co-Founder",
    "Partner",
    "Entrepreneur",
    "Self Employed",
    "Other",
  ],
  Student: [
    "School Student",
    "Undergraduate",
    "Postgraduate",
    "Research Scholar",
    "Other",
  ],
};


  // ---------------- PHOTO UPLOAD STATE ----------------
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [countryOfResidence, setCountryOfResidence] = useState("India");
const [stateAbroad, setStateAbroad] = useState("");
const [cityAbroad, setCityAbroad] = useState("");

  const [indianState, setIndianState] = useState("");
const [district, setDistrict] = useState("");
const [assembly, setAssembly] = useState("");
const [mandal, setMandal] = useState("");
const [profession, setProfession] = useState<string>(
  profile?.profession || ""
);
const [roleDesignation, setRoleDesignation] = useState<string>(
  profile?.role_designation || ""
);
useEffect(() => {
  if (profile?.role_designation) {
    setRoleDesignation(profile.role_designation);
  }
}, [profile?.role_designation]);

useEffect(() => {
  if (profile?.profession) {
    setProfession(profile.profession);
  }
}, [profile?.profession]);
useEffect(() => {
  if (!user) return;
 


  const loadContributions = async () => {
    // Load contribution options
    const { data: types } = await supabase
      .from("contribution_types")
      .select("id, name")
      .order("id");

    setContributionTypes(types || []);

    // Load user's selections
    const { data: userContribs } = await supabase
      .from("user_contributions")
      .select("contribution_type_id")
      .eq("user_id", user.id);

    setSelectedContributions(
      (userContribs || []).map((c) => c.contribution_type_id)
    );
  };

  loadContributions();
}, [user]);
useEffect(() => {
  if (!profile) return;

  setCountryOfResidence(profile.country_of_residence || "India");

  if (profile.country_of_residence !== "India") {
    setStateAbroad(profile.state_abroad || "");
    setCityAbroad(profile.city_abroad || "");
  } else {
    setStateAbroad("");
    setCityAbroad("");
  }
}, [profile]);


useEffect(() => {
  if (!profile) return;

  setIndianState(profile.indian_state?.trim() || "");

  setDistrict(
    profile.district
      ? normalizeDistrict(profile.district)
      : ""
  );

  setAssembly(
    profile.assembly_constituency
      ? normalizeAssembly(profile.assembly_constituency)
      : ""
  );

  setMandal(
    profile.mandal
      ? normalizeMandal(profile.mandal)
      : ""
  );
}, [profile]);

  // ---------------- DYNAMIC DATA ----------------
  const [activeReferrals, setActiveReferrals] = useState<Referral[]>([]);
  const [passiveReferrals, setPassiveReferrals] = useState<Referral[]>([]);
  const [leadersByRole, setLeadersByRole] = useState<
  Record<
    string,
    {
      id: string;
      name: string;
      whatsapp_number: string | null;
    }[]
  >
>({});


  const [events, setEvents] = useState<EventItem[]>([]);
  //const [notifications, setNotifications] =
    //useState<NotificationItem[]>([]);

  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const serviceMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestionRef = useRef<HTMLTextAreaElement | null>(null);

 // ---------------- REFERRAL STATS ----------------
  const referralStats = useMemo(() => {
    const active = activeReferrals.length;
    const passive = passiveReferrals.length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const createdThisWeek = [...activeReferrals, ...passiveReferrals].filter(
      (r) => new Date(r.created_at) >= weekAgo
    ).length;

    return {
      active,
      passive,
      newThisWeek: createdThisWeek,
    };
  }, [activeReferrals, passiveReferrals]);

  // ---------------- TOAST ----------------
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (
    msg: string,
    type: "success" | "info" = "success"
  ) => {
    setToast({ msg, type });
  };
const toggleSection = (section: SectionKey) => {
  setExpandedSection((prev) => {
    const next = prev === section ? null : section;

    if (section === "events") {
      setEventsSeen(true); // 👁 user opened Events
    }

    return next;
  });
};

const handleSubmitService = async () => {
  const message = serviceMessageRef.current?.value.trim();

  if (!selectedService || !selectedSub || !selectedInner) {
    showToast("Please complete service selection", "info");
    return;
  }

  if (!message) {
    showToast("Please describe your requirement", "info");
    return;
  }

  if (!user) return;

  try {
    setSubmittingService(true);

    const { error } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        applicant_name: fullName,
        current_location: profile?.country_of_residence || "India",
        service_type: selectedService,
        service_category: selectedSub,
        service_option: selectedInner,
        description: message,
        status: "pending",
      });

    if (error) throw error;

    serviceMessageRef.current!.value = "";
    setSelectedService(null);
    setSelectedSub(null);
    setSelectedInner(null);

    showToast("Service request submitted successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to submit request", "info");
  } finally {
    setSubmittingService(false);
  }
};





const handleRemovePhoto = async () => {
  if (!user || !profile?.profile_photo) {
    showToast("No profile photo to remove", "info");
    return;
  }

  try {
    // Extract storage path from public URL
    const filePath = profile.profile_photo.split(
      "/storage/v1/object/public/profile-photos/"
    )[1];

    if (!filePath) {
      showToast("Invalid photo path", "info");
      return;
    }

    // 1️⃣ Remove from storage
    const { error: storageError } = await supabase.storage
      .from("profile-photos")
      .remove([filePath]);

    if (storageError) throw storageError;

    // 2️⃣ Remove from DB
    const { error: dbError } = await supabase
      .from("profiles")
      .update({ profile_photo: null })
      .eq("id", user.id);

    if (dbError) throw dbError;

    // 3️⃣ Update UI
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);

    await refreshProfile();
    showToast("Profile photo removed", "success");
  } catch (err) {
    console.error("Remove photo error:", err);
    showToast("Failed to remove photo", "info");
  }
};

  // Photo handlers
  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !user) {
      showToast('No file selected or user not available', 'info');
      return;
    }

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `profile-photos/${user.id}_${Date.now()}.${fileExt}`;
     const { error: uploadError } = await supabase.storage
  .from('profile-photos')
  .upload(filePath, photoFile, { upsert: true });

if (uploadError) {
  console.error('Storage upload error', uploadError);
  throw uploadError;
}

// ✔ Correct Supabase v2 syntax
const { data: publicUrlData } = supabase.storage
  .from('profile-photos')
  .getPublicUrl(filePath);

const publicUrl = publicUrlData.publicUrl;

// Save public URL in DB
const { error: updateError } = await supabase
  .from('profiles')
  .update({ profile_photo: publicUrl })
  .eq('id', user.id);


      if (updateError) {
        console.error('Profile update error', updateError);
        throw updateError;
      }

      await refreshProfile();
      showToast('Profile photo updated', 'success');

      setPhotoFile(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
      }
      setPhotoPreview(null);
    } catch (err: any) {
      console.error('Upload error', err);
      const msg = err?.message || err?.error_description || 'Upload failed';
      showToast(msg, 'info');
    } finally {
      setUploading(false);
    }
  };

  /// Fetch dashboard data from Supabase
useEffect(() => {
  if (!user) return;

  const loadDashboard = async () => {
    setLoadingDashboard(true);

    try {

// ---------------- ACTIVE REFERRALS ----------------
const { data: activeData, error: activeError } = await supabase
  .from("referrals")
  .select(`
    id,
    created_at,
    source,
    profiles:referred_id (
      first_name,
      last_name,
      country_of_residence
    )
  `)
  .eq("referrer_id", profile.id)
  .in("source", ["direct", "active"])
  .order("created_at", { ascending: false });

if (activeError) {
  console.error("Active referral error:", activeError);
}

setActiveReferrals(
  (activeData || []).map((r: any) => {
    const first = r.profiles?.first_name ?? "";
    const last = r.profiles?.last_name ?? "";

    return {
      id: r.id,
      member_name: last && last !== first ? `${first} ${last}` : first,
      location: r.profiles?.country_of_residence ?? "—",
      type: "active",
      created_at: r.created_at,
    };
  })
);


// ---------------- PASSIVE REFERRALS ----------------
const { data: passiveData, error: passiveError } = await supabase
  .from("referrals")
  .select(`
    id,
    created_at,
    profiles:referred_id (
      first_name,
      last_name,
      country_of_residence
    )
  `)
  .eq("referrer_id", profile.id)
  .eq("source", "passive")
  .order("created_at", { ascending: false });

if (passiveError) {
  console.error("Passive referral error:", passiveError);
}

setPassiveReferrals(
  (passiveData || []).map((r: any) => {
    const first = r.profiles?.first_name ?? "";
    const last = r.profiles?.last_name ?? "";

    return {
      id: r.id,
      member_name: last && last !== first ? `${first} ${last}` : first,
      location: r.profiles?.country_of_residence ?? "—",
      type: "passive",
      created_at: r.created_at,
    };
  })
);

     // 2. Leaders (NEW NORMALIZED LOGIC)
    // 🔒 Clear leaders if district or assembly missing
if (!district || !assembly) {

  setLeadersByRole({});
  return;
}
// ✅ ADD THIS LOG HERE
console.log("LEADERS QUERY FILTERS", {
  district: normalizeDistrict(district),
  constituency: normalizeAssembly(assembly),
});
const { data, error } = await supabase
  .from("leader_assignments")
  .select(`
    role,
    sort_order,
    leaders_master (
      id,
      name,
      whatsapp_number,
      is_active
    )
  `)
  
  .eq("district", normalizeDistrict(district))
  .eq("constituency", normalizeAssembly(assembly))
  .eq("is_active", true) // leader_assignments.is_active
  .order("sort_order", { ascending: true });

if (error) {
  console.error("Leaders fetch error:", error);
  return;
}

const grouped = (data as LeaderAssignmentRow[]).reduce(
  (acc, item) => {
    if (!item.leaders_master?.is_active) return acc;

    if (!acc[item.role]) acc[item.role] = [];

    acc[item.role].push({
      id: item.leaders_master.id,
      name: item.leaders_master.name,
      whatsapp_number: item.leaders_master.whatsapp_number,
    });

    return acc;
  },
  {} as Record<
    string,
    { id: string; name: string; whatsapp_number: string | null }[]
  >
);

setLeadersByRole(grouped);




      // =======================
      // 3. EVENTS
      // =======================
  const { data: eventsData, error: eventsError } = await supabase
  .from("events")
  .select("id, title, info, status, created_at")
  .eq("status", "Sent")
  .order("created_at", { ascending: false });

if (eventsError) {
  console.error("Events fetch error:", eventsError);
} else {
  setEvents(eventsData as EventItem[]);
}


      // =======================
      // 4. NOTIFICATIONS
      // =======================
      //const { data: notifData } = await supabase
        //.from("notifications")
        //.select("*")
        //.eq("referrer_id", profile.id)

        //.order("created_at", { ascending: false });

      //if (notifData) setNotifications(notifData as NotificationItem[]);
    } finally {
      setLoadingDashboard(false);
    }
  };

  loadDashboard();
}, [user, profile,district, assembly]);

const isNewEvent = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);

  const diffHours =
    (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  return diffHours <= 24; // new if within 24 hours
};
const hasNewEvents = events.some(
  (e) => isNewEvent(e.created_at)
);

  // Helper to format dates like "Jan 12, 2025"
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getMonthDay = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { month: '', day: '' };
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      day: d.getDate().toString(),
    };
  };

const fullName = profile?.first_name
  ? profile.last_name && profile.last_name !== profile.first_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.first_name
  : "Member";


      // ======>Uncommet this after buying the domain==========
// const referralLink =
//   profile?.referral_code && profile?.first_name
//     ? `https://ysrcpnriwing.org/ref/${profile.first_name.toLowerCase()}/${profile.referral_code}`
//     : '';

const referralLink =
  profile?.referral_code && profile?.first_name
    ? `${window.location.origin}/ref/${profile.first_name.toLowerCase()}/${profile.referral_code}`
    : '';



 // const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  // ---------------- PROFILE COMPLETION & MISSING FIELDS ----------------
  // 🔹 Profile completion calculation
const profileCompletion = useMemo(() => {
  if (!profile) return 0;

  const TOTAL_SECTIONS = 8;
  let completed = 0;

  // 1️⃣ Name
  if (profile.first_name) completed++;

  // 2️⃣ Mobile
  if (profile.mobile_number) completed++;

  // 3️⃣ DOB
  if (profile.dob) completed++;

  // 4️⃣ Photo
  if (profile.profile_photo) completed++;

  // 5️⃣ Address
  const country = profile.country_of_residence?.toLowerCase();
  const isIndia = !country || country === "india";

 if (
  isIndia
    ? profile.indian_state &&
      profile.district &&
      profile.assembly_constituency &&
      profile.mandal
    : profile.state_abroad && profile.city_abroad
) {
  completed++;
}


  // 6️⃣ Profession + Role
  if (profile.profession && profile.role_designation) {
    completed++;
  }

  // 7️⃣ Socials (ALL REQUIRED)
  if (
    profile.facebook_id &&
    profile.twitter_id &&
    profile.linkedin_id &&
    profile.instagram_id
  ) {
    completed++;
  }

  // 8️⃣ Contribution (ONE required)
  if (Array.isArray(selectedContributions) && selectedContributions.length > 0) {
    completed++;
  }

  return Math.round((completed / TOTAL_SECTIONS) * 100);
}, [profile, selectedContributions]);

// 🔹 Missing profile fields detection

const missingProfileFields = useMemo(() => {
  if (!profile) return [];

  const missing: { key: string; label: string }[] = [];

  if (!profile.profile_photo)
    missing.push({ key: "photo", label: "Add Profile Photo" });

  if (!profile.mobile_number)
    missing.push({ key: "mobile", label: "Add Mobile Number" });
if (!profile.dob) {
  missing.push({
    key: "dob",
    label: "Add Date of Birth",
  });
}

  const country = profile.country_of_residence?.trim().toLowerCase();
  const isIndia = !country || country === "india";

  if (isIndia) {
    if (!profile.indian_state)
      missing.push({ key: "state", label: "Select State" });
    if (!profile.district)
      missing.push({ key: "district", label: "Select District" });
    if (!profile.assembly_constituency)
      missing.push({ key: "assembly", label: "Select Assembly" });
    if (!profile.mandal)
      missing.push({ key: "mandal", label: "Select Mandal" });
  }

  if (!profile.facebook_id)
    missing.push({ key: "facebook", label: "Add Facebook" });
  if (!profile.twitter_id)
    missing.push({ key: "twitter", label: "Add Twitter" });
  if (!profile.linkedin_id)
    missing.push({ key: "linkedin", label: "Add LinkedIn" });
  if (!profile.instagram_id)
    missing.push({ key: "instagram", label: "Add Instagram" });

  if (!profile.profession)
    missing.push({ key: "profession", label: "Select Profession" });

  if (!profile.role_designation)
    missing.push({ key: "role", label: "Select Role / Designation" });
// 🌍 Abroad State & City (for NRIs)
if (!isIndia) {
  if (!profile.state_abroad)
    missing.push({ key: "state_abroad", label: "Select Abroad State" });

  if (!profile.city_abroad)
    missing.push({ key: "city_abroad", label: "Select Abroad City" });
}

  // ✅ CONTRIBUTION CHECK
  if (!selectedContributions || selectedContributions.length === 0) {
    missing.push({
      key: "contribution",
      label: "Select Contribution Area",
    });
  }

  return missing;
}, [profile, selectedContributions]);


  // --- ENRICHED SUMMARY RENDERERS (Visible when Collapsed) ---

 const renderProfileSummary = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex-1 min-w-[200px]">
        <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
          <span>Profile Completion</span>
          {/* still static for now, you can compute this later from filled fields */}
          <span className="text-indigo-600">{profileCompletion}%</span>

        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
       <div
  className="h-full bg-indigo-600 rounded-full shadow-sm"
  style={{ width: `${profileCompletion}%` }}
></div>

        </div>
      </div>
      <div className="flex items-center gap-4 text-xs font-medium text-gray-500 sm:border-l sm:border-gray-200 sm:pl-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle size={14} className="text-green-500" />
          <span>Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <AlertCircle size={14} className="text-amber-500" />
          <span>Socials Pending</span>
        </div>
      </div>
    </div>
  );

  const renderReferralsSummary = () => (
    <div className="flex flex-wrap items-center gap-6 w-full mt-1 opacity-90">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-emerald-600 leading-none">
          {referralStats.active}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>
      <div className="w-px bg-gray-200 h-6 hidden sm:block"></div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black text-blue-600 leading-none">
          {referralStats.passive}
        </span>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Passive
          </span>
        </div>
      </div>
      <div className="flex-1 text-right hidden md:block">
        <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
          +{referralStats.newThisWeek} this week
        </span>
      </div>
    </div>
  ); 
const renderConnectSummary = () => {
  const allLeaders = Object.values(leadersByRole).flat();
  const firstRole = Object.keys(leadersByRole)[0];

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          {allLeaders.slice(0, 4).map((leader) => (
            <div
              key={leader.id}
              className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden"
            >
              <img
                src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(
                  leader.name || "Leader"
                )}`}
                alt={leader.name}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>

        <span className="text-xs font-bold text-gray-600">
          {firstRole || "Leadership Contacts"}{" "}
          {allLeaders.length > 1 ? `& ${allLeaders.length - 1} Others` : ""}
        </span>
      </div>
    </div>
  );
};


  const renderServicesSummary = () => (
    <div className="flex flex-wrap items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[10px] font-bold uppercase border border-blue-100">
          Student
        </span>
        <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-[10px] font-bold uppercase border border-purple-100">
          Legal
        </span>
        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded text-[10px] font-bold uppercase border border-amber-100">
          Career
        </span>
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase border border-emerald-100">
        Local Connector
      </span>
      </div>
    </div>
  );
const renderEventsSummary = () => {
  const latest = events[0];

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      {latest ? (
        <>
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-center min-w-[36px]">
              <span className="block text-[9px] font-black uppercase">
                {formatDate(latest.created_at)}
              </span>
            </div>
            <div>
              <span className="block text-xs font-bold text-gray-800">
                {latest.title}
              </span>
            </div>
          </div>
        
        </>
      ) : (
        <div className="text-xs text-gray-500">No updates yet.</div>
      )}
    </div>
  );
};


 //  NOTIFICATIONS DISABLED
// const renderNotificationsSummary = () => (
//   <div className="w-full mt-1 flex items-center justify-between opacity-90">
//     <div className="flex items-center gap-2">
//       <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
//         {unreadNotificationsCount}
//       </span>
//       <span className="text-xs text-gray-500 font-medium">
//         Unread updates
//       </span>
//     </div>
//   </div>
// );


const handleSaveProfile = async () => {
  if (!user) return;

  try {
    const fullName =
      (document.getElementById("fullName") as HTMLInputElement)?.value || "";

    const mobile_number =
      (document.getElementById("mobile_number") as HTMLInputElement)?.value || "";
const dob =
  (document.getElementById("dob") as HTMLInputElement)?.value || null;

    const facebook =
      (document.getElementById("facebook") as HTMLInputElement)?.value || "";

    const twitter =
      (document.getElementById("twitter") as HTMLInputElement)?.value || "";

    const linkedin =
      (document.getElementById("linkedin") as HTMLInputElement)?.value || "";

    const instagram =
      (document.getElementById("instagram") as HTMLInputElement)?.value || "";
const nameParts = fullName.trim().split(/\s+/);

const first_name = nameParts[0];
const last_name =
  nameParts.length > 1
    ? nameParts.slice(1).join(" ")
    : ""; 

   
const updates = {
  first_name,
  last_name,
  mobile_number,
  dob,
  profession,
  role_designation: roleDesignation,
  facebook_id: facebook,
  twitter_id: twitter,
  linkedin_id: linkedin,
  instagram_id: instagram,
  updated_at: new Date().toISOString(),

  // 🌍 Abroad (current residence)
  country_of_residence: profile?.country_of_residence || null,
  state_abroad: stateAbroad || profile?.state_abroad || null,
  city_abroad: cityAbroad || profile?.city_abroad || null,

  // 🇮🇳 Indian (permanent address)
  indian_state: indianState || profile?.indian_state || null,
  district: district || profile?.district || null,
  assembly_constituency: assembly || profile?.assembly_constituency || null,
  mandal: mandal || profile?.mandal || null,
};


    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      throw error;
    }

    await refreshProfile();
    showToast("Profile Updated Successfully!", "success");
  } catch (err) {
    console.error(err);
    showToast("Failed to update profile", "info");
  }
};


const handleSubmitSuggestion = async () => {
  const message = suggestionRef.current?.value.trim() || "";

  if (!message) {
    showToast("Please enter your suggestion", "info");
    return;
  }

  try {
    setSubmittingSuggestion(true);

    const { error } = await supabase.from("suggestions").insert({
      name: fullName,
      country: profile?.country_of_residence || "India",
      suggestion: message,
      suggestion_date: new Date().toISOString().split("T")[0], // ✅ CORRECT
    });

    if (error) throw error;

    if (suggestionRef.current) {
      suggestionRef.current.value = "";
    }

    showToast("Suggestion submitted successfully!", "success");
  } catch (err) {
    console.error("Suggestion error:", err);
    showToast("Failed to submit suggestion", "info");
  } finally {
    setSubmittingSuggestion(false);
  }
};



  // --- EXPANDED CONTENT RENDERERS ---

 
  const renderProfileContent = () => (
    <div className="pt-4 ">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Photo Block */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden bg-gray-100 mb-3">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  No Photo
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2">
              <label className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-lg cursor-pointer text-xs font-bold">
                Select
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
              </label>
              <button
                onClick={() => {
                  setPhotoFile(null);
                  if (photoPreview) {
                    URL.revokeObjectURL(photoPreview);
                  }
                  setPhotoPreview(null);
                }}
                className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-xs"
              >
                Cancel
              </button>
            </div>
            <div className="mt-3">
              <button
                disabled={!photoFile || uploading}
                onClick={handleUploadPhoto}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
            {profile?.profile_photo && (
  <div className="mt-2">
    <button
      onClick={handleRemovePhoto}
      className="px-3 py-1 bg-red-50 text-red-600 border border-red-200
                 rounded-lg text-xs font-bold hover:bg-red-100"
    >
      Remove Photo
    </button>
  </div>
)}

          </div>
          <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
            <div className="text-center relative z-10">
              <div className="w-20 h-20 mx-auto mb-3 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-indigo-800"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="text-white"
                    strokeDasharray={`${profileCompletion} ${100 - profileCompletion}`}

                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black">{profileCompletion}%</span>

                </div>
              </div>
             <h3 className="text-base font-bold">
  Profile Completion Status
</h3>

<p className="text-indigo-200 text-xs mb-3">
  Your profile is {profileCompletion}% complete
</p>

             

            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
              Missing Info
            </h4>
           <div className="space-y-2">
 {profileCompletion === 100 ? (
  <div className="text-xs text-green-600 font-bold">
    🎉 Profile fully completed
  </div>
) : (

    missingProfileFields.map((item) => (
      <div
        key={item.key}
        onClick={() => setExpandedSection("profile")}
        className="flex items-center justify-between p-2 bg-white
                   border border-gray-200 rounded hover:border-indigo-300
                   cursor-pointer transition-all"
      >
        <span className="text-xs font-bold text-gray-600">
          {item.label}
        </span>
        <ArrowRight size={12} className="text-indigo-500" />
      </div>
    ))
  )}
</div>

          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2 space-y-6">

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
              id="fullName"
                type="text"
                defaultValue={fullName}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
              id="email"
                type="email"
                defaultValue={profile?.email ?? ''}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Mobile Number
  </label>
  <input
    id="mobile_number"
    type="tel"
    defaultValue={profile?.mobile_number || ""}
    placeholder="Mobile Number"
    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold text-gray-700"
  />
</div>
<div>
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Date of Birth
  </label>
  <input
    id="dob"
    type="date"
    defaultValue={profile?.dob || ""}
    className="w-full p-3 bg-gray-50 border border-gray-200
               rounded-lg text-sm font-bold text-gray-700
               focus:bg-white focus:ring-2 focus:ring-indigo-500
               outline-none transition-all"
  />
</div>

{/* 🌍 Current Residency */}
<div className="md:col-span-2 mt-4">
  <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 block">
    Current Residency
  </label>

  {/* COUNTRY (read-only) */}
  <div
    className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg
               text-sm font-bold text-gray-700 cursor-not-allowed"
  >
    {profile?.country_of_residence || "India"}
  </div>
{/* 🌍 STATE + CITY (ONLY IF ABROAD) */}
{profile?.country_of_residence !== "India" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">

    {/* ===== STATE ===== */}
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">
        State / Province
      </label>

      <Listbox
        value={stateAbroad}
        onChange={(value) => {
          setStateAbroad(value);
          setCityAbroad("");
        }}
      >
        <div className="relative">
          <Listbox.Button
            className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                       rounded-lg flex justify-between items-center
                       text-sm font-semibold"
          >
            <span>{stateAbroad || "Select State / Province"}</span>
            <ChevronDown size={18} />
          </Listbox.Button>

          <Listbox.Options
            className="absolute z-50 mt-1 w-full bg-white
                       border border-gray-300 rounded-lg
                       shadow-lg max-h-60 overflow-auto text-sm"
          >
            {countryConfig?.map((s) => (
              <Listbox.Option
                key={s.name}
                value={s.name}
                className="cursor-pointer px-3 py-2 hover:bg-gray-100"
              >
                {s.name}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>

    {/* ===== CITY ===== */}
    <div>
      <label className="text-xs font-medium text-gray-600 mb-1 block">
        City
      </label>

      <Listbox
        value={cityAbroad}
        onChange={setCityAbroad}
        disabled={!stateAbroad}
      >
        <div className="relative">
          <Listbox.Button
            className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                       rounded-lg flex justify-between items-center
                       text-sm font-semibold disabled:bg-gray-100"
          >
            <span>{cityAbroad || "Select City"}</span>
            <ChevronDown size={18} />
          </Listbox.Button>

          <Listbox.Options
            className="absolute z-50 mt-1 w-full bg-white
                       border border-gray-300 rounded-lg
                       shadow-lg max-h-60 overflow-auto text-sm"
          >
            {countryConfig
              ?.find((s) => s.name === stateAbroad)
              ?.cities.map((city) => (
                <Listbox.Option
                  key={city}
                  value={city}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                >
                  {city}
                </Listbox.Option>
              ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>

  </div>
)}


</div>

{/* 📍 Address Details */}
<div className="md:col-span-2 mt-4 ">
  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
   Indian Address 
  </h4>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    {/* State */}
   {/* ===== STATE ===== */}
<Listbox
  value={indianState}
  onChange={(value) => {
    setIndianState(value);
    setDistrict("");
    setAssembly("");
    setMandal("");
  }}
>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {indianState || "Select State"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {["Andhra Pradesh", "Telangana"].map((state) => (
        <Listbox.Option
          key={state}
          value={state}
          className={({ active }) =>
            `cursor-pointer px-3 py-2 ${
              active ? "bg-gray-100 text-gray-900" : "text-gray-900"
            }`
          }
        >
          {state}
        </Listbox.Option>
      ))}
    </Listbox.Options>
  </div>
</Listbox>


    {/* District */}
{/* District (Mobile Friendly) */}
<div className="relative">
  <Listbox
    value={district}
    onChange={(value) => {
      setDistrict(value);
      setAssembly("");
      setMandal("");
    }}
  >
    {/* Button */}
    <Listbox.Button
  className="
     w-full h-11 px-3
    bg-gray-50 border border-gray-300 rounded-lg
    text-left text-[16px] md:text-sm font-semibold text-gray-900
    flex items-center justify-between
    focus:bg-white focus:ring-2 focus:ring-indigo-500
    outline-none
  "
>
  <span className="truncate">
    {district || "Select District"}
  </span>

  <ChevronDown
    size={18}
    className="text-gray-500 shrink-0"
  />
</Listbox.Button>


    {/* Dropdown Options */}
    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-200
        shadow-lg
        text-sm
      "
    >
      {indianState &&
        indianAddressData[indianState]?.map((d) => (
          <Listbox.Option
            key={d.name}
            value={d.name}
            className={({ active }) =>
              `cursor-pointer px-3 py-2 ${
                active
                  ? "bg-indigo-100 text-indigo-900"
                  : "text-gray-900"
              }`
            }
          >
            {d.name}
          </Listbox.Option>
        ))}
    </Listbox.Options>
  </Listbox>
</div>


    {/* Assembly */}
{/* ===== ASSEMBLY ===== */}
<Listbox
  value={assembly}
  onChange={(value) => {
    setAssembly(value);
    setMandal("");
  }}
>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {assembly || "Select Assembly Constituency"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {indianState &&
        district &&
        indianAddressData[indianState]
          ?.find((d) => d.name === district)
          ?.constituencies.map((c) => (
            <Listbox.Option
              key={c.name}
              value={c.name}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active ? "bg-gray-100 text-gray-900" : "text-gray-900"
                }`
              }
            >
              {c.name}
            </Listbox.Option>
          ))}
    </Listbox.Options>
  </div>
</Listbox>


    {/* Mandal */}
  {/* ===== MANDAL ===== */}
<Listbox value={mandal} onChange={setMandal}>
  <div className="relative">
    <Listbox.Button
      className="
        w-full h-11 px-3
        bg-gray-50 border border-gray-300 rounded-lg
        flex items-center justify-between
        text-left text-[16px] md:text-sm font-semibold text-gray-900
        focus:bg-white focus:ring-2 focus:ring-indigo-500
        outline-none
      "
    >
      <span className="truncate">
        {mandal || "Select Mandal"}
      </span>
      <ChevronDown size={18} className="text-gray-500" />
    </Listbox.Button>

    <Listbox.Options
      className="
        absolute z-50 mt-1 w-full
        max-h-60 overflow-auto
        rounded-lg bg-white
        border border-gray-300
        shadow-lg text-sm
      "
    >
      {indianState &&
        district &&
        assembly &&
        indianAddressData[indianState]
          ?.find((d) => d.name === district)
          ?.constituencies.find((c) => c.name === assembly)
          ?.mandals.map((m) => (
            <Listbox.Option
              key={m}
              value={m}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active ? "bg-gray-100 text-gray-900" : "text-gray-900"
                }`
              }
            >
              {m}
            </Listbox.Option>
          ))}
    </Listbox.Options>
  </div>
</Listbox>

 
  </div>
</div>
          </div>  


          <div className="p-5 bg-white rounded-xl border border-gray-200">
            <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider">
              Professional & Social
            </h4>

<div className="mb-4">
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Professional Category
  </label>

  <Listbox
    value={profession}
    onChange={(value) => {
      setProfession(value);
      setRoleDesignation(""); // reset role when category changes
    }}
  >
    <div className="relative">
      <Listbox.Button className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg flex items-center justify-between text-sm font-semibold">
        <span>{profession || "Select Category"}</span>
        <ChevronDown size={18} />
      </Listbox.Button>

      <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
        {["Job", "Business", "Student"].map((opt) => (
          <Listbox.Option
            key={opt}
            value={opt}
            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
          >
            {opt}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>
<div className="mb-4">
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Role / Designation
  </label>

  <Listbox
    value={roleDesignation}
    onChange={setRoleDesignation}
    disabled={!profession}
  >
    <div className="relative">
      <Listbox.Button
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   flex items-center justify-between text-sm font-semibold
                   disabled:opacity-50"
      >
        <span>{roleDesignation || "Select Role"}</span>
        <ChevronDown size={18} />
      </Listbox.Button>

      <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg">
        {(roleOptions[profession] || []).map((role) => (
          <Listbox.Option
            key={role}
            value={role}
            className="cursor-pointer px-4 py-2 hover:bg-gray-100"
          >
            {role}
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>

            {/* Social Media Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Facebook className="absolute left-3 top-3 text-blue-600" size={16} />
                <input
                id="facebook"
                  type="text"
                  defaultValue={profile?.facebook_id ?? ''}
                  placeholder="Facebook Profile URL / ID"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-3 top-3 text-black" size={16} />
                <input
                id="twitter"
                  type="text"
                  defaultValue={profile?.twitter_id ?? ''}
                  placeholder="X (Twitter) Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 text-blue-700" size={16} />
                <input
                id="linkedin"
                  type="text"
                  defaultValue={profile?.linkedin_id ?? ''}
                  placeholder="LinkedIn Profile URL"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 text-pink-600" size={16} />
                <input
                id="instagram"
                  type="text"
                  defaultValue={profile?.instagram_id ?? ''}
                  placeholder="Instagram Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

<div className="mt-6">
  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
    I want to contribute via:
  </h4>

  <div className="flex flex-wrap gap-2">
    {contributionTypes.map((opt) => {
      console.log(
        "OPT ID:", opt.id,
        "SELECTED:", selectedContributions
      );

      return (
        <label
          key={opt.id}
          className="flex items-center gap-2 px-3 py-2
                     border border-gray-200 rounded-lg cursor-pointer
                     hover:border-indigo-500 hover:bg-indigo-50"
        >
          <input
            type="checkbox"
            checked={selectedContributions.includes(Number(opt.id))}
            onChange={(e) =>
              toggleContribution(Number(opt.id), e.target.checked)
            }
          />
          <span className="text-xs font-bold">{opt.name}</span>
        </label>
      );
    })}
  </div>
</div>



          <div className="flex justify-end pt-2">
            <button
  onClick={handleSaveProfile}
              className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-lg shadow-lg hover:bg-black transition-all flex items-center gap-2 text-xs uppercase tracking-wider"
            >
              <Check size={14} /> Save Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReferralsContent = () => (
    <div className="pt-4">
      {/* Top Row */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div>
          <h4 className="font-black text-xl mb-1">Refer & Earn</h4>
          <p className="text-emerald-100 text-xs max-w-md">
            Share your unique link. Top referrers get exclusive meeting invites with party
            leadership.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
          <code className="text-xs font-mono text-white px-2 truncate max-w-[200px]">
            {referralLink}
          </code>
          <button
            onClick={() => {
              navigator.clipboard
                ?.writeText(referralLink)
                .then(() => showToast('Referral Link Copied!'))
                .catch(() => showToast('Could not copy link', 'info'));
            }}
            className="bg-white text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tables - SCROLLABLE for large lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Active Referrals
            </h4>
            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
              {activeReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {activeReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No active referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Passive Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Passive Tree
            </h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
              {passiveReferrals.length} Members
            </span>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {passiveReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No passive referrals yet.</div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-white text-gray-400 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Name</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Location</th>
                    <th className="px-4 py-2 font-bold bg-gray-50/90">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {passiveReferrals.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-bold text-gray-700">
                        {r.member_name || 'Member'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {r.location || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );

const renderConnectContent = () => {
  // 🔹 Flatten leadersByRole → single array with role included
  const flatLeaders = Object.entries(leadersByRole).flatMap(
    ([role, leaders]) =>
      leaders.map((leader) => ({
        ...leader,
        role,
      }))
  );

  const colorClasses = [
    { text: "text-purple-600", border: "border-purple-200" },
    { text: "text-blue-600", border: "border-blue-200" },
    { text: "text-emerald-600", border: "border-emerald-200" },
    { text: "text-orange-600", border: "border-orange-200" },
  ];

  return (
    <div className="pt-4">
      {flatLeaders.length === 0 ? (
        <div className="text-xs text-gray-500">
          No leadership contacts configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {flatLeaders.map((leader, idx) => {
            const colors = colorClasses[idx % colorClasses.length];

            return (
              <div
                key={leader.id}
                className={`bg-white border ${colors.border}
                rounded-xl p-4 flex flex-col items-center text-center
                shadow-sm hover:shadow-md transition-all`}
              >
                {/* ROLE */}
                <span
                  className={`text-[9px] font-black uppercase tracking-widest mb-1 ${colors.text}`}
                >
                  {leader.role}
                </span>

                {/* AVATAR */}
                <div
                  className="w-16 h-16 rounded-full bg-gray-100
                             border border-gray-300 flex items-center
                             justify-center mb-3"
                >
                  <span className="text-lg font-black text-gray-600">
                    {leader.name?.charAt(0) || "L"}
                  </span>
                </div>

                {/* NAME */}
                <h4 className="text-sm font-bold text-gray-900 mb-4">
                  {leader.name || "Leader"}
                </h4>

                {/* WHATSAPP BUTTON */}
                <button
                  onClick={() => {
                    if (!leader.whatsapp_number) {
                      showToast("WhatsApp contact not available", "info");
                      return;
                    }

                    const phone = leader.whatsapp_number.replace(/\D/g, "");
                    window.open(`https://wa.me/${phone}`, "_blank");

                    showToast(
                      `Opening WhatsApp with ${leader.name}`,
                      "info"
                    );
                  }}
                  className="w-full py-2 rounded-lg bg-[#25D366]
                             hover:bg-[#20b85a] text-white font-bold
                             text-xs flex items-center justify-center
                             gap-1.5 transition-colors shadow-sm"
                >
                  <MessageSquare size={14} fill="white" /> WhatsApp
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SERVICE_UI = {
  student: {
    icon: <GraduationCap size={22} className="text-blue-600" />,
    bg: "bg-blue-50",
  },
  legal: {
    icon: <Scale size={22} className="text-purple-600" />,
    bg: "bg-purple-50",
  },
  career: {
    icon: <Briefcase size={22} className="text-orange-600" />,
    bg: "bg-orange-50",
  },
  local: {
    icon: <Users size={22} className="text-green-600" />,
    bg: "bg-green-50",
  },
};

const renderServicesContent = () => (
  <div className="pt-4">
    {/* ================= SERVICES GRID ================= */}
    {!selectedService ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(SERVICE_CONFIG).map(([key, cfg]) => {
          const ui = SERVICE_UI[key as keyof typeof SERVICE_UI];

          return (
            <div
              key={key}
              onClick={() => {
                setSelectedService(key);
                setSelectedSub(null);
                setSelectedInner(null);
              }}
              className="bg-white border border-gray-200 rounded-2xl px-6 py-8
                         text-center cursor-pointer transition-all
                         hover:border-indigo-400 hover:shadow-md"
            >
              <div
                className={`w-14 h-14 mx-auto mb-4 rounded-2xl
                            flex items-center justify-center ${ui.bg}`}
              >
                {ui.icon}
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-2">
                {cfg.label}
              </h3>

              <span className="text-[11px] font-bold text-gray-400 uppercase">
                Request Info →
              </span>
            </div>
          );
        })}
      </div>
    ) : (

      /* ================= REQUEST FORM ================= */
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">

        {/* BACK */}
        <button
          onClick={() => {
            setSelectedService(null);
            setSelectedSub(null);
            setSelectedInner(null);
          }}
          className="text-xs font-bold text-gray-500 mb-4"
        >
          ← Back to Services
        </button>

        <h3 className="text-lg font-black mb-6">
          {SERVICE_CONFIG[selectedService].label}
        </h3>

        {/* NAME + COUNTRY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <input
            value={fullName}
            disabled
            className="w-full p-3 bg-gray-100 border rounded-lg
                       text-xs font-bold"
          />
          <input
            value={profile?.country_of_residence || "India"}
            disabled
            className="w-full p-3 bg-gray-100 border rounded-lg
                       text-xs font-bold"
          />
        </div>

        {/* CATEGORY */}
       <div className="mb-4">
  <label className="text-xs font-bold block mb-2">
    Select Category
  </label>

  <Listbox
    value={selectedSub}
    onChange={(value) => {
      setSelectedSub(value);
      setSelectedInner(null);
    }}
  >
    <div className="relative">
      <Listbox.Button
        className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                   rounded-lg flex items-center justify-between
                   text-sm font-semibold"
      >
        <span className="truncate">
          {selectedSub || "Select Category"}
        </span>
        <ChevronDown size={18} className="text-gray-500" />
      </Listbox.Button>

      <Listbox.Options
        className="absolute z-50 mt-1 w-full max-h-56 overflow-auto
                   rounded-lg bg-white border border-gray-200
                   shadow-lg text-sm"
      >
        {Object.keys(SERVICE_CONFIG[selectedService].subs)
          .filter((sub) => sub !== selectedSub) // ⭐ same trick
          .map((sub) => (
            <Listbox.Option
              key={sub}
              value={sub}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active
                    ? "bg-indigo-100 text-indigo-900"
                    : "text-gray-900"
                }`
              }
            >
              {sub}
            </Listbox.Option>
          ))}
      </Listbox.Options>
    </div>
  </Listbox>
</div>


        {/* OPTION (ADDRESS-STYLE LISTBOX) */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
            Select Option
          </label>

          <Listbox
            value={selectedInner}
            onChange={setSelectedInner}
            disabled={!selectedSub}
          >
            <div className="relative">
              <Listbox.Button
                className="w-full h-11 px-3 bg-gray-50 border border-gray-300
                           rounded-lg flex items-center justify-between
                           text-sm font-semibold disabled:bg-gray-100"
              >
                <span className="truncate">
                  {selectedInner || "Select Option"}
                </span>
                <ChevronDown size={18} className="text-gray-500" />
              </Listbox.Button>

              <Listbox.Options
                className="absolute z-50 mt-1 w-full max-h-56 overflow-auto
                           rounded-lg bg-white border border-gray-200
                           shadow-lg text-sm"
              >
                {selectedSub &&
                  SERVICE_CONFIG[selectedService].subs[selectedSub]
                    .filter((opt) => opt !== selectedInner) // ⭐ KEY LINE
                    .map((opt) => (
                      <Listbox.Option
                        key={opt}
                        value={opt}
                        className={({ active }) =>
                          `cursor-pointer px-3 py-2 ${
                            active
                              ? "bg-indigo-100 text-indigo-900"
                              : "text-gray-900"
                          }`
                        }
                      >
                        {opt}
                      </Listbox.Option>
                    ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

        {/* MESSAGE */}
        <textarea
          ref={serviceMessageRef}
          rows={4}
          className="w-full p-3 border rounded-lg text-xs mb-4"
          placeholder="Describe your requirement..."
        />

        {/* SUBMIT */}
        <button
          onClick={handleSubmitService}
          disabled={!selectedInner || submittingService}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg
                     text-xs font-bold disabled:opacity-60"
        >
          {submittingService ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    )}
  </div>
);


  
const renderEventsContent = () => (
  <div className="pt-4">
    {events.length === 0 ? (
      <div className="text-xs text-gray-500">No events or notifications.</div>
    ) : (
      events.map((event) => (
        <div
          key={event.id}
          className={`rounded-xl border p-4 mb-3 ${
            event.status === "Sent"
              ? "bg-red-50 border-red-200"
              : "bg-white border-gray-200"
          }`}
        >
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-sm text-gray-900">
              {event.title}
            </h4>
            <span className="text-[10px] font-bold text-gray-500">
              {formatDate(event.created_at)}
            </span>
          </div>

          {event.info && (
            <p className="text-xs text-gray-600 mt-1">
              {event.info}
            </p>
          )}

         
        </div>
      ))
    )}
  </div>
);

const renderSuggestionsContent = () => (
  <div className="pt-4">
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">

      {/* Title + Subtitle */}
      <div>
        <h3 className="text-sm font-black text-gray-800">
          Suggestions
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Share your ideas & feedback
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Name
        </label>
        <input
          value={fullName}
          disabled
          className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg
                     text-sm font-bold text-gray-600 cursor-not-allowed"
        />
      </div>

      {/* Country */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Country
        </label>
        <input
          value={profile?.country_of_residence || "India"}
          disabled
          className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg
                     text-sm font-bold text-gray-600 cursor-not-allowed"
        />
      </div>

      {/* Suggestion */}
      <div>
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
          Your Suggestion
        </label>

        <textarea
          ref={suggestionRef}
          rows={4}
          className="w-full p-3 bg-white border border-gray-300 rounded-lg
                     text-sm outline-none focus:ring-2 focus:ring-indigo-500
                     resize-none"
          placeholder="Write your suggestion here..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmitSuggestion}
          disabled={submittingSuggestion}
          className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold
                     rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {submittingSuggestion ? "Submitting..." : "Submit Suggestion"}
        </button>
      </div>

    </div>
  </div>
);


  //  NOTIFICATIONS DISABLED
// const renderNotificationsContent = () => (
//   <div className="pt-4 ">
//     <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
//       {notifications.length === 0 ? (
//         <div className="p-4 text-xs text-gray-500">No notifications yet.</div>
//       ) : (
//         notifications.map((n) => (
//           <div key={n.id}>{n.title}</div>
//         ))
//       )}
//     </div>
//   </div>
// );

  // Reusable Accordion Item
  const AccordionItem = ({
    id,
    title,
    icon,
    content,
    summary,
    color,
  }: {
    id: SectionKey;
    title: string;
    icon: React.ReactNode;
    content: React.ReactNode;
    summary?: React.ReactNode;
    color: string;
  }) => {
    const isOpen = expandedSection === id;

    return (
    <div
  className={`
    mb-3 rounded-xl border overflow-hidden group
    ${isOpen
      ? 'bg-white border-gray-300 shadow-xl ring-1 ring-black/5 z-10'
      : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'}
  `}
>


        {/* Header Bar */}
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 outline-none transition-colors relative overflow-hidden"
        >
          {/* Background highlighting on hover/active */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              isOpen ? 'bg-gray-50/80' : 'bg-white group-hover:bg-gray-50'
            }`}
          ></div>

          <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
            {/* Icon Box */}
            <div
              className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0
                ${isOpen ? color + ' text-white shadow-md' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'}
            `}
            >
              {icon}
            </div>

            {/* Title & Summary Container */}
            <div className="flex flex-col items-start flex-1 min-w-0">
              <span
                className={`text-sm font-black tracking-tight transition-colors ${
                  isOpen ? 'text-gray-900 text-base' : 'text-gray-700'
                }`}
              >
                {title}
              </span>

              {/* Summary (Fade out when open, Fade in when closed) */}
              <div
                className={`transition-all duration-300 origin-top w-full ${
                  isOpen ? 'h-0 opacity-0 scale-y-0 hidden' : 'h-auto opacity-100 scale-y-100 block'
                }`}
              >
                {summary}
              </div>
            </div>
          </div>

          {/* Chevron */}
          <div
            className={`
            w-6 h-6 rounded-full flex items-center justify-center ml-3 transition-all duration-300 shrink-0 relative z-10
            ${isOpen ? 'bg-gray-200 text-gray-800 rotate-180' : 'text-gray-400'}
          `}
          >
            <ChevronDown size={16} />
          </div>
        </button>

        
        {/* Expanded Content Body */}
<div
  className={`px-4 pb-6 sm:px-6 border-t border-gray-100 bg-white
    ${isOpen ? "block" : "hidden"}
  `}
>
  {content}
</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col font-sans bg-gray-100/95 backdrop-blur-sm">

      {/* Toast Notification */}
      {toast && (
        <div
       className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${
  toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-blue-600 text-white'
}`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
          <span className="text-xs font-bold uppercase tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-white border-b border-gray-200 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ysrcp-blue rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
            YSRC
          </div>
          <div>
      <h1 className="font-black text-lg text-gray-900 tracking-tight leading-none">
  {profile?.profession
    ? `${profile.profession} Dashboard`
    : "My Portal"}
</h1>
            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mt-0.5">
              ● {loadingDashboard ? 'Syncing…' : 'Online'}
            </p>
          </div>
        </div>
       <div className="flex items-center gap-2">
 {/* Logout - MOBILE */}
<button
  onClick={async () => {
    await signOut();
    window.location.href = "/";
  }}
  title="Logout"
  className="flex sm:hidden w-9 h-9 items-center justify-center
             text-red-600 bg-white border border-red-200 rounded-full
             hover:bg-red-50 hover:border-red-300 hover:text-red-700
             transition-all shadow-sm"
>
  <LogOut size={16} />
</button>

{/* Logout - DESKTOP */}
<button
  onClick={async () => {
    await signOut();
    window.location.href = "/";
  }}
  className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide
             text-red-600 bg-white border border-red-200 rounded-lg
             hover:bg-red-50 hover:border-red-300 hover:text-red-700
             transition-all shadow-sm"
>
  <LogOut size={14} />
  Logout
</button>


 
</div>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-10 ">

        <div className="max-w-7xl mx-auto pb-20">
          <AccordionItem
            id="profile"
            title="Complete Profile"
            summary={renderProfileSummary()}
            icon={<User size={20} />}
            content={renderProfileContent()}
            color="bg-indigo-600"
          />

          <AccordionItem
            id="referrals"
            title="My Network"
            summary={renderReferralsSummary()}
            icon={<Users size={20} />}
            content={renderReferralsContent()}
            color="bg-emerald-600"
          />

          <AccordionItem
            id="connect"
            title="Leadership Connect"
            summary={renderConnectSummary()}
            icon={<MessageSquare size={20} />}
            content={renderConnectContent()}
            color="bg-blue-600"
          />

          <AccordionItem
            id="services"
            title="Services Hub"
            summary={renderServicesSummary()}
            icon={<Briefcase size={20} />}
            content={renderServicesContent()}
            color="bg-amber-500"
          />
<AccordionItem
  id="events"
  title={
    <span className="inline-flex items-center gap-2">
      <span>Events & Notifications</span>

      {hasNewEvents && !eventsSeen && (
        <span className="w-2 h-2 rounded-full bg-red-500"></span>
      )}
    </span>
  }
  summary={renderEventsSummary()}
  icon={<Calendar size={20} />}
  content={renderEventsContent()}
  color="bg-pink-600"
/>



{/*  NOTIFICATIONS DISABLED
<AccordionItem
  id="notifications"
  title="Notifications"
  summary={renderNotificationsSummary()}
  icon={<Bell size={20} />}
  content={renderNotificationsContent()}
  color="bg-red-500"
/>
*/}

<AccordionItem
  id="suggestions"
  title="Suggestions"
  icon={<MessageSquare size={20} />}
  content={renderSuggestionsContent()}
  color="bg-indigo-600"
/>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
