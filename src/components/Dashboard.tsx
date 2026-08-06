
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProfileDropdown } from './ProfileDropdown';
import MyAbroadConnect from './MyAbroadConnect';
import MyAssistanceBoard from './MyAssistanceBoard';
import MyHome from './MyHome';
import MyFeedback from './MyFeedback';
import '../styles/prototype-tokens.css';
import MyRequests from './MyRequests';
import Appointments from './Appointments';
import MyProfile from './MyProfile';
import MyServiceRequests from './MyServiceRequests';
import Grievances from './Grievances';
import MyLocalConnect from './MyLocalConnect';
import DigitalArmy from './DigitalArmy';
import ChapterDashboard from './ChapterDashboard';
import nriLogo from './nrilogo.png';
import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";


// Cap on the optional "Contributions" free-text field in the profile
// editor. Enforced via the textarea's maxLength and again at save, since
// maxLength does not apply to programmatic setting or some paste paths.
const CONTRIBUTION_MAX_LENGTH = 1000;

/**
 * ═══════════════════════════════════════════════════════════════
 * GEOGRAPHIC DATA STRUCTURES
 * ═══════════════════════════════════════════════════════════════
 * Why it's used:
 * - Populates country, state, and city dropdowns for foreign addresses
 * - Enables NRIs and overseas users to select their current location
 * - Provides hierarchical data structure (Country → States → Cities)
 * - Used in profile completion for non-Indian residents
 */

//Coontry → States → Cities


/**
 * ═══════════════════════════════════════════════════════════════
 * INDIAN ADDRESS HIERARCHY DATA
 * ═══════════════════════════════════════════════════════════════
 * Why it's used:
 * - Organizes all Indian states, districts, assembly constituencies, and mandals
 * - Enables 4-level hierarchical location selection for Indian permanent address
 * - Populates cascading dropdowns: State → District → Assembly → Mandal
 * - Helps target content and leadership based on user's constituency
 * - Essential for mapping users to local coordinators and assembly leaders
 * - Used in profile completion to capture detailed address information
 */

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
// SERVICE_CONFIG (the old hardcoded taxonomy, superseded by
// service_categories/service_options) was replaced by
// <MyServiceRequests />'s live fetch of those tables.

import {
  User,
  Users,
  Calendar,
  MessageSquare,
  LifeBuoy,
  CalendarDays,
  Megaphone,
  Shield,
  Bell,
  MapPin,
  ChevronDown,
  LogOut,
  Briefcase,
  Scale,
  Check,
  Send,
  CheckCircle,
  Info,
  AlertCircle,
  Home,
  Menu,
  X,
  Sparkles,
  HandHeart,
} from 'lucide-react';
import { FacebookBrand, XBrand, InstagramBrand, LinkedInBrand } from './BrandIcons';
import { supabase } from '../lib/supabase';
import {
  sanitizeText,
  isValidIndianMobile,
  isValidUrl,
  filterLettersOnly,
  filterFamilyName,
  isValidLettersOnly,
  isValidFamilyName,
} from '../lib/sanitize';
import { countriesData, phoneCountriesData } from '../lib/countryCodes';
import { getStates, getCities, hasStateData } from '../lib/locationData';
// Imported under a different name because Dashboard.tsx has a local
// `indianAddressData` constant defined at the top of the file for
// legacy reasons. The shared lib version is the one we feed into the
// cascading-dropdown UI below.
import { indianAddressData as INDIAN_ADDRESS_DATA } from '../lib/indianAddressData';
import { useAuth } from '../contexts/useAuth';
import Cropper from 'react-easy-crop';
import { getCroppedBlob, PixelCrop } from '../lib/cropImage';
import { useIdleLogout } from '../hooks/useIdleLogout';


type SectionKey =
  | 'profile'
  | 'referrals'
  | 'connect'
  | 'services'
  | 'events'
 // | 'notifications'
  | 'suggestions';


type Referral = {
  id: string | number;
  member_name: string;
  mobile_number?: string | null;
  location: string | null;
  public_user_code?: string | null;
  type: 'active' | 'passive';
  created_at: string;
  // For passive referrals only: details of the active/direct referrer who
  // actually brought this member into the network. NULL on active rows.
  upstream?: {
    name: string;
    mobile_number: string | null;
    location: string | null;
    public_user_code: string | null;
  } | null;
};
type LeaderAssignmentRow = {
  role: string;
  sort_order: number | null;
  leaders_master: {
    id: string;
    name: string;
    whatsapp_number: string | null;
    whatsapp_number_2: string | null;
    photo_url: string | null;
    is_active: boolean;
  };
};


type EventItem = {
  id: string;          // uuid
  title: React.ReactNode;

  info: string | null;       // admin message
  status: string;            // Draft | Sent
  date: string | null;       // event date (decides active vs previous)
  venue?: string | null;
  created_at: string;
  // 'event' rows let users apply to attend; 'notification' rows are
  // announce-only. Defaults to 'event' if the column isn't present
  // (e.g. before new_34 has been applied), so existing UX is preserved.
  kind?: "event" | "notification";
};



// NOTIFICATIONS DISABLED
// type NotificationItem = {
//   id: number;
//   title: string;
//   body: string | null;
//   created_at: string;
//   is_read: boolean;
// };

// Reusable Accordion Item
const AccordionItem = ({
  id,
  title,
  icon,
  content,
  summary,
  color,
  expandedSection,
  toggleSection,
}: {
  id: SectionKey;
  title: React.ReactNode;
  icon: React.ReactNode;
  content: React.ReactNode;
  summary?: React.ReactNode;
  color: string;
  expandedSection: SectionKey | null;
  toggleSection: (id: SectionKey) => void;
}) => {
  const isOpen = expandedSection === id;

  return (
    <div
      className={`
    mb-3 rounded-xl border overflow-hidden group
    ${
      isOpen
        ? "bg-white border-gray-300 shadow-xl ring-1 ring-black/5 z-10"
        : "bg-white border-gray-200 shadow-sm hover:border-gray-300"
    }
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
            isOpen ? "bg-gray-50/80" : "bg-white group-hover:bg-gray-50"
          }`}
        ></div>

        <div className="flex items-center gap-4 flex-1 min-w-0 relative z-10">
          {/* Icon Box */}
          <div
            className={`
                w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 shrink-0
                ${
                  isOpen
                    ? color + " text-white shadow-md"
                    : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm"
                }
            `}
          >
            {icon}
          </div>

          {/* Title & Summary Container */}
          <div className="flex flex-col items-start flex-1 min-w-0">
            <span
              className={`text-sm font-black tracking-tight transition-colors ${
                isOpen ? "text-gray-900 text-base" : "text-gray-700"
              }`}
            >
              {title}
            </span>

            {/* Summary (Fade out when open, Fade in when closed) */}
            <div
              className={`transition-all duration-300 origin-top w-full ${
                isOpen
                  ? "h-0 opacity-0 scale-y-0 hidden"
                  : "h-auto opacity-100 scale-y-100 block"
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
            ${isOpen ? "bg-gray-200 text-gray-800 rotate-180" : "text-gray-400"}
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

// =====================================================================
// SearchableInput — same UX as the registration page. Lets users type
// to filter the dropdown, or type a custom value not in the list. We
// inline it here (rather than share with RegisterPage) to keep this
// component self-contained; if more screens need it, lift it into a
// shared component file.
// =====================================================================
function SearchableInput({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  letterFilter = true,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  // When true (default for address fields) we run input through the
  // strict letters-only filter so users can't type digits / brackets
  // into State/District/City inputs.
  letterFilter?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = value.trim().toLowerCase();
  const sorted = [...options].sort((a, b) => a.localeCompare(b));
  const filtered = q
    ? sorted.filter((o) => o.toLowerCase().includes(q))
    : sorted;

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const next = letterFilter
            ? filterLettersOnly(e.target.value, 120)
            : e.target.value.slice(0, 120);
          onChange(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-40 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {filtered.map((opt) => (
            <li
              key={opt}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                setOpen(false);
              }}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                value === opt
                  ? "bg-primary-50 font-medium text-primary-700"
                  : ""
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Distinct phone codes (deduped & sorted by numeric value) — shared
// between the registration page and the profile-edit page. Two
// countries with the same dial code (e.g. +1 for US, Canada and many
// Caribbean nations) collapse into a single dropdown entry here.
// Built from phoneCountriesData, which adds India. countriesData omits
// it deliberately (not a valid country of residence on an NRI portal),
// but +91 has to be selectable here — members routinely record an
// Indian number alongside their overseas one.
const PROFILE_PHONE_CODES = Array.from(
  new Set(phoneCountriesData.map((c) => "+" + c.code))
).sort(
  (a, b) =>
    parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10)
);

// Expected national-number length per country. Same map used on the
// registration page so profile-edit validation feels identical.
const PROFILE_PHONE_LENGTHS: Record<string, number> = {
  "+91": 10,
  "+1": 10,
  "+44": 10,
  "+61": 9,
  "+971": 9,
  "+966": 9,
  "+65": 8,
  "+81": 10,
  "+82": 9,
  "+353": 9,
  "+60": 9,
  "+852": 8,
  "+886": 9,
  "+86": 11,
  "+92": 10,
  "+880": 10,
  "+94": 9,
  "+358": 9,
  "+420": 9,
};

// Fallback length for any country code we haven't explicitly mapped:
// the ITU-T E.164 max (15 digits) minus the country-code length.
const profilePhoneMaxDigits = (code: string): number => {
  const exact = PROFILE_PHONE_LENGTHS[code];
  if (exact) return exact;
  const codeDigits = code.replace(/\D/g, "").length;
  return Math.max(7, 15 - codeDigits);
};

const Dashboard: React.FC = () => {
  const { user, refreshProfile, profile, signOut } = useAuth();

  // Auto sign-out after 1 hour idle. Active only when a user is signed in.
  useIdleLogout({
    enabled: !!user,
    onLogout: async () => {
      try {
        await signOut();
      } finally {
        window.location.href = "/";
      }
    },
  });

  // 🔐 IMPORTANT: instant redirect after logout
  if (!user) {
    return <Navigate to="/" replace />;
  }

  const [expandedSection, setExpandedSection] =
    useState<SectionKey | null>("profile");

  // New tab-based navigation state (overview is the landing tab).
  // The active tab is mirrored to the URL hash (e.g. /dashboard#services) so
  // a page refresh keeps the user where they were instead of bouncing them
  // back to the Overview tab.
  type Tab =
    | "overview"
    | "profile"
    | "referrals"
    | "services"
    | "events"
    | "connect"
    | "abroad"
    | "board"
    | "assistance"
    | "appointments"
    | "army"
    | "chapter"
    | "grievances"
    | "suggestions";
  const VALID_TABS: readonly Tab[] = [
    "overview",
    "profile",
    "referrals",
    "services",
    "events",
    "connect",
    "abroad",
    "board",
    "assistance",
    "appointments",
    "army",
    "chapter",
    "grievances",
    "suggestions",
  ];

  const getInitialTab = (): Tab => {
    if (typeof window === "undefined") return "overview";
    const hash = window.location.hash.replace(/^#/, "") as Tab;
    return (VALID_TABS as readonly string[]).includes(hash) ? hash : "overview";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Whenever the active tab changes, write it to the URL hash without adding
  // a history entry. Refresh now restores the tab; back-button still works
  // correctly because we use replaceState (no spurious history bloat).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = `#${activeTab}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${next}`);
    }
  }, [activeTab]);

  /**
   * ═══════════════════════════════════════════════════════════════
   * STATE VARIABLES - SECTION MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - Track which accordion section is currently opened/expanded
   * - Manage service request form state (selected service, category, option)
   * - Maintain UI state for cascading form inputs
   * - Improve UX by persisting user's section preference
   */
  
  // selectedService/selectedSub/selectedInner (cascading picker state)
  // and serviceSubs/fetchServiceTaxonomy (the live service_categories /
  // service_options fetch) were replaced by <MyServiceRequests />'s own
  // version of the same fetch.

  /**
   * ═══════════════════════════════════════════════════════════════
   * STATE VARIABLES - DATA & COUNTERS
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - Track active referral count for network statistics display
   * - Store submission states for async operations (service, suggestion, photo)
   * - Maintain contribution types fetched from database
   * - Track unseen events count for badge notifications
   * - Store selected contribution areas for profile completion
   */
  
  const [activeReferralCount, setActiveReferralCount] = useState<number>(0);

  // submittingService, MyServiceRequest, and myRequests/loadingMyRequests/
  // serviceRequestTab (the old filter strip state) were replaced by
  // <MyServiceRequests />'s own internal state.
  // Active tab in the Notifications view (formerly "Active Events" /
  // "Previous Events").
  const [notificationTab, setNotificationTab] = useState<"active" | "previous">("active");

  // Set of event ids the current user has already applied to. Used by
  // the Apply / Applied button on each event card. Updated optimistically
  // when the user confirms in the modal.
  const [myAppliedEventIds, setMyAppliedEventIds] = useState<Set<string>>(new Set());
  // The event the user is about to confirm applying to. Drives the
  // "Confirm attendance" modal. null when the modal is closed.
  const [confirmApplyEvent, setConfirmApplyEvent] = useState<EventItem | null>(null);
  const [applyingEventId, setApplyingEventId] = useState<string | null>(null);


