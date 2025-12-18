import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const isMounted = useRef(true);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile_number: '',
    whatsapp_number: '',
    mobile_country_code: '+91',
    whatsapp_country_code: '+91',
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

  const professions = ['Job', 'Business', 'Student'];

  const countryCodes = [
    { code: '+1', name: 'US/CA' },
    { code: '+44', name: 'UK' },
    { code: '+61', name: 'AU' },
    { code: '+49', name: 'DE' },
    { code: '+971', name: 'UAE' },
    { code: '+65', name: 'SG' },
    { code: '+60', name: 'MY' },
    { code: '+64', name: 'NZ' },
    { code: '+31', name: 'NL' },
    { code: '+91', name: 'IN' },
  ];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const withTimeout = <T,>(p: Promise<T>, ms = 15000): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const id = setTimeout(() => reject(new Error('Request timed out')), ms);
        p.then((res) => {
          clearTimeout(id);
          resolve(res);
        }).catch((err) => {
          clearTimeout(id);
          reject(err);
        });
      });

    try {
      const profilePayload: Record<string, unknown> = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        mobile_number: formData.mobile_country_code + formData.mobile_number,
        whatsapp_number: formData.whatsapp_country_code + formData.whatsapp_number,
        country_of_residence: formData.country_of_residence,
        state_abroad: formData.state_abroad,
        indian_state: formData.indian_state,
        district: formData.district,
        assembly_constituency: formData.assembly_constituency,
        mandal: formData.mandal,
        village: formData.village,
        gender: formData.gender,
        dob: formData.dob,
        profession: formData.profession,
        organization: formData.organization,
        role_designation: formData.role_designation,
        contribution: formData.contribution,
        participate_campaign: formData.participate_campaign,
        suggestions: formData.suggestions,
        instagram_id: formData.instagram_id,
        facebook_id: formData.facebook_id,
        twitter_id: formData.twitter_id,
        linkedin_id: formData.linkedin_id,
      };



      await withTimeout(signUp(formData.email, formData.password, profilePayload), 20000);

      if (isMounted.current) setLoading(false);
      toast.success('Registration successful! .', {
        position: 'top-right',
        autoClose: 5000,
      });
      setFormData((f) => ({ ...f, password: '' }));
      setConfirmPassword('');
      setTimeout(() => navigate('/'), 2000);
      return;
    } catch (err: unknown) {
      const getErrorMessage = (e: unknown): string => {
        if (e instanceof Error) return e.message;
        if (typeof e === 'string') return e;
        if (typeof e === 'object' && e !== null) {
          const maybe = e as Record<string, unknown>;
          if (typeof maybe.message === 'string') return maybe.message;
        }
        return 'An error occurred';
      };

      const msg = getErrorMessage(err);
      if (/rate|too many|exceed|429/i.test(msg)) {
        toast.error('Verification email rate limit exceeded. Please wait a few minutes before trying again.', {
          position: 'top-right',
          autoClose: 7000,
        });
      } else {
        toast.error(msg, { position: 'top-right', autoClose: 5000 });
      }
      setError(msg);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
      
      <div className="min-h-screen bg-blue-50 py-6 px-3 sm:py-12 sm:px-4">
        <div className="max-w-4xl mx-auto">
          <div
            className="bg-white rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8"
            style={{ border: '4px solid #1e88e5' }}
          >
            <button
              onClick={() => navigate('/')}
              className="mb-4 inline-block text-blue-600 hover:text-blue-700 font-semibold text-sm sm:text-base"
            >
              ← Back to Home
            </button>

            <h2 className="text-xl sm:text-3xl font-bold mb-2 text-white bg-blue-600 p-2 sm:p-3 rounded-lg shadow">
              Join YSRCP NRI Wing
            </h2>

            <p className="text-gray-600 mb-6">
              Register to become part of our global community
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="border-b pb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 p-2 rounded bg-blue-600">
                  Personal Information
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-blue-400 rounded-lg bg-blue-50 focus:ring-2 focus:ring-green-500 focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <select
                        value={formData.mobile_country_code}
                        onChange={(e) => setFormData({ ...formData, mobile_country_code: e.target.value })}
                        className="px-2 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.code} ({country.name})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        value={formData.mobile_number}
                        onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                        className="flex-1 px-3 py-2 border-t border-b border-r border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex">
                      <select
                        value={formData.whatsapp_country_code}
                        onChange={(e) => setFormData({ ...formData, whatsapp_country_code: e.target.value })}
                        className="px-2 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.code} ({country.name})
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        required
                        value={formData.whatsapp_number}
                        onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                        className="flex-1 px-3 py-2 border-t border-b border-r border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Country of Residence <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.country_of_residence}
                      onChange={(e) => {
                        const selectedCountry = e.target.value;
                        setFormData({
                          ...formData,
                          country_of_residence: selectedCountry,
                          state_abroad: '',
                          city_abroad: '',
                        });
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Country</option>
                      {Object.keys(countryData).map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <select
                      value={formData.state_abroad}
                      onChange={(e) => {
                        const selectedState = e.target.value;
                        setFormData({
                          ...formData,
                          state_abroad: selectedState,
                          city_abroad: '',
                        });
                      }}
                      disabled={!formData.country_of_residence}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select State</option>
                      {formData.country_of_residence &&
                        countryData[formData.country_of_residence]?.map((state) => (
                          <option key={state.name} value={state.name}>
                            {state.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <select
                      value={formData.city_abroad}
                      onChange={(e) => setFormData({ ...formData, city_abroad: e.target.value })}
                      disabled={!formData.state_abroad}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    >
                      <option value="">Select City</option>
                      {formData.country_of_residence &&
                        formData.state_abroad &&
                        countryData[formData.country_of_residence]
                          ?.find((state) => state.name === formData.state_abroad)
                          ?.cities.map((city) => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Password Fields */}
              <div className="border-b pb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 p-2 rounded bg-blue-600">
                  Security
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A2A66] focus:border-transparent"

                    />
                  </div>
                </div>
              </div>

              {/* Demographics & Professional Details */}
              {/* <div className="border-b pb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 p-2 rounded bg-blue-600">
                  Demographics & Professional Details
                </h3>

                <div className="grid md:grid-cols-3 gap-4"> */}
                  {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {['Male', 'Female'].map((gender) => (
                        <label key={gender} className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value={gender}
                            checked={formData.gender === gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className="mr-2"
                          />
                          {gender}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dob || ''}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profession <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.profession}
                      onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Profession</option>
                      {professions.map((prof) => (
                        <option key={prof} value={prof}>
                          {prof}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization / Company
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role / Designation
                    </label>
                    <input
                      type="text"
                      value={formData.role_designation}
                      onChange={(e) => setFormData({ ...formData, role_designation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div> */}

              {/* Referral
              <div className="border-b pb-4">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 p-2 rounded bg-blue-600">
                  Referral
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Referred By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.referred_by}
                    onChange={(e) => setFormData({ ...formData, referred_by: e.target.value })}
                    placeholder="Enter the name of the person who referred you (optional)"
                    // className="w-full px-3 py-2.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div> */}
              {/* </div> */}

             
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3.5 sm:py-3 rounded-lg text-base font-semibold hover:shadow-lg transition disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Register'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/')}
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
