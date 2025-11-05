import { NextResponse } from 'next/server';

// Mock recent orders for activity indicators
const mockRecentOrders = [
  {
    id: "order-1",
    storeId: "store-1",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    Store: {
      id: "store-1",
      name: "Central Station"
    }
  },
  {
    id: "order-2", 
    storeId: "store-3",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    Store: {
      id: "store-3",
      name: "Downtown Plaza"
    }
  },
  {
    id: "order-3",
    storeId: "store-6", 
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    Store: {
      id: "store-6",
      name: "Mall Plaza"
    }
  }
];

export async function GET(request: Request) {
  const response = {
    orders: mockRecentOrders,
    pagination: {
      total: mockRecentOrders.length
    }
  };

  return NextResponse.json(response);
}