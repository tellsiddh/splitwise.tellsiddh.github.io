import React, { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface HeaderProps {
  title?: string;
  children?: ReactNode;
  onMobileMenuClick?: () => void;
  showMobileMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title, children, onMobileMenuClick, showMobileMenuButton = false }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            {showMobileMenuButton && (
              <button
                onClick={onMobileMenuClick}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 mr-3"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            
            <h1 className="text-xl font-semibold text-gray-900">
              {title || 'Splitwise'}
            </h1>
          </div>

          {children && (
            <div className="hidden sm:flex items-center space-x-4">
              {children}
            </div>
          )}

          <div className="flex items-center space-x-2 sm:space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Avatar user={user} size="sm" />
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Sign out</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;