import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, ChevronRight, Package, Trash2 } from 'lucide-react';

const API_URL = "http://localhost:5000/api";

// Seller-facing next-action per current order status. Mirrors the backend's
// ALLOWED_TRANSITIONS in backend/src/services/orderStatus.js.
const STATUS_BADGE_STYLES = {
  PENDING: 'bg-yellow-400/20 border-yellow-400/50 text-yellow-300',
  ACCEPTED: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
  PROCESSING: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
  READY_FOR_HANDOVER: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
  COMPLETED: 'bg-green-500/20 border-green-500/50 text-green-300',
  REJECTED: 'bg-red-500/20 border-red-500/50 text-red-300',
  CANCELLED: 'bg-red-500/20 border-red-500/50 text-red-300'
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      if (!userId || !token) {
        navigate('/');
        return;
      }

      const response = await fetch(`${API_URL}/notifications/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Notifications fetched:', data);
        setNotifications(data);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/notifications/read/${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(notifications.map(notif =>
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        ));
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(notifications.filter(notif => notif._id !== notificationId));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // This page is a plain alert list — no buyer details, price, or
  // accept/reject controls live here. Clicking a deal-related notification
  // marks it read and hands off to the full order view in My Orders, where
  // the seller/buyer actually manages the deal.
  const handleOpenNotification = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    if (notification.metadata?.bloodRequestId) {
      navigate(`/blood-requests/${notification.metadata.bloodRequestId}`);
    } else if (notification.metadata?.warrantyOrderId) {
      navigate(`/my-orders?tab=warranties`);
    } else if (notification.metadata?.orderId) {
      navigate(`/my-orders?orderId=${notification.metadata.orderId}`);
    } else if (notification.type === 'message' && notification.metadata?.conversationId) {
      navigate(`/chat/${notification.metadata.conversationId}`);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead;
    if (filter === 'read') return notif.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-lg">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b18] text-white">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-6 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <Bell className="text-yellow-400" size={32} />
              <div>
                <h1 className="text-4xl font-bold text-[#facc15]">Notifications</h1>
                <p className="text-white/60 mt-1">Purchase requests from buyers</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="px-6 py-2 bg-yellow-400 text-black rounded-lg font-semibold hover:bg-yellow-500 transition"
            >
              Back to Profile
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'unread'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === 'read'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
            Error: {error}
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="mx-auto mb-4 text-white/40" size={64} />
            <h2 className="text-2xl font-bold text-white/60 mb-2">No notifications</h2>
            <p className="text-white/40">
              {filter === 'unread'
                ? 'You have no unread notifications'
                : filter === 'read'
                ? 'You have no read notifications'
                : 'You have no notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const linkedStatus = notification.metadata?.status;
              return (
                <div
                  key={notification._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenNotification(notification)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleOpenNotification(notification); }}
                  className={`w-full flex items-center gap-3 text-left bg-white/5 border rounded-xl p-3 backdrop-blur-md transition hover:bg-white/10 cursor-pointer ${
                    notification.isRead ? 'border-white/10' : 'border-yellow-400/50 bg-yellow-400/5'
                  }`}
                >
                  {/* Icon / thumbnail */}
                  {notification.productDetails?.imageUrl ? (
                    <img
                      src={notification.productDetails.imageUrl}
                      alt={notification.productDetails.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/48x48?text=%20'; }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Package size={18} className="text-yellow-400" />
                    </div>
                  )}

                  {/* Title, message, product, timestamp */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-yellow-400 truncate">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="px-1.5 py-0.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full flex-shrink-0">
                          NEW
                        </span>
                      )}
                      {linkedStatus && (
                        <span className={`px-1.5 py-0.5 border text-[10px] font-bold rounded-full flex-shrink-0 ${STATUS_BADGE_STYLES[linkedStatus] || 'bg-white/10 border-white/20 text-white/70'}`}>
                          {linkedStatus.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-xs truncate mt-0.5">{notification.message}</p>
                    <div className="flex items-center gap-3 text-white/40 text-[11px] mt-1">
                      {notification.productDetails?.title && (
                        <span className="truncate">{notification.productDetails.title}</span>
                      )}
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar size={11} />
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotification(notification._id); }}
                    className="p-1.5 rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10 transition flex-shrink-0"
                    aria-label="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>

                  <ChevronRight size={18} className="text-white/30 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
