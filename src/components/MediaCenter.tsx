import { useEffect, useState } from 'react';
import { Calendar, Image, Video, Bell } from 'lucide-react';
import { supabase, NewsArticle } from '../lib/supabase';

export default function MediaCenter() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from('news_articles')
      .select('*')
      .eq('published', true)
      .order('published_at', { ascending: false })
      .limit(3);

    if (!error && data) {
      setNews(data);
    }
    setLoading(false);
  };

  const defaultNews = [
    {
      id: '1',
      title: 'YSRCP NRI Wing Launches Global Mentorship Program',
      excerpt: 'New initiative connects students in AP with successful NRI professionals for career guidance and support.',
      featured_image: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=600',
      published_at: '2025-10-05',
      category: 'announcement'
    },
    {
      id: '2',
      title: 'Record Participation in Virtual Town Hall Meeting',
      excerpt: 'Over 5,000 NRIs joined the recent virtual town hall to discuss development initiatives in Andhra Pradesh.',
      featured_image: 'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=600',
      published_at: '2025-09-28',
      category: 'news'
    },
    {
      id: '3',
      title: 'Job Fair Success: 200+ Placements Facilitated',
      excerpt: 'NRI Wing job assistance program helps connect talented youth from AP with international opportunities.',
      featured_image: 'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600',
      published_at: '2025-09-20',
      category: 'news'
    }
  ];

  const displayNews = news.length > 0 ? news : defaultNews;

  return (
    <section id="media" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Media Center</h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Latest news, updates, and stories from our global community
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {loading ? (
            <div className="col-span-3 text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            displayNews.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                <img
                  src={article.featured_image || 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=600'}
                  alt={article.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(article.published_at || '').toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">{article.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
                  <button className="text-blue-600 font-semibold hover:text-blue-700 transition">
                    Read More →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Photo Gallery</h3>
            <p className="text-gray-600 mb-4">Browse through our collection of event photos and memorable moments</p>
            <button className="text-blue-600 font-semibold hover:text-blue-700 transition">
              View Gallery →
            </button>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Video Library</h3>
            <p className="text-gray-600 mb-4">Watch recordings of events, meetings, and important announcements</p>
            <button className="text-green-600 font-semibold hover:text-green-700 transition">
              Watch Videos →
            </button>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-8 rounded-xl text-center hover:shadow-lg transition-all duration-300">
            <div className="w-16 h-16 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Newsletter</h3>
            <p className="text-gray-600 mb-4">Subscribe to receive regular updates and news directly in your inbox</p>
            <button className="text-cyan-600 font-semibold hover:text-cyan-700 transition">
              Subscribe →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
