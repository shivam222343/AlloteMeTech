import { useState, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, LogOut, User, Shield, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import GlobalSearch from '../common/GlobalSearch';
import PremiumButton from '../common/PremiumButton';

import toast from 'react-hot-toast';
import { getInitials } from '../../utils/helpers';
import useClickOutside from '../../utils/useClickOutside';

const navLinks = [
  { to: '/companies', label: 'Companies' },
  { to: '/topics', label: 'Topics' },
  { to: '/discussion', label: 'Forum' },
];

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // ── Click-outside for profile dropdown ─────────────────────────────────────
  const dropdownRef = useRef(null);
  const closeDropdown = useCallback(() => setDropdownOpen(false), []);
  useClickOutside(dropdownRef, closeDropdown, dropdownOpen);

  // ── Click-outside for mobile menu ──────────────────────────────────────────
  const mobileRef = useRef(null);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  useClickOutside(mobileRef, closeMobile, mobileOpen);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
    setDropdownOpen(false);
  };

  return (
    <header ref={mobileRef} className="sticky top-0 z-40 border-b border-border backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img
              src={isDark ? "/AlloteMe_Logos.png" : "/AlloteMe_Logos _Light.png"}
              alt="AlloteMe Tech"
              className="h-12 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm transition-colors ${isActive ? 'text-text-primary bg-bg-secondary' : 'text-text-muted hover:text-text-primary hover:bg-bg-secondary'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Center: Search */}
          <div className="flex-1 max-w-xs mx-4 hidden md:block">
            <GlobalSearch />
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn-icon btn-ghost w-9 h-9"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark
                ? <Sun className="w-4 h-4 text-accent-yellow" />
                : <Moon className="w-4 h-4 text-text-muted" />}
            </button>

            {user && !user.isPremium && (
              <div className="hidden sm:block">
                <PremiumButton variant="compact" />
              </div>
            )}

            {user ? (
              /* ── Profile dropdown ── */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-secondary transition-colors"
                  id="user-menu-button"
                  aria-haspopup="true"
                  aria-expanded={dropdownOpen}
                >
                  {user.isPremium ? (
                    <div className="premium-avatar-container flex-shrink-0" style={{ padding: '2px' }}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center text-[10px] font-bold text-accent-blue">
                          {getInitials(user.name)}
                        </div>
                      )}
                    </div>
                  ) : (
                    user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center text-xs font-medium text-accent-blue flex-shrink-0">
                        {getInitials(user.name)}
                      </div>
                    )
                  )}
                  <span className="text-sm text-text-secondary hidden sm:block max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-text-faint transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 card shadow-card-hover animate-slide-down z-50">
                    <div className="p-2 space-y-0.5">
                      <Link to="/dashboard" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link to="/profile" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-accent-blue hover:bg-accent-blue/10 transition-colors">
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <div className="my-1 h-px bg-border" />
                      <button onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm text-accent-red hover:bg-accent-red/10 transition-colors">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-ghost btn-sm">Login</Link>
                <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden btn-icon btn-ghost"
              onClick={() => {
                if (isAdminRoute) {
                  window.dispatchEvent(new CustomEvent('toggle-admin-sidebar'));
                } else {
                  setMobileOpen((o) => !o);
                }
              }}
              aria-label="Toggle menu"
            >
              {isAdminRoute ? (
                <Menu className="w-5 h-5" />
              ) : (
                mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && !isAdminRoute && (
          <div className="md:hidden border-t border-border py-3 space-y-1 animate-slide-down">
            <div className="mb-3"><GlobalSearch /></div>
            {navLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded text-sm transition-colors ${isActive ? 'text-text-primary bg-bg-secondary' : 'text-text-muted hover:text-text-primary'}`
                }
              >{label}</NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
