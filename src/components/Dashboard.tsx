
import React, { useState, useEffect, useMemo ,useRef} from 'react';
import { createPortal } from 'react-dom';
import { Listbox } from "@headlessui/react";
import { ProfileDropdown } from './ProfileDropdown';
import nriLogo from './nrilogo.png';
import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";


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
  Home,
  Menu,
  X,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Cropper from 'react-easy-crop';
import { getCroppedBlob, PixelCrop } from '../lib/cropImage';


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
};
type LeaderAssignmentRow = {
  role: string;
  sort_order: number | null;
  leaders_master: {
    id: string;
    name: string;
    whatsapp_number: string | null;
    whatsapp_number_2: string | null;
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

const Dashboard: React.FC = () => {
  const { user, refreshProfile, profile, signOut } = useAuth();

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
    | "suggestions";
  const VALID_TABS: readonly Tab[] = [
    "overview",
    "profile",
    "referrals",
    "services",
    "events",
    "connect",
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
  
 const [selectedService, setSelectedService] = useState<keyof typeof SERVICE_CONFIG | null>(null);
const [selectedSub, setSelectedSub] = useState<string | null>(null);
const [selectedInner, setSelectedInner] = useState<string | null>(null);
  useEffect(() => {
    setSelectedSub(null);
    setSelectedInner(null);
  }, [selectedService]);

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

  const [submittingService, setSubmittingService] = useState(false);

  // Current user's own service requests (for "My Service Requests" list)
  type MyServiceRequest = {
    id: string;
    service_type: string;
    service_category: string | null;
    service_option: string | null;
    description: string | null;
    status: string;
    assigned_to: string | null;
    action_taken: string | null;
    admin_comments: string | null;
    created_at: string;
  };
  const [myRequests, setMyRequests] = useState<MyServiceRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);

  // Credit ledger (last N entries shown on Refer & Earn tab)
  type CreditEntry = {
    id: string;
    delta: number;
    reason: string;
    note: string | null;
    created_at: string;
  };
  const [creditLedger, setCreditLedger] = useState<CreditEntry[]>([]);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  // Reward catalogue + user's own redemption history
  type Perk = {
    id: string;
    name: string;
    description: string | null;
    cost_credits: number;
    is_active: boolean;
  };
  type Redemption = {
    id: string;
    perk_name: string;
    cost_credits: number;
    status: "pending" | "approved" | "rejected";
    admin_note: string | null;
    created_at: string;
    decided_at: string | null;
  };
  const [perks, setPerks] = useState<Perk[]>([]);
  const [myRedemptions, setMyRedemptions] = useState<Redemption[]>([]);
  const [redeemingPerkId, setRedeemingPerkId] = useState<string | null>(null);

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
    type: "success" | "info";
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

  const showToast = (msg: string, type: "success" | "info" = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
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
  setFamilyRelation((profile as any).family_relation || "");
  setFamilyName((profile as any).family_name || "");
  setFamilyMobile((profile as any).family_mobile || "");
  setFamilyVillage((profile as any).family_village || "");
  setFamilyDesignation((profile as any).family_designation || "");
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
    }[]
  >
>({});

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

  const [nriCoordinator, setNriCoordinator] = useState<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null>(null);

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
   * Why these are used:
   * - submittingSuggestion: Tracks suggestion form submission state
   * - loadingDashboard: Tracks initial data loading for all sections
   * - Disables buttons during async operations to prevent double-submit
   * - Shows loading indicators to user
   * - Improves UX with visual feedback
   */

  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  /**
   * ═══════════════════════════════════════════════════════════════
   * FORM REFERENCES
   * ═══════════════════════════════════════════════════════════════
   * Why these are used:
   * - serviceMessageRef: Accesses textarea for service request message
   * - suggestionRef: Accesses textarea for user suggestions/feedback
   * - Allows programmatic access to form values
   * - Used to clear form after submission
   */

  const serviceMessageRef = useRef<HTMLTextAreaElement | null>(null);
  const suggestionRef = useRef<HTMLTextAreaElement | null>(null);

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

const fetchMyServiceRequests = async () => {
  if (!user) return;
  setLoadingMyRequests(true);
  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "id, service_type, service_category, service_option, description, status, assigned_to, action_taken, admin_comments, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (!error && data) setMyRequests(data as MyServiceRequest[]);
  setLoadingMyRequests(false);
};

useEffect(() => {
  fetchMyServiceRequests();
  fetchCreditLedger();
  fetchRewardPerks();
  fetchMyRedemptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

// Realtime: credits arrive without a refresh.
// Subscribes to INSERTs on credit_transactions for this user and to
// UPDATEs on the user's profile row (so credits_balance ticks live).
useEffect(() => {
  if (!user?.id) return;

  const channel = supabase
    .channel(`credits-${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "credit_transactions",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        fetchCreditLedger();
      }
    )
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
        event: "*",
        schema: "public",
        table: "redemptions",
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        fetchMyRedemptions();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id]);

// Last 10 credit ledger entries for the current user.
// Also refreshes the profile so the cached balance pill stays accurate.
const fetchCreditLedger = async () => {
  if (!user) return;
  const { data } = await supabase
    .from("credit_transactions")
    .select("id, delta, reason, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (data) setCreditLedger(data as CreditEntry[]);
  // also pull fresh credits_balance
  refreshProfile();
};

// Active perks (catalogue). Admins manage these from the Rewards page.
const fetchRewardPerks = async () => {
  const { data } = await supabase
    .from("reward_perks")
    .select("id, name, description, cost_credits, is_active")
    .eq("is_active", true)
    .order("cost_credits", { ascending: true });
  if (data) setPerks(data as Perk[]);
};

// User's own redemption history (status + admin note).
const fetchMyRedemptions = async () => {
  if (!user) return;
  const { data } = await supabase
    .from("redemptions")
    .select("id, perk_name, cost_credits, status, admin_note, created_at, decided_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);
  if (data) setMyRedemptions(data as Redemption[]);
};

// User-initiated redeem: inserts a pending redemption row.
// The admin approves it; the DB trigger posts the negative ledger entry
// atomically with a balance check, so we don't trust the client here.
const handleRedeemPerk = async (perk: Perk) => {
  if (!user) return;
  const balance = profile?.credits_balance ?? 0;
  if (balance < perk.cost_credits) {
    showToast(`Need ${perk.cost_credits - balance} more credits`, "info");
    return;
  }
  setRedeemingPerkId(perk.id);
  const { error } = await supabase.from("redemptions").insert({
    user_id: user.id,
    perk_id: perk.id,
    perk_name: perk.name,
    cost_credits: perk.cost_credits,
    status: "pending",
  });
  setRedeemingPerkId(null);
  if (error) {
    console.error(error);
    showToast("Could not submit redemption", "info");
    return;
  }
  showToast("Redemption request submitted!", "success");
  fetchMyRedemptions();
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
        current_location: countryOfResidence || "India",

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
    fetchMyServiceRequests();
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
      showToast("Couldn't crop the image. Please try again.", "info");
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

// Build a referral row for display: name + mobile + address (abroad first,
// then Indian fallback) + join date. The RPC returns flattened columns
// (no embedded `profiles` object) because it joins server-side under
// SECURITY DEFINER — that's how it bypasses the strict per-user RLS on
// profiles without leaking anything beyond the caller's referral tree.
const buildReferral = (r: any, type: "active" | "passive") => {
  const first = r.first_name ?? "";
  const last = r.last_name ?? "";
  const abroad = [r.city_abroad, r.country_of_residence]
    .filter(Boolean)
    .join(", ");
  const indian = [r.assembly_constituency, r.district, r.indian_state]
    .filter(Boolean)
    .join(", ");
  return {
    id: r.id,
    member_name: last && last !== first ? `${first} ${last}` : first || "Member",
    mobile_number: r.mobile_number ?? null,
    location: abroad || indian || "—",
    public_user_code: r.public_user_code ?? null,
    type,
    created_at: r.created_at,
  };
};

// ---------------- ACTIVE REFERRALS ----------------
// Use the SECURITY DEFINER RPC instead of an embedded join. Profiles RLS
// would otherwise null-out every joined column for users other than self.
const { data: activeData, error: activeError } = await supabase.rpc(
  "get_my_referrals",
  { p_source: ["direct", "active"] }
);

if (activeError) {
  console.error("Active referral error:", activeError);
}

setActiveReferrals((activeData || []).map((r: any) => buildReferral(r, "active")));


// ---------------- PASSIVE REFERRALS ----------------
const { data: passiveData, error: passiveError } = await supabase.rpc(
  "get_my_referrals",
  { p_source: ["passive"] }
);

if (passiveError) {
  console.error("Passive referral error:", passiveError);
}

setPassiveReferrals((passiveData || []).map((r: any) => buildReferral(r, "passive")));

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
        is_active
      )
    `)
    .eq("role", "Global Coordinator")
    .is("district", null)
    .eq("is_active", true);

  const globalGrouped: Record<
    string,
    { id: string; name: string; whatsapp_number: string | null; whatsapp_number_2: string | null }[]
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

  // Location-scoped leaders (RC / DP / AC) — match the user's district + constituency.
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
        is_active
      )
    `)
    .ilike("district", normDistrict)
    .ilike("constituency", normConstituency)
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
      });

      return acc;
    },
    {} as Record<
      string,
      { id: string; name: string; whatsapp_number: string | null; whatsapp_number_2: string | null }[]
    >
  );

  setLeadersByRole(grouped);
}

      // =======================
      // 2.5 NRI COORDINATOR
      // =======================
      const { data: nriData, error: nriError } = await supabase
        .from("coordinators")
        .select("id, name, phone, email")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (nriError) {
        console.error("NRI Coordinator fetch error:", nriError);
      } else if (nriData) {
        setNriCoordinator(nriData);
      }




      // =======================
      // 3. EVENTS
      // =======================
  const { data: eventsData, error: eventsError } = await supabase
  .from("events")
  .select("id, title, info, status, date, venue, created_at")
  .eq("status", "Sent")
  .order("date", { ascending: false, nullsFirst: false });

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

const fullName = (() => {
  // Primary: Use profile first_name if available
  if (profile?.first_name) {
    const last = profile.last_name && profile.last_name !== profile.first_name
      ? ` ${profile.last_name}`  
      : '';
    return `${profile.first_name}${last}`;
  }
  
  // Secondary: Use profile last_name if first_name missing
  if (profile?.last_name) {
    return profile.last_name;
  }
  
  // Tertiary: Use auth metadata as fallback (profile might be null temporarily during token refresh)
  if (user?.user_metadata?.first_name) {
    const last = user.user_metadata?.last_name ? ` ${user.user_metadata.last_name}` : '';
    return `${user.user_metadata.first_name}${last}`;
  }
  
  // Final fallback: Use full_name from auth metadata
  if (user?.user_metadata?.full_name) {
    return String(user.user_metadata.full_name);
  }
  
  return 'Member';
})();


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
const profileCompletion = useMemo(() => {
  if (!profile) return 0;

  const TOTAL_SECTIONS = 11;
  let completed = 0;

  // 1️⃣ Name
  if (profile.first_name) completed++;

  // 2️⃣ Mobile
  if (profile.mobile_number) completed++;

  // 3️⃣ DOB
  if (profile.dob) completed++;

  // 4️⃣ Photo
  if (profile.profile_photo) completed++;

  // 5️⃣ Indian State
  if (indianState) completed++;

  // 6️⃣ District
  if (!indianState || district) completed++;

  // 7️⃣ Assembly
  if (!district || assembly) completed++;

  // 8️⃣ Mandal
  if (!assembly || mandal) completed++;

  // 9️⃣ Profession + Role + Company
  if (
    profile.profession &&
    profile.role_designation &&
    profile.organization
  ) {
    completed++;
  }

  // 🔟 Socials
  if (
    profile.facebook_id &&
    profile.twitter_id &&
    profile.linkedin_id &&
    profile.instagram_id
  ) {
    completed++;
  }

  // 1️⃣1️⃣ Contribution
  if (
    Array.isArray(selectedContributions) &&
    selectedContributions.length > 0
  ) {
    completed++;
  }

  return Math.round((completed / TOTAL_SECTIONS) * 100);
}, [
  profile,
  selectedContributions,
  indianState,
  district,
  assembly,
  mandal,
]);

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
const isIndia =
  (countryOfResidence || profile.country_of_residence) === "India";
// ✅ 1. Check Indian State FIRST
if (!indianState) {
  missing.push({
    key: "state",
    label: "Select State",
  });
}

if (indianState) {
  if (!district)
    missing.push({ key: "district", label: "Select District" });

  if (!assembly)
    missing.push({ key: "assembly", label: "Select Assembly" });

  if (!mandal)
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
  missing.push({ key: "role", label: "Add Role / Course" });

if (!profile.organization)
  missing.push({ key: "company", label: "Add Company / University" });

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
}, [
  profile,
  selectedContributions,
  indianState,
  district,
  assembly,
  mandal,
]);
const missingFieldToRefMap: Record<string, React.RefObject<HTMLDivElement>> = {
  photo: profilePhotoRef,
  mobile: personalInfoRef,
  dob: personalInfoRef,

  state_abroad: residencyRef,
  city_abroad: residencyRef,

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
const renderConnectSummary = () => {
  const allLeaders = Object.values(leadersByRole).flat();
  const firstRole = Object.keys(leadersByRole)[0];

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-4 mt-1 opacity-90">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-600">Leadership Contacts</span>
      </div>
    </div>
  );
};


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


const handleSaveProfile = async () => {
  if (!user) return;

  try {
    // If a new photo was selected but not yet uploaded, upload it first
    if (photoFile) {
      await handleUploadPhoto();
    }

    // 🔒 Locked fields (first_name, last_name, mobile_number, country/state/city,
    //    indian_state, district, assembly, mandal) are set during registration and
    //    must NOT be overwritten from the dashboard.

const dob =
  (document.getElementById("dob") as HTMLInputElement)?.value || null;

// Validate DOB — reject future dates
if (dob) {
  const dobDate = new Date(dob);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // end of today
  if (dobDate > today) {
    showToast("Date of Birth cannot be a future date", "info");
    return;
  }
}

    const facebook =
      (document.getElementById("facebook") as HTMLInputElement)?.value || "";

    const twitter =
      (document.getElementById("twitter") as HTMLInputElement)?.value || "";

    const linkedin =
      (document.getElementById("linkedin") as HTMLInputElement)?.value || "";

    const instagram =
      (document.getElementById("instagram") as HTMLInputElement)?.value || "";

const updates = {
  dob,
  profession,
  role_designation: roleDesignation,
  organization: organization,

  facebook_id: facebook,
  twitter_id: twitter,
  linkedin_id: linkedin,
  instagram_id: instagram,

  // Active family member (optional — empty strings persisted as NULL)
  family_relation:    familyRelation || null,
  family_name:        familyName.trim() || null,
  family_mobile:      familyMobile.trim() || null,
  family_village:     familyVillage.trim() || null,
  family_designation: familyDesignation.trim() || null,

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
      country: countryOfResidence || "India",
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
    <div className="pt-4 " style={{ overflowAnchor: "none" }}>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Progress & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Photo Block */}
          <div
  ref={profilePhotoRef}
  className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center"
>

            <div className="w-28 h-28 mx-auto rounded-full overflow-hidden bg-gray-100 mb-3">
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
              ) : profile?.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                  No Photo
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-1">
              <label className="px-4 py-2 bg-primary-600 text-white rounded-lg cursor-pointer text-xs font-bold hover:bg-primary-700 transition">
                {profile?.profile_photo || photoPreview ? "Change Photo" : "Upload Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSelectPhoto}
                />
              </label>
              {profile?.profile_photo && !photoPreview && (
                <button
                  onClick={handleRemovePhoto}
                  className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                >
                  Remove
                </button>
              )}
            </div>
            {photoPreview && (
              <p className="mt-2 text-[10px] text-gray-500 italic">
                Click "Save Details" to upload
              </p>
            )}
            {uploading && (
              <p className="mt-2 text-[10px] text-primary-600 font-semibold">
                Uploading…
              </p>
            )}

          </div>
          {(() => {
            // Color scheme based on completion percentage
            const pct = profileCompletion;
            const tier =
              pct === 100 ? "complete" :
              pct >= 70  ? "good"     :
              pct >= 40  ? "fair"     :
                           "low";

            const palette = {
              complete: { bg: "bg-emerald-600", track: "text-emerald-800", bar: "text-white",     label: "text-emerald-100", status: "All set!" },
              good:     { bg: "bg-primary-600", track: "text-primary-800", bar: "text-white",     label: "text-primary-100", status: "Almost there" },
              fair:     { bg: "bg-amber-500",   track: "text-amber-700",   bar: "text-white",     label: "text-amber-50",    status: "Keep going" },
              low:      { bg: "bg-red-500",     track: "text-red-700",     bar: "text-white",     label: "text-red-50",      status: "Needs attention" },
            }[tier];

            return (
              <div className={`${palette.bg} rounded-xl p-3 text-white shadow-md relative overflow-hidden flex items-center gap-3`}>
                <div className="w-14 h-14 relative flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className={palette.track}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={palette.bar}
                      strokeDasharray={`${pct} ${100 - pct}`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[11px] font-black">{pct}%</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold leading-tight">Profile Completion</h3>
                  <p className={`text-[11px] ${palette.label} mt-0.5`}>{palette.status}</p>
                </div>
              </div>
            );
          })()}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 text-red-600">
              Missing Info
            </h4>
           <div className="space-y-2">
 {missingProfileFields.length === 0 ? (
  <div className="text-xs text-green-600 font-bold">
    🎉 Profile fully completed
  </div>
) : (
  missingProfileFields.map((item) => (
  <div
    key={item.key}
    onClick={() => {
      // 1️⃣ Open Profile section
      setExpandedSection("profile");

      // 2️⃣ Scroll to exact section after it opens
      setTimeout(() => {
        const ref = missingFieldToRefMap[item.key];
        ref?.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 200);
    }}
    className="flex items-center justify-between p-2 bg-white
               border border-gray-200 rounded hover:border-primary-300
               cursor-pointer transition-all"
  >

      <span className="text-xs font-bold text-gray-600">
        {item.label}
      </span>
      <ArrowRight size={12} className="text-primary-500" />
    </div>
  ))
)}

</div>

          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-2 space-y-6">

          <div ref={personalInfoRef}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                First Name <span className="text-gray-300">🔒</span>
              </label>
              <input
                id="firstName"
                type="text"
                readOnly
                value={profile?.first_name || ''}
                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Last Name <span className="text-gray-300">🔒</span>
              </label>
              <input
                id="lastName"
                type="text"
                readOnly
                value={profile?.last_name || ''}
                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Email <span className="text-gray-300">🔒</span>
              </label>
              <input
                id="email"
                type="email"
                readOnly
                value={profile?.email ?? ''}
                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                Mobile Number <span className="text-gray-300">🔒</span>
              </label>
              <input
                id="mobile_number"
                type="tel"
                readOnly
                value={profile?.mobile_number || ""}
                className="w-full p-3 bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-500 cursor-not-allowed"
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
    max={new Date().toISOString().split("T")[0]}
    min="1900-01-01"
    className="w-full p-3 bg-gray-50 border border-gray-200
               rounded-lg text-sm font-bold text-gray-700
               focus:bg-white focus:ring-2 focus:ring-primary-500
               outline-none transition-all"
  />
</div>

{/* 🌍 Current Residency — LOCKED (filled during registration) */}
<div ref={residencyRef} className="md:col-span-2 mt-4">
  <label className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
    Current Residency <span className="text-gray-300">🔒</span>
  </label>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div>
      <label className="text-[10px] font-medium text-gray-500 mb-1 block">Country</label>
      <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
        {countryOfResidence || "—"}
      </div>
    </div>
    {countryOfResidence !== "India" && (
      <>
        <div>
          <label className="text-[10px] font-medium text-gray-500 mb-1 block">State / Province</label>
          <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
            {stateAbroad || "—"}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-medium text-gray-500 mb-1 block">City</label>
          <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
            {cityAbroad || "—"}
          </div>
        </div>
      </>
    )}
  </div>
</div>

{/* 📍 India Address — LOCKED (filled during registration) */}
<div ref={indianAddressRef} className="md:col-span-2 mt-4 ">
  <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
    India Address <span className="text-gray-300">🔒</span>
  </h4>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div>
      <label className="text-[10px] font-medium text-gray-500 mb-1 block">State</label>
      <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
        {indianState || "—"}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-medium text-gray-500 mb-1 block">District</label>
      <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
        {district || "—"}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-medium text-gray-500 mb-1 block">Assembly Constituency</label>
      <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
        {assembly || "—"}
      </div>
    </div>
    <div>
      <label className="text-[10px] font-medium text-gray-500 mb-1 block">Mandal</label>
      <div className="w-full h-11 px-3 flex items-center bg-gray-100 border border-gray-200 rounded-lg text-sm font-semibold text-gray-500">
        {mandal || "—"}
      </div>
    </div>
  </div>
</div>

{/* ============== ACTIVE FAMILY MEMBER (optional) ============== */}
<div className="p-5 bg-white rounded-xl border border-gray-200 mt-5">
  <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
    <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
      Active Family Member in the Party
    </h4>
    <span className="text-[10px] font-semibold text-gray-400 italic">
      Optional — fill only if you have an active YSRCP family member
    </span>
  </div>
  <p className="text-[11px] text-gray-500 mb-4">
    These details help the party's NRI Wing connect you to your local network faster.
  </p>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        Relation
      </label>
      <select
        value={familyRelation}
        onChange={(e) => setFamilyRelation(e.target.value)}
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      >
        <option value="">— Select relation —</option>
        <option value="Father">Father</option>
        <option value="Mother">Mother</option>
        <option value="Brother">Brother</option>
        <option value="Sister">Sister</option>
        <option value="Uncle">Uncle</option>
        <option value="Cousin">Cousin</option>
        <option value="Others">Others</option>
      </select>
    </div>

    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        Name
      </label>
      <input
        type="text"
        value={familyName}
        onChange={(e) => setFamilyName(e.target.value)}
        placeholder="Family member's full name"
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      />
    </div>

    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        Mobile Number
      </label>
      <input
        type="tel"
        value={familyMobile}
        onChange={(e) => setFamilyMobile(e.target.value)}
        placeholder="+91XXXXXXXXXX"
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      />
    </div>

    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        Village
      </label>
      <input
        type="text"
        value={familyVillage}
        onChange={(e) => setFamilyVillage(e.target.value)}
        placeholder="Native village"
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      />
    </div>

    <div className="md:col-span-2">
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
        Designation <span className="font-normal text-gray-400 italic normal-case">(optional)</span>
      </label>
      <input
        type="text"
        value={familyDesignation}
        onChange={(e) => setFamilyDesignation(e.target.value)}
        placeholder="e.g. Mandal President, Sarpanch, Party Worker"
        className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
                   text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
      />
    </div>
  </div>
</div>
          </div>


    <div
  ref={professionalRef}
  className="p-5 bg-white rounded-xl border border-gray-200"
>

            <h4 className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wider">
              Professional & Social
            </h4>

<div className="mb-4">
  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Professional Category
  </label>
  <input
    type="text"
    value={profession}
    onChange={(e) => setProfession(e.target.value)}
    placeholder="e.g. Software Engineer, Doctor, Business Owner, Student"
    className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
               text-sm font-semibold
               focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
  />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="mb-4">
   <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
    Role / Designation
  </label>
  <input
    id="role_designation"
    type="text"
    value={roleDesignation}
    onChange={(e) => setRoleDesignation(e.target.value)}
    placeholder="e.g. Senior Developer, Founder, B.Tech CS"
    className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
               text-sm font-semibold
               focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
  />
  </div>

  <div className="mb-4">
    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
      Company / Organization Name
    </label>
  <input
    id="organization"
    type="text"
    value={organization}
    onChange={(e) => setOrganization(e.target.value)}
    placeholder="e.g. Infosys, IIT Delhi"
    className="w-full h-12 px-3 bg-gray-50 border border-gray-300 rounded-lg
               text-sm font-semibold"
  />
  </div>
</div>

            {/* Social Media Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Facebook className="absolute left-3 top-3 text-primary-600" size={16} />
                <input
                id="facebook"
                  type="text"
                  defaultValue={profile?.facebook_id ?? ''}
                  placeholder="Facebook Profile URL / ID"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="relative">
                <Twitter className="absolute left-3 top-3 text-black" size={16} />
                <input
                id="twitter"
                  type="text"
                  defaultValue={profile?.twitter_id ?? ''}
                  placeholder="X (Twitter) Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 text-primary-700" size={16} />
                <input
                id="linkedin"
                  type="text"
                  defaultValue={profile?.linkedin_id ?? ''}
                  placeholder="LinkedIn Profile URL"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="relative">
                <Instagram className="absolute left-3 top-3 text-pink-600" size={16} />
                <input
                id="instagram"
                  type="text"
                  defaultValue={profile?.instagram_id ?? ''}
                  placeholder="Instagram Handle"
                  className="w-full pl-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

<div ref={contributionRef} className="mt-6">
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
                     hover:border-primary-500 hover:bg-primary-50"
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
    </div>
  );

  const renderReferralsContent = () => (
    <div className="space-y-6">
      {/* Top Row */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div>
          <h4 className="font-black text-xl mb-1">Refer & Earn</h4>
          <p className="text-emerald-100 text-xs max-w-md">
            Share your unique link. Earn <b>+50 credits</b> per direct sign-up and{" "}
            <b>+10 credits</b> when your referrals bring in theirs. Top referrers get exclusive
            meeting invites with party leadership.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20">
          <code className="text-xs font-mono text-white px-2 truncate max-w-[200px]">
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

      {/* Credits widget: balance card with a button to open the activity popup */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-wider text-amber-800 uppercase">
            Current Balance
          </p>
          <p className="text-3xl font-extrabold text-amber-900 mt-1">
            ⚡ {profile?.credits_balance ?? 0}
          </p>
          <p className="text-[11px] text-amber-700 mt-2">
            +50 active · +10 passive · +25 signup
          </p>
        </div>
        <button
          onClick={() => {
            fetchCreditLedger();
            setShowLedgerModal(true);
          }}
          className="self-stretch sm:self-center inline-flex items-center justify-center gap-2 bg-white text-amber-800 border border-amber-300 hover:bg-amber-50 transition px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm"
        >
          📜 View Recent Activity
          {creditLedger.length > 0 && (
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
              {creditLedger.length}
            </span>
          )}
        </button>
      </div>

      {/* Rewards catalogue + my redemptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              Rewards Catalogue
            </p>
            <button
              onClick={fetchRewardPerks}
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
            >
              Refresh
            </button>
          </div>
          {perks.length === 0 ? (
            <p className="text-xs text-gray-500">
              No perks available right now. Check back soon.
            </p>
          ) : (
            <ul className="space-y-3">
              {perks.map((p) => {
                const balance = profile?.credits_balance ?? 0;
                const canAfford = balance >= p.cost_credits;
                const busy = redeemingPerkId === p.id;
                return (
                  <li
                    key={p.id}
                    className="border border-gray-100 rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                          {p.description}
                        </p>
                      )}
                      <p className="text-[11px] text-amber-700 font-bold mt-1">
                        ⚡ {p.cost_credits} credits
                      </p>
                    </div>
                    <button
                      onClick={() => handleRedeemPerk(p)}
                      disabled={!canAfford || busy}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap ${
                        canAfford
                          ? "bg-primary-600 text-white hover:bg-primary-700"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {busy ? "..." : canAfford ? "Redeem" : "Not enough"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
              My Redemptions
            </p>
            <button
              onClick={fetchMyRedemptions}
              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
            >
              Refresh
            </button>
          </div>
          {myRedemptions.length === 0 ? (
            <p className="text-xs text-gray-500">
              You haven't redeemed anything yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {myRedemptions.map((r) => {
                const badge =
                  r.status === "approved"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : r.status === "rejected"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200";
                return (
                  <li key={r.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {r.perk_name}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          ⚡ {r.cost_credits} ·{" "}
                          {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${badge}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    {r.admin_note && (
                      <p className="text-[11px] text-gray-600 mt-1 bg-gray-50 border border-gray-100 rounded p-2">
                        {r.admin_note}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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
              Passive Tree
            </h4>
            <span className="text-[10px] bg-blue-100 text-primary-700 px-2 py-0.5 rounded-full font-bold">
              {passiveReferrals.length} Members
            </span>
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
      </div>

      {/* RECENT CREDIT ACTIVITY — popup, fixed height, internal scroll */}
      {showLedgerModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
            onClick={() => setShowLedgerModal(false)}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "min(640px, 85vh)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
                    Your activity
                  </p>
                  <p className="text-base font-bold">Recent Credit Activity</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchCreditLedger}
                    className="text-[11px] font-semibold bg-white/15 hover:bg-white/25 px-2.5 py-1 rounded-lg transition"
                  >
                    ↻ Refresh
                  </button>
                  <button
                    onClick={() => setShowLedgerModal(false)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* BALANCE STRIP */}
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Current balance
                </span>
                <span className="text-xl font-extrabold text-amber-900">
                  ⚡ {profile?.credits_balance ?? 0}
                </span>
              </div>

              {/* SCROLLABLE LEDGER */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {creditLedger.length === 0 ? (
                  <p className="text-xs text-gray-500 py-6 text-center">
                    No activity yet — share your link to start earning.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {creditLedger.map((e) => {
                      const label =
                        e.reason === "active"
                          ? "Active referral"
                          : e.reason === "passive"
                          ? "Passive referral"
                          : e.reason === "signup"
                          ? "Signup bonus"
                          : e.reason === "admin_adjustment"
                          ? "Admin adjustment"
                          : e.reason === "admin_reset"
                          ? "Balance reset"
                          : e.reason === "redemption"
                          ? "Redemption"
                          : e.reason;
                      const isPositive = e.delta > 0;
                      return (
                        <li
                          key={e.id}
                          className="py-2.5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-800 truncate">
                              {label}
                            </p>
                            {e.note && (
                              <p className="text-[11px] text-gray-500 break-words">
                                {e.note}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(e.created_at).toLocaleDateString()}{" "}
                              {new Date(e.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <span
                            className={`font-bold text-sm whitespace-nowrap ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {e.delta}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* FOOTER */}
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowLedgerModal(false)}
                  className="px-4 py-1.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );

const renderConnectContent = () => {
  // 🔹 Define the desired order of roles
  const roleOrder = [
    "Regional Coordinator",
    "District President",
    "Assembly Coordinator",
  ];
  // Global Coordinator(s) are always rendered first, regardless of address.
  const FULL_ROLE_ORDER = ["Global Coordinator", ...roleOrder];

  // 🔹 Create ordered array of leaders based on roleOrder
  const orderedLeaders: Array<{
    id: string;
    name: string;
    whatsapp_number: string | null;
    whatsapp_number_2?: string | null;
    role: string;
    phone?: string | null;
    email?: string | null;
  }> = [];

  FULL_ROLE_ORDER.forEach((role) => {
    // Add any leaders for this role if they exist
    if (leadersByRole[role] && leadersByRole[role].length > 0) {
      leadersByRole[role].forEach((leader) => {
        orderedLeaders.push({
          ...leader,
          role,
        });
      });
    }

    // Always insert the NRI Coordinator immediately after the Regional Coordinator
    // if present, even when there are no Regional Coordinators assigned.
    if (role === "Regional Coordinator" && nriCoordinator) {
      // avoid duplicate if somehow already present
      const already = orderedLeaders.find((l) => l.id === nriCoordinator.id && l.role === "NRI Coordinator");
      if (!already) {
        orderedLeaders.push({
          id: nriCoordinator.id,
          name: nriCoordinator.name,
          whatsapp_number: nriCoordinator.phone,
          role: "NRI Coordinator",
          phone: nriCoordinator.phone,
          email: nriCoordinator.email,
        });
      }
    }
  });

  const colorClasses = [
    { text: "text-emerald-600", border: "border-emerald-200" },
    { text: "text-teal-600", border: "border-teal-200" },
    { text: "text-primary-600", border: "border-blue-200" },
    { text: "text-purple-600", border: "border-purple-200" },
  ];

  return (
    <div className="pt-4">
      {orderedLeaders.length === 0 ? (
        <div className="text-xs text-gray-500">
          No leadership contacts configured yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {orderedLeaders.map((leader, idx) => {
            const colors = colorClasses[idx % colorClasses.length];

            return (
              <div
                key={`${leader.id}-${leader.role}`}
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

                {/* WHATSAPP BUTTONS — primary always, secondary only when set */}
                <div className="w-full space-y-1.5">
                  <button
                    onClick={() => {
                      if (!leader.whatsapp_number) {
                        showToast("WhatsApp contact not available", "info");
                        return;
                      }
                      const phone = leader.whatsapp_number.replace(/\D/g, "");
                      window.open(`https://wa.me/${phone}`, "_blank");
                      showToast(`Opening WhatsApp with ${leader.name}`, "info");
                    }}
                    className="w-full py-2 rounded-lg bg-whatsapp-500
                               hover:bg-whatsapp-600 text-white font-bold
                               text-xs flex items-center justify-center
                               gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageSquare size={14} fill="white" /> WhatsApp
                  </button>

                  {leader.whatsapp_number_2 && (
                    <button
                      onClick={() => {
                        const phone = leader.whatsapp_number_2!.replace(/\D/g, "");
                        window.open(`https://wa.me/${phone}`, "_blank");
                        showToast(`Opening WhatsApp with ${leader.name}`, "info");
                      }}
                      className="w-full py-2 rounded-lg bg-white border
                                 border-whatsapp-500 text-whatsapp-600
                                 hover:bg-whatsapp-50 font-bold text-xs
                                 flex items-center justify-center gap-1.5
                                 transition-colors"
                    >
                      <MessageSquare size={14} /> Alt. WhatsApp
                    </button>
                  )}
                </div>
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
    icon: <GraduationCap size={22} className="text-primary-600" />,
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
                setSelectedService(key as keyof typeof SERVICE_CONFIG);
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
          className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-lg text-sm font-semibold text-primary-700 bg-primary-50 border border-primary-100 hover:bg-primary-100 transition"
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
            value={countryOfResidence || "India"}
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
        {Object.keys(SERVICE_CONFIG[selectedService].subs as Record<string, string[]>)
          .filter((sub) => sub !== selectedSub) // ⭐ same trick
          .map((sub) => (
            <Listbox.Option
              key={sub}
              value={sub}
              className={({ active }) =>
                `cursor-pointer px-3 py-2 ${
                  active
                    ? "bg-primary-100 text-primary-900"
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
                  ((SERVICE_CONFIG[selectedService].subs as Record<string, string[]>)[selectedSub] || [])
                    .filter((opt: string) => opt !== selectedInner) // ⭐ KEY LINE
                    .map((opt: string) => (
                      <Listbox.Option
                        key={opt}
                        value={opt}
                        className={({ active }) =>
                          `cursor-pointer px-3 py-2 ${
                            active
                              ? "bg-primary-100 text-primary-900"
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
          className="w-full bg-primary-600 text-white py-2 rounded-lg
                     text-xs font-bold disabled:opacity-60"
        >
          {submittingService ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    )}

    {/* ================= MY SERVICE REQUESTS ================= */}
    <div className="mt-10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-gray-900">My Service Requests</h3>
        <button
          onClick={fetchMyServiceRequests}
          className="text-xs font-semibold text-primary-600 hover:text-primary-800"
        >
          Refresh
        </button>
      </div>

      {loadingMyRequests ? (
        <p className="text-xs text-gray-500">Loading...</p>
      ) : myRequests.length === 0 ? (
        <p className="text-xs text-gray-500">
          You haven't submitted any requests yet.
        </p>
      ) : (
        <div className="space-y-3">
          {myRequests.map((r) => {
            const statusStyle =
              r.status === "resolved"
                ? "bg-green-50 text-green-700 border-green-200"
                : r.status === "rejected"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200";

            return (
              <div
                key={r.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 capitalize">
                      {r.service_type}
                      {r.service_category ? ` · ${r.service_category}` : ""}
                      {r.service_option ? ` · ${r.service_option}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Submitted on {new Date(r.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border capitalize ${statusStyle}`}
                  >
                    {r.status}
                  </span>
                </div>

                {r.description && (
                  <p className="text-xs text-gray-700 mt-3 whitespace-pre-wrap">
                    {r.description}
                  </p>
                )}

                {/* Admin-assigned info */}
                {(r.assigned_to || r.action_taken || r.admin_comments) && (
                  <div className="mt-3 bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-[12px] text-gray-800 space-y-1">
                    {r.assigned_to && (
                      <p>
                        <span className="font-bold">Assigned to:</span>{" "}
                        {r.assigned_to}
                      </p>
                    )}
                    {r.action_taken && (
                      <p>
                        <span className="font-bold">Action taken:</span>{" "}
                        {r.action_taken}
                      </p>
                    )}
                    {r.admin_comments && (
                      <p>
                        <span className="font-bold">Admin notes:</span>{" "}
                        {r.admin_comments}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
  
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
      </div>
    );
  };

  return (
    <div className="pt-4 max-w-3xl">
      {events.length === 0 ? (
        <div className="text-xs text-gray-500">No events or notifications.</div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              Active Events
              <span className="ml-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                {activeEvents.length}
              </span>
            </h3>
          </div>
          {activeEvents.length === 0 ? (
            <p className="text-xs text-gray-500 mb-6">
              No active events at the moment.
            </p>
          ) : (
            <div className="mb-6">{activeEvents.map((e) => card(e))}</div>
          )}

          {previousEvents.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-3 pt-2 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 mt-3">
                  Previous Events
                  <span className="ml-2 text-[11px] font-bold text-gray-600 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                    {previousEvents.length}
                  </span>
                </h3>
              </div>
              <div>{previousEvents.map((e) => card(e, true))}</div>
            </>
          )}
        </>
      )}
    </div>
  );
};

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
          value={countryOfResidence || "India"}
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
                     text-sm outline-none focus:ring-2 focus:ring-primary-500
                     resize-none"
          placeholder="Write your suggestion here..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmitSuggestion}
          disabled={submittingSuggestion}
          className="px-6 py-2 bg-primary-600 text-white text-xs font-bold
                     rounded-lg hover:bg-primary-700 disabled:opacity-60"
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

  /* ============================================================
     OVERVIEW TAB — new landing view with stats & quick actions
  ============================================================ */
  const renderOverviewContent = () => {
    const firstName = profile?.first_name || "there";
    const activeCount = activeReferrals?.length || 0;
    const passiveCount = passiveReferrals?.length || 0;
    // Only count events that haven't already happened (or have no date) —
    // past events shouldn't be advertised as "active" on the dashboard tile.
    const _today = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })();
    const eventsCount =
      events?.filter((e) => !e.date || new Date(e.date).getTime() >= _today)
        .length || 0;
    const unseen = unseenEventsCount || 0;

    return (
      <div className="space-y-6">
        {/* WELCOME HERO */}
        <div className="relative bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 rounded-2xl p-6 md:p-8 text-white overflow-hidden shadow-lg">
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-widest uppercase opacity-90">Welcome back</span>
              {profile?.public_user_code && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(profile.public_user_code!);
                      showToast("User ID copied");
                    } catch {
                      showToast("Copy failed", "info");
                    }
                  }}
                  title="Click to copy your User ID"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[11px] font-mono font-semibold hover:bg-white/25 transition"
                >
                  <span className="opacity-80">ID:</span>
                  <span>{profile.public_user_code}</span>
                </button>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/30 border border-amber-200/40 text-[11px] font-bold">
                ⚡ {profile?.credits_balance ?? 0} credits
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-1">
              Hi {firstName}!
            </h1>
            <p className="text-sm md:text-base text-white/80 max-w-xl">
              Your NRI Wing portal — stay connected, contribute, and grow with the community.
            </p>

            <div className="flex flex-wrap gap-2 mt-5">
              <button
                onClick={() => setActiveTab("services")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
              >
                Submit a request <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => setActiveTab("referrals")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 backdrop-blur-sm rounded-lg font-semibold text-sm hover:bg-white/20 transition"
              >
                Invite friends <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 text-left hover:shadow-card-hover hover:-translate-y-1 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <User size={18} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
              {profileCompletion}%
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Profile complete</p>
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 text-left hover:shadow-card-hover hover:-translate-y-1 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Users size={18} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
              {activeCount}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Active referrals</p>
          </button>

          <button
            onClick={() => setActiveTab("referrals")}
            className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 text-left hover:shadow-card-hover hover:-translate-y-1 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <TrendingUp size={18} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
              {passiveCount}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Passive network</p>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 text-left hover:shadow-card-hover hover:-translate-y-1 transition group relative"
          >
            {unseen > 0 && (
              <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                +{unseen} new
              </span>
            )}
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
              <Bell size={18} />
            </div>
            <p className="text-2xl md:text-3xl font-black text-gray-900 leading-none">
              {eventsCount}
            </p>
            <p className="text-xs text-gray-500 mt-1.5">Events & updates</p>
          </button>
        </div>

        {/* QUICK NAV CARDS */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Quick links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={() => setActiveTab("profile")}
              className="group flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card hover:border-primary-300 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Complete your profile</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Add your personal, address & professional details
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-600 group-hover:translate-x-1 transition mt-1" />
            </button>

            <button
              onClick={() => setActiveTab("connect")}
              className="group flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card hover:border-primary-300 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Leadership Connect</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Reach out to your local leaders & coordinators
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-amber-600 group-hover:translate-x-1 transition mt-1" />
            </button>

            <button
              onClick={() => setActiveTab("services")}
              className="group flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card hover:border-primary-300 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Briefcase size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Services Hub</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Request student, legal, career or local support
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition mt-1" />
            </button>

            <button
              onClick={() => setActiveTab("suggestions")}
              className="group flex items-start gap-4 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-card hover:border-primary-300 transition text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                <Send size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">Share feedback</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Send suggestions to improve the portal
                </p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-purple-600 group-hover:translate-x-1 transition mt-1" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ============================================================
     SIDEBAR NAV CONFIG
  ============================================================ */
  const navItems = [
    { id: "overview" as const,    label: "Overview",    icon: Home,          color: "text-primary-600" },
    { id: "profile" as const,     label: "Profile",     icon: User,          color: "text-primary-600" },
    { id: "referrals" as const,   label: "My Network",  icon: Users,         color: "text-emerald-600" },
    { id: "services" as const,    label: "Services",    icon: Briefcase,     color: "text-amber-600" },
    { id: "events" as const,      label: "Events",      icon: Bell,          color: "text-pink-600", badge: unseenEventsCount || 0 },
    { id: "connect" as const,     label: "Leaders",     icon: MessageSquare, color: "text-primary-600" },
    { id: "suggestions" as const, label: "Feedback",    icon: Send,          color: "text-purple-600" },
  ];

  const activeNav = navItems.find((n) => n.id === activeTab)!;

  const renderActiveContent = () => {
    switch (activeTab) {
      case "overview":    return renderOverviewContent();
      case "profile":     return renderProfileContent();
      case "referrals":   return renderReferralsContent();
      case "services":    return renderServicesContent();
      case "events":      return renderEventsContent();
      case "connect":     return renderConnectContent();
      case "suggestions": return renderSuggestionsContent();
      default:            return renderOverviewContent();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col md:flex-row font-sans bg-gray-50">

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
  toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-primary-600 text-white'
}`}
        >
          {toast.type === 'success' ? <CheckCircle size={16} /> : <Info size={16} />}
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
          fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64
          bg-white border-r border-gray-200
          flex flex-col
          transform transition-transform duration-300
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Sidebar top — logo & close btn */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img src={nriLogo} alt="logo" className="h-9 w-9 rounded-full object-cover" />
            <div>
              <h1 className="font-black text-sm text-gray-900 leading-none">NRI Wing</h1>
              <p className="text-[10px] text-gray-500 tracking-wider uppercase mt-0.5">Member Portal</p>
            </div>
          </div>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100"
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
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    isActive
                      ? "bg-primary-50 text-primary-700 border border-primary-100"
                      : "text-gray-600 hover:bg-gray-50"
                  }
                `}
              >
                <Icon size={18} className={isActive ? "text-primary-600" : "text-gray-400"} />
                <span className="flex-1 text-left">{item.label}</span>
                {(item as any).badge > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                    {(item as any).badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar bottom — status + logout */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${loadingDashboard ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition"
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