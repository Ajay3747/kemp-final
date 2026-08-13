import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, User, Calendar, Check, ArrowRight, X, ShoppingBag, ClipboardList, Mail, Phone, Trash2, Star, ShieldCheck } from 'lucide-react';
import OrderDetailModal from '../components/OrderDetailModal';
import RateSellerModal from '../components/RateSellerModal';
import { getMyRatings } from '../utils/ratingApi';
import { getMyWarranties } from '../utils/warrantyApi';

const API_URL = "http://localhost:5000/api";

const STATUS_BADGE_STYLES = {
  PENDING: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  ACCEPTED: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  PROCESSING: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  READY_FOR_HANDOVER: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  COMPLETED: 'bg-green-500/20 border-green-500/50 text-green-300',
  REJECTED: 'bg-red-500/20 border-red-500/50 text-red-300',
  CANCELLED: 'bg-red-500/20 border-red-500/50 text-red-300'
};

const CANCELLABLE_BUYER_STATUSES = ['PENDING', 'ACCEPTED', 'PROCESSING'];

const WARRANTY_STATUS_STYLES = {
  Active: 'bg-green-500/20 border-green-500/50 text-green-300',
  'Expiring Soon': 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  Expired: 'bg-red-500/20 border-red-500/50 text-red-300',
  Unknown: 'bg-white/10 border-white/20 text-white/70'
};

