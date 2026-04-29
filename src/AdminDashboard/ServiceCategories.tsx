import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Scale,
  Briefcase,
  Users as UsersIcon,
  Loader2,
  RefreshCw,
} from "lucide-react";

// The four parent service types match SERVICE_UI / SERVICE_CONFIG keys in
// the user-facing Dashboard.tsx so the admin labels here line up with what
// users see on the /services tab.
const SERVICE_TYPES = [
  { key: "student", label: "Student Support",  icon: GraduationCap, color: "bg-indigo-100 text-indigo-700" },
  { key: "legal",   label: "Legal Advisor",    icon: Scale,         color: "bg-amber-100 text-amber-700" },
  { key: "career",  label: "Career Coach",     icon: Briefcase,     color: "bg-emerald-100 text-emerald-700" },
  { key: "local",   label: "Local Connector",  icon: UsersIcon,     color: "bg-rose-100 text-rose-700" },
] as const;

type ServiceTypeKey = (typeof SERVICE_TYPES)[number]["key"];

type Category = {
  id: string;
  service_type: ServiceTypeKey;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Option = {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export default function ServiceCategories() {
  const [activeType, setActiveType] = useState<ServiceTypeKey>("student");
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);

  // UI state — which category card is expanded to show its options.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Inline-edit state — `editingCatId` / `editingOptId` is null when not
  // editing; otherwise holds the row id and the draft text.
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatDraft, setEditingCatDraft] = useState("");
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editingOptDraft, setEditingOptDraft] = useState("");

  // "Add new" inputs.
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newOptionDrafts, setNewOptionDrafts] = useState<Record<string, string>>({});

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const showToast = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  // ------------ data load ------------
  const fetchAll = async () => {
    setLoading(true);
    const [{ data: cats, error: cErr }, { data: opts, error: oErr }] = await Promise.all([
      supabase
        .from("service_categories")
        .select("id, service_type, name, sort_order, is_active")
        .order("sort_order", { ascending: true }),
      supabase
        .from("service_options")
        .select("id, category_id, name, sort_order, is_active")
        .order("sort_order", { ascending: true }),
    ]);
    if (cErr) console.error("fetch categories", cErr);
    if (oErr) console.error("fetch options", oErr);
    setCategories((cats || []) as Category[]);
    setOptions((opts || []) as Option[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ------------ derived ------------
  const visibleCats = useMemo(
    () => categories.filter((c) => c.service_type === activeType),
    [categories, activeType]
  );
  const optsByCategory = useMemo(() => {
    const m: Record<string, Option[]> = {};
    for (const o of options) {
      m[o.category_id] ??= [];
      m[o.category_id].push(o);
    }
    return m;
  }, [options]);

  // ------------ category mutations ------------
  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setBusy(true);
    // Pick a sort_order beyond the largest existing for this service.
    const maxOrder =
      visibleCats.reduce((m, c) => Math.max(m, c.sort_order), 0) || 0;
    const { error } = await supabase
      .from("service_categories")
      .insert({
        service_type: activeType,
        name,
        sort_order: maxOrder + 10,
      });
    setBusy(false);
    if (error) {
      console.error(error);
      showToast(
        error.code === "23505"
          ? "Category name already exists for this service"
          : "Could not create category",
        "err"
      );
      return;
    }
    setNewCategoryName("");
    await fetchAll();
    showToast("Category added");
  };

  const startEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatDraft(cat.name);
  };
  const cancelEditCat = () => {
    setEditingCatId(null);
    setEditingCatDraft("");
  };
  const saveEditCat = async () => {
    const name = editingCatDraft.trim();
    if (!editingCatId || !name) return;
    setBusy(true);
    const { error } = await supabase
      .from("service_categories")
      .update({ name })
      .eq("id", editingCatId);
    setBusy(false);
    if (error) {
      console.error(error);
      showToast(
        error.code === "23505" ? "That name is already used here" : "Could not save",
        "err"
      );
      return;
    }
    cancelEditCat();
    await fetchAll();
    showToast("Saved");
  };
  const deleteCategory = async (cat: Category) => {
    if (
      !window.confirm(
        `Delete category "${cat.name}" and all its options? This cannot be undone.`
      )
    )
      return;
    setBusy(true);
    const { error } = await supabase
      .from("service_categories")
      .delete()
      .eq("id", cat.id);
    setBusy(false);
    if (error) {
      console.error(error);
      showToast("Could not delete", "err");
      return;
    }
    await fetchAll();
    showToast("Deleted");
  };

  // ------------ option mutations ------------
  const createOption = async (categoryId: string) => {
    const name = (newOptionDrafts[categoryId] || "").trim();
    if (!name) return;
    setBusy(true);
    const existing = optsByCategory[categoryId] || [];
    const maxOrder = existing.reduce((m, o) => Math.max(m, o.sort_order), 0) || 0;
    const { error } = await supabase.from("service_options").insert({
      category_id: categoryId,
      name,
      sort_order: maxOrder + 10,
    });
    setBusy(false);
    if (error) {
      console.error(error);
      showToast(
        error.code === "23505" ? "Option already exists in this category" : "Could not create option",
        "err"
      );
      return;
    }
    setNewOptionDrafts((d) => ({ ...d, [categoryId]: "" }));
    await fetchAll();
    showToast("Option added");
  };

  const startEditOpt = (opt: Option) => {
    setEditingOptId(opt.id);
    setEditingOptDraft(opt.name);
  };
  const cancelEditOpt = () => {
    setEditingOptId(null);
    setEditingOptDraft("");
  };
  const saveEditOpt = async () => {
    const name = editingOptDraft.trim();
    if (!editingOptId || !name) return;
    setBusy(true);
    const { error } = await supabase
      .from("service_options")
      .update({ name })
      .eq("id", editingOptId);
    setBusy(false);
    if (error) {
      console.error(error);
      showToast(
        error.code === "23505" ? "That option already exists" : "Could not save",
        "err"
      );
      return;
    }
    cancelEditOpt();
    await fetchAll();
    showToast("Saved");
  };
  const deleteOption = async (opt: Option) => {
    if (!window.confirm(`Delete option "${opt.name}"?`)) return;
    setBusy(true);
    const { error } = await supabase.from("service_options").delete().eq("id", opt.id);
    setBusy(false);
    if (error) {
      console.error(error);
      showToast("Could not delete", "err");
      return;
    }
    await fetchAll();
    showToast("Deleted");
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
            Service Categories
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage the categories &amp; options users see on the /services tab.
            Changes appear live in the user dashboard.
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* SERVICE TYPE TABS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        {SERVICE_TYPES.map((s) => {
          const Icon = s.icon;
          const isActive = s.key === activeType;
          const count = categories.filter((c) => c.service_type === s.key).length;
          return (
            <button
              key={s.key}
              onClick={() => setActiveType(s.key)}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition ${
                isActive
                  ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
                  : "bg-white border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{s.label}</p>
                <p className="text-[11px] text-gray-500">{count} {count === 1 ? "category" : "categories"}</p>
              </span>
            </button>
          );
        })}
      </div>

      {/* ADD NEW CATEGORY */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-white border border-gray-200 rounded-xl">
        <Plus size={16} className="text-primary-600 ml-1" />
        <input
          type="text"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createCategory()}
          placeholder={`New category under ${SERVICE_TYPES.find((s) => s.key === activeType)?.label}…`}
          className="flex-1 px-2 py-1.5 text-sm focus:outline-none"
        />
        <button
          onClick={createCategory}
          disabled={busy || !newCategoryName.trim()}
          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700 disabled:opacity-50"
        >
          Add Category
        </button>
      </div>

      {/* CATEGORY LIST */}
      {loading && categories.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading…
        </div>
      ) : visibleCats.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
          No categories yet for this service. Add one above.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleCats.map((cat) => {
            const isOpen = !!expanded[cat.id];
            const opts = optsByCategory[cat.id] || [];
            const isEditing = editingCatId === cat.id;
            return (
              <div
                key={cat.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* category header */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    onClick={() => setExpanded((m) => ({ ...m, [cat.id]: !m[cat.id] }))}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                    aria-label={isOpen ? "Collapse" : "Expand"}
                  >
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingCatDraft}
                      onChange={(e) => setEditingCatDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEditCat();
                        if (e.key === "Escape") cancelEditCat();
                      }}
                      className="flex-1 px-2 py-1 text-sm font-semibold border border-primary-300 rounded outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  ) : (
                    <button
                      onClick={() => setExpanded((m) => ({ ...m, [cat.id]: !m[cat.id] }))}
                      className="flex-1 text-left text-sm font-bold text-gray-900 truncate"
                    >
                      {cat.name}
                    </button>
                  )}

                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {opts.length} {opts.length === 1 ? "option" : "options"}
                  </span>

                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEditCat}
                        disabled={busy || !editingCatDraft.trim()}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={cancelEditCat}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditCat(cat)}
                        className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded"
                        title="Rename"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>

                {/* options panel */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-3 bg-gray-50/40 space-y-2">
                    {opts.length === 0 && (
                      <p className="text-[11px] text-gray-500 italic px-1 pb-1">
                        No options yet. Add one below.
                      </p>
                    )}

                    {opts.map((opt) => {
                      const isOptEditing = editingOptId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center gap-2 px-2 py-1.5 bg-white border border-gray-200 rounded-lg"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />

                          {isOptEditing ? (
                            <input
                              autoFocus
                              value={editingOptDraft}
                              onChange={(e) => setEditingOptDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveEditOpt();
                                if (e.key === "Escape") cancelEditOpt();
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded outline-none focus:ring-2 focus:ring-primary-200"
                            />
                          ) : (
                            <span className="flex-1 text-sm text-gray-800 truncate">
                              {opt.name}
                            </span>
                          )}

                          {isOptEditing ? (
                            <>
                              <button
                                onClick={saveEditOpt}
                                disabled={busy || !editingOptDraft.trim()}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded disabled:opacity-50"
                                title="Save"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEditOpt}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                                title="Cancel"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditOpt(opt)}
                                className="p-1 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded"
                                title="Rename"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => deleteOption(opt)}
                                className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* add option row */}
                    <div className="flex items-center gap-2 mt-1">
                      <Plus size={14} className="text-emerald-600 ml-1" />
                      <input
                        type="text"
                        value={newOptionDrafts[cat.id] || ""}
                        onChange={(e) =>
                          setNewOptionDrafts((d) => ({ ...d, [cat.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && createOption(cat.id)}
                        placeholder={`New option under "${cat.name}"…`}
                        className="flex-1 px-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                      <button
                        onClick={() => createOption(cat.id)}
                        disabled={busy || !(newOptionDrafts[cat.id] || "").trim()}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full shadow-lg text-xs font-bold z-50 ${
            toast.tone === "ok"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
