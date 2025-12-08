'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Users, Target, AlertCircle, Sparkles } from 'lucide-react';

interface AdvancedAnalysis {
  storeId: string;
  benchmark: any;
  clustering: any;
  prediction: any;
  generatedAt: string;
}

export default function AdvancedAnalysisTab({ storeId }: { storeId: string }) {
  const [analysis, setAnalysis] = useState<AdvancedAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/stores/${storeId}/advanced-analysis`);
      
      if (!response.ok) {
        throw new Error('Failed to load analysis');
      }
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getRatingColor = (rating: string) => {
    const colors: Record<string, string> = {
      EXCELLENT: 'text-green-600 bg-green-50',
      GOOD: 'text-blue-600 bg-blue-50',
      FAIR: 'text-yellow-600 bg-yellow-50',
      POOR: 'text-red-600 bg-red-50',
    };
    return colors[rating] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-gray-600">Generating advanced analysis with GPT-5.1...</p>
          <p className="text-sm text-gray-500 mt-1">This may take 10-20 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadAnalysis}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 mb-4">Advanced AI analysis powered by GPT-5.1</p>
        <p className="text-sm text-gray-500 mb-6">
          Get peer benchmarking, performance clustering, and revenue predictions
        </p>
        <button
          onClick={loadAnalysis}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Generate Analysis
        </button>
      </div>
    );
  }

  const { benchmark, clustering, prediction } = analysis;

  return (
    <div className="space-y-6">
      {/* Peer Benchmarking */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Peer Benchmarking</h3>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Performance Rating</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-2 ${getRatingColor(benchmark.rating)}`}>
              {benchmark.rating}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Percentile Rank</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {benchmark.percentileRank.toFixed(0)}th
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">vs Peer Average</p>
            <p className={`text-2xl font-bold mt-1 ${benchmark.performanceGapPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {benchmark.performanceGapPercent >= 0 ? '+' : ''}{benchmark.performanceGapPercent.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Peer Average</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(benchmark.peerAverage)}
            </p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900 mb-2">AI Insights</p>
          <p className="text-sm text-blue-800">{benchmark.insights}</p>
        </div>

        {benchmark.recommendations && benchmark.recommendations.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-2">Recommendations</p>
            <ul className="space-y-2">
              {benchmark.recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-900 mb-3">Top Peer Stores</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Store</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Location</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Revenue</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Similarity</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {benchmark.peers.slice(0, 5).map((peer: any) => (
                  <tr key={peer.storeId}>
                    <td className="px-3 py-2 font-medium text-gray-900">{peer.storeName}</td>
                    <td className="px-3 py-2 text-gray-600">{peer.city}, {peer.country}</td>
                    <td className="px-3 py-2 text-gray-900">{formatCurrency(peer.revenue)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${peer.similarity * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{(peer.similarity * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{peer.selectionReason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Performance Clustering */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Performance Clustering</h3>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-purple-900 mb-1">This Store's Cluster</p>
          <p className="text-lg font-bold text-purple-900">{clustering.targetStoreCluster}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-900 mb-2">Network Insights</p>
          <p className="text-sm text-blue-800">{clustering.insights}</p>
        </div>

        {clustering.patterns && clustering.patterns.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900 mb-2">Identified Patterns</p>
            <ul className="space-y-2">
              {clustering.patterns.map((pattern: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-purple-600 mt-0.5">•</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {clustering.clusters.map((cluster: any) => (
            <div key={cluster.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{cluster.name}</h4>
                <span className="text-sm text-gray-600">{cluster.storeCount} stores</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{cluster.description}</p>
              <p className="text-lg font-bold text-gray-900 mb-2">
                {formatCurrency(cluster.avgRevenue)}
              </p>
              <div className="text-xs text-gray-600">
                {cluster.characteristics.map((char: string, idx: number) => (
                  <div key={idx}>• {char}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue Prediction */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Revenue Prediction</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Predicted Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(prediction.predictedAnnualRevenue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(prediction.confidenceInterval.low)} - {formatCurrency(prediction.confidenceInterval.high)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Confidence</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {prediction.confidence}%
            </p>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Actual Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {prediction.actualRevenue ? formatCurrency(prediction.actualRevenue) : 'N/A'}
            </p>
            {prediction.predictionAccuracy !== null && (
              <p className="text-xs text-gray-500 mt-1">
                {prediction.predictionAccuracy.toFixed(0)}% accurate
              </p>
            )}
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-green-900 mb-2">AI Insights</p>
          <p className="text-sm text-green-800">{prediction.insights}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {prediction.riskFactors && prediction.riskFactors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Risk Factors</p>
              <ul className="space-y-1">
                {prediction.riskFactors.map((risk: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-600 mt-0.5">⚠</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {prediction.opportunities && prediction.opportunities.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">Opportunities</p>
              <ul className="space-y-1">
                {prediction.opportunities.map((opp: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{opp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900 mb-3">Prediction Factors</p>
          <div className="space-y-2">
            {prediction.factors.map((factor: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{factor.factor}</span>
                    <span className="text-sm text-gray-600">{(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${factor.weight * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">{prediction.methodology}</p>
        </div>
      </div>

      <div className="text-center text-sm text-gray-500">
        Analysis generated at {new Date(analysis.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}
