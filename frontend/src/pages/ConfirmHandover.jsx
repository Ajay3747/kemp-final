import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { QrCode, Package, CheckCircle2, ArrowLeft } from 'lucide-react';

const API_URL = "http://localhost:5000/api/orders";

// Reached by scanning the seller's QR code — a plain URL, opened by any
// phone's native camera app, no in-app scanner needed. Requires the buyer
// to already be logged in.
export default function ConfirmHandover() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  // `code`, not `token` — App.jsx's global SSO-redirect handler treats any
  // `?token=` query param as a login token and would overwrite the buyer's
  // real session JWT with it.
  const token = searchParams.get('code');
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const authToken = localStorage.getItem('token');
    if (!authToken) {
      navigate('/');
      return;
    }
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/${orderId}`, { headers: { Authorization: `Bearer ${authToken}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Order not found.');
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    try {
      setConfirming(true);
      setError('');
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/${orderId}/confirm-handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to confirm handover.');
      setConfirmed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const currentUserId = localStorage.getItem('userId');
  const isBuyerViewing = order && String(order.buyerId) === String(currentUserId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b18] text-white p-6">
      <div className="max-w-md mx-auto">
        <button onClick={() => navigate('/my-orders')} className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6">
          <ArrowLeft size={16} /> Back to My Orders
        </button>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
          <div className="p-3 rounded-full bg-yellow-400/15 border border-yellow-400/30 inline-flex mb-4">
            <QrCode className="text-yellow-400" size={28} />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">Confirm Handover</h1>

          {error && !order ? (
            <p className="text-red-300 text-sm mt-4">{error}</p>
          ) : order ? (
            <>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4 flex items-center gap-3 text-left">
                {order.productImageUrl ? (
                  <img src={order.productImageUrl} alt={order.productTitle} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Package size={20} className="text-yellow-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{order.productTitle}</p>
                  <p className="text-white/50 text-sm">Sold by {order.sellerName}</p>
                  <p className="text-yellow-400 font-semibold">₹{Number(order.price).toLocaleString()}</p>
                </div>
              </div>

              {confirmed ? (
                <div className="flex items-center justify-center gap-2 text-green-300 bg-green-500/10 border border-green-500/30 rounded-xl py-3 font-semibold mt-5">
                  <CheckCircle2 size={18} /> Handover confirmed — order completed!
                </div>
              ) : order.status !== 'READY_FOR_HANDOVER' ? (
                <p className="text-white/50 text-sm mt-5">
                  This order is {order.status.toLowerCase().replace(/_/g, ' ')} — nothing to confirm right now.
                </p>
              ) : !isBuyerViewing ? (
                <p className="text-white/50 text-sm mt-5">Only the buyer of this order can confirm handover.</p>
              ) : (
                <>
                  <p className="text-white/60 text-sm mt-5">Tap below only after you've physically received this item.</p>
                  {error && <p className="text-red-300 text-sm mt-3">{error}</p>}
                  <button
                    onClick={confirm}
                    disabled={confirming}
                    className="w-full mt-4 flex items-center justify-center gap-2 p-3 text-lg font-bold bg-yellow-400 text-black rounded-lg hover:bg-yellow-500 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={18} /> {confirming ? 'Confirming...' : "I Received This Item"}
                  </button>
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
