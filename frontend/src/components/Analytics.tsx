import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedChart } from './EnhancedChart';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';
import { 
  StarIcon,
  SparklesIcon,
  BugAntIcon
} from '@heroicons/react/24/solid';

interface ChartDataPoint {
  timestamp: Date;
  value: number;
}

interface StatusResponse {
  total_balance: number;
  bot_status: string;
  active_trades: number;
}

interface Trade {
  timestamp: string;
  pair: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  profit?: number;
  ant: string;
  profitPercentage: number;
}

interface AntStatus {
  id: string;
  type: 'queen' | 'princess' | 'worker';
  status: 'active' | 'inactive';
  currentTask?: string;
  capitalAllocated?: number;
  activeTrades?: number;
}

type TimePeriod = '1h' | '24h' | '7d' | '30d';

const Analytics: React.FC = () => {
  const { dispatch } = useApp();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('24h');
  const [chartHeight, setChartHeight] = useState(400);

  // Mock data for colony status
  const colonyStatus: AntStatus[] = [
    {
      id: 'queen-1',
      type: 'queen',
      status: 'active',
      capitalAllocated: 75,
      activeTrades: 12
    },
    {
      id: 'princess-1',
      type: 'princess',
      status: 'active',
      currentTask: 'High-Priority Trade: XYZ/USDC',
      activeTrades: 3
    },
    {
      id: 'princess-2',
      type: 'princess',
      status: 'active',
      currentTask: 'Monitoring Market Conditions',
      activeTrades: 2
    },
    {
      id: 'worker-1',
      type: 'worker',
      status: 'active',
      currentTask: 'Executing SOL/USDC Trade'
    },
    {
      id: 'worker-2',
      type: 'worker',
      status: 'active',
      currentTask: 'Monitoring JUP/USDC Position'
    },
    {
      id: 'worker-3',
      type: 'worker',
      status: 'inactive',
      currentTask: 'Waiting for Signals'
    }
  ];

  const getAntIcon = (type: AntStatus['type']) => {
    switch (type) {
      case 'queen':
        return <StarIcon className="w-6 h-6 text-accent-primary" />;
      case 'princess':
        return <SparklesIcon className="w-6 h-6 text-accent-primary" />;
      case 'worker':
        return <BugAntIcon className="w-6 h-6 text-accent-primary" />;
    }
  };

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
        fill: true,
        tension: 0.4
      }
    ]
  };

  const handlePeriodChange = (period: string) => {
    if (period === '1h' || period === '24h' || period === '7d' || period === '30d') {
      setSelectedPeriod(period as TimePeriod);
      // Implement period change logic here
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Portfolio Value Chart */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-6">Portfolio Value</h2>
        <div className="h-[400px]">
          <EnhancedChart
            data={formattedChartData}
            title="Portfolio Value"
            height={chartHeight}
            onRangeChange={handlePeriodChange}
          />
        </div>
      </div>

      {/* Colony Status */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-6">Colony Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colonyStatus.map((ant) => (
            <div 
              key={ant.id}
              className="bg-background-primary rounded-lg p-4 border border-background-tertiary"
            >
              <div className="flex items-center space-x-3">
                {getAntIcon(ant.type)}
                <div>
                  <h3 className="text-text-primary font-medium">
                    {ant.type.charAt(0).toUpperCase() + ant.type.slice(1)} #{ant.id.split('-')[1]}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${
                      ant.status === 'active' ? 'bg-accent-success' : 'bg-accent-error'
                    }`} />
                    <span className="text-sm text-text-secondary">
                      {ant.status.charAt(0).toUpperCase() + ant.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
              {ant.currentTask && (
                <p className="text-sm text-text-secondary mt-3">{ant.currentTask}</p>
              )}
              {ant.capitalAllocated && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-text-secondary">
                    <span>Capital Allocated</span>
                    <span>{ant.capitalAllocated}%</span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-2 mt-1">
                    <div 
                      className="bg-accent-primary h-2 rounded-full"
                      style={{ width: `${ant.capitalAllocated}%` }}
                    />
                  </div>
                </div>
              )}
              {ant.activeTrades && (
                <div className="mt-3 text-sm text-text-secondary">
                  Active Trades: {ant.activeTrades}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trades */}
      <div className="card">
        <h2 className="text-xl font-bold text-text-primary mb-6">Recent Trades</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-background-tertiary">
                <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Time</th>
                <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Pair</th>
                <th className="text-left py-3 px-4 text-text-secondary text-sm font-medium">Type</th>
                <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">Price</th>
                <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">Amount</th>
                <th className="text-right py-3 px-4 text-text-secondary text-sm font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {/* Add trade rows here */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 