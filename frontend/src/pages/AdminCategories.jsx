import React, { useEffect, useState } from "react";
import { Tags, Plus, Pencil, Trash2, X } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = editing
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminFetch('/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const openNew = () => { setEditing({}); setForm({ name: '', description: '' }); setFormError(''); };
  const openEdit = (cat) => { setEditing(cat); setForm({ name: cat.name, description: cat.description || '' }); setFormError(''); };

  const submit = async () => {
    if (!form.name.trim()) { setFormError('Category name is required.'); return; }
    try {
      setSubmitting(true);
      if (editing._id) {
        const data = await adminFetch(`/categories/${editing._id}`, { method: 'PUT', body: JSON.stringify(form) });
        setCategories((prev) => prev.map((c) => (c._id === data.category._id ? { ...data.category, productCount: c.productCount } : c)));
        flash('Category updated.');
      } else {
        const data = await adminFetch('/categories', { method: 'POST', body: JSON.stringify(form) });
        setCategories((prev) => [...prev, { ...data.category, productCount: 0 }]);
        flash('Category created.');
      }
      setEditing(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await adminFetch(`/categories/${cat._id}`, { method: 'DELETE' });
      setCategories((prev) => prev.filter((c) => c._id !== cat._id));
      flash('Category deleted.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminSidebarLayout title="Categories">
      <div className="flex justify-between items-center mb-6">
        <p className="text-white/50 text-sm">Product counts match against each listing's category field.</p>
        <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition flex-shrink-0">
          <Plus size={18} /> Add Category
        </button>
      </div>

      {notice && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16">
          <Tags className="mx-auto mb-4 text-white/20" size={48} />
          <p className="text-white/40">No categories yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/10 border-b border-white/20">
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Description</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Products</th>
                <th className="px-4 py-3 text-center font-semibold text-yellow-400 text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat._id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-semibold text-white text-sm">{cat.name}</td>
                  <td className="px-4 py-3 text-white/60 text-sm">{cat.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-0.5 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 text-xs font-bold rounded-full">
                      {cat.productCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => openEdit(cat)} title="Edit" className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => remove(cat)} title="Delete" className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition text-red-400">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-white/20">
            <button onClick={() => setEditing(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={22} />
            </button>
            <h2 className="text-2xl font-bold text-yellow-400 mb-6">{editing._id ? 'Edit Category' : 'Add Category'}</h2>

            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400"
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full h-20 p-3 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:border-yellow-400 resize-none"
                />
              </div>
            </div>

            {formError && <p className="mt-4 text-red-400 text-sm">{formError}</p>}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full mt-6 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}
