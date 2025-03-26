import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  Cog6ToothIcon,
  WalletIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Wallet', href: '/wallet', icon: WalletIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Logs', href: '/logs', icon: DocumentTextIcon },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div
      className={`bg-background border-r border-border h-screen transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        {!isCollapsed && (
          <h1 className="text-h2 font-bold text-accent">AntBot</h1>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-md hover:bg-accent/10 transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-5 h-5 text-text-primary" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5 text-text-primary" />
          )}
        </button>
      </div>

      <nav className="mt-8">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 text-text-primary transition-colors duration-200 ${
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'hover:bg-accent/5 hover:text-accent'
              }`}
            >
              <item.icon className="w-6 h-6" />
              {!isCollapsed && (
                <span className="ml-3 text-body">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Sidebar; 