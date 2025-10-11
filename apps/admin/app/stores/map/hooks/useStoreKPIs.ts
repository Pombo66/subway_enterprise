'use client';

import { useState, useEffect, useCallback } from 'react';
import { bff, bffWithErrorHandling } from '../../../../lib/api';
import { z } from 'zod';
import { StoreKPIs } from '../types';
import { MapPerformanceHelpers } from '../performance';

// Zod schemas for API validation
const KPIsResponseSchema = z.object({
  ordersToday: z.number(),
  revenueToday: z.number(),
  pendingOrders: z.number(),
  menuItems: z.number(),
  scopeApplied: z.object({
    scope: z.string(),
    storeId: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
  }),
});

const RecentOrdersSchema = z.object({
  orders: z.array(z.object({
    id: z.string(),
    createdAt: z.string(),
    Store: z.object({
      id: z.string(),
      name: z.string(),
    }),
  })),
  pagination: z.object({
    total: z.number(),
  }),
});

/**
 * Hook for fetching store-specific KPIs and last order information
 */
export function useStoreKPIs(storeId: string | null) {
  const [kpis, setKpis] = useState<StoreKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Formats a date into a relative time string
   */
  const formatRelativeTime = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  /**
   * Fetches store-specific KPIs from the BFF API
   */
  const fetchKPIs = useCallback(async (currentStoreId: string) => {
    try {
      setError(null);
      
      // Fetch KPIs for the specific store with performance monitoring
      const kpisParams = new URLSearchParams({
        scope: 'store',
        storeId: currentStoreId,
      });

      const kpisResult = await MapPerformanceHelpers.wrapAPICall(
        `/kpis?${kpisParams}`,
        'GET',
        () => bffWithErrorHandling(`/kpis?${kpisParams}`, KPIsResponseSchema)
      );

      if (!kpisResult.success) {
        throw new Error(kpisResult.error);
      }

      // Fetch the most recent order for this store to get last order time
      const ordersParams = new URLSearchParams({
        scope: 'store',
        storeId: currentStoreId,
        limit: '1',
        dateRange: '7days', // Look back 7 days for last order
      });

      const ordersResult = await MapPerformanceHelpers.wrapAPICall(
        `/orders/recent?${ordersParams}`,
        'GET',
        () => bffWithErrorHandling(`/orders/recent?${ordersParams}`, RecentOrdersSchema)
      );

      let lastOrderTime: string | null = null;
      let lastOrderRelative = 'No recent orders';

      if (ordersResult.success && ordersResult.data.orders.length > 0) {
        const lastOrder = ordersResult.data.orders[0];
        lastOrderTime = lastOrder.createdAt;
        lastOrderRelative = formatRelativeTime(lastOrder.createdAt);
      }

      const storeKPIs: StoreKPIs = {
        ordersToday: kpisResult.data.ordersToday,
        revenueToday: kpisResult.data.revenueToday,
        lastOrderTime,
        lastOrderRelative,
      };

      setKpis(storeKPIs);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch store KPIs';
      setError(errorMessage);
      console.error('Error fetching store KPIs:', err);
      
      // Set fallback KPIs to prevent UI from breaking
      setKpis({
        ordersToday: 0,
        revenueToday: 0,
        lastOrderTime: null,
        lastOrderRelative: 'Data unavailable',
      });
    }
  }, [formatRelativeTime]);

  /**
   * Main effect to fetch KPIs when storeId changes
   */
  useEffect(() => {
    if (!storeId) {
      setKpis(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchKPIs(storeId).finally(() => {
      setLoading(false);
    });
  }, [storeId, fetchKPIs]);

  /**
   * Manual refetch function
   */
  const refetch = useCallback(() => {
    if (storeId) {
      setLoading(true);
      fetchKPIs(storeId).finally(() => {
        setLoading(false);
      });
    }
  }, [storeId, fetchKPIs]);

  return {
    kpis,
    loading,
    error,
    refetch,
  };
}