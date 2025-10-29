import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';

interface SidebarProps {
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ className }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Expenses', href: '/expenses', icon: '💰' },
    { name: 'Groups', href: '/groups', icon: '👥' },
    { name: 'Friends', href: '/friends', icon: '👨‍👩‍👧‍👦' },
    { name: 'Settle up', href: '/settlements', icon: '⚖️' },
    { name: 'Activity', href: '/activity', icon: '📋' },
    { name: 'Analytics', href: '/analytics', icon: '📈' },
  ];

  return (
    <nav className={clsx('bg-white shadow-sm border-r border-gray-200', className)}>
      <div className="p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={clsx(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;