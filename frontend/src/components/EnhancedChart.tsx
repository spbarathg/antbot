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

interface EnhancedChartProps {
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill: boolean;
      tension: number;
    }[];
  };
  title: string;
  height: number;
  onRangeChange?: (range: string) => void;
}

export const EnhancedChart: React.FC<EnhancedChartProps> = ({
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
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1E293B',
        titleColor: '#E2E8F0',
        bodyColor: '#E2E8F0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
        },
        pan: {
          enabled: true,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawOnChartArea: false
        },
        ticks: {
          color: '#94A3B8',
          maxRotation: 0,
        },
      },
      y: {
        grid: {
          color: '#334155',
          drawOnChartArea: true
        },
        ticks: {
          color: '#94A3B8',
          callback: (value) => `$${Number(value).toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="relative">
      <div className="absolute top-0 right-0 z-10 flex space-x-2">
        {isZoomed && (
          <button
            onClick={handleResetZoom}
            className="px-3 py-1 text-sm bg-background-hover text-text-primary rounded-button hover:bg-accent/10 transition-colors"
          >
            Reset Zoom
          </button>
        )}
      </div>
      <Line
        ref={chartRef}
        data={data}
        options={options}
        height={height}
      />
    </div>
  );
}; 