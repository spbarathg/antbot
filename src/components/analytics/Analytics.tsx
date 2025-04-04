import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import PortfolioValue from './PortfolioValue';
import TopTrades from './TopTrades';
import AntGenerations from './AntGenerations';
import { COLORS, TYPOGRAPHY, SPACING, commonStyles } from './theme';

// Import JetBrains Mono font
import '@fontsource/jetbrains-mono';

const AnalyticsContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(SPACING.section),
  backgroundColor: COLORS.background,
  color: COLORS.text.primary,
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  overflowY: 'auto',
  ...commonStyles.scrollbar,
}));

const MetricCard = styled(Box)(({ theme }) => ({
  ...commonStyles.card,
  padding: theme.spacing(SPACING.card),
  marginBottom: theme.spacing(SPACING.section),
  '& .MuiTypography-root': {
    fontFamily: TYPOGRAPHY.fontFamily,
  },
  '& .metric-header': {
    fontSize: TYPOGRAPHY.sizes.header,
    fontWeight: 700,
    color: COLORS.text.primary,
    marginBottom: theme.spacing(2),
  },
  '& .metric-value': {
    fontSize: TYPOGRAPHY.sizes.body,
    textAlign: 'right',
    fontWeight: 500,
  },
  '& .metric-label': {
    fontSize: TYPOGRAPHY.sizes.body,
    color: COLORS.text.secondary,
  },
  '& .profit': {
    color: COLORS.status.profit,
  },
  '& .loss': {
    color: COLORS.status.loss,
  },
  '& .divider': {
    height: '1px',
    backgroundColor: COLORS.border,
    margin: theme.spacing(2, 0),
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: TYPOGRAPHY.sizes.title,
  fontWeight: 700,
  color: COLORS.text.primary,
  marginBottom: theme.spacing(2),
  fontFamily: TYPOGRAPHY.fontFamily,
}));

const Analytics: React.FC = () => {
  const theme = useTheme();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      switch (event.key.toLowerCase()) {
        case 'r':
          // Refresh data
          break;
        case '/':
          // Focus search
          break;
        case 'e':
          // Export report
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <AnalyticsContainer>
      <Grid container spacing={SPACING.section}>
        {/* Portfolio Value Section */}
        <Grid item xs={12}>
          <SectionTitle>Portfolio Value</SectionTitle>
          <PortfolioValue />
        </Grid>

        {/* Top Trades Section */}
        <Grid item xs={12}>
          <SectionTitle>Top Trades</SectionTitle>
          <TopTrades />
        </Grid>

        {/* Ant Generations Section */}
        <Grid item xs={12}>
          <SectionTitle>Ant Generations</SectionTitle>
          <AntGenerations />
        </Grid>
      </Grid>
    </AnalyticsContainer>
  );
};

export default Analytics; 