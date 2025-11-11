import { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Video, Search } from 'lucide-react';

export default function Events() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');

  const events = [
    {
      id: 1,
      title: 'YSRCP NRI Global Meet 2024',
      date: '2024-12-15',
      time: '10:00 AM EST',
      location: 'Virtual (Zoom)',
      type: 'virtual',
      description: 'Annual global meet for all NRI supporters to discuss Andhra Pradesh development initiatives.',
      attendees: 250,
      status: 'upcoming',
      coordinator: 'Global Coordinator',
      image: '/api/placeholder/400/200'
    },
    {
      id: 2,
      title: 'Medical Camp Support - Vijayawada',
      date: '2024-11-20',
      time: '9:00 AM IST',
      location: 'Vijayawada, Andhra Pradesh',
      type: 'physical',
      description: 'Medical camp organized by NRI doctors wing providing free healthcare services.',
      attendees: 150,
      status: 'upcoming',
      coordinator: 'Medical Wing Coordinator',
      image: '/api/placeholder/400/200'
    },
    {
      id: 3,
      title: 'Youth Leadership Summit',
      date: '2024-10-25',
      time: '2:00 PM GMT',
      location: 'London, UK',
      type: 'physical',
      description: 'Leadership development program for young NRIs interested in community service.',
      attendees: 75,
      status: 'upcoming',
      coordinator: 'Youth Wing Coordinator',
      image: '/api/placeholder/400/200'
    },
    {
      id: 4,
      title: 'Digital Campaign Workshop',
      date: '2024-09-15',
      time: '11:00 AM PST',
      location: 'Virtual (Google Meet)',
      type: 'virtual',
      description: 'Workshop on digital campaigning and social media strategies for YSRCP.',
      attendees: 120,
      status: 'past',
      coordinator: 'Media Wing Coordinator',
      image: '/api/placeholder/400/200'
    },
    {
      id: 5,
      title: 'Cultural Festival - USA Chapter',
      date: '2024-08-30',
      time: '6:00 PM EDT',
      location: 'New Jersey, USA',
      type: 'physical',
      description: 'Annual cultural festival celebrating Telugu traditions and Andhra culture.',
      attendees: 300,
      status: 'past',
      coordinator: 'USA State Coordinator',
      image: '/api/placeholder/400/200'
    }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' ||
                         (filterType === 'upcoming' && event.status === 'upcoming') ||
                         (filterType === 'past' && event.status === 'past');

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

//   return (
//     <section id="events" className="py-20 bg-white">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         <div className="text-center mb-16">
//           <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Events & Meetings</h2>
//           <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
//           <p className="text-xl text-gray-600 max-w-3xl mx-auto">
//             Connect with fellow NRIs through virtual meetings, cultural celebrations, and community events worldwide
//           </p>
//         </div>

//         {/* Search and Filter */}
//         <div className="mb-8 flex flex-col md:flex-row gap-4 justify-center">
//           <div className="relative max-w-md">
//             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//             <input
//               type="text"
//               placeholder="Search events..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//             />
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setFilterType('all')}
//               className={`px-6 py-3 rounded-full font-semibold transition ${
//                 filterType === 'all'
//                   ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
//                   : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//               }`}
//             >
//               All Events
//             </button>
//             <button
//               onClick={() => setFilterType('upcoming')}
//               className={`px-6 py-3 rounded-full font-semibold transition ${
//                 filterType === 'upcoming'
//                   ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
//                   : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//               }`}
//             >
//               Upcoming
//             </button>
//             <button
//               onClick={() => setFilterType('past')}
//               className={`px-6 py-3 rounded-full font-semibold transition ${
//                 filterType === 'past'
//                   ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
//                   : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
//               }`}
//             >
//               Past Events
//             </button>
//           </div>
//         </div>

//         {/* Events Grid */}
//         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {filteredEvents.map((event) => (
//             <div
//               key={event.id}
//               className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
//             >
//               <div className="h-48 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
//                 <Calendar className="w-16 h-16 text-blue-600" />
//               </div>

//               <div className="p-6">
//                 <div className="flex items-center justify-between mb-3">
//                   <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
//                     event.status === 'upcoming'
//                       ? 'bg-green-200 text-green-800'
//                       : 'bg-gray-200 text-gray-800'
//                   }`}>
//                     {event.status === 'upcoming' ? 'Upcoming' : 'Past'}
//                   </span>
//                   <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
//                     event.type === 'virtual'
//                       ? 'bg-blue-200 text-blue-800'
//                       : 'bg-purple-200 text-purple-800'
//                   }`}>
//                     {event.type === 'virtual' ? 'Virtual' : 'Physical'}
//                   </span>
//                 </div>

//                 <h3 className="text-xl font-bold text-gray-900 mb-3">{event.title}</h3>

//                 <div className="space-y-2 mb-4">
//                   <div className="flex items-center text-gray-600">
//                     <Calendar className="w-4 h-4 mr-2" />
//                     <span className="text-sm">{formatDate(event.date)}</span>
//                   </div>
//                   <div className="flex items-center text-gray-600">
//                     <Clock className="w-4 h-4 mr-2" />
//                     <span className="text-sm">{event.time}</span>
//                   </div>
//                   <div className="flex items-center text-gray-600">
//                     <MapPin className="w-4 h-4 mr-2" />
//                     <span className="text-sm">{event.location}</span>
//                   </div>
//                   <div className="flex items-center text-gray-600">
//                     <Users className="w-4 h-4 mr-2" />
//                     <span className="text-sm">{event.attendees} attendees</span>
//                   </div>
//                 </div>

//                 <p className="text-gray-600 text-sm mb-4 line-clamp-3">{event.description}</p>

//                 <div className="flex gap-2">
//                   {event.status === 'upcoming' ? (
//                     <>
//                       <button className="flex-1 bg-gradient-to-r from-blue-600 to-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg transition text-sm">
//                         RSVP
//                       </button>
//                       {event.type === 'virtual' && (
//                         <button className="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition">
//                           <Video className="w-5 h-5" />
//                         </button>
//                       )}
//                     </>
//                   ) : (
//                     <button className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 transition text-sm">
//                       View Gallery
//                     </button>
//                   )}
//                 </div>

//                 <div className="mt-3 text-xs text-gray-500">
//                   Coordinator: {event.coordinator}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>

//         {filteredEvents.length === 0 && (
//           <div className="text-center py-12">
//             <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
//             <h3 className="text-xl font-semibold text-gray-600 mb-2">No events found</h3>
//             <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
//           </div>
//         )}

//         {/* Call to Action */}
//         <div className="text-center mt-16">
//           <h3 className="text-2xl font-bold text-gray-900 mb-4">Want to organize an event?</h3>
//           <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
//             Connect with your regional coordinator to organize community events, workshops, or cultural programs.
//           </p>
//           <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg transition">
//             Contact Coordinator
//           </button>
//         </div>
//       </div>
//     </section>
//   );
}
