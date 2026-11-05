import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Briefcase,
  Building2,
  Tag,
  MessageSquare,
  LayoutDashboard,
  User as UserIcon,
  X,
  LogOut,
} from 'lucide-react';
import {
  Rocket01Icon,
  Download04Icon,
  Settings02Icon,
  Layers01Icon,
  Notification03Icon,
  PaintBoardIcon,
  TextFontIcon,
  CursorPointer01Icon,
} from '@hugeicons/core-free-icons';
import BranchedMenu from '../common/BranchedMenu';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getInitials } from '../../utils/helpers';
import { Link } from 'react-router-dom';

export default function AppSidebar({ isOpen, onClose, isMobileDrawer = false, className = '' }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isAdminRoute = currentPath.startsWith('/admin');

  // Navigation sections
  const platformSection = {
    label: 'Platform & Career',
    children: [
      { value: '/jobs', label: 'Explore Jobs', icon: Briefcase },
      { value: '/companies', label: 'Companies Directory', icon: Building2 },
      { value: '/topics', label: 'Practice Topics', icon: Tag },
      { value: '/discussion', label: 'Community Forum', icon: MessageSquare },
    ]
  };

  const workspaceSection = {
    label: 'Personal Workspace',
    children: [
      { value: '/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
      { value: '/profile', label: 'My Profile', icon: UserIcon },
    ]
  };

  const adminSection = {
    label: 'Admin Control',
    children: [
      { value: '/admin', label: 'Dashboard', icon: Rocket01Icon },
      { value: '/admin/jobs', label: 'Jobs Management', icon: Layers01Icon },
      { value: '/admin/users', label: 'Users Management', icon: CursorPointer01Icon },
      { value: '/admin/companies', label: 'Companies', icon: Download04Icon },
      { value: '/admin/problems', label: 'Problems', icon: PaintBoardIcon },
      { value: '/admin/topics', label: 'Topics', icon: TextFontIcon },
      { value: '/admin/analytics', label: 'Analytics', icon: Notification03Icon },
      { value: '/admin/pricing', label: 'Pricing & Coupons', icon: Settings02Icon },
    ]
  };

  // Build role-specific menu items dynamically
  let menuItems = [];
  if (isAdmin) {
    if (isAdminRoute) {
      // When inside /admin, put Admin Control on top
      menuItems = [adminSection, platformSection, workspaceSection];
    } else {
      // When browsing user navlinks, put Platform & Career on top, then Workspace, then Admin Control
      menuItems = [platformSection, workspaceSection, adminSection];
    }
  } else {
    // Non-admin / regular user
    menuItems = [platformSection, workspaceSection];
  }

  const handleSelect = (value) => {
    navigate(value);
    if (isMobileDrawer && onClose) {
      onClose();
    }
  };

  // Close on Escape key press for mobile drawer
  useEffect(() => {
    if (!isMobileDrawer || !isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileDrawer, isOpen, onClose]);

  // Sidebar inner content (No logo and No title part in sidebar — logo/title are exclusively in Navbar)
  const sidebarContent = (
    <div className="flex flex-col h-full min-h-full bg-bg-card text-text-primary select-none">
      {/* Mobile drawer header with clean close button */}
      {isMobileDrawer && (
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0 bg-bg-card/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-faint">
            Navigation Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subtle top indicator for desktop */}
      {!isMobileDrawer && isAdmin && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between flex-shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-faint">
            {isAdminRoute ? 'Admin View' : 'User View'}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue font-semibold border border-accent-blue/30">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        </div>
      )}

      {/* Main Branched Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-3 admin-scroll">
        <BranchedMenu
          items={menuItems}
          defaultOpen={[0, 1]}
          activeValue={currentPath}
          onSelect={(value) => handleSelect(value)}
          color={isDark ? '#F9FAFB' : '#0F172A'}
          accentColor="#3B82F6"
          lineColor={isDark ? '#374151' : '#CBD5E1'}
          width={240}
          rowHeight={34}
          indent={36}
          trunk={12}
          radius={8}
          lineWidth={1.5}
          fontSize={13}
          drawDuration={350}
          foldDuration={250}
          className="w-full"
        />
      </div>

      {/* Bottom User Profile Section pinned to the bottom */}
      <div className="p-3 border-t border-border bg-bg-card/80 flex-shrink-0 mt-auto">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-bg-secondary/60 border border-border/50">
              <div className="relative flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-blue/20 text-accent-blue font-bold text-xs flex items-center justify-center">
                    {getInitials(user.name)}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent-green ring-2 ring-bg-card" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text-primary truncate">{user.name}</p>
                <p className="text-[10px] text-text-muted truncate">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleSelect('/profile')}
                className="flex-1 py-1 px-2 rounded text-[11px] font-medium text-text-muted hover:text-text-primary hover:bg-bg-secondary transition-colors text-center"
              >
                Profile
              </button>
              <div className="w-px h-3 bg-border" />
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/');
                  if (isMobileDrawer && onClose) onClose();
                }}
                className="flex items-center justify-center gap-1 py-1 px-2 rounded text-[11px] font-medium text-accent-red hover:bg-accent-red/10 transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/login"
              onClick={() => isMobileDrawer && onClose?.()}
              className="btn btn-ghost btn-sm text-xs justify-center"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              onClick={() => isMobileDrawer && onClose?.()}
              className="btn btn-primary btn-sm text-xs justify-center"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  // If this is a Mobile Drawer
  if (isMobileDrawer) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 md:hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer slide-over */}
        <aside
          className="fixed left-0 top-0 bottom-0 w-[275px] max-w-[85vw] shadow-2xl z-50 flex flex-col border-r border-border animate-in slide-in-from-left duration-250"
        >
          {sidebarContent}
        </aside>
      </div>
    );
  }

  // Desktop Static Sidebar
  return (
    <aside className={`w-60 flex-shrink-0 border-r border-border bg-bg-card hidden md:flex flex-col h-full min-h-full ${className}`}>
      {sidebarContent}
    </aside>
  );
}
