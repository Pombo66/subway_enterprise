'use client';

import { useState, useEffect } from 'react';
import { Users, TrendingUp, Award, AlertCircle } from 'lucide-react';

interface Franchisee {
  id: string;
  name: string;
  email: string | null;
  totalStores: number;
  activeStores: number;
  totalRevenue: number | null;
  avgStoreRevenue: number | null;
  performanceScore: number | null;
  expansionScore: number | null;
  riskScore: number | null;
  status: string;
}

interface Summary {
  totalFranchisees: number;
  multiStoreOperators: number;
  avgStoresPerFranchisee: number;
  expansionReadyCount: number;
}

export default function FranchiseesPage() {
  const [franchisees, setFranchisees] = useState<Franchisee[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [sortBy, setSortBy] = useState('performanceScore');

  useEffect(() => {
    loadFranchisees();
  }, [statusFilter, sortBy]);

  const loadFranchisees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        sortBy,
        sortOrder: 'desc',
      });
      
      const response = await fetch(`/api/franchisees?${params}`);
      const data = await response.json();
      
      setFranchisees(data.franchisees);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to load franchisees:', error);
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Franchisee Intelligence</h1>
        <p className="text-gray-600 mt-1">
          Track franchisee performance, identify expansion opportunities, and manage risk
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Franchisees</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.totalFranchisees}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Multi-Store Operators</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.multiStoreOperators}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Stores per Franchisee</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.avgStoresPerFranchisee.toFixed(1)}
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expansion Ready</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.expansionReadyCount}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Franchisees</h2>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="EXITED">Exited</option>
                <option value="">All Status</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="performanceScore">Performance Score</option>
                <option value="expansionScore">Expansion Score</option>
                <option value="totalStores">Store Count</option>
                <option value="totalRevenue">Total Revenue</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Franchisee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stores
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Avg Revenue/Store
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Performance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expansion
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Risk
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {franchisees.map((franchisee) => (
                <tr key={franchisee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{franchisee.name}</div>
                      {franchisee.email && (
                        <div className="text-sm text-gray-500">{franchisee.email}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {franchisee.totalStores} total
                      </div>
                      <div className="text-gray-500">
                        {franchisee.activeStores} active
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(franchisee.totalRevenue)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatCurrency(franchisee.avgStoreRevenue)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getScoreColor(franchisee.performanceScore)}`}>
                      {franchisee.performanceScore !== null ? `${franchisee.performanceScore}/100` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getScoreColor(franchisee.expansionScore)}`}>
                      {franchisee.expansionScore !== null ? `${franchisee.expansionScore}/100` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${getRiskColor(franchisee.riskScore)}`}>
                      {franchisee.riskScore !== null ? `${franchisee.riskScore}/100` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/franchisees/${franchisee.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {franchisees.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No franchisees found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
