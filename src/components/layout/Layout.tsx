import React, { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNavDrawer from './MobileNavDrawer';
import MobileBottomNav from './MobileBottomNav';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  headerChildren?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, title, headerChildren }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        title={title} 
        onMobileMenuClick={toggleMobileNav}
        showMobileMenuButton={true}
      >
        {headerChildren}
      </Header>
      
      <div className="flex">
        {/* Desktop Sidebar - hidden on mobile */}
        <Sidebar className="hidden lg:block w-64 min-h-screen" />
        
        {/* Mobile Navigation Drawer */}
        <MobileNavDrawer 
          isOpen={isMobileNavOpen} 
          onClose={closeMobileNav} 
        />
        
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Layout;