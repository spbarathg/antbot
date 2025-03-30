import React, { createContext, useContext, useReducer } from 'react';

interface AppState {
  isLoading: boolean;
  settings: {
    tradingEnabled: boolean;
    maxTradeAmount: number;
    stopLoss: number;
    takeProfit: number;
    maxSlippage: number;
    gasAdjustment: number;
    minLiquidity: number;
    apiKeys: {
      [key: string]: string;
    };
  };
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> };

const initialState: AppState = {
  isLoading: false,
  settings: {
    tradingEnabled: false,
    maxTradeAmount: 100,
    stopLoss: 5,
    takeProfit: 10,
    maxSlippage: 1,
    gasAdjustment: 1.2,
    minLiquidity: 10000,
    apiKeys: {}
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 