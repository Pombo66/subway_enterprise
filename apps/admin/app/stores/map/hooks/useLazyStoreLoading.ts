import { useState, useEffect, useCallback, useRef } from 'react';

interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface Store {
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  region?: string;
}

export function useLazyStoreLoading(bounds?: BoundingBox) {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadStores = useCallback(async (bbox: BoundingBox) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stores/visible', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bounds: bbox }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error('Failed to load stores');
      }

      const data = await response.json();
      setStores(data.stores || []);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load stores:', err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced load function
  const debouncedLoad = useCallback((bbox: BoundingBox) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      loadStores(bbox);
    }, 300); // 300ms debounce
  }, [loadStores]);

  useEffect(() => {
    if (bounds) {
      debouncedLoad(bounds);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [bounds, debouncedLoad]);

  return { stores, loading, error };
}
