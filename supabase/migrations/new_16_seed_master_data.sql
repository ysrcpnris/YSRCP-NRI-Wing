-- =====================================================================
-- SEED: Master Data (leaders_master + leader_assignments)
--
-- Pulls in the full party leadership map from masterdetails.md plus a
-- Global Coordinator (Aluru Sambasiva Reddy) who is shown to every user
-- regardless of their address.
--
-- Roles seeded:
--   • Global Coordinator     district = NULL  (visible to ALL users)
--   • Regional Coordinator   district set     (visible per-district)
--   • District President     district set     (visible per-district)
--   • Assembly Coordinator   district + constituency set
--
-- Schema additions performed by this file:
--   • leaders_master.whatsapp_number_2  (text, optional — secondary phone)
--
-- Idempotent:
--   • leaders_master row is created only if (name, whatsapp_number)
--     doesn't already exist; whatsapp_number_2 is updated on existing rows.
--   • leader_assignments row is created only if (leader_id, role,
--     district, constituency) doesn't already exist (NULL-safe).
-- Re-running this file is safe — it'll be a no-op after the first run.
-- =====================================================================

-- Add the optional second number column (no-op if already added).
ALTER TABLE public.leaders_master
  ADD COLUMN IF NOT EXISTS whatsapp_number_2 text;

-- ─────────────────────────────────────────────────────────────────────
-- Everything below runs inside a single DO $$ BEGIN ... END $$ block.
-- This guarantees the staging table created at the top is visible to
-- every INSERT / UPDATE / SELECT below — regardless of how Supabase's
-- SQL Editor / pgbouncer chooses to pool connections. A DO block is
-- one PL/pgSQL block executed in a single transaction on a single
-- backend, so the staging table is a proper TEMP table that lives for
-- the whole script.
-- ─────────────────────────────────────────────────────────────────────
DO $seed$
BEGIN

DROP TABLE IF EXISTS public._seed_leaders;
CREATE TABLE public._seed_leaders (
  name         text NOT NULL,
  mobile       text NOT NULL,
  mobile_2     text,             -- optional secondary number
  role         text NOT NULL,    -- 'Global Coordinator' | 'Regional Coordinator' | 'District President' | 'Assembly Coordinator'
  district     text,             -- NULL for Global Coordinator (applies everywhere)
  constituency text              -- only set for Assembly Coordinator
);

-- ---------------------------------------------------------------------
-- GLOBAL COORDINATOR (visible to every user, regardless of address).
-- Stored with district = NULL so the user-side query can return it for
-- everyone without filtering by district/constituency.
-- ---------------------------------------------------------------------
INSERT INTO public._seed_leaders (name, mobile, role, district, constituency) VALUES
('Aluru Sambasiva Reddy', '9515511111', 'Global Coordinator', NULL, NULL);

-- ---------------------------------------------------------------------
-- DISTRICT PRESIDENTS (25)
-- ---------------------------------------------------------------------
INSERT INTO public._seed_leaders (name, mobile, role, district, constituency) VALUES
('Sri Matsyarasa Visweswara Raju, MLA',                   '9390403727', 'District President', 'Alluri Sitharama Raju',         NULL),
('Sri Boddeti Prasad',                                    '9989622122', 'District President', 'Anakapalle',                    NULL),
('Sri Anantha Venkata Ramireddy',                         '9440055999', 'District President', 'Ananthapuramu',                 NULL),
('Dr. Merugu Nagarjuna',                                  '9000456706', 'District President', 'Bapatla',                       NULL),
('Sri Chelluboyina Venu Gopala Krishna',                  '9849549456', 'District President', 'East Godavari',                 NULL),
('Sri Dulam Nageswararao',                                '9866822231', 'District President', 'Eluru',                         NULL),
('Sri Ambati Rambabu',                                    '8978307999', 'District President', 'Guntur',                        NULL),
('Sri Dadisetti Raja',                                    '7661977777', 'District President', 'Kakinada',                      NULL),
('Sri Perni Venkataramaiah (Nani)',                       '7989848537', 'District President', 'Krishna',                       NULL),
('Sri S.V. Mohan Reddy',                                  '9553444555', 'District President', 'Kurnool',                       NULL),
('Sri Devineni Avinash',                                  '9705372345', 'District President', 'NTR',                           NULL),
('Sri Ramakrishnareddy Pinnelli',                         '9866394562', 'District President', 'Palnadu',                       NULL),
('Sri Satrucharla Parikshit Raju',                        '9908286996', 'District President', 'Parvathipuram Manyam',          NULL),
('Dr. Buchepalli Siva Prasad Reddy, MLA',                 '9440222666', 'District President', 'Prakasam',                      NULL),
('Smt. K.V. Usha Sricharan',                              '9686333999', 'District President', 'Sri Sathya Sai',                NULL),
('Sri Dharmana Krishna Das',                              '9440195666', 'District President', 'Srikakulam',                    NULL),
('Sri K.K. Raju',                                         '9849581292', 'District President', 'Visakhapatnam',                 NULL),
('Sri Majji Srinuvasarao (Chinna Srinu), ZP Chairman',    '9848145007', 'District President', 'Vizianagaram',                  NULL),
('Sri N.V. Prasada Raju Mudunuri',                        '9848899199', 'District President', 'West Godavari',                 NULL),
('Sri Pochimareddy Ravindranath Reddy',                   '9000023069', 'District President', 'YSR',                           NULL),
('Sri Akepati Amarnath Reddy, MLA',                       '9440269858', 'District President', 'Annamaya',                      NULL),
('Sri Katasani Ramabhupal Reddy',                         '8074190387', 'District President', 'Nandyala',                      NULL),
('Sri Chirla Jaggireddy',                                 '9490499999', 'District President', 'Dr. B.R. Ambedkar Konaseema',   NULL),
('Sri Kakani Govardhan Reddy',                            '9849020556', 'District President', 'SPS Nellore',                   NULL),
('Sri Bhumana Karunakara Reddy',                          '9393603818', 'District President', 'Chittoor',                      NULL);

