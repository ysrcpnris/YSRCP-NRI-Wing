import { useEffect, useRef, useState } from "react";
import { Newspaper, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  info: string;
  image_url: string | null;
  created_at?: string;
};

export default function NewsCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (!error && data) setItems(data as NewsItem[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Continuous auto-scroll loop — only runs when there are enough items to scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length <= 1) return;

    const speed = 0.5;

    const step = () => {
      if (!paused && el) {
        el.scrollTop += speed;
        if (el.scrollTop >= el.scrollHeight / 2) {
          el.scrollTop = 0;
        }
      }
      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [items.length, paused]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const displayItems = items.length > 1 ? [...items, ...items] : items;

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border border-white/20">
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-r from-accent-600 via-accent-500 to-primary-500 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="absolute right-4 top-4 text-white/20">
          <Radio size={40} />
        </div>
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Newspaper size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">
              Latest News
            </h3>
            <p className="text-white/70 text-xs">
              Live updates from across the globe
            </p>
          </div>
        </div>
      </div>

      {/* Scrolling list */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="flex-1 overflow-y-hidden p-4 space-y-3 max-h-[420px] bg-gradient-to-b from-gray-50 to-white"
        style={{ scrollbarWidth: "none" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent-200 border-t-accent-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Newspaper size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm italic">No news published yet</p>
          </div>
        ) : (
          displayItems.map((n, idx) => (
            <div
              key={`${n.id}-${idx}`}
              onClick={() => navigate(`/news/${n.id}`)}
              className="group bg-white hover:bg-accent-50/50 border border-gray-100 hover:border-accent-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer flex"
            >
              <div className="w-32 h-32 flex-shrink-0 bg-gray-100 overflow-hidden">
                {n.image_url ? (
                  <img
                    src={n.image_url}
                    alt={n.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Newspaper size={24} className="text-gray-300" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 min-w-0 flex flex-col">
                <h4 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2 mb-1 group-hover:text-accent-700 transition-colors">
                  {n.title}
                </h4>
                <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-2 flex-1">
                  {n.info}
                </p>
                <div className="flex items-center justify-between gap-2">
                  {n.created_at && (
                    <span className="text-[10px] font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                      {formatDate(n.created_at)}
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/news/${n.id}`);
                    }}
                    className="text-[11px] font-semibold text-accent-600 hover:text-accent-700 transition whitespace-nowrap"
                  >
                    Read more →
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
