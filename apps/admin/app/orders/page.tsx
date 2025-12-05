'use client';

import { useState, useEffect } from 'react';
import { bff } from '../../lib/api';
import { useToast } from '../components/ToastProvider';
import { Order } from '../../lib/types';

// Enhanced mock data for development
const mockOrders: Order[] = [
  {
    id: 'ord_1234567890abcdef',
    total: 24.99,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    Store: { id: 'store1', name: 'Central Station', region: 'AMER', country: 'United States', city: 'New York' },
    User: { id: 'user1', email: 'customer@example.com' }
  },
  {
    id: 'ord_2345678901bcdefg',
    total: 18.50,
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    Store: { id: 'store2', name: 'Riverside Mall', region: 'EMEA', country: 'United Kingdom', city: 'London' },
    User: { id: 'user2', email: 'john.doe@example.com' }
  },
  {
    id: 'ord_3456789012cdefgh',
    total: 32.75,
    status: 'READY',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 minutes ago
    Store: { id: 'store3', name: 'Tokyo Central', region: 'APAC', country: 'Japan', city: 'Tokyo' },
    User: { id: 'user3', email: 'tanaka@example.com' }
  },
  {
    id: 'ord_4567890123defghi',
    total: 15.25,
    status: 'CANCELLED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    Store: { id: 'store1', name: 'Central Station', region: 'AMER', country: 'United States', city: 'New York' },
    User: { id: 'user4', email: 'sarah@example.com' }
  },
  {
    id: 'ord_5678901234efghij',
    total: 41.00,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    Store: { id: 'store4', name: 'Paris Nord', region: 'EMEA', country: 'France', city: 'Paris' },
    User: { id: 'user5', email: 'marie@example.com' }
  },
  {
    id: 'ord_6789012345fghijk',
    total: 27.80,
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
    Store: { id: 'store5', name: 'Sydney Harbour', region: 'APAC', country: 'Australia', city: 'Sydney' },
    User: { id: 'user6', email: 'james@example.com' }
  },
  {
    id: 'ord_7890123456ghijkl',
    total: 19.95,
    status: 'READY',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(), // 25 minutes ago
    Store: { id: 'store2', name: 'Riverside Mall', region: 'EMEA', country: 'United Kingdom', city: 'London' },
    User: { id: 'user7', email: 'emma@example.com' }
  },
  {
    id: 'ord_8901234567hijklm',
    total: 36.50,
    status: 'COMPLETED',
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    Store: { id: 'store6', name: 'Berlin Hauptbahnhof', region: 'EMEA', country: 'Germany', city: 'Berlin' },
    User: { id: 'user8', email: 'hans@example.com' }
  }
];

