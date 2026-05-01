import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Youtube,
  RefreshCw,
} from "lucide-react";

/* ======================================================================
   FEATURED VIDEOS — admin CRUD for the home-page "Jagan Anna On Air"
   section. Replaces the runtime YouTube Data API fetch with an
   admin-curated list stored in `public.youtube_videos`.
====================================================================== */

type Row = {
  video_id: string;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  published_at: string | null;
  video_url: string | null;
  channel_id: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

// ---------------------------------------------------------------------
// Parse a YouTube URL into its 11-character video ID. Supports the
// common formats users actually paste:
//   • https://www.youtube.com/watch?v=ID
//   • https://youtu.be/ID
//   • https://www.youtube.com/shorts/ID
//   • https://www.youtube.com/embed/ID
//   • https://www.youtube.com/live/ID
// Returns null if no valid ID can be extracted.
// ---------------------------------------------------------------------
const extractVideoId = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Bare 11-char ID pasted directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v");
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  return null;
};

// ---------------------------------------------------------------------
// Fetch title + thumbnail for any public YouTube video without needing
// an API key. We try YouTube's own oEmbed first; if the browser blocks
// it (some networks / regions strip the CORS header), we fall back to
// noembed.com — a well-known oEmbed proxy that returns the same shape
// with permissive CORS. If both fail we return null and the caller
// uses a deterministic thumbnail derived from the video ID.
// ---------------------------------------------------------------------
type Oembed = { title?: string; thumbnail_url?: string; author_name?: string };
const fetchOembed = async (videoUrl: string): Promise<Oembed | null> => {
  // 1. Native YouTube oEmbed
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
    );
    if (res.ok) return (await res.json()) as Oembed;
  } catch {
    /* fall through */
  }
  // 2. noembed.com proxy (permissive CORS, free, no key)
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`
    );
    if (res.ok) return (await res.json()) as Oembed;
  } catch {
    /* fall through */
  }
  return null;
};

// Fallback thumbnail URL (always works for public videos, no API call).
// Uses i.ytimg.com (YouTube's canonical thumbnail CDN) so the URL matches
// the site's `img-src https://*.ytimg.com` CSP directive — img.youtube.com
// would be blocked by the same policy.
const thumbForId = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Normalize any thumbnail URL that came back from oEmbed or was already
// stored in the DB so it always uses the i.ytimg.com host (matches CSP).
const normalizeThumb = (u: string | null | undefined): string =>
  (u || "").replace(/^https?:\/\/img\.youtube\.com\//, "https://i.ytimg.com/");

export default function FeaturedVideos() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Add-video form state
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [titleManualOverride, setTitleManualOverride] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [previewThumb, setPreviewThumb] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    void loadVideos();
  }, []);

  const loadVideos = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("youtube_videos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  // -------------------------------------------------------------------
  // Live preview as the admin types / pastes a YouTube URL. Title and
  // thumbnail are fetched automatically — admin doesn't need to type
  // anything beyond the URL itself.
  // -------------------------------------------------------------------
  useEffect(() => {
    const id = extractVideoId(urlInput);
    if (!id) {
      setPreviewVideoId(null);
      setPreviewThumb(null);
      // A fresh URL paste resets any manual title override from the
      // previous attempt so auto-fill can take over again.
      setTitleManualOverride(false);
      setTitleInput("");
      return;
    }
    setPreviewVideoId(id);
    setPreviewThumb(thumbForId(id));
    setPreviewLoading(true);
    void fetchOembed(`https://www.youtube.com/watch?v=${id}`).then((meta) => {
      setPreviewLoading(false);
      if (meta?.thumbnail_url) setPreviewThumb(normalizeThumb(meta.thumbnail_url));
      // Don't clobber the title if admin already overrode it manually.
      if (!titleManualOverride) {
        setTitleInput(meta?.title || `Video ${id}`);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlInput]);

  const resetForm = () => {
    setUrlInput("");
    setTitleInput("");
    setTitleManualOverride(false);
    setEditingTitle(false);
    setPreviewThumb(null);
    setPreviewVideoId(null);
  };

  const addVideo = async () => {
    if (!previewVideoId) {
      alert("Paste a valid YouTube link first.");
      return;
    }
    if (rows.some((r) => r.video_id === previewVideoId)) {
      alert("This video is already in the list.");
      return;
    }
    setAdding(true);
    const nextSort =
      rows.length > 0 ? Math.max(...rows.map((r) => r.sort_order ?? 0)) + 1 : 0;
    const insertRow: Row = {
      video_id: previewVideoId,
      title: titleInput.trim() || "Untitled",
      description: null,
      thumbnail_url: previewThumb || thumbForId(previewVideoId),
      published_at: new Date().toISOString(),
      video_url: `https://www.youtube.com/watch?v=${previewVideoId}`,
      channel_id: null,
      sort_order: nextSort,
      is_active: true,
    };
    const { error } = await supabase.from("youtube_videos").insert(insertRow);
    setAdding(false);
    if (error) {
      alert("Failed to add: " + error.message);
      return;
    }
    resetForm();
    void loadVideos();
  };

  const removeVideo = async (videoId: string) => {
    if (!confirm("Remove this video from the home page?")) return;
    const { error } = await supabase
      .from("youtube_videos")
      .delete()
      .eq("video_id", videoId);
    if (error) {
      alert("Failed to remove: " + error.message);
      return;
    }
    void loadVideos();
  };

  const toggleActive = async (row: Row) => {
    const { error } = await supabase
      .from("youtube_videos")
      .update({ is_active: !row.is_active })
      .eq("video_id", row.video_id);
    if (error) {
      alert("Failed to update: " + error.message);
      return;
    }
    void loadVideos();
  };

  const moveRow = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const a = rows[index];
    const b = rows[target];
    // Swap their sort_order values.
    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    const { error: e1 } = await supabase
      .from("youtube_videos")
      .update({ sort_order: bOrder })
      .eq("video_id", a.video_id);
    const { error: e2 } = await supabase
      .from("youtube_videos")
      .update({ sort_order: aOrder })
      .eq("video_id", b.video_id);
    if (e1 || e2) {
      alert("Failed to reorder: " + (e1?.message || e2?.message));
    }
    void loadVideos();
  };

  const activeCount  = useMemo(() => rows.filter((r) => r.is_active).length, [rows]);
  const hiddenCount  = rows.length - activeCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin mr-2" />
        Loading videos…
      </div>
    );
  }
  if (err) {
    return (
      <div className="m-6 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
        Failed to load: {err}
      </div>
    );
  }

  return (
    <div className="py-4 md:py-6 px-2 md:px-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-primary-700 flex items-center gap-2">
            <Youtube size={22} className="text-red-600" />
            Featured Videos — Jagan Anna On Air
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Paste any YouTube link below. Title and thumbnail are filled in automatically.
            These videos appear on the home page in the order shown here.
          </p>
        </div>
        <button
          onClick={() => void loadVideos()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
        <div className="px-3 py-2 rounded-lg border bg-emerald-50 text-emerald-700 border-emerald-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Active</div>
          <div className="text-lg font-bold">{activeCount}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border bg-gray-50 text-gray-700 border-gray-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Hidden</div>
          <div className="text-lg font-bold">{hiddenCount}</div>
        </div>
        <div className="px-3 py-2 rounded-lg border bg-sky-50 text-sky-700 border-sky-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Total</div>
          <div className="text-lg font-bold">{rows.length}</div>
        </div>
      </div>

      {/* ADD FORM */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-primary-600" />
          Add a video
        </h3>
        <p className="text-[11px] text-gray-500 mb-3">
          Paste any YouTube link and we'll fetch the title and thumbnail for you. No
          API key needed.
        </p>

        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              YouTube link
            </label>
            <input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={addVideo}
            disabled={!previewVideoId || adding || previewLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {adding ? "Adding…" : "Add video"}
          </button>
        </div>

        {/* PREVIEW (auto-fetched) */}
        {previewVideoId && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <img
              src={previewThumb || thumbForId(previewVideoId)}
              alt="preview"
              className="w-28 h-16 object-cover rounded-md border border-gray-200 shrink-0"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = thumbForId(previewVideoId);
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
                {previewLoading
                  ? "Fetching title…"
                  : titleManualOverride
                  ? "Title (edited)"
                  : "Title (auto-filled)"}
              </div>
              {editingTitle ? (
                <input
                  autoFocus
                  type="text"
                  value={titleInput}
                  onChange={(e) => {
                    setTitleInput(e.target.value);
                    setTitleManualOverride(true);
                  }}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") setEditingTitle(false);
                  }}
                  className="w-full text-xs font-semibold text-gray-800 border border-primary-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  className="text-xs font-semibold text-gray-800 hover:text-primary-700 hover:underline truncate text-left w-full"
                  title="Click to edit"
                >
                  {titleInput || (previewLoading ? "…" : `Video ${previewVideoId}`)}
                </button>
              )}
              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                Video ID: {previewVideoId}
              </div>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${previewVideoId}`}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] inline-flex items-center gap-1 text-primary-600 hover:underline shrink-0"
            >
              <ExternalLink size={11} /> Open
            </a>
          </div>
        )}
      </div>

      {/* VIDEO LIST */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            {rows.length} {rows.length === 1 ? "video" : "videos"}
          </p>
        </div>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            No videos yet. Paste a YouTube link above to add the first one.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rows.map((row, idx) => (
              <li
                key={row.video_id}
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  row.is_active ? "" : "bg-gray-50 opacity-60"
                }`}
              >
                {/* Order arrows */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => void moveRow(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    onClick={() => void moveRow(idx, 1)}
                    disabled={idx === rows.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Move down"
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>

                {/* Thumbnail */}
                <a
                  href={row.video_url || `https://www.youtube.com/watch?v=${row.video_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0"
                >
                  <img
                    src={normalizeThumb(row.thumbnail_url) || thumbForId(row.video_id)}
                    alt={row.title || "video"}
                    className="w-32 h-18 object-cover rounded-md border border-gray-200"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = thumbForId(row.video_id);
                    }}
                  />
                </a>

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {row.title || "Untitled"}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate">
                    {row.video_id}
                    {row.published_at &&
                      ` · added ${new Date(row.published_at).toLocaleDateString()}`}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <a
                    href={row.video_url || `https://www.youtube.com/watch?v=${row.video_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-gray-500 hover:text-primary-700 hover:bg-primary-50"
                    title="Open on YouTube"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => void toggleActive(row)}
                    className={`p-2 rounded-lg transition ${
                      row.is_active
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-gray-400 hover:bg-gray-100"
                    }`}
                    title={row.is_active ? "Hide from home page" : "Show on home page"}
                  >
                    {row.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => void removeVideo(row.video_id)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    title="Remove permanently"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
