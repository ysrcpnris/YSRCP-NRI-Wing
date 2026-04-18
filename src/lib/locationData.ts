/**
 * Location data helper
 * Wraps the World_PhoneCode_Countries_States_Cities.json dataset.
 * Provides cascading lookups: country → states → cities.
 */
import worldData from "./World_PhoneCode_Countries_States_Cities.json";

type CityList = string[];

type StateEntry = {
  state: string;
  cities: CityList;
};

type CountryEntry = {
  phone_code?: string;
  iso_code?: string;
  country_name: string;
  states: StateEntry[];
};

type ContinentEntry = {
  continent: string;
  countries: CountryEntry[];
};

// Flat lookup map for O(1) country access
const countryMap: Map<string, CountryEntry> = (() => {
  const m = new Map<string, CountryEntry>();
  (worldData as ContinentEntry[]).forEach((c) => {
    c.countries.forEach((country) => {
      m.set(normalize(country.country_name), country);
    });
  });
  return m;
})();

function normalize(s: string): string {
  return (s || "").trim().toLowerCase();
}

/**
 * Returns the list of states for a given country name.
 * Returns [] if the country isn't in the dataset.
 */
export function getStates(countryName: string): string[] {
  const country = countryMap.get(normalize(countryName));
  if (!country || !Array.isArray(country.states)) return [];
  return country.states.map((s) => s.state).sort();
}

/**
 * Returns the list of cities for a given country + state.
 * Returns [] if either the country or state isn't in the dataset.
 */
export function getCities(countryName: string, stateName: string): string[] {
  const country = countryMap.get(normalize(countryName));
  if (!country || !Array.isArray(country.states)) return [];
  const state = country.states.find(
    (s) => normalize(s.state) === normalize(stateName)
  );
  if (!state || !Array.isArray(state.cities)) return [];
  return [...state.cities].sort();
}

/**
 * Quick check — does this country have any data in our file?
 * If false, fall back to free-text input in the UI.
 */
export function hasStateData(countryName: string): boolean {
  const country = countryMap.get(normalize(countryName));
  return !!country && Array.isArray(country.states) && country.states.length > 0;
}
