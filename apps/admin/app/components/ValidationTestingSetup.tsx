'use client';

import { useEffect } from 'react';

/**
 * Component that sets up validation testing functions in the browser console
 * Only loads in development mode
 */
export default function ValidationTestingSetup() {
  useEffect(() => {
    // Only load in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Dynamically import and setup console functions
    const setupConsole = async () => {
      try {
        // Import the console setup module
        await import('../../lib/test-utils/browser-console-setup');
      } catch (error) {
        console.warn('Could not load validation testing functions:', error);
      }
    };

    setupConsole();
  }, []);

  // This component renders nothing
  return null;
}