import React from 'react';

interface Trade {
  id: string;
  symbol: string;
  entry: number;
  exit: number;
  change: number;
  duration: string;
}

const RecentTradesTable: React.FC = () => {
  // Example data - replace with real data from your API
  const trades: Trade[] = [
    {
      id: '1',
      symbol: 'BONK/SOL',
      entry: 0.00001,
      exit: 0.00002,
      change: 20.0,
      duration: '2h 15m',
    },
    {
      id: '2',
      symbol: 'WIF/SOL',
      entry: 0.15,
      exit: 0.12,
      change: -10.0,
      duration: '1h 30m',
    },
  ];

  return (
    <div className="card">
      <h2 className="text-lg mb-3">Recent Trades</h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Asset</th>
              <th className="numeric">Entry</th>
              <th>Duration</th>
              <th className="numeric">Exit</th>
              <th className="numeric">Change</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="table-row">
                <td>{trade.symbol}</td>
                <td className="numeric numbers">{trade.entry.toFixed(5)} SOL</td>
                <td className="text-text-secondary">{trade.duration}</td>
                <td className="numeric numbers">{trade.exit.toFixed(5)} SOL</td>
                <td className="numeric">
                  <span className={`percentage ${trade.change >= 0 ? 'text-success' : 'text-error'}`}>
                    {trade.change >= 0 ? '+' : ''}{trade.change.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentTradesTable; 