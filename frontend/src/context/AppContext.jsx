import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

const AppContext = createContext();

const initialState = {
  botStatus: {
    isActive: false,
    activeDrones: 0,
    totalCapital: 0,
    activeTrades: 0,
  },
  wallets: {
    queen: {
      address: '',
      balance: 0,
      status: 'inactive',
    },
    princesses: [],
  },
  settings: {
    maxSlippage: 1,
    gasAdjustment: 1.5,
    minLiquidity: 10000,
    apiKeys: {
      birdeye: '',
      openai: '',
    },
  },
  recentActivity: [],
  isLoading: false,
  error: null,
  wsConnected: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_BOT_STATUS':
      return { ...state, botStatus: action.payload };
    case 'UPDATE_WALLETS':
      return { ...state, wallets: action.payload };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: action.payload };
    case 'ADD_ACTIVITY':
      return {
        ...state,
        recentActivity: [action.payload, ...state.recentActivity].slice(0, 50),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_WS_CONNECTED':
      return { ...state, wsConnected: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleWebSocketMessage = useCallback((data) => {
    try {
      switch (data.type) {
        case 'bot_status':
          dispatch({ type: 'SET_BOT_STATUS', payload: data.payload });
          break;
        case 'wallet_update':
          dispatch({ type: 'UPDATE_WALLETS', payload: data.payload });
          break;
        case 'activity':
          dispatch({ type: 'ADD_ACTIVITY', payload: data.payload });
          break;
        case 'error':
          dispatch({ type: 'SET_ERROR', payload: data.message });
          break;
        default:
          console.warn('Unknown WebSocket message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Error processing server message' });
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    let ws = null;
    let reconnectTimeout = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const connect = () => {
      try {
        const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected');
          dispatch({ type: 'SET_WS_CONNECTED', payload: true });
          dispatch({ type: 'SET_ERROR', payload: null });
          retryCount = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection error' });
          dispatch({ type: 'SET_WS_CONNECTED', payload: false });
        };

        ws.onclose = () => {
          dispatch({ type: 'SET_WS_CONNECTED', payload: false });
          if (retryCount < MAX_RETRIES) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`WebSocket reconnecting in ${delay}ms...`);
            reconnectTimeout = setTimeout(() => {
              retryCount++;
              connect();
            }, delay);
          } else {
            dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection failed after maximum retries' });
          }
        };
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to establish WebSocket connection' });
      }
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [handleWebSocketMessage]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
} 