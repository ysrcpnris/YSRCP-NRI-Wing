-- =====================================================================
-- 20260804140000 — seed mandals for the constituencies members come from
--
-- 36 constituencies, 155 mandals. Not all 175 — the remaining ones have
-- no NRI members and no urgency, and inventing names for them would be
-- worse than leaving them empty. profile_is_complete() already treats
-- mandal as optional where none are loaded (20260804110000), so an
-- unseeded constituency blocks nobody.
--
-- VALIDATION
--   These were cross-checked against what 2,639 members independently
--   typed into the old free-text field. 72% of their entries match this
--   list; the rest are almost entirely spelling variants of names
--   already here — Dachepalli/Dachepalle, Sattenapalli/Sattenapalle,
--   Gurazala/Gurajala, Rayachoty/Rayachoti, Pendlimarry/Pendlimarri.
--   Four names that members supplied and this list lacked have been
--   added: Chinnamandem, Durgi, Yerraguntla, Kalikiri.
--
--   Two unrelated sources agreeing at that rate is the strongest signal
--   available without an official dataset. It is not a substitute for
--   one: the remaining 139 constituencies should be loaded from the
--   Election Commission or AP's own administrative data before those
--   members are asked for a mandal.
--
-- Idempotent: safe to re-run, and safe to extend one constituency at a
-- time as better data arrives.
-- =====================================================================


