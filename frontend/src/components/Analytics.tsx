import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedChart } from './EnhancedChart';
import { format } from 'date-fns';
import { useApp } from '../context/AppContext';

interface ChartDataPoint {
  timestamp: Date;
  value: number;
}

interface StatusResponse {
  total_balance: number;
  bot_status: string;
  active_trades: number;
}

export const Analytics: React.FC = () => {
  const { dispatch } = useApp();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartHeight, setChartHeight] = useState(window.innerHeight - 220);

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

  return (
    <div className="space-y-3">
      <div className="bg-background-card rounded-lg shadow-card p-5">
        <h2 className="text-lg font-semibold mb-5">Portfolio Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
          {/* Performance Metrics */}
          {[
            { title: 'Total Return', value: '+245%', period: 'All Time' },
            { title: 'Best Trade', value: '+85%', period: 'BONK/SOL' },
            { title: 'Average Return', value: '+12.5%', period: 'Per Trade' },
          ].map((metric) => (
            <div key={metric.title} className="bg-background rounded-lg p-4">
              <h3 className="text-text-secondary text-sm">{metric.title}</h3>
              <div className="mt-2">
                <span className="text-2xl font-bold text-success">{metric.value}</span>
                <span className="text-text-secondary text-sm ml-2">{metric.period}</span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Portfolio Performance Chart */}
        <div className="h-[calc(100vh-14rem)]">
          <EnhancedChart
            data={formattedChartData}
            title="Portfolio Performance"
            height={chartHeight}
          />
        </div>
      </div>
    </div>
  );
}; 