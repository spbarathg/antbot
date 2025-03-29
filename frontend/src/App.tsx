import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { Analytics } from './components/Analytics';
import Sidebar from './components/Sidebar';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import RecentTradesTable from './components/RecentTradesTable';
import MarketOverview from './components/MarketOverview';
import LiveFeed from './components/LiveFeed';
import WebSocketStatus from './components/WebSocketStatus';

// Import Montserrat font
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/500.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <div className="h-screen bg-background font-montserrat flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-16 p-4 bg-background">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                {/* Add other routes as needed */}
              </Routes>
            </main>
          </div>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App; 