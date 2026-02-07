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
export default function ContentControl() {
  /* =====================================================
     ADMIN AUTO AUTH (🔥 VERY IMPORTANT)
  ===================================================== */
  useEffect(() => {
    const ensureAdminAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session) {
        console.log("✅ Admin already authenticated");
        return;
      }

      console.log("🔐 Admin not authenticated. Auto logging in...");

      const { data, error } = await supabase.auth.signInWithPassword({
        email: "admin@yourapp.com",   // 👈 CHANGE IF NEEDED
        password: "Admin@123",        // 👈 CHANGE IF NEEDED
      });

      if (error) {
        console.error("❌ Admin auto-login failed:", error.message);
      } else {
        console.log("✅ Admin auto-login success:", data.user);
      }
    };

    ensureAdminAuth();
  }, []);

  /* =====================================================
     LIVE LINK
  ===================================================== */
  const [liveLink, setLiveLink] = useState("");

  useEffect(() => {
    const fetchLiveLink = async () => {
      const { data, error } = await supabase
        .from("content_live_links")
        .select("live_url")
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Live link fetch error:", error);
        return;
      }

      if (data) setLiveLink(data.live_url);
    };

    fetchLiveLink();
  }, []);

  const saveLiveLink = async () => {
    if (!liveLink.trim()) {
      alert("Live link cannot be empty");
      return;
    }

    const { error } = await supabase
      .from("content_live_links")
      .update({
        live_url: liveLink,
        updated_at: new Date().toISOString(),
      })
      .eq("is_active", true);

    if (error) {
      console.error("Live link save error:", error);
      alert("Failed to save live link");
      return;
    }

    alert("Live link updated successfully");
  };

  /* =====================================================
     GALLERY
  ===================================================== */
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleGalleryUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: auth } = await supabase.auth.getUser();
    console.log("AUTH USER 👉", auth.user);

    if (!auth.user) {
      alert("Admin not authenticated");
      return;
    }

    const ext = file.name.split(".").pop();
    const filePath = `gallery/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery-images")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("GALLERY UPLOAD ERROR 👉", uploadError);
      alert(uploadError.message);
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

    if (dbError) {
      console.error("Gallery DB insert error:", dbError);
      alert("Image uploaded but DB insert failed");
      return;
    }

    fetchGallery();
  };

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

  const deleteGalleryItem = async (id: string) => {
    await supabase.from("gallery_images").delete().eq("id", id);
    setGallery((prev) => prev.filter((g) => g.id !== id));
  };

  /* =====================================================
     BANNERS
  ===================================================== */
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);

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

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleBannerUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      alert("Admin not authenticated");
      return;
    }

    const ext = file.name.split(".").pop();
    const filePath = `banners/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("homepage-banners")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("BANNER UPLOAD ERROR 👉", uploadError);
      alert(uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from("homepage-banners")
      .getPublicUrl(filePath);

    await supabase.from("homepage_banners").insert({
      title: "New Banner",
      image_url: publicUrl.publicUrl,
      is_active: true,
      sort_order: banners.length + 1,
    });

    fetchBanners();
  };

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

  const deleteBanner = async (id: string) => {
    await supabase.from("homepage_banners").delete().eq("id", id);
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  /* =====================================================
     EDIT BANNER MODAL
  ===================================================== */
  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: string | null;
    title: string;
  }>({ open: false, id: null, title: "" });

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
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6">
        CONTENT MANAGEMENT
      </h1>

      <div className="bg-white rounded-xl border shadow p-6">

        {/* LIVE LINK */}
        <h2 className="text-xl font-semibold mb-3">📡 Press Meet Live Link</h2>
        <div className="flex gap-3 mb-6">
          <input
            value={liveLink}
            onChange={(e) => setLiveLink(e.target.value)}
            className="w-full px-3 py-2 border rounded bg-gray-50"
          />
          <button
            onClick={saveLiveLink}
            className="px-5 bg-blue-600 text-white rounded-lg"
          >
            Save
          </button>
        </div>

        {/* GALLERY */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-semibold">🖼 Gallery Images</h2>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="text-blue-600 flex gap-1"
          >
            <ImagePlus size={18} /> Upload
          </button>
          <input
            type="file"
            ref={galleryInputRef}
            hidden
            accept="image/*"
            onChange={handleGalleryUpload}
          />
        </div>

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
        <div className="flex justify-between items-center mt-10">
          <h2 className="text-xl font-semibold">🏠 Homepage Banners</h2>
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="text-blue-600 flex gap-1"
          >
            <Upload size={18} /> Add Banner
          </button>
          <input
            type="file"
            ref={bannerInputRef}
            hidden
            accept="image/*"
            onChange={handleBannerUpload}
          />
        </div>

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
