import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CurrencyDollarIcon,
  WalletIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

function Dashboard() {
  const { state, dispatch } = useApp();
  const { isLoading } = state;
  const [balance, setBalance] = useState(0);
  const [wallets, setWallets] = useState([]);
  const [terminalOutput, setTerminalOutput] = useState([
    { timestamp: new Date().toLocaleTimeString(), type: 'info', message: 'Solana Memecoin Bot Initialized' },
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

        // Fetch wallet data
        const walletsResponse = await fetch('http://localhost:8080/wallets');
        const walletsData = await walletsResponse.json();
        setWallets(walletsData);

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

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setTerminalOutput(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        type: data.type,
        message: data.message
      }]);
    };

    ws.onerror = (error) => {
      setTerminalOutput(prev => [...prev, {
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: 'WebSocket connection error: ' + error.message
      }]);
    };

    return () => ws.close();
  }, []);

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
            <div className="text-white/50 text-sm font-medium">
              Last updated: {new Date().toLocaleTimeString()}
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