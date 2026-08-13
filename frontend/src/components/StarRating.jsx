import React, { useState } from "react";
import { Star } from "lucide-react";

// Dual-purpose: read-only display (`⭐ 4.5 (12 reviews)`) when no onChange is
// given, or a clickable 1-5 input when onChange is provided. The read-only
// form collapses to a single hollow star + "No ratings yet" when there's
// nothing to show yet, rather than a row of five empty stars.
export default function StarRating({ value = 0, count, size = 16, onChange, showValue = true }) {
  const [hovered, setHovered] = useState(0);
  const interactive = typeof onChange === "function";
  const displayValue = interactive && hovered > 0 ? hovered : value;
  const hasRating = value > 0;

  if (!interactive && showValue && !hasRating) {
    return (
      <div className="flex items-center gap-1.5 text-gray-500">
        <Star size={size} />
        <span className="text-sm font-medium">No ratings yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={`${star <= Math.round(displayValue) ? "text-yellow-400 fill-current" : "text-gray-600"} ${interactive ? "cursor-pointer transition-transform hover:scale-110" : ""}`}
            onClick={interactive ? () => onChange(star) : undefined}
            onMouseEnter={interactive ? () => setHovered(star) : undefined}
            onMouseLeave={interactive ? () => setHovered(0) : undefined}
          />
        ))}
      </div>
      {showValue && !interactive && (
        <span className="flex items-baseline gap-1">
          <span className="text-yellow-300 font-bold text-sm">{value.toFixed(1)}</span>
          {typeof count === "number" && (
            <span className="text-gray-400 text-xs">({count} review{count === 1 ? "" : "s"})</span>
          )}
        </span>
      )}
    </div>
  );
}
