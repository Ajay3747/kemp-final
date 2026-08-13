import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Mail, User, Package, Flag, MessageCircle } from 'lucide-react';
import WarrantyBadge from './WarrantyBadge';
import ReportUserModal from './ReportUserModal';

const API_BASE = 'http://localhost:5000/api';

export default function ProductDetailModal({ product, onClose }) {
  const navigate = useNavigate();
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const sellerId = typeof product.sellerId === 'object' ? product.sellerId?._id : product.sellerId;
  const currentUserId = localStorage.getItem('userId');
  const isOwnListing = Boolean(currentUserId) && sellerId === currentUserId;

  const handleReportClick = () => {
    const token = localStorage.getItem('token');
    if (!token || !currentUserId) {
      alert('Please login first to report a user.');
      return;
    }
    if (isOwnListing) {
      alert('You cannot report yourself.');
      return;
    }
    setIsReportModalOpen(true);
  };

  const toggleDescription = () => {
    setShowFullDescription(!showFullDescription);
  };

  const handleBuyNow = async () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');

    if (!userData.username || !userId || !token) {
      alert('Please login first to make a purchase');
      return;
    }

    // Check if user is trying to buy their own product
    if (product.sellerId === userId || product.sellerId._id === userId) {
      alert('You cannot buy your own product!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ productId: product._id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create the deal');
      }

      // Product is now RESERVED server-side — pull it out of the Dealing page's
      // rendered grid immediately, the same way a sold/deleted product already does.
      window.dispatchEvent(new CustomEvent('product-removed', {
        detail: { productId: product._id }
      }));

      alert(`Deal request sent successfully!\n\nThe seller (${product.sellerName}) has been notified with your contact details:\n- Name: ${userData.username}\n- Email: ${userData.collegeEmail}\n- Phone: ${userData.phone}\n- Roll No: ${userData.rollNo}\n\nThey will contact you soon!\n\nTrack this deal's status anytime from My Orders → Purchase History.`);
      onClose();
    } catch (error) {
      console.error('Error processing purchase:', error);
      alert(`Failed to process purchase request.\n\nError: ${error.message}\n\nPlease try again or contact support.`);
    }
  };

  const handleChatWithSeller = async () => {
    const token = localStorage.getItem('token');
    if (!token || !currentUserId) {
      alert('Please login first to chat with the seller');
      return;
    }
    if (isOwnListing) return;

    try {
      setStartingChat(true);
      const response = await fetch(`${API_BASE}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sellerId, productId: product._id })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to start chat');
      }

      onClose();
      navigate(`/chat/${data.conversation._id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert(`Failed to start chat with seller.\n\nError: ${error.message}`);
    } finally {
      setStartingChat(false);
    }
  };

  const longDescription = product.longDescription || product.description;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        <div className="flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
            aria-label="Close product details"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto scrollbar-custom p-6 sm:p-8 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="group relative rounded-xl overflow-hidden shadow-lg h-96 border border-white/10">
              <img
                src={product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                alt={product.title || product.name}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                }}
              />
            </div>

            <div className="flex flex-col">
              <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400 mb-5">{product.title || product.name}</h1>

              <div className="flex-1 space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-white mb-2.5">Product Details</h2>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <p className="text-gray-300 leading-relaxed mb-4">
                      {showFullDescription ? longDescription : product.description}
                      {longDescription.length > product.description.length && (
                        <span
                          onClick={toggleDescription}
                          className="text-yellow-400 cursor-pointer ml-2 hover:underline"
                        >
                          {showFullDescription ? 'Show less' : 'Show more'}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center text-gray-400">
                      <Package size={18} className="mr-2 text-yellow-400" />
                      <span>
                        Stock: <span className="text-white font-semibold">{product.stockAvailable || 'Not Specified'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <WarrantyBadge available={product.warrantyAvailable} duration={product.warrantyDuration} variant="detail" />

                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h2 className="text-lg font-bold text-white">Seller Info</h2>
                    {!isOwnListing && (
                      <button
                        type="button"
                        onClick={handleReportClick}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Flag size={13} /> Report User
                      </button>
                    )}
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center text-gray-300">
                      <User size={18} className="mr-2 text-yellow-400" />
                      <span className="font-semibold text-white">{product.sellerName}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Mail size={18} className="mr-2 text-yellow-400" />
                      <a href={`mailto:${product.sellerEmail}`} className="text-sm text-yellow-400 hover:underline transition-colors duration-300">
                        {product.sellerEmail}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                {!isOwnListing && (
                  <button
                    onClick={handleChatWithSeller}
                    disabled={startingChat}
                    className="flex-1 border border-yellow-400/40 text-yellow-300 font-bold py-4 px-8 rounded-full text-lg flex items-center justify-center hover:bg-yellow-400/10 transition-colors disabled:opacity-60"
                  >
                    <MessageCircle size={20} className="mr-2" /> {startingChat ? 'Starting chat...' : 'Chat with Seller'}
                  </button>
                )}
                <button
                  onClick={handleBuyNow}
                  className="premium-btn flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-4 px-8 rounded-full text-lg shadow-lg shadow-yellow-500/20 flex items-center justify-center"
                >
                  <ShoppingBag size={20} className="mr-2" /> Deal Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportUserModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedUserId={sellerId}
        reportedUsername={product.sellerName}
        listingId={product._id}
      />
    </div>
  );
}