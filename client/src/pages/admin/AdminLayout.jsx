import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';
import AppSidebar from '../../components/layout/AppSidebar';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Listen to toggle events dispatched from Navbar hamburger button
  useEffect(() => {
    const handleToggle = () => setSidebarOpen((o) => !o);
    window.addEventListener('toggle-admin-sidebar', handleToggle);
    window.addEventListener('toggle-app-sidebar', handleToggle);
    return () => {
      window.removeEventListener('toggle-admin-sidebar', handleToggle);
      window.removeEventListener('toggle-app-sidebar', handleToggle);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-bg-primary">
      {/* Global Header */}
      <Navbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />

      {/* Main Admin Section */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar with BranchedMenu */}
        <AppSidebar isMobileDrawer={false} className="hidden md:flex" />

        {/* Mobile Sidebar (Slide-over drawer with BranchedMenu) */}
        <AppSidebar
          isMobileDrawer={true}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden admin-scroll min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
