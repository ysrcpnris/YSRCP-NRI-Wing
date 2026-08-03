-- =====================================================================
-- 20260804200000 — chapter clusters
--
-- A cluster is a group of cities sharing one chapter team. The USA is
-- too large for one chapter and too spread out for fifty, so it splits
-- into regional clusters; smaller countries are a single cluster.
--
-- cluster_cities is keyed (country, city) — a city belongs to exactly
-- one cluster, so a member's city never resolves to two chapters
-- (20260804090000).
--
-- WHAT IS REAL HERE AND WHAT IS NOT
--   The countries and the cluster shapes are real: these are the places
--   the NRI Wing actually organises in, and the US regional split
--   follows where Telugu populations concentrate. The city lists are
--   the metro areas members actually live in.
--
--   No members are created here. Synthetic members for testing the
--   chapter screens live in supabase/seeds/, which never runs against
--   production.
--
-- COVERAGE IS PARTIAL BY DESIGN
--   Members in a city not listed below have no chapter yet. That is a
--   true statement about the wing's organisation, not a gap to paper
--   over — chapter_for_city() returns null and the UI says so.
-- =====================================================================

INSERT INTO public.clusters (name, country) VALUES
  ('USA — West',        'United States'),
  ('USA — Southwest',   'United States'),
  ('USA — Midwest',     'United States'),
  ('USA — Northeast',   'United States'),
  ('USA — Southeast',   'United States'),
  ('Canada',            'Canada'),
  ('United Kingdom',    'United Kingdom'),
  ('Germany',           'Germany'),
  ('Ireland',           'Ireland'),
  ('UAE',               'UAE'),
  ('Saudi Arabia',      'Saudi Arabia'),
  ('Qatar',             'Qatar'),
  ('Kuwait',            'Kuwait'),
  ('Singapore',         'Singapore'),
  ('Australia — East',  'Australia'),
  ('Australia — West',  'Australia'),
  ('New Zealand',       'New Zealand'),
  ('Japan',             'Japan'),
  ('South Africa',      'South Africa')
ON CONFLICT (country, name) DO NOTHING;

