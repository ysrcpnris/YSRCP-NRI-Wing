import { useState, useEffect } from 'react';
import { Calendar, MapPin, Video, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Event } from '../../lib/supabase';

export default function Events() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [myRSVPs, setMyRSVPs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [profile]);

  const fetchEvents = async () => {
    const [eventsResult, rsvpsResult] = await Promise.all([
      supabase
        .from('events')
        .select('*')
        .in('status', ['upcoming', 'ongoing'])
        .order('date', { ascending: true }),

      supabase
        .from('event_rsvps')
        .select('event_id')
        .eq('profile_id', profile?.id || '')
    ]);

    if (eventsResult.data) setEvents(eventsResult.data);
    if (rsvpsResult.data) setMyRSVPs(rsvpsResult.data.map((r) => r.event_id));
    setLoading(false);
  };

  const handleRSVP = async (eventId: string) => {
    const hasRSVP = myRSVPs.includes(eventId);

    if (hasRSVP) {
      await supabase
        .from('event_rsvps')
        .delete()
        .eq('event_id', eventId)
        .eq('profile_id', profile?.id);
    } else {
      await supabase
        .from('event_rsvps')
        .insert({
          event_id: eventId,
          profile_id: profile?.id,
          status: 'yes'
        });
    }

    fetchEvents();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Calendar className="w-8 h-8 mr-3 text-blue-600" />
          Events & Meetings
        </h2>
        <p className="text-gray-600 ml-11">Upcoming community events and virtual meetings</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No upcoming events at this time</p>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map((event) => {
            const hasRSVP = myRSVPs.includes(event.id);
            return (
              <div
                key={event.id}
                className="bg-gradient-to-br from-blue-50 to-green-50 border border-blue-200 p-6 rounded-xl hover:shadow-lg transition"
              >
                {event.banner_image && (
                  <img
                    src={event.banner_image}
                    alt={event.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold capitalize">
                        {event.event_type}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        {event.status}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h3>
                    <p className="text-gray-700 mb-4">{event.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-gray-700">
                    <Calendar className="w-5 h-5 mr-3 text-blue-600" />
                    <div>
                      <p className="font-semibold">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {event.time && <p className="text-sm text-gray-600">{event.time}</p>}
                    </div>
                  </div>

                  {event.venue ? (
                    <div className="flex items-center text-gray-700">
                      <MapPin className="w-5 h-5 mr-3 text-green-600" />
                      <div>
                        <p className="font-semibold">{event.venue}</p>
                        {event.country && <p className="text-sm text-gray-600">{event.country}</p>}
                      </div>
                    </div>
                  ) : event.virtual_link ? (
                    <div className="flex items-center text-gray-700">
                      <Video className="w-5 h-5 mr-3 text-purple-600" />
                      <div>
                        <p className="font-semibold">Virtual Event</p>
                        <p className="text-sm text-gray-600">Online Meeting</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {event.max_attendees && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <Users className="w-5 h-5 mr-2" />
                    <span>Limited to {event.max_attendees} attendees</span>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={() => handleRSVP(event.id)}
                    className={`flex-1 py-3 rounded-lg font-semibold transition ${
                      hasRSVP
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gradient-to-r from-blue-600 to-green-500 text-white hover:shadow-lg'
                    }`}
                  >
                    {hasRSVP ? 'Registered ✓' : 'Register for Event'}
                  </button>
                  {event.virtual_link && hasRSVP && (
                    <a
                      href={event.virtual_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition"
                    >
                      Join Meeting
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
