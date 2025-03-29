import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  useTheme,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,
  height: '100%',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: 400,
  marginTop: theme.spacing(2),
}));

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontFamily: 'monospace',
  padding: theme.spacing(1),
}));

interface TradeHistoryProps {
  timeRange: '24H' | '7D' | 'ALL';
  onTimeRangeChange: (range: '24H' | '7D' | 'ALL') => void;
}

const TradeHistory: React.FC<TradeHistoryProps> = ({
  timeRange,
  onTimeRangeChange,
}) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual data from your backend
  const trades = [
    {
      date: '2024-03-07 14:30',
      pair: 'BONK/SOL',
      direction: 'Long',
      profit: 0.45,
      duration: '15m',
    },
    {
      date: '2024-03-07 14:15',
      pair: 'WIF/SOL',
      direction: 'Short',
      profit: -0.12,
      duration: '10m',
    },
    {
      date: '2024-03-07 14:00',
      pair: 'SAMO/SOL',
      direction: 'Long',
      profit: 0.28,
      duration: '20m',
    },
    // Add more mock trades as needed
  ];

  const filteredTrades = trades.filter((trade) =>
    trade.pair.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MetricCard>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Trade History</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search by pair..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(_, newRange) => newRange && onTimeRangeChange(newRange)}
            size="small"
          >
            <ToggleButton value="24H">24H</ToggleButton>
            <ToggleButton value="7D">7D</ToggleButton>
            <ToggleButton value="ALL">All</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <StyledTableContainer component={Paper}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <StyledTableCell>Date</StyledTableCell>
              <StyledTableCell>Pair</StyledTableCell>
              <StyledTableCell>Direction</StyledTableCell>
              <StyledTableCell align="right">Profit</StyledTableCell>
              <StyledTableCell>Duration</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTrades.map((trade, index) => (
              <TableRow key={index}>
                <StyledTableCell>{trade.date}</StyledTableCell>
                <StyledTableCell>{trade.pair}</StyledTableCell>
                <StyledTableCell>
                  <Typography
                    color={trade.direction === 'Long' ? 'success.main' : 'error.main'}
                  >
                    {trade.direction}
                  </Typography>
                </StyledTableCell>
                <StyledTableCell align="right">
                  <Typography
                    color={trade.profit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {trade.profit >= 0 ? '+' : ''}{trade.profit} SOL
                  </Typography>
                </StyledTableCell>
                <StyledTableCell>{trade.duration}</StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </MetricCard>
  );
};

export default TradeHistory; 