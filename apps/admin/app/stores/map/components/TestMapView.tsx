'use client';

import { MapViewProps } from '../types';

/**
 * Ultra-simple test component to debug the issue
 */
export default function TestMapView({ stores }: MapViewProps) {
  console.log('🧪 TestMapView rendering with', stores.length, 'stores');
  
  return (
    <div style={{ 
      width: '100%', 
      height: '600px', 
      background: 'red',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '24px',
      fontWeight: 'bold'
    }}>
      TEST MAP VIEW WORKING - {stores.length} STORES
    </div>
  );
}