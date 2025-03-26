import React, { createContext, useContext, useReducer, useEffect } from 'react';

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
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080/ws');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
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
      }
    };

    ws.onerror = (error) => {
      dispatch({ type: 'SET_ERROR', payload: 'WebSocket connection error' });
    };

    return () => ws.close();
  }, []);

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