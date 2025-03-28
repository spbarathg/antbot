import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  LinearProgress,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { styled } from '@mui/material/styles';

// Types
interface Worker {
  id: string;
  status: 'active' | 'inactive';
  currentBalance: number;
  totalTrades: number;
  successRate: number;
  profitLoss: number;
  lastActive: string;
}

interface Metrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  successRate: number;
  averageProfit: number;
  totalProfit: number;
  averageGasFee: number;
  totalGasSpent: number;
}

interface ProfitTier {
  multiplier: number;
  percentage: number;
  status: string;
  timestamp: string;
}

interface Alert {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

interface PerformanceData {
  timestamp: string;
  profit: number;
  gasFees: number;
}

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
}));

const MetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  backgroundColor: theme.palette.background.default,
}));

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [profitTiers, setProfitTiers] = useState<ProfitTier[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socket = new WebSocket('ws://localhost:8080/ws/dashboard');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWorkers(data.workers);
      setMetrics(data.metrics);
      setProfitTiers(data.profitTiers);
      setAlerts(data.alerts);
      setPerformanceData(data.performanceData);
      setLoading(false);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setLoading(false);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Alerts Section */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {alerts.map((alert, index) => (
          <Grid item xs={12} key={index}>
            <Alert severity={alert.severity}>
              {alert.message}
            </Alert>
          </Grid>
        ))}
      </Grid>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6">Success Rate</Typography>
              <Typography variant="h4">
                {(metrics?.successRate * 100).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics?.successRate * 100}
                sx={{ mt: 1 }}
              />
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6">Total Profit</Typography>
              <Typography variant="h4" color={metrics?.totalProfit >= 0 ? 'success.main' : 'error.main'}>
                ${metrics?.totalProfit.toFixed(2)}
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6">Gas Fees</Typography>
              <Typography variant="h4">
                ${metrics?.totalGasSpent.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg: ${metrics?.averageGasFee.toFixed(2)}
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
        <Grid item xs={12} md={3}>
          <MetricCard>
            <CardContent>
              <Typography variant="h6">Active Workers</Typography>
              <Typography variant="h4">
                {workers.filter(w => w.status === 'active').length}
              </Typography>
            </CardContent>
          </MetricCard>
        </Grid>
      </Grid>

      {/* Performance Chart */}
      <StyledPaper sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Over Time
        </Typography>
        <Box sx={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#8884d8"
                name="Profit"
              />
              <Line
                type="monotone"
                dataKey="gasFees"
                stroke="#82ca9d"
                name="Gas Fees"
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </StyledPaper>

      {/* Profit Tiers */}
      <StyledPaper sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Profit Tiers
        </Typography>
        <Grid container spacing={2}>
          {profitTiers.map((tier, index) => (
            <Grid item xs={12} md={3} key={index}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">
                    {tier.multiplier}x Multiplier
                  </Typography>
                  <Typography variant="body2">
                    {tier.percentage}% of Position
                  </Typography>
                  <Typography
                    variant="body2"
                    color={tier.status === 'completed' ? 'success.main' : 'text.secondary'}
                  >
                    {tier.status}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </StyledPaper>

      {/* Active Workers */}
      <StyledPaper>
        <Typography variant="h6" gutterBottom>
          Active Workers
        </Typography>
        <Grid container spacing={2}>
          {workers.map((worker) => (
            <Grid item xs={12} md={4} key={worker.id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1">
                    Worker {worker.id}
                  </Typography>
                  <Typography
                    variant="body2"
                    color={worker.status === 'active' ? 'success.main' : 'text.secondary'}
                  >
                    Status: {worker.status}
                  </Typography>
                  <Typography variant="body2">
                    Balance: ${worker.currentBalance.toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Trades: {worker.totalTrades}
                  </Typography>
                  <Typography variant="body2">
                    Success Rate: {(worker.successRate * 100).toFixed(1)}%
                  </Typography>
                  <Typography
                    variant="body2"
                    color={worker.profitLoss >= 0 ? 'success.main' : 'error.main'}
                  >
                    P/L: ${worker.profitLoss.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </StyledPaper>
    </Box>
  );
};

export default Dashboard; 