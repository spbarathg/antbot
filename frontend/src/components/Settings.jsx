import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const settingsSchema = yup.object().shape({
  maxCapital: yup
    .number()
    .required('Maximum capital is required')
    .min(0, 'Capital must be positive')
    .max(1000000, 'Capital must be less than 1M'),
  riskLevel: yup
    .number()
    .required('Risk level is required')
    .min(1, 'Risk level must be between 1 and 5')
    .max(5, 'Risk level must be between 1 and 5'),
  minLiquidity: yup
    .number()
    .required('Minimum liquidity is required')
    .min(1000, 'Minimum liquidity must be at least 1000'),
  maxSlippage: yup
    .number()
    .required('Maximum slippage is required')
    .min(0.1, 'Slippage must be at least 0.1%')
    .max(5, 'Slippage must be less than 5%'),
  gasPrice: yup
    .number()
    .required('Gas price is required')
    .min(1, 'Gas price must be at least 1'),
  autoStopLoss: yup
    .number()
    .required('Stop loss is required')
    .min(1, 'Stop loss must be at least 1%')
    .max(20, 'Stop loss must be less than 20%'),
  takeProfit: yup
    .number()
    .required('Take profit is required')
    .min(1, 'Take profit must be at least 1%')
    .max(100, 'Take profit must be less than 100%'),
});

function Settings() {
  const { state, dispatch } = useApp();
  const { settings, isLoading } = state;
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const onSubmit = async (data) => {
    try {
      setIsSaving(true);
      setSaveStatus(null);

      const response = await fetch('http://localhost:8080/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      const updatedSettings = await response.json();
      dispatch({ type: 'SET_SETTINGS', payload: updatedSettings });
      setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
    } catch (error) {
      setSaveStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Bot Settings</h2>

        {saveStatus && (
          <div
            className={`mb-4 p-4 rounded-md ${
              saveStatus.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {saveStatus.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Maximum Capital ($)
            </label>
            <input
              type="number"
              {...register('maxCapital')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.maxCapital && (
              <p className="mt-1 text-sm text-red-600">
                {errors.maxCapital.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Risk Level (1-5)
            </label>
            <input
              type="number"
              {...register('riskLevel')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.riskLevel && (
              <p className="mt-1 text-sm text-red-600">
                {errors.riskLevel.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Minimum Liquidity ($)
            </label>
            <input
              type="number"
              {...register('minLiquidity')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.minLiquidity && (
              <p className="mt-1 text-sm text-red-600">
                {errors.minLiquidity.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Maximum Slippage (%)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('maxSlippage')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.maxSlippage && (
              <p className="mt-1 text-sm text-red-600">
                {errors.maxSlippage.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Gas Price (Gwei)
            </label>
            <input
              type="number"
              {...register('gasPrice')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.gasPrice && (
              <p className="mt-1 text-sm text-red-600">
                {errors.gasPrice.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Stop Loss (%)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('autoStopLoss')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.autoStopLoss && (
              <p className="mt-1 text-sm text-red-600">
                {errors.autoStopLoss.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Take Profit (%)
            </label>
            <input
              type="number"
              step="0.1"
              {...register('takeProfit')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
            {errors.takeProfit && (
              <p className="mt-1 text-sm text-red-600">
                {errors.takeProfit.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings; 