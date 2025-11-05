'use client';

import { useState, useEffect } from 'react';

export default function DirectFetchTest() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🧪 DirectFetchTest: useEffect running');
    
    const fetchData = async () => {
      try {
        console.log('🧪 DirectFetchTest: Fetching data...');
        const response = await fetch('/api/stores');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('🧪 DirectFetchTest: Success!', { count: data.length });
        
        setStores(data);
        setLoading(false);
      } catch (err) {
        console.error('🧪 DirectFetchTest: Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', backgroundColor: 'var(--s-panel)', borderRadius: '8px' }}>
        <h3>Direct Fetch Test - Loading...</h3>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: 'var(--s-panel)', borderRadius: '8px' }}>
        <h3>Direct Fetch Test - Error</h3>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', backgroundColor: 'var(--s-panel)', borderRadius: '8px' }}>
      <h3>Direct Fetch Test - Success!</h3>
      <p>Fetched {stores.length} stores</p>
      <details>
        <summary>First 3 stores:</summary>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(stores.slice(0, 3), null, 2)}
        </pre>
      </details>
    </div>
  );
}