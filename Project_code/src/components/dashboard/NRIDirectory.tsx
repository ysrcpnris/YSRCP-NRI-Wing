import { useState, useEffect } from 'react';
import { Users, MapPin, Briefcase, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Profile } from '../../lib/supabase';

export default function NRIDirectory() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('all');
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'verified')
      .order('full_name');

    if (!error && data) {
      setMembers(data);
      const uniqueCountries = [...new Set(data.map((m) => m.current_country).filter(Boolean))] as string[];
      setCountries(uniqueCountries);
    }
    setLoading(false);
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.current_city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.occupation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = filterCountry === 'all' || member.current_country === filterCountry;
    return matchesSearch && matchesCountry;
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Users className="w-8 h-8 mr-3 text-blue-600" />
          NRI Directory
        </h2>
        <p className="text-gray-600 ml-11">Connect with YSRCP supporters worldwide</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 p-6 rounded-xl border border-blue-200">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, city, or occupation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>{filteredMembers.length}</strong> members found
          {filterCountry !== 'all' && ` in ${filterCountry}`}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No members found matching your criteria</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-gray-200 p-6 rounded-xl hover:shadow-lg transition"
            >
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {member.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="text-xl font-bold text-gray-900 mb-1">{member.full_name}</h4>
                  {member.occupation && (
                    <div className="flex items-center text-gray-600 mb-2">
                      <Briefcase className="w-4 h-4 mr-2 text-green-600" />
                      <span className="text-sm">{member.occupation}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="text-sm">
                      {member.current_city}, {member.current_country}
                    </span>
                  </div>
                  {member.native_district && (
                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                      Native: {member.native_district}, AP
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
