'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, MapPin, X } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  city?: string | null;
  status?: string | null;
  recentActivity?: boolean;
}

interface StorePerformance extends Store {
  revenue: number;
  orders: number;
  performanceScore: number;
}

interface StorePerformanceAnalysisProps {
  stores: Store[];
  onStoreSelect: (store: Store) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function StorePerformanceAnalysis({ 
  stores, 
  onStoreSelect, 
  isOpen, 
  onClose 
}: StorePerformanceAnalysisProps) {
  // Generate mock performance data and calculate scores
  const storesWithPerformance = useMemo((): StorePerformance[] => {
    return stores.map(store => {
      // Generate consistent mock data based on store ID
      const seed = store.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const random1 = (seed * 9301 + 49297) % 233280 / 233280;
      const random2 = ((seed + 1) * 9301 + 49297) % 233280 / 233280;
      
      const baseRevenue = 1000 + (random1 * 4000); // $1K - $5K
      const baseOrders = 20 + (random2 * 80); // 20 - 100 orders
      
      // Activity bonus
      const activityMultiplier = store.recentActivity ? 1.3 : 0.8;
      
      const revenue = Math.round(baseRevenue * activityMultiplier);
      const orders = Math.round(baseOrders * activityMultiplier);
      
      // Performance score (revenue per order + activity bonus)
      const performanceScore = (revenue / orders) + (store.recentActivity ? 10 : 0);
      
      return {
        ...store,
        revenue,
        orders,
        performanceScore
      };
    });
  }, [stores]);

  // Get top 10 and bottom 10 performers
  const { topPerformers, bottomPerformers } = useMemo(() => {
    const sorted = [...storesWithPerformance].sort((a, b) => b.performanceScore - a.performanceScore);
    
    return {
      topPerformers: sorted.slice(0, 10),
      bottomPerformers: sorted.slice(-10).reverse() // Reverse to show worst first
    };
  }, [storesWithPerformance]);

  const handleStoreClick = (store: StorePerformance) => {
    onStoreSelect(store);
    onClose(); // Close the modal after selecting a store
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Store Performance Analysis</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="performance-content">
          <div className="performance-grid">
            {/* Top Performers */}
            <div className="performance-section">
              <div className="performance-section-header">
                <TrendingUp size={20} style={{ color: '#22c55e' }} />
                <h3>Top 10 Performers</h3>
              </div>
              
              <div className="performance-list">
                {topPerformers.map((store, index) => (
                  <div
                    key={store.id}
                    onClick={() => handleStoreClick(store)}
                    className="performance-item performance-item-top"
                  >
                    <div className="performance-rank">#{index + 1}</div>
                    <div className="performance-details">
                      <div className="performance-name">{store.name}</div>
                      <div className="performance-location">
                        <MapPin size={12} />
                        {store.city && `${store.city}, `}{store.country}, {store.region}
                        {store.recentActivity && (
                          <span className="activity-indicator active">● Active</span>
                        )}
                      </div>
                      <div className="performance-metrics">
                        <span className="metric">
                          <strong>{formatCurrency(store.revenue)}</strong> revenue
                        </span>
                        <span className="metric">
                          <strong>{store.orders}</strong> orders
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Performers */}
            <div className="performance-section">
              <div className="performance-section-header">
                <TrendingDown size={20} style={{ color: '#ef4444' }} />
                <h3>Bottom 10 Performers</h3>
              </div>
              
              <div className="performance-list">
                {bottomPerformers.map((store, index) => (
                  <div
                    key={store.id}
                    onClick={() => handleStoreClick(store)}
                    className="performance-item performance-item-bottom"
                  >
                    <div className="performance-rank">#{storesWithPerformance.length - 9 + index}</div>
                    <div className="performance-details">
                      <div className="performance-name">{store.name}</div>
                      <div className="performance-location">
                        <MapPin size={12} />
                        {store.city && `${store.city}, `}{store.country}, {store.region}
                        {!store.recentActivity && (
                          <span className="activity-indicator inactive">○ Inactive</span>
                        )}
                      </div>
                      <div className="performance-metrics">
                        <span className="metric">
                          <strong>{formatCurrency(store.revenue)}</strong> revenue
                        </span>
                        <span className="metric">
                          <strong>{store.orders}</strong> orders
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal-content {
            background: var(--s-card);
            border-radius: 12px;
            width: 100%;
            max-width: 1200px;
            max-height: 90vh;
            overflow: hidden;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 24px;
            border-bottom: 1px solid var(--s-border);
          }

          .modal-title {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--s-text);
          }

          .modal-close {
            background: none;
            border: none;
            color: var(--s-muted);
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          .modal-close:hover {
            background: var(--s-hover);
            color: var(--s-text);
          }

          .performance-content {
            padding: 24px;
            overflow-y: auto;
            max-height: calc(90vh - 100px);
          }

          .performance-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
          }

          .performance-section {
            display: flex;
            flex-direction: column;
          }

          .performance-section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--s-border);
          }

          .performance-section-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--s-text);
          }

          .performance-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .performance-item {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 16px;
            background: var(--s-bg);
            border: 1px solid var(--s-border);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .performance-item:hover {
            background: var(--s-hover);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .performance-item-top:hover {
            border-color: #22c55e;
          }

          .performance-item-bottom:hover {
            border-color: #ef4444;
          }

          .performance-rank {
            font-size: 18px;
            font-weight: 700;
            color: var(--s-text);
            min-width: 40px;
            text-align: center;
          }

          .performance-details {
            flex: 1;
          }

          .performance-name {
            font-size: 16px;
            font-weight: 600;
            color: var(--s-text);
            margin-bottom: 6px;
          }

          .performance-location {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--s-muted);
            margin-bottom: 8px;
          }

          .activity-indicator {
            margin-left: 8px;
            font-size: 11px;
            font-weight: 500;
          }

          .activity-indicator.active {
            color: #22c55e;
          }

          .activity-indicator.inactive {
            color: var(--s-muted);
          }

          .performance-metrics {
            display: flex;
            gap: 16px;
            font-size: 13px;
            color: var(--s-muted);
          }

          .metric strong {
            color: var(--s-text);
          }

          @media (max-width: 768px) {
            .modal-content {
              margin: 10px;
              max-height: calc(100vh - 20px);
            }

            .performance-grid {
              grid-template-columns: 1fr;
              gap: 24px;
            }

            .modal-header {
              padding: 16px;
            }

            .performance-content {
              padding: 16px;
            }

            .modal-title {
              font-size: 20px;
            }
          }
        `}</style>
      </div>
    </div>
  );
}