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

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {/* Mobile Drawer with BranchedMenu */}
      <AppSidebar
        isMobileDrawer={true}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 min-w-0">
        {/* Desktop Sidebar with BranchedMenu shown for user navlinks */}
        {!isLandingPage && (
          <AppSidebar
            isMobileDrawer={false}
            className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)]"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
