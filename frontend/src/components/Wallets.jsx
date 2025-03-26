import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ethers } from 'ethers';

function Wallets() {
  const { state, dispatch } = useApp();
  const { wallets, isLoading } = state;
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [isAddingWallet, setIsAddingWallet] = useState(false);
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWalletBalances = async () => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          'https://api.mainnet-beta.solana.com'
        );

        const updatedWallets = await Promise.all(
          wallets.map(async (wallet) => {
            const balance = await provider.getBalance(wallet.address);
            return {
              ...wallet,
              balance: ethers.utils.formatEther(balance),
            };
          })
        );

        dispatch({ type: 'SET_WALLETS', payload: updatedWallets });
      } catch (error) {
        setError('Failed to fetch wallet balances');
      }
    };

    fetchWalletBalances();
    const interval = setInterval(fetchWalletBalances, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [wallets, dispatch]);

  const handleAddWallet = async () => {
    try {
      setError(null);

      if (!ethers.utils.isAddress(newWalletAddress)) {
        throw new Error('Invalid wallet address');
      }

      const response = await fetch('http://localhost:8080/api/wallets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: newWalletAddress,
          name: newWalletName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add wallet');
      }

      const newWallet = await response.json();
      dispatch({ type: 'ADD_WALLET', payload: newWallet });
      setIsAddingWallet(false);
      setNewWalletAddress('');
      setNewWalletName('');
    } catch (error) {
      setError(error.message);
    }
  };

  const handleRemoveWallet = async (address) => {
    try {
      setError(null);

      const response = await fetch(`http://localhost:8080/api/wallets/${address}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove wallet');
      }

      dispatch({ type: 'REMOVE_WALLET', payload: address });
    } catch (error) {
      setError(error.message);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Wallet Management</h2>
        <button
          onClick={() => setIsAddingWallet(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Add Wallet
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {isAddingWallet && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Wallet</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Wallet Name
              </label>
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Enter wallet name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Wallet Address
              </label>
              <input
                type="text"
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Enter wallet address"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsAddingWallet(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWallet}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Add Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {wallets.map((wallet) => (
                <li key={wallet.address} className="py-5">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {wallet.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {wallet.address}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {parseFloat(wallet.balance).toFixed(4)} SOL
                        </p>
                        <p className="text-sm text-gray-500">
                          Last updated: {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveWallet(wallet.address)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {selectedWallet && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Transaction History
          </h3>
          <div className="flow-root">
            <ul className="-my-5 divide-y divide-gray-200">
              {selectedWallet.transactions?.map((tx, index) => (
                <li key={index} className="py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {tx.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          tx.type === 'buy'
                            ? 'text-green-600'
                            : tx.type === 'sell'
                            ? 'text-red-600'
                            : 'text-gray-600'
                        }`}
                      >
                        {tx.type === 'buy' ? '+' : '-'}
                        {tx.amount} SOL
                      </p>
                      <p className="text-sm text-gray-500">
                        {tx.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallets; 