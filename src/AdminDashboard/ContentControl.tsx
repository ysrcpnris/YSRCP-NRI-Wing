import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Trash,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";

/* =====================================================
   TYPES
===================================================== */
type GalleryItem = {
  id: string;
  url: string;
  visible: boolean;
};

type BannerItem = {
  id: string;
  title: string;
  image: string;
  visible: boolean;
};

/* =====================================================
   COMPONENT
===================================================== */
// Admin interface for managing live links, gallery images, and homepage banners
export default function ContentControl() {
  /* =====================================================
     FEATURE TOGGLES
  ===================================================== */
  const [showStayConnected, setShowStayConnected] = useState<boolean>(true);
  const [togglingStayConnected, setTogglingStayConnected] = useState(false);

  // Fetch toggle state on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "show_stay_connected")
        .maybeSingle();

      if (data) {
        // value is jsonb, could be boolean or "true"/"false" string
        const v = data.value;
        setShowStayConnected(v === true || v === "true");
      }
    })();
  }, []);

  const toggleStayConnected = async () => {
    setTogglingStayConnected(true);
    const newValue = !showStayConnected;
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "show_stay_connected", value: newValue, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) {
      alert("Failed to save toggle: " + error.message);
    } else {
      setShowStayConnected(newValue);
    }
    setTogglingStayConnected(false);
  };

  /* =====================================================
     LIVE LINK
  ===================================================== */
  // Store and manage press meet live broadcast URL
  const [liveLink, setLiveLink] = useState("");
  const [savedLiveLink, setSavedLiveLink] = useState("");   // last value persisted
  const [liveLinkRowId, setLiveLinkRowId] = useState<string | null>(null);
  const [liveSaving, setLiveSaving] = useState(false);
  const [liveMessage, setLiveMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fetch active live link from database on component mount
  useEffect(() => {
    const fetchLiveLink = async () => {
      const { data, error } = await supabase
        .from("content_live_links")
        .select("id, live_url")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Live link fetch error:", error);
        return;
      }

      if (data) {
        setLiveLink(data.live_url || "");
        setSavedLiveLink(data.live_url || "");
        setLiveLinkRowId(data.id);
      }
    };

    fetchLiveLink();
  }, []);

  const isValidLink = (s: string) => {
    if (!s.trim()) return false;
    try {
      const u = new URL(s.trim());
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  // Save (insert if no row, update if existing). Works whether or not a row
  // currently exists — fixes the original bug where Save did nothing on a
  // fresh DB because UPDATE ... WHERE is_active = true matched zero rows.
  const saveLiveLink = async () => {
    setLiveMessage(null);
    const url = liveLink.trim();
    if (!isValidLink(url)) {
      setLiveMessage({ type: "err", text: "Enter a valid http(s) URL." });
      return;
    }
    setLiveSaving(true);
    let error;
    if (liveLinkRowId) {
      ({ error } = await supabase
        .from("content_live_links")
        .update({ live_url: url, is_active: true, updated_at: new Date().toISOString() })
        .eq("id", liveLinkRowId));
    } else {
      const { data, error: insertErr } = await supabase
        .from("content_live_links")
        .insert({ live_url: url, is_active: true })
        .select("id")
        .single();
      error = insertErr;
      if (data?.id) setLiveLinkRowId(data.id);
    }
    setLiveSaving(false);
    if (error) {
      setLiveMessage({ type: "err", text: error.message });
      return;
    }
    setSavedLiveLink(url);
    setLiveMessage({ type: "ok", text: "Live link saved. The LIVE pill will now appear in the navbar." });
  };

  // Clear the live link (deactivate the row). The navbar pill disappears
  // without deleting the row — admin can re-save later to reactivate.
  const clearLiveLink = async () => {
    if (!liveLinkRowId) {
      setLiveLink("");
      setSavedLiveLink("");
      setLiveMessage({ type: "ok", text: "Live link cleared." });
      return;
    }
    if (!confirm("Hide the LIVE pill from the homepage? You can re-enter the link any time.")) {
      return;
    }
    setLiveSaving(true);
    const { error } = await supabase
      .from("content_live_links")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", liveLinkRowId);
    setLiveSaving(false);
    if (error) {
      setLiveMessage({ type: "err", text: error.message });
      return;
    }
    setLiveLink("");
    setSavedLiveLink("");
    setLiveLinkRowId(null);
    setLiveMessage({ type: "ok", text: "Live link cleared. The LIVE pill is now hidden." });
  };

  /* =====================================================
     GALLERY
  ===================================================== */
  // Store gallery images with visibility state
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryMessage, setGalleryMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fetch all gallery images from database
  const fetchGallery = async () => {
    const { data, error } = await supabase
      .from("gallery_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gallery fetch error:", error);
      return;
    }

    setGallery(
      (data || []).map((img: any) => ({
        id: img.id,
        url: img.image_url,
        visible: img.is_active,
      }))
    );
  };

  // Load gallery on component mount
  useEffect(() => {
    fetchGallery();
  }, []);

  const handleGalleryUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGalleryMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setGalleryMessage({ type: "err", text: "Admin not authenticated. Please re-login." });
      return;
    }

    setGalleryUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `gallery/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setGalleryUploading(false);
      setGalleryMessage({ type: "err", text: uploadError.message });
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("gallery-images")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase
      .from("gallery_images")
      .insert({
        image_url: publicUrl.publicUrl,
        is_active: true,
      });

    setGalleryUploading(false);
    if (dbError) {
      setGalleryMessage({ type: "err", text: "Image uploaded but DB insert failed: " + dbError.message });
      return;
    }

    setGalleryMessage({ type: "ok", text: "Image added to gallery." });
    // reset input so the same file can be re-selected if needed
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    fetchGallery();
  };

  // Toggle image visibility without deleting
  const toggleGalleryVisibility = async (id: string, current: boolean) => {
    await supabase
      .from("gallery_images")
      .update({ is_active: !current })
      .eq("id", id);

    setGallery((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, visible: !current } : g
      )
    );
  };

  // Remove gallery image from database
  const deleteGalleryItem = async (id: string) => {
    if (!confirm("Delete this gallery image? This cannot be undone.")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) {
      setGalleryMessage({ type: "err", text: error.message });
      return;
    }
    setGallery((prev) => prev.filter((g) => g.id !== id));
    setGalleryMessage({ type: "ok", text: "Image deleted." });
  };

  /* =====================================================
     BANNERS
  ===================================================== */
  // Store homepage banners with title and visibility state
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fetch all homepage banners from database
  const fetchBanners = async () => {
    const { data, error } = await supabase
      .from("homepage_banners")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Banner fetch error:", error);
      return;
    }

    setBanners(
      (data || []).map((b: any) => ({
        id: b.id,
        title: b.title,
        image: b.image_url,
        visible: b.is_active,
      }))
    );
  };

  // Load banners on component mount
  useEffect(() => {
    fetchBanners();
  }, []);

  const handleBannerUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerMessage(null);

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBannerMessage({ type: "err", text: "Admin not authenticated. Please re-login." });
      return;
    }

    setBannerUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `banners/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("homepage-banners")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setBannerUploading(false);
      setBannerMessage({ type: "err", text: uploadError.message });
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("homepage-banners")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("homepage_banners").insert({
      title: "New Banner",
      image_url: publicUrl.publicUrl,
      is_active: true,
      sort_order: banners.length + 1,
    });

    setBannerUploading(false);
    if (dbError) {
      setBannerMessage({ type: "err", text: "Image uploaded but DB insert failed: " + dbError.message });
      return;
    }

    setBannerMessage({ type: "ok", text: "Banner added. Use the pencil icon to rename it." });
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    fetchBanners();
  };

  // Toggle banner visibility without deleting
  const toggleBannerVisibility = async (id: string, current: boolean) => {
    await supabase
      .from("homepage_banners")
      .update({ is_active: !current })
      .eq("id", id);

    setBanners((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, visible: !current } : b
      )
    );
  };

  // Remove banner from database
  const deleteBanner = async (id: string) => {
    if (!confirm("Delete this banner? This cannot be undone.")) return;
    const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
    if (error) {
      setBannerMessage({ type: "err", text: error.message });
      return;
    }
    setBanners((prev) => prev.filter((b) => b.id !== id));
    setBannerMessage({ type: "ok", text: "Banner deleted." });
  };

  /* =====================================================
     EDIT BANNER MODAL
  ===================================================== */
  // Modal state for editing banner title
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string | null;
    title: string;
  }>({ open: false, id: null, title: "" });

  // Update banner title in database
  const saveBannerTitle = async () => {
    if (!editModal.id) return;

    await supabase
      .from("homepage_banners")
      .update({ title: editModal.title })
      .eq("id", editModal.id);

    fetchBanners();
    setEditModal({ open: false, id: null, title: "" });
  };

  /* =====================================================
     UI
  ===================================================== */
  // Interface with sections for live link, gallery, and banners management
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-primary-600 mb-6">
        CONTENT MANAGEMENT
      </h1>

      {/* HOMEPAGE "STAY CONNECTED" TOGGLE */}
      <div className="bg-white rounded-xl border shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Homepage — Stay Connected Section
            </h2>
            <p className="text-sm text-gray-500">
              When ON, the homepage shows the Notifications & Latest News containers above the Political Journey timeline. When OFF, it falls back to the original Political Journey layout (big card + year buttons).
            </p>
          </div>

          <button
            onClick={toggleStayConnected}
            disabled={togglingStayConnected}
            aria-label="Toggle Stay Connected section"
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors duration-300 ${
              showStayConnected ? "bg-primary-600" : "bg-gray-300"
            } disabled:opacity-60`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-300 ${
                showStayConnected ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <div className="mt-3 text-xs font-semibold">
          Status:{" "}
          <span className={showStayConnected ? "text-green-600" : "text-gray-500"}>
            {showStayConnected ? "● Enabled" : "○ Disabled"}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow p-6">

        {/* LIVE LINK */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <h2 className="text-xl font-semibold">📡 Press Meet Live Link</h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                savedLiveLink
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {savedLiveLink ? "● LIVE pill is visible on homepage" : "Hidden — no link saved"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Paste a YouTube / X / Facebook live URL. Save it and a small "LIVE"
            pill appears in the homepage navbar that opens the stream when
            tapped. Clear it (or hit Clear below) to hide the pill again.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="url"
              value={liveLink}
              onChange={(e) => setLiveLink(e.target.value)}
              placeholder="https://youtube.com/live/abc123"
              className="flex-1 min-w-[220px] px-3 py-2 border rounded bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-400 outline-none"
            />
            <button
              onClick={saveLiveLink}
              disabled={liveSaving || !liveLink.trim() || liveLink.trim() === savedLiveLink}
              className="px-5 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              {liveSaving
                ? "Saving…"
                : savedLiveLink
                ? "Update"
                : "Save"}
            </button>
            {savedLiveLink && (
              <button
                onClick={clearLiveLink}
                disabled={liveSaving}
                className="px-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
          {savedLiveLink && (
            <p className="text-[11px] text-gray-500 mt-1">
              Currently saved:{" "}
              <a
                href={savedLiveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {savedLiveLink}
              </a>
            </p>
          )}
          {liveMessage && (
            <p
              className={`text-xs mt-2 p-2 rounded border ${
                liveMessage.type === "ok"
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {liveMessage.text}
            </p>
          )}
        </div>

        {/* GALLERY */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold">🖼 Gallery Images</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Appear in the homepage scrolling gallery (above the footer).{" "}
              <span className="text-gray-700 font-semibold">
                {gallery.filter((g) => g.visible).length} visible
              </span>{" "}
              · {gallery.length} total
            </p>
          </div>
          <button
            onClick={() => galleryInputRef.current?.click()}
            disabled={galleryUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold disabled:opacity-50"
          >
            <ImagePlus size={16} />
            {galleryUploading ? "Uploading…" : "Upload Image"}
          </button>
          <input
            type="file"
            ref={galleryInputRef}
            hidden
            accept="image/*"
            onChange={handleGalleryUpload}
          />
        </div>
        {galleryMessage && (
          <p
            className={`text-xs mt-2 p-2 rounded border ${
              galleryMessage.type === "ok"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {galleryMessage.text}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {gallery.map((img) => (
            <div key={img.id} className="relative h-36 bg-gray-100 rounded-xl">
              <img src={img.url} className="h-full w-full object-cover" />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() =>
                    toggleGalleryVisibility(img.id, img.visible)
                  }
                >
                  {img.visible ? <Eye /> : <EyeOff />}
                </button>
                <button onClick={() => deleteGalleryItem(img.id)}>
                  <Trash className="text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* BANNERS */}
        <div className="mt-10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold">🏠 Homepage Banners</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Appear in the homepage hero slideshow alongside the default
              banners.{" "}
              <span className="text-gray-700 font-semibold">
                {banners.filter((b) => b.visible).length} visible
              </span>{" "}
              · {banners.length} total
            </p>
          </div>
          <button
            onClick={() => bannerInputRef.current?.click()}
            disabled={bannerUploading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold disabled:opacity-50"
          >
            <Upload size={16} />
            {bannerUploading ? "Uploading…" : "Add Banner"}
          </button>
          <input
            type="file"
            ref={bannerInputRef}
            hidden
            accept="image/*"
            onChange={handleBannerUpload}
          />
        </div>
        {bannerMessage && (
          <p
            className={`text-xs mt-2 p-2 rounded border ${
              bannerMessage.type === "ok"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {bannerMessage.text}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-gray-50 p-4 rounded-xl border">
              <img src={b.image} className="h-32 w-full object-cover rounded" />
              <div className="flex justify-between mt-3">
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {b.visible ? "Visible" : "Hidden"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setEditModal({ open: true, id: b.id, title: b.title })
                    }
                  >
                    <Pencil />
                  </button>
                  <button
                    onClick={() =>
                      toggleBannerVisibility(b.id, b.visible)
                    }
                  >
                    {b.visible ? <Eye /> : <EyeOff />}
                  </button>
                  <button onClick={() => deleteBanner(b.id)}>
                    <Trash className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* EDIT MODAL */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-xl w-96">
              <h2 className="text-lg font-semibold mb-3">
                Edit Banner Title
              </h2>
              <input
                value={editModal.title}
                onChange={(e) =>
                  setEditModal({ ...editModal, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() =>
                    setEditModal({ open: false, id: null, title: "" })
                  }
                >
                  Cancel
                </button>
                <button
                  onClick={saveBannerTitle}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
