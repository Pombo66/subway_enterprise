'use client';

import { useEffect } from 'react';

export default function SimpleTest() {
  useEffect(() => {
    console.log('🧪 SimpleTest: This should appear in console if client-side JS is working');
  }, []);

  return (
    <div style={{ padding: '10px', backgroundColor: 'yellow', color: 'black' }}>
      Simple Test Component - If you see this, React is rendering
    </div>
  );
}