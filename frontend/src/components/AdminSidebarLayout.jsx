import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, Handshake, Flag, Tags, Megaphone,
  BarChart3, LogOut, Menu, X, ShieldCheck, Droplet, HeartHandshake
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Listings', path: '/admin/listings', icon: Package },
  { label: 'Orders / Deals', path: '/admin/orders', icon: Handshake },
  { label: 'Reports', path: '/admin/reports', icon: Flag },
  { label: 'Blood Donors', path: '/admin/blood-donors', icon: Droplet },
  { label: 'Blood Requests', path: '/admin/blood-requests', icon: HeartHandshake },
  { label: 'Categories', path: '/admin/categories', icon: Tags },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 }
];

// Shared shell for every Admin Control Center page: enforces the admin auth
// guard once, renders the sidebar/topbar, and lets each page just render its
// own content. Uses the same localStorage isAdmin/token check every existing
// admin page already used — the real enforcement is server-side (requireAdmin).
export default function AdminSidebarLayout({ title, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    const token = localStorage.getItem('token');
    if (!token || isAdmin !== 'true') {
      navigate('/');
      return;
    }
    setChecked(true);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('userData');
    navigate('/');
  };

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070b18] text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-400" />
      </div>
    );
  }

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="p-2 rounded-xl bg-[#facc15]/15 border border-[#facc15]/30">
          <ShieldCheck className="text-[#facc15]" size={22} />
        </div>
        <div>
          <p className="text-white font-black leading-none">KEMP Admin</p>
          <p className="text-white/40 text-xs mt-0.5">Control Center</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                active
                  ? 'bg-[#facc15] text-[#0f172a]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-300 hover:bg-red-500/10 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#070b18] text-white flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 flex-shrink-0 border-r border-white/10 bg-white/[0.03] sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (slide-over) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 w-64 flex flex-col bg-[#0a0e1f] border-r border-white/10 h-full">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-5 right-4 text-white/60 hover:text-white"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.03] sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-white/80 hover:text-white" aria-label="Open menu">
            <Menu size={24} />
          </button>
          <p className="font-bold text-[#facc15]">{title}</p>
          <div className="w-6" />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <h1 className="hidden lg:block text-3xl font-black text-white mb-6">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
