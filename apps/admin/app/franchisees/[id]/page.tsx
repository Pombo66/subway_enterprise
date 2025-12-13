'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Store, 
  TrendingUp, 
  AlertTriangle,
  Sparkles,
  BarChart3,
  Target
} from 'lucide-react';

interface Franchisee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  totalStores: number;
  activeStores: number;
  totalRevenue: number | null;
  avgStoreRevenue: number | null;
  performanceScore: number | null;
  expansionScore: number | null;
  riskScore: number | null;
  status: string;
  joinedDate: string;
  yearsExperience: number | null;
  previousIndustry: string | null;
}

interface Store {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  status: string | null;
  annualTurnover: number | null;
}

interface Portfolio {
  franchisee: Franchisee;
  stores: Store[];
  metrics: {
    totalRevenue: number;
    avgRevenuePerStore: number;
    activeStores: number;
    totalStores: number;
    revenueGrowth: number;
  };
}

interface FranchiseeAnalysis {
  id: string;
  franchiseeId: string;
  analysisDate: string;
  aiSummary: string;
  recommendations: string[];
  model: string;
  tokensUsed: number;
  // Parsed AI insights
  insights?: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    riskFactors: string[];
    opportunities: string[];
    expansionReady: boolean;
    recommendedStores: number;
    expansionRationale: string;
    churnRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    recommendations: string[];
  };
}

type TabType = 'overview' | 'performance' | 'insights';

