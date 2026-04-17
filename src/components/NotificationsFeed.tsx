import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";

type Notification = {
  id: string;
  title: string;
  info: string;
  status: "Draft" | "Sent";
  created_at?: string;
};

export default function NotificationsFeed() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, info, status, created_at")
        .eq("status", "Sent")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!mounted) return;

      if (!error && data) {
        setItems(data as Notification[]);
      }
      setLoading(false);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

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

  return (
    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full border border-white/20">
      {/* Header */}
      <div className="relative px-6 py-5 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bell size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">
              Notifications & Updates
            </h3>
            <p className="text-white/70 text-xs">
              Stay informed with the latest announcements
            </p>
          </div>
        </div>
      </div>

      {/* Body — scrollable list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] bg-gradient-to-b from-gray-50 to-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm italic">No notifications yet</p>
          </div>
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className="group bg-white hover:bg-primary-50/50 border border-gray-100 hover:border-primary-200 rounded-xl p-4 transition-all duration-200 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-accent-500 mt-2 group-hover:scale-150 transition-transform" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-gray-900 font-semibold text-sm leading-snug line-clamp-2">
                      {n.title}
                    </h4>
                  </div>
                  <p className="text-gray-600 text-xs leading-relaxed line-clamp-2 mb-2">
                    {n.info}
                  </p>
                  {n.created_at && (
                    <span className="inline-block text-[10px] font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {formatDate(n.created_at)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
