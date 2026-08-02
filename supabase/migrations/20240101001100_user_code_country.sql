-- =====================================================================
-- USER CODE FORMAT — country-coded (new users only)
--
-- Old format: NRI-XXXX-XX           (4 + 2 random chars)
-- New format: NRI-{ISO3}-{5 random} (e.g. NRI-USA-K3P9M, NRI-IND-7M2QR)
--
-- Existing rows keep their old codes (we don't backfill — anyone who has
-- already shared their User ID stays unchanged). The change only applies
-- to NEW profile inserts.
--
-- The country code is derived from country_of_residence at registration time
-- and frozen — if the user later moves, their ID stays the same.
--
-- Unknown / missing country -> "WLD".
-- =====================================================================


-- 1. Country name -> ISO 3166-1 alpha-3 code.
--    Covers the major NRI-destination countries. Falls back to "WLD".
CREATE OR REPLACE FUNCTION public.country_to_iso3(country_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF country_name IS NULL OR country_name = '' THEN
    RETURN 'WLD';
  END IF;

  RETURN CASE country_name
    -- Top NRI destinations
    WHEN 'United States' THEN 'USA'
    WHEN 'India' THEN 'IND'
    WHEN 'United Kingdom' THEN 'GBR'
    WHEN 'United Arab Emirates' THEN 'UAE'   -- ISO 3166 is ARE but UAE is more recognisable
    WHEN 'Canada' THEN 'CAN'
    WHEN 'Australia' THEN 'AUS'
    WHEN 'New Zealand' THEN 'NZL'
    WHEN 'Singapore' THEN 'SGP'
    WHEN 'Saudi Arabia' THEN 'SAU'
    WHEN 'Qatar' THEN 'QAT'
    WHEN 'Bahrain' THEN 'BHR'
    WHEN 'Kuwait' THEN 'KWT'
    WHEN 'Oman' THEN 'OMN'
    WHEN 'Malaysia' THEN 'MYS'
    WHEN 'Germany' THEN 'DEU'
    WHEN 'France' THEN 'FRA'
    WHEN 'Italy' THEN 'ITA'
    WHEN 'Spain' THEN 'ESP'
    WHEN 'Netherlands' THEN 'NLD'
    WHEN 'Ireland' THEN 'IRL'
    WHEN 'Belgium' THEN 'BEL'
    WHEN 'Switzerland' THEN 'CHE'
    WHEN 'Sweden' THEN 'SWE'
    WHEN 'Norway' THEN 'NOR'
    WHEN 'Denmark' THEN 'DNK'
    WHEN 'Finland' THEN 'FIN'
    WHEN 'Austria' THEN 'AUT'
    WHEN 'Portugal' THEN 'PRT'
    WHEN 'Poland' THEN 'POL'
    WHEN 'Greece' THEN 'GRC'
    WHEN 'Czech Republic' THEN 'CZE'
    WHEN 'Hungary' THEN 'HUN'
    WHEN 'Russia' THEN 'RUS'
    WHEN 'Ukraine' THEN 'UKR'
    WHEN 'Turkey' THEN 'TUR'
    WHEN 'Israel' THEN 'ISR'
    WHEN 'Pakistan' THEN 'PAK'
    WHEN 'Bangladesh' THEN 'BGD'
    WHEN 'Sri Lanka' THEN 'LKA'
    WHEN 'Nepal' THEN 'NPL'
    WHEN 'Bhutan' THEN 'BTN'
    WHEN 'Maldives' THEN 'MDV'
    WHEN 'Afghanistan' THEN 'AFG'
    WHEN 'Japan' THEN 'JPN'
    WHEN 'China' THEN 'CHN'
    WHEN 'Korea, South' THEN 'KOR'
    WHEN 'Korea, North' THEN 'PRK'
    WHEN 'Hong Kong' THEN 'HKG'
    WHEN 'Macau' THEN 'MAC'
    WHEN 'Taiwan' THEN 'TWN'
    WHEN 'Mongolia' THEN 'MNG'
    WHEN 'Kazakhstan' THEN 'KAZ'
    WHEN 'Uzbekistan' THEN 'UZB'
    WHEN 'Kyrgyzstan' THEN 'KGZ'
    WHEN 'Tajikistan' THEN 'TJK'
    WHEN 'Turkmenistan' THEN 'TKM'
    WHEN 'Indonesia' THEN 'IDN'
    WHEN 'Thailand' THEN 'THA'
    WHEN 'Vietnam' THEN 'VNM'
    WHEN 'Philippines' THEN 'PHL'
    WHEN 'Cambodia' THEN 'KHM'
    WHEN 'Laos' THEN 'LAO'
    WHEN 'Myanmar' THEN 'MMR'
    WHEN 'Brunei Darussalam' THEN 'BRN'
    WHEN 'East Timor (Timor-Leste)' THEN 'TLS'
    -- Middle East
    WHEN 'Iran' THEN 'IRN'
    WHEN 'Iraq' THEN 'IRQ'
    WHEN 'Jordan' THEN 'JOR'
    WHEN 'Lebanon' THEN 'LBN'
    WHEN 'Syria' THEN 'SYR'
    WHEN 'Yemen' THEN 'YEM'
    WHEN 'Palestine' THEN 'PSE'
    WHEN 'Cyprus' THEN 'CYP'
    -- Africa
    WHEN 'Egypt' THEN 'EGY'
    WHEN 'South Africa' THEN 'ZAF'
    WHEN 'Kenya' THEN 'KEN'
    WHEN 'Nigeria' THEN 'NGA'
    WHEN 'Ghana' THEN 'GHA'
    WHEN 'Ethiopia' THEN 'ETH'
    WHEN 'Tanzania' THEN 'TZA'
    WHEN 'Uganda' THEN 'UGA'
    WHEN 'Rwanda' THEN 'RWA'
    WHEN 'Morocco' THEN 'MAR'
    WHEN 'Tunisia' THEN 'TUN'
    WHEN 'Algeria' THEN 'DZA'
    WHEN 'Libya' THEN 'LBY'
    WHEN 'Sudan' THEN 'SDN'
    WHEN 'South Sudan' THEN 'SSD'
    WHEN 'Senegal' THEN 'SEN'
    WHEN 'Ivory Coast (Côte d''Ivoire)' THEN 'CIV'
    WHEN 'Zimbabwe' THEN 'ZWE'
    WHEN 'Zambia' THEN 'ZMB'
    WHEN 'Mozambique' THEN 'MOZ'
    WHEN 'Angola' THEN 'AGO'
    WHEN 'Cameroon' THEN 'CMR'
    WHEN 'Mauritius' THEN 'MUS'
    WHEN 'Madagascar' THEN 'MDG'
    -- Europe (rest)
    WHEN 'Romania' THEN 'ROU'
    WHEN 'Bulgaria' THEN 'BGR'
    WHEN 'Croatia' THEN 'HRV'
    WHEN 'Serbia' THEN 'SRB'
    WHEN 'Slovakia' THEN 'SVK'
    WHEN 'Slovenia' THEN 'SVN'
    WHEN 'Lithuania' THEN 'LTU'
    WHEN 'Latvia' THEN 'LVA'
    WHEN 'Estonia' THEN 'EST'
    WHEN 'Iceland' THEN 'ISL'
    WHEN 'Luxembourg' THEN 'LUX'
    WHEN 'Malta' THEN 'MLT'
    WHEN 'Albania' THEN 'ALB'
    WHEN 'North Macedonia' THEN 'MKD'
    WHEN 'Bosnia and Herzegovina' THEN 'BIH'
    WHEN 'Montenegro' THEN 'MNE'
    WHEN 'Belarus' THEN 'BLR'
    WHEN 'Moldova' THEN 'MDA'
    WHEN 'Kosovo' THEN 'XKX'
    WHEN 'Andorra' THEN 'AND'
    WHEN 'Liechtenstein' THEN 'LIE'
    WHEN 'Monaco' THEN 'MCO'
    WHEN 'San Marino' THEN 'SMR'
    WHEN 'Vatican City State (Holy See)' THEN 'VAT'
    -- Americas
    WHEN 'Mexico' THEN 'MEX'
    WHEN 'Brazil' THEN 'BRA'
    WHEN 'Argentina' THEN 'ARG'
    WHEN 'Chile' THEN 'CHL'
    WHEN 'Colombia' THEN 'COL'
    WHEN 'Peru' THEN 'PER'
    WHEN 'Venezuela' THEN 'VEN'
    WHEN 'Ecuador' THEN 'ECU'
    WHEN 'Bolivia' THEN 'BOL'
    WHEN 'Paraguay' THEN 'PRY'
    WHEN 'Uruguay' THEN 'URY'
    WHEN 'Costa Rica' THEN 'CRI'
    WHEN 'Panama' THEN 'PAN'
    WHEN 'Guatemala' THEN 'GTM'
    WHEN 'Honduras' THEN 'HND'
    WHEN 'Nicaragua' THEN 'NIC'
    WHEN 'El Salvador' THEN 'SLV'
    WHEN 'Cuba' THEN 'CUB'
    WHEN 'Dominican Republic' THEN 'DOM'
    WHEN 'Jamaica' THEN 'JAM'
    WHEN 'Trinidad and Tobago' THEN 'TTO'
    WHEN 'Puerto Rico' THEN 'PRI'
    -- Oceania
    WHEN 'Fiji' THEN 'FJI'
    WHEN 'Papua New Guinea' THEN 'PNG'
    WHEN 'Samoa' THEN 'WSM'
    -- Anything else falls through to WLD
    ELSE 'WLD'
  END;
END;
$$;


-- 2. Replace the autofill trigger function so it generates the new format
--    for new rows. Existing rows are untouched (the trigger is BEFORE INSERT).
CREATE OR REPLACE FUNCTION public.profiles_autofill_codes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  attempt   int;
  candidate text;
  iso3      text;
BEGIN
  -- referral_code (8 chars, unchanged)
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    FOR attempt IN 1..10 LOOP
      candidate := public.gen_short_code(8);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = candidate) THEN
        NEW.referral_code := candidate;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- public_user_code: NRI-{ISO3}-{5 random}
  IF NEW.public_user_code IS NULL OR NEW.public_user_code = '' THEN
    iso3 := public.country_to_iso3(NEW.country_of_residence);

    FOR attempt IN 1..10 LOOP
      candidate := 'NRI-' || iso3 || '-' || public.gen_short_code(5);
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_user_code = candidate) THEN
        NEW.public_user_code := candidate;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;


-- The existing BEFORE INSERT trigger (trg_profiles_autofill_codes) already
-- points at this function — no need to recreate it. New rows from now on
-- get the country-coded format; existing rows stay as-is.
