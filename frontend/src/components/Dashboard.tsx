import React from 'react';
import { useApp } from '../context/AppContext';
import LiveFeed from './LiveFeed';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ShieldExclamationIcon
} from '@heroicons/react/24/solid';

export const Dashboard: React.FC = () => {
  const { state } = useApp();

  // Mock data for portfolio statistics
  const portfolioStats = [
    {
      label: 'Total Portfolio Value',
      value: '$1,234,567',
      change: '+12.5%',
      changeType: 'positive',
      icon: CurrencyDollarIcon
    },
    {
      label: 'Active Workers',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: UserGroupIcon
    },
    {
      label: 'Open Positions',
      value: '5',
      change: '-1',
      changeType: 'negative',
      icon: ChartBarIcon
    },
    {
      label: 'Risk Level',
      value: 'Stable',
      change: 'Low',
      changeType: 'positive',
      icon: ShieldExclamationIcon
    }
  ];

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      {/* Portfolio Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {portfolioStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-accent-primary/5 rounded-lg">
                  <Icon className="w-5 h-5 text-accent-primary/80" />
                </div>
                <span className="text-xs text-text-secondary/60">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="space-y-1">
                <div className="metric-label">{stat.label}</div>
                <div className="metric-value">{stat.value}</div>
                <div className={`metric-change ${stat.changeType === 'positive' ? 'metric-change-positive' : 'metric-change-negative'}`}>
                  {stat.changeType === 'positive' ? '+' : ''}{stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Feed */}
      <div className="flex-1 overflow-hidden">
        <div className="card h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="card-header">Live Operations Feed</h2>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-accent-primary/60 animate-pulse" />
              <span className="text-xs text-text-secondary/60">Live</span>
            </div>
          </div>
          <LiveFeed />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;