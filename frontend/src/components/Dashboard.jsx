import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CurrencyDollarIcon,
  WalletIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { state, dispatch } = useApp();
  const { botStatus, isLoading } = state;
  const [balance, setBalance] = useState(65432.10);
  const [wallets, setWallets] = useState([
    { id: 1, name: 'SOL', balance: '125.5', value: '15,687' },
    { id: 2, name: 'BONK', balance: '15,700,000', value: '22,345' },
    { id: 3, name: 'WIF', balance: '850,000', value: '18,700' },
    { id: 4, name: 'MYRO', balance: '2,500,000', value: '12,500' },
  ]);
  const [terminalOutput, setTerminalOutput] = useState([
    { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Solana Memecoin Bot Initialized' },
    { timestamp: new Date().toLocaleTimeString(), type: 'trade', message: 'Opening long position BONK/SOL @ 0.000001452' },
    { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Monitoring Solana memecoin market conditions...' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const response = await fetch('http://localhost:8080/status');
        const data = await response.json();
        
        setBalance(data.total_balance);
        setTerminalOutput(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: `Bot status: ${data.bot_status}, Portfolio Value: $${data.total_balance}, Active trades: ${data.active_trades}`
        }]);

        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        setTerminalOutput(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: 'Failed to fetch status: ' + error.message
        }]);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const getStatusIcon = (type) => {
    switch (type) {
      case 'trade':
        return <CheckCircleIcon className="w-4 h-4 text-green-400 status-icon" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-[#E57373] status-icon" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-blue-400 status-icon" />;
    }
  };

  const groupLogsByTime = (logs) => {
    const groups = {};
    logs.forEach(log => {
      const date = new Date(log.timestamp);
      const key = `${date.getHours()}:${Math.floor(date.getMinutes() / 5) * 5}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(log);
    });
    return Object.entries(groups).map(([time, entries]) => ({
      time,
      entries
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6">
        {/* Left Side - Balance */}
        <div className="col-span-3">
          <div className="card card-hover">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium text-white/90">Portfolio Value</h2>
              <CurrencyDollarIcon className="w-6 h-6 text-purple-500 icon-hover" />
            </div>
            <div className="text-3xl font-bold text-purple-500 mb-3">
              ${balance.toLocaleString()}
            </div>
            <div className="text-white/50 text-sm font-medium flex items-center">
              Last updated: {new Date().toLocaleTimeString()}
              <ArrowPathIcon className="w-4 h-4 ml-2 text-purple-500 refresh-icon" />
            </div>
          </div>
        </div>

        {/* Center - Terminal */}
        <div className="col-span-6">
          <div className="terminal h-[600px] overflow-y-auto">
            {isLoading && terminalOutput.length === 0 ? (
              <div className="text-purple-500">Initializing Solana memecoin trading system...</div>
            ) : (
              groupLogsByTime(terminalOutput).map((group, groupIndex) => (
                <div key={groupIndex} className="log-group">
                  <div className="log-timestamp">{group.time}</div>
                  <div className="log-entries">
                    {group.entries.map((line, index) => (
                      <div 
                        key={index} 
                        className={`terminal-line ${
                          line.type === 'trade' ? 'terminal-success' : 
                          line.type === 'error' ? 'terminal-error' : 
                          'terminal-info'
                        }`}
                      >
                        {getStatusIcon(line.type)}
                        <span className="text-white/30">[{line.timestamp}]</span> {line.message}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div className="text-purple-500 animate-pulse">_</div>
          </div>
        </div>

        {/* Right Side - Wallets */}
        <div className="col-span-3 space-y-4">
          {wallets.map(wallet => (
            <div key={wallet.id} className="card card-hover">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/90 font-medium text-lg">{wallet.name}</span>
                <WalletIcon className="w-5 h-5 text-purple-500 icon-hover" />
              </div>
              <div className="text-white/50 font-medium">{wallet.balance} tokens</div>
              <div className="text-purple-500 font-bold text-xl mt-1">${wallet.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 