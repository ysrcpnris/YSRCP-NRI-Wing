import { useEffect, useState } from 'react';
import { MapPin, User, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, LocalLeader, Event } from '../../lib/supabase';

export default function DashboardHome() {
  const { profile } = useAuth();
  const [localLeader, setLocalLeader] = useState<LocalLeader | null>(null);
  const [nearbyMembers, setNearbyMembers] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    const [leaderResult, membersResult, eventsResult] = await Promise.all([
      supabase
        .from('local_leaders')
        .select('*')
        .eq('constituency', profile.native_constituency || '')
        .maybeSingle(),

      supabase
        .from('profiles')
        .select('*')
        .eq('current_city', profile.current_city || '')
        .eq('status', 'verified')
        .neq('id', profile.id)
        .limit(5),

      supabase
        .from('events')
        .select('*')
        .eq('status', 'upcoming')
        .order('date', { ascending: true })
        .limit(3)
    ]);

    if (leaderResult.data) setLocalLeader(leaderResult.data);
    if (membersResult.data) setNearbyMembers(membersResult.data);
    if (eventsResult.data) setUpcomingEvents(eventsResult.data);

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome, {profile?.full_name}!</h2>
        <p className="text-gray-600">Here's what's happening in your community</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <User className="w-8 h-8 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
              {profile?.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Member Status</p>
          <p className="text-2xl font-bold text-gray-900 capitalize">{profile?.status}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <MapPin className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Your Location</p>
          <p className="text-lg font-bold text-gray-900">{profile?.current_city}, {profile?.current_country}</p>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-cyan-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Native Place</p>
          <p className="text-lg font-bold text-gray-900">{profile?.native_district}, AP</p>
        </div>
      </div>

      {localLeader && (
        <div className="bg-gradient-to-r from-blue-600 to-green-500 text-white p-6 rounded-xl">
          <h3 className="text-xl font-bold mb-4 flex items-center">
            <MapPin className="w-6 h-6 mr-2" />
            Your Local Leader in Andhra Pradesh
          </h3>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-start space-x-4">
              {localLeader.photo && (
                <img
                  src={localLeader.photo}
                  alt={localLeader.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
              )}
              <div className="flex-1">
                <h4 className="text-xl font-bold">{localLeader.name}</h4>
                <p className="text-blue-100 mb-2">{localLeader.designation}</p>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <p>Constituency: {localLeader.constituency}</p>
                  <p>District: {localLeader.district}</p>
                  {localLeader.phone && <p>Phone: {localLeader.phone}</p>}
                  {localLeader.email && <p>Email: {localLeader.email}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {nearbyMembers.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <User className="w-6 h-6 mr-2 text-blue-600" />
            YSRCP Supporters Near You in {profile?.current_city}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {nearbyMembers.map((member) => (
              <div key={member.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    {member.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{member.full_name}</h4>
                    <p className="text-sm text-gray-600">{member.occupation || 'Member'}</p>
                    <p className="text-xs text-blue-600">{member.current_city}, {member.current_country}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-6 h-6 mr-2 text-green-600" />
            Upcoming Events
          </h3>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>{new Date(event.date).toLocaleDateString()}</span>
                      {event.venue && <span>{event.venue}</span>}
                      {event.country && <span>{event.country}</span>}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-200 px-3 py-1 rounded-full">
                    {event.event_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      )}
    </div>
  );
}
