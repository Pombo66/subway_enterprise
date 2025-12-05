'use client';

import { useEffect, useState } from 'react';

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  User: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  items: Array<{
    quantity: number;
    price: number;
    MenuItem: {
      name: string;
    };
  }>;
}

export function OrdersTab({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const url = `/api/stores/${storeId}/orders${statusFilter ? `?status=${statusFilter}` : ''}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        }
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [storeId, statusFilter]);

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading orders...</div>;
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--s-muted)', fontSize: '14px' }}>
          {orders.length} order{orders.length !== 1 ? 's' : ''} found
        </p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="s-select"
          style={{ width: '200px' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div style={{ overflowX: 'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--s-muted)' }}>
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {order.id.slice(0, 8)}...
                      </td>
                      <td>
                        {order.User ? (
                          <>
                            {order.User.firstName} {order.User.lastName}
                            <br />
                            <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
                              {order.User.email}
                            </span>
                          </>
                        ) : (
                          <span style={{ color: 'var(--s-muted)' }}>Guest</span>
                        )}
                      </td>
                      <td>
                        {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                        <br />
                        <span style={{ fontSize: '12px', color: 'var(--s-muted)' }}>
                          {order.items.slice(0, 2).map(item => item.MenuItem.name).join(', ')}
                          {order.items.length > 2 && '...'}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        ${Number(order.total).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge status-${order.status.toLowerCase()}`}>
                          {order.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                        {new Date(order.createdAt).toLocaleDateString()}
                        <br />
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
