import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';




import { countriesData } from '../lib/countryCodes';
import { getStates, getCities, hasStateData } from '../lib/locationData';
import { indianAddressData } from '../lib/indianAddressData';

/**
 * Searchable input: users can type to filter the dropdown options
 * OR type a custom value that isn't in the list (for missing entries).
 */
function SearchableInput({
  value,
  options,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                value === opt ? 'bg-primary-50 font-medium text-primary-700' : ''
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && filtered.length === 0 && value.length > 0 && (
        <p className="text-[11px] text-gray-500 mt-1">
          No match — your typed value will be saved as-is.
        </p>
      )}
    </div>
  );
}
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
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

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

  const countryCodes = countriesData
    .map(country => ({
      name: country.name,
      code: '+' + country.code
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(t)) {
        setShowCountryDropdown(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(t)) {
        setShowStateDropdown(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(t)) {
        setShowCityDropdown(false);
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

    // === Mandatory location validations ===
    if (!formData.country_of_residence.trim()) {
      throw new Error('Please select the country you currently live in.');
    }
    if (!formData.state_abroad.trim()) {
      const needsSelect = hasStateData(formData.country_of_residence);
      throw new Error(
        needsSelect
          ? 'Please select your State / Province from the dropdown.'
          : 'Please enter your State / Province.'
      );
    }
    if (!formData.city_abroad.trim()) {
      const stateList = getCities(formData.country_of_residence, formData.state_abroad);
      throw new Error(
        stateList.length > 0
          ? 'Please select your City from the dropdown.'
          : 'Please enter your City.'
      );
    }

    // Pull the referral code from localStorage (set by /ref/:code redirect).
    // Pass it through to signUp so it lives in auth.users.user_metadata and
    // survives the email-verification round-trip — even when the user opens
    // the verification email on a different device where localStorage isn't
    // available. processReferralIfNeeded() falls back to this on first login.
    const referredByCode = (() => {
      try {
        return localStorage.getItem("referral_code") || undefined;
      } catch {
        return undefined;
      }
    })();

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
      referred_by: referredByCode,
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

    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 py-6 px-4 sm:py-10 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header card */}
        <div className="text-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium mb-4 inline-flex items-center gap-1"
          >
            ← Back to Home
          </button>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Join YSRCP NRI Wing
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Register to become part of our global community
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5 sm:p-8">
          {/* REFERRAL BANNER — visible only when arriving via /ref/:code.
              Same form, but the user knows they're under a referral so they
              don't worry about "did the link work?". The actual code is
              already saved to localStorage by ReferralRedirect and will be
              passed through signUp in the submit handler below. */}
          {(() => {
            let refCode = "";
            try {
              refCode = localStorage.getItem("referral_code") || "";
            } catch {}
            if (!refCode) return null;
            return (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5 flex items-start gap-3">
                <span className="text-xl" aria-hidden>🎉</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-emerald-800">
                    You're registering via a referral
                  </p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Code:{" "}
                    <span className="font-mono font-semibold">{refCode}</span>{" "}
                    · You'll get <b>+25 signup credits</b>, and your referrer
                    will earn <b>+50</b> once you verify your email.
                  </p>
                </div>
              </div>
            );
          })()}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Personal Information ── */}
            <fieldset>
              <legend className="section-heading w-full mb-4">Personal Information</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="input-field"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="input-label">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="input-field"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="relative" ref={countryDropdownRef}>
                  <label className="input-label">
                    Country You Currently Live In <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={
                      showCountryDropdown
                        ? countrySearch
                        : formData.country_of_residence
                        ? `${formData.country_of_residence} (${getCurrentCountryCode()})`
                        : ''
                    }
                    onChange={(e) => {
                      setCountrySearch(e.target.value);
                      setShowCountryDropdown(true);
                    }}
                    onFocus={() => {
                      setCountrySearch('');
                      setShowCountryDropdown(true);
                    }}
                    placeholder="Search or type country"
                    className="input-field"
                  />
                  {showCountryDropdown && (
                    <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                      {countryCodes
                        .filter((c) =>
                          c.name.toLowerCase().includes(countrySearch.toLowerCase())
                        )
                        .map((country) => (
                          <li
                            key={country.name}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              const countryCode = getCountryCodeFromCountryName(country.name);
                              setFormData({
                                ...formData,
                                country_of_residence: country.name,
                                mobile_number: countryCode,
                                state_abroad: '',
                                city_abroad: '',
                              });
                              setCountrySearch('');
                              setShowCountryDropdown(false);
                              setPhoneError('');
                            }}
                            className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                              formData.country_of_residence === country.name ? 'bg-primary-50 font-medium text-primary-700' : ''
                            }`}
                          >
                            {country.name} (+{country.code.replace('+', '')})
                          </li>
                        ))}
                      {countryCodes.filter((c) =>
                        c.name.toLowerCase().includes(countrySearch.toLowerCase())
                      ).length === 0 && (
                        <li className="px-4 py-2 text-sm text-gray-400">
                          No matching country — please pick the closest one.
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                {/* STATE / PROVINCE — searchable dropdown or free-text fallback */}
                <div className="relative" ref={stateDropdownRef}>
                  <label className="input-label">
                    State / Province <span className="text-red-500">*</span>
                  </label>
                  {(() => {
                    const stateList = getStates(formData.country_of_residence);
                    const countryHasStates = hasStateData(formData.country_of_residence);

                    if (!formData.country_of_residence || !countryHasStates) {
                      return (
                        <>
                          <input
                            type="text"
                            required
                            value={formData.state_abroad}
                            disabled={!formData.country_of_residence}
                            placeholder={
                              !formData.country_of_residence
                                ? "Select a country first"
                                : "Enter your state or province"
                            }
                            onChange={(e) => {
                              setFormData({ ...formData, state_abroad: e.target.value, city_abroad: '' });
                            }}
                            className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {formData.country_of_residence && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              No state list available — please type your state manually.
                            </p>
                          )}
                        </>
                      );
                    }

                    return (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Search or type state / province"
                          value={
                            showStateDropdown
                              ? stateSearch
                              : formData.state_abroad
                          }
                          onChange={(e) => {
                            setStateSearch(e.target.value);
                            setFormData({ ...formData, state_abroad: e.target.value, city_abroad: '' });
                            setShowStateDropdown(true);
                          }}
                          onFocus={() => {
                            setStateSearch(formData.state_abroad || '');
                            setShowStateDropdown(true);
                          }}
                          className="input-field"
                        />
                        {showStateDropdown && (
                          <ul className="absolute z-40 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {stateList
                              .filter((s) =>
                                s.toLowerCase().includes(stateSearch.toLowerCase())
                              )
                              .map((s) => (
                                <li
                                  key={s}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData({ ...formData, state_abroad: s, city_abroad: '' });
                                    setStateSearch('');
                                    setShowStateDropdown(false);
                                  }}
                                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                                    formData.state_abroad === s ? 'bg-primary-50 font-medium text-primary-700' : ''
                                  }`}
                                >
                                  {s}
                                </li>
                              ))}
                            {stateList.filter((s) =>
                              s.toLowerCase().includes(stateSearch.toLowerCase())
                            ).length === 0 && stateSearch.length > 0 && (
                              <li className="px-4 py-2 text-sm text-gray-400">
                                No match — your typed value will be saved.
                              </li>
                            )}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                {/* CITY — searchable dropdown or free-text fallback */}
                <div className="relative" ref={cityDropdownRef}>
                  <label className="input-label">
                    City <span className="text-red-500">*</span>
                  </label>
                  {(() => {
                    const cityList = getCities(formData.country_of_residence, formData.state_abroad);
                    const canUseDropdown = cityList.length > 0;

                    if (!canUseDropdown) {
                      return (
                        <>
                          <input
                            type="text"
                            required
                            value={formData.city_abroad}
                            disabled={!formData.state_abroad}
                            placeholder={
                              !formData.state_abroad
                                ? "Select a state first"
                                : "Enter your city"
                            }
                            onChange={(e) => {
                              setFormData({ ...formData, city_abroad: e.target.value });
                            }}
                            className="input-field disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                          {formData.state_abroad && (
                            <p className="text-[11px] text-gray-500 mt-1">
                              No city list available — please type your city manually.
                            </p>
                          )}
                        </>
                      );
                    }

                    return (
                      <>
                        <input
                          type="text"
                          required
                          placeholder="Search or type city"
                          value={
                            showCityDropdown
                              ? citySearch
                              : formData.city_abroad
                          }
                          onChange={(e) => {
                            setCitySearch(e.target.value);
                            setFormData({ ...formData, city_abroad: e.target.value });
                            setShowCityDropdown(true);
                          }}
                          onFocus={() => {
                            setCitySearch(formData.city_abroad || '');
                            setShowCityDropdown(true);
                          }}
                          className="input-field"
                        />
                        {showCityDropdown && (
                          <ul className="absolute z-40 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                            {cityList
                              .filter((c) =>
                                c.toLowerCase().includes(citySearch.toLowerCase())
                              )
                              .map((c) => (
                                <li
                                  key={c}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setFormData({ ...formData, city_abroad: c });
                                    setCitySearch('');
                                    setShowCityDropdown(false);
                                  }}
                                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors ${
                                    formData.city_abroad === c ? 'bg-primary-50 font-medium text-primary-700' : ''
                                  }`}
                                >
                                  {c}
                                </li>
                              ))}
                            {cityList.filter((c) =>
                              c.toLowerCase().includes(citySearch.toLowerCase())
                            ).length === 0 && citySearch.length > 0 && (
                              <li className="px-4 py-2 text-sm text-gray-400">
                                No match — your typed value will be saved.
                              </li>
                            )}
                          </ul>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="input-label">
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="input-label">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <div className="flex items-center border border-gray-300 rounded-l-lg bg-gray-50 px-1">
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
                      className="bg-transparent text-sm outline-none px-1 py-2.5"
                    >
                      {countryCodes.map((country) => (
                        <option key={country.name} value={country.code}>
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
                    className="flex-1 px-4 py-2.5 text-sm border-t border-b border-r border-gray-300 rounded-r-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    placeholder="Phone number"
                  />
                </div>
                {phoneError && <p className="text-sm text-red-600 mt-1">{phoneError}</p>}
              </div>
            </fieldset>

            {/* ── Security ── */}
            <fieldset>
              <legend className="section-heading w-full mb-4">Security</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
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
                      className="input-field pr-10"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {passwordError && <p className="text-red-600 text-xs mt-1">{passwordError}</p>}
                </div>

                <div>
                  <label className="input-label">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pr-10"
                      placeholder="Re-enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== formData.password && (
                    <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && confirmPassword === formData.password && !passwordError && (
                    <p className="text-green-600 text-xs mt-1">Passwords match</p>
                  )}
                </div>
              </div>
            </fieldset>

            {/* ── India Address Details ── */}
            <fieldset>
              <legend className="section-heading w-full mb-4 flex items-center gap-2">
                <MapPin size={16} />
                India Address Details
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">
                    State <span className="text-red-500">*</span>
                  </label>
                  <SearchableInput
                    required
                    placeholder="Search or type state"
                    value={formData.indian_state}
                    options={Object.keys(indianAddressData)}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        indian_state: val,
                        district: '',
                        assembly_constituency: '',
                        mandal: '',
                      })
                    }
                  />
                </div>

                <div>
                  <label className="input-label">
                    District <span className="text-red-500">*</span>
                  </label>
                  <SearchableInput
                    required
                    disabled={!formData.indian_state}
                    placeholder={
                      formData.indian_state
                        ? 'Search or type district'
                        : 'Select a state first'
                    }
                    value={formData.district}
                    options={
                      formData.indian_state
                        ? (indianAddressData[formData.indian_state] || []).map(
                            (d) => d.name
                          )
                        : []
                    }
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        district: val,
                        assembly_constituency: '',
                        mandal: '',
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="input-label">
                    Assembly Constituency <span className="text-red-500">*</span>
                  </label>
                  <SearchableInput
                    required
                    disabled={!formData.district}
                    placeholder={
                      formData.district
                        ? 'Search or type constituency'
                        : 'Select a district first'
                    }
                    value={formData.assembly_constituency}
                    options={
                      formData.indian_state && formData.district
                        ? (
                            indianAddressData[formData.indian_state]?.find(
                              (d) => d.name === formData.district
                            )?.constituencies || []
                          ).map((c) => c.name)
                        : []
                    }
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        assembly_constituency: val,
                        mandal: '',
                      })
                    }
                  />
                </div>

                <div>
                  <label className="input-label">
                    Mandal / Municipality <span className="text-red-500">*</span>
                  </label>
                  <SearchableInput
                    required
                    disabled={!formData.assembly_constituency}
                    placeholder={
                      formData.assembly_constituency
                        ? 'Search or type mandal'
                        : 'Select a constituency first'
                    }
                    value={formData.mandal}
                    options={
                      formData.indian_state &&
                      formData.district &&
                      formData.assembly_constituency
                        ? indianAddressData[formData.indian_state]
                            ?.find((d) => d.name === formData.district)
                            ?.constituencies.find(
                              (c) => c.name === formData.assembly_constituency
                            )?.mandals || []
                        : []
                    }
                    onChange={(val) =>
                      setFormData({ ...formData, mandal: val })
                    }
                  />
                </div>
              </div>
            </fieldset>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 text-base rounded-xl"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/', { state: { openLogin: true } })}
                className="text-primary-600 hover:text-primary-700 font-semibold"
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