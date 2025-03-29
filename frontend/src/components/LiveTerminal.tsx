import React, { useEffect, useRef } from 'react';

interface LogEntry {
  type: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  timestamp: Date;
}

interface LiveTerminalProps {
  logs: LogEntry[];
}

const getStatusSymbol = (type: LogEntry['type']) => {
  switch (type) {
    case 'ERROR': return '■';
    case 'WARN': return '▲';
    case 'INFO': return '●';
    default: return '●';
  }
};

const getStatusColor = (type: LogEntry['type']) => {
  switch (type) {
    case 'ERROR': return 'text-[#FF0000]';
    case 'WARN': return 'text-[#FFFF00]';
    case 'INFO': return 'text-[#00FF00]';
    default: return 'text-[#00FF00]';
  }
};

const LiveTerminal: React.FC<LiveTerminalProps> = ({ logs }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs arrive
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Terminal Header */}
      <div className="bg-black border-b border-[#00FF00]/50 p-3">
        <h2 className="font-mono text-[#00FF00] tracking-[2px] flex items-center">
          <span>LIVE</span>
          <span className="ml-2">FEED</span>
        </h2>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef}
        className="flex-1 bg-black overflow-y-auto relative font-mono text-sm terminal-scrollbar"
      >
        {/* Noise Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyBAMAAADsEZWCAAAAGFBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAE6d/iAAAACHRSTlMABQgNERQHDhIt9G8AAABSSURBVDjLY2BDAA4GKJChC4FQDEJQDGYQguIQhGIxg1Acgg5QDDYQisUMQnEIQjGYQQiKQxCKxQxCcQhCMZhBCIpDEIrFDEJxCEIxmEEojgMA1/Qv0LB7jXcAAAAASUVORK5CYII=")',
            backgroundRepeat: 'repeat'
          }}
        />

        {/* Log Entries */}
        <div className="p-3 space-y-2">
          {logs.map((log, index) => (
            <div
              key={index}
              className="font-jetbrains-mono text-[14px] leading-relaxed terminal-log-entry"
            >
              <span className={`${getStatusColor(log.type)}`}>
                [{log.type}] {getStatusSymbol(log.type)}
              </span>
              <span className="text-[#00FF00]/90 ml-2">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-[1px] bg-black">
        <div className="h-full w-full bg-[#00FF00]/50" />
      </div>
    </div>
  );
};

export default LiveTerminal; 