import React, { useEffect, useState } from "react";
import { X, MessageSquareText } from "lucide-react";
import StarRating from "./StarRating";
import { getSellerRatings } from "../utils/ratingApi";

export default function SellerReviewsModal({ sellerId, sellerName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState({ averageRating: 0, totalRatings: 0, ratings: [] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getSellerRatings(sellerId)
      .then((data) => { if (!cancelled) setSummary(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sellerId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-yellow-400">{sellerName}'s Reviews</h2>
            {!loading && (
              <div className="mt-1">
                <StarRating value={summary.averageRating} count={summary.totalRatings} size={14} />
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Close reviews"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">Loading reviews…</div>
        ) : error ? (
          <div className="py-10 text-center text-red-300 text-sm">{error}</div>
        ) : summary.ratings.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
            <MessageSquareText size={28} className="text-gray-600" />
            No reviews yet.
          </div>
        ) : (
          <div className="space-y-3">
            {summary.ratings.map((r) => (
              <div key={r._id} className="bg-white/5 border border-white/10 rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-white text-sm truncate">{r.buyerName || "Anonymous"}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="mt-1">
                  <StarRating value={r.rating} size={13} showValue={false} />
                </div>
                {r.productTitle && (
                  <p className="text-gray-500 text-xs mt-1">on {r.productTitle}</p>
                )}
                {r.review && (
                  <p className="text-gray-300 text-sm mt-2">{r.review}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