const [contributionTypes, setContributionTypes] = useState<
  { id: number; name: string }[]
>([]);
const [unseenEventsCount, setUnseenEventsCount] = useState(0);

/**
 * ═══════════════════════════════════════════════════════════════
 * UNSEEN EVENTS TRACKING
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Fetches last seen event timestamp from user's profile
 * - Counts new events created after the last seen time
 * - Displays badge on "Events & Notifications" section with unread count
 * - Helps users know when there are new notifications to review
 * - Improves engagement by highlighting new content
 */

// Reusable so we can also call it after creating/refreshing events.
const loadUnseenEvents = async () => {
  if (!user || !profile?.id) return;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("events_last_seen_at")
    .eq("id", profile.id)
    .single();

  const lastSeenAt = profileData?.events_last_seen_at || "1970-01-01";

  // Only count UNSEEN + STILL ACTIVE events (date in the future, or undated).
  // Past events shouldn't keep flashing as "new notifications".
  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { count, error } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("status", "Sent")
    .gt("created_at", lastSeenAt)
    .or(`date.is.null,date.gte.${todayIso}`);

  if (!error) {
    setUnseenEventsCount(count ?? 0);
  }
};

useEffect(() => {
  if (!user || !profile?.id) return;
  loadUnseenEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user, profile?.id]);

// Clear the badge whenever the user lands on the Events tab — no matter which
// button got them there (sidebar accordion, dashboard tile, mobile nav).
useEffect(() => {
  if (activeTab !== "events") return;
  if (!user || !profile?.id) return;

  (async () => {
    await supabase
      .from("profiles")
      .update({ events_last_seen_at: new Date().toISOString() })
      .eq("id", profile.id);
    setUnseenEventsCount(0);
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeTab, user?.id, profile?.id]);

/**
 * ═══════════════════════════════════════════════════════════════
 * STATE VARIABLES - PROFILE CONTRIBUTIONS
 * ═══════════════════════════════════════════════════════════════
 * Why these are used:
 * - Store user's selected contribution areas (e.g., Student Support, Legal Aid)
 * - Allow users to specify how they want to contribute to the organization
 * - Enable filtering members by contribution interests
 * - Help match volunteers with appropriate opportunities
 */

const [selectedContributions, setSelectedContributions] = useState<number[]>([]);
const location = useLocation();

/**
 * ═══════════════════════════════════════════════════════════════
 * NAVIGATION STATE MANAGEMENT
 * ═══════════════════════════════════════════════════════════════
 * Why this is used:
 * - Detects when user is navigated to Dashboard with openProfile flag
 * - Auto-expands the Profile section when user clicks "Complete Profile" from other pages
 * - Improves UX by showing relevant section immediately after navigation
 */

useEffect(() => {
  if (location.state?.openProfile) {
    setActiveTab("profile");
    setExpandedSection("profile");
  }
}, [location.state]);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "info" | "error";
  } | null>(null);

  /**
   * ═══════════════════════════════════════════════════════════════
   * TOAST NOTIFICATION HELPER
   * ═══════════════════════════════════════════════════════════════
   * Why showToast is used:
   * - Displays temporary feedback messages to user actions (success/info)
   * - Auto-hides after 3 seconds for non-intrusive UX
   * - Provides confirmation for profile saves, uploads, submissions
   * - Improves user experience with clear feedback
   */

  const showToast = (msg: string, type: "success" | "info" | "error" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Log profile updates for debugging
  useEffect(() => {
    if (profile?.profile_photo) {
      console.log('Profile photo URL:', profile.profile_photo);
    }
  }, [profile?.profile_photo]);

// ✅ FIXED: ACTIVE REFERRAL COUNT (USES profile.id)
/**
 * ═══════════════════════════════════════════════════════════════
 * ACTIVE REFERRAL COUNT TRACKING
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Fetches total count of referrals made by current user
 * - Used for displaying referral statistics on dashboard
 * - Helps user track their network growth and contributions
 * - Motivates users to refer more members
 */

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



/**
 * ═══════════════════════════════════════════════════════════════
 * LOCATION DATA NORMALIZATION HELPERS
 * ═══════════════════════════════════════════════════════════════
 * Why these functions are used:
 * - Normalize district names by removing "District" suffix for display consistency
 * - Normalize mandal names by removing "Mandal" suffix for cleaner UI
 * - Normalize assembly constituency names by removing "Assembly Constituency" or "AC" suffix
 * - Enable consistent data matching across database and UI
 * - Improve data consistency in dropdowns and form submissions
 */

/**
 * These strip a trailing label that some stored values carry — "Guntur
 * District" → "Guntur", "Tadepalligudem Mandal" → "Tadepalligudem".
 *
 * WHY THEY ARE ANCHORED
 *   They were not, and the substrings occur INSIDE real place names:
 *     'Achanta'       -> 'hanta'     (ac)
 *     'Macherla'      -> 'Mherla'    (ac)
 *     'Mandalapalle'  -> 'apalle'    (mandal)
 *   These run when a profile is loaded into the edit form, so a member
 *   from Achanta saw "hanta" in the field and saving wrote the mangled
 *   value back — the stored constituency was being destroyed by the act
 *   of opening the form.
 *
 *   Anchoring to a word at the END of the string is what was meant all
 *   along: a label is a suffix, never a fragment in the middle.
 */
const stripTrailingLabel = (value: string, label: RegExp) =>
  value.replace(label, "").replace(/[\s,-]+$/, "").trim();

const normalizeDistrict = (value: string) =>
  stripTrailingLabel(value, /\s*\bdistrict\b\s*$/i);

const normalizeMandal = (value: string) =>
  stripTrailingLabel(value, /\s*\bmandal\b\s*$/i);

const normalizeAssembly = (value: string) =>
  stripTrailingLabel(value, /\s*\b(assembly\s+constituency|constituency|a\.?c\.?)\b\s*$/i);

// ---------------- CONTRIBUTIONS ----------------
/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRIBUTION TOGGLE HANDLER
 * ═══════════════════════════════════════════════════════════════
 * Why this function is used:
 * - Allows users to add/remove their contribution areas with checkboxes
 * - Implements optimistic UI updates for better responsiveness
 * - Syncs selections with database (user_contributions table)
 * - Rolls back UI changes if database operations fail
 * - Tracks user interests for volunteer matching and engagement
 */

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

/**
 * ═══════════════════════════════════════════════════════════════
 * PROFESSIONAL ROLE OPTIONS
 * ═══════════════════════════════════════════════════════════════
 * Why these are used:
 * - Provide contextual role/designation options based on profession selected
 * - For "Job": Software Engineer, Manager, Doctor, Teacher, etc.
 * - For "Business": Founder, Co-Founder, Partner, Entrepreneur, etc.
 * - For "Student": School, Undergraduate, Postgraduate, Research Scholar, etc.
 * - Enables better categorization of users for targeted engagement
 * - Helps in professional networking and skill-based matching
 */

// Fixed list of party / civic designations an "active YSRCP family
// member" can hold. The Family Member panel uses a <select> over this
// list so admins receive consistent, non-garbage values across users
// (previously it was free-text and accepted anything).
const FAMILY_DESIGNATIONS = [
  "MLA",
  "MP",
  "Minister",
  "District President",
  "District Convener",
  "Constituency Coordinator",
  "Mandal President",
  "Mandal Convener",
  "Sarpanch",
  "Vice Sarpanch",
  "Ward Member",
  "ZPTC Member",
  "MPTC Member",
  "Party President",
  "Vice President",
  "General Secretary",
  "Secretary",
  "Joint Secretary",
  "Treasurer",
  "Party Worker",
  "Volunteer",
  "Other",
];

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


  /**
   * ═══════════════════════════════════════════════════════════════
   * PHOTO UPLOAD STATE MANAGEMENT
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - photoFile: Stores selected image file from file input
   * - photoPreview: Displays selected image preview before upload
   * - uploading: Tracks upload progress to disable button during upload
   * - Allows users to select, preview, and upload profile pictures
   * - Improves UX with instant preview before committing
   */

  // ---------------- PHOTO UPLOAD STATE ----------------
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperOriginalName, setCropperOriginalName] = useState<string>("photo.jpg");
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPixels, setCropPixels] = useState<PixelCrop | null>(null);
  const [uploading, setUploading] = useState(false);
