import React from 'react';
import { Outlet } from 'react-router-dom';
import { BellIcon, UserCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import Sidebar from '../Sidebar';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar />
      
      {/* Header */}
      <header className="fixed top-0 right-0 left-[var(--sidebar-width)] h-[var(--header-height)] 
                       bg-white border-b border-slate-200 px-8 flex items-center justify-end space-x-4">
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
          <BellIcon className="w-5 h-5" />
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
          <UserCircleIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="main-content pt-[calc(var(--header-height)+2rem)]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 