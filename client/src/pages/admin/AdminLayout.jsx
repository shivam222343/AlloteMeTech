import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, Code2, Tag, Users, BarChart2, Shield, CreditCard, X } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/problems', label: 'Problems', icon: Code2 },
  { to: '/admin/topics', label: 'Topics', icon: Tag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/admin/pricing', label: 'Pricing & Coupons', icon: CreditCard },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen to toggle events dispatched from Navbar hamburger button on admin paths
  useEffect(() => {
    const handleToggle = () => setSidebarOpen((o) => !o);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-admin-sidebar', handleToggle);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Global Header */}
      <Navbar />

      {/* Main Admin Section */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Desktop Sidebar (Permanent) */}
        <aside className="w-52 flex-shrink-0 border-r border-border bg-bg-card hidden md:block">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-blue" />
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Admin Panel</span>
            </div>
          </div>
          <nav className="p-2 space-y-0.5">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile Sidebar (Slide-over drawer) */}
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Drawer content */}
            <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-bg-card border-r border-border z-50 flex flex-col animate-slide-right">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-accent-blue" />
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">Admin Panel</span>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)} 
                  className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-bg-secondary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-2 space-y-1">
                {links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="text-sm font-semibold">{label}</span>
                  </NavLink>
                ))}
              </nav>
            </aside>
          </>
        )}

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Main content viewport */}
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto admin-scroll">
            <Outlet />
          </main>
        </div>

      </div>
    </div>
  );
};

export default AdminLayout;