const ORDER_STATUSES = ['ALL', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'] as const;
const DATE_RANGES = [
  { label: 'Last Hour', value: 'hour' },
  { label: 'Last 4 Hours', value: '4hours' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'All Time', value: 'all' }
] as const;

// Consistent date formatting to avoid hydration issues
const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  // Use consistent formatting to avoid hydration issues
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }) + ', ' + date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export default function OrdersPage() {
  const { showSuccess, showError } = useToast();
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch orders from API with real-time filtering
  const fetchOrders = async () => {
    try {
      setLoading(true);

      // Build query parameters
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (dateRangeFilter !== 'all') params.set('dateRange', dateRangeFilter);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      params.set('page', currentPage.toString());
      params.set('limit', itemsPerPage.toString());

      const queryString = params.toString();
      const endpoint = `/orders/recent${queryString ? `?${queryString}` : ''}`;

      try {
        // Try to fetch from API first
        const response = await bff<{
          orders: Order[];
          pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
          };
        }>(endpoint);

        setOrders(response.orders);
        // Update pagination info if needed
      } catch (apiError) {
        // Fallback to mock data if API fails
        console.warn('API call failed, using mock data:', apiError);

        // Apply filters to mock data as fallback
        let filteredMockOrders = [...mockOrders];

        // Apply status filter
        if (statusFilter !== 'ALL') {
          filteredMockOrders = filteredMockOrders.filter(order => order.status === statusFilter);
        }

        // Apply date range filter
        if (dateRangeFilter !== 'all') {
          const now = new Date();
          filteredMockOrders = filteredMockOrders.filter(order => {
            const orderDate = new Date(order.createdAt);
            switch (dateRangeFilter) {
              case 'hour':
                return now.getTime() - orderDate.getTime() <= 60 * 60 * 1000;
              case '4hours':
                return now.getTime() - orderDate.getTime() <= 4 * 60 * 60 * 1000;
              case 'today':
                return orderDate.toDateString() === now.toDateString();
              case '7days':
                return now.getTime() - orderDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
              default:
                return true;
            }
          });
        }

        // Apply search filter
        if (searchTerm.trim()) {
          const search = searchTerm.toLowerCase();
          filteredMockOrders = filteredMockOrders.filter(order =>
            order.id.toLowerCase().includes(search) ||
            order.Store?.name.toLowerCase().includes(search) ||
            order.User?.email.toLowerCase().includes(search)
          );
        }

        setOrders(filteredMockOrders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      showError('Failed to load orders. Please try again.');
      // Use mock data as final fallback
      setOrders(mockOrders);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders when component mounts or filters change
  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateRangeFilter, currentPage]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchOrders();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset pagination when filters change (but not search, as it's debounced)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRangeFilter]);

  // Since filtering is now handled by the API, we use orders directly
  const filteredOrders = orders;
  const paginatedOrders = orders; // API handles pagination
  const totalPages = Math.ceil(orders.length / itemsPerPage); // This would come from API response in real implementation

  // ESC key handler for order details
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedOrder) {
        setSelectedOrder(null);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [selectedOrder]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-active';
      case 'PREPARING':
        return 'badge warn';
      case 'READY':
        return 'badge ok';
      case 'CANCELLED':
        return 'badge-inactive';
      default:
        return 'badge';
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };



  if (loading) {
    return (
      <div className="s-wrap">
        <div className="s-panelCard">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-white">Loading orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main>
      <div className="s-wrap">
        <div className="menu-header-section">
          <div>
            <h1 className="s-h1">Orders</h1>
            <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '8px' }}>
              Monitor and manage customer orders across all locations
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/orders" className="s-btn" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.3)' }}>
              Orders List
            </a>
            <a href="/orders/analytics" className="s-btn">
              Analytics
            </a>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="cascading-filters">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="s-select"
            >
              {ORDER_STATUSES.map(status => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All Statuses' : status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="s-select"
            >
              {DATE_RANGES.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>

            <div className="filter-status">
              {filteredOrders.length} orders found
            </div>
          </div>

          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
            </svg>
            <input
              type="text"
              placeholder="Search orders, stores, or customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="s-input search-input"
            />
          </div>
        </div>

        <section className="s-panel">
          <div className="s-panelCard">
            <div className="s-panelHeader">
              <p className="s-panelT">Recent Orders ({filteredOrders.length})</p>
              {totalPages > 1 && (
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>

            <div className="orders-table">
              <div className="orders-header">
                <div className="orders-cell">Order ID</div>
                <div className="orders-cell">Store</div>
                <div className="orders-cell">Customer</div>
                <div className="orders-cell">Total</div>
                <div className="orders-cell">Status</div>
                <div className="orders-cell">Time</div>
                <div className="orders-cell">Actions</div>
              </div>
              <div className="orders-body">
                {paginatedOrders.length === 0 ? (
                  <div className="orders-row">
                    <div className="orders-cell" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>
                      <div style={{ color: 'var(--s-muted)' }}>
                        {searchTerm || statusFilter !== 'ALL' || dateRangeFilter !== 'all'
                          ? 'No orders found matching your criteria'
                          : 'No orders available'
                        }
                      </div>
                    </div>
                  </div>
                ) : (
                  paginatedOrders.map((order) => (
                    <div key={order.id} className="orders-row">
                      <div className="orders-cell">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="order-id-link"
                          title="View order details"
                        >
                          {order.id}
                        </button>
                      </div>
                      <div className="orders-cell">
                        <div className="store-info">
                          <div className="store-name">{order.Store?.name ?? '—'}</div>
                          <div className="store-location">
                            {order.Store?.city && order.Store?.country
                              ? `${order.Store.city}, ${order.Store.country}`
                              : order.Store?.region ?? '—'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="orders-cell">
                        <span className="customer-email">{order.User?.email ?? 'Guest'}</span>
                      </div>
                      <div className="orders-cell">
                        <span className="order-total">£{order.total.toFixed(2)}</span>
                      </div>
                      <div className="orders-cell">
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="orders-cell">
                        <div className="order-time">
                          <div className="relative-time">{formatRelativeTime(order.createdAt)}</div>
                          <div className="absolute-time">{formatDateTime(order.createdAt)}</div>
                        </div>
                      </div>
                      <div className="orders-cell">
                        <div className="orders-actions">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="orders-action-btn orders-view"
                            title="View order details"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                            </svg>
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  Previous
                </button>

                <div className="pagination-numbers">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Order Details Modal */}
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      </div>
    </main>
  );
}

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
}

function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  if (!order) return null;

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-active';
      case 'PREPARING':
        return 'badge warn';
      case 'READY':
        return 'badge ok';
      case 'CANCELLED':
        return 'badge-inactive';
      default:
        return 'badge';
    }
  };

  return (
    <div className="drawer-overlay">
      <div className="drawer-content drawer-slide-right">
        <div className="drawer-header">
          <h2 className="drawer-title">Order Details</h2>
          <button onClick={onClose} className="drawer-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="drawer-form">
          <div className="order-details-grid">
            <div className="order-detail-item">
              <div className="order-detail-label">Order ID</div>
              <div className="order-detail-value order-id">{order.id}</div>
            </div>

            <div className="order-detail-item">
              <div className="order-detail-label">Status</div>
              <div className="order-detail-value">
                <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

            <div className="order-detail-item">
              <div className="order-detail-label">Total Amount</div>
              <div className="order-detail-value order-total">£{order.total.toFixed(2)}</div>
            </div>

            <div className="order-detail-item">
              <div className="order-detail-label">Order Time</div>
              <div className="order-detail-value">{formatDateTime(order.createdAt)}</div>
            </div>

            <div className="order-detail-item">
              <div className="order-detail-label">Store</div>
              <div className="order-detail-value">
                <div>{order.Store?.name ?? 'Unknown Store'}</div>
                {order.Store?.city && order.Store?.country && (
                  <div className="store-location-detail">
                    {order.Store.city}, {order.Store.country}
                  </div>
                )}
                {order.Store?.region && (
                  <span className={`badge region-${order.Store.region.toLowerCase()}`}>
                    {order.Store.region}
                  </span>
                )}
              </div>
            </div>

            <div className="order-detail-item">
              <div className="order-detail-label">Customer</div>
              <div className="order-detail-value">
                {order.User?.email ?? 'Guest Customer'}
              </div>
            </div>
          </div>

          <div className="order-summary">
            <h3 style={{ color: 'var(--s-head)', fontSize: '16px', fontWeight: '600', margin: '24px 0 16px 0' }}>
              Order Summary
            </h3>
            <div className="summary-item">
              <div className="summary-label">Items</div>
              <div className="summary-value">—</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Subtotal</div>
              <div className="summary-value">£{(order.total * 0.9).toFixed(2)}</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">Tax</div>
              <div className="summary-value">£{(order.total * 0.1).toFixed(2)}</div>
            </div>
            <div className="summary-item" style={{ borderTop: '1px solid var(--s-border)', paddingTop: '12px', marginTop: '12px' }}>
              <div className="summary-label" style={{ fontSize: '14px', fontWeight: '600' }}>Total</div>
              <div className="summary-value" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--s-accent-2)' }}>
                £{order.total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
