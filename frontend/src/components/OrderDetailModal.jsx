import React from 'react';
import { X, User, Package, Check, ArrowRight, Trash2, Clock, XCircle, CheckCircle2, QrCode } from 'lucide-react';

const FLOW_STEPS = [
  { key: 'PENDING', label: 'Deal Requested' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'READY_FOR_HANDOVER', label: 'Ready for Handover' },
  { key: 'COMPLETED', label: 'Completed' }
];

const STATUS_LABELS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  PROCESSING: 'Processing',
  READY_FOR_HANDOVER: 'Ready for Handover',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
};

/**
 * Full order details, opened either from a compact Notifications list row
 * (with a `notification` for title/message/timestamp) or directly from a
 * My Orders -> Selling History card (order only, no notification). Reuses
 * whatever status-transition handler/data the parent already fetches — this
 * component only renders and delegates; it holds no order/notification logic
 * of its own.
 */
export default function OrderDetailModal({ notification, order, updating, onUpdateStatus, onShowQr, onDelete, onClose, showActions = true }) {
  if (!notification && !order) return null;

  const isTerminalStop = order && (order.status === 'CANCELLED' || order.status === 'REJECTED');
  const currentIndex = order ? FLOW_STEPS.findIndex((s) => s.key === order.status) : -1;

  const headerImage = notification?.productDetails?.imageUrl || order?.productImageUrl;
  const headerTitle = notification?.title || order?.productTitle;
  const headerTimestamp = notification?.createdAt || order?.updatedAt || order?.createdAt;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-custom">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-4 min-w-0">
            {headerImage && (
              <img
                src={headerImage}
                alt={headerTitle}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-white/10"
                onError={(e) => { e.target.src = 'https://via.placeholder.com/96x96?text=No+Image'; }}
              />
            )}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-yellow-400 truncate">{headerTitle}</h2>
              {headerTimestamp && (
                <p className="text-white/50 text-sm mt-1">{new Date(headerTimestamp).toLocaleString()}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 flex-shrink-0"
            aria-label="Close order details"
          >
            <X size={22} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {notification?.message && <p className="text-white/80">{notification.message}</p>}

          {order ? (
            <>
              {/* Product + price */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Package size={18} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-white font-semibold truncate">{order.productTitle}</span>
                </div>
                <span className="text-yellow-400 font-bold text-lg flex-shrink-0">₹{Number(order.price).toLocaleString()}</span>
              </div>

              {/* Status timeline */}
              <div>
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-yellow-400" /> Order Status
                </h3>

                {isTerminalStop ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-green-400" />
                      <span className="text-sm text-white/70">Deal Requested</span>
                    </div>
                    <div className="flex-1 h-0.5 bg-red-400/40" />
                    <div className="flex items-center gap-2">
                      <XCircle size={20} className="text-red-400" />
                      <span className="text-sm text-red-300 font-semibold">{STATUS_LABELS[order.status]}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start">
                    {FLOW_STEPS.map((step, idx) => {
                      const done = idx <= currentIndex;
                      const active = idx === currentIndex;
                      return (
                        <React.Fragment key={step.key}>
                          <div className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors ${
                                done ? 'bg-yellow-400 border-yellow-400 text-black' : 'border-white/20 text-white/30'
                              }`}
                            >
                              {done ? <Check size={14} /> : <span className="text-xs">{idx + 1}</span>}
                            </div>
                            <span className={`text-[10px] text-center leading-tight ${active ? 'text-yellow-300 font-semibold' : done ? 'text-white/70' : 'text-white/30'}`}>
                              {step.label}
                            </span>
                          </div>
                          {idx < FLOW_STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mt-3.5 ${idx < currentIndex ? 'bg-yellow-400' : 'bg-white/10'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Buyer contact — only surfaced here, not in the compact list */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-yellow-400" />
                  <span className="text-white font-semibold">Buyer Contact Information</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-white/50 text-xs">Name</span>
                    <p className="text-white font-medium">{order.buyerName}</p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-white/50 text-xs">Email</span>
                    <a href={`mailto:${order.buyerEmail}`} className="block text-yellow-400 hover:underline font-medium truncate">
                      {order.buyerEmail}
                    </a>
                  </div>
                  {order.buyerPhone && (
                    <div>
                      <span className="text-white/50 text-xs">Phone</span>
                      <a href={`tel:${order.buyerPhone}`} className="block text-yellow-400 hover:underline font-medium">
                        {order.buyerPhone}
                      </a>
                    </div>
                  )}
                  {order.buyerRollNo && (
                    <div>
                      <span className="text-white/50 text-xs">Roll No</span>
                      <p className="text-white font-medium">{order.buyerRollNo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions — same transition rules/handler the compact list used to call inline */}
              {showActions && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-white/10">
                {order.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => onUpdateStatus('ACCEPTED')}
                      disabled={updating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <Check size={18} /> Accept Deal
                    </button>
                    <button
                      onClick={() => onUpdateStatus('REJECTED')}
                      disabled={updating}
                      className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <X size={18} /> Reject
                    </button>
                  </>
                )}
                {order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => onUpdateStatus('PROCESSING')}
                    disabled={updating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-semibold transition disabled:opacity-50"
                  >
                    <ArrowRight size={18} /> Start Processing
                  </button>
                )}
                {order.status === 'PROCESSING' && (
                  <button
                    onClick={() => onUpdateStatus('READY_FOR_HANDOVER')}
                    disabled={updating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black rounded-xl font-semibold transition disabled:opacity-50"
                  >
                    <ArrowRight size={18} /> Mark Ready for Handover
                  </button>
                )}
                {order.status === 'READY_FOR_HANDOVER' && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={onShowQr}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 rounded-xl font-semibold transition"
                    >
                      <QrCode size={18} /> Show QR to Buyer
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("The buyer hasn't scanned the QR code yet. Mark this order completed anyway?")) {
                          onUpdateStatus('COMPLETED');
                        }
                      }}
                      disabled={updating}
                      className="text-xs text-white/40 hover:text-white/70 underline disabled:opacity-50"
                    >
                      Mark completed manually
                    </button>
                  </div>
                )}
                {['ACCEPTED', 'PROCESSING'].includes(order.status) && (
                  <button
                    onClick={() => onUpdateStatus('CANCELLED')}
                    disabled={updating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-semibold transition disabled:opacity-50"
                  >
                    <X size={18} /> Cancel Deal
                  </button>
                )}
              </div>
              )}
            </>
          ) : (
            notification?.productDetails?.title && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-2">
                <Package size={18} className="text-yellow-400" />
                <span className="text-white font-semibold">{notification.productDetails.title}</span>
              </div>
            )
          )}

          {onDelete && (
            <div className="flex justify-end pt-2">
              <button
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-300 hover:bg-red-500/10 rounded-lg transition text-sm font-medium"
              >
                <Trash2 size={16} /> Delete notification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
