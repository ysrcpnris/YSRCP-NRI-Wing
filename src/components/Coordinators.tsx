import { useEffect, useState } from 'react';
import { Mail, MapPin } from 'lucide-react';
import { supabase, Coordinator } from '../lib/supabase';

export default function Coordinators() {
  const [coordinators, setCoordinators] = useState<(Coordinator & { profile?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const fetchCoordinators = async () => {
    const { data, error } = await supabase
      .from('coordinators')
      .select(`
        *,
        profile:profiles(full_name, email, profile_photo, current_city, current_country)
      `)
      .order('region');

    if (!error && data) {
      setCoordinators(data);
    }
    setLoading(false);
  };

  const defaultCoordinators = [
    {
      region: 'North America',
      position: 'Regional Coordinator',
      profile: {
        full_name: 'Srinivas Reddy',
        email: 'northamerica@ysrcpnri.org',
        current_city: 'New York',
        current_country: 'USA',
        profile_photo: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=300'
      }
    },
    {
      region: 'Europe',
      position: 'Regional Coordinator',
      profile: {
        full_name: 'Lakshmi Devi',
        email: 'europe@ysrcpnri.org',
        current_city: 'London',
        current_country: 'UK',
        profile_photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=300'
      }
    },
    {
      region: 'Middle East',
      position: 'Regional Coordinator',
      profile: {
        full_name: 'Ramesh Kumar',
        email: 'middleeast@ysrcpnri.org',
        current_city: 'Dubai',
        current_country: 'UAE',
        profile_photo: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=300'
      }
    },
    {
      region: 'Asia Pacific',
      position: 'Regional Coordinator',
      profile: {
        full_name: 'Priya Sharma',
        email: 'asiapacific@ysrcpnri.org',
        current_city: 'Singapore',
        current_country: 'Singapore',
        profile_photo: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=300'
      }
    }
  ];

  const displayCoordinators = coordinators.length > 0 ? coordinators : defaultCoordinators;

  return (
    <section id="coordinators" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Regional Coordinators</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our dedicated coordinators across the globe ready to assist you
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {displayCoordinators.map((coordinator, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <div className="text-center mb-4">
                  <img
                    src={coordinator.profile?.profile_photo || 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=300'}
                    alt={coordinator.profile?.full_name}
                    className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-100"
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{coordinator.profile?.full_name}</h3>
                  <p className="text-sm font-semibold text-blue-600 mb-2">{coordinator.position}</p>
                  <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                    {coordinator.region}
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                    {coordinator.profile?.current_city}, {coordinator.profile?.current_country}
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-green-600" />
                    <a href={`mailto:${coordinator.profile?.email}`} className="hover:text-blue-600 transition">
                      {coordinator.profile?.email}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
