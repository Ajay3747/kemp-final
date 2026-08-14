import React, { useState } from 'react';
import { Camera, Image, Tag, DollarSign, Text, FileText, Compass, Send, X, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, ShieldOff, Package, Plus, Layers } from 'lucide-react';

const API_URL = "http://localhost:5000/api/products";

// ── Human-photo detection (listing images) ──────────────────────────────
const VERIFICATION_FAILED_REASON = "We couldn't verify this image. Please try again.";

// Runs the backend's image moderation precheck for a single file so the
// user finds out immediately after picking a photo, not after submitting
// the whole listing. This is UX only — the real gate is the backend
// re-checking the actual submitted file in createProduct, so a rejected
// image can't be forced through by skipping this call. Never throws:
// network/timeout failures resolve to a blocking "error" status rather
// than silently letting the image through.
async function moderateImageFile(file) {
  try {
    const form = new FormData();
    form.append('image', file);

    const response = await fetch(`${API_URL}/moderate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: form
    });

    const data = await response.json().catch(() => ({}));

    // A non-2xx here means the precheck itself couldn't run (bad request,
    // auth issue, server error) — not that the backend evaluated the image
    // and rejected it. Treat it the same as a network failure: fail-safe,
    // never let the image through silently.
    if (!response.ok) {
      return { status: 'error', humanDetected: false, reason: VERIFICATION_FAILED_REASON };
    }

    if (data.allowed) {
      return { status: 'valid', humanDetected: false, reason: null };
    }

    // The precheck endpoint always responds 200, even when the moderation
    // provider itself was unreachable/unconfigured (code: SERVICE_UNAVAILABLE,
    // see imageModerationService.js) — that's a verification failure, not a
    // content rejection, so it needs to be routed to the same "error" bucket
    // as a network failure (fail-safe: still blocks submission either way).
    if (data.code === 'SERVICE_UNAVAILABLE') {
      return { status: 'error', humanDetected: false, reason: data.reason || VERIFICATION_FAILED_REASON };
    }

    return {
      status: 'rejected',
      humanDetected: Boolean(data.humanDetected),
      reason: data.reason || 'This image is not allowed for marketplace listings.'
    };
  } catch (err) {
    return { status: 'error', humanDetected: false, reason: VERIFICATION_FAILED_REASON };
  }
}

// Uses the app's existing alert() pattern (already used elsewhere in this
// form, e.g. the success message) rather than introducing a new toast
// library for a single feature.
function alertHumanDetected(reason) {
  alert(`🚫 Human image detected\n\n${reason}`);
}

function alertVerificationFailed(reason) {
  alert(`⚠️ Image verification failed\n\n${reason}`);
}

const categories = [
  'Books', 'Electronics', 'Dorm Essentials', 'Furniture', 'Apparel', 'Services', 'Other'
];

const MAX_BUNDLE_ITEMS = 10;

function makeEmptyBundleItem() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: '',
    description: '',
    price: '',
    image: null // { file, status: 'checking'|'valid'|'rejected'|'error', reason }
  };
}

export default function SellingForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: '',
    condition: 'used',
    warrantyAvailable: false,
    warrantyDuration: '',
    images: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Bundle/lot: sell multiple items together as one listing, each with its
  // own photo and price, priced as the sum of its items.
  const [isBundle, setIsBundle] = useState(false);
  const [bundleItems, setBundleItems] = useState([makeEmptyBundleItem(), makeEmptyBundleItem()]);

  const bundleTotal = bundleItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  const addBundleItem = () => {
    setBundleItems((prev) => (prev.length >= MAX_BUNDLE_ITEMS ? prev : [...prev, makeEmptyBundleItem()]));
  };

  const removeBundleItem = (id) => {
    setBundleItems((prev) => (prev.length <= 2 ? prev : prev.filter((item) => item.id !== id)));
  };

  const updateBundleItem = (id, field, value) => {
    setBundleItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleBundleItemImageChange = (id, file) => {
    if (!file) return;
    updateBundleItem(id, 'image', { file, status: 'checking', reason: null });

    moderateImageFile(file).then((result) => {
      setBundleItems((prev) => prev.map((item) => (
        item.id === id && item.image?.file === file ? { ...item, image: { file, ...result } } : item
      )));

      if (result.status === 'rejected' && result.humanDetected) {
        alertHumanDetected(result.reason);
      } else if (result.status === 'error') {
        alertVerificationFailed(result.reason);
      }
    });
  };

  const isCheckingBundleImages = bundleItems.some((item) => item.image?.status === 'checking');
  const hasBlockedBundleImages = bundleItems.some((item) => item.image?.status === 'rejected' || item.image?.status === 'error');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newEntries = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'checking', // 'checking' | 'valid' | 'rejected' | 'error'
      reason: null
    }));

    setFormData(prev => ({ ...prev, images: [...prev.images, ...newEntries] }));

    newEntries.forEach((entry) => {
      moderateImageFile(entry.file).then((result) => {
        setFormData(prev => ({
          ...prev,
          images: prev.images.map((img) => (img.id === entry.id ? { ...img, ...result } : img))
        }));

        if (result.status === 'rejected' && result.humanDetected) {
          alertHumanDetected(result.reason);
        } else if (result.status === 'error') {
          alertVerificationFailed(result.reason);
        }
      });
    });

    // Allow re-selecting the same file after it's removed
    e.target.value = '';
  };

  const setWarrantyAvailable = (available) => {
    setFormData(prev => ({
      ...prev,
      warrantyAvailable: available,
      warrantyDuration: available ? prev.warrantyDuration : ''
    }));
  };

  const handleDeleteImage = (id) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((img) => img.id !== id)
    }));
  };

  const isCheckingImages = formData.images.some((img) => img.status === 'checking');
  const hasBlockedImages = formData.images.some((img) => img.status === 'rejected' || img.status === 'error');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    // Get user data from localStorage
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      setError('User not authenticated. Please log in again.');
      return;
    }

    if (!formData.title || !formData.description || !formData.category) {
      setError('All fields are required');
      return;
    }

    if (formData.warrantyAvailable && !formData.warrantyDuration.trim()) {
      setError('Please enter the warranty duration (e.g. "6 months").');
      return;
    }

    if (isBundle) {
      if (isCheckingBundleImages) {
        setError('Please wait for bundle item image verification to finish.');
        return;
      }
      if (hasBlockedBundleImages) {
        setError('Remove the flagged bundle item image(s) before submitting.');
        return;
      }
      const incomplete = bundleItems.some((item) => !item.title.trim() || !item.price || Number(item.price) <= 0 || !item.image || item.image.status !== 'valid');
      if (incomplete) {
        setError('Every bundle item needs a title, a price greater than 0, and a verified photo.');
        return;
      }
    } else {
      if (isCheckingImages) {
        setError('Please wait for image verification to finish.');
        return;
      }
      if (hasBlockedImages) {
        setError('Remove the flagged image(s) before submitting your listing.');
        return;
      }
    }

    setLoading(true);

    try {
      const form = new FormData();
      form.append('title', formData.title);
      form.append('description', formData.description);
      form.append('category', formData.category);
      form.append('condition', formData.condition);
      form.append('sellerId', userId);
      form.append('warrantyAvailable', formData.warrantyAvailable ? 'true' : 'false');
      if (formData.warrantyAvailable) {
        form.append('warrantyDuration', formData.warrantyDuration.trim());
      }

      if (isBundle) {
        form.append('isBundle', 'true');
        form.append('bundleItems', JSON.stringify(bundleItems.map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          price: item.price
        }))));
        bundleItems.forEach((item) => form.append('bundleImages', item.image.file));
      } else {
        form.append('price', formData.price);
        if (formData.images.length > 0) {
          form.append('image', formData.images[0].file);
        }
      }

      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: form
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create listing');
      }

      const data = await response.json();
      console.log('Product listed:', data);
      
      setSuccess(true);
      setError("");
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: 0,
        category: '',
        condition: 'used',
        warrantyAvailable: false,
        warrantyDuration: '',
        images: []
      });
      setIsBundle(false);
      setBundleItems([makeEmptyBundleItem(), makeEmptyBundleItem()]);

      // Show success message
      alert('Item listed successfully! It will appear in the Dealing page.');
      
      // Clear success after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error creating listing:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = "premium-input w-full bg-white/5 border border-white/10 text-white rounded-xl p-4 focus:outline-none placeholder-gray-500";
  const labelStyle = "block text-white font-semibold text-lg mb-2 flex items-center";
  const iconStyle = "text-yellow-400 mr-2";
  const sectionStyle = "bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 sm:p-8 mb-8 backdrop-blur-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-xl text-red-200 animate-fadeIn">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-500/10 border border-green-500/40 rounded-xl text-green-200 animate-fadeIn">
          ✓ Item listed successfully! It will appear in the Dealing page.
        </div>
      )}

      {/* Basic Information */}
      <div className={sectionStyle}>
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-6">Product Details</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="title" className={labelStyle}><Tag size={20} className={iconStyle} />Item Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., 'Thermodynamics Textbook'"
              className={inputStyle}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="description" className={labelStyle}><Text size={20} className={iconStyle} />Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              placeholder="Describe the item, its condition, and any key features."
              className={inputStyle}
              required
              disabled={loading}
            ></textarea>
          </div>

          <div>
            <label className={labelStyle}><Layers size={20} className={iconStyle} />List as a Bundle/Lot?</label>
            <p className="text-gray-400 text-sm mb-3">Sell several items together as one listing (e.g. a move-out lot) — each item gets its own photo and price.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsBundle(false)}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 ${
                  !isBundle
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                Single Item
              </button>
              <button
                type="button"
                onClick={() => setIsBundle(true)}
                disabled={loading}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 ${
                  isBundle
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <Package size={18} /> Bundle/Lot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing and Category */}
      <div className={sectionStyle}>
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-6">Categorization</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className={labelStyle}><Compass size={20} className={iconStyle} />Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`${inputStyle} appearance-none pr-8 cursor-pointer`}
              required
              disabled={loading}
            >
              <option value="" disabled>Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="price" className={labelStyle}><DollarSign size={20} className={iconStyle} />{isBundle ? 'Bundle Total (₹)' : 'Price (₹)'}</label>
            {isBundle ? (
              <div className={`${inputStyle} bg-white/[0.03] text-yellow-400 font-bold`}>
                ₹{bundleTotal.toLocaleString()}
                <span className="block text-gray-500 font-normal text-sm mt-1">Auto-calculated from item prices below</span>
              </div>
            ) : (
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 499"
                className={inputStyle}
                required
                disabled={loading}
              />
            )}
          </div>
        </div>

        {/* Condition */}
        <div className="mt-6">
          <label htmlFor="condition" className={labelStyle}><FileText size={20} className={iconStyle} />Condition</label>
          <select
            id="condition"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            className={`${inputStyle} appearance-none pr-8 cursor-pointer`}
            disabled={loading}
          >
            <option value="new" className="bg-gray-900">New</option>
            <option value="like-new" className="bg-gray-900">Like New</option>
            <option value="used" className="bg-gray-900">Used</option>
            <option value="fair" className="bg-gray-900">Fair</option>
          </select>
        </div>

        {/* Warranty */}
        <div className="mt-6">
          <label className={labelStyle}><ShieldCheck size={20} className={iconStyle} />Warranty Available?</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWarrantyAvailable(true)}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 ${
                formData.warrantyAvailable
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <ShieldCheck size={18} /> Yes
            </button>
            <button
              type="button"
              onClick={() => setWarrantyAvailable(false)}
              disabled={loading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 ${
                !formData.warrantyAvailable
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <ShieldOff size={18} /> No
            </button>
          </div>

          {formData.warrantyAvailable && (
            <div className="mt-4 animate-fadeIn">
              <label htmlFor="warrantyDuration" className={labelStyle}>Warranty Duration</label>
              <input
                type="text"
                id="warrantyDuration"
                name="warrantyDuration"
                value={formData.warrantyDuration}
                onChange={handleChange}
                placeholder="e.g., '6 months', '1 year'"
                className={inputStyle}
                required
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Image Upload */}
      {!isBundle && (
      <div className={sectionStyle}>
        <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-6">Item Photos</h2>
        <p className="text-gray-400 mb-4">Add high-quality photos to attract buyers.</p>
        <div className={`group border-2 border-dashed border-white/15 bg-white/[0.02] rounded-xl p-8 text-center transition-all duration-300 hover:border-yellow-400/60 hover:bg-yellow-400/[0.03] ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          <label htmlFor="image-upload" className={loading ? 'cursor-not-allowed' : 'cursor-pointer'}>
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400/10 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                <Image size={28} className="text-yellow-400" />
              </div>
              <span className="text-lg font-bold text-white mb-1">Drag &amp; Drop or Click to Upload</span>
              <span className="text-sm text-gray-500">Maximum 5 images (First image will be thumbnail)</span>
            </div>
            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
              disabled={loading}
            />
          </label>
        </div>

        {/* Image Preview */}
        {formData.images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
            {formData.images.map((img, index) => {
              const isRejected = img.status === 'rejected' || img.status === 'error';
              const borderClass = isRejected
                ? 'border-red-500/70'
                : img.status === 'valid'
                  ? 'border-green-500/50'
                  : 'border-white/10';

              return (
                <div key={img.id} className="animate-card-enter flex flex-col gap-1.5">
                  <div className={`relative aspect-video rounded-xl overflow-hidden shadow-lg border group ${borderClass}`}>
                    <img
                      src={URL.createObjectURL(img.file)}
                      alt={`Preview ${index + 1}`}
                      className={`w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110 ${isRejected ? 'opacity-50' : ''}`}
                    />
                    {index === 0 && (
                      <span className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs px-2 py-1 rounded-full font-bold shadow">Main</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>

                    {img.status === 'checking' && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold">
                        <Loader2 size={20} className="animate-spin text-yellow-400" />
                        Checking image...
                      </div>
                    )}
                    {img.status === 'valid' && (
                      <span className="absolute bottom-2 right-2 bg-green-500/90 text-white rounded-full p-1 shadow">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                  </div>

                  {isRejected && (
                    <p className="flex items-start gap-1.5 text-xs text-red-300 leading-snug">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {img.reason || 'This image was not accepted.'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {hasBlockedImages && (
          <p className="mt-4 text-sm text-red-300">
            One or more images were flagged and can't be used. Remove them or choose different photos to continue.
          </p>
        )}
      </div>
      )}

      {/* Bundle Items */}
      {isBundle && (
      <div className={sectionStyle}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-yellow-400">Bundle Items</h2>
          <button
            type="button"
            onClick={addBundleItem}
            disabled={loading || bundleItems.length >= MAX_BUNDLE_ITEMS}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 disabled:opacity-50"
          >
            <Plus size={16} /> Add Item
          </button>
        </div>
        <p className="text-gray-400 mb-6">Add at least 2 items — each needs its own title, price, and photo.</p>

        <div className="space-y-6">
          {bundleItems.map((item, index) => {
            const img = item.image;
            const isRejected = img && (img.status === 'rejected' || img.status === 'error');
            const borderClass = isRejected ? 'border-red-500/70' : img?.status === 'valid' ? 'border-green-500/50' : 'border-white/10';

            return (
              <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">Item {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeBundleItem(item.id)}
                    disabled={loading || bundleItems.length <= 2}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-400"
                  >
                    <X size={14} /> Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateBundleItem(item.id, 'title', e.target.value)}
                      placeholder="Item name, e.g. 'Study Lamp'"
                      className={inputStyle}
                      disabled={loading}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateBundleItem(item.id, 'price', e.target.value)}
                      placeholder="Item price (₹)"
                      className={inputStyle}
                      disabled={loading}
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateBundleItem(item.id, 'description', e.target.value)}
                      rows="2"
                      placeholder="Short description (optional)"
                      className={inputStyle}
                      disabled={loading}
                    />
                  </div>

                  <div>
                    {img ? (
                      <div className={`relative aspect-video rounded-xl overflow-hidden shadow-lg border group ${borderClass}`}>
                        <img
                          src={URL.createObjectURL(img.file)}
                          alt={item.title || `Bundle item ${index + 1}`}
                          className={`w-full h-full object-cover ${isRejected ? 'opacity-50' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateBundleItem(item.id, 'image', null)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg hover:scale-110"
                          title="Remove photo"
                        >
                          <X size={16} />
                        </button>
                        {img.status === 'checking' && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 text-white text-xs font-semibold">
                            <Loader2 size={20} className="animate-spin text-yellow-400" />
                            Checking image...
                          </div>
                        )}
                        {img.status === 'valid' && (
                          <span className="absolute bottom-2 right-2 bg-green-500/90 text-white rounded-full p-1 shadow">
                            <CheckCircle2 size={14} />
                          </span>
                        )}
                      </div>
                    ) : (
                      <label
                        htmlFor={`bundle-image-${item.id}`}
                        className={`group flex items-center justify-center w-full h-full min-h-[8rem] bg-white/[0.02] rounded-xl text-gray-500 border-2 border-dashed border-white/15 hover:border-yellow-400/60 hover:bg-yellow-400/[0.03] ${loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <div className="flex flex-col items-center">
                          <Image size={22} className="text-yellow-400 mb-1.5" />
                          <span className="text-sm">Upload photo</span>
                        </div>
                        <input
                          id={`bundle-image-${item.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => handleBundleItemImageChange(item.id, e.target.files[0])}
                        />
                      </label>
                    )}
                    {isRejected && (
                      <p className="flex items-start gap-1.5 text-xs text-red-300 leading-snug mt-1.5">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                        {img.reason || 'This image was not accepted.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end items-baseline gap-2">
          <span className="text-gray-400">Bundle Total:</span>
          <span className="text-2xl font-bold text-yellow-400">₹{bundleTotal.toLocaleString()}</span>
        </div>
      </div>
      )}

      {/* Submit Button */}
      {(() => {
        const checkingImages = isBundle ? isCheckingBundleImages : isCheckingImages;
        const blockedImages = isBundle ? hasBlockedBundleImages : hasBlockedImages;
        const disabled = loading || checkingImages || blockedImages;
        return (
          <div className="text-center">
            <button
              type="submit"
              disabled={disabled}
              className={`premium-btn font-bold py-4 px-12 rounded-full text-lg shadow-lg flex items-center justify-center mx-auto ${
                disabled
                  ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-yellow-500/25'
              }`}
            >
              {checkingImages ? (
                <Loader2 size={20} className="mr-3 animate-spin" />
              ) : (
                <Send size={20} className="mr-3" />
              )}
              {loading ? 'Listing Item...' : checkingImages ? 'Checking Images...' : isBundle ? 'List Bundle Now' : 'List Item Now'}
            </button>
          </div>
        );
      })()}
    </form>
  );
}