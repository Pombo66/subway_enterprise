'use client';

import { config } from '@/lib/config';

export function SubMindDebug() {
  if (typeof window === 'undefined') return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'black',
      color: 'white',
      padding: '10px',
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div>SubMind Enabled: {String(config.isSubMindEnabled)}</div>
      <div>BFF URL: {config.bffBaseUrl}</div>
      <div>Env: {config.environment}</div>
    </div>
  );
}
