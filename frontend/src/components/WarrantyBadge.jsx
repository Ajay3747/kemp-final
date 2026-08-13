import React from 'react';
import { ShieldCheck, ShieldOff } from 'lucide-react';

// Shared warranty indicator used on every listing card and the listing
// details view, so the "Available"/"Not Available" styling stays
// consistent everywhere instead of being redefined per component.
export default function WarrantyBadge({ available, duration, variant = 'card' }) {
  if (variant === 'detail') {
    return (
      <div>
        <h2 className="text-lg font-bold text-white mb-2.5">Warranty</h2>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          {available ? (
            <div className="flex items-center text-green-400 font-semibold">
              <ShieldCheck size={18} className="mr-2 shrink-0" />
              <span>{duration ? `${duration} warranty` : 'Warranty available'}</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-400 font-semibold">
              <ShieldOff size={18} className="mr-2 shrink-0" />
              <span>No warranty provided</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Compact card variant
  return available ? (
    <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold">
      <ShieldCheck size={13} className="shrink-0" />
      <span>Warranty: Available{duration ? ` — ${duration}` : ''}</span>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 text-gray-500 text-xs font-medium">
      <ShieldOff size={13} className="shrink-0" />
      <span>Warranty: Not Available</span>
    </div>
  );
}
