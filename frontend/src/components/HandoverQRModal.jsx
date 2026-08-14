import React, { useEffect, useRef, useState } from 'react';
import { X, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

// Shown to the seller once an order is READY_FOR_HANDOVER. The QR encodes a
// plain URL (opened by any phone's native camera app) rather than requiring
// an in-app scanner — the buyer just needs to already be logged in.
export default function HandoverQRModal({ order, onClose }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!order?.handoverToken || !canvasRef.current) return;
    // `code`, not `token` — App.jsx's SSO-redirect handler treats any
    // `?token=` query param on ANY route as a login token to store and
    // redirects to /home, which would clobber the buyer's real session JWT.
    const url = `${window.location.origin}/confirm-handover/${order._id}?code=${order.handoverToken}`;
    QRCode.toCanvas(canvasRef.current, url, { width: 240, margin: 2 }).catch((err) => setError(err.message));
  }, [order]);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-sm p-6 border border-white/10 shadow-2xl text-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <QrCode size={18} /> Show This to the Buyer
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-white/60 text-sm mb-4">
          Have the buyer scan this with their phone's camera to confirm they received "{order.productTitle}". The order completes automatically once they confirm.
        </p>

        {order.handoverToken ? (
          <div className="bg-white p-3 rounded-xl inline-block">
            <canvas ref={canvasRef} />
          </div>
        ) : (
          <p className="text-red-300 text-sm">No active confirmation code for this order.</p>
        )}
        {error && <p className="text-red-300 text-xs mt-3">{error}</p>}
      </div>
    </div>
  );
}
