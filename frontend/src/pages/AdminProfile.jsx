import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Users, Activity, Settings, LogOut } from 'lucide-react';

export default function AdminProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is admin
    const isAdmin = localStorage.getItem('isAdmin');
    const token = localStorage.getItem('token');

    if (!token || isAdmin !== 'true') {
      // Not an admin, redirect to login
      navigate('/');
      return;
    }

    setLoading(false);
  }, [navigate]);

  const adminData = {
    username: 'admin@kongu',
    email: 'admin@kongu.edu.in',
    role: 'Administrator',
    loginTime: new Date().toLocaleString(),
    permissions: ['User Management', 'Content Moderation', 'Analytics', 'System Settings']
  };

  const adminStats = [
    { label: 'Total Users', value: '1,234', icon: Users, color: 'text-blue-400' },
    { label: 'Active Listings', value: '456', icon: Activity, color: 'text-green-400' },
    { label: 'Reports Pending', value: '23', icon: BarChart3, color: 'text-orange-400' },
    { label: 'System Health', value: '98%', icon: Settings, color: 'text-yellow-400' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userData');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading admin profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Admin Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl shadow-2xl p-8 mb-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{adminData.username}</h1>
              <p className="text-lg text-blue-100 mb-2">{adminData.email}</p>
              <span className="inline-block bg-blue-400 text-gray-900 px-4 py-1 rounded-full font-bold text-sm">
                {adminData.role}
              </span>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className="text-right">
                <p className="text-sm text-blue-100">Last Login</p>
                <p className="text-white font-semibold">{adminData.loginTime}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Admin Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {adminStats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div key={index} className="bg-gray-900 rounded-2xl p-6 border border-gray-800 hover:border-gray-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-400 font-semibold text-sm">{stat.label}</h3>
                  <IconComponent size={24} className={stat.color} />
                </div>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Admin Permissions */}
        <div className="bg-gray-900 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Admin Permissions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminData.permissions.map((permission, index) => (
              <div key={index} className="flex items-center p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="w-3 h-3 rounded-full bg-green-400 mr-3"></div>
                <span className="text-gray-100 font-medium">{permission}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
