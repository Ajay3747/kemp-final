import React from 'react';
import { ShoppingBag, Star, Mail, Package } from 'lucide-react';
import WarrantyBadge from './WarrantyBadge';

export default function ItemCard({ name, price, description, imageUrl, sellerEmail, hidePrice, warrantyAvailable, warrantyDuration, isBundle, bundleItemCount }) {
  return (
    <div className="premium-card group overflow-hidden cursor-pointer">
      <div className="relative h-64 overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {isBundle && (
          <div className="absolute top-4 left-4 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-yellow-400 py-1 px-3 rounded-full font-bold text-xs shadow-lg">
            <Package size={12} /> Bundle{bundleItemCount ? ` (${bundleItemCount})` : ''}
          </div>
        )}
        {!hidePrice && price && price !== '₹0' && price !== '₹undefined' && price !== '₹null' && (
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-yellow-400 py-1 px-3 rounded-full font-bold shadow-lg">
            {price}
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">{name}</h3>
        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{description}</p>

        <div className="mb-4">
          <WarrantyBadge available={warrantyAvailable} duration={warrantyDuration} />
        </div>

        {/* Seller Contact Info */}
        <div className="flex items-center text-gray-400 mb-4">
          <Mail size={16} className="mr-2 flex-shrink-0" />
          <a
            href={`mailto:${sellerEmail}`}
            className="text-sm text-yellow-400 hover:underline transition-colors duration-300 truncate"
          >
            {sellerEmail}
          </a>
        </div>

        {/* Rating and Action */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center text-yellow-400">
            <Star size={16} fill="currentColor" className="mr-1" />
            <Star size={16} fill="currentColor" className="mr-1" />
            <Star size={16} fill="currentColor" className="mr-1" />
            <Star size={16} fill="currentColor" className="mr-1" />
            <Star size={16} className="text-gray-600" />
          </div>
          <button className="premium-btn flex items-center text-black bg-gradient-to-r from-yellow-400 to-amber-500 py-2 px-4 rounded-full font-bold text-sm shadow-md shadow-yellow-500/20 hover:shadow-yellow-400/40">
            <ShoppingBag size={16} className="mr-2" /> Buy
          </button>
        </div>
      </div>
    </div>
  );
}