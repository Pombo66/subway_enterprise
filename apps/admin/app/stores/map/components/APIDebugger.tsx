'use client';

import React, { useState } from 'react';

export function APIDebugger() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testBFFConnection = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      console.log('🔧 Testing BFF connection...');
      
      // Use default BFF URL
      const bffBaseUrl = process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001';
      
      // Test basic connectivity
      const healthUrl = `${bffBaseUrl}/health`;
      console.log('Testing health endpoint:', healthUrl);
      
      const healthResponse = await fetch(healthUrl);
      const healthData = await healthResponse.json();
      
      console.log('Health check result:', {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: healthData
      });

      // Test stores endpoint
      const storesUrl = `${bffBaseUrl}/stores`;
      console.log('Testing stores endpoint:', storesUrl);
      
      const storesResponse = await fetch(storesUrl);
      const storesData = await storesResponse.json();
      
      console.log('Stores endpoint result:', {
        status: storesResponse.status,
        ok: storesResponse.ok,
        data: storesData
      });

      setTestResult({
        bffBaseUrl,
        health: {
          status: healthResponse.status,
          ok: healthResponse.ok,
          data: healthData
        },
        stores: {
          status: storesResponse.status,
          ok: storesResponse.ok,
          data: storesData,
          count: Array.isArray(storesData) ? storesData.length : 'Not an array'
        }
      });

    } catch (error) {
      console.error('BFF test failed:', error);
      setTestResult({
        error: error instanceof Error ? error.message : String(error),
        bffBaseUrl: process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #ccc', 
      padding: '16px', 
      borderRadius: '8px',
      zIndex: 9999,
      maxWidth: '400px',
      fontSize: '12px'
    }}>
      <h4>API Debugger</h4>
      <p><strong>BFF URL:</strong> {process.env.NEXT_PUBLIC_BFF_URL || 'http://localhost:3001'}</p>
      
      <button 
        onClick={testBFFConnection}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test BFF Connection'}
      </button>

      {testResult && (
        <div style={{ marginTop: '16px' }}>
          <h5>Test Results:</h5>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '8px', 
            borderRadius: '4px',
            fontSize: '10px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}