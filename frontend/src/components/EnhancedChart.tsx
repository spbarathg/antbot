import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import type { ChartData } from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

interface ChartProps {
  data: ChartData<'line'>;
  title: string;
  height?: number;
  onRangeChange?: (range: string) => void;
}

export const EnhancedChart: React.FC<ChartProps> = ({
  data,
  title,
  height = 400,
  onRangeChange
}) => {
  const [timeRange, setTimeRange] = React.useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isZoomed, setIsZoomed] = React.useState(false);

  const chartRef = useRef<ChartJS<'line'>>(null);

  const handleResetZoom = React.useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
      setIsZoomed(false);
    }
  }, []);

  const handleRangeChange = React.useCallback((range: typeof timeRange) => {
    setTimeRange(range);
    onRangeChange?.(range);
  }, [onRangeChange]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            return `$${context.parsed.y.toLocaleString()}`;
          },
        },
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
          onPanComplete: () => setIsZoomed(true),
        },
        zoom: {
          wheel: {
            enabled: true,
            modifierKey: 'ctrl',
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
          onZoomComplete: () => setIsZoomed(true),
        },
      },
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#A0AEC0',
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#A0AEC0',
        },
      },
    },
  };

  return (
    <div className="bg-background-card rounded-card shadow-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            {['1h', '24h', '7d', '30d'].map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range as typeof timeRange)}
                className={`px-3 py-1 rounded-button text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-accent text-white'
                    : 'bg-background-hover hover:bg-border'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          {isZoomed && (
            <button
              onClick={handleResetZoom}
              className="px-3 py-1 rounded-button text-sm bg-background-hover hover:bg-border transition-colors"
            >
              Reset Zoom
            </button>
          )}
        </div>
      </div>
      <div style={{ height }} className="relative">
        <Line
          ref={chartRef}
          data={data}
          options={options}
          className="transition-opacity duration-200"
        />
      </div>
    </div>
  );
}; 