-- Adoni
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Adoni', id FROM public.ap_constituencies WHERE name = 'Adoni'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Holagunda', id FROM public.ap_constituencies WHERE name = 'Adoni'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Peddakadubur', id FROM public.ap_constituencies WHERE name = 'Adoni'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Allagadda
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Allagadda', id FROM public.ap_constituencies WHERE name = 'Allagadda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chagalamarri', id FROM public.ap_constituencies WHERE name = 'Allagadda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Dornipadu', id FROM public.ap_constituencies WHERE name = 'Allagadda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rudravaram', id FROM public.ap_constituencies WHERE name = 'Allagadda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Uyyalawada', id FROM public.ap_constituencies WHERE name = 'Allagadda'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Anantapur Urban
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Anantapur Urban', id FROM public.ap_constituencies WHERE name = 'Anantapur Urban'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Bukkarayasamudram', id FROM public.ap_constituencies WHERE name = 'Anantapur Urban'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Garladinne', id FROM public.ap_constituencies WHERE name = 'Anantapur Urban'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rapthadu', id FROM public.ap_constituencies WHERE name = 'Anantapur Urban'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Badvel
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Atlur', id FROM public.ap_constituencies WHERE name = 'Badvel'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Badvel', id FROM public.ap_constituencies WHERE name = 'Badvel'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gopavaram', id FROM public.ap_constituencies WHERE name = 'Badvel'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kalasapadu', id FROM public.ap_constituencies WHERE name = 'Badvel'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Porumamilla', id FROM public.ap_constituencies WHERE name = 'Badvel'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Banaganapalle
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Banaganapalle', id FROM public.ap_constituencies WHERE name = 'Banaganapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Dhone', id FROM public.ap_constituencies WHERE name = 'Banaganapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Koilkuntla', id FROM public.ap_constituencies WHERE name = 'Banaganapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Owk', id FROM public.ap_constituencies WHERE name = 'Banaganapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sanjamala', id FROM public.ap_constituencies WHERE name = 'Banaganapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Bhimavaram
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Bhimavaram', id FROM public.ap_constituencies WHERE name = 'Bhimavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Palakoderu', id FROM public.ap_constituencies WHERE name = 'Bhimavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Undi', id FROM public.ap_constituencies WHERE name = 'Bhimavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Veeravasaram', id FROM public.ap_constituencies WHERE name = 'Bhimavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Chandragiri
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chandragiri', id FROM public.ap_constituencies WHERE name = 'Chandragiri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chinnagottigallu', id FROM public.ap_constituencies WHERE name = 'Chandragiri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pakala', id FROM public.ap_constituencies WHERE name = 'Chandragiri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Ramachandrapuram', id FROM public.ap_constituencies WHERE name = 'Chandragiri'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Chilakaluripet
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chilakaluripet', id FROM public.ap_constituencies WHERE name = 'Chilakaluripet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Edlapadu', id FROM public.ap_constituencies WHERE name = 'Chilakaluripet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Purushothapatnam', id FROM public.ap_constituencies WHERE name = 'Chilakaluripet'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Dharmavaram
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Bathalapalle', id FROM public.ap_constituencies WHERE name = 'Dharmavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Dharmavaram', id FROM public.ap_constituencies WHERE name = 'Dharmavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Mudigubba', id FROM public.ap_constituencies WHERE name = 'Dharmavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Tadimarri', id FROM public.ap_constituencies WHERE name = 'Dharmavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Dhone
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Bethamcherla', id FROM public.ap_constituencies WHERE name = 'Dhone'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Dhone', id FROM public.ap_constituencies WHERE name = 'Dhone'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Krishnagiri', id FROM public.ap_constituencies WHERE name = 'Dhone'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Peapully', id FROM public.ap_constituencies WHERE name = 'Dhone'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Eluru
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Denduluru', id FROM public.ap_constituencies WHERE name = 'Eluru'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Eluru', id FROM public.ap_constituencies WHERE name = 'Eluru'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pedapadu', id FROM public.ap_constituencies WHERE name = 'Eluru'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pedavegi', id FROM public.ap_constituencies WHERE name = 'Eluru'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Gudivada
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gudivada', id FROM public.ap_constituencies WHERE name = 'Gudivada'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gudlavalleru', id FROM public.ap_constituencies WHERE name = 'Gudivada'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nandivada', id FROM public.ap_constituencies WHERE name = 'Gudivada'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pedaparupudi', id FROM public.ap_constituencies WHERE name = 'Gudivada'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Guntur West
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Guntur West', id FROM public.ap_constituencies WHERE name = 'Guntur West'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Medikonduru', id FROM public.ap_constituencies WHERE name = 'Guntur West'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pedakakani', id FROM public.ap_constituencies WHERE name = 'Guntur West'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Gurajala
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Dachepalle', id FROM public.ap_constituencies WHERE name = 'Gurajala'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gurajala', id FROM public.ap_constituencies WHERE name = 'Gurajala'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Machavaram', id FROM public.ap_constituencies WHERE name = 'Gurajala'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Piduguralla', id FROM public.ap_constituencies WHERE name = 'Gurajala'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Jammalamadugu
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Jammalamadugu', id FROM public.ap_constituencies WHERE name = 'Jammalamadugu'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kondapuram', id FROM public.ap_constituencies WHERE name = 'Jammalamadugu'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Mylavaram', id FROM public.ap_constituencies WHERE name = 'Jammalamadugu'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Peddamudium', id FROM public.ap_constituencies WHERE name = 'Jammalamadugu'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Yerraguntla', id FROM public.ap_constituencies WHERE name = 'Jammalamadugu'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Kadapa
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chennur', id FROM public.ap_constituencies WHERE name = 'Kadapa'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kadapa', id FROM public.ap_constituencies WHERE name = 'Kadapa'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kamalapuram', id FROM public.ap_constituencies WHERE name = 'Kadapa'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vallur', id FROM public.ap_constituencies WHERE name = 'Kadapa'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Kamalapuram
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chennur', id FROM public.ap_constituencies WHERE name = 'Kamalapuram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chinthakommadinne', id FROM public.ap_constituencies WHERE name = 'Kamalapuram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kamalapuram', id FROM public.ap_constituencies WHERE name = 'Kamalapuram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pendlimarri', id FROM public.ap_constituencies WHERE name = 'Kamalapuram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vallur', id FROM public.ap_constituencies WHERE name = 'Kamalapuram'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Kodur
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chitvel', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kalikiri', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Obulavaripalle', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Penagaluru', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pullampet', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Railway Koduru', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rajampet', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sambepalle', id FROM public.ap_constituencies WHERE name = 'Kodur'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Kurnool
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kallur', id FROM public.ap_constituencies WHERE name = 'Kurnool'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kurnool', id FROM public.ap_constituencies WHERE name = 'Kurnool'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Orvakal', id FROM public.ap_constituencies WHERE name = 'Kurnool'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Macherla
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Durgi', id FROM public.ap_constituencies WHERE name = 'Macherla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Karempudi', id FROM public.ap_constituencies WHERE name = 'Macherla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Macherla', id FROM public.ap_constituencies WHERE name = 'Macherla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rentachintala', id FROM public.ap_constituencies WHERE name = 'Macherla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Veldurthi', id FROM public.ap_constituencies WHERE name = 'Macherla'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Mydukur
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chapadu', id FROM public.ap_constituencies WHERE name = 'Mydukur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Duvvur', id FROM public.ap_constituencies WHERE name = 'Mydukur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Khajipet', id FROM public.ap_constituencies WHERE name = 'Mydukur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Mydukur', id FROM public.ap_constituencies WHERE name = 'Mydukur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sri Avadhutha Kasinayana', id FROM public.ap_constituencies WHERE name = 'Mydukur'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Mylavaram
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'G Konduru', id FROM public.ap_constituencies WHERE name = 'Mylavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Ibrahimpatnam', id FROM public.ap_constituencies WHERE name = 'Mylavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Mylavaram', id FROM public.ap_constituencies WHERE name = 'Mylavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Reddigudem', id FROM public.ap_constituencies WHERE name = 'Mylavaram'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Nandyal
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Atmakur', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Banaganapalle', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gospadu', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Koilkuntla', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nandyal', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sanjamala', id FROM public.ap_constituencies WHERE name = 'Nandyal'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Narasaraopet
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nadendla', id FROM public.ap_constituencies WHERE name = 'Narasaraopet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Narasaraopet', id FROM public.ap_constituencies WHERE name = 'Narasaraopet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rompicherla', id FROM public.ap_constituencies WHERE name = 'Narasaraopet'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Nellore City
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Buchireddypalem', id FROM public.ap_constituencies WHERE name = 'Nellore City'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kovur', id FROM public.ap_constituencies WHERE name = 'Nellore City'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nellore City', id FROM public.ap_constituencies WHERE name = 'Nellore City'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Ongole
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kothapatnam', id FROM public.ap_constituencies WHERE name = 'Ongole'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Naguluppalapadu', id FROM public.ap_constituencies WHERE name = 'Ongole'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Ongole', id FROM public.ap_constituencies WHERE name = 'Ongole'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Proddatur
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chapadu', id FROM public.ap_constituencies WHERE name = 'Proddatur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kamanur', id FROM public.ap_constituencies WHERE name = 'Proddatur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Proddatur', id FROM public.ap_constituencies WHERE name = 'Proddatur'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rajupalem', id FROM public.ap_constituencies WHERE name = 'Proddatur'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Pulivendla
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chakrayapet', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Lingala', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pulivendla', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Simhadripuram', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Thondur', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vempalle', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vemula', id FROM public.ap_constituencies WHERE name = 'Pulivendla'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Rajampet
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nandalur', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pullampet', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rajampet', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sidhout', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'T Sundupalle', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Veeraballi', id FROM public.ap_constituencies WHERE name = 'Rajampet'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Rayachoti
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chinnamandem', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Lakkireddipalle', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Ramapuram', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rayachoti', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sambepalle', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Veerapunayunipalle', id FROM public.ap_constituencies WHERE name = 'Rayachoti'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Sattenapalle
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Muppalla', id FROM public.ap_constituencies WHERE name = 'Sattenapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nakarikallu', id FROM public.ap_constituencies WHERE name = 'Sattenapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Rajupalem', id FROM public.ap_constituencies WHERE name = 'Sattenapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Sattenapalle', id FROM public.ap_constituencies WHERE name = 'Sattenapalle'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Tadpatri
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Peddavaduguru', id FROM public.ap_constituencies WHERE name = 'Tadpatri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Putlur', id FROM public.ap_constituencies WHERE name = 'Tadpatri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Tadpatri', id FROM public.ap_constituencies WHERE name = 'Tadpatri'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Yellanur', id FROM public.ap_constituencies WHERE name = 'Tadpatri'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Tirupati
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Chandragiri', id FROM public.ap_constituencies WHERE name = 'Tirupati'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Renigunta', id FROM public.ap_constituencies WHERE name = 'Tirupati'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Tirupati Rural', id FROM public.ap_constituencies WHERE name = 'Tirupati'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Yerpedu', id FROM public.ap_constituencies WHERE name = 'Tirupati'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Vijayawada East
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Kankipadu', id FROM public.ap_constituencies WHERE name = 'Vijayawada East'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Penamaluru', id FROM public.ap_constituencies WHERE name = 'Vijayawada East'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vijayawada East', id FROM public.ap_constituencies WHERE name = 'Vijayawada East'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Vinukonda
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Ipur', id FROM public.ap_constituencies WHERE name = 'Vinukonda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Nuzendla', id FROM public.ap_constituencies WHERE name = 'Vinukonda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Savalyapuram', id FROM public.ap_constituencies WHERE name = 'Vinukonda'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Vinukonda', id FROM public.ap_constituencies WHERE name = 'Vinukonda'
  ON CONFLICT (name, constituency_id) DO NOTHING;

-- Visakhapatnam North
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Gopalapatnam', id FROM public.ap_constituencies WHERE name = 'Visakhapatnam North'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Pendurthi', id FROM public.ap_constituencies WHERE name = 'Visakhapatnam North'
  ON CONFLICT (name, constituency_id) DO NOTHING;
INSERT INTO public.ap_mandals (name, constituency_id)
  SELECT 'Visakhapatnam North', id FROM public.ap_constituencies WHERE name = 'Visakhapatnam North'
  ON CONFLICT (name, constituency_id) DO NOTHING;

DO $$
DECLARE n int; c int;
BEGIN
  SELECT count(*) INTO n FROM public.ap_mandals;
  SELECT count(DISTINCT constituency_id) INTO c FROM public.ap_mandals;
  RAISE NOTICE 'ap_mandals: % mandals across % constituencies', n, c;
END $$;

