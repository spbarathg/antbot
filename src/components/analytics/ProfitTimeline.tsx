import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORS, TYPOGRAPHY, commonStyles } from './theme';

const ChartContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '400px',
  marginTop: theme.spacing(2),
}));

const TimeRangeButton = styled(Box)(({ theme, active }: { theme?: any; active: boolean }) => ({
  padding: theme.spacing(0.5, 1.5),
  borderRadius: '4px',
  cursor: 'pointer',
  fontFamily: TYPOGRAPHY.fontFamily,
  fontSize: TYPOGRAPHY.sizes.body,
  backgroundColor: active ? COLORS.cardBackground : 'transparent',
  color: active ? COLORS.text.primary : COLORS.text.secondary,
  '&:hover': {
    backgroundColor: COLORS.cardBackground,
  },
}));

const ProfitTimeline: React.FC = () => {
  const theme = useTheme();
  const [activeRange, setActiveRange] = React.useState('24h');

  // Mock data - replace with actual data
  const data = [
    { time: '00:00', value: 0.2 },
    { time: '04:00', value: 0.4 },
    { time: '08:00', value: 0.3 },
    { time: '12:00', value: 0.6 },
    { time: '16:00', value: 0.5 },
    { time: '20:00', value: 0.8 },
    { time: '24:00', value: 1.0 },
  ];

  const timeRanges = ['1h', '24h', '7d', '30d'];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography className="metric-header">
          Portfolio Performance
        </Typography>
        <Box display="flex" gap={1}>
          {timeRanges.map((range) => (
            <TimeRangeButton
              key={range}
              active={activeRange === range}
              onClick={() => setActiveRange(range)}
            >
              {range.toUpperCase()}
            </TimeRangeButton>
          ))}
        </Box>
      </Box>

      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.text.primary} stopOpacity={0.3} />
                <stop offset="100%" stopColor={COLORS.text.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke={COLORS.text.secondary}
              tick={{ 
                fill: COLORS.text.secondary, 
                fontSize: TYPOGRAPHY.sizes.small,
                fontFamily: TYPOGRAPHY.fontFamily 
              }}
            />
            <YAxis
              stroke={COLORS.text.secondary}
              tick={{ 
                fill: COLORS.text.secondary, 
                fontSize: TYPOGRAPHY.sizes.small,
                fontFamily: TYPOGRAPHY.fontFamily 
              }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: COLORS.cardBackground,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontFamily: TYPOGRAPHY.fontFamily,
              }}
              itemStyle={{ color: COLORS.text.primary }}
              labelStyle={{ color: COLORS.text.secondary }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={COLORS.text.primary}
              fill="url(#gradientArea)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Box>
  );
};

export default ProfitTimeline; 