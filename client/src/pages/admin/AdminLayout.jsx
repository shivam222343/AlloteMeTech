import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Building2, Code2, Tag, Users, BarChart2, Shield } from 'lucide-react';

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/companies', label: 'Companies', icon: Building2 },
  { to: '/admin/problems', label: 'Problems', icon: Code2 },
  { to: '/admin/topics', label: 'Topics', icon: Tag },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
];

const AdminLayout = () => (
  <div className="flex h-screen overflow-hidden">
    {/* Sidebar */}
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

    {/* Mobile nav */}
    <div className="md:hidden border-b border-border w-full fixed top-14 bg-bg-card z-30">
      <div className="flex overflow-x-auto no-scrollbar px-4 gap-1 py-2">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${isActive ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-muted hover:text-text-primary'}`
            }
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </NavLink>
        ))}
      </div>
    </div>

    {/* Content */}
    <main className="flex-1 p-6 md:p-8 overflow-y-auto admin-scroll">
      <Outlet />
    </main>
  </div>
);

export default AdminLayout;
