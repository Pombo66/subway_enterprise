'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, MapPin, DollarSign } from 'lucide-react';
import { StoreWithActivity } from '../types';

interface StorePerformanceTableProps {
  stores: StoreWithActivity[];
  onStoreSelect: (store: StoreWithActivity) => void;
}

interface StorePerformance extends StoreWithActivity {
  revenue: number;
  orders: number;
  performanceScore: number;
}

export default function StorePerformanceTable({ stores, onStoreSelect }: StorePerformanceTableProps) {
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

  // Get top 3 and bottom 2 performers
  const { topPerformers, bottomPerformers } = useMemo(() => {
    const sorted = [...storesWithPerformance].sort((a, b) => b.performanceScore - a.performanceScore);
    
    return {
      topPerformers: sorted.slice(0, 3),
      bottomPerformers: sorted.slice(-2).reverse() // Reverse to show worst first
    };
  }, [storesWithPerformance]);

  const handleStoreClick = (store: StorePerformance) => {
    onStoreSelect(store);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="s-panel" style={{ marginTop: '24px' }}>
      <div className="s-panelCard">
        <div className="s-panelHeader">
          <div className="s-panelT">Store Performance Today</div>
          <div style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
            Top performers and areas for improvement
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Top Performers */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--s-border)'
            }}>
              <TrendingUp size={16} style={{ color: '#22c55e' }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--s-text)' 
              }}>
                Top Performers
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topPerformers.map((store, index) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  style={{
                    padding: '16px',
                    background: 'var(--s-bg)',
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--s-hover)';
                    e.currentTarget.style.borderColor = '#22c55e';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--s-bg)';
                    e.currentTarget.style.borderColor = 'var(--s-border)';
                  }}
                >
                  {/* Rank badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    background: '#22c55e',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {index + 1}
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: 'var(--s-text)',
                      marginBottom: '4px'
                    }}>
                      {store.name}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--s-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MapPin size={12} />
                      {store.country}, {store.region}
                      {store.recentActivity && (
                        <span style={{ 
                          marginLeft: '8px',
                          color: '#22c55e',
                          fontSize: '11px'
                        }}>
                          ● Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '16px' 
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: 'var(--s-text)' 
                      }}>
                        {formatCurrency(store.revenue)}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--s-muted)' 
                      }}>
                        Revenue
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: 'var(--s-text)' 
                      }}>
                        {store.orders}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--s-muted)' 
                      }}>
                        Orders
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Performers */}
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid var(--s-border)'
            }}>
              <TrendingDown size={16} style={{ color: '#ef4444' }} />
              <h3 style={{ 
                margin: 0, 
                fontSize: '16px', 
                fontWeight: '600', 
                color: 'var(--s-text)' 
              }}>
                Needs Attention
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bottomPerformers.map((store, index) => (
                <div
                  key={store.id}
                  onClick={() => handleStoreClick(store)}
                  style={{
                    padding: '16px',
                    background: 'var(--s-bg)',
                    border: '1px solid var(--s-border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--s-hover)';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--s-bg)';
                    e.currentTarget.style.borderColor = 'var(--s-border)';
                  }}
                >
                  {/* Warning badge */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '24px',
                    height: '24px',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    !
                  </div>

                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ 
                      fontWeight: '600', 
                      color: 'var(--s-text)',
                      marginBottom: '4px'
                    }}>
                      {store.name}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: 'var(--s-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MapPin size={12} />
                      {store.country}, {store.region}
                      {!store.recentActivity && (
                        <span style={{ 
                          marginLeft: '8px',
                          color: 'var(--s-muted)',
                          fontSize: '11px'
                        }}>
                          ○ Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '16px' 
                  }}>
                    <div>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: 'var(--s-text)' 
                      }}>
                        {formatCurrency(store.revenue)}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--s-muted)' 
                      }}>
                        Revenue
                      </div>
                    </div>
                    <div>
                      <div style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: 'var(--s-text)' 
                      }}>
                        {store.orders}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--s-muted)' 
                      }}>
                        Orders
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hide MapLibre attribution that overlaps */}
      <style jsx global>{`
        .maplibregl-ctrl-attrib {
          display: none !important;
        }
        .maplibregl-ctrl-bottom-right {
          display: none !important;
        }
      `}</style>
    </div>
  );
}