-- ---------------------------------------------------------------------
-- REGIONAL COORDINATORS (one row per district they oversee)
-- ---------------------------------------------------------------------
INSERT INTO public._seed_leaders (name, mobile, role, district, constituency) VALUES
('Sri Budi Mutyala Naidu',                  '9804333666', 'Regional Coordinator', 'Parvathipuram Manyam',         NULL),
('Sri Budi Mutyala Naidu',                  '9804333666', 'Regional Coordinator', 'Srikakulam',                   NULL),
('Sri Kurasala Kannababu',                  '9848172411', 'Regional Coordinator', 'Alluri Sitharama Raju',        NULL),
('Sri Kurasala Kannababu',                  '9848172411', 'Regional Coordinator', 'Anakapalle',                   NULL),
('Sri Kurasala Kannababu',                  '9848172411', 'Regional Coordinator', 'Visakhapatnam',                NULL),
('Sri Kurasala Kannababu',                  '9848172411', 'Regional Coordinator', 'Vizianagaram',                 NULL),
('Sri Botcha Satyanarayana, MLC',           '7997511999', 'Regional Coordinator', 'Dr. B.R. Ambedkar Konaseema',  NULL),
('Sri Botcha Satyanarayana, MLC',           '7997511999', 'Regional Coordinator', 'East Godavari',                NULL),
('Sri Botcha Satyanarayana, MLC',           '7997511999', 'Regional Coordinator', 'Kakinada',                     NULL),
('Sri Gudivada Amarnath',                   '9948333999', 'Regional Coordinator', 'Eluru',                        NULL),
('Sri Gudivada Amarnath',                   '9948333999', 'Regional Coordinator', 'West Godavari',                NULL),
('Dr. Y.V. Subba Reddy, MP',                '9849000916', 'Regional Coordinator', 'Bapatla',                      NULL),
('Dr. Y.V. Subba Reddy, MP',                '9849000916', 'Regional Coordinator', 'Guntur',                       NULL),
('Dr. Y.V. Subba Reddy, MP',                '9849000916', 'Regional Coordinator', 'Krishna',                      NULL),
('Dr. Y.V. Subba Reddy, MP',                '9849000916', 'Regional Coordinator', 'NTR',                          NULL),
('Dr. Y.V. Subba Reddy, MP',                '9849000916', 'Regional Coordinator', 'Palnadu',                      NULL),
('Sri Karumuri Venkata Nageswararao',       '9591662222', 'Regional Coordinator', 'Prakasam',                     NULL),
('Sri P.V. Midhun Reddy, MP',               '9491045445', 'Regional Coordinator', 'Ananthapuramu',                NULL),
('Sri P.V. Midhun Reddy, MP',               '9491045445', 'Regional Coordinator', 'SPS Nellore',                  NULL),
('Sri P.V. Midhun Reddy, MP',               '9491045445', 'Regional Coordinator', 'Sri Sathya Sai',               NULL),
('Dr. Peddireddy Ramachandra Reddy, MLA',   '9010158888', 'Regional Coordinator', 'Annamaya',                     NULL),
('Dr. Peddireddy Ramachandra Reddy, MLA',   '9010158888', 'Regional Coordinator', 'Chittoor',                     NULL),
('Dr. Peddireddy Ramachandra Reddy, MLA',   '9010158888', 'Regional Coordinator', 'Kurnool',                      NULL),
('Dr. Peddireddy Ramachandra Reddy, MLA',   '9010158888', 'Regional Coordinator', 'Nandyala',                     NULL),
('Dr. Peddireddy Ramachandra Reddy, MLA',   '9010158888', 'Regional Coordinator', 'YSR',                          NULL);

