import React from 'react';
import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TimerIcon from '@mui/icons-material/Timer';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: '#1E1E1E',
  borderRadius: '4px',
  padding: theme.spacing(2),
  border: '1px solid #333333',
  height: '100%',
}));

const MetricContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const MetricLabel = styled(Typography)(({ theme }) => ({
  fontSize: '14px',
  color: '#888888',
  fontFamily: 'JetBrains Mono, monospace',
}));

const MetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '16px',
  fontWeight: 500,
  textAlign: 'right',
  fontFamily: 'JetBrains Mono, monospace',
}));

const ProgressRing = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '60px',
  height: '60px',
  marginLeft: theme.spacing(2),
}));

const TopAssetItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  '&:last-child': {
    borderBottom: 'none',
  },
}));

const CoreMetrics: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with actual data from your backend
  const metrics = {
    successRate: 70.0,
    avgProfitLoss: 10.32,
    totalProfit: 103.25,
    totalTrades: 156,
    topAssets: [
      { name: 'BONK/SOL', roi: 28.5, trades: 45, volatility: 12.3 },
      { name: 'WIF/SOL', roi: 15.2, trades: 38, volatility: 8.7 },
      { name: 'SAMO/SOL', roi: -5.1, trades: 32, volatility: 10.4 },
    ],
  };

  return (
    <Grid container spacing={2}>
      {/* Basic Performance Snapshot */}
      <Grid item xs={12} md={8}>
        <MetricCard>
          <Typography className="metric-header">
            Performance Metrics
          </Typography>

          {/* Success Rate with Progress Ring */}
          <MetricContainer>
            <Box>
              <MetricLabel>Success Rate</MetricLabel>
              <Box display="flex" alignItems="center">
                <MetricValue>{metrics.successRate.toFixed(1)}%</MetricValue>
                <ProgressRing>
                  <CircularProgress
                    variant="determinate"
                    value={metrics.successRate}
                    size={60}
                    thickness={4}
                    sx={{
                      color: '#00FF00',
                      position: 'absolute',
                      left: 0,
                      '& .MuiCircularProgress-circle': {
                        strokeLinecap: 'round',
                      },
                    }}
                  />
                </ProgressRing>
              </Box>
            </Box>
          </MetricContainer>

          <Box className="divider" />

          {/* Average Profit/Loss */}
          <MetricContainer>
            <MetricLabel>Avg Profit/Loss</MetricLabel>
            <MetricValue className={metrics.avgProfitLoss >= 0 ? 'profit' : 'loss'}>
              {metrics.avgProfitLoss >= 0 ? '+' : ''}{metrics.avgProfitLoss.toFixed(2)} SOL
            </MetricValue>
          </MetricContainer>

          {/* Total Profit */}
          <MetricContainer>
            <MetricLabel>Total Profit</MetricLabel>
            <MetricValue className={metrics.totalProfit >= 0 ? 'profit' : 'loss'}>
              {metrics.totalProfit >= 0 ? '+' : ''}{metrics.totalProfit.toFixed(2)} SOL
            </MetricValue>
          </MetricContainer>

          {/* Total Trades */}
          <MetricContainer>
            <MetricLabel>Total Trades</MetricLabel>
            <MetricValue>{metrics.totalTrades} trades</MetricValue>
          </MetricContainer>
        </MetricCard>
      </Grid>

      {/* Top 3 Assets */}
      <Grid item xs={12} md={4}>
        <MetricCard>
          <Typography variant="h6" gutterBottom>
            Top 3 Assets
          </Typography>
          {metrics.topAssets.map((asset, index) => (
            <TopAssetItem key={index}>
              <Box>
                <Typography variant="subtitle2">{asset.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {asset.trades} trades
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography
                  variant="subtitle2"
                  color={asset.roi >= 0 ? 'success.main' : 'error.main'}
                >
                  {asset.roi >= 0 ? '+' : ''}{asset.roi}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Vol: {asset.volatility}%
                </Typography>
              </Box>
            </TopAssetItem>
          ))}
        </MetricCard>
      </Grid>
    </Grid>
  );
};

export default CoreMetrics; 