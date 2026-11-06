import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AppSidebar from './AppSidebar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((o) => !o);
    window.addEventListener('toggle-app-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-app-sidebar', handleToggle);
    };
  }, []);

  // Landing marketing page: Free-flowing full-width layout
  if (isLandingPage) {
    return (
      <div className="min-h-screen flex flex-col bg-bg-primary">
        <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <AppSidebar
          isMobileDrawer={true}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    );
  }

  // All user app routes (/discussion, /jobs, /companies, /topics, /dashboard, /profile, etc.):
  // Full-page height layout with 100% full-height permanent sidebar pinned from top to bottom
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Full Page Height Desktop Sidebar */}
        <AppSidebar
          isMobileDrawer={false}
          className="hidden md:flex h-full min-h-full"
        />

        {/* Mobile Drawer */}
        <AppSidebar
          isMobileDrawer={true}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Viewport with independent smooth scrolling */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <main className={`flex-1 min-w-0 ${location.pathname === '/discussion' ? 'flex flex-col overflow-hidden h-full' : 'overflow-y-auto admin-scroll'}`}>
            <Outlet />
            {location.pathname !== '/discussion' && <Footer />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
