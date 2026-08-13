import React, { useState } from "react";
import { X } from "lucide-react";
import StarRating from "./StarRating";
import { submitRating, updateRating } from "../utils/ratingApi";

// existingRating (optional): { _id, rating, review } — presence means "edit" instead of "create".
export default function RateSellerModal({ order, existingRating, onClose, onSaved }) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = existingRating
        ? await updateRating(existingRating._id, rating, review)
        : await submitRating(order._id, rating, review);
      onSaved(result.rating);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl w-full max-w-md p-6 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-yellow-400">
            {existingRating ? "Edit Your Rating" : "Rate Seller"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          {order.sellerName} &middot; {order.productTitle}
        </p>

        <div className="mb-4">
          <StarRating value={rating} onChange={setRating} size={28} showValue={false} />
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Write a review... (optional)"
          maxLength={1000}
          rows={4}
          className="premium-input w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:bg-white/[0.07] p-3 resize-none"
        />

        {error && <p className="text-red-300 text-sm mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full mt-4 py-2.5 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-500 transition disabled:opacity-50"
        >
          {saving ? "Saving…" : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
