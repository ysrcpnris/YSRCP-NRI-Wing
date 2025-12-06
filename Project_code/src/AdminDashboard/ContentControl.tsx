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

export default function ContentControl() {
  const [liveLink, setLiveLink] = useState("");

  const [gallery, setGallery] = useState<
    { id: number; url: string; visible: boolean }[]
  >([]);

  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [banners, setBanners] = useState<
    { id: number; title: string; image: string; visible: boolean }[]
  >([]);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);

  const [editModal, setEditModal] = useState<{
    open: boolean;
    id: number | null;
    title: string;
  }>({ open: false, id: null, title: "" });

  // ---------- LOAD FROM LOCAL STORAGE ----------
  useEffect(() => {
    const savedGallery = localStorage.getItem("gallery_images");
    const savedBanners = localStorage.getItem("home_banners");
    const savedLiveLink = localStorage.getItem("live_link");

    if (savedGallery) setGallery(JSON.parse(savedGallery));
    if (savedBanners) setBanners(JSON.parse(savedBanners));
    if (savedLiveLink) setLiveLink(savedLiveLink);
  }, []);

  // ---------- SAVE TO LOCAL STORAGE ----------
  useEffect(() => {
    localStorage.setItem("gallery_images", JSON.stringify(gallery));
  }, [gallery]);

  useEffect(() => {
    localStorage.setItem("home_banners", JSON.stringify(banners));
  }, [banners]);

  useEffect(() => {
    localStorage.setItem("live_link", liveLink);
  }, [liveLink]);

  // ---------- GALLERY UPLOAD ----------
  const handleGalleryUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newImg = {
        id: Date.now(),
        url: reader.result as string,
        visible: true,
      };

      const updated = [...gallery, newImg];
      setGallery(updated);
    };

    reader.readAsDataURL(file);
  };

  // ---------- BANNER UPLOAD ----------
  const handleBannerUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const newBanner = {
        id: Date.now(),
        title: "New Banner",
        image: reader.result as string,
        visible: true,
      };

      const updated = [...banners, newBanner];
      setBanners(updated);
    };

    reader.readAsDataURL(file);
  };

  // ---------- TOGGLES & DELETE ----------
  const toggleGalleryVisibility = (id: number) => {
    setGallery((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, visible: !img.visible } : img
      )
    );
  };

  const toggleBannerVisibility = (id: number) => {
    setBanners((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, visible: !b.visible } : b
      )
    );
  };

  const deleteGalleryItem = (id: number) => {
    setGallery(gallery.filter((g) => g.id !== id));
  };

  const deleteBanner = (id: number) => {
    setBanners(banners.filter((b) => b.id !== id));
  };

  // ---------- SAVE EDITED TITLE ----------
  const saveBannerTitle = () => {
    setBanners((prev) =>
      prev.map((b) =>
        b.id === editModal.id ? { ...b, title: editModal.title } : b
      )
    );

    setEditModal({ open: false, id: null, title: "" });
  };

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-3xl font-bold text-[#1368d6] mb-6">
        CONTENT MANAGEMENT
      </h1>

      <div className="bg-white rounded-xl border shadow p-6">

        {/* ---------- LIVE LINK ---------- */}
        <h2 className="text-xl font-semibold mb-3">📡 Press Meet Live Link</h2>

        <div className="flex gap-3 mb-6">
          <input
            type="text"
            className="w-full px-3 py-2 border rounded bg-gray-50"
            value={liveLink}
            onChange={(e) => setLiveLink(e.target.value)}
          />

          <button className="px-5 bg-blue-600 text-white rounded-lg">
            Save
          </button>
        </div>

        {/* ---------- GALLERY ---------- */}
        <div className="flex justify-between items-center mt-6">
          <h2 className="text-xl font-semibold">🖼 Gallery Images</h2>

          <button
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <ImagePlus size={18} /> Upload
          </button>

          <input
            type="file"
            ref={galleryInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleGalleryUpload}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {gallery.map((img) => (
            <div
              key={img.id}
              className="relative bg-gray-100 h-36 rounded-xl border overflow-hidden"
            >
              <img src={img.url} className="h-full w-full object-cover" />

              <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => toggleGalleryVisibility(img.id)}>
                  {img.visible ? (
                    <Eye size={20} className="text-white" />
                  ) : (
                    <EyeOff size={20} className="text-gray-300" />
                  )}
                </button>

                <button onClick={() => deleteGalleryItem(img.id)}>
                  <Trash size={20} className="text-red-500 bg-white rounded-full" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- BANNERS ---------- */}
        <div className="flex justify-between items-center mt-10">
          <h2 className="text-xl font-semibold">🏠 Homepage Banners</h2>

          <button
            onClick={() => bannerInputRef.current?.click()}
            className="flex items-center gap-1 text-blue-600 hover:underline"
          >
            <Upload size={18} /> Add Banner
          </button>

          <input
            type="file"
            ref={bannerInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleBannerUpload}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {banners.map((b) => (
            <div key={b.id} className="bg-gray-50 p-4 rounded-xl border shadow">
              <img src={b.image} className="rounded-lg h-32 w-full object-cover" />

              <div className="flex justify-between items-center mt-3">
                <div>
                  <p className="font-semibold">{b.title}</p>
                  <p className="text-xs text-gray-500">
                    {b.visible ? "Visible" : "Hidden"}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setEditModal({
                        open: true,
                        id: b.id,
                        title: b.title,
                      })
                    }
                  >
                    <Pencil size={18} className="text-blue-600" />
                  </button>

                  <button onClick={() => toggleBannerVisibility(b.id)}>
                    {b.visible ? (
                      <Eye size={20} className="text-gray-700" />
                    ) : (
                      <EyeOff size={20} className="text-gray-500" />
                    )}
                  </button>

                  <button onClick={() => deleteBanner(b.id)}>
                    <Trash size={20} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- EDIT MODAL ---------- */}
        {editModal.open && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-96">
              <h2 className="text-lg font-semibold mb-3">Edit Banner Title</h2>

              <input
                type="text"
                value={editModal.title}
                onChange={(e) =>
                  setEditModal({ ...editModal, title: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg"
              />

              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={() =>
                    setEditModal({ open: false, id: null, title: "" })
                  }
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={saveBannerTitle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
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