export default function MyOrders() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightId = searchParams.get('orderId');

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab === 'purchase' ? 'purchase' : initialTab === 'warranties' ? 'warranties' : 'selling'
  );
  const [sellingOrders, setSellingOrders] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [myRatingsByOrder, setMyRatingsByOrder] = useState({});
  const [rateModalOrder, setRateModalOrder] = useState(null);
  const autoOpenedRef = useRef(false);
  const highlightRef = useRef(null);

  const currentList = activeTab === 'selling' ? sellingOrders : activeTab === 'purchase' ? purchaseOrders : [];
  const allSelected = currentList.length > 0 && currentList.every((o) => selectedIds.has(o._id));

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(currentList.map((o) => o._id)));
  };

  const confirmDeleteSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/history/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ orderIds: ids })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete history records');

      const deletedSet = new Set(data.deletedIds);
      setSellingOrders((prev) => prev.filter((o) => !deletedSet.has(o._id)));
      setPurchaseOrders((prev) => prev.filter((o) => !deletedSet.has(o._id)));
      setSelectedIds(new Set());
      setConfirmingDelete(false);
    } catch (err) {
      alert(`Failed to delete selected history records.\n\nError: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const fetchAll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      const [sellRes, buyRes] = await Promise.all([
        fetch(`${API_URL}/orders/seller`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/orders/buyer`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      const sellData = sellRes.ok ? await sellRes.json() : [];
      const buyData = buyRes.ok ? await buyRes.json() : [];
      setSellingOrders(Array.isArray(sellData) ? sellData : []);
      setPurchaseOrders(Array.isArray(buyData) ? buyData : []);

      const ratings = await getMyRatings().catch(() => []);
      const byOrder = {};
      ratings.forEach((r) => { byOrder[r.orderId] = r; });
      setMyRatingsByOrder(byOrder);

      const warrantyList = await getMyWarranties().catch(() => []);
      setWarranties(Array.isArray(warrantyList) ? warrantyList : []);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Deep link from a notification: land on whichever tab actually holds the
  // order, and open its full details (selling side) once orders are loaded.
  useEffect(() => {
    if (loading || !highlightId || autoOpenedRef.current) return;

    const sellMatch = sellingOrders.find((o) => o._id === highlightId);
    if (sellMatch) {
      setActiveTab('selling');
      setDetailOrder(sellMatch);
      autoOpenedRef.current = true;
      return;
    }
    const buyMatch = purchaseOrders.find((o) => o._id === highlightId);
    if (buyMatch) {
      setActiveTab('purchase');
      autoOpenedRef.current = true;
    }
  }, [loading, highlightId, sellingOrders, purchaseOrders]);

  useEffect(() => {
    if (!loading && highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, highlightId, activeTab]);

  const updateStatus = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order status');
      setSellingOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
      setDetailOrder((prev) => (prev && prev._id === orderId ? data.order : prev));
    } catch (err) {
      alert(`Failed to update order status.\n\nError: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelAsBuyer = async (orderId) => {
    if (!window.confirm('Cancel this deal?')) return;
    try {
      setUpdatingId(orderId);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to cancel the deal');
      setPurchaseOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
    } catch (err) {
      alert(`Failed to cancel the deal.\n\nError: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setConfirmingDelete(false);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    next.delete('orderId');
    setSearchParams(next, { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b18] text-white">
      <div className="bg-white/5 border-b border-white/10 p-6 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="text-yellow-400" size={32} />
              <div>
                <h1 className="text-4xl font-bold text-[#facc15]">My Orders</h1>
                <p className="text-white/60 mt-1">Manage deals you're selling and track deals you've made</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              Back to Profile
            </button>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => switchTab('selling')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'selling' ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Selling History ({sellingOrders.length})
            </button>
            <button
              onClick={() => switchTab('purchase')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'purchase' ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Purchase History ({purchaseOrders.length})
            </button>
            <button
              onClick={() => switchTab('warranties')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'warranties' ? 'bg-yellow-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              My Warranties ({warranties.length})
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">Error: {error}</div>
        )}

        {activeTab === 'selling' ? (
          sellingOrders.length === 0 ? (
            <EmptyState icon={ShoppingBag} text="No one has requested a deal on your listings yet." />
          ) : (
            <div className="space-y-3">
              <SelectionToolbar
                allSelected={allSelected}
                selectedCount={selectedIds.size}
                onToggleSelectAll={toggleSelectAll}
                onRequestDelete={() => setConfirmingDelete(true)}
              />
              {sellingOrders.map((order) => {
                const isHighlighted = order._id === highlightId;
                const isSelected = selectedIds.has(order._id);
                return (
                <div
                  key={order._id}
                  ref={isHighlighted ? highlightRef : null}
                  className={`bg-white/5 border rounded-xl p-4 backdrop-blur-md transition-colors ${
                    isHighlighted
                      ? 'border-yellow-400/70 ring-1 ring-yellow-400/40'
                      : isSelected
                      ? 'border-yellow-400/40 bg-yellow-400/5'
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {order.productImageUrl ? (
                      <img
                        src={order.productImageUrl}
                        alt={order.productTitle}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=%20'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Package size={20} className="text-yellow-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white truncate">{order.productTitle}</h3>
                        <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${STATUS_BADGE_STYLES[order.status] || 'bg-white/10 border-white/20 text-white/70'}`}>
                          {order.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                        <span className="flex items-center gap-1"><User size={13} /> {order.buyerName}</span>
                        <span className="text-yellow-400 font-semibold">₹{Number(order.price).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(order.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                    {order.status === 'PENDING' && (
                      <>
                        <ActionBtn label="Accept Deal" icon={Check} color="green" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'ACCEPTED')} />
                        <ActionBtn label="Reject" icon={X} color="red" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'REJECTED')} />
                      </>
                    )}
                    {order.status === 'ACCEPTED' && (
                      <>
                        <ActionBtn label="Start Processing" icon={ArrowRight} color="yellow" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'PROCESSING')} />
                        <ActionBtn label="Cancel Deal" icon={X} color="neutral" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'CANCELLED')} />
                      </>
                    )}
                    {order.status === 'PROCESSING' && (
                      <>
                        <ActionBtn label="Mark Ready for Handover" icon={ArrowRight} color="yellow" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'READY_FOR_HANDOVER')} />
                        <ActionBtn label="Cancel Deal" icon={X} color="neutral" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'CANCELLED')} />
                      </>
                    )}
                    {order.status === 'READY_FOR_HANDOVER' && (
                      <ActionBtn label="Mark Completed" icon={Check} color="green" busy={updatingId === order._id} onClick={() => updateStatus(order._id, 'COMPLETED')} />
                    )}
                    <button
                      onClick={() => setDetailOrder(order)}
                      className="ml-auto text-sm text-yellow-400 hover:underline font-medium"
                    >
                      Full order details
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'purchase' ? (
          purchaseOrders.length === 0 ? (
          <EmptyState icon={Package} text="You haven't made any deals yet." />
        ) : (
          <div className="space-y-3">
            <SelectionToolbar
              allSelected={allSelected}
              selectedCount={selectedIds.size}
              onToggleSelectAll={toggleSelectAll}
              onRequestDelete={() => setConfirmingDelete(true)}
            />
            {purchaseOrders.map((order) => {
              const isHighlighted = order._id === highlightId;
              const isSelected = selectedIds.has(order._id);
              return (
              <div
                key={order._id}
                ref={isHighlighted ? highlightRef : null}
                className={`bg-white/5 border rounded-xl p-4 backdrop-blur-md transition-colors ${
                  isHighlighted
                    ? 'border-yellow-400/70 ring-1 ring-yellow-400/40'
                    : isSelected
                    ? 'border-yellow-400/40 bg-yellow-400/5'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {order.productImageUrl ? (
                    <img
                      src={order.productImageUrl}
                      alt={order.productTitle}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=%20'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-yellow-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white truncate">{order.productTitle}</h3>
                      <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${STATUS_BADGE_STYLES[order.status] || 'bg-white/10 border-white/20 text-white/70'}`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                      <span>Sold by {order.sellerName}</span>
                      <span className="text-yellow-400 font-semibold">₹{Number(order.price).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                      <span className="flex items-center gap-1"><Mail size={12} /> {order.sellerEmail}</span>
                      {order.sellerPhone && (
                        <span className="flex items-center gap-1 text-yellow-300/90"><Phone size={12} /> {order.sellerPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
                {CANCELLABLE_BUYER_STATUSES.includes(order.status) && (
                  <div className="flex mt-3 pt-3 border-t border-white/10">
                    <ActionBtn label="Cancel Deal" icon={X} color="neutral" busy={updatingId === order._id} onClick={() => cancelAsBuyer(order._id)} />
                  </div>
                )}
                {order.status === 'COMPLETED' && (
                  <div className="flex mt-3 pt-3 border-t border-white/10">
                    <ActionBtn
                      label={myRatingsByOrder[order._id] ? 'Edit Rating' : 'Rate Seller'}
                      icon={Star}
                      color="yellow"
                      busy={false}
                      onClick={() => setRateModalOrder(order)}
                    />
                  </div>
                )}
              </div>
              );
            })}
          </div>
          )
        ) : warranties.length === 0 ? (
          <EmptyState icon={ShieldCheck} text="No warrantied purchases yet — completed orders for products with a warranty will show up here." />
        ) : (
          <div className="space-y-3">
            {warranties.map((w) => {
              const purchaseOrder = purchaseOrders.find((o) => o._id === w.orderId);
              return (
                <div key={w.orderId} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
                  <div className="flex items-start gap-3">
                    {w.productImageUrl ? (
                      <img
                        src={w.productImageUrl}
                        alt={w.productTitle}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/64x64?text=%20'; }}
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck size={20} className="text-yellow-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white truncate">{w.productTitle}</h3>
                        <span className={`px-2 py-0.5 border text-[11px] font-bold rounded-full ${WARRANTY_STATUS_STYLES[w.status] || WARRANTY_STATUS_STYLES.Unknown}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                        <span>Sold by {w.sellerName}</span>
                        <span className="flex items-center gap-1"><Calendar size={13} /> Purchased {new Date(w.purchaseDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/50">
                        <span>Warranty: {w.warrantyDuration}</span>
                        <span>
                          {w.isLifetime
                            ? 'No expiry (lifetime warranty)'
                            : w.expiryDate
                            ? `Expires ${new Date(w.expiryDate).toLocaleDateString()}`
                            : 'Expiry unknown — could not read the warranty duration'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-white/10 text-sm">
                    {purchaseOrder && (
                      <button
                        onClick={() => setDetailOrder(purchaseOrder)}
                        className="text-yellow-400 hover:underline font-medium"
                      >
                        View Order
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/dealing?productId=${w.productId}`)}
                      className="text-yellow-400 hover:underline font-medium"
                    >
                      View Product
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          updating={updatingId === detailOrder._id}
          onUpdateStatus={(status) => updateStatus(detailOrder._id, status)}
          onClose={() => setDetailOrder(null)}
        />
      )}

      {confirmingDelete && (
        <DeleteConfirmModal
          count={selectedIds.size}
          deleting={deleting}
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={confirmDeleteSelected}
        />
      )}

      {rateModalOrder && (
        <RateSellerModal
          order={rateModalOrder}
          existingRating={myRatingsByOrder[rateModalOrder._id]}
          onClose={() => setRateModalOrder(null)}
          onSaved={(rating) => {
            setMyRatingsByOrder((prev) => ({ ...prev, [rateModalOrder._id]: rating }));
            setRateModalOrder(null);
          }}
        />
      )}
    </div>
  );
}

function SelectionToolbar({ allSelected, selectedCount, onToggleSelectAll, onRequestDelete }) {
  const hasSelection = selectedCount > 0;
  const checkboxRef = useRef(null);

  // Partial selection reads as a dash rather than falsely looking unchecked.
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = hasSelection && !allSelected;
    }
  }, [hasSelection, allSelected]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:px-5 backdrop-blur-md">
      <label className="flex items-center gap-2.5 cursor-pointer select-none group">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allSelected}
          onChange={onToggleSelectAll}
          className="w-4 h-4 accent-yellow-400 cursor-pointer"
          aria-label={allSelected ? 'Deselect all records' : 'Select all records'}
        />
        <span className={`text-sm font-semibold transition-colors ${hasSelection ? 'text-yellow-300' : 'text-white/80 group-hover:text-white'}`}>
          {hasSelection ? `${selectedCount} Selected` : 'Select All'}
        </span>
      </label>

      {hasSelection && (
        <button
          onClick={onRequestDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20 transition"
        >
          <Trash2 size={14} /> Delete
        </button>
      )}
    </div>
  );
}

function DeleteConfirmModal({ count, deleting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <h3 className="text-lg font-bold text-white">
          Delete {count} order{count === 1 ? '' : 's'}?
        </h3>
        <p className="text-white/60 text-sm mt-2">
          This will remove {count === 1 ? 'it' : 'them'} from your history.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50"
          >
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="text-center py-16">
      <Icon className="mx-auto mb-4 text-white/40" size={64} />
      <p className="text-white/40">{text}</p>
    </div>
  );
}

const ACTION_COLORS = {
  green: 'bg-green-500 hover:bg-green-600',
  red: 'bg-red-500 hover:bg-red-600',
  yellow: 'bg-yellow-400 hover:bg-yellow-500 text-black',
  neutral: 'bg-white/5 border border-white/10 hover:bg-white/10'
};

function ActionBtn({ label, icon: Icon, color, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${ACTION_COLORS[color]}`}
    >
      <Icon size={15} /> {label}
    </button>
  );
}
