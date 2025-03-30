import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

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
          <div className="h-screen bg-background-primary font-montserrat flex overflow-hidden">
            <Sidebar />
            <main className="flex-1 p-6 overflow-y-auto transition-all duration-sidebar ease-in-out" 
                  style={{ marginLeft: 'var(--sidebar-width, 4rem)' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/settings" element={<Settings />} />
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