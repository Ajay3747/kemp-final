import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, Upload, Users, User, Home as HomeIcon, LogOut, Menu, X, Settings, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // Close the mobile panel automatically whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userData');
    navigate('/');
  };

  const navItems = [
    { name: 'Home', path: '/home', icon: HomeIcon },
    { name: 'Dealing', path: '/dealing', icon: ShoppingBag },
    { name: 'Listing', path: '/selling', icon: Upload },
    { name: 'Community', path: '/community', icon: Users },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const userData = (() => {
    try {
      return JSON.parse(localStorage.getItem('userData')) || null;
    } catch (e) {
      return null;
    }
  })();

  const avatarInitials = userData?.username ? userData.username.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'U';

  return (
    <nav
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        isScrolled
          ? 'bg-gray-950/80 backdrop-blur-xl border-white/10 shadow-lg shadow-black/30'
          : 'bg-gray-950/40 backdrop-blur-md border-white/5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand mark — the Home page already renders its own floating KEMP
              logo, so skip it here to avoid a duplicate mark on that route. */}
          {location.pathname === '/home' ? (
            <div className="flex-shrink-0" aria-hidden="true" />
          ) : (
            <Link to="/home" className="group flex flex-shrink-0 items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-500/20 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-yellow-400/40">
                <span className="text-base font-extrabold text-black">K</span>
              </div>
              <span className="hidden text-lg font-bold tracking-tight text-white transition-colors group-hover:text-yellow-300 sm:inline">
                KEMP
              </span>
            </Link>
          )}

          {/* Center nav (desktop) */}
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1.5 backdrop-blur-sm md:flex">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                    active
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-400/30'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon
                    size={17}
                    strokeWidth={2.25}
                    className={`transition-transform duration-300 ${active ? '' : 'group-hover:-translate-y-0.5 group-hover:scale-110'}`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: avatar + mobile toggle */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen((s) => !s)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-3 transition-all duration-300 hover:border-yellow-400/40 hover:bg-white/10"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-xs font-bold text-black">
                  {avatarInitials}
                </div>
                <span className="hidden max-w-[100px] truncate text-sm font-medium text-white/90 sm:inline">
                  {userData?.username || 'Guest'}
                </span>
                <ChevronDown
                  size={14}
                  className={`hidden text-white/50 transition-transform duration-300 sm:inline ${avatarOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {avatarOpen && (
                <div className="animate-slideDown absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-gray-900/95 shadow-2xl shadow-black/40 backdrop-blur-xl">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-gray-200 transition-colors hover:bg-white/5 hover:text-yellow-300"
                  >
                    <User size={16} /> <span className="text-sm font-medium">Profile</span>
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-gray-200 transition-colors hover:bg-white/5 hover:text-yellow-300"
                  >
                    <Settings size={16} /> <span className="text-sm font-medium">Settings</span>
                  </Link>
                  <div className="h-px bg-white/10" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-red-300 transition-colors hover:bg-red-500/10"
                  >
                    <LogOut size={16} /> <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="rounded-lg p-2 text-gray-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setMobileOpen((s) => !s)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="animate-slideDown border-t border-white/10 bg-gray-950/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-400/20'
                      : 'text-gray-200 hover:bg-white/5 hover:text-yellow-300'
                  }`}
                >
                  <Icon size={18} strokeWidth={2.25} />
                  {item.name}
                </Link>
              );
            })}
            <div className="my-1 h-px bg-white/10" />
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-200 transition-colors hover:bg-white/5 hover:text-yellow-300"
            >
              <User size={18} strokeWidth={2.25} /> Profile
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              <LogOut size={18} strokeWidth={2.25} /> Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
