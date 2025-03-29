import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

interface ApiKeys {
  [key: string]: string;
}

interface SettingsState {
  apiKeys: ApiKeys;
  [key: string]: any;
}

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const [localSettings, setLocalSettings] = useState<SettingsState>(state.settings);

  const handleChange = (field: string, value: string | number | boolean) => {
    setLocalSettings((prev: SettingsState) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApiKeyChange = (key: string, value: string) => {
    setLocalSettings((prev: SettingsState) => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8080/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(localSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      dispatch({ type: 'UPDATE_SETTINGS', payload: localSettings });
    } catch (error) {
      console.error('Error saving settings:', error);
      // You might want to show an error message to the user here
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="bg-background-card rounded-card shadow-card p-6">
        <h2 className="text-lg font-semibold mb-4">Bot Settings</h2>
        
        {/* Trading Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-text-secondary">Enable Trading</label>
            <input
              type="checkbox"
              checked={localSettings.tradingEnabled}
              onChange={(e) => handleChange('tradingEnabled', e.target.checked)}
              className="toggle"
            />
          </div>
          
          <div>
            <label className="text-text-secondary block mb-2">Max Trade Amount (USD)</label>
            <input
              type="number"
              value={localSettings.maxTradeAmount}
              onChange={(e) => handleChange('maxTradeAmount', parseFloat(e.target.value))}
              className="input-field"
              min="0"
              step="1"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-2">Stop Loss (%)</label>
            <input
              type="number"
              value={localSettings.stopLoss}
              onChange={(e) => handleChange('stopLoss', parseFloat(e.target.value))}
              className="input-field"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div>
            <label className="text-text-secondary block mb-2">Take Profit (%)</label>
            <input
              type="number"
              value={localSettings.takeProfit}
              onChange={(e) => handleChange('takeProfit', parseFloat(e.target.value))}
              className="input-field"
              min="0"
              max="1000"
              step="0.1"
            />
          </div>
        </div>

        {/* API Keys */}
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-4">API Keys</h3>
          <div className="space-y-4">
            {['Binance', 'Solana'].map((platform) => (
              <div key={platform}>
                <label className="text-text-secondary block mb-2">{platform} API Key</label>
                <input
                  type="password"
                  value={localSettings.apiKeys[platform] || ''}
                  onChange={(e) => handleApiKeyChange(platform, e.target.value)}
                  className="input-field"
                  placeholder={`Enter your ${platform} API key`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-white rounded-button hover:bg-accent-hover transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}; 