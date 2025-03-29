import React from 'react';
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
  Scale,
  CoreScaleOptions,
  Tick,
  GridLineOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoint {
  timestamp: Date;
  value: number;
}

interface PortfolioChartProps {
  data: ChartDataPoint[];
}

const PortfolioChart: React.FC<PortfolioChartProps> = ({ data }) => {
  const chartData = {
    labels: data.map(point => format(point.timestamp, 'HH:mm')),
    datasets: [
      {
        label: 'Portfolio Value',
        data: data.map(point => point.value),
        borderColor: '#9945FF',
        backgroundColor: 'rgba(153, 69, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#9945FF',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1E1E1E',
        titleColor: '#E0E0E0',
        bodyColor: '#E0E0E0',
        borderColor: '#2E2E2E',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            return `$${context.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawTicks: false,
        },
        ticks: {
          color: '#9E9E9E',
          font: {
            family: 'JetBrains Mono',
            size: 12,
          },
        },
      },
      y: {
        grid: {
          color: '#2E2E2E',
          drawTicks: false,
        },
        ticks: {
          color: '#9E9E9E',
          font: {
            family: 'JetBrains Mono',
            size: 12,
          },
          callback: function(this: Scale<CoreScaleOptions>, tickValue: number | string) {
            return `$${Number(tickValue).toFixed(2)}`;
          },
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default PortfolioChart; 