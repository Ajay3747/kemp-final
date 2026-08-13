import React, { useState, useEffect } from 'react';
import { X, CheckCircle, User, Hash, DollarSign, Calendar, FileText, Save } from 'lucide-react';

export default function SaleRecordModal({ isOpen, onClose, product, sellerData }) {
  const [formData, setFormData] = useState({
    buyerName: '',
    buyerRollNumber: '',
    buyerPhone: '',
    sellerName: sellerData?.username || '',
    sellerRollNumber: sellerData?.rollNo || '',
    productName: product?.title || '',
    salePrice: product?.price || '',
    saleDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Update form data when product or sellerData changes
  useEffect(() => {
    if (product || sellerData) {
      setFormData(prev => ({
        ...prev,
        sellerName: sellerData?.username || '',
        sellerRollNumber: sellerData?.rollNo || '',
        productName: product?.title || '',
        salePrice: product?.price || '',
      }));
    }
  }, [product, sellerData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/sales/sales-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: product?._id || null,
          productName: formData.productName,
          salePrice: parseFloat(formData.salePrice),
          buyerName: formData.buyerName,
          buyerRollNumber: formData.buyerRollNumber,
          buyerPhone: formData.buyerPhone,
          sellerName: formData.sellerName,
          sellerRollNumber: formData.sellerRollNumber,
          saleDate: formData.saleDate,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Delete the product after successfully recording the sale
        if (product?._id) {
          try {
            const deleteResponse = await fetch(`http://localhost:5000/api/products/${product._id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });

            if (deleteResponse.ok) {
              console.log('Product deleted successfully after recording sale');
              window.dispatchEvent(new CustomEvent('product-removed', {
                detail: { productId: product._id }
              }));
            } else {
              console.warn('Failed to delete product:', deleteResponse.status);
            }
          } catch (deleteError) {
            console.error('Error deleting product:', deleteError);
          }
        }

        setIsSubmitting(false);
        setSubmitSuccess(true);
        
        console.log('Sale record saved successfully:', data);
        
        // Reset and close after 2 seconds
        setTimeout(() => {
          setSubmitSuccess(false);
          onClose();
          // Optionally refresh the page or update parent component
          window.location.reload(); // This will refresh to show updated data
        }, 2000);
      } else {
        throw new Error(data.message || 'Failed to save sale record');
      }
    } catch (error) {
      console.error('Error saving sale record:', error);
      setIsSubmitting(false);
      // You can add error state here to show error message to user
      alert('Failed to save sale record: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-[#0a0e1f] to-[#070b18] rounded-2xl border border-white/20 shadow-2xl shadow-yellow-500/10 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-red-500/20 hover:bg-red-500/30 rounded-full transition-all duration-300 group z-10"
        >
          <X className="text-red-400 group-hover:rotate-90 transition-transform duration-300" size={24} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-amber-500/20 p-6 border-b border-white/10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Record Product Sale
          </h2>
          <p className="text-white/60 mt-2">Complete the sale details for: <span className="text-yellow-400 font-semibold">{product?.title}</span></p>
        </div>

        {/* Success Message */}
        {submitSuccess && (
          <div className="mx-6 mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3 animate-slideDown">
            <CheckCircle className="text-green-400" size={24} />
            <div>
              <p className="text-green-400 font-semibold">Sale Recorded Successfully!</p>
              <p className="text-white/60 text-sm">The transaction has been saved to your records.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Info Section */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              <FileText size={20} />
              Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Sale Price (₹)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" size={20} />
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-yellow-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
              <User size={20} />
              Buyer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Buyer Name *</label>
                <input
                  type="text"
                  name="buyerName"
                  value={formData.buyerName}
                  onChange={handleChange}
                  placeholder="Enter buyer's full name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Buyer Roll Number *</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={20} />
                  <input
                    type="text"
                    name="buyerRollNumber"
                    value={formData.buyerRollNumber}
                    onChange={handleChange}
                    placeholder="e.g., 21CS01"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Buyer Phone Number</label>
                <input
                  type="tel"
                  name="buyerPhone"
                  value={formData.buyerPhone}
                  onChange={handleChange}
                  placeholder="Enter buyer's phone number"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <User size={20} />
              Seller Information (You)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Seller Name</label>
                <input
                  type="text"
                  name="sellerName"
                  value={formData.sellerName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none transition-colors"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Seller Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" size={20} />
                  <input
                    type="text"
                    name="sellerRollNumber"
                    value={formData.sellerRollNumber}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none transition-colors"
                    readOnly
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sale Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
              <Calendar size={20} />
              Sale Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Sale Date</label>
                <input
                  type="date"
                  name="saleDate"
                  value={formData.saleDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-green-400 focus:outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm font-semibold mb-2">Payment Method</label>
                <select
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-green-400 focus:outline-none transition-colors"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-white/70 text-sm font-semibold mb-2">Additional Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional details about the sale..."
                  rows="3"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-white/30 focus:border-green-400 focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 border border-white/20 text-white rounded-xl font-semibold hover:bg-white/10 transition-all duration-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-bold hover:shadow-lg hover:shadow-yellow-400/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Record Sale
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
