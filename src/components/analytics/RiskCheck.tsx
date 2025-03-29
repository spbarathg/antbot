import React from 'react';
import { Box, Grid, Typography, LinearProgress, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,
  height: '100%',
}));

const ProgressBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 4,
  backgroundColor: theme.palette.grey[200],
  marginTop: theme.spacing(1),
  '& .MuiLinearProgress-bar': {
    borderRadius: 4,
  },
}));

const RiskItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  '&:last-child': {
    marginBottom: 0,
  },
}));

const RiskCheck: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with actual data from your backend
  const riskData = {
    exposure: {
      allocated: 85,
      available: 15,
      topPair: {
        name: 'BONK/SOL',
        percentage: 35,
      },
    },
    stopLoss: {
      triggers24h: 3,
      averageSaved: 0.8,
    },
  };

  const getExposureColor = (value: number) => {
    if (value >= 90) return theme.palette.error.main;
    if (value >= 75) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Grid container spacing={2}>
      {/* Exposure Monitor */}
      <Grid item xs={12}>
        <MetricCard>
          <Typography variant="h6" gutterBottom>
            Exposure Monitor
          </Typography>
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">SOL Allocation</Typography>
              <Typography variant="body2">
                {riskData.exposure.allocated}% / 100%
              </Typography>
            </Box>
            <ProgressBar
              variant="determinate"
              value={riskData.exposure.allocated}
              sx={{
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getExposureColor(riskData.exposure.allocated),
                },
              }}
            />
          </Box>

          <Box mb={3}>
            <Typography variant="body2" gutterBottom>
              Top Pair Allocation: {riskData.exposure.topPair.name}
            </Typography>
            <ProgressBar
              variant="determinate"
              value={riskData.exposure.topPair.percentage}
              sx={{
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getExposureColor(riskData.exposure.topPair.percentage),
                },
              }}
            />
          </Box>

          <RiskItem>
            {riskData.exposure.allocated >= 90 ? (
              <WarningIcon color="error" />
            ) : (
              <CheckCircleIcon color="success" />
            )}
            <Typography variant="body2">
              {riskData.exposure.allocated >= 90
                ? 'High exposure - Consider reducing positions'
                : 'Exposure within safe limits'}
            </Typography>
          </RiskItem>
        </MetricCard>
      </Grid>

      {/* Stop-Loss Analysis */}
      <Grid item xs={12}>
        <MetricCard>
          <Typography variant="h6" gutterBottom>
            Stop-Loss Analysis
          </Typography>
          <RiskItem>
            <Typography variant="body2">
              Triggers Hit (24H): {riskData.stopLoss.triggers24h}
            </Typography>
          </RiskItem>
          <RiskItem>
            <Typography variant="body2">
              Average Saved Loss: {riskData.stopLoss.averageSaved} SOL
            </Typography>
          </RiskItem>
          <RiskItem>
            <CheckCircleIcon color="success" />
            <Typography variant="body2">
              Stop-loss system functioning normally
            </Typography>
          </RiskItem>
        </MetricCard>
      </Grid>
    </Grid>
  );
};

export default RiskCheck; 