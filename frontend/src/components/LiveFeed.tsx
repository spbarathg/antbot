import React from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Log {
  timestamp: string;
  type: 'info' | 'error' | 'trade' | 'alert';
  message: string;
}

interface LiveFeedProps {
  logs: Log[];
  onClear: () => void;
  onExport: () => void;
}

const LiveFeed: React.FC<LiveFeedProps> = ({ logs, onClear, onExport }) => {
  const getStatusIcon = (type: Log['type']) => {
    switch (type) {
      case 'trade':
        return <CheckCircleIcon className="w-4 h-4 text-success" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-error" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-accent-sol" />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Feed</h3>
        <div className="flex items-center space-x-2">
          <button 
            className="btn-secondary py-1 px-3 text-sm"
            onClick={onClear}
          >
            Clear
          </button>
          <button 
            className="btn-secondary py-1 px-3 text-sm"
            onClick={onExport}
          >
            Export
          </button>
        </div>
      </div>
      <div className="terminal h-[300px] overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="terminal-line">
            <span className="terminal-timestamp">{log.timestamp}</span>
            {getStatusIcon(log.type)}
            <span className="text-text-primary">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed; 