import React, { useEffect, useRef, useState } from 'react';
import { useRealTimeUpdates } from '../hooks/useRealTimeUpdates';
import { ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'success' | 'error' | 'info';
  id: string;
}

interface LogFeedProps {
  logs: LogEntry[];
  maxLogs?: number;
}

export const LogFeed: React.FC<LogFeedProps> = ({ logs, maxLogs = 100 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const { animation, triggerUpdate } = useRealTimeUpdates();

  useEffect(() => {
    if (isAutoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, isAutoScroll]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      setIsAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  const getStatusIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-accent" />;
      default:
        return null;
    }
  };

  const filteredLogs = logs.slice(-maxLogs);

  return (
    <div className="bg-background-card rounded-card shadow-card p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`text-sm px-3 py-1 rounded-button transition-colors ${
              isAutoScroll ? 'bg-accent text-white' : 'bg-background-hover text-text-primary'
            }`}
          >
            {isAutoScroll ? 'Auto-scroll On' : 'Auto-scroll Off'}
          </button>
          <span className="text-text-secondary text-sm">
            {filteredLogs.length} / {maxLogs} logs
          </span>
        </div>
      </div>
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[400px] overflow-y-auto space-y-2"
      >
        {filteredLogs.map((log) => (
          <div
            key={log.id}
            className={`flex items-start space-x-2 p-2 rounded bg-background hover:bg-background-hover transition-colors ${
              animation.isActive ? 'opacity-100' : 'opacity-80'
            }`}
          >
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(log.type)}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">
                  {log.timestamp}
                </span>
              </div>
              <p className="text-sm text-text-primary truncate">
                {log.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 