export default function FranchiseeDetailsPage() {
  const params = useParams();
  const franchiseeId = params.id as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [analysis, setAnalysis] = useState<FranchiseeAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadPortfolio();
  }, [franchiseeId]);

  const loadAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const response = await fetch(`/api/franchisees/${franchiseeId}/analysis`);
      const data = await response.json();
      
      if (response.ok) {
        // Parse AI insights if they exist
        if (data.aiSummary) {
          try {
            const insights = JSON.parse(data.aiSummary);
            data.insights = insights;
          } catch (e) {
            console.warn('Could not parse AI insights:', e);
          }
        }
        setAnalysis(data);
      } else {
        console.error('Analysis API error:', data);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const generateNewAnalysis = async () => {
    try {
      setAnalysisLoading(true);
      const response = await fetch(`/api/franchisees/${franchiseeId}/analysis`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        // Parse AI insights if they exist
        if (data.aiSummary) {
          try {
            const insights = JSON.parse(data.aiSummary);
            data.insights = insights;
          } catch (e) {
            console.warn('Could not parse AI insights:', e);
          }
        }
        setAnalysis(data);
      } else {
        console.error('Analysis generation error:', data);
      }
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/franchisees/${franchiseeId}/portfolio`);
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Portfolio API error:', data);
        setPortfolio(null);
        return;
      }
      
      // Validate the response structure
      if (data && data.franchisee && data.stores && data.metrics) {
        setPortfolio(data);
      } else {
        console.error('Invalid portfolio data structure:', data);
        setPortfolio(null);
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      setPortfolio(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskColor = (score: number | null) => {
    if (score === null) return 'text-gray-400';
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <a
            href="/franchisees"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Franchisees
          </a>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Failed to load franchisee portfolio</p>
          <p className="text-sm text-gray-400 mt-2">
            There may be a temporary issue with the API. Please try refreshing the page.
          </p>
          <button
            onClick={loadPortfolio}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { franchisee, stores, metrics } = portfolio;

  return (
    <div className="p-8">
      <div className="mb-6">
        <a
          href="/franchisees"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Franchisees
        </a>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{franchisee.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {franchisee.email && <span>{franchisee.email}</span>}
              {franchisee.phone && <span>{franchisee.phone}</span>}
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                {franchisee.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stores</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {franchisee.totalStores}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {franchisee.activeStores} active
              </p>
            </div>
            <Store className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <p className={`text-xs mt-1 ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% growth
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Performance Score</p>
              <p className={`text-2xl font-bold mt-1 ${getScoreColor(franchisee.performanceScore)}`}>
                {franchisee.performanceScore !== null ? `${franchisee.performanceScore}/100` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Expansion: {franchisee.expansionScore || 'N/A'}/100
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Risk Score</p>
              <p className={`text-2xl font-bold mt-1 ${getRiskColor(franchisee.riskScore)}`}>
                {franchisee.riskScore !== null ? `${franchisee.riskScore}/100` : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {franchisee.riskScore && franchisee.riskScore >= 70 ? 'High risk' : 
                 franchisee.riskScore && franchisee.riskScore >= 40 ? 'Medium risk' : 'Low risk'}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Performance
            </button>
            <button
              onClick={() => {
                setActiveTab('insights');
                if (!analysis && !analysisLoading) {
                  loadAnalysis();
                }
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'insights'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Insights
              </span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Company Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {franchisee.companyName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Joined Date</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {formatDate(franchisee.joinedDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Years Experience</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {franchisee.yearsExperience || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Previous Industry</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {franchisee.previousIndustry || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Portfolio</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Store Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Location
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Annual Turnover
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stores.map((store) => (
                        <tr key={store.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {store.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {store.city && store.country ? `${store.city}, ${store.country}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                              store.status === 'ACTIVE' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {store.status || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatCurrency(store.annualTurnover)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {stores.length === 0 && (
                    <div className="text-center py-8">
                      <Store className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No stores assigned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Performance analytics coming soon</p>
              <p className="text-sm text-gray-400 mt-1">
                View trends, benchmarking, and detailed metrics
              </p>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="space-y-6">
              {analysisLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-500">Generating AI insights...</p>
                  <p className="text-sm text-gray-400 mt-1">This may take a few moments</p>
                </div>
              ) : analysis && analysis.insights ? (
                <>
                  {/* Analysis Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
                      <p className="text-sm text-gray-500">
                        Generated on {new Date(analysis.analysisDate).toLocaleDateString()} 
                        using {analysis.model} ({analysis.tokensUsed} tokens)
                      </p>
                    </div>
                    <button
                      onClick={generateNewAnalysis}
                      disabled={analysisLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Refresh Analysis
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Executive Summary</h4>
                    <p className="text-blue-800">{analysis.insights.summary}</p>
                  </div>

                  {/* Expansion Readiness */}
                  <div className={`border rounded-lg p-4 ${
                    analysis.insights.expansionReady 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-medium ${
                        analysis.insights.expansionReady ? 'text-green-900' : 'text-yellow-900'
                      }`}>
                        Expansion Readiness
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        analysis.insights.expansionReady 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {analysis.insights.expansionReady ? 'READY' : 'NOT READY'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      analysis.insights.expansionReady ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      Recommended stores: {analysis.insights.recommendedStores}
                    </p>
                    <p className={`text-sm mt-1 ${
                      analysis.insights.expansionReady ? 'text-green-700' : 'text-yellow-700'
                    }`}>
                      {analysis.insights.expansionRationale}
                    </p>
                  </div>

                  {/* Risk Assessment */}
                  <div className={`border rounded-lg p-4 ${
                    analysis.insights.churnRisk === 'HIGH' 
                      ? 'bg-red-50 border-red-200'
                      : analysis.insights.churnRisk === 'MEDIUM'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`font-medium ${
                        analysis.insights.churnRisk === 'HIGH' 
                          ? 'text-red-900'
                          : analysis.insights.churnRisk === 'MEDIUM'
                          ? 'text-yellow-900'
                          : 'text-green-900'
                      }`}>
                        Churn Risk Assessment
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        analysis.insights.churnRisk === 'HIGH' 
                          ? 'bg-red-100 text-red-800'
                          : analysis.insights.churnRisk === 'MEDIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {analysis.insights.churnRisk} RISK
                      </span>
                    </div>
                    {analysis.insights.riskFactors.length > 0 && (
                      <div>
                        <p className={`text-sm font-medium mb-1 ${
                          analysis.insights.churnRisk === 'HIGH' 
                            ? 'text-red-800'
                            : analysis.insights.churnRisk === 'MEDIUM'
                            ? 'text-yellow-800'
                            : 'text-green-800'
                        }`}>
                          Risk Factors:
                        </p>
                        <ul className={`text-sm list-disc list-inside space-y-1 ${
                          analysis.insights.churnRisk === 'HIGH' 
                            ? 'text-red-700'
                            : analysis.insights.churnRisk === 'MEDIUM'
                            ? 'text-yellow-700'
                            : 'text-green-700'
                        }`}>
                          {analysis.insights.riskFactors.map((factor, index) => (
                            <li key={index}>{factor}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Strengths and Weaknesses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">Strengths</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        {analysis.insights.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">Areas for Improvement</h4>
                      <ul className="text-sm text-red-800 space-y-1">
                        {analysis.insights.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-600 mr-2">•</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Opportunities */}
                  {analysis.insights.opportunities.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Growth Opportunities</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {analysis.insights.opportunities.map((opportunity, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            {opportunity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Recommended Actions</h4>
                    <ul className="text-sm text-gray-800 space-y-2">
                      {analysis.insights.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <Target className="w-4 h-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No AI analysis available</p>
                  <p className="text-sm text-gray-400 mt-1 mb-4">
                    Generate AI-powered insights and recommendations
                  </p>
                  <button
                    onClick={generateNewAnalysis}
                    disabled={analysisLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Generate Analysis
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
