import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: '#1E1E1E',
  borderRadius: '4px',
  padding: theme.spacing(2),
  border: '1px solid #333333',
  height: '100%',
}));

const SentimentBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: '#333333',
  marginTop: theme.spacing(1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
  },
}));

const PairItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1),
  '&:not(:last-child)': {
    borderBottom: '1px solid #333333',
  },
}));

const SentimentBadge = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5, 1.5),
  borderRadius: '4px',
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '14px',
  fontWeight: 500,
}));

const VolumeIndicator = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '12px',
}));

const MarketOverview: React.FC = () => {
  // Mock data - replace with actual data
  const marketData = {
    sentiment: {
      value: 75, // 0-100 scale
      label: 'BULLISH',
    },
    pairs: [
      {
        name: 'BONK/SOL',
        priceChange: 12.5,
        volume: {
          current: '2.5M',
          change: 25,
        },
      },
      {
        name: 'WIF/SOL',
        priceChange: -3.2,
        volume: {
          current: '1.8M',
          change: -20,
        },
      },
      {
        name: 'SAMO/SOL',
        priceChange: 5.7,
        volume: {
          current: '950K',
          change: 5.5,
        },
      },
    ],
  };

  const getSentimentColor = (value: number) => {
    if (value >= 60) return '#00FF00';
    if (value <= 40) return '#FF4444';
    return '#FFA500';
  };

  return (
    <MetricCard>
      <Typography className="metric-header">
        Market Overview
      </Typography>

      {/* Sentiment Indicator */}
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="body2" sx={{ color: '#888888', fontFamily: 'JetBrains Mono, monospace' }}>
            Market Sentiment
          </Typography>
          <SentimentBadge sx={{ backgroundColor: `${getSentimentColor(marketData.sentiment.value)}33` }}>
            {marketData.sentiment.value >= 60 ? <TrendingUpIcon sx={{ color: '#00FF00' }} /> : 
             marketData.sentiment.value <= 40 ? <TrendingDownIcon sx={{ color: '#FF4444' }} /> : null}
            <Typography sx={{ color: getSentimentColor(marketData.sentiment.value) }}>
              {marketData.sentiment.label}
            </Typography>
          </SentimentBadge>
        </Box>
        <SentimentBar
          variant="determinate"
          value={marketData.sentiment.value}
          sx={{
            '& .MuiLinearProgress-bar': {
              backgroundColor: getSentimentColor(marketData.sentiment.value),
            },
          }}
        />
      </Box>

      <Box className="divider" />

      {/* Pair Performance */}
      <Typography variant="body2" sx={{ color: '#888888', mb: 2, fontFamily: 'JetBrains Mono, monospace' }}>
        Pair Performance (24h)
      </Typography>
      {marketData.pairs.map((pair, index) => (
        <PairItem key={index}>
          <Box>
            <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}>
              {pair.name}
            </Typography>
            <VolumeIndicator>
              <Typography component="span" sx={{ color: '#888888' }}>
                Vol: {pair.volume.current}
              </Typography>
              <Typography
                component="span"
                sx={{ color: pair.volume.change >= 0 ? '#00FF00' : '#FF4444' }}
              >
                ({pair.volume.change >= 0 ? '+' : ''}{pair.volume.change}%)
              </Typography>
            </VolumeIndicator>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            {pair.priceChange >= 0 ? (
              <ArrowUpwardIcon sx={{ color: '#00FF00', fontSize: 16 }} />
            ) : (
              <ArrowDownwardIcon sx={{ color: '#FF4444', fontSize: 16 }} />
            )}
            <Typography
              sx={{
                fontFamily: 'JetBrains Mono, monospace',
                color: pair.priceChange >= 0 ? '#00FF00' : '#FF4444',
                fontSize: '14px',
              }}
            >
              {pair.priceChange >= 0 ? '+' : ''}{pair.priceChange}%
            </Typography>
          </Box>
        </PairItem>
      ))}
    </MetricCard>
  );
};

export default MarketOverview; 