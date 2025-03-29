import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import PortfolioChart from './PortfolioChart';
import MarketOverview from './MarketOverview';
import LiveFeed from './LiveFeed';

interface Log {
  timestamp: string;
  type: 'info' | 'error' | 'trade' | 'alert';
  message: string;
}

interface Trade {
  pair: string;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  duration: string;
}

interface MarketData {
  topGainers: Array<{ pair: string; change: number }>;
  topLosers: Array<{ pair: string; change: number }>;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface ChartDataPoint {
  timestamp: Date;
  value: number;
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const { isLoading } = state;
  const [balance, setBalance] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [terminalOutput, setTerminalOutput] = useState<Log[]>([
    { timestamp: format(new Date(), 'HH:mm:ss'), type: 'info', message: 'Solana Memecoin Bot Initialized' },
  ]);
  const [wsRetryCount, setWsRetryCount] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([
    { pair: 'BONK/SOL', entryPrice: 0.00001, currentPrice: 0.000012, pnl: 20, duration: '2h 15m' },
    { pair: 'WIF/SOL', entryPrice: 0.05, currentPrice: 0.06, pnl: 25, duration: '1h 30m' },
    { pair: 'SAMO/SOL', entryPrice: 0.1, currentPrice: 0.12, pnl: 15, duration: '3h' },
    { pair: 'BONK/SOL', entryPrice: 0.00001, currentPrice: 0.000009, pnl: -10, duration: '4h' },
  ]);
  const [marketData, setMarketData] = useState<MarketData>({
    topGainers: [
      { pair: 'BONK/SOL', change: 25 },
      { pair: 'WIF/SOL', change: 15 },
      { pair: 'SAMO/SOL', change: 8 },
    ],
    topLosers: [
      { pair: 'BONK/SOL', change: -10 },
      { pair: 'WIF/SOL', change: -5 },
      { pair: 'SAMO/SOL', change: -3 },
    ],
    sentiment: 'bullish',
  });
  const [currentTime, setCurrentTime] = React.useState(new Date());

  const addLog = useCallback((type: Log['type'], message: string) => {
    setTerminalOutput(prev => [
      {
        timestamp: format(new Date(), 'HH:mm:ss'),
        type,
        message
      },
      ...prev
    ].slice(0, 100)); // Keep only last 100 messages
  }, []);

  // Fetch status data
  const fetchData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('http://localhost:8080/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      setBalance(data.total_balance || 0);
      setLastUpdated(new Date());
      
      // Update chart data
      setChartData(prev => {
        const newPoint = { timestamp: new Date(), value: data.total_balance || 0 };
        const newData = [...prev, newPoint];
        // Keep last 24 hours of data points (assuming 5s updates = 17280 points)
        return newData.slice(-17280);
      });
      
      addLog('info', `Bot status: ${data.bot_status}, Portfolio Value: $${data.total_balance || 0}, Active trades: ${data.active_trades || 0}`);

      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to fetch status:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      addLog('error', `Failed to fetch status: ${errorMessage}`);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, addLog]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addLog('info', 'WebSocket connected successfully');
        setWsRetryCount(0); // Reset retry count on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(data.type || 'info', data.message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('error', 'WebSocket connection error');
      };