-- ---------------------------------------------------------------------
-- ASSEMBLY INCHARGES (one row per assembly; district resolved from
-- District → AC mapping in masterdetails.md)
-- ---------------------------------------------------------------------
INSERT INTO public._seed_leaders (name, mobile, role, district, constituency) VALUES
('Ambati Murali',                                              '9603347011', 'Assembly Coordinator', 'Guntur',                       'Ponnur'),
('Duddukunta Sreedhar Reddy',                                  '9866070634', 'Assembly Coordinator', 'Sri Sathya Sai',               'Puttaparthi'),
('Perada Tilak',                                               '9440677469', 'Assembly Coordinator', 'Srikakulam',                   'Tekkali'),
('Petla Uma Sankar Ganesh',                                    '9849233695', 'Assembly Coordinator', 'Anakapalle',                   'Narsipatnam'),
('Sankararao Namburi',                                         '9959978555', 'Assembly Coordinator', 'Palnadu',                      'Pedakurapadu'),
('Karanam Venkatesh',                                          '9866612345', 'Assembly Coordinator', 'Bapatla',                      'Chirala'),
('Kangati Sreedevi',                                           '9603323232', 'Assembly Coordinator', 'Kurnool',                      'Pattikonda'),
('Buggana Rajendranath',                                       '9440294104', 'Assembly Coordinator', 'Nandyala',                     'Dhone'),
('Chevireddy Mohith Reddy',                                    '9700703020', 'Assembly Coordinator', 'Chittoor',                     'Chandragiri'),
('Krishna Raghava Jayendra Bharath (KRJ Bharath)',             '9550612344', 'Assembly Coordinator', 'Chittoor',                     'Kuppam'),
('Akepati Amarnath Reddy',                                     '9440269858', 'Assembly Coordinator', 'Annamaya',                     'Rajampeta'),
('Kethireddy Pedda Reddy',                                     '9848861188', 'Assembly Coordinator', 'Ananthapuramu',                'Tadipatri'),
('Vallabhaneni Vamsi Mohan',                                   '9491122644', 'Assembly Coordinator', 'Krishna',                      'Gannavaram'),
('Bolla Brahma Naidu',                                         '9848157536', 'Assembly Coordinator', 'Palnadu',                      'Vinukonda'),
('Davuluri Dorababu',                                          '8464847777', 'Assembly Coordinator', 'Kakinada',                     'Peddapuram'),
('Y.S. Jagan Mohan Reddy',                                     '0000000000', 'Assembly Coordinator', 'YSR',                          'Pulivendula'),
('Kakani Govardhan Reddy',                                     '9849020556', 'Assembly Coordinator', 'SPS Nellore',                  'Sarvepalli'),
('Singareddy Ravi Chandra Kishore Reddy (Silpa Ravi)',         '7337557005', 'Assembly Coordinator', 'Nandyala',                     'Nandyala'),
('Nallapareddy Prasanna Kumar Reddy',                          '9989649999', 'Assembly Coordinator', 'SPS Nellore',                  'Kovur'),
('Buchepalli Siva Prasad Reddy',                               '9440222666', 'Assembly Coordinator', 'Prakasam',                     'Darsi'),
('Gajjala Sudheer Bhargava Reddy',                             '8886002212', 'Assembly Coordinator', 'Palnadu',                      'Sattenapalli'),
('BS Maqbool Ahmad',                                           '9845043339', 'Assembly Coordinator', 'Sri Sathya Sai',               'Kadiri'),
('Tippe Gowda Narayana Deepika',                               '8971327928', 'Assembly Coordinator', 'Sri Sathya Sai',               'Hindupur'),
('Burra Madhusudhan Yadav',                                    '9849008835', 'Assembly Coordinator', 'SPS Nellore',                  'Kandukur'),
('Katasani Ramabhupal Reddy',                                  '8074190387', 'Assembly Coordinator', 'Nandyala',                     'Panyam'),
('Dulam Nageswararao',                                         '9866822231', 'Assembly Coordinator', 'Eluru',                        'Kaikalur'),
('Cherukuwada Sri Ranga Nadha Raju',                           '9848135555', 'Assembly Coordinator', 'West Godavari',                'Achanta'),
('Mettapalli Chinnappa Reddy Vijayananda Reddy',               '9989995432', 'Assembly Coordinator', 'Chittoor',                     'Chittoor'),
('Chelluboyina Venu Gopala Krishna',                           '9849549456', 'Assembly Coordinator', 'East Godavari',                'Rajahmundry Rural'),
('Jakkampudi Raja',                                            '9849911111', 'Assembly Coordinator', 'East Godavari',                'Rajanagaram'),
('Ashok Kumar Chintalapudi',                                   '9493922202', 'Assembly Coordinator', 'Bapatla',                      'Addanki'),
('Yellareddygari Visweswara Reddy',                            '9490625299', 'Assembly Coordinator', 'Ananthapuramu',                'Uravakonda'),
('Katasani Rami Reddy',                                        '9440829999', 'Assembly Coordinator', 'Nandyala',                     'Banaganapalle'),
('Kethireddy Venkatarami Reddy',                               '9866566565', 'Assembly Coordinator', 'Sri Sathya Sai',               'Dharmavaram'),
('Mekapati Rajagopal Reddy',                                   '9980400009', 'Assembly Coordinator', 'SPS Nellore',                  'Udayagiri'),
('Gangula Brijendra Reddy (Nani)',                             '9949176767', 'Assembly Coordinator', 'Nandyala',                     'Allagadda'),
('K.V. Ushasri Charan',                                        '9686333999', 'Assembly Coordinator', 'Sri Sathya Sai',               'Penukonda'),
('Chinimilli Venkata Rayudu',                                  '9440181086', 'Assembly Coordinator', 'West Godavari',                'Bhimavaram'),
('Balasani Kiran Kumar',                                       '9866447199', 'Assembly Coordinator', 'Guntur',                       'Prathipadu (SC)'),
('Ponnada Venkata Satish Kumar',                               '9849411799', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Mummidivaram'),
('Chinthada Ravi Kumar',                                       '9441914120', 'Assembly Coordinator', 'Srikakulam',                   'Amadalavalasa'),
('Seediri Appala Raju',                                        '9949175851', 'Assembly Coordinator', 'Srikakulam',                   'Palasa'),
('Mudragada Giri Babu',                                        '9959738888', 'Assembly Coordinator', 'Kakinada',                     'Prathipadu'),
('Peeta Naga Mohan Krishna',                                   '9907456456', 'Assembly Coordinator', 'Bapatla',                      'Repalle'),
('Pilli Surya Prakash',                                        '9959501111', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Ramachandrapuram'),
('Nallappagari Venkate Gowda',                                 '9980851166', 'Assembly Coordinator', 'Chittoor',                     'Palamaneru'),
('Kasu Mahesh Reddy',                                          '9848322222', 'Assembly Coordinator', 'Palnadu',                      'Gurajala'),
('Ramireddy Pratap Kumar Reddy',                               '9845048311', 'Assembly Coordinator', 'SPS Nellore',                  'Kavali'),
('Sambangi Venkata China Appala Naidu',                        '9440193362', 'Assembly Coordinator', 'Vizianagaram',                 'Bobbili'),
('Daddala Narayana Yadav',                                     '9912014568', 'Assembly Coordinator', 'Prakasam',                     'Kanigiri'),
('Peddireddy Ramachandra Reddy',                               '9010158888', 'Assembly Coordinator', 'Chittoor',                     'Punganur'),
('Kurasala Kanna Babu',                                        '9848172411', 'Assembly Coordinator', 'Kakinada',                     'Kakinada Rural'),
('Peddireddy Dwarakanath Reddy',                               '9491030131', 'Assembly Coordinator', 'Annamaya',                     'Thamballapalle'),
('Thota Trimurthulu',                                          '9963278999', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Mandapeta'),
('Tanneru Nageswara Rao',                                      '9848185217', 'Assembly Coordinator', 'NTR',                          'Jaggayyapeta'),
('Ramakrishnareddy Pinnelli',                                  '9866394562', 'Assembly Coordinator', 'Palnadu',                      'Macherla'),
('Mettu Govinda Reddy',                                        '9845099996', 'Assembly Coordinator', 'Ananthapuramu',                'Rayadurg'),
('Simhadri Ramesh Babu',                                       '9603086789', 'Assembly Coordinator', 'Krishna',                      'Avanigadda'),
('P.V.L. Narasimha Raju',                                      '9866233733', 'Assembly Coordinator', 'West Godavari',                'Undi'),
('Baddukonda Appalanaidu',                                     '9440543938', 'Assembly Coordinator', 'Vizianagaram',                 'Nellimarla'),
('Sathi Surya Narayana Reddy',                                 '9866697335', 'Assembly Coordinator', 'East Godavari',                'Anaparthi'),
('Ponnapureddy Ramasubbareddy',                                '9440605678', 'Assembly Coordinator', 'YSR',                          'Jammalamadugu'),
('Thota Narasimham',                                           '9849167829', 'Assembly Coordinator', 'Kakinada',                     'Jaggampeta'),
('Biyyapu Madhusudhan Reddy',                                  '9845009152', 'Assembly Coordinator', 'Chittoor',                     'Srikalahasti'),
('Singareddy Chakrapani Reddy (Silpa Chakrapani Reddy)',       '7661066661', 'Assembly Coordinator', 'Nandyala',                     'Srisailam'),
('Chirla Jaggireddy',                                          '9490499999', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Kothapeta'),
('Kadubandi Srinivasa Rao',                                    '9912585858', 'Assembly Coordinator', 'Vizianagaram',                 'Srungavarapukota'),
('Vanga Geethaviswanath',                                      '9848018525', 'Assembly Coordinator', 'Kakinada',                     'Pithapuram'),
('Reddy Shanthi',                                              '9899279259', 'Assembly Coordinator', 'Srikakulam',                   'Pathapatnam'),
('Dadisetti Raja',                                             '7661977777', 'Assembly Coordinator', 'Kakinada',                     'Tuni'),
('Kolagatla Veerabhadra Swamy',                                '9848145222', 'Assembly Coordinator', 'Vizianagaram',                 'Vizianagaram'),
('Kona Raghupathi',                                            '9888699977', 'Assembly Coordinator', 'Bapatla',                      'Bapatla'),
('Talari Rangaiah',                                            '9849254712', 'Assembly Coordinator', 'Ananthapuramu',                'Kalyandurg'),
('Nedurumalli Ram Kumar Reddy',                                '9440355550', 'Assembly Coordinator', 'SPS Nellore',                  'Venkatagiri'),
('Pochimareddy Naren Ramanjula Reddy',                         '8978912345', 'Assembly Coordinator', 'YSR',                          'Kamalapuram'),
('Chinthala Ramachandra Reddy',                                '8008272999', 'Assembly Coordinator', 'Annamaya',                     'Pileru'),
('Budi Mutyala Naidu',                                         '9804333666', 'Assembly Coordinator', 'Anakapalle',                   'Madugula'),
('Appalanarasayya Botcha',                                     '9440194424', 'Assembly Coordinator', 'Vizianagaram',                 'Gajapathinagaram'),
('Annabattuni Siva Kumar',                                     '9848157070', 'Assembly Coordinator', 'Guntur',                       'Tenali'),
('Donthireddy Sankar Reddy (Vema Reddy)',                      '9666266180', 'Assembly Coordinator', 'Guntur',                       'Mangalagiri'),
('Mekapati Vikram Reddy',                                      '9008219999', 'Assembly Coordinator', 'SPS Nellore',                  'Atmakur'),
('Gudivada Amarnath',                                          '9948333999', 'Assembly Coordinator', 'Anakapalle',                   'Chodavaram'),
('Dharmana Krishna Das',                                       '9440195666', 'Assembly Coordinator', 'Srikakulam',                   'Narasannapeta'),
('Kunduru Nagarjun Reddy',                                     '9000001137', 'Assembly Coordinator', 'Prakasam',                     'Giddalur'),
('Kadimetla Rajeev Reddy',                                     '9983982999', 'Assembly Coordinator', 'Kurnool',                      'Yemmiganur'),
('Yallareddygari Venkata Rami Reddy',                          '9885123656', 'Assembly Coordinator', 'Ananthapuramu',                'Gunthakal'),
('Nagaraja Vara Prasada Raju Mudunuri',                        '9848899199', 'Assembly Coordinator', 'West Godavari',                'Narasapuram'),
('Kodali Sri Venkateswararao (Nani)',                          '7724949999', 'Assembly Coordinator', 'Krishna',                      'Gudivada'),
('Botcha Satyanarayana',                                       '7997511999', 'Assembly Coordinator', 'Vizianagaram',                 'Cheepurupalli'),
('Chunduru Ravibabu',                                          '9849115618', 'Assembly Coordinator', 'Prakasam',                     'Ongole'),
('Puppala Srinivasa Rao (Vasubabu)',                           '9313899999', 'Assembly Coordinator', 'Eluru',                        'Unguturu'),
('Dharmana Prasada Rao',                                       '9959865756', 'Assembly Coordinator', 'Srikakulam',                   'Srikakulam'),
('Malasala Bharath Kumar',                                     '9346207962', 'Assembly Coordinator', 'Anakapalle',                   'Anakapalle'),
('Gorle Kiran Kumar',                                          '9440195011', 'Assembly Coordinator', 'Srikakulam',                   'Etcherla'),
('Yellareddygari Saiprasad Reddy',                             '9885418700', 'Assembly Coordinator', 'Kurnool',                      'Adoni'),
('Kothari Abbaya Chowdary',                                    '9581559999', 'Assembly Coordinator', 'Eluru',                        'Denduluru'),
('Annam Reddy Adeep Raj',                                      '8142447777', 'Assembly Coordinator', 'Anakapalle',                   'Pendurthi'),
('Rajini Vidadala',                                            '9988649999', 'Assembly Coordinator', 'Palnadu',                      'Chilakaluripeta'),
('Yellareddygari Bala Nagi Reddy',                             '9885247399', 'Assembly Coordinator', 'Kurnool',                      'Mantralayam'),
('Settipalli Raghurami Reddy',                                 '9948195959', 'Assembly Coordinator', 'YSR',                          'Mydukur'),
('R.K. Roja',                                                  '9121007979', 'Assembly Coordinator', 'Chittoor',                     'Nagari'),
('Anna Venkata Rambabu',                                       '9153049999', 'Assembly Coordinator', 'Prakasam',                     'Markapuram'),
('Karumuri Venkata Nageswararao',                              '9591662222', 'Assembly Coordinator', 'West Godavari',                'Tanuku'),
('Devabhaktuni Chakravathi',                                   '9866441212', 'Assembly Coordinator', 'Krishna',                      'Penamaluru'),
('Uppala Ramesh (Ramu)',                                       '9291387777', 'Assembly Coordinator', 'Krishna',                      'Pedana'),
('Nissar Ahmad',                                               '9885752124', 'Assembly Coordinator', 'Annamaya',                     'Madanapalle'),
('Rachamallu Siva Prasad Reddy',                               '9849918390', 'Assembly Coordinator', 'YSR',                          'Proddatur'),
('Perni Vaka Sai Krishna Murthy (Kittu)',                      '9647797979', 'Assembly Coordinator', 'Krishna',                      'Machilipatnam'),
('Jogi Ramesh',                                                '9848047522', 'Assembly Coordinator', 'NTR',                          'Mylavaram'),
('Anam Vijay Kumar Reddy',                                     '9966970000', 'Assembly Coordinator', 'SPS Nellore',                  'Nellore Rural'),
('Malladi Vishnu Vardhan',                                     '9848144399', 'Assembly Coordinator', 'NTR',                          'Vijayawada Central'),
('Shaik Noori Fathima',                                        '8333826381', 'Assembly Coordinator', 'Guntur',                       'Guntur East'),
('Ambati Rambabu',                                             '8978307999', 'Assembly Coordinator', 'Guntur',                       'Guntur West'),
('Molli Appa Rao',                                             '9989034999', 'Assembly Coordinator', 'Visakhapatnam',                'Visakhapatnam East'),
('Mamillapalli Jayaprakash (J.P.)',                            '7396722222', 'Assembly Coordinator', 'Eluru',                        'Eluru'),
('Margani Bharath Ram',                                        '9866466599', 'Assembly Coordinator', 'East Godavari',                'Rajahmundry City'),
('Devineni Avinash',                                           '9705372345', 'Assembly Coordinator', 'NTR',                          'Vijayawada East'),
('Tippala Devan Reddy',                                        '9912377988', 'Assembly Coordinator', 'Visakhapatnam',                'Gajuwaka'),
('Velampalli Srinivas Rao',                                    '9440611111', 'Assembly Coordinator', 'NTR',                          'Vijayawada West'),
('Anantha Venkata Ramireddy',                                  '9440055999', 'Assembly Coordinator', 'Ananthapuramu',                'Ananthapur Urban'),
('Kammila Kannapa Raju',                                       '9849581292', 'Assembly Coordinator', 'Visakhapatnam',                'Visakhapatnam North'),
('Amzath Basha Shaik Bepari',                                  '9948020786', 'Assembly Coordinator', 'YSR',                          'Kadapa'),
('Bhumana Abhinay Reddy',                                      '9346486253', 'Assembly Coordinator', 'Chittoor',                     'Tirupati'),
('Dwarampudi Chandrasekhar Reddy',                             '9849166666', 'Assembly Coordinator', 'Kakinada',                     'Kakinada City'),
('Malla Vijaya Prasad',                                        '8801008888', 'Assembly Coordinator', 'Visakhapatnam',                'Visakhapatnam West'),
('Vasupalli Ganesh',                                           '9849641666', 'Assembly Coordinator', 'Visakhapatnam',                'Visakhapatnam South'),
('Parvathareddy Chandrasekhar Reddy',                          '9248188888', 'Assembly Coordinator', 'SPS Nellore',                  'Nellore City'),
('S.V. Mohan Reddy',                                           '9553444555', 'Assembly Coordinator', 'Kurnool',                      'Kurnool'),
('Karanam Dharmasri',                                          '9866190116', 'Assembly Coordinator', 'Anakapalle',                   'Elamanchili'),
('Gopireddy Srinivasa Reddy',                                  '9440993399', 'Assembly Coordinator', 'Palnadu',                      'Narasaraopeta'),
('Pochimareddy Naren Ramanjula Reddy (Amalapuram)',            '8978912345', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Amalapuram'),
('Gade Madhusudhan Reddy',                                     '9949923222', 'Assembly Coordinator', 'Bapatla',                      'Parchuru'),
('Topudurthi Prakash Reddy',                                   '8978779897', 'Assembly Coordinator', 'Sri Sathya Sai',               'Raptadu'),
('Kalathur Krupa Lakshmi',                                     '7909103555', 'Assembly Coordinator', 'Chittoor',                     'Gangadhara Nellore'),
('Merugu Nagarjuna',                                           '9000456706', 'Assembly Coordinator', 'Prakasam',                     'Santhanuthalapadu'),
('Venkata Pratap Apparao Meka',                                '9848113559', 'Assembly Coordinator', 'Eluru',                        'Nuzivid'),
('Tatiparthi Chandra Sekhar',                                  '9000002522', 'Assembly Coordinator', 'Prakasam',                     'Yerragondapalem'),
('Nagulapalli Dhanalakshmi',                                   '7901662222', 'Assembly Coordinator', 'East Godavari',                'Rampachodavaram'),
('Gannavarapu Srinivasa Rao',                                  '9502144999', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'P. Gannavaram'),
('Nallapareddy Prasanna Kumar Reddy (Kovvur)',                 '9989649999', 'Assembly Coordinator', 'East Godavari',                'Kovvur'),
('Geddam Srinivas Naidu',                                      '6309115551', 'Assembly Coordinator', 'East Godavari',                'Nidadavole'),
('Sadi Syamprasad Reddy',                                      '8297362118', 'Assembly Coordinator', 'Srikakulam',                   'Ichapuram'),
('Alajangi Jogarao',                                           '6281256433', 'Assembly Coordinator', 'Parvathipuram Manyam',         'Parvathipuram'),
('Muthirevula Suneel Kumar',                                   '9010429593', 'Assembly Coordinator', 'Chittoor',                     'Puthalapattu'),
('Gadikota Srikanth Reddy',                                    '9866504367', 'Assembly Coordinator', 'Annamaya',                     'Rayachoty'),
('Busine Virupakshi',                                          '9441535837', 'Assembly Coordinator', 'Kurnool',                      'Alur'),
('Sake Sailajanath',                                           '9000155999', 'Assembly Coordinator', 'Ananthapuramu',                'Singanamala'),
('Sudheer Dara',                                               '9848076100', 'Assembly Coordinator', 'Nandyala',                     'Nandikotkur'),
('Taneti Vanita',                                              '9490032112', 'Assembly Coordinator', 'Eluru',                        'Gopalapuram'),
('S.L. Era Lakkappa',                                          '9490766857', 'Assembly Coordinator', 'Sri Sathya Sai',               'Madakasira'),
('Kiliveti Sanjeevaiah',                                       '8121469999', 'Assembly Coordinator', 'SPS Nellore',                  'Sullurpeta'),
('Jogulu Kambala',                                             '9949666659', 'Assembly Coordinator', 'Anakapalle',                   'Payakaraopeta'),
('Monditoka Jagan Mohanarao',                                  '9247744734', 'Assembly Coordinator', 'NTR',                          'Nandigama'),
('Vanama Bala Vajra Babu (Diamond Babu)',                      '9553434777', 'Assembly Coordinator', 'Guntur',                       'Tadikonda'),
('Nukathoti Rajesh',                                           '9866060459', 'Assembly Coordinator', 'Chittoor',                     'Satyavedu'),
('Tellam Bala Raju',                                           '9440517839', 'Assembly Coordinator', 'Eluru',                        'Polavaram'),
('Kambham Vijaya Raju',                                        '9948287225', 'Assembly Coordinator', 'Eluru',                        'Chinthalapudi'),
('Viswasarayi Kalavathi',                                      '9652072056', 'Assembly Coordinator', 'Parvathipuram Manyam',         'Palakonda'),
('Nallagatla Swamy Das',                                       '9849081158', 'Assembly Coordinator', 'NTR',                          'Tiruvuru'),
('Kaile Anil Kumar',                                           '9949418777', 'Assembly Coordinator', 'Krishna',                      'Pamarru'),
('Pamula Pushpa Sreevani',                                     '8985555533', 'Assembly Coordinator', 'Parvathipuram Manyam',         'Kurupam'),
('Dasari Sudha',                                               '9849417934', 'Assembly Coordinator', 'YSR',                          'Badvel'),
('Pamula Rajeswari Devi',                                      '9849959167', 'Assembly Coordinator', 'Dr. B.R. Ambedkar Konaseema',  'Razole'),
('Matsyarasa Visweswara Raju',                                 '9390403727', 'Assembly Coordinator', 'Alluri Sitharama Raju',        'Paderu'),
('Rajanna Dora Peedika',                                       '9491884567', 'Assembly Coordinator', 'Parvathipuram Manyam',         'Salur'),
('Majji Srinuvasarao (Chinna Srinu)',                          '9848145007', 'Assembly Coordinator', 'Visakhapatnam',                'Bheemili'),
('Varikuti Ashok Babu',                                        '8500814999', 'Assembly Coordinator', 'Bapatla',                      'Vemuru'),
('Audimulapu Satish',                                          '9849332122', 'Assembly Coordinator', 'Kurnool',                      'Kodumur'),
('Tale Rajesh',                                                '9000450666', 'Assembly Coordinator', 'Vizianagaram',                 'Rajam'),
('Meriga Muralidhar',                                          '8297501677', 'Assembly Coordinator', 'SPS Nellore',                  'Gudur'),
('Suresh Audimulapu',                                          '9440383942', 'Assembly Coordinator', 'Prakasam',                     'Kondapi'),
('Gudala Sri Hari Gopalarao (Gopi)',                           '9490111131', 'Assembly Coordinator', 'West Godavari',                'Palacole'),
('Regam Matsyalingam',                                         '9441969239', 'Assembly Coordinator', 'Alluri Sitharama Raju',        'Araku'),
('Vaddi Raghuram',                                             '9390666666', 'Assembly Coordinator', 'West Godavari',                'Tadepalligudem'),
('Koramutla Srinivasulu',                                      '7799993456', 'Assembly Coordinator', 'Annamaya',                     'Railway Kodur');


-- =====================================================================
-- Apply secondary numbers (mobile_2) for the leaders that masterdetails.md
-- listed as "<num1> / <num2>". Adding more is just another UPDATE here.
-- =====================================================================
UPDATE public._seed_leaders SET mobile_2 = '8500045524'
 WHERE name = 'Sri Matsyarasa Visweswara Raju, MLA' AND mobile = '9390403727';
UPDATE public._seed_leaders SET mobile_2 = '9676548809'
 WHERE name = 'Sri Budi Mutyala Naidu' AND mobile = '9804333666';


-- =====================================================================
-- 1. Upsert leaders_master
--    One row per (name, mobile). If a person has the same name+mobile in
--    multiple assignments, only one master row is created.
--    whatsapp_number_2 is taken from the first non-null seed row.
-- =====================================================================
INSERT INTO public.leaders_master (name, whatsapp_number, whatsapp_number_2, is_active)
SELECT DISTINCT ON (s.name, s.mobile)
  s.name, s.mobile, s.mobile_2, true
FROM public._seed_leaders s
WHERE NOT EXISTS (
  SELECT 1 FROM public.leaders_master lm
   WHERE lm.name = s.name AND lm.whatsapp_number = s.mobile
)
ORDER BY s.name, s.mobile, s.mobile_2 NULLS LAST;

-- For leaders that already existed but didn't have a mobile_2 yet, fill it.
UPDATE public.leaders_master lm
   SET whatsapp_number_2 = s.mobile_2
  FROM (
    SELECT DISTINCT ON (name, mobile) name, mobile, mobile_2
      FROM public._seed_leaders
     WHERE mobile_2 IS NOT NULL
     ORDER BY name, mobile, mobile_2 NULLS LAST
  ) s
 WHERE lm.name = s.name
   AND lm.whatsapp_number = s.mobile
   AND (lm.whatsapp_number_2 IS NULL OR lm.whatsapp_number_2 = '');


-- =====================================================================
-- 2. Insert leader_assignments
--    Link each (name, mobile, role, district, constituency) row to the
--    matching leaders_master row by (name, mobile).
--    Skip if an identical assignment already exists.
-- =====================================================================
INSERT INTO public.leader_assignments
  (leader_id, role, district, constituency, is_active, sort_order)
SELECT
  lm.id,
  s.role,
  s.district,
  s.constituency,
  true,
  CASE s.role
    WHEN 'Global Coordinator'   THEN 0
    WHEN 'Regional Coordinator' THEN 1
    WHEN 'District President'   THEN 2
    WHEN 'Assembly Coordinator' THEN 3
    ELSE 99
  END
FROM public._seed_leaders s
JOIN public.leaders_master lm
  ON lm.name = s.name AND lm.whatsapp_number = s.mobile
WHERE NOT EXISTS (
  SELECT 1 FROM public.leader_assignments la
   WHERE la.leader_id = lm.id
     AND la.role = s.role
     AND la.district = s.district
     AND COALESCE(la.constituency, '') = COALESCE(s.constituency, '')
);


-- =====================================================================
-- Cleanup + sanity-check NOTICE
-- =====================================================================
DROP TABLE public._seed_leaders;

DECLARE
  v_leaders     int;
  v_with_2nd    int;
  v_assignments int;
  v_global      int;
  v_rc          int;
  v_dp          int;
  v_ac          int;
BEGIN
  SELECT count(*) INTO v_leaders     FROM public.leaders_master;
  SELECT count(*) INTO v_with_2nd    FROM public.leaders_master WHERE whatsapp_number_2 IS NOT NULL AND whatsapp_number_2 <> '';
  SELECT count(*) INTO v_assignments FROM public.leader_assignments;
  SELECT count(*) INTO v_global      FROM public.leader_assignments WHERE role = 'Global Coordinator';
  SELECT count(*) INTO v_rc          FROM public.leader_assignments WHERE role = 'Regional Coordinator';
  SELECT count(*) INTO v_dp          FROM public.leader_assignments WHERE role = 'District President';
  SELECT count(*) INTO v_ac          FROM public.leader_assignments WHERE role = 'Assembly Coordinator';
  RAISE NOTICE 'Master Data seeded: % leaders (% with secondary number), % assignments (Global: %, RC: %, DP: %, AC: %)',
    v_leaders, v_with_2nd, v_assignments, v_global, v_rc, v_dp, v_ac;
END;

END $seed$;
