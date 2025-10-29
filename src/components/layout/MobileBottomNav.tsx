import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Expenses', href: '/expenses', icon: '💰' },
    { name: 'Friends', href: '/friends', icon: '👥' },
    { name: 'Groups', href: '/groups', icon: '👨‍👩‍👧‍👦' },
    { name: 'Settle', href: '/settlements', icon: '⚖️' },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-1 z-30">
      <div className="flex justify-around">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors',
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;