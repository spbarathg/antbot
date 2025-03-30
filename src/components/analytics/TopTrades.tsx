import React from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

const MetricCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
  boxShadow: theme.shadows[1],
  border: `1px solid ${theme.palette.divider}`,
  height: '100%',
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  backgroundColor: 'transparent',
  '& .MuiTableCell-root': {
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
    padding: theme.spacing(2),
  },
  '& .MuiTableHead-root .MuiTableCell-root': {
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
}));

const TopTrades: React.FC = () => {
  const theme = useTheme();

  // Mock data - replace with actual data from your backend
  const trades = [
    {
      id: 1,
      pair: 'SOL/USDC',
      type: 'buy',
      price: 100.50,
      amount: 10,
      profit: 150.25,
      timestamp: '2024-03-20 14:30:00',
    },
    {
      id: 2,
      pair: 'BONK/SOL',
      type: 'sell',
      price: 0.00001234,
      amount: 1000000,
      profit: 89.75,
      timestamp: '2024-03-20 13:15:00',
    },
    {
      id: 3,
      pair: 'RAY/USDC',
      type: 'buy',
      price: 0.85,
      amount: 1000,
      profit: 45.30,
      timestamp: '2024-03-20 12:00:00',
    },
  ];

  return (
    <MetricCard>
      <Typography variant="h6" mb={3}>Top Trades</Typography>
      <StyledTableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Pair</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Profit</TableCell>
              <TableCell>Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>{trade.pair}</TableCell>
                <TableCell>
                  {trade.type === 'buy' ? (
                    <TrendingUpIcon color="success" fontSize="small" />
                  ) : (
                    <TrendingDownIcon color="error" fontSize="small" />
                  )}
                </TableCell>
                <TableCell align="right">${trade.price.toFixed(4)}</TableCell>
                <TableCell align="right">{trade.amount.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ color: trade.profit >= 0 ? 'success.main' : 'error.main' }}>
                  ${trade.profit.toFixed(2)}
                </TableCell>
                <TableCell>{trade.timestamp}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
    </MetricCard>
  );
};

export default TopTrades; 