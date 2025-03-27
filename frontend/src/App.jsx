import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/globals.css';

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router>
          <div className="min-h-screen bg-black">
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
              </Routes>
            </main>
          </div>
        </Router>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App; 