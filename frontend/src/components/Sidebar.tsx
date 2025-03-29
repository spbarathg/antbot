import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  FireIcon,
  RocketLaunchIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: HomeIcon },
    { path: '/analytics', label: 'Analytics', icon: ChartBarIcon },
    { path: '/settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-16 bg-gradient-to-b from-[#1A1A1A] to-background flex flex-col py-4 px-3 z-50">
      {/* Logo */}
      <div className="mb-8">
        <div className="h-8 w-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#2E2E2E] mb-8" />

      {/* Navigation Items */}
      <nav className="flex-1">
        <ul className="space-y-6">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path} className="relative group">
                <Link
                  to={item.path}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-purple-500/20 text-white'
                      : 'text-text-secondary hover:text-text-primary hover:bg-purple-500/5'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1A1A1A] text-sm text-text-secondary rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2E2E2E]">
                  {item.label}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="space-y-4">
        {/* Refresh Button */}
        <div className="relative group">
          <button
            className="w-10 h-10 rounded-lg text-text-secondary hover:text-text-primary hover:bg-purple-500/5 transition-all duration-200 flex items-center justify-center"
            title="Refresh Data"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#1A1A1A] text-sm text-text-secondary rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#2E2E2E]">
            Refresh
          </div>
        </div>

        {/* Clock */}
        <div className="text-center">
          <div className="text-xs text-text-secondary font-mono">
            {format(currentTime, 'HH:mm')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 