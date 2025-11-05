import { useState, useEffect } from 'react';

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-hide after 3 seconds when back online
      setTimeout(() => setIsHidden(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsHidden(false);
    };

    // Check initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for document visibility changes (tab suspension)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('📱 Tab suspended - jobs continue in background');
      } else {
        console.log('📱 Tab resumed');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (isOnline || isHidden) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg max-w-sm">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
        <div>
          <p className="text-sm font-medium text-yellow-800">Connection Paused</p>
          <p className="text-xs text-yellow-700">
            Jobs continue in background. We&apos;ll resume when online.
          </p>
        </div>
        <button
          onClick={() => setIsHidden(true)}
          className="ml-2 text-yellow-600 hover:text-yellow-800"
        >
          ×
        </button>
      </div>
    </div>
  );
}