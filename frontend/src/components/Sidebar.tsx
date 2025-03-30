import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  HomeIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Dashboard' },
    { path: '/analytics', icon: ChartBarIcon, label: 'Analytics' },
    { path: '/settings', icon: Cog6ToothIcon, label: 'Settings' }
  ];

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-4">
        <div className="text-xl font-bold text-white">AntBot</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <button
                  onClick={() => navigate(item.path)}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`}
                >
                  <Icon className="sidebar-icon mr-3" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400">Connected</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 