import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  KeyIcon,
  WalletIcon,
  ChartBarIcon,
  ShieldExclamationIcon,
  CommandLineIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/solid';

interface ApiKeys {
  [key: string]: string;
}

interface SettingsState {
  apiKeys: ApiKeys;
  [key: string]: any;
}

interface SettingSection {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  description: string;
}

interface ValidationError {
  field: string;
  message: string;
}

type ValidatableValue = string | number;

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const [localSettings, setLocalSettings] = useState<SettingsState>(state.settings);
  const [activeSection, setActiveSection] = useState('trading');
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const sections: SettingSection[] = [
    {
      id: 'trading',
      title: 'Trading Parameters',
      icon: ChartBarIcon,
      description: 'Configure trading strategies and parameters'
    },
    {
      id: 'risk',
      title: 'Risk Management',
      icon: ShieldExclamationIcon,
      description: 'Set risk limits and safety measures'
    },
    {
      id: 'api',
      title: 'API Keys & Integration',
      icon: KeyIcon,
      description: 'Manage API keys and external integrations'
    },
    {
      id: 'wallet',
      title: 'Wallet',
      icon: WalletIcon,
      description: 'Configure wallet settings and connections'
    }
  ];

  const validateInput = (field: string, value: ValidatableValue): boolean => {
    const errors: ValidationError[] = [];
    
    switch (field) {
      case 'positionSize':
        if (typeof value === 'number' && (value < 0.1 || value > 10)) {
          errors.push({ field, message: 'Position size must be between 0.1% and 10%' });
        }
        break;
      case 'slippage':
        if (typeof value === 'number' && (value < 0.1 || value > 5)) {
          errors.push({ field, message: 'Slippage must be between 0.1% and 5%' });
        }
        break;
      case 'stopLoss':
      case 'takeProfit':
        if (typeof value === 'number' && (value < 1 || value > 50)) {
          errors.push({ field, message: 'Value must be between 1% and 50%' });
        }
        break;
      case 'maxDailyLoss':
        if (typeof value === 'number' && (value < 1 || value > 20)) {
          errors.push({ field, message: 'Maximum daily loss must be between 1% and 20%' });
        }
        break;
      case 'apiKey':
        if (typeof value === 'string' && (!value || value.length < 32)) {
          errors.push({ field, message: 'Invalid API key format' });
        }
        break;
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleChange = (field: string, value: string | number | boolean) => {
    if (typeof value === 'string' || typeof value === 'number') {
      if (validateInput(field, value)) {
        setLocalSettings((prev: SettingsState) => ({
          ...prev,
          [field]: value
        }));
      }
    } else {
      setLocalSettings((prev: SettingsState) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleApiKeyChange = (key: string, value: string) => {
    if (validateInput('apiKey', value)) {
      setLocalSettings((prev: SettingsState) => ({
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          [key]: value
        }
      }));
    }
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
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'trading':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Position Sizing (%)
                </label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={localSettings.positionSize || 2.5}
                  onChange={(e) => handleChange('positionSize', parseFloat(e.target.value))}
                  min={0.1}
                  max={10}
                  step={0.1}
                />
                {validationErrors.find(e => e.field === 'positionSize') && (
                  <p className="text-accent-error text-sm mt-1">
                    {validationErrors.find(e => e.field === 'positionSize')?.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Slippage Tolerance (%)
                </label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={localSettings.slippage || 1.0}
                  onChange={(e) => handleChange('slippage', parseFloat(e.target.value))}
                  min={0.1}
                  max={5}
                  step={0.1}
                />
                {validationErrors.find(e => e.field === 'slippage') && (
                  <p className="text-accent-error text-sm mt-1">
                    {validationErrors.find(e => e.field === 'slippage')?.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Trading Pairs
              </label>
              <textarea
                className="input-field w-full h-32"
                placeholder="Enter trading pairs (one per line)"
                value={localSettings.tradingPairs || 'SOL/USDC\nBONK/SOL\nJUP/USDC'}
                onChange={(e) => handleChange('tradingPairs', e.target.value)}
              />
            </div>
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={localSettings.stopLoss || 5}
                  onChange={(e) => handleChange('stopLoss', parseFloat(e.target.value))}
                  min={1}
                  max={20}
                  step={1}
                />
                {validationErrors.find(e => e.field === 'stopLoss') && (
                  <p className="text-accent-error text-sm mt-1">
                    {validationErrors.find(e => e.field === 'stopLoss')?.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Take Profit (%)
                </label>
                <input
                  type="number"
                  className="input-field w-full"
                  value={localSettings.takeProfit || 10}
                  onChange={(e) => handleChange('takeProfit', parseFloat(e.target.value))}
                  min={1}
                  max={50}
                  step={1}
                />
                {validationErrors.find(e => e.field === 'takeProfit') && (
                  <p className="text-accent-error text-sm mt-1">
                    {validationErrors.find(e => e.field === 'takeProfit')?.message}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Maximum Daily Loss (%)
              </label>
              <input
                type="number"
                className="input-field w-full"
                value={localSettings.maxDailyLoss || 10}
                onChange={(e) => handleChange('maxDailyLoss', parseFloat(e.target.value))}
                min={1}
                max={20}
                step={1}
              />
              {validationErrors.find(e => e.field === 'maxDailyLoss') && (
                <p className="text-accent-error text-sm mt-1">
                  {validationErrors.find(e => e.field === 'maxDailyLoss')?.message}
                </p>
              )}
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Solana RPC Endpoint
              </label>
              <input
                type="text"
                className="input-field w-full"
                placeholder="https://api.mainnet-beta.solana.com"
                value={localSettings.rpcEndpoint || ''}
                onChange={(e) => handleChange('rpcEndpoint', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Jito API Key
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your Jito API key"
                  value={localSettings.apiKeys?.jito || ''}
                  onChange={(e) => handleApiKeyChange('jito', e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Helius API Key
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your Helius API key"
                  value={localSettings.apiKeys?.helius || ''}
                  onChange={(e) => handleApiKeyChange('helius', e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Birdeye API Key
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your Birdeye API key"
                  value={localSettings.apiKeys?.birdeye || ''}
                  onChange={(e) => handleApiKeyChange('birdeye', e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                OpenAI API Key
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your OpenAI API key"
                  value={localSettings.apiKeys?.openai || ''}
                  onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      case 'wallet':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Wallet Private Key
              </label>
              <div className="relative">
                <input
                  type={showPrivateKey ? 'text' : 'password'}
                  className="input-field w-full pr-10"
                  placeholder="Enter your wallet private key"
                  value={localSettings.walletKey || ''}
                  onChange={(e) => handleChange('walletKey', e.target.value)}
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  onClick={() => setShowPrivateKey(!showPrivateKey)}
                >
                  {showPrivateKey ? (
                    <EyeSlashIcon className="h-5 w-5" />
                  ) : (
                    <EyeIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Section Navigation */}
      <div className="flex space-x-4 border-b border-background-tertiary pb-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-default
                       ${activeSection === section.id
                         ? 'bg-accent-primary bg-opacity-10 text-accent-primary'
                         : 'text-text-secondary hover:text-accent-primary hover:bg-accent-primary hover:bg-opacity-5'}`}
          >
            <section.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{section.title}</span>
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="card">
          <h2 className="text-xl font-bold text-text-primary mb-6">
            {sections.find(s => s.id === activeSection)?.title}
          </h2>
          <p className="text-text-secondary mb-6">
            {sections.find(s => s.id === activeSection)?.description}
          </p>
          {renderSectionContent()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          className="btn-secondary"
          onClick={() => setLocalSettings(state.settings)}
        >
          Reset
        </button>
        <button
          className="btn-primary"
          onClick={handleSave}
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Settings; 