import React, { useEffect, useState } from "react";
import { Search, Eye } from "lucide-react";
import AdminSidebarLayout from "../components/AdminSidebarLayout";
import OrderDetailModal from "../components/OrderDetailModal";
import { adminFetch } from "../utils/adminApi";

const STATUS_BADGE_STYLES = {
  PENDING: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  ACCEPTED: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  PROCESSING: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  READY_FOR_HANDOVER: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  COMPLETED: 'bg-green-500/20 border-green-500/50 text-green-300',
  REJECTED: 'bg-red-500/20 border-red-500/50 text-red-300',
  CANCELLED: 'bg-red-500/20 border-red-500/50 text-red-300'
};

const STATUSES = ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY_FOR_HANDOVER', 'COMPLETED', 'CANCELLED', 'REJECTED'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewOrder, setViewOrder] = useState(null);

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const data = await adminFetch(`/orders?${params.toString()}`);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.productTitle?.toLowerCase().includes(q) || o.buyerName?.toLowerCase().includes(q) || o.sellerName?.toLowerCase().includes(q);
  });

  return (
    <AdminSidebarLayout title="Orders / Deals">
      <p className="text-white/50 text-sm mb-4">Read-only monitoring — order status is driven only by the buyer/seller Deal flow, never edited here.</p>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by product, buyer, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-yellow-400"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 rounded-lg bg-gray-800 border border-white/20 text-white focus:outline-none focus:border-yellow-400">
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-white/60">Loading orders...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/40">No orders found</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/10 border-b border-white/20">
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Buyer</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Seller</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Price</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-yellow-400 text-sm">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-yellow-400 text-sm">View</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order._id} className="border-b border-white/10 hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-semibold text-white text-sm">{order.productTitle}</td>
                  <td className="px-4 py-3 text-white/70 text-sm">{order.buyerName}</td>
                  <td className="px-4 py-3 text-white/70 text-sm">{order.sellerName}</td>
                  <td className="px-4 py-3 text-yellow-400 font-semibold text-sm">₹{Number(order.price).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${STATUS_BADGE_STYLES[order.status] || 'bg-white/10 border-white/20 text-white/70'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/50 text-xs">{new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setViewOrder(order)} className="p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 transition">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewOrder && (
        <OrderDetailModal
          order={viewOrder}
          showActions={false}
          onClose={() => setViewOrder(null)}
        />
      )}
    </AdminSidebarLayout>
  );
}