// 🔗 Profile section refs for Missing Info navigation
const profilePhotoRef = useRef<HTMLDivElement | null>(null);
const personalInfoRef = useRef<HTMLDivElement | null>(null);
const residencyRef = useRef<HTMLDivElement | null>(null);
const indianAddressRef = useRef<HTMLDivElement | null>(null);
const professionalRef = useRef<HTMLDivElement | null>(null);
const contributionRef = useRef<HTMLDivElement | null>(null);

  /**
   * ═══════════════════════════════════════════════════════════════
   * COUNTRY & FOREIGN RESIDENCE STATE
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - countryOfResidence: Current country of residence (for NRI tracking)
   * - stateAbroad: State/Province for non-India residents
   * - cityAbroad: City for non-India residents
   * - Captures current location of NRI members
   * - Used for location-based content and event targeting
   * - Enables communication with overseas members in their timezone
   */


const [stateAbroad, setStateAbroad] = useState("");
const [cityAbroad, setCityAbroad] = useState("");
const [countryOfResidence, setCountryOfResidence] = useState<string>("India");
// Personal-info fields are now editable from the dashboard profile tab
// (previously locked because they were set during registration). Held
// in their own state so the input value stays in sync with the user's
// keystrokes until they hit Save Profile.
const [editFirstName, setEditFirstName] = useState("");
const [editLastName, setEditLastName] = useState("");
const [editMobileNumber, setEditMobileNumber] = useState("");
const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
const clearFieldError = (key: string) =>
  setProfileFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
const [editGender, setEditGender] = useState("");

// Profile section is read-only by default. Clicking Edit unlocks the
// fields; Cancel reverts to the last saved values; Save validates and
// persists then drops back to read-only.
const [profileEditMode, setProfileEditMode] = useState(false);
// Ref on the bottom Edit / Cancel / Save row so the inline link in
// the read-only banner can smooth-scroll there + flash a highlight.
// The ref is on the wrapper DIV (which stays mounted regardless of
// edit mode) rather than on the Edit button itself — that button
// unmounts the instant we flip into edit mode and would null out
// the ref before scrollIntoView ran.
const profileEditBtnRef = useRef<HTMLDivElement | null>(null);

const enterProfileEditMode = () => {
  // Scroll FIRST so the ref is guaranteed to point at the live DOM
  // node — the wrapper div is mounted in both edit / read-only
  // modes, so its position is already correct. Doing this before
  // setState avoids any race against React's commit phase.
  const row = profileEditBtnRef.current;
  if (row) {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.add("ring-4", "ring-amber-400", "rounded-lg");
    window.setTimeout(() => {
      row.classList.remove("ring-4", "ring-amber-400", "rounded-lg");
    }, 1500);
  }
  setProfileEditMode(true);
};

const [countries, setCountries] = useState<
  {
    code: string;
    name: string;
    phone: string | null;
  }[]
>([]);

useEffect(() => {
  const loadCountries = async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("code, name, phone")
      .order("name", { ascending: true });

    if (error) {
      console.error("Countries fetch error:", error);
      return;
    }

    setCountries(data || []);
  };

  loadCountries();
}, []);

useEffect(() => {
  if (profile?.country_of_residence) {
    setCountryOfResidence(profile.country_of_residence);
  }
}, [profile?.country_of_residence]);

  /**
   * ═══════════════════════════════════════════════════════════════
   * INDIAN ADDRESS STATE VARIABLES
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - indianState: User's permanent state in India (e.g., Andhra Pradesh)
   * - district: User's district for local governance mapping
   * - assembly: User's assembly constituency for political representation
   * - mandal: User's mandal (subdivision) for granular targeting
   * - Forms 4-level hierarchy for precise location identification
   * - Used to assign local coordinators and leadership contacts
   * - Enables district/constituency-specific events and communications
   * - Crucial for political engagement at different levels
   */

  const [indianState, setIndianState] = useState("");
const [district, setDistrict] = useState("");
const [assembly, setAssembly] = useState("");
const [mandal, setMandal] = useState("");

// Active family member in the party (optional — only filled if user is an active member)
const [familyRelation, setFamilyRelation] = useState("");
const [familyName, setFamilyName] = useState("");
const [familyMobile, setFamilyMobile] = useState("");
const [familyVillage, setFamilyVillage] = useState("");
const [familyDesignation, setFamilyDesignation] = useState("");
const [familyDesignationOther, setFamilyDesignationOther] = useState("");

/**
 * dob and family_* are withheld from the `authenticated` role at the
 * column level, so they are absent from the profile AuthContext loads.
 * They come from my_private_profile() instead.
 *
 * privateLoaded gates the save. If this fetch never succeeded, the
 * inputs hold '' — and submitting '' would erase real data. Previously
 * that is exactly what happened: editing a phone number wiped the
 * member's date of birth and every family field.
 */
const [dob, setDob] = useState("");

/**
 * Does this member hold a wing role? /chapter was reachable only by
 * typing the URL, so a coordinator had no way to find their own chapter
 * surface. chapter_stats() returns nothing to someone with no role, so
 * asking it is also the access check.
 */
const [hasChapterRole, setHasChapterRole] = useState(false);
useEffect(() => {
  if (!user?.id) return;
  (async () => {
    const { data } = await supabase.rpc("chapter_stats");
    setHasChapterRole(Array.isArray(data) && data.length > 0);
  })();
}, [user?.id]);
const [privateLoaded, setPrivateLoaded] = useState(false);
const [privateOriginal, setPrivateOriginal] = useState<{
  dob: string | null;
  hadFamily: boolean;
}>({ dob: null, hadFamily: false });

useEffect(() => {
  if (!user?.id) return;
  (async () => {
    const { data, error } = await supabase.rpc("my_private_profile");
    if (error) {
      console.error("my_private_profile failed:", error);
      setPrivateLoaded(false);
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setPrivateLoaded(false);
      return;
    }
    setDob(row.dob || "");
    setFamilyRelation(row.family_relation || "");
    setFamilyName(row.family_name || "");
    setFamilyMobile(row.family_mobile || "");
    setFamilyVillage(row.family_village || "");
    // The designation is either one of the known options or free text
    // shown under "Other" — the same split the old hydration did.
    {
      const desig = row.family_designation || "";
      const known = FAMILY_DESIGNATIONS.includes(desig);
      setFamilyDesignation(known ? desig : (desig ? "Other" : ""));
      setFamilyDesignationOther(known ? "" : desig);
    }
    setPrivateOriginal({
      dob: row.dob ?? null,
      hadFamily: Boolean(row.family_name || row.family_mobile),
    });
    setPrivateLoaded(true);
  })();
}, [user?.id]);

  /**
   * ═══════════════════════════════════════════════════════════════
   * PROFESSIONAL DETAILS STATE
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - profession: Category of work (Job, Business, Student)
   * - roleDesignation: Specific role (e.g., Software Engineer, Founder)
   * - organization: Company/University name
   * - Helps build professional profile and network
   * - Enables skill-based matching and volunteer recruitment
   * - Used for targeted job/business opportunities
   * - Facilitates professional mentorship programs
   */

const [profession, setProfession] = useState<string>(
  profile?.profession || ""
);
const [roleDesignation, setRoleDesignation] = useState<string>(
  profile?.role_designation || ""
);
const [organization, setOrganization] = useState<string>(
  profile?.organization || ""
);



/**
 * ═══════════════════════════════════════════════════════════════
 * PROFESSIONAL DETAILS INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Initializes profession, role, and organization from profile data when available
 * - Prevents reset of values after form is submitted
 * - Syncs local state with database profile updates
 */

useEffect(() => {
  if (profile && !profession && !roleDesignation && !organization) {
    setProfession(profile.profession || "");
    setRoleDesignation(profile.role_designation || "");
    setOrganization(profile.organization || "");
  }
}, [profile]);

/**
 * ═══════════════════════════════════════════════════════════════
 * CONTRIBUTION TYPES & USER SELECTIONS LOADER
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Fetches available contribution types from database (Student Support, Legal Aid, etc.)
 * - Loads user's previously selected contributions
 * - Populates contribution checkboxes with user's choices
 * - Allows users to see and modify their contribution preferences
 * - Essential for initial page load and profile updates
 */

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

/**
 * ═══════════════════════════════════════════════════════════════
 * FOREIGN RESIDENCY STATE INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Initializes state and city fields for non-India residents
 * - Clears abroad fields if user is India-based
 * - Syncs location UI with current residence country
 * - Enables/disables foreign location fields based on country
 */

useEffect(() => {
  if (!profile) return;

  if (profile.country_of_residence !== "India") {
    setStateAbroad(profile.state_abroad || "");
    setCityAbroad(profile.city_abroad || "");
  } else {
    setStateAbroad("");
    setCityAbroad("");
  }

  // Hydrate the editable personal fields on profile load.
  setEditFirstName(profile.first_name || "");
  setEditLastName(profile.last_name || "");
  setEditMobileNumber(profile.mobile_number || "");
  setEditGender(profile.gender || "");
}, [profile]);


/**
 * ═══════════════════════════════════════════════════════════════
 * INDIAN ADDRESS STATE INITIALIZATION
 * ═══════════════════════════════════════════════════════════════
 * Why this effect is used:
 * - Initializes Indian state, district, assembly, mandal from profile
 * - Applies normalization to remove suffixes from stored data
 * - Runs only on component mount to avoid frequent resets
 * - Enables proper cascading dropdown initialization
 */

