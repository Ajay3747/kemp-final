import React, { useEffect, useState } from "react";
import { Search, Eye, Trash2, RotateCcw, Package, X, User, Mail } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import { adminFetch } from "../utils/adminApi";

const AVAILABILITY_STYLES = {
  AVAILABLE: 'bg-green-500/20 border-green-500/50 text-green-300',
  RESERVED: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  SOLD: 'bg-white/10 border-white/20 text-white/60'
};

const CATEGORIES = ["All", "Books", "Gadgets", "Notes", "Courses", "Music", "Electronics", "Apparel", "Sports", "Furniture", "Dorm Essentials", "Services", "Other"];

export default function AdminListings() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("active");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [viewProduct, setViewProduct] = useState(null);

  useEffect(() => { fetchProducts(); }, [category, statusFilter, availabilityFilter]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (category !== 'All') params.set('category', category);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (availabilityFilter !== 'all') params.set('availability', availabilityFilter);
      const data = await adminFetch(`/products?${params.toString()}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3000); };

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.title?.toLowerCase().includes(q) || p.sellerName?.toLowerCase().includes(q);
  });

  const removeListing = async (product) => {
    if (!window.confirm(`Remove "${product.title}" from the marketplace?`)) return;
    try {
      const data = await adminFetch(`/products/${product._id}/remove`, { method: 'PATCH' });
      setProducts((prev) => prev.map((p) => (p._id === data.product._id ? data.product : p)));
      flash('Listing removed.');
    } catch (err) {
      setError(err.message);
    }
  };

  const restoreListing = async (product) => {
    try {
      const data = await adminFetch(`/products/${product._id}/restore`, { method: 'PATCH' });
      setProducts((prev) => prev.map((p) => (p._id === data.product._id ? data.product : p)));
      flash('Listing restored.');
    } catch (err) {
      setError(err.message);
    }
  };

  const setAvailability = async (product, status) => {
    try {
      const data = await adminFetch(`/products/${product._id}/availability`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setProducts((prev) => prev.map((p) => (p._id === data.product._id ? data.product : p)));
      setViewProduct((prev) => (prev && prev._id === data.product._id ? data.product : prev));
      flash('Availability updated.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AdminSidebarLayout title="Listings Management">
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by title or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2.5 rounded-lg bg-gray-800 border border-white/20 text-white focus:outline-none focus:border-yellow-400">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="px-4 py-2.5 rounded-lg bg-gray-800 border border-white/20 text-white focus:outline-none focus:border-yellow-400">
          <option value="all">All Availability</option>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="SOLD">Sold</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg bg-gray-800 border border-white/20 text-white focus:outline-none focus:border-yellow-400">
          <option value="active">Active Listings</option>
          <option value="removed">Removed Listings</option>
          <option value="all">All Listings</option>
        </select>
      </div>

      {notice && <div className="mb-4 p-3 bg-green-500/20 border border-green-500 rounded-lg text-green-200 text-sm">{notice}</div>}
      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading listings...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">No listings found</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((product) => (
            <div key={product._id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="h-36 bg-white/10 flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <Package className="text-white/30" size={32} />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-white truncate flex-1">{product.title}</h3>
                  <span className={`px-2 py-0.5 border text-[10px] font-bold rounded-full ${AVAILABILITY_STYLES[product.status] || 'bg-white/10 border-white/20 text-white/60'}`}>
                    {product.status}
                  </span>
                </div>
                <p className="text-white/50 text-xs mb-1">{product.sellerName} · {product.category}</p>
                <p className="text-yellow-400 font-semibold mb-3">₹{Number(product.price).toLocaleString()}</p>
                {product.isActive === false && (
                  <p className="text-red-400 text-[11px] font-bold mb-2">REMOVED</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setViewProduct(product)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition">
                    <Eye size={14} /> View
                  </button>
                  {product.isActive === false ? (
                    <button onClick={() => restoreListing(product)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 text-sm font-semibold transition">
                      <RotateCcw size={14} /> Restore
                    </button>
                  ) : (
                    <button onClick={() => removeListing(product)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 text-sm font-semibold transition">
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative border border-white/20 max-h-[90vh] overflow-y-auto">
            <button onClick={() => setViewProduct(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={22} />
            </button>
            {viewProduct.imageUrl && (
              <img src={viewProduct.imageUrl} alt={viewProduct.title} className="w-full h-48 object-cover rounded-xl mb-4" onError={(e) => { e.target.style.display = 'none'; }} />
            )}
            <h2 className="text-2xl font-bold text-yellow-400 mb-1">{viewProduct.title}</h2>
            <p className="text-white/60 text-sm mb-4">{viewProduct.description}</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <DetailChip label="Price" value={`₹${Number(viewProduct.price).toLocaleString()}`} />
              <DetailChip label="Category" value={viewProduct.category} />
              <DetailChip label="Condition" value={viewProduct.condition} />
              <DetailChip label="Stock" value={viewProduct.stockAvailable ?? 'N/A'} />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-4 space-y-2">
              <div className="flex items-center gap-2 text-white/80 text-sm"><User size={14} className="text-yellow-400" /> {viewProduct.sellerName}</div>
              <div className="flex items-center gap-2 text-white/80 text-sm"><Mail size={14} className="text-yellow-400" /> {viewProduct.sellerEmail}</div>
            </div>

            <div>
              <p className="text-white/50 text-xs mb-2">Set Availability</p>
              <div className="flex gap-2">
                {['AVAILABLE', 'RESERVED', 'SOLD'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAvailability(viewProduct, s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                      viewProduct.status === s ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminSidebarLayout>
  );
}

function DetailChip({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-2.5">
      <p className="text-white/40 text-[11px]">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  );
}