INSERT INTO public.cluster_cities (country, city, cluster_id)
SELECT v.country, v.city, c.id
  FROM (VALUES
    -- USA West
    ('United States','San Jose','USA — West'),
    ('United States','San Francisco','USA — West'),
    ('United States','Fremont','USA — West'),
    ('United States','Seattle','USA — West'),
    ('United States','Portland','USA — West'),
    ('United States','Los Angeles','USA — West'),
    ('United States','San Diego','USA — West'),
    ('United States','Sacramento','USA — West'),
    -- USA Southwest
    ('United States','Dallas','USA — Southwest'),
    ('United States','Irving','USA — Southwest'),
    ('United States','Plano','USA — Southwest'),
    ('United States','Austin','USA — Southwest'),
    ('United States','Houston','USA — Southwest'),
    ('United States','Phoenix','USA — Southwest'),
    ('United States','Denver','USA — Southwest'),
    ('United States','Las Vegas','USA — Southwest'),
    -- USA Midwest
    ('United States','Chicago','USA — Midwest'),
    ('United States','Naperville','USA — Midwest'),
    ('United States','Detroit','USA — Midwest'),
    ('United States','Columbus','USA — Midwest'),
    ('United States','Minneapolis','USA — Midwest'),
    ('United States','St. Louis','USA — Midwest'),
    ('United States','Kansas City','USA — Midwest'),
    ('United States','Indianapolis','USA — Midwest'),
    -- USA Northeast
    ('United States','New York','USA — Northeast'),
    ('United States','Edison','USA — Northeast'),
    ('United States','Jersey City','USA — Northeast'),
    ('United States','Boston','USA — Northeast'),
    ('United States','Philadelphia','USA — Northeast'),
    ('United States','Pittsburgh','USA — Northeast'),
    ('United States','Hartford','USA — Northeast'),
    ('United States','Baltimore','USA — Northeast'),
    ('United States','Washington DC','USA — Northeast'),
    -- USA Southeast
    ('United States','Atlanta','USA — Southeast'),
    ('United States','Charlotte','USA — Southeast'),
    ('United States','Raleigh','USA — Southeast'),
    ('United States','Tampa','USA — Southeast'),
    ('United States','Orlando','USA — Southeast'),
    ('United States','Miami','USA — Southeast'),
    ('United States','Nashville','USA — Southeast'),
    -- Canada
    ('Canada','Toronto','Canada'),
    ('Canada','Mississauga','Canada'),
    ('Canada','Vancouver','Canada'),
    ('Canada','Calgary','Canada'),
    ('Canada','Montreal','Canada'),
    ('Canada','Ottawa','Canada'),
    ('Canada','Edmonton','Canada'),
    -- UK
    ('United Kingdom','London','United Kingdom'),
    ('United Kingdom','Birmingham','United Kingdom'),
    ('United Kingdom','Manchester','United Kingdom'),
    ('United Kingdom','Leeds','United Kingdom'),
    ('United Kingdom','Glasgow','United Kingdom'),
    ('United Kingdom','Edinburgh','United Kingdom'),
    ('United Kingdom','Reading','United Kingdom'),
    -- Germany
    ('Germany','Frankfurt','Germany'),
    ('Germany','Munich','Germany'),
    ('Germany','Berlin','Germany'),
    ('Germany','Hamburg','Germany'),
    ('Germany','Stuttgart','Germany'),
    ('Germany','Düsseldorf','Germany'),
    ('Germany','Cologne','Germany'),
    -- Ireland
    ('Ireland','Dublin','Ireland'),
    ('Ireland','Cork','Ireland'),
    ('Ireland','Galway','Ireland'),
    -- Gulf
    ('UAE','Dubai','UAE'),
    ('UAE','Abu Dhabi','UAE'),
    ('UAE','Sharjah','UAE'),
    ('Saudi Arabia','Riyadh','Saudi Arabia'),
    ('Saudi Arabia','Jeddah','Saudi Arabia'),
    ('Saudi Arabia','Dammam','Saudi Arabia'),
    ('Qatar','Doha','Qatar'),
    ('Kuwait','Kuwait City','Kuwait'),
    -- APAC
    ('Singapore','Singapore','Singapore'),
    ('Australia','Sydney','Australia — East'),
    ('Australia','Melbourne','Australia — East'),
    ('Australia','Brisbane','Australia — East'),
    ('Australia','Canberra','Australia — East'),
    ('Australia','Perth','Australia — West'),
    ('Australia','Adelaide','Australia — West'),
    ('New Zealand','Auckland','New Zealand'),
    ('New Zealand','Wellington','New Zealand'),
    ('Japan','Tokyo','Japan'),
    ('South Africa','Johannesburg','South Africa')
  ) AS v(country, city, cluster_name)
  JOIN public.clusters c ON c.name = v.cluster_name AND c.country = v.country
ON CONFLICT (country, city) DO NOTHING;

-- Which chapter does a member's city belong to? Null when their city is
-- not organised yet, which the UI reports rather than hides.
CREATE OR REPLACE FUNCTION public.chapter_for_city(p_country text, p_city text)
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT cluster_id FROM public.cluster_cities
   WHERE lower(btrim(country)) = lower(btrim(p_country))
     AND lower(btrim(city))    = lower(btrim(p_city));
$$;

GRANT EXECUTE ON FUNCTION public.chapter_for_city(text, text) TO authenticated;

-- The JOIN above drops any row whose cluster_name is misspelled, exactly
-- as the district aliases did. Count what landed.
DO $$
DECLARE cl int; ci int;
BEGIN
  SELECT count(*) INTO cl FROM public.clusters;
  SELECT count(*) INTO ci FROM public.cluster_cities;
  IF cl <> 19 THEN
    RAISE EXCEPTION 'expected 19 clusters, % present', cl;
  END IF;
  IF ci <> 83 THEN
    RAISE EXCEPTION 'expected 83 cluster cities, % landed — a cluster_name '
                    'in the VALUES list does not match clusters.name', ci;
  END IF;
  RAISE NOTICE 'clusters: % across % cities', cl, ci;
END $$;
