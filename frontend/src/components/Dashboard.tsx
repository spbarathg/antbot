import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface Log {
  type: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: Date;
}

const Dashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const { isLoading } = state;
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [wsRetryCount, setWsRetryCount] = useState<number>(0);
  const [logs, setLogs] = useState<Log[]>([
    { timestamp: new Date(), type: 'INFO', message: 'Solana Memecoin Bot Initialized' }
  ]);

  const addLog = useCallback((type: Log['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }].slice(-50));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await fetch('http://localhost:8080/status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setLastUpdated(new Date());
      addLog('INFO', `Bot status: ${data.bot_status}, Portfolio Value: $${data.total_balance || 0}`);
      dispatch({ type: 'SET_LOADING', payload: false });
    } catch (error) {
      console.error('Failed to fetch status:', error);
      addLog('ERROR', 'Failed to fetch status update');
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, addLog]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        addLog('INFO', 'WebSocket connected successfully');
        setWsRetryCount(0);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const logType = data.type?.toUpperCase() as Log['type'] || 'INFO';
          addLog(logType, data.message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        addLog('ERROR', 'WebSocket connection error');
      };

      ws.onclose = () => {
        if (wsRetryCount < 5) {
          const delay = Math.min(1000 * Math.pow(2, wsRetryCount), 30000);
          reconnectTimeout = setTimeout(() => {
            setWsRetryCount(prev => prev + 1);
            connectWebSocket();
          }, delay);
          addLog('ERROR', `WebSocket disconnected. Reconnecting in ${delay/1000}s...`);
        } else {
          addLog('ERROR', 'WebSocket connection failed after maximum retries');
        }
      };
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [wsRetryCount, addLog]);

  const getStatusSymbol = (type: Log['type']) => {
    switch (type) {
      case 'ERROR': return '■';
      case 'WARN': return '▲';
      case 'INFO': return '●';
    }
  };

  const getStatusColor = (type: Log['type']) => {
    switch (type) {
      case 'ERROR': return 'text-[#FF0000]';
      case 'WARN': return 'text-[#FFFF00]';
      case 'INFO': return 'text-[#00FF00]';
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const logText = logs
      .map(log => `[${format(log.timestamp, 'HH:mm:ss')}] ${log.type}: ${log.message}`)
      .join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `antbot-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Status Bar */}
      <div className="bg-black rounded border border-[#00FF00]/20 shadow-[0_0_10px_rgba(0,255,0,0.1)] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative flex items-center">
              <div className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${wsRetryCount === 0 ? 'bg-[#00FF00]' : 'bg-[#FF0000]'}`} />
              <ArrowPathIcon className="w-5 h-5 text-[#00FF00]/60" />
            </div>
            <span className="font-mono text-sm text-[#00FF00]/60 tracking-wider">
              {format(lastUpdated, 'HH:mm:ss')}
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-black/50 px-3 py-1.5 rounded border border-[#00FF00]/10">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00FF00]" />
                <span className="text-[#00FF00]/80 text-sm font-mono">BOT ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Feed */}
      <div className="bg-black rounded border border-[#00FF00]/20 shadow-[0_0_10px_rgba(0,255,0,0.1)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[#00FF00] font-mono text-xl">LIVE FEED</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleExportLogs}
              className="bg-black/50 border border-[#00FF00]/20 hover:border-[#00FF00]/40 
                       text-[#00FF00]/80 hover:text-[#00FF00] font-mono py-2 px-4 rounded
                       transition-all duration-200 text-sm"
            >
              Export Logs
            </button>
            <button
              onClick={handleClearLogs}
              className="bg-black/50 border border-[#00FF00]/20 hover:border-[#00FF00]/40 
                       text-[#00FF00]/80 hover:text-[#00FF00] font-mono py-2 px-4 rounded
                       transition-all duration-200 text-sm"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="space-y-3 font-mono text-sm h-[calc(100vh-300px)] overflow-y-auto">
          {logs.map((log, index) => (
            <div 
              key={index} 
              className={`flex items-center space-x-2 ${getStatusColor(log.type)}`}
            >
              <span>{getStatusSymbol(log.type)}</span>
              <span className="text-[#00FF00]/50">
                {format(log.timestamp, 'HH:mm:ss')}
              </span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;