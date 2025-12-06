'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const BFF_URL = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';

interface AIConfig {
  continuousEnabled: boolean;
  onDemandEnabled: boolean;
  dailyCostLimit: number;
  monthlyCostLimit: number;
}

interface CostStatus {
  dailySpent: number;
  dailyLimit: number;
  dailyRemaining: number;
  dailyPercent: number;
  monthlySpent: number;
  monthlyLimit: number;
  monthlyRemaining: number;
  monthlyPercent: number;
}

export default function AIIntelligenceSettings() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [costStatus, setCostStatus] = useState<CostStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BFF_URL}/ai/intelligence/status`);
      setConfig(response.data.config);
      setCostStatus(response.data.costStatus);
      setError(null);
    } catch (err) {
      setError('Failed to load AI intelligence status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleContinuous = async () => {
    if (!config) return;
    
    try {
      setUpdating(true);
      await axios.post(`${BFF_URL}/ai/intelligence/continuous/toggle`, {
        enabled: !config.continuousEnabled
      });
      await fetchStatus();
    } catch (err) {
      setError('Failed to toggle continuous intelligence');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleOnDemand = async () => {
    if (!config) return;
    
    try {
      setUpdating(true);
      await axios.post(`${BFF_URL}/ai/intelligence/ondemand/toggle`, {
        enabled: !config.onDemandEnabled
      });
      await fetchStatus();
    } catch (err) {
      setError('Failed to toggle on-demand intelligence');
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-2">AI Intelligence Control</h1>
      <p className="text-gray-600 mb-6">
        Manage AI-powered store analysis and cost controls
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Continuous Intelligence */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Continuous Intelligence</h2>
              <p className="text-sm text-gray-600 mb-4">
                Automatically analyze all stores daily using AI. Estimated cost: ~$0.21/store/month
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config?.continuousEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config?.continuousEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
            
            <button
              onClick={toggleContinuous}
              disabled={updating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                config?.continuousEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {updating ? 'Updating...' : config?.continuousEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>

          {config?.continuousEnabled && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                ⚡ Continuous intelligence is active. Stores are analyzed daily with AI-powered insights.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* On-Demand Intelligence */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">On-Demand Analysis</h2>
              <p className="text-sm text-gray-600 mb-4">
                Allow users to trigger AI analysis manually. Cost: ~$0.007 per analysis
              </p>
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config?.onDemandEnabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config?.onDemandEnabled ? 'Available' : 'Disabled'}
                </span>
              </div>
            </div>
            
            <button
              onClick={toggleOnDemand}
              disabled={updating}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                config?.onDemandEnabled
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {updating ? 'Updating...' : config?.onDemandEnabled ? 'Disable' : 'Enable'}
            </button>
          </div>
        </div>
      </div>

      {/* Cost Status */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Cost Status</h2>
          
          {/* Daily */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Daily Spend</span>
              <span className="text-sm font-semibold">
                ${costStatus?.dailySpent.toFixed(2)} / ${costStatus?.dailyLimit.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (costStatus?.dailyPercent || 0) >= 80
                    ? 'bg-red-600'
                    : (costStatus?.dailyPercent || 0) >= 60
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(costStatus?.dailyPercent || 0, 100)}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {costStatus?.dailyPercent.toFixed(0)}% of daily limit
            </div>
          </div>

          {/* Monthly */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Monthly Spend</span>
              <span className="text-sm font-semibold">
                ${costStatus?.monthlySpent.toFixed(2)} / ${costStatus?.monthlyLimit.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  (costStatus?.monthlyPercent || 0) >= 80
                    ? 'bg-red-600'
                    : (costStatus?.monthlyPercent || 0) >= 60
                    ? 'bg-yellow-500'
                    : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(costStatus?.monthlyPercent || 0, 100)}%` }}
              ></div>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {costStatus?.monthlyPercent.toFixed(0)}% of monthly limit
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 About AI Intelligence</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Uses GPT-5-mini for cost-effective, high-quality analysis</li>
          <li>• Analyzes store performance, identifies issues, and provides recommendations</li>
          <li>• Cost limits prevent unexpected charges</li>
          <li>• Can be disabled instantly if needed</li>
        </ul>
      </div>
    </div>
  );
}
