import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "react-toastify";

type NewsItem = {
  id: string;
  title: string;
  info: string;
  image_url: string | null;
  created_at?: string;
};

export default function News() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);

  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch news error:", error);
      return;
    }
    setItems(data || []);
  };

  const openModal = (item?: NewsItem) => {
    setEditItem(item || null);
    setTitle(item?.title || "");
    setInfo(item?.info || "");
    setExistingImageUrl(item?.image_url || null);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setTitle("");
    setInfo("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("news-images")
      .upload(path, file, { upsert: false });

    if (error) {
      console.error("Upload error:", error);
      toast.error("Image upload failed");
      return null;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveNews = async () => {
    if (!title.trim() || !info.trim()) {
      toast.error("Title and info are required");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = existingImageUrl;

      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      if (editItem) {
        const { error } = await supabase
          .from("news")
          .update({ title, info, image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq("id", editItem.id);
        if (error) throw error;
        toast.success("News updated");
      } else {
        const { error } = await supabase
          .from("news")
          .insert({ title, info, image_url: imageUrl });
        if (error) throw error;
        toast.success("News created");
      }

      closeModal();
      fetchNews();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteNews = async (id: string) => {
    if (!confirm("Delete this news item?")) return;
    const { error } = await supabase.from("news").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    toast.success("News deleted");
    fetchNews();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-primary-600">News Management</h1>
          <p className="text-gray-500 mt-1">
            Create, edit, and delete news articles visible on the homepage.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg shadow flex gap-2 items-center transition"
        >
          <Plus size={18} /> New News
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((n) => (
          <div
            key={n.id}
            className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
          >
            {n.image_url ? (
              <img
                src={n.image_url}
                alt={n.title}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}

            <div className="p-4 flex-1 flex flex-col">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                {n.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-3 mb-3 flex-1">
                {n.info}
              </p>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <button
                  onClick={() => openModal(n)}
                  className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  <Edit3 size={14} /> Edit
                </button>
                <button
                  onClick={() => deleteNews(n.id)}
                  className="flex items-center gap-1.5 text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          No news articles created yet.
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-5">
              {editItem ? "Edit News" : "Create News"}
            </h3>

            {/* Image */}
            <div className="mb-4">
              <label className="input-label">Image</label>
              <div className="flex items-center gap-3">
                {(imagePreview || existingImageUrl) && (
                  <img
                    src={imagePreview || existingImageUrl || ""}
                    alt="preview"
                    className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Upload size={16} />
                  {imagePreview || existingImageUrl ? "Change image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </label>
              </div>
            </div>

            <div className="mb-4">
              <label className="input-label">Title</label>
              <input
                className="input-field"
                placeholder="News headline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="mb-5">
              <label className="input-label">Info</label>
              <textarea
                className="input-field"
                placeholder="News content"
                rows={5}
                value={info}
                onChange={(e) => setInfo(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveNews}
                disabled={saving}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
