import React from 'react';

interface WebSocketStatusProps {
  isConnected: boolean;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ isConnected }) => {
  return (
    <div className="ws-status" title={isConnected ? 'Connected' : 'Disconnected'}>
      {!isConnected && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full" />
      )}
    </div>
  );
};

export default WebSocketStatus; 