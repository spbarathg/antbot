import React, { useEffect, useRef } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  InformationCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/solid';

interface FeedItem {
  id: string;
  timestamp: string;
  type: 'success' | 'warning' | 'error' | 'info' | 'trade';
  message: string;
}

const LiveFeed: React.FC = () => {
  const feedRef = useRef<HTMLDivElement>(null);
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>([
    {
      id: '1',
      timestamp: '11:12:13 PM',
      type: 'success',
      message: 'Successfully executed trade: SOL/USDC'
    },
    {
      id: '2',
      timestamp: '11:12:10 PM',
      type: 'warning',
      message: 'High volatility detected in BONK/SOL pair'
    },
    {
      id: '3',
      timestamp: '11:12:05 PM',
      type: 'error',
      message: 'Failed to connect to Jito API'
    },
    {
      id: '4',
      timestamp: '11:12:00 PM',
      type: 'info',
      message: 'New market data received'
    },
    {
      id: '5',
      timestamp: '11:11:55 PM',
      type: 'trade',
      message: 'Opened new position: JUP/USDC'
    }
  ]);

  const getIcon = (type: FeedItem['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="feed-icon text-accent-success/80" />;
      case 'warning':
        return <ExclamationTriangleIcon className="feed-icon text-accent-warning/80" />;
      case 'error':
        return <XCircleIcon className="feed-icon text-accent-error/80" />;
      case 'info':
        return <InformationCircleIcon className="feed-icon text-accent-info/80" />;
      case 'trade':
        return <CurrencyDollarIcon className="feed-icon text-accent-primary/80" />;
      default:
        return null;
    }
  };

  const getFeedItemClass = (type: FeedItem['type']) => {
    switch (type) {
      case 'success':
        return 'feed-item-success';
      case 'warning':
        return 'feed-item-warning';
      case 'error':
        return 'feed-item-error';
      default:
        return '';
    }
  };

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [feedItems]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-text-secondary">Live Updates</span>
        </div>
      </div>
      <div 
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-2 pr-4"
      >
        {feedItems.map((item) => (
          <div
            key={item.id}
            className={`feed-item ${getFeedItemClass(item.type)}`}
          >
            <div className="flex items-start space-x-3">
              {getIcon(item.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="feed-timestamp">{item.timestamp}</span>
                </div>
                <p className="text-sm text-text-primary/90 mt-1">{item.message}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveFeed; 