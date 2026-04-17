import { useState } from 'react';
import { Calendar, User, Search, ExternalLink, Eye } from 'lucide-react';

export default function News() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const newsItems = [
    {
      id: 1,
      title: 'YSRCP NRI Wing Launches New Digital Campaign Platform',
      excerpt: 'A comprehensive digital platform to connect NRIs worldwide and amplify YSRCP\'s message globally.',
      content: 'The YSRCP NRI Wing has launched an innovative digital campaign platform that will enable Non-Resident Indians to actively participate in political campaigns, share resources, and coordinate with local chapters worldwide.',
      date: '2024-10-15',
      author: 'YSRCP NRI Media Team',
      category: 'announcement',
      image: '/api/placeholder/400/200',
      readTime: '3 min read',
      views: 1250
    },
    {
      id: 2,
      title: 'Medical Camp Success: 500+ Patients Served in Vijayawada',
      excerpt: 'NRI doctors from USA and UK chapters organized a successful medical camp in Vijayawada.',
      content: 'Over 500 patients received free medical consultations and treatments during the three-day medical camp organized by NRI doctors from the USA and UK chapters. The camp included specialists in cardiology, orthopedics, and general medicine.',
      date: '2024-10-10',
      author: 'Medical Wing Coordinator',
      category: 'event',
      image: '/api/placeholder/400/200',
      readTime: '4 min read',
      views: 890
    },
    {
      id: 3,
      title: 'Youth Leadership Program Applications Now Open',
      excerpt: 'Applications are now open for the YSRCP NRI Youth Leadership Development Program 2025.',
      content: 'The YSRCP NRI Wing is excited to announce that applications are now open for the prestigious Youth Leadership Development Program. This year-long program will train young NRIs in leadership, community service, and political engagement.',
      date: '2024-10-08',
      author: 'Youth Wing Coordinator',
      category: 'program',
      image: '/api/placeholder/400/200',
      readTime: '2 min read',
      views: 675
    },
    {
      id: 4,
      title: 'Global NRI Meet 2024: Key Highlights and Outcomes',
      excerpt: 'Summary of discussions and decisions from the annual Global NRI Meet held in Hyderabad.',
      content: 'The annual Global NRI Meet brought together over 200 representatives from 25 countries. Key outcomes include new initiatives for digital campaigning, expanded medical services, and enhanced coordination between international chapters.',
      date: '2024-09-28',
      author: 'Global Coordinator',
      category: 'meeting',
      image: '/api/placeholder/400/200',
      readTime: '6 min read',
      views: 1540
    },
    {
      id: 5,
      title: 'New Partnership with International Universities',
      excerpt: 'YSRCP NRI Wing partners with universities in USA and Canada for student exchange programs.',
      content: 'The YSRCP NRI Wing has established partnerships with leading universities in the USA and Canada to facilitate student exchange programs, research collaborations, and cultural exchange initiatives.',
      date: '2024-09-20',
      author: 'Education Wing Coordinator',
      category: 'partnership',
      image: '/api/placeholder/400/200',
      readTime: '3 min read',
      views: 720
    },
    {
      id: 6,
      title: 'Volunteer Recruitment Drive Successful',
      excerpt: 'Over 300 new volunteers join the YSRCP NRI network across different wings.',
      content: 'The recent volunteer recruitment drive has been highly successful, with over 300 new volunteers joining various wings including Media, Technology, Medical, and Youth wings. The new volunteers bring diverse skills and experiences from around the world.',
      date: '2024-09-15',
      author: 'Volunteer Coordinator',
      category: 'achievement',
      image: '/api/placeholder/400/200',
      readTime: '2 min read',
      views: 580
    }
  ];

  const categories = [
    { id: 'all', name: 'All News', count: newsItems.length },
    { id: 'announcement', name: 'Announcements', count: newsItems.filter(item => item.category === 'announcement').length },
    { id: 'event', name: 'Events', count: newsItems.filter(item => item.category === 'event').length },
    { id: 'program', name: 'Programs', count: newsItems.filter(item => item.category === 'program').length },
    { id: 'meeting', name: 'Meetings', count: newsItems.filter(item => item.category === 'meeting').length },
    { id: 'partnership', name: 'Partnerships', count: newsItems.filter(item => item.category === 'partnership').length },
    { id: 'achievement', name: 'Achievements', count: newsItems.filter(item => item.category === 'achievement').length }
  ];

  const filteredNews = newsItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      announcement: 'bg-blue-100 text-blue-800',
      event: 'bg-green-100 text-green-800',
      program: 'bg-purple-100 text-purple-800',
      meeting: 'bg-orange-100 text-orange-800',
      partnership: 'bg-indigo-100 text-indigo-800',
      achievement: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // return (
  //   <section id="news" className="py-20 bg-gray-50">
  //     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  //       <div className="text-center mb-16">
  //         <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">News & Updates</h2>
  //         <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
  //         <p className="text-xl text-gray-600 max-w-3xl mx-auto">
  //           Stay informed with the latest news, announcements, and updates from the YSRCP NRI Wing
  //         </p>
  //       </div>

  //       {/* Search and Filters */}
  //       <div className="mb-8">
  //         <div className="flex flex-col md:flex-row gap-4 justify-center mb-6">
  //           <div className="relative max-w-md">
  //             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
  //             <input
  //               type="text"
  //               placeholder="Search news..."
  //               value={searchTerm}
  //               onChange={(e) => setSearchTerm(e.target.value)}
  //               className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  //             />
  //           </div>
  //         </div>

  //         {/* Category Filters */}
  //         <div className="flex flex-wrap justify-center gap-2">
  //           {categories.map((category) => (
  //             <button
  //               key={category.id}
  //               onClick={() => setSelectedCategory(category.id)}
  //               className={`px-4 py-2 rounded-full font-semibold transition ${
  //                 selectedCategory === category.id
  //                   ? 'bg-gradient-to-r from-blue-600 to-green-500 text-white'
  //                   : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
  //               }`}
  //             >
  //               {category.name} ({category.count})
  //             </button>
  //           ))}
  //         </div>
  //       </div>

  //       {/* News Grid */}
  //       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  //         {filteredNews.map((item) => (
  //           <article
  //             key={item.id}
  //             className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
  //           >
  //             <div className="h-48 bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center">
  //               <Calendar className="w-16 h-16 text-primary-600" />
  //             </div>

  //             <div className="p-6">
  //               <div className="flex items-center justify-between mb-3">
  //                 <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getCategoryColor(item.category)}`}>
  //                   {categories.find(cat => cat.id === item.category)?.name}
  //                 </span>
  //                 <div className="flex items-center text-gray-500 text-sm">
  //                   <Eye className="w-4 h-4 mr-1" />
  //                   {item.views}
  //                 </div>
  //               </div>

  //               <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{item.title}</h3>
  //               <p className="text-gray-600 mb-4 line-clamp-3">{item.excerpt}</p>

  //               <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
  //                 <div className="flex items-center">
  //                   <User className="w-4 h-4 mr-1" />
  //                   <span>{item.author}</span>
  //                 </div>
  //                 <div className="flex items-center">
  //                   <Calendar className="w-4 h-4 mr-1" />
  //                   <span>{formatDate(item.date)}</span>
  //                 </div>
  //               </div>

  //               <div className="flex items-center justify-between">
  //                 <span className="text-sm text-gray-500">{item.readTime}</span>
  //                 <button className="flex items-center text-primary-600 hover:text-blue-800 font-semibold transition">
  //                   Read More
  //                   <ExternalLink className="w-4 h-4 ml-1" />
  //                 </button>
  //               </div>
  //             </div>
  //           </article>
  //         ))}
  //       </div>

  //       {filteredNews.length === 0 && (
  //         <div className="text-center py-12">
  //           <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
  //           <h3 className="text-xl font-semibold text-gray-600 mb-2">No news found</h3>
  //           <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
  //         </div>
  //       )}

  //       {/* Newsletter Signup */}
  //       <div className="mt-16 bg-white rounded-2xl p-8 shadow-lg">
  //         <div className="text-center">
  //           <h3 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated</h3>
  //           <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
  //             Subscribe to our newsletter to receive the latest news, event updates, and announcements directly in your inbox.
  //           </p>
  //           <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
  //             <input
  //               type="email"
  //               placeholder="Enter your email"
  //               className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
  //             />
  //             <button className="bg-gradient-to-r from-blue-600 to-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition">
  //               Subscribe
  //             </button>
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   </section>
  // );
}
