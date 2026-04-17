import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { supabase } from "../lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  info: string;
  image_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type Props = {
  setAuthMode: (mode: "signin" | "signup") => void;
  setShowAuthModal: (value: boolean) => void;
};

export default function NewsDetail({ setAuthMode, setShowAuthModal }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("news")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!mounted) return;
      if (!error && data) setItem(data as NewsItem);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      <Header
        onSignUp={() => {
          setAuthMode("signup");
          setShowAuthModal(true);
        }}
      />

      <section className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/40 to-gray-50 py-24 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6 transition"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>

          {loading ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : !item ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-card">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">News not found</h1>
              <p className="text-gray-500">This article may have been removed or doesn't exist.</p>
            </div>
          ) : (
            <article className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col md:flex-row">
              {item.image_url && (
                <div className="md:w-2/5 flex-shrink-0">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-56 md:h-full object-cover"
                  />
                </div>
              )}

              <div className={`p-6 sm:p-8 md:p-10 ${item.image_url ? "md:w-3/5" : "w-full"}`}>
                {item.created_at && (
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
                    {formatDate(item.created_at)}
                  </p>
                )}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
                  {item.title}
                </h1>
                <div className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {item.info}
                </div>
              </div>
            </article>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}