      ws.onclose = () => {
        if (wsRetryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, wsRetryCount), 30000);
          reconnectTimeout = setTimeout(() => {
            setWsRetryCount(prev => prev + 1);
            connectWebSocket();
          }, delay);
          addLog('error', `WebSocket disconnected. Reconnecting in ${delay/1000}s...`);
        } else {
          addLog('error', 'WebSocket connection failed after maximum retries');
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [wsRetryCount, addLog]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = (type: Log['type']) => {
    switch (type) {
      case 'trade':
        return <CheckCircleIcon className="w-4 h-4 text-success" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-error" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-accent" />;
    }
  };

  const handleClearLogs = () => {
    setTerminalOutput([]);
  };

  const handleExportLogs = () => {
    const logText = terminalOutput
      .map(log => `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antbot-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-[#121212]">
      <main className="flex-1 ml-16 relative">
        <div className="absolute inset-0 overflow-y-auto">
          <div className="p-8 space-y-6">
            {/* Header Section */}
            <div className="status-bar rounded-xl bg-background-card/30 backdrop-blur-xl border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative flex items-center">
                    <div className={`status-dot absolute -right-1 -top-1 w-2 h-2 rounded-full ${wsRetryCount === 0 ? 'bg-success' : 'bg-error'}`} />
                    <ClockIcon className="w-5 h-5 text-text-secondary/60" />
                  </div>
                  <span className="text-sm font-mono text-text-secondary/60 tracking-wider">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="status-indicator bg-background-card/50 px-3 py-1.5 rounded-full border border-white/5">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-text-secondary/80 text-sm font-medium">Bot Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Balance */}
              <div className="metric-card bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5 p-6">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium text-text-secondary/60 uppercase tracking-wider">Total Balance</span>
                  <span className="text-xs font-mono text-text-secondary/40">{format(lastUpdated, 'HH:mm:ss')}</span>
                </div>
                <div className="text-3xl font-semibold bg-gradient-to-r from-accent-sol to-accent-blue bg-clip-text text-transparent">
                  ${balance.toFixed(2)}
                </div>
              </div>

              {/* Active Trades */}
              <div className="metric-card bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5 p-6">
                <span className="text-sm font-medium text-text-secondary/60 uppercase tracking-wider mb-2 block">Active Trades</span>
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-semibold bg-gradient-to-r from-accent-sol to-accent-blue bg-clip-text text-transparent">
                    {recentTrades.length}
                  </div>
                  <div className="flex items-center space-x-1 bg-success/10 px-2 py-1 rounded-full">
                    <span className="text-xs font-medium text-success">{recentTrades.length} pairs</span>
                  </div>
                </div>
              </div>

              {/* Market Sentiment */}
              <div className="metric-card bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5 p-6">
                <span className="text-sm font-medium text-text-secondary/60 uppercase tracking-wider mb-2 block">Market Sentiment</span>
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    marketData.sentiment === 'bullish' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-error/10 text-error'
                  }`}>
                    {marketData.sentiment === 'bullish' ? 'Bullish ▲' : 'Bearish ▼'}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Trades Table */}
            <div className="bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-medium text-text-primary">Recent Trades</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left p-4 text-sm font-medium text-text-secondary/60">Asset</th>
                      <th className="text-right p-4 text-sm font-medium text-text-secondary/60">Entry</th>
                      <th className="text-right p-4 text-sm font-medium text-text-secondary/60">Duration</th>
                      <th className="text-right p-4 text-sm font-medium text-text-secondary/60">Exit</th>
                      <th className="text-right p-4 text-sm font-medium text-text-secondary/60">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTrades.map((trade, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors duration-150"
                      >
                        <td className="p-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-text-primary">{trade.pair}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-text-primary">${trade.entryPrice.toFixed(6)}</td>
                        <td className="p-4 text-right font-mono text-text-secondary">{trade.duration}</td>
                        <td className="p-4 text-right font-mono text-text-primary">
                          {trade.currentPrice ? `$${trade.currentPrice.toFixed(6)}` : '—'}
                        </td>
                        <td className={`p-4 text-right font-mono font-medium ${
                          trade.pnl >= 0 ? 'text-success' : 'text-error'
                        }`}>
                          {trade.pnl >= 0 ? '+' : ''}{trade.pnl}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5 p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Top Gainers</h3>
                <div className="space-y-3">
                  {marketData.topGainers.map((gainer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background-card/20 border border-white/5">
                      <span className="font-medium text-text-primary">{gainer.pair}</span>
                      <span className="font-mono font-medium text-success">+{gainer.change}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5 p-6">
                <h3 className="text-lg font-medium text-text-primary mb-4">Top Losers</h3>
                <div className="space-y-3">
                  {marketData.topLosers.map((loser, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-background-card/20 border border-white/5">
                      <span className="font-medium text-text-primary">{loser.pair}</span>
                      <span className="font-mono font-medium text-error">{loser.change}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Feed */}
            <div className="bg-background-card/30 backdrop-blur-xl rounded-xl border border-white/5">
              <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-text-primary">Live Feed</h3>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleClearLogs}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleExportLogs}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {terminalOutput.map((log, index) => (
                    <div key={index} className="flex items-center space-x-3 p-2 rounded-lg bg-background-card/20 border border-white/5">
                      <span className="text-xs font-mono text-text-secondary/60">{log.timestamp}</span>
                      <span className="text-text-secondary/80">{getStatusIcon(log.type)}</span>
                      <span className="text-sm text-text-primary/90 truncate">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;