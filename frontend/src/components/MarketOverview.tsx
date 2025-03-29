import React from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface MarketData {
  topGainers: Array<{ pair: string; change: number }>;
  topLosers: Array<{ pair: string; change: number }>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface MarketOverviewProps {
  data: MarketData;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ data }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-success';
      case 'bearish':
        return 'text-error';
      default:
        return 'text-warning';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-success" />;
      case 'bearish':
        return <ArrowTrendingDownIcon className="w-5 h-5 text-error" />;
      default:
        return <ChartBarIcon className="w-5 h-5 text-warning" />;
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Market Overview</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-sm font-medium ${getSentimentColor(data.sentiment)}`}>
            {getSentimentIcon(data.sentiment)}
            <span className="ml-1 capitalize">{data.sentiment}</span>
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Top Gainers */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ArrowTrendingUpIcon className="w-5 h-5 text-success" />
            <h4 className="font-medium">Top Gainers</h4>
          </div>
          <div className="space-y-3">
            {data.topGainers.map((coin, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium">{coin.pair}</span>
                <span className="text-success">+{coin.change}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Losers */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <ArrowTrendingDownIcon className="w-5 h-5 text-error" />
            <h4 className="font-medium">Top Losers</h4>
          </div>
          <div className="space-y-3">
            {data.topLosers.map((coin, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="font-medium">{coin.pair}</span>
                <span className="text-error">{coin.change}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview; 