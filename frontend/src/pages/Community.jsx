import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Post from '../components/Post';
import Core from '../components/core';
import { Image, Search, X, Users, MapPin, SearchCheck } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/community';
const PRODUCTS_API_URL = 'http://localhost:5000/api/products';

export default function Community() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [myProducts, setMyProducts] = useState([]);
  const [linkedProductId, setLinkedProductId] = useState('');
  const [postType, setPostType] = useState('general'); // 'general' | 'lostfound'
  const [lostFoundStatus] = useState('lost'); // fixed — Found posts can no longer be created
  const [location, setLocation] = useState('');
  const [boardFilter, setBoardFilter] = useState('all'); // 'all' | 'general' | 'lostfound'

  const userId = localStorage.getItem('userId');
  const userData = JSON.parse(localStorage.getItem('userData') || '{}');

  // Filter posts based on search query and the General / Lost & Found tab
  const filteredPosts = posts.filter((post) => {
    if (boardFilter !== 'all' && (post.type || 'general') !== boardFilter) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const titleText = (post.title || '').toLowerCase();
    const contentText = (post.content || '').toLowerCase();
    return titleText.includes(q) || contentText.includes(q);
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`${PRODUCTS_API_URL}/seller/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        const available = Array.isArray(data) ? data.filter((p) => p.status === 'AVAILABLE') : [];
        setMyProducts(available);
      })
      .catch((err) => console.error('Error fetching your listings:', err));
  }, [userId]);

  const handleViewProduct = (productId) => {
    navigate(`/dealing?productId=${productId}`);
  };

  const fetchPosts = async () => {
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`${API_URL}?t=${timestamp}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching community posts:', err);
      setError('Failed to load community posts');
    }
  };

  const isLostFound = postType === 'lostfound';

  const handleSubmit = async () => {
    if (!userId) {
      alert('Please login to post');
      return;
    }
    // Lost & Found posts don't require a photo — not every lost item has one.
    if (!title || (!isLostFound && !imageFile)) {
      alert(isLostFound ? 'Please provide a title for the item.' : 'Please provide product name and upload an image');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('title', title);
      formData.append('content', content);
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (linkedProductId) {
        formData.append('productId', linkedProductId);
      }
      if (isLostFound) {
        formData.append('type', 'lostfound');
        formData.append('lostFoundStatus', lostFoundStatus);
        formData.append('location', location);
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      if (!res.ok) {
        throw new Error('Failed to post to community');
      }

      setTitle('');
      setImageFile(null);
      setImagePreview('');
      setContent('');
      setLinkedProductId('');
      setLocation('');
      await fetchPosts();
      alert('Posted to community and notified all users!');
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContactOwner = async (postId) => {
    const token = localStorage.getItem('token');
    if (!userId || !token) {
      alert('Please login to contact the owner.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${postId}/contact`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch contact info');
      }
      alert(`Contact ${data.username}${data.phone ? ` at ${data.phone}` : ' — no phone number on file, try commenting on the post instead.'}`);
    } catch (err) {
      console.error('Contact owner error:', err);
      alert(err.message);
    }
  };

  const handleResolve = async (postId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/${postId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        throw new Error('Failed to mark post as resolved');
      }
      setPosts((prev) => prev.map((p) =>
        p._id === postId ? { ...p, lostFoundStatus: 'resolved' } : p
      ));
    } catch (err) {
      console.error('Resolve post error:', err);
      setError(err.message);
    }
  };

  const handleDelete = async (postId) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        throw new Error('Failed to delete post');
      }
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      console.error('Delete post error:', err);
      setError(err.message);
    }
  };

  const handleLike = async (postId) => {
    if (!userId) {
      alert('Please login to like posts');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ userId })
      });
      if (!res.ok) {
        throw new Error('Failed to like post');
      }
      const data = await res.json();
      setPosts((prev) => prev.map((p) => 
        p._id === postId ? { ...p, likes: data.likes } : p
      ));
    } catch (err) {
      console.error('Like post error:', err);
    }
  };

  const handleComment = async (postId, text) => {
    if (!userId) {
      alert('Please login to comment');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${postId}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ userId, text })
      });
      if (!res.ok) {
        throw new Error('Failed to add comment');
      }
      const data = await res.json();
      setPosts((prev) => prev.map((p) => 
        p._id === postId ? { ...p, comments: [...(p.comments || []), data.comment] } : p
      ));
    } catch (err) {
      console.error('Comment error:', err);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-3xl mx-auto">

        {/* Render the Core animation component */}
        <Core />

        {/* The rest of the Community component code */}
        <div className="text-center mb-12 parallax-element animate-fadeInUp">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 mb-4">
            <Users size={14} className="text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-300 tracking-wide uppercase">Community Board</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-wide leading-tight mb-4 parallax-element bg-gradient-to-r from-white via-white to-yellow-200 bg-clip-text text-transparent">
            Campus Community Board
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-2xl mx-auto parallax-element">
            Connect with your peers. Post requests, share tips, and build a stronger community.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8 animate-fadeInUp">
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-yellow-400 transition-colors" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or description..."
                className="premium-input w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-400 mt-2">
              Found {filteredPosts.length} product{filteredPosts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Board Filter Tabs */}
        <div className="flex gap-2 mb-6 animate-fadeInUp">
          {[
            { key: 'all', label: 'All Posts' },
            { key: 'general', label: 'General' },
            { key: 'lostfound', label: 'Lost & Found' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setBoardFilter(tab.key)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                boardFilter === tab.key
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Post Creation Section */}
        <div className="bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 rounded-2xl p-6 mb-8 backdrop-blur-sm shadow-xl animate-fadeInUp">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/40 text-red-200 rounded-lg text-sm animate-fadeIn">
              {error}
            </div>
          )}

          {/* Post Type Toggle */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPostType('general')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-3 font-semibold border transition-all duration-200 ${
                !isLostFound
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Users size={16} /> General Post
            </button>
            <button
              type="button"
              onClick={() => setPostType('lostfound')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-3 font-semibold border transition-all duration-200 ${
                isLostFound
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <SearchCheck size={16} /> Lost &amp; Found
            </button>
          </div>

          {isLostFound && (
            <div className="mb-4 animate-fadeIn">
              <label className="text-sm text-gray-400 mb-2 block">Last Seen Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="premium-input w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-10 text-white placeholder-gray-500 focus:outline-none"
                  placeholder="e.g. Library, Block C canteen"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{isLostFound ? 'Item Name' : 'Product Name'}</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="premium-input w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-500 focus:outline-none"
                placeholder={isLostFound ? 'e.g. Black umbrella' : 'Enter product name'}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">{isLostFound ? 'Photo (optional)' : 'Product Image'}</label>
              <div className="relative">
                <label
                  htmlFor="community-image-upload"
                  className="group flex items-center justify-center w-full bg-white/[0.02] rounded-xl p-3 text-gray-500 cursor-pointer transition-all duration-300 border-2 border-dashed border-white/15 hover:border-yellow-400/60 hover:bg-yellow-400/[0.03]"
                >
                  <Image size={18} className="mr-2 text-yellow-400 transition-transform duration-300 group-hover:scale-110" />
                  <span className="truncate">{imageFile ? imageFile.name : 'Click to upload image'}</span>
                </label>
                <input
                  id="community-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-4 animate-card-enter">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-white/10 group">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 hover:scale-110 transition-all"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <label className="text-sm text-gray-400 mb-2 block">Description (optional)</label>
          <textarea
            className="premium-input w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none"
            rows="4"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add details..."
          />

          {!isLostFound && myProducts.length > 0 && (
            <div className="mt-4">
              <label className="text-sm text-gray-400 mb-2 block">Link to your listing (optional)</label>
              <select
                value={linkedProductId}
                onChange={(e) => setLinkedProductId(e.target.value)}
                className="premium-input w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none"
              >
                <option value="" className="bg-gray-900">None</option>
                {myProducts.map((p) => (
                  <option key={p._id} value={p._id} className="bg-gray-900">
                    {p.title} — ₹{p.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="premium-btn bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-2.5 px-6 rounded-full text-sm shadow-md shadow-yellow-500/20 disabled:opacity-60"
            >
              {loading ? 'Posting...' : isLostFound ? 'Report Lost & Found' : 'Post to Community'}
            </button>
          </div>
        </div>

        {/* Community Feed */}
        <div className="space-y-6">
          {filteredPosts.length === 0 ? (
            <div className="flex flex-col items-center text-center text-gray-400 py-12 animate-fadeIn">
              <Users size={36} className="mb-3 text-gray-600" />
              {searchQuery ? 'No products match your search.' : 'No community posts yet.'}
            </div>
          ) : (
            filteredPosts.map((post, idx) => (
              <div key={post._id} style={{ animationDelay: `${Math.min(idx, 6) * 60}ms` }} className="animate-card-enter">
                <Post
                  postId={post._id}
                  user={{ name: post.username || 'User' }}
                  content={post.content}
                  title={post.title}
                  imageUrl={post.imageUrl}
                  time={new Date(post.createdAt).toLocaleString()}
                  likes={post.likes || []}
                  comments={post.comments || []}
                  canDelete={userId === String(post.userId)}
                  onDelete={() => handleDelete(post._id)}
                  onLike={handleLike}
                  onComment={handleComment}
                  currentUserId={userId}
                  product={post.productId && typeof post.productId === 'object' ? post.productId : null}
                  onViewProduct={handleViewProduct}
                  type={post.type}
                  lostFoundStatus={post.lostFoundStatus}
                  location={post.location}
                  onResolve={() => handleResolve(post._id)}
                  onContactOwner={() => handleContactOwner(post._id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}