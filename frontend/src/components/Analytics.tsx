import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedChart } from './EnhancedChart';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface ChartDataPoint {
  timestamp: Date;
  value: number;
}

interface StatusResponse {
  total_balance: number;
  bot_status: string;
  active_trades: number;
}

interface PerformanceMetric {
  timestamp: string;
  value: number;
  change: number;
}

interface TradeMetrics {
  totalTrades: number;
  successRate: number;
  avgProfitLoss: number;
  bestTrade: number;
  worstTrade: number;
}

interface Trade {
  timestamp: string;
  pair: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  profit?: number;
}

type TimePeriod = '1h' | '24h' | '7d' | '30d';

export const Analytics: React.FC = () => {
  const { dispatch } = useApp();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('24h');
  const [chartHeight, setChartHeight] = useState(400);
  const [metrics, setMetrics] = React.useState<TradeMetrics>({
    totalTrades: 156,
    successRate: 68.5,
    avgProfitLoss: 12.3,
    bestTrade: 45.2,
    worstTrade: -15.8
  });
  const [sentiment, setSentiment] = React.useState<'bullish' | 'bearish'>('bullish');

  useEffect(() => {
    const handleResize = () => {
      setChartHeight(window.innerHeight - 220);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('http://localhost:8080/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: StatusResponse = await response.json();
      
      setChartData(prev => {
        const newPoint = { timestamp: new Date(), value: data.total_balance || 0 };
        const newData = [...prev, newPoint];
        return newData.slice(-17280); // Keep last 24 hours
      });

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to fetch status:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formattedChartData = {
    labels: chartData.map(point => format(point.timestamp, 'HH:mm')),
    datasets: [
      {
        label: 'Portfolio Value',
        data: chartData.map(point => point.value),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Mock data - replace with real data from your backend
  const mockTrades: Trade[] = [
    {
      timestamp: '2024-02-20 10:30:00',
      pair: 'SOL/USDC',
      type: 'BUY',
      price: 100.50,
      amount: 1.5,
      profit: 15.75
    },
    {
      timestamp: '2024-02-20 11:15:00',
      pair: 'BONK/USDC',
      type: 'SELL',
      price: 0.00001234,
      amount: 1000000,
      profit: -5.20
    },
    {
      timestamp: '2024-02-20 12:00:00',
      pair: 'WIF/USDC',
      type: 'BUY',
      price: 0.45,
      amount: 222.22,
      profit: 25.30
    },
    {
      timestamp: '2024-02-20 12:45:00',
      pair: 'MYRO/USDC',
      type: 'SELL',
      price: 0.12,
      amount: 833.33,
      profit: 10.15
    },
    {
      timestamp: '2024-02-20 13:30:00',
      pair: 'POPCAT/USDC',
      type: 'BUY',
      price: 0.00002345,
      amount: 426439.23,
      profit: -8.90
    },
    {
      timestamp: '2024-02-20 14:15:00',
      pair: 'BOME/USDC',
      type: 'SELL',
      price: 0.00000123,
      amount: 8130081.30,
      profit: 12.45
    },
    {
      timestamp: '2024-02-20 15:00:00',
      pair: 'SAMO/USDC',
      type: 'BUY',
      price: 0.05,
      amount: 2000,
      profit: 18.75
    },
    {
      timestamp: '2024-02-20 15:45:00',
      pair: 'BONK/USDC',
      type: 'SELL',
      price: 0.00001250,
      amount: 800000,
      profit: 22.30
    },
    {
      timestamp: '2024-02-20 16:30:00',
      pair: 'WIF/USDC',
      type: 'BUY',
      price: 0.48,
      amount: 208.33,
      profit: -3.15
    },
    {
      timestamp: '2024-02-20 17:15:00',
      pair: 'MYRO/USDC',
      type: 'SELL',
      price: 0.13,
      amount: 769.23,
      profit: 15.80
    }
  ];

  const totalTrades = mockTrades.length;
  const winningTrades = mockTrades.filter(trade => (trade.profit || 0) > 0).length;
  const totalProfit = mockTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
  const averageProfit = totalProfit / totalTrades;
  const bestTrade = Math.max(...mockTrades.map(trade => trade.profit || 0));
  const worstTrade = Math.min(...mockTrades.map(trade => trade.profit || 0));
  const successRate = (winningTrades / totalTrades) * 100;

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Performance Card */}
        <div className="bg-black border border-[#00FF00]/20 p-4 rounded">
          <div className="text-[#00FF00] font-mono text-lg mb-4">PERFORMANCE</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Success Rate</span>
              <span className="text-[#00FF00] font-mono">{successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Avg Profit/Loss</span>
              <span className="text-[#00FF00] font-mono">${averageProfit.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Total Profit</span>
              <span className="text-[#00FF00] font-mono">${totalProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Best Trades Card */}
        <div className="bg-black border border-[#00FF00]/20 p-4 rounded">
          <div className="text-[#00FF00] font-mono text-lg mb-4">BEST TRADES</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Best Trade</span>
              <span className="text-[#00FF00] font-mono">${bestTrade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Worst Trade</span>
              <span className="text-[#FF0000] font-mono">${worstTrade.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Total Trades</span>
              <span className="text-[#00FF00] font-mono">{totalTrades}</span>
            </div>
          </div>
        </div>

        {/* Market Sentiment Card */}
        <div className="bg-black border border-[#00FF00]/20 p-4 rounded">
          <div className="text-[#00FF00] font-mono text-lg mb-4">MARKET SENTIMENT</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Overall Sentiment</span>
              <span className="text-[#00FF00] font-mono">BULLISH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Volume 24h</span>
              <span className="text-[#00FF00] font-mono">$2.5M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00FF00]/70 font-mono">Active Pairs</span>
              <span className="text-[#00FF00] font-mono">5</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-black border border-[#00FF00]/20 p-4 rounded">
        <div className="flex justify-between items-center mb-6">
          <div className="text-[#00FF00] font-mono text-lg">RECENT ACTIVITY</div>
          <div className="flex space-x-2">
            {(['1h', '24h', '7d', '30d'] as TimePeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 rounded font-mono text-sm ${
                  selectedPeriod === period
                    ? 'bg-[#00FF00]/20 text-[#00FF00]'
                    : 'text-[#00FF00]/50 hover:text-[#00FF00]/70'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        {/* Portfolio Performance Chart */}
        <div className="h-[400px] w-full">
          <EnhancedChart
            data={{
              labels: chartData.map(point => format(point.timestamp, 'HH:mm')),
              datasets: [{
                label: 'Portfolio Value',
                data: chartData.map(point => point.value),
                borderColor: '#00FF00',
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                tension: 0.4,
                fill: true,
              }]
            }}
            title="Portfolio Performance"
            height={400}
            onRangeChange={(range) => setSelectedPeriod(range as TimePeriod)}
          />
        </div>
      </div>
    </div>
  );
};

export default Analytics; 