useEffect(() => {
  if (!profile) return;

  // load address ONLY once (initial mount)
  setIndianState(profile.indian_state?.trim() || "");
  setDistrict(profile.district ? normalizeDistrict(profile.district) : "");
  setAssembly(
    profile.assembly_constituency
      ? normalizeAssembly(profile.assembly_constituency)
      : ""
  );
  setMandal(profile.mandal ? normalizeMandal(profile.mandal) : "");

  // Hydrate active-family-member fields (optional — may be null)
  // family_* and dob are NOT on the profile object — they are column-
  // restricted and loaded by the my_private_profile() effect above.
  // Re-hydrating them from `profile` here would blank the loaded values
  // every time the profile object changed.

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  // ---------------- DYNAMIC DATA ----------------
  /**
   * ═══════════════════════════════════════════════════════════════
   * REFERRAL DATA STATE
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - activeReferrals: Direct referrals made by the user
   * - passiveReferrals: Referrals from user's referral tree (passive network)
   * - Displays all referred members in "My Network" section
   * - Tracks network growth and engagement
   * - Shows member names, locations, and join dates
   */

  const [activeReferrals, setActiveReferrals] = useState<Referral[]>([]);
  const [passiveReferrals, setPassiveReferrals] = useState<Referral[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  /**
   * ═══════════════════════════════════════════════════════════════
   * LEADERSHIP CONTACTS STATE
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - leadersByRole: Leaders organized by role (Regional Coordinator, District President, Assembly Coordinator)
   * - Enables direct WhatsApp communication with local leadership
   * - Displays leader names, phone numbers, and roles
   * - Facilitates community organization and networking
   */

  const [leadersByRole, setLeadersByRole] = useState<
  Record<
    string,
    {
      id: string;
      name: string;
      whatsapp_number: string | null;
      whatsapp_number_2: string | null;
      photo_url: string | null;
    }[]
  >
>({});

  /**
   * LOCAL CONNECT — the member's own constituency, district and state
   * leaders, resolved server-side by my_local_connect().
   *
   * The RPC is SECURITY DEFINER and scoped to auth.uid(), so it needs no
   * arguments and cannot be pointed at another member's constituency.
   * It also deduplicates: a Regional Coordinator holding five district
   * postings is one person to contact, not five cards.
   */
  // LocalConnectLeader/localConnect and their fetch effect were replaced
  // by <MyLocalConnect />'s own fetch of my_local_connect().


  /**
   * ═══════════════════════════════════════════════════════════════
   * NRI COORDINATOR STATE
   * ═══════════════════════════════════════════════════════════════
   * Why this is used:
   * - Stores primary NRI (Non-Resident Indian) coordinator contact
   * - Provides dedicated support point for overseas members
   * - Stores name, phone, and email for direct communication
   * - Essential for NRI-specific programs and engagement
   * - Displayed in "Leadership Connect" section with other leaders
   */

  // nriCoordinator state and its "2.5 NRI COORDINATOR" fetch below were
  // only ever read by renderConnectContent(), removed with it.

  /**
   * ═══════════════════════════════════════════════════════════════
   * EVENTS & NOTIFICATIONS STATE
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - events: Broadcasts and important announcements for all members
   * - Displays latest events first (reverse chronological order)
   * - Shows event title, description, and creation date
   * - Integrated with unseen event count for notification badge
   *
   * Note: notifications state is currently disabled
   * (previously tracked user-specific notifications)
   */

  const [events, setEvents] = useState<EventItem[]>([]);
  //const [notifications, setNotifications] =
    //useState<NotificationItem[]>([]);

  /**
   * ═══════════════════════════════════════════════════════════════
   * FORM SUBMISSION TRACKING
   * ═══════════════════════════════════════════════════════════════
   * Why this is used:
   * - loadingDashboard: Tracks initial data loading for all sections
   * - Disables buttons during async operations to prevent double-submit
   * - Shows loading indicators to user
   * - Improves UX with visual feedback
   */

  const [loadingDashboard, setLoadingDashboard] = useState(false);

 // ---------------- REFERRAL STATS ----------------
  /**
   * ═══════════════════════════════════════════════════════════════
   * REFERRAL STATISTICS CALCULATION
   * ═══════════════════════════════════════════════════════════════
   * Why this memo is used:
   * - Calculates active referral count (direct referrals)
   * - Calculates passive referral count (tree network)
   * - Counts new referrals from the past 7 days
   * - Used to display network growth statistics
   * - Motivates users with achievement metrics
   * - Memoized to prevent unnecessary recalculations
   */

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
  /**
   * ═══════════════════════════════════════════════════════════════
   * TOAST NOTIFICATION AUTO-DISMISS
   * ═══════════════════════════════════════════════════════════════
   * Why this effect is used:
   * - Automatically dismisses toast notification after 3 seconds
   * - Cleans up timer on unmount to prevent memory leaks
   * - Provides non-intrusive feedback without user action required
   * - Improves UX by avoiding permanent UI clutter
   */

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

const toggleSection = async (section: SectionKey) => {
  setExpandedSection((prev) => (prev === section ? null : section));

  if (section === "events" && user && profile?.id) {
    await supabase
      .from("profiles")
      .update({
        events_last_seen_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    setUnseenEventsCount(0); // UI instant update
  }
};

// fetchMyServiceRequests() and its realtime subscription were replaced
// by <MyServiceRequests />'s own fetch + effect.

// Realtime: keep My Network in sync the moment a referral row is inserted
// (referrer_id matches the current user for both direct/active children
// and grandparent/passive grandchildren), and reflect server-side profile
// updates in the cached profile so dependent UI doesn't go stale.
useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`user-realtime-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${user.id}`,
      },
      () => {
        refreshProfile();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "referrals",
        filter: `referrer_id=eq.${user.id}`,
      },
      () => {
        fetchReferrals();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

// Fetches the user's active + passive referrals via the SECURITY DEFINER RPC.
// Called on mount, on a Realtime INSERT into the referrals table for this
// user, and from the manual "Refresh" buttons on the My Network tab.
const fetchReferrals = async () => {
  if (!user) return;
  setReferralsLoading(true);
  try {
    const buildReferral = (r: any, type: "active" | "passive"): Referral => {
      const first = r.first_name ?? "";
      const last = r.last_name ?? "";
      const abroad = [r.city_abroad, r.country_of_residence]
        .filter(Boolean)
        .join(", ");
      const indian = [r.assembly_constituency, r.district, r.indian_state]
        .filter(Boolean)
        .join(", ");

      // Build the upstream/direct-referrer object for passive rows. The RPC
      // (new_33) returns upstream_* columns; for active rows they're null.
      let upstream: Referral["upstream"] = null;
      if (type === "passive" && (r.upstream_first_name || r.upstream_last_name)) {
        const uFirst = r.upstream_first_name ?? "";
        const uLast = r.upstream_last_name ?? "";
        const uAbroad = [r.upstream_city_abroad, r.upstream_country_of_residence]
          .filter(Boolean)
          .join(", ");
        const uIndian = [
          r.upstream_assembly_constituency,
          r.upstream_district,
          r.upstream_indian_state,
        ]
          .filter(Boolean)
          .join(", ");
        upstream = {
          name:
            uLast && uLast !== uFirst ? `${uFirst} ${uLast}` : uFirst || "Member",
          mobile_number: r.upstream_mobile_number ?? null,
          location: uAbroad || uIndian || null,
          public_user_code: r.upstream_public_user_code ?? null,
        };
      }

      return {
        id: r.id,
        member_name: last && last !== first ? `${first} ${last}` : first || "Member",
        mobile_number: r.mobile_number ?? null,
        location: abroad || indian || "—",
        public_user_code: r.public_user_code ?? null,
        type,
        created_at: r.created_at,
        upstream,
      };
    };

    const { data: activeData, error: activeError } = await supabase.rpc(
      "get_my_referrals",
      { p_source: ["direct", "active"] }
    );
    if (activeError) console.error("Active referral error:", activeError);
    setActiveReferrals((activeData || []).map((r: any) => buildReferral(r, "active")));

    const { data: passiveData, error: passiveError } = await supabase.rpc(
      "get_my_referrals",
      { p_source: ["passive"] }
    );
    if (passiveError) console.error("Passive referral error:", passiveError);
    setPassiveReferrals((passiveData || []).map((r: any) => buildReferral(r, "passive")));
  } finally {
    setReferralsLoading(false);
  }
};

// Insert a row into event_applications for the current user. The
// confirmation modal calls this on "Yes". The set-state is optimistic
// so the button flips to Applied immediately; a hard error rolls it
// back. Duplicate applies are blocked by the UNIQUE (event_id, user_id)
// constraint at the DB level.
const handleConfirmApply = async (event: EventItem) => {
  if (!user) return;
  setApplyingEventId(event.id);
  // Optimistic flip
  setMyAppliedEventIds((prev) => new Set(prev).add(event.id));
  const { error } = await supabase
    .from("event_applications")
    .insert({ event_id: event.id, user_id: user.id });
  setApplyingEventId(null);
  setConfirmApplyEvent(null);
  if (error) {
    // Rollback the optimistic add. Ignore if the duplicate-key error
    // means we were already applied — that's a no-op for the user.
    if (!/duplicate key|already exists|unique/i.test(error.message)) {
      setMyAppliedEventIds((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
      showToast("Could not apply: " + error.message, "error");
      return;
    }
  }
  showToast("Applied — your details have been shared with the admin team", "success");
};

// Cancel the current user's application for an event. Same optimistic
// flip + rollback pattern.
const handleCancelApply = async (event: EventItem) => {
  if (!user) return;
  setApplyingEventId(event.id);
  setMyAppliedEventIds((prev) => {
    const next = new Set(prev);
    next.delete(event.id);
    return next;
  });
  const { error } = await supabase
    .from("event_applications")
    .delete()
    .eq("event_id", event.id)
    .eq("user_id", user.id);
  setApplyingEventId(null);
  if (error) {
    setMyAppliedEventIds((prev) => new Set(prev).add(event.id));
    showToast("Could not cancel: " + error.message, "error");
    return;
  }
  showToast("Application cancelled", "success");
};

// handleSubmitService() was replaced by <MyServiceRequests />'s own
// submit(), built to docs/design/nri-wing-prototype.html.





const handleRemovePhoto = async () => {
  if (!user || !profile?.profile_photo) {
    showToast("No profile photo to remove", "error");
    return;
  }

  try {
    // Extract storage path from public URL
    const filePath = profile.profile_photo.split(
      "/storage/v1/object/public/profile-photos/"
    )[1];

    if (!filePath) {
      showToast("Invalid photo path", "error");
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
    showToast("Failed to remove photo", "error");
  }
};

  // Photo handlers — open cropper modal when a file is selected
  const handleSelectPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCropperImageSrc(url);
    setCropperOriginalName(file.name);
    setCropPos({ x: 0, y: 0 });
    setCropZoom(1);
    setCropPixels(null);
    setCropperOpen(true);
    // reset the input so re-selecting the same file still triggers change
    e.target.value = "";
  };

  const cancelCropper = () => {
    if (cropperImageSrc) URL.revokeObjectURL(cropperImageSrc);
    setCropperOpen(false);
    setCropperImageSrc(null);
    setCropPixels(null);
  };

  const confirmCrop = async () => {
    if (!cropperImageSrc || !cropPixels) return;
    try {
      const blob = await getCroppedBlob(cropperImageSrc, cropPixels, 512);
      const extFromName = (cropperOriginalName.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(extFromName) ? extFromName : "jpg";
      const file = new File([blob], `crop.${safeExt}`, { type: "image/jpeg" });
      setPhotoFile(file);
      const previewUrl = URL.createObjectURL(blob);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview(previewUrl);
      if (cropperImageSrc) URL.revokeObjectURL(cropperImageSrc);
      setCropperImageSrc(null);
      setCropperOpen(false);
    } catch (err) {
      console.error("Crop failed:", err);
      showToast("Couldn't crop the image. Please try again.", "error");
    }
  };

  const handleUploadPhoto = async () => {
    if (!photoFile || !user) {
      showToast('No file selected or user not available', 'info');
      return;
    }

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `${user.id}_${Date.now()}.${fileExt}`;
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

console.log('Generated Public URL:', publicUrl);

// Save public URL in DB
const { error: updateError } = await supabase
  .from('profiles')
  .update({ profile_photo: publicUrl })
  .eq('id', user.id);


      if (updateError) {
        console.error('Profile update error', updateError);
        throw updateError;
      }

      // Wait a moment for the database to sync, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
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
  if (!user || !profile?.id) return;

  const loadDashboard = async () => {
    setLoadingDashboard(true);

    try {

// Active + passive referrals — load via the shared fetcher so the manual
// Refresh button and the Realtime listener can reuse the same logic.
await fetchReferrals();

     // 2. Leaders (NEW NORMALIZED LOGIC)
    // Even when the user has no Indian district/assembly (e.g., NRIs abroad),
    // we still fetch the GLOBAL coordinator(s) so they appear on every user's
    // Leadership Connect tab. Location-scoped leaders are added on top when
    // district + constituency are both available.
if (!district || !assembly) {
  const { data: globalOnly } = await supabase
    .from("leader_assignments")
    .select(`
      role,
      sort_order,
      district,
      constituency,
      leaders_master (
        id,
        name,
        whatsapp_number,
        whatsapp_number_2,
        photo_url,
        is_active
      )
    `)
    .eq("role", "Global Coordinator")
    .is("district", null)
    .eq("is_active", true);

  const globalGrouped: Record<
    string,
    {
      id: string;
      name: string;
      whatsapp_number: string | null;
      whatsapp_number_2: string | null;
      photo_url: string | null;
    }[]
  > = {};
  ((globalOnly as unknown as LeaderAssignmentRow[]) || []).forEach((item) => {
    if (!item.leaders_master?.is_active) return;
    if (!globalGrouped[item.role]) globalGrouped[item.role] = [];
    if (globalGrouped[item.role].some((l) => l.id === item.leaders_master.id)) return;
    globalGrouped[item.role].push({
      id: item.leaders_master.id,
      name: item.leaders_master.name,
      whatsapp_number: item.leaders_master.whatsapp_number,
      whatsapp_number_2: item.leaders_master.whatsapp_number_2,
      photo_url: item.leaders_master.photo_url,
    });
  });
  setLeadersByRole(globalGrouped);
} else {
  const normDistrict = normalizeDistrict(district).trim();
  const normConstituency = normalizeAssembly(assembly).trim();

  console.log("LEADERS QUERY FILTERS", {
    rawDistrict: district,
    rawConstituency: assembly,
    normalizedDistrict: normDistrict,
    normalizedConstituency: normConstituency,
  });

  // Location-scoped leaders (RC / DP / AC) — match the user's district.
  // For Assembly Coordinators the assignment row has a constituency value
  // and must match the user's. For Regional Coordinators / District
  // Presidents the constituency column is NULL — they cover the whole
  // district, so a district match alone is enough. The .or() filter
  // captures both: same constituency OR no constituency.
  //
  // PostgREST quoting: wrap the user-supplied value in double quotes so
  // a comma or paren in the profile field can't break the filter into
  // two parts. (Supabase JS already parameterises HTTP transport, so
  // this is purely a parser-safety guard, not an injection fix.) Inner
  // quotes / backslashes are escaped per PostgREST spec.
  const escapeOrValue = (v: string) =>
    `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  const constituencyFilter = `constituency.ilike.${escapeOrValue(
    normConstituency
  )},constituency.is.null`;
  const { data: locData, error: locErr } = await supabase
    .from("leader_assignments")
    .select(`
      role,
      sort_order,
      district,
      constituency,
      leaders_master (
        id,
        name,
        whatsapp_number,
        whatsapp_number_2,
        photo_url,
        is_active
      )
    `)
    .ilike("district", normDistrict)
    .or(constituencyFilter)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // Global leaders (e.g., "Aluru Sambasiva Reddy — Global Coordinator, YSRCP NRI Wing")
  // are stored with district = NULL and shown to every user regardless of address.
  const { data: globalData, error: globalErr } = await supabase
    .from("leader_assignments")
    .select(`
      role,
      sort_order,
      district,
      constituency,
      leaders_master (
        id,
        name,
        whatsapp_number,
        whatsapp_number_2,
        photo_url,
        is_active
      )
    `)
    .eq("role", "Global Coordinator")
    .is("district", null)
    .eq("is_active", true);

  if (locErr)    console.error("Leaders fetch error (location):", locErr);
  if (globalErr) console.error("Leaders fetch error (global):", globalErr);

  const combined = [
    ...((globalData as unknown as LeaderAssignmentRow[]) || []),
    ...((locData    as unknown as LeaderAssignmentRow[]) || []),
  ];

  const grouped = combined.reduce(
    (acc, item) => {
      if (!item.leaders_master?.is_active) return acc;

      if (!acc[item.role]) acc[item.role] = [];

      // Skip if same leader_id is already in this role (prevents dupes if a
      // leader somehow has multiple matching assignment rows).
      if (acc[item.role].some((l) => l.id === item.leaders_master.id)) return acc;

      acc[item.role].push({
        id: item.leaders_master.id,
        name: item.leaders_master.name,
        whatsapp_number: item.leaders_master.whatsapp_number,
        whatsapp_number_2: item.leaders_master.whatsapp_number_2,
        photo_url: item.leaders_master.photo_url,
      });

      return acc;
    },
    {} as Record<
      string,
      {
        id: string;
        name: string;
        whatsapp_number: string | null;
        whatsapp_number_2: string | null;
        photo_url: string | null;
      }[]
    >
  );

  setLeadersByRole(grouped);
}

      // =======================
      // 3. EVENTS
      // =======================
  // Pull `kind` so the UI can decide whether to render an "Apply" button
  // on each card (only kind='event' qualifies; 'notification' rows stay
  // announce-only).
  const { data: eventsData, error: eventsError } = await supabase
  .from("events")
  .select("id, title, info, status, date, venue, created_at, kind")
  .eq("status", "Sent")
  .order("date", { ascending: false, nullsFirst: false });

if (eventsError) {
  console.error("Events fetch error:", eventsError);
} else {
  setEvents(eventsData as EventItem[]);
}

// Pull the events the user has already applied to so the Apply button
// flips to "Applied" without needing to refetch after the click.
{
  const { data: appliedData } = await supabase
    .from("event_applications")
    .select("event_id")
    .eq("user_id", user.id);
  setMyAppliedEventIds(
    new Set((appliedData || []).map((r: any) => r.event_id))
  );
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
}, [user, profile?.id, district, assembly]);


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

      // ======>Uncommet this after buying the domain==========
// const referralLink =
//   profile?.referral_code && profile?.first_name
//     ? `https://ysrcpnriwing.org/ref/${profile.first_name.toLowerCase()}/${profile.referral_code}`
//     : '';

const referralLink =
  profile?.referral_code
    ? `${window.location.origin}/ref/${profile.referral_code}`
    : '';



 // const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  // ---------------- PROFILE COMPLETION & MISSING FIELDS ----------------
  // 🔹 Profile completion calculation
// Profile completion is a weighted average of every meaningful field
// the user can fill. Each item below contributes 1 unit out of TOTAL.
//
// Notable rules (from the requirements pass):
//   • Active Family Member fields are each counted individually — they
//     remain optional to *save* the profile, but until each one is
//     filled the bar can't reach 100%.
//   • Social links count individually too, so adding more handles
//     bumps the bar by one slot each instead of an all-or-nothing.
// Single source-of-truth for "is the profile complete?". Used by BOTH
// the percentage bar (`profileCompletion`) and the missing-fields list
// (`missingProfileFields`) so they can never disagree (e.g. bar at 96%
// while the list says "fully completed").
const profileChecklist = useMemo(() => {
  if (!profile) return [] as Array<{ key: string; label: string; ok: boolean }>;

  const isIndia =
    (countryOfResidence || profile.country_of_residence || "").trim() ===
    "India";

  const items: Array<{ key: string; label: string; ok: boolean }> = [
    // Identity
    { key: "photo",       label: "Add Profile Photo",      ok: !!profile.profile_photo },
    { key: "mobile",      label: "Add Mobile Number",      ok: !!profile.mobile_number },
    { key: "dob",         label: "Add Date of Birth",      ok: !!profile.dob },
    { key: "gender",      label: "Select Gender",          ok: !!profile.gender },

    // Address — Indian
    { key: "state",       label: "Select State",           ok: !!indianState },
    { key: "district",    label: "Select District",        ok: !indianState || !!district },
    { key: "assembly",    label: "Select Assembly",        ok: !district   || !!assembly },
    { key: "mandal",      label: "Select Mandal",          ok: !assembly   || !!mandal },

    // Professional
    { key: "profession",  label: "Select Profession",      ok: !!profile.profession },
    { key: "role",        label: "Add Role / Course",      ok: !!profile.role_designation },
    { key: "company",     label: "Add Company / University", ok: !!profile.organization },

    // Social links — each one is its own slot.
    { key: "facebook",    label: "Add Facebook",           ok: !!profile.facebook_id },
    { key: "twitter",     label: "Add Twitter",            ok: !!profile.twitter_id },
    { key: "linkedin",    label: "Add LinkedIn",           ok: !!profile.linkedin_id },
    { key: "instagram",   label: "Add Instagram",          ok: !!profile.instagram_id },

    // Contribution
    {
      key: "contribution",
      label: "Select Contribution Area",
      ok: Array.isArray(selectedContributions) && selectedContributions.length > 0,
    },

    // Active Family Member — optional to save, but each missing field
    // keeps the bar under 100% so the user knows what's still pending.
    { key: "familyRelation",    label: "Family Member — Relation",    ok: !!familyRelation },
    { key: "familyName",        label: "Family Member — Name",        ok: !!familyName },
    { key: "familyMobile",      label: "Family Member — Mobile",      ok: !!familyMobile },
    { key: "familyVillage",     label: "Family Member — Village",     ok: !!familyVillage },
    { key: "familyDesignation", label: "Family Member — Designation", ok: !!familyDesignation },
  ];

  // Abroad fields only apply when the user lives outside India.
  if (!isIndia) {
    items.push(
      { key: "state_abroad", label: "Select Abroad State", ok: !!profile.state_abroad },
      { key: "city_abroad",  label: "Select Abroad City",  ok: !!profile.city_abroad },
    );
  }

  return items;
}, [
  profile,
  countryOfResidence,
  selectedContributions,
  indianState,
  district,
  assembly,
  mandal,
  familyRelation,
  familyName,
  familyMobile,
  familyVillage,
  familyDesignation,
]);

const profileCompletion = useMemo(() => {
  if (profileChecklist.length === 0) return 0;
  const done = profileChecklist.filter((i) => i.ok).length;
  return Math.round((done / profileChecklist.length) * 100);
}, [profileChecklist]);

// Derived directly from the shared `profileChecklist` above so the
// missing-list and the percentage bar can never disagree (e.g. bar at
// 96% while the list claims "all complete").
const missingProfileFields = useMemo(
  () =>
    profileChecklist
      .filter((i) => !i.ok)
      .map(({ key, label }) => ({ key, label })),
  [profileChecklist]
);

// For MyHome's "People you referred" stat — same activeReferrals array
// the Referrals tab already fetches, just counted by calendar month
// rather than re-queried.
const _now = new Date();
const referralCountThisMonth = activeReferrals.filter((r) => {
  const d = new Date(r.created_at);
  return d.getFullYear() === _now.getFullYear() && d.getMonth() === _now.getMonth();
}).length;

const copyReferralLink = async () => {
  if (!referralLink) {
    showToast('Referral link not ready yet', 'info');
    return;
  }
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(referralLink);
      showToast('Referral Link Copied!');
      return;
    }
    const ta = document.createElement('textarea');
    ta.value = referralLink;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    showToast(ok ? 'Referral Link Copied!' : 'Copy failed — please copy manually', ok ? undefined : 'info');
  } catch {
    showToast('Copy failed — please copy manually', 'info');
  }
};
const missingFieldToRefMap: Record<string, React.RefObject<HTMLDivElement>> = {
  photo: profilePhotoRef,
  mobile: personalInfoRef,
  dob: personalInfoRef,
  gender: personalInfoRef,

  state_abroad: residencyRef,
  city_abroad: residencyRef,

  state: indianAddressRef,
  district: indianAddressRef,
  assembly: indianAddressRef,
  mandal: indianAddressRef,

  profession: professionalRef,
  role: professionalRef,
  company: professionalRef,

  facebook: professionalRef,
  twitter: professionalRef,
  linkedin: professionalRef,
  instagram: professionalRef,

  contribution: contributionRef,

  // Active Family Member fields all scroll to the professional section
  // where the family card lives (no dedicated ref today).
  familyRelation:    professionalRef,
  familyName:        professionalRef,
  familyMobile:      professionalRef,
  familyVillage:     professionalRef,
  familyDesignation: professionalRef,
};



  // --- ENRICHED SUMMARY RENDERERS (Visible when Collapsed) ---

 const renderProfileSummary = () => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full mt-1 opacity-90">
    {/* LEFT: Progress bar */}
    <div className="flex-1 min-w-[200px]">
      <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
        <span>Profile Completion</span>
        <span className="text-primary-600">{profileCompletion}%</span>
      </div>

      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full shadow-sm transition-all duration-500 ${
            profileCompletion === 100
              ? "bg-green-500"
              : "bg-primary-600"
          }`}
          style={{ width: `${profileCompletion}%` }}
        />
      </div>
    </div>

    {/* RIGHT: Status */}
    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 sm:border-l sm:border-gray-200 sm:pl-4">
      {profileCompletion === 100 ? (
        // ✅ VERIFIED
        <div className="flex items-center gap-1.5 text-green-600">
          <CheckCircle size={14} className="text-green-500" />
          <span>Verified</span>
        </div>
      ) : (
        // ⚠️ PENDING
        <div className="flex items-center gap-1.5 text-red-600">
          <AlertCircle
            size={14}
            className="text-red-500 animate-pulse"
          />
          <span>
            {missingProfileFields.length} Pending
          </span>
        </div>
      )}
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
        <span className="text-2xl font-black text-primary-600 leading-none">
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
// renderConnectSummary() was dead — defined, never called — and read
// the now-removed localConnect state. Removed with it.


  const renderServicesSummary = () => (
    <div className="flex flex-wrap items-center gap-4 w-full mt-1 opacity-90">
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-blue-50 text-primary-700 rounded text-[10px] font-bold uppercase border border-blue-100">
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


// Re-hydrate every editable state hook from the currently loaded
// profile. Called from the Cancel button so the user discards their
// in-progress edits without a network round-trip.
const resetEditsFromProfile = () => {
  if (!profile) return;
  setEditFirstName(profile.first_name || "");
  setEditLastName(profile.last_name || "");
  setEditMobileNumber(profile.mobile_number || "");
  setEditGender(profile.gender || "");
  setCountryOfResidence(profile.country_of_residence || "India");
  if (profile.country_of_residence !== "India") {
    setStateAbroad(profile.state_abroad || "");
    setCityAbroad(profile.city_abroad || "");
  } else {
    setStateAbroad("");
    setCityAbroad("");
  }
  setIndianState(profile.indian_state?.trim() || "");
  setDistrict(profile.district ? normalizeDistrict(profile.district) : "");
  setAssembly(
    profile.assembly_constituency
      ? normalizeAssembly(profile.assembly_constituency)
      : ""
  );
  setMandal(profile.mandal ? normalizeMandal(profile.mandal) : "");
  setProfession(profile.profession || "");
  setRoleDesignation(profile.role_designation || "");
  setOrganization(profile.organization || "");
  // family_* and dob are NOT on the profile object — they are column-
  // restricted and loaded by the my_private_profile() effect above.
  // Re-hydrating them from `profile` here would blank the loaded values
  // every time the profile object changed.

  // Uncontrolled social inputs — restore via direct DOM write.
  const setSocial = (id: string, val: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = val;
  };
  setSocial("facebook", profile.facebook_id || "");
  setSocial("twitter", profile.twitter_id || "");
  setSocial("linkedin", profile.linkedin_id || "");
  setSocial("instagram", profile.instagram_id || "");
};

const handleCancelProfileEdit = () => {
  resetEditsFromProfile();
  setProfileEditMode(false);
};

const handleSaveProfile = async () => {
  if (!user) return;

  try {
    // If a new photo was selected but not yet uploaded, upload it first
    if (photoFile) {
      await handleUploadPhoto();
    }

    // Personal details + Indian address + Current country address are
    // now editable from the dashboard (previously locked at registration
    // only). Email remains read-only because it's the auth identity.

    // Names must be letters and spaces only — reject digits, full
    // stops, commas, brackets, etc. (the input filter prevents typing
    // those, but a paste / programmatic update could still slip them
    // in).
    // Collect all field errors at once so every invalid field is highlighted.
    const fieldErrors: Record<string, string> = {};

    if (!isValidLettersOnly(editFirstName)) {
      fieldErrors.firstName = "Letters and spaces only.";
    }
    if (!isValidLettersOnly(editLastName)) {
      fieldErrors.lastName = "Letters and spaces only.";
    }

    {
      const sortedCodes = [...PROFILE_PHONE_CODES].sort((a, b) => b.length - a.length);
      let currentCode = "+91";
      for (const code of sortedCodes) {
        if (editMobileNumber.startsWith(code)) { currentCode = code; break; }
      }
      const nationalDigits = editMobileNumber.slice(currentCode.length).replace(/\D/g, "");
      const expected = PROFILE_PHONE_LENGTHS[currentCode];
      const maxLen = profilePhoneMaxDigits(currentCode);
      if (expected) {
        if (nationalDigits.length !== expected)
          fieldErrors.mobile = `Must be exactly ${expected} digits for ${currentCode}.`;
      } else if (nationalDigits.length < 7 || nationalDigits.length > maxLen) {
        fieldErrors.mobile = `Must be 7–${maxLen} digits for ${currentCode}.`;
      }
    }
    void isValidIndianMobile;

    if (familyMobile.trim()) {
      const famDigits = familyMobile.replace(/\D/g, "").replace(/^91/, "");
      if (famDigits.length !== 10)
        fieldErrors.familyMobile = "Must be exactly 10 digits.";
    }
    if (familyName.trim() && !isValidFamilyName(familyName))
      fieldErrors.familyName = "Letters and spaces only (one period allowed for initials).";
    if (familyVillage.trim() && !isValidLettersOnly(familyVillage))
      fieldErrors.familyVillage = "Letters and spaces only.";
    if (profession.trim() && !isValidLettersOnly(profession))
      fieldErrors.profession = "Letters and spaces only.";
    if (roleDesignation.trim() && !isValidLettersOnly(roleDesignation))
      fieldErrors.roleDesignation = "Letters and spaces only.";
    if (organization.trim() && !isValidLettersOnly(organization))
      fieldErrors.organization = "Letters and spaces only.";

    const socialValidations: Array<[string, string, string[]]> = [
      ["facebook",  (document.getElementById("facebook")  as HTMLInputElement)?.value || "", ["facebook.com", "fb.com"]],
      ["twitter",   (document.getElementById("twitter")   as HTMLInputElement)?.value || "", ["x.com", "twitter.com"]],
      ["linkedin",  (document.getElementById("linkedin")  as HTMLInputElement)?.value || "", ["linkedin.com"]],
      ["instagram", (document.getElementById("instagram") as HTMLInputElement)?.value || "", ["instagram.com"]],
    ];
    for (const [key, val, allowedDomains] of socialValidations) {
      const v = val.trim();
      if (v) {
        if (!isValidUrl(v)) {
          fieldErrors[key] = `Must be a valid URL starting with https://`;
        } else {
          try {
            const hostname = new URL(v).hostname.replace(/^www\./, '');
            if (!allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d)))
              fieldErrors[key] = `Must be a ${allowedDomains[0]} link.`;
          } catch {
            fieldErrors[key] = `Must be a valid URL starting with https://`;
          }
        }
      }
    }

    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dobDate > today) fieldErrors.dob = "Cannot be a future date.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setProfileFieldErrors(fieldErrors);
      return;
    }
    setProfileFieldErrors({});

    const facebook =
      (document.getElementById("facebook") as HTMLInputElement)?.value || "";

    const twitter =
      (document.getElementById("twitter") as HTMLInputElement)?.value || "";

    const linkedin =
      (document.getElementById("linkedin") as HTMLInputElement)?.value || "";

    const instagram =
      (document.getElementById("instagram") as HTMLInputElement)?.value || "";

    // Optional retrospective free text. Length-capped here as well as via
    // the textarea's maxLength, which does not apply to programmatic
    // setting or some paste/autofill paths.
    const contribution =
      (document.getElementById("contribution") as HTMLTextAreaElement)?.value ||
      "";

// Run every free-text field through the shared hygiene sanitiser
// before persisting. Strips control chars, zero-width / bidi chars.
// Empty strings are normalised to NULL for optional fields so the DB
// stays clean.
const updates = {
  // Personal details (now editable from the dashboard).
  first_name:           sanitizeText(editFirstName).trim() || null,
  last_name:            sanitizeText(editLastName).trim() || null,
  mobile_number:        sanitizeText(editMobileNumber).trim() || null,
  gender:               editGender || null,

  // Current country address (editable).
  country_of_residence: sanitizeText(countryOfResidence).trim() || null,
  state_abroad:         sanitizeText(stateAbroad).trim() || null,
  city_abroad:          sanitizeText(cityAbroad).trim() || null,

  // Indian address (editable).
  indian_state:          sanitizeText(indianState).trim() || null,
  district:              sanitizeText(district).trim() || null,
  assembly_constituency: sanitizeText(assembly).trim() || null,
  mandal:                sanitizeText(mandal).trim() || null,

  profession:         sanitizeText(profession).trim(),
  role_designation:   sanitizeText(roleDesignation).trim(),
  organization:       sanitizeText(organization).trim(),

  facebook_id:        sanitizeText(facebook).trim(),
  twitter_id:         sanitizeText(twitter).trim(),
  linkedin_id:        sanitizeText(linkedin).trim(),
  instagram_id:       sanitizeText(instagram).trim(),

  // Optional — empty string persisted as NULL so the column stays clean.
  contribution:       sanitizeText(contribution)
                        .trim()
                        .slice(0, CONTRIBUTION_MAX_LENGTH) || null,

  // dob and family_* are NOT sent here. They are withheld from the
  // authenticated role at the column level, so AuthContext never loads
  // them, so these inputs would submit '' -> NULL and erase whatever
  // the member actually had. A profile save must never destroy a field
  // the form could not read.
  //
  // They go through update_my_private_profile() below, which treats
  // NULL as "leave unchanged".

  updated_at: new Date().toISOString(),
};


    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("PROFILE UPDATE ERROR:", error);
      throw error;
    }

    // Private fields, only if this session actually loaded them. If the
    // RPC failed or was never called, privateLoaded stays false and we
    // send nothing rather than sending blanks.
    if (privateLoaded) {
      const { error: privErr } = await supabase.rpc("update_my_private_profile", {
        p_dob:                sanitizeText(dob).trim() || null,
        p_family_relation:    sanitizeText(familyRelation).trim() || null,
        p_family_name:        sanitizeText(familyName).trim() || null,
        p_family_mobile:      sanitizeText(familyMobile).trim() || null,
        p_family_village:     sanitizeText(familyVillage).trim() || null,
        p_family_designation: familyDesignation === 'Other'
          ? sanitizeText(familyDesignationOther).trim() || null
          : sanitizeText(familyDesignation).trim() || null,
        // Clearing is explicit: the member emptied a field that had a
        // value, rather than the field never having loaded.
        p_clear_dob:    privateOriginal.dob !== null && !sanitizeText(dob).trim(),
        p_clear_family: privateOriginal.hadFamily &&
                        !sanitizeText(familyName).trim() &&
                        !sanitizeText(familyMobile).trim(),
      });
      if (privErr) console.error("PRIVATE PROFILE UPDATE ERROR:", privErr);
    }

    await refreshProfile();
    showToast("Profile Updated Successfully!", "success");
    // Drop back to read-only after a successful save.
    setProfileEditMode(false);
  } catch (err) {
    console.error(err);
    showToast("Failed to update profile", "error");
  }
};


  // --- EXPANDED CONTENT RENDERERS ---

 
  // The previous profile screen lived here. Replaced by <MyProfile />,
  // built to docs/design/nri-wing-prototype.html.

  const renderReferralsContent = () => (
    <div className="space-y-6">
      {/* Top Row */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 md:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 shadow-lg">
        <div className="min-w-0">
          <h4 className="font-black text-xl mb-1">Grow the Network</h4>
          <p className="text-emerald-100 text-xs max-w-md">
            Share your unique link. Every direct sign-up appears here as a{" "}
            <b>direct referral</b>; when they refer their own contacts those count as{" "}
            <b>passive referrals</b> in your network. Top referrers get exclusive meeting
            invites with party leadership.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 w-full md:w-auto md:shrink-0">
          <code className="flex-1 min-w-0 text-xs font-mono text-white px-2 truncate md:max-w-[220px]">
            {referralLink}
          </code>
          <button
            onClick={async () => {
              if (!referralLink) {
                showToast('Referral link not ready yet', 'info');
                return;
              }
              // Preferred: modern Clipboard API (requires HTTPS / localhost)
              try {
                if (navigator.clipboard && window.isSecureContext) {
                  await navigator.clipboard.writeText(referralLink);
                  showToast('Referral Link Copied!');
                  return;
                }
                // Fallback: legacy execCommand for older / insecure contexts
                const ta = document.createElement('textarea');
                ta.value = referralLink;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                const ok = document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) {
                  showToast('Referral Link Copied!');
                } else {
                  showToast('Copy failed — please copy manually', 'info');
                }
              } catch (err) {
                console.error('Copy failed:', err);
                showToast('Could not copy — please copy manually', 'info');
              }
            }}
            className="bg-white text-emerald-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-emerald-50 transition-colors"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Tables - SCROLLABLE for large lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direct Referrals (formerly "Active") — every direct sign-up via your link */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Direct Referrals
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReferrals}
                disabled={referralsLoading}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 disabled:opacity-50 px-2 py-1 rounded hover:bg-primary-50"
                title="Refresh referrals"
              >
                {referralsLoading ? "Refreshing…" : "Refresh"}
              </button>
              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                {activeReferrals.length} Members
              </span>
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {activeReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No direct referrals yet.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {activeReferrals.map((r) => (
                  <li key={r.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">
                          {r.member_name || 'Member'}
                        </p>
                        {r.public_user_code && (
                          <p className="text-[10px] font-mono text-gray-400">
                            {r.public_user_code}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    {r.mobile_number && (
                      <p className="text-[11px] text-gray-600 mt-1 inline-flex items-center gap-1">
                        <span aria-hidden>📞</span>
                        <a
                          href={`tel:${r.mobile_number}`}
                          className="hover:text-primary-700 underline-offset-2 hover:underline"
                        >
                          {r.mobile_number}
                        </a>
                      </p>
                    )}
                    {r.location && r.location !== '—' && (
                      <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1">
                        <span aria-hidden>📍</span>
                        <span className="truncate">{r.location}</span>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Passive Referrals */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col max-h-[400px]">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center shrink-0">
            <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wider">
              Passive Referrals
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReferrals}
                disabled={referralsLoading}
                className="text-[11px] font-semibold text-primary-600 hover:text-primary-800 disabled:opacity-50 px-2 py-1 rounded hover:bg-primary-50"
                title="Refresh referrals"
              >
                {referralsLoading ? "Refreshing…" : "Refresh"}
              </button>
              <span className="text-[10px] bg-blue-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
                {passiveReferrals.length} Members
              </span>
            </div>
          </div>
          <div className="overflow-y-auto custom-scrollbar">
            {passiveReferrals.length === 0 ? (
              <div className="p-4 text-xs text-gray-500">No passive referrals yet.</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {passiveReferrals.map((r) => (
                  <li key={r.id} className="px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-800 truncate">
                          {r.member_name || 'Member'}
                        </p>
                        {r.public_user_code && (
                          <p className="text-[10px] font-mono text-gray-400">
                            {r.public_user_code}
                          </p>
                        )}
                      </div>
                      {/* Direct-referrer pill — replaces the date in the
                          corner. On hover (or focus) it opens a small
                          popover listing the active/direct referrer's
                          name + contact, so the viewer sees who actually
                          brought this passive member into the network.
                          The date moved underneath the row. */}
                      {r.upstream ? (
                        <div className="relative group shrink-0">
                          <button
                            type="button"
                            tabIndex={0}
                            className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full hover:bg-emerald-100 transition cursor-default"
                          >
                            Direct Referral
                          </button>
                          <div
                            className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto absolute right-0 top-full mt-1.5 z-30 w-60 bg-white border border-gray-200 shadow-xl rounded-lg p-3 text-left"
                            role="tooltip"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                              Direct referrer
                            </p>
                            <p className="text-sm font-bold text-gray-900 leading-tight break-words">
                              {r.upstream.name}
                            </p>
                            {r.upstream.public_user_code && (
                              <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                {r.upstream.public_user_code}
                              </p>
                            )}
                            {r.upstream.mobile_number && (
                              <p className="text-[11px] text-gray-600 mt-1.5 inline-flex items-center gap-1">
                                <span aria-hidden>📞</span>
                                <span className="break-all">{r.upstream.mobile_number}</span>
                              </p>
                            )}
                            {r.upstream.location && (
                              <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1">
                                <span aria-hidden>📍</span>
                                <span className="break-words">{r.upstream.location}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                          {formatDate(r.created_at)}
                        </span>
                      )}
                    </div>
                    {r.mobile_number && (
                      <p className="text-[11px] text-gray-600 mt-1 inline-flex items-center gap-1">
                        <span aria-hidden>📞</span>
                        <a
                          href={`tel:${r.mobile_number}`}
                          className="hover:text-primary-700 underline-offset-2 hover:underline"
                        >
                          {r.mobile_number}
                        </a>
                      </p>
                    )}
                    {r.location && r.location !== '—' && (
                      <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1">
                        <span aria-hidden>📍</span>
                        <span className="truncate">{r.location}</span>
                      </p>
                    )}
                    {/* Date row — moved out of the corner now that the
                        pill takes that slot. Always shown so the user
                        still sees when this referral was created. */}
                    {r.upstream && (
                      <p className="text-[10px] font-semibold text-gray-400 mt-1.5">
                        Added {formatDate(r.created_at)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

    </div>
  );

  // renderConnectContent() is replaced by <MyLocalConnect /> (built to
  // docs/design/nri-wing-prototype.html) and the existing <AbroadConnect />,
  // now on its own tab instead of embedded at the end of this one.

  // SERVICE_UI (the old per-category icon/colour map) and its consumer
  // were replaced by <MyServiceRequests />, built to
  // docs/design/nri-wing-prototype.html.

const renderEventsContent = () => {
  // An event is "active" if it has a future date OR no date at all
  // (treat undated announcements as still-relevant general notifications).
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const isActive = (e: EventItem) => {
    if (!e.date) return true;
    return new Date(e.date).getTime() >= todayMidnight.getTime();
  };

  const activeEvents = events.filter(isActive);
  const previousEvents = events
    .filter((e) => !isActive(e))
    .sort(
      (a, b) =>
        new Date(b.date || b.created_at).getTime() -
        new Date(a.date || a.created_at).getTime()
    );

  const card = (event: EventItem, faded = false) => {
    const accent = faded
      ? {
          bar: "bg-gray-300",
          dateChip: "bg-gray-100 text-gray-600 border-gray-200",
          ring: "border-gray-200",
        }
      : {
          bar: "bg-emerald-500",
          dateChip: "bg-emerald-50 text-emerald-700 border-emerald-200",
          ring: "border-gray-200",
        };

    return (
      <div
        key={event.id}
        className={`relative bg-white rounded-xl border ${accent.ring} shadow-sm hover:shadow transition pl-4 pr-4 py-3.5 mb-3 overflow-hidden ${
          faded ? "opacity-90" : ""
        }`}
      >
        {/* left accent bar */}
        <span
          className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar}`}
          aria-hidden
        />

        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h4 className="font-bold text-sm text-gray-900 leading-snug min-w-0 break-words">
            {event.title}
          </h4>
          {event.date && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${accent.dateChip}`}
            >
              {formatDate(event.date)}
            </span>
          )}
        </div>

        {event.info && (
          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
            {event.info}
          </p>
        )}

        {event.venue && (
          <p className="text-[11px] text-gray-500 mt-2 inline-flex items-center gap-1">
            <span aria-hidden>📍</span>
            <span className="truncate">{event.venue}</span>
          </p>
        )}

        {/* Apply button — only on event-kind rows that haven't passed.
            'notification' rows skip this entirely (announce-only). For
            past events the button is hidden because applications are
            no longer meaningful. */}
        {(event.kind === undefined || event.kind === "event") &&
          !faded &&
          (() => {
            const alreadyApplied = myAppliedEventIds.has(event.id);
            return (
              <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
                {alreadyApplied ? (
                  <button
                    onClick={() => void handleCancelApply(event)}
                    disabled={applyingEventId === event.id}
                    className="w-full text-[12px] font-semibold py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                    title="Click to cancel your application"
                  >
                    ✓ Applied — tap to cancel
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmApplyEvent(event)}
                    disabled={applyingEventId === event.id}
                    className="w-full text-[12px] font-bold uppercase tracking-wide py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Apply to attend
                  </button>
                )}
              </div>
            );
          })()}
      </div>
    );
  };

  // Tabs split notifications into Active (upcoming or undated) vs
  // Previous (past) so the user can scan one bucket at a time. Counts
  // per tab make it obvious whether anything new sits in each bucket.
  const tabs = [
    { id: "active" as const,   label: "Active",   list: activeEvents },
    { id: "previous" as const, label: "Previous", list: previousEvents },
  ];
  const currentList =
    notificationTab === "previous" ? previousEvents : activeEvents;

  return (
    <div className="pt-4 max-w-5xl">
      <h3 className="text-base font-bold text-gray-900 mb-3">Notifications</h3>

      {events.length === 0 ? (
        <div className="text-xs text-gray-500">No notifications yet.</div>
      ) : (
        <>
          {/* Status tabs */}
          <div className="flex flex-wrap gap-1.5 mb-4 border-b border-gray-200 pb-2">
            {tabs.map((t) => {
              const active = notificationTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setNotificationTab(t.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                    active
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.list.length}
                  </span>
                </button>
              );
            })}
          </div>

          {currentList.length === 0 ? (
            <p className="text-xs text-gray-500">
              {notificationTab === "previous"
                ? "No previous notifications."
                : "No active notifications at the moment."}
            </p>
          ) : (
            <div>
              {currentList.map((e) => card(e, notificationTab === "previous"))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

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

  /* ============================================================
     SIDEBAR NAV CONFIG
  ============================================================ */
  const navItems = [
    { id: "overview" as const,    label: "Home",         icon: Home,          color: "text-primary-600" },
    { id: "profile" as const,     label: "Profile",     icon: User,          color: "text-primary-600" },
    { id: "referrals" as const,   label: "My Network",  icon: Users,         color: "text-emerald-600" },
    { id: "services" as const,    label: "Services",    icon: Briefcase,     color: "text-amber-600" },
    { id: "events" as const,      label: "Notifications", icon: Bell,        color: "text-pink-600", badge: unseenEventsCount || 0 },
    { id: "connect" as const,     label: "Local Connect",  icon: MessageSquare, color: "text-primary-600" },
    { id: "abroad" as const,      label: "Abroad Connect", icon: Users,         color: "text-primary-600" },
    // The public community board — distinct from "Assistance" below,
    // which is the member's own private cases (student_requests/
    // service_requests/grievances, routed to a mentor/admin). This is
    // a new subsystem (assistance_posts/assistance_offers) built with
    // the user's explicit sign-off after checking the mock's model
    // against the schema and finding no board existed at all.
    { id: "board" as const,       label: "Assistance Board", icon: HandHeart,   color: "text-rose-600" },
    // Grievances and student assistance. Separate from Services, which
    // already lists service_requests — this is the half that had no home:
    // grievances were written by nothing and read by nothing, and
    // student_requests had no UI at all.
    { id: "assistance" as const,  label: "Assistance",  icon: LifeBuoy,      color: "text-rose-600" },
    { id: "grievances" as const,  label: "Grievances",  icon: Scale,         color: "text-red-600" },
    { id: "appointments" as const, label: "Appointments", icon: CalendarDays, color: "text-indigo-600" },
    { id: "army" as const,        label: "Digital Army", icon: Megaphone,    color: "text-cyan-600" },
    { id: "suggestions" as const, label: "Feedback",    icon: Send,          color: "text-purple-600" },
  ].concat(
    hasChapterRole
      ? [{ id: "chapter" as any, label: "My Chapter", icon: Shield, color: "text-primary-700" }]
      : []
  );

  const activeNav = navItems.find((n) => n.id === activeTab)!;

  const renderHome = () => (
    <MyHome
      profileCompletion={profileCompletion}
      nextMissingFieldLabel={missingProfileFields[0]?.label ?? null}
      referralCount={activeReferrals.length}
      referralCountThisMonth={referralCountThisMonth}
      referralLink={referralLink}
      onCopyReferralLink={copyReferralLink}
      onNavigate={(tab) => setActiveTab(tab as Tab)}
    />
  );

  const renderActiveContent = () => {
    switch (activeTab) {
      // Built to docs/design/nri-wing-prototype.html (screen m-home).
      case "overview":    return renderHome();
      // Built to docs/design/nri-wing-prototype.html.
      case "profile":     return <MyProfile />;
      case "referrals":   return renderReferralsContent();
      // Built to docs/design/nri-wing-prototype.html.
      case "services":    return <MyServiceRequests />;
      case "grievances":  return <Grievances />;
      case "events":      return renderEventsContent();
      // Built to docs/design/nri-wing-prototype.html.
      case "connect":     return <MyLocalConnect />;
      case "abroad":      return <MyAbroadConnect />;
      case "board":       return <MyAssistanceBoard />;
      case "assistance":  return <MyRequests />;
      case "appointments": return <Appointments />;
      case "army":        return <DigitalArmy />;
      case "chapter":     return <ChapterDashboard />;
      // Built to docs/design/nri-wing-prototype.html.
      case "suggestions": return <MyFeedback />;
      default:            return renderHome();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col md:flex-row font-sans bg-gray-50">

      {/* ========================================================
          CONFIRM-APPLY MODAL — opens when the user clicks "Apply to
          attend" on an event card. Forces a deliberate "yes" before
          their details are shared with the admin team.
      ======================================================== */}
      {confirmApplyEvent && (
        <div
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmApplyEvent(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Confirm attendance</h3>
              <p className="text-xs text-gray-500 mt-1">
                Click <b>Yes</b> only if you actually want to attend this event. Your name
                and contact details will be shared with the admin team.
              </p>
            </div>
            <div className="px-6 py-4">
              <div className="text-sm font-bold text-gray-900">
                {confirmApplyEvent.title}
              </div>
              {confirmApplyEvent.date && (
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                  📅 {formatDate(confirmApplyEvent.date)}
                </div>
              )}
              {confirmApplyEvent.venue && (
                <div className="text-[11px] text-gray-500 mt-0.5">
                  📍 {confirmApplyEvent.venue}
                </div>
              )}
              {confirmApplyEvent.info && (
                <p className="text-[12px] text-gray-700 mt-2 leading-relaxed line-clamp-4">
                  {confirmApplyEvent.info}
                </p>
              )}
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setConfirmApplyEvent(null)}
                disabled={applyingEventId === confirmApplyEvent.id}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleConfirmApply(confirmApplyEvent)}
                disabled={applyingEventId === confirmApplyEvent.id}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                {applyingEventId === confirmApplyEvent.id ? "Submitting…" : "Yes, apply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {/* ========================================================
          PROFILE PHOTO CROPPER MODAL
      ======================================================== */}
      {cropperOpen && cropperImageSrc && (
        <div className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Adjust your photo</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Drag to reposition · Pinch / scroll to zoom
                </p>
              </div>
              <button
                onClick={cancelCropper}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cropper canvas */}
            <div className="relative w-full h-[320px] sm:h-[380px] bg-gray-900">
              <Cropper
                image={cropperImageSrc}
                crop={cropPos}
                zoom={cropZoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCropPos}
                onZoomChange={setCropZoom}
                onCropComplete={(_area, pixels) => setCropPixels(pixels as PixelCrop)}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 w-12">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={cropZoom}
                  onChange={(e) => setCropZoom(Number(e.target.value))}
                  className="flex-1 accent-primary-600"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={cancelCropper}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmCrop}
                disabled={!cropPixels}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-500 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-md transition"
              >
                Crop & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {toast.type === 'success'
            ? <CheckCircle size={16} />
            : toast.type === 'error'
            ? <AlertCircle size={16} />
            : <Info size={16} />}
          <span className="text-xs font-bold uppercase tracking-wide">{toast.msg}</span>
        </div>
      )}

      {/* ========================================================
          MOBILE TOP BAR (hidden on md+)
      ======================================================== */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2.5 shadow-sm relative z-20">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <ProfileDropdown profile={profile ? { id: profile.id, first_name: profile.first_name || '', last_name: profile.last_name || '', email: profile.email, profile_photo: profile.profile_photo } : undefined} />
      </div>

      {/* ========================================================
          SIDEBAR — fixed on desktop, drawer on mobile
      ======================================================== */}
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`
          pt-navrail
          fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64
          flex flex-col
          transform transition-transform duration-300
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar top — logo & close btn */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,.09)" }}>
          <div className="flex items-center gap-3">
            <img src={nriLogo} alt="logo" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h1 className="pt-navrail-brand-name">NRI Wing</h1>
              <p className="pt-navrail-brand-sub">Member Portal</p>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden p-1.5 rounded-lg"
            style={{ color: "rgba(255,255,255,.7)" }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`pt-navrail-btn ${isActive ? "on" : ""}`}
              >
                <Icon size={16} className="ico" />
                <span className="flex-1 text-left">{item.label}</span>
                {(item as any).badge > 0 && (
                  <span className="pt-navrail-count">{(item as any).badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom — status + logout */}
        <div className="pt-navrail-foot space-y-2">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: "rgba(255,255,255,.4)" }}>
            <span className={`w-1.5 h-1.5 rounded-full ${loadingDashboard ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            {loadingDashboard ? "Syncing..." : "Online"}
          </div>
          <button
            onClick={async () => {
              try {
                await signOut();
                window.location.href = "/";
              } catch (e) {
                console.error(e);
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition"
            style={{ color: "rgba(255,120,110,.85)" }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* ========================================================
          MAIN CONTENT
      ======================================================== */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Desktop page header — slim */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
          <h2 className="font-bold text-base text-gray-900">{activeNav.label}</h2>
          <ProfileDropdown profile={profile ? { id: profile.id, first_name: profile.first_name || '', last_name: profile.last_name || '', email: profile.email, profile_photo: profile.profile_photo } : undefined} />
        </div>

        {/* Tab content */}
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-10">
            {renderActiveContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;