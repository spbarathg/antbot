import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,
  height: '100%',
}));

const AntGenerations: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with actual data from your backend
  const data = {
    labels: ['Gen 1', 'Gen 2', 'Gen 3', 'Gen 4', 'Gen 5'],
    datasets: [
      {
        label: 'Success Rate (%)',
        data: [85, 92, 88, 95, 90],
        backgroundColor: theme.palette.primary.main,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        callbacks: {
          label: (context: any) => {
            return `${context.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: theme.palette.text.secondary,
        },
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: theme.palette.divider,
        },
        ticks: {
          color: theme.palette.text.secondary,
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <MetricCard>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Ant Generations</Typography>
        <Box>
          <Typography variant="body2" color="text.secondary">
            Total Generations
          </Typography>
          <Typography variant="h4" color="primary">
            5
          </Typography>
        </Box>
      </Box>
      <Box height={300}>
        <Bar data={data} options={options} />
      </Box>
    </MetricCard>
  );
};

export default AntGenerations; 