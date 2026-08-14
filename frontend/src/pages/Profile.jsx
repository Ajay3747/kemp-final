import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserProfile from '../components/UserProfile';
import ItemCard from '../components/ItemCard';
import SaleRecordModal from '../components/SaleRecordModal';
import { ShoppingBag, Star, LayoutDashboard, LogOut, Edit2, TrendingUp, Bell, BellOff, ClipboardList, User, Mail, Phone, Calendar, Hash, Building2, Award, X, ShieldCheck, ShieldOff, Droplet, MessageCircle, RotateCcw, Clock } from 'lucide-react';
import { getPushSubscriptionStatus, enablePushNotifications, disablePushNotifications } from '../utils/pushApi';

const API_URL = "http://localhost:5000/api";

export default function Profile() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [userListings, setUserListings] = useState([]);
  const [expiredListings, setExpiredListings] = useState([]);
  const [relistingId, setRelistingId] = useState(null);
  const [userPurchases, setUserPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [idCardUrl, setIdCardUrl] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking'); // 'checking' | 'unsupported' | 'not-subscribed' | 'subscribed'
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState('');
  const [editingWarrantyProduct, setEditingWarrantyProduct] = useState(null);
  const [warrantyDraft, setWarrantyDraft] = useState({ available: false, duration: '' });
  const [savingWarranty, setSavingWarranty] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // CHECK AUTHENTICATION FIRST
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        const storedUserData = localStorage.getItem('userData');
        
        console.log('Auth check - Token:', !!token, 'UserId:', !!userId, 'UserData:', !!storedUserData);
        
        // If no token or userId, user is not logged in - redirect to login
        if (!token || !userId || !storedUserData) {
          console.warn('No authentication found. Redirecting to login.');
          setLoading(false);
          setTimeout(() => navigate('/'), 500);
          return;
        }

        setIsAuthenticated(true);

        const isAdmin = localStorage.getItem('isAdmin');

        // Prevent admin from accessing user profile
        if (isAdmin === 'true') {
          console.warn('Admin cannot access user profile');
          setLoading(false);
          setTimeout(() => navigate('/admin-dashboard'), 500);
          return;
        }

        // Get stored data
        try {
          const parsedData = JSON.parse(storedUserData);
          console.log('Parsed user data:', parsedData);
          setUserData(parsedData);
        } catch (parseError) {
          console.error('Error parsing stored data:', parseError);
          setError('Failed to parse user data');
          setLoading(false);
          return;
        }

        // Fetch complete user data including ID card
        try {
          const userResponse = await fetch(`${API_URL}/auth/user/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (userResponse.ok) {
            const fullUserData = await userResponse.json();
            console.log('Full user data fetched:', fullUserData);
            setUserData(fullUserData);
            if (fullUserData.idCardUrl) {
              setIdCardUrl(fullUserData.idCardUrl);
            }
          } else {
            console.warn('Failed to fetch full user data:', userResponse.status);
          }
        } catch (userErr) {
          console.error('Error fetching full user data:', userErr);
        }

        // Fetch user profile from backend
        try {
          const profileResponse = await fetch(`${API_URL}/products/profile/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            console.log('User profile fetched:', profile);
            setProfileData(profile);
          } else {
            console.warn('Failed to fetch profile:', profileResponse.status);
          }
        } catch (profileErr) {
          console.error('Error fetching profile:', profileErr);
        }

        // Fetch user's listings
        // Fetch user's listings
        try {
          const listingsResponse = await fetch(`${API_URL}/products/seller/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (listingsResponse.ok) {
            const listings = await listingsResponse.json();
            setUserListings(Array.isArray(listings) ? listings : []);
        // End listings fetch
          }
        } catch (listingsErr) {
          console.error('Error fetching listings:', listingsErr);
        }

        // Fetch listings that auto-expired after 30 days (eligible for relist)
        try {
          const expiredResponse = await fetch(`${API_URL}/products/seller/${userId}/expired`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (expiredResponse.ok) {
            const expired = await expiredResponse.json();
            setExpiredListings(Array.isArray(expired) ? expired : []);
          }
        } catch (expiredErr) {
          console.error('Error fetching expired listings:', expiredErr);
        }

        // Fetch unread notifications count
        try {
          const notifResponse = await fetch(`${API_URL}/notifications/unread/${userId}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (notifResponse.ok) {
            const data = await notifResponse.json();
            console.log('Unread notifications:', data.count);
            setUnreadNotifications(data.count);
          }
        } catch (notifErr) {
          console.error('Error fetching notifications:', notifErr);
        }

        setLoading(false);

      } catch (err) {
        console.error('Error in fetchUserData:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    navigate('/');
  };

  // Reuses the existing bloodGroup field only for display — this never
  // reads or writes it. Only ever updates the caller's own account (the
  // backend derives the user id from the auth token, not from anything
  // sent here).
  const handleSetDonationAvailability = async (available) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to update this setting.');
      return;
    }

    setSavingAvailability(true);
    try {
      const response = await fetch(`${API_URL}/auth/donation-availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ donationAvailability: available })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update donation availability');
      }

      setUserData((prev) => ({ ...prev, donationAvailability: data.donationAvailability }));
    } catch (err) {
      alert('Failed to update donation availability: ' + err.message);
    } finally {
      setSavingAvailability(false);
    }
  };

  useEffect(() => {
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleEnablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      await enablePushNotifications();
      setPushStatus('subscribed');
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    setPushError('');
    try {
      await disablePushNotifications();
      setPushStatus('not-subscribed');
    } catch (err) {
      setPushError(err.message);
    } finally {
      setPushBusy(false);
    }
  };

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setIsSaleModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsSaleModalOpen(false);
    setSelectedProduct(null);
  };

  // Delete product from user listings
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to delete a product.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete product');
      }
      setUserListings((prev) => prev.filter((p) => p._id !== productId));
      alert('Product deleted successfully!');
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  };

  const handleRelistProduct = async (productId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to relist a product.');
      return;
    }
    setRelistingId(productId);
    try {
      const response = await fetch(`${API_URL}/products/${productId}/relist`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to relist product');
      }
      setExpiredListings((prev) => prev.filter((p) => p._id !== productId));
      setUserListings((prev) => [data.product, ...prev]);
    } catch (err) {
      alert('Failed to relist product: ' + err.message);
    } finally {
      setRelistingId(null);
    }
  };

  const openWarrantyEditor = (product) => {
    setEditingWarrantyProduct(product);
    setWarrantyDraft({
      available: Boolean(product.warrantyAvailable),
      duration: product.warrantyDuration || ''
    });
  };

  const closeWarrantyEditor = () => {
    setEditingWarrantyProduct(null);
    setWarrantyDraft({ available: false, duration: '' });
  };

  const handleSaveWarranty = async () => {
    if (warrantyDraft.available && !warrantyDraft.duration.trim()) {
      alert('Please enter the warranty duration (e.g. "6 months").');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to update a listing.');
      return;
    }

    setSavingWarranty(true);
    try {
      const response = await fetch(`${API_URL}/products/${editingWarrantyProduct._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          warrantyAvailable: warrantyDraft.available,
          warrantyDuration: warrantyDraft.available ? warrantyDraft.duration.trim() : ''
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update warranty information');
      }

      setUserListings((prev) => prev.map((p) => (p._id === data.product._id ? data.product : p)));
      closeWarrantyEditor();
    } catch (err) {
      alert('Failed to update warranty information: ' + err.message);
    } finally {
      setSavingWarranty(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="text-center">
          <p className="text-lg mb-4">You must be logged in to view your profile.</p>
          <p className="text-gray-400 mb-6">Redirecting to login page...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070b18] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 bg-red-500/20 border border-red-500 rounded-lg text-red-200 mb-6">
            Error: {error}
          </div>
          <button
            onClick={() => navigate('/')}
            className="premium-btn px-6 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400/20"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-[#070b18] text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="p-6 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-200 mb-6">
            User data not available.
          </div>
          <button
            onClick={() => navigate('/')}
            className="premium-btn px-6 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400/20"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070b18] via-[#0a0e1f] to-[#070b18] text-white">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-yellow-400/10 to-amber-500/10 border-b border-white/10 p-6 backdrop-blur-xl sticky top-16 z-10 shadow-lg shadow-yellow-500/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">My Profile</h1>
            <p className="text-white/60 mt-2 font-medium">Manage your listings and account settings</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/my-orders')}
              className="premium-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400/20 hover:shadow-yellow-400/40"
            >
              <ClipboardList size={20} />
              <span className="hidden sm:inline">My Orders</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="premium-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400\20 hover:shadow-yellow-400/40"
            >
              <MessageCircle size={20} />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => navigate('/notifications')}
              className="premium-btn relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400/20 hover:shadow-yellow-400/40"
            >
              <Bell size={20} />
              <span className="hidden sm:inline">Notifications</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/50">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="premium-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-xl font-semibold shadow-md shadow-red-500/20 hover:shadow-red-500/40"
            >
              <LogOut size={20} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* User Info Card with Profile Avatar */}
        <div className="animate-fadeInUp bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-yellow-500/5 hover:border-yellow-400/30 transition-all duration-500">
          {/* Profile Header Section */}
          <div className="flex flex-col lg:flex-row gap-8 mb-8">
            {/* Avatar Section */}
            <div className="flex flex-col items-center lg:items-start">
              <div className="relative group cursor-default">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 p-1 shadow-lg shadow-yellow-400/30 transition-transform duration-300 group-hover:scale-105">
                  <div className="w-full h-full rounded-full bg-[#070b18] flex items-center justify-center text-5xl font-bold text-yellow-400">
                    {userData?.username?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-[#070b18] flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="mt-4 text-center lg:text-left">
                <h2 className="text-3xl font-bold text-white">{userData?.username}</h2>
                <p className="text-yellow-400 font-semibold mt-1">Campus Member</p>
              </div>
            </div>

            {/* User Details Grid */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10">
                <div className="bg-blue-500/20 p-2.5 rounded-lg">
                  <Mail className="text-blue-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Email Address</p>
                  <p className="text-white font-medium break-all">{userData?.collegeEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10">
                <div className="bg-purple-500/20 p-2.5 rounded-lg">
                  <Building2 className="text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Department</p>
                  <p className="text-white font-medium">{userData?.department}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10">
                <div className="bg-green-500/20 p-2.5 rounded-lg">
                  <Hash className="text-green-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Roll Number</p>
                  <p className="text-white font-medium">{userData?.rollNo || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10">
                <div className="bg-pink-500/20 p-2.5 rounded-lg">
                  <Phone className="text-pink-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Phone Number</p>
                  <p className="text-white font-medium">{userData?.phone || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10">
                <div className="bg-red-500/20 p-2.5 rounded-lg">
                  <Droplet className="text-red-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Blood Group</p>
                  <p className="text-white font-medium">{userData?.bloodGroup || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-xl border border-white/10 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10 md:col-span-2">
                <div className="bg-amber-500/20 p-2.5 rounded-lg">
                  <Calendar className="text-amber-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs font-semibold mb-1">Member Since</p>
                  <p className="text-white font-medium">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* ID Card Section */}
            <div className="lg:w-72">
              <p className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
                <Award size={18} className="text-yellow-400" />
                ID Card Verification
              </p>
              <div className="bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-xl p-3 overflow-hidden shadow-lg hover:border-yellow-400/30 hover:shadow-yellow-400/10 transition-all duration-300">
                {idCardUrl ? (
                  <img
                    src={idCardUrl}
                    alt="ID Card"
                    className="w-full h-auto rounded-lg object-contain max-h-64 hover:scale-105 transition-transform duration-300"
                    onLoad={(e) => {
                      console.log('ID card image loaded successfully');
                    }}
                    onError={(e) => {
                      console.error('ID card image failed to load');
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300x200?text=ID+Card+Not+Available';
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-white/40">
                    <Award size={40} className="mb-2" />
                    <p className="text-sm">ID Card Not Available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Blood Donation Availability */}
        <div className="animate-fadeInUp bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-red-500/5 hover:border-red-400/30 transition-all duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-500/20 p-2.5 rounded-lg">
              <Droplet className="text-red-400" size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Blood Donation Availability</h2>
              <p className="text-white/50 text-sm">
                Blood Group: <span className="text-white font-semibold">{userData?.bloodGroup || 'N/A'}</span>
              </p>
            </div>
          </div>
          <p className="text-white/50 text-sm mb-5 mt-2">
            Let campus admins know if you're currently willing to donate blood. This is optional — you can switch it off anytime, and it's shown to admins only, never on your public profile or listings.
          </p>

          <div className="flex gap-3 max-w-md">
            <button
              type="button"
              onClick={() => handleSetDonationAvailability(true)}
              disabled={savingAvailability}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 disabled:opacity-50 ${
                userData?.donationAvailability
                  ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent shadow-md shadow-red-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <ShieldCheck size={18} /> Available to Donate
            </button>
            <button
              type="button"
              onClick={() => handleSetDonationAvailability(false)}
              disabled={savingAvailability}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 disabled:opacity-50 ${
                !userData?.donationAvailability
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                  : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <ShieldOff size={18} /> Not Available
            </button>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="animate-fadeInUp bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-yellow-500/5 hover:border-yellow-400/30 transition-all duration-500">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-500/20 p-2.5 rounded-lg">
              <Bell className="text-yellow-400" size={22} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Push Notifications</h2>
              <p className="text-white/50 text-sm">Get deal updates, blood requests and warranty alerts even when KEMP isn't open</p>
            </div>
          </div>

          {pushStatus === 'unsupported' ? (
            <p className="text-white/50 text-sm mt-2">Not supported on this device/browser.</p>
          ) : (
            <>
              <p className="text-white/50 text-sm mb-5 mt-2">
                Your browser will ask for permission the first time you enable this. You can turn it off anytime.
              </p>
              {pushError && <p className="text-red-300 text-sm mb-4">{pushError}</p>}
              <div className="flex gap-3 max-w-md">
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushBusy || pushStatus === 'checking'}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 disabled:opacity-50 ${
                    pushStatus === 'subscribed'
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Bell size={18} /> Enabled
                </button>
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushBusy || pushStatus === 'checking'}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 font-semibold border transition-all duration-200 disabled:opacity-50 ${
                    pushStatus !== 'subscribed'
                      ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white border-transparent shadow-md shadow-red-500/20'
                      : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <BellOff size={18} /> Disabled
                </button>
              </div>
            </>
          )}
        </div>

        {/* My Listings */}
        <div className="animate-fadeInUp bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-purple-500/5 hover:border-purple-400/30 transition-all duration-500">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">My Listings</h2>
              <p className="text-white/50 text-sm mt-1">Products you're currently listing</p>
            </div>
            {userListings.length > 0 && (
              <button
                onClick={() => navigate('/selling')}
                className="premium-btn flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-semibold shadow-md shadow-yellow-400/20 hover:shadow-yellow-400/40"
              >
                <ShoppingBag size={18} />
                Add New
              </button>
            )}
          </div>

          {userListings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userListings.map((product, idx) => (
                <div
                  key={product._id}
                  style={{ animationDelay: `${Math.min(idx, 8) * 50}ms` }}
                  className="animate-card-enter"
                >
                  <div onClick={() => handleProductClick(product)}>
                    <ItemCard
                      name={product.title}
                      price={`₹${product.price}`}
                      description={product.description}
                      imageUrl={product.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                      sellerEmail={product.sellerEmail}
                      warrantyAvailable={product.warrantyAvailable}
                      warrantyDuration={product.warrantyDuration}
                      isBundle={product.isBundle}
                      bundleItemCount={product.bundleItems?.length}
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="premium-btn flex-1 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 flex items-center justify-center gap-1.5"
                      onClick={() => openWarrantyEditor(product)}
                    >
                      <Edit2 size={14} />
                      Warranty
                    </button>
                    <button
                      className="premium-btn flex-1 py-2 bg-red-500/90 text-white rounded-lg font-semibold hover:bg-red-600"
                      onClick={() => handleDeleteProduct(product._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 animate-fadeIn">
              <div className="bg-gradient-to-br from-yellow-400/20 to-amber-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-yellow-400/30">
                <ShoppingBag className="text-yellow-400" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No listings yet</h3>
              <p className="text-white/60 mb-8 max-w-md mx-auto">Start your listing journey by listing your first product on kemp!</p>
              <button
                onClick={() => navigate('/selling')}
                className="premium-btn px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-bold shadow-md shadow-yellow-400/20 hover:shadow-yellow-400/40 inline-flex items-center gap-2"
              >
                <ShoppingBag size={20} />
                Start Listing
              </button>
            </div>
          )}
        </div>

        {/* Expired Listings */}
        {expiredListings.length > 0 && (
          <div className="animate-fadeInUp bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-orange-500/5">
            <div className="mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">Expired Listings</h2>
              <p className="text-white/50 text-sm mt-1">Automatically taken down after 30 days with no activity — relist anytime.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiredListings.map((product) => (
                <div
                  key={product._id}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 opacity-75"
                >
                  <img
                    src={product.imageUrl || 'https://via.placeholder.com/64x64?text=No+Image'}
                    alt={product.title}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 grayscale"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{product.title}</p>
                    <p className="text-white/40 text-xs flex items-center gap-1 mt-0.5">
                      <Clock size={11} /> Expired
                    </p>
                  </div>
                  <button
                    onClick={() => handleRelistProduct(product._id)}
                    disabled={relistingId === product._id}
                    className="premium-btn flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-lg font-semibold text-sm shadow-md shadow-yellow-400/20 disabled:opacity-50 flex-shrink-0"
                  >
                    <RotateCcw size={14} />
                    {relistingId === product._id ? 'Relisting...' : 'Relist'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sale Record Modal */}
      <SaleRecordModal
        isOpen={isSaleModalOpen}
        onClose={handleCloseModal}
        product={selectedProduct}
        sellerData={userData}
      />

      {/* Warranty Edit Modal */}
      {editingWarrantyProduct && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex justify-center items-center p-4 animate-fadeIn">
          <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-yellow-400">Edit Warranty</h2>
              <button
                onClick={closeWarrantyEditor}
                className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-5">{editingWarrantyProduct.title}</p>

            <label className="block text-white font-semibold mb-2">Warranty Available?</label>
            <div className="flex gap-3 mb-4">
              <button
                type="button"
                onClick={() => setWarrantyDraft((prev) => ({ ...prev, available: true }))}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-3 font-semibold border transition-all duration-200 ${
                  warrantyDraft.available
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <ShieldCheck size={16} /> Yes
              </button>
              <button
                type="button"
                onClick={() => setWarrantyDraft({ available: false, duration: '' })}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-3 font-semibold border transition-all duration-200 ${
                  !warrantyDraft.available
                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black border-transparent shadow-md shadow-yellow-500/20'
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                }`}
              >
                <ShieldOff size={16} /> No
              </button>
            </div>

            {warrantyDraft.available && (
              <div className="mb-6 animate-fadeIn">
                <label htmlFor="warrantyDraftDuration" className="block text-white font-semibold mb-2">Warranty Duration</label>
                <input
                  id="warrantyDraftDuration"
                  type="text"
                  value={warrantyDraft.duration}
                  onChange={(e) => setWarrantyDraft((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="e.g., '6 months', '1 year'"
                  className="premium-input w-full bg-white/5 border border-white/10 text-white rounded-xl p-3 focus:outline-none placeholder-gray-500"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeWarrantyEditor}
                disabled={savingWarranty}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWarranty}
                disabled={savingWarranty}
                className="premium-btn flex-1 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 text-black rounded-xl font-bold shadow-md shadow-yellow-400/20 hover:shadow-yellow-400/40 disabled:opacity-50"
              >
                {savingWarranty ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}