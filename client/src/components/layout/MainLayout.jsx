import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AppSidebar from './AppSidebar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default MainLayout;
