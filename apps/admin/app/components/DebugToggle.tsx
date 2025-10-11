'use client';

import { useState, useEffect } from 'react';
import TelemetryDebug from './TelemetryDebug';

export default function DebugToggle() {
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [showTelemetryDebug, setShowTelemetryDebug] = useState(false);
  const [clickCount, setClickCount] = useState(0);

  // Only show in development environment
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Keyboard shortcut: Ctrl+Shift+D (or Cmd+Shift+D on Mac)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isDevelopment && event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsDebugMode(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDevelopment]);

  // Reset click count after 3 seconds
  useEffect(() => {
    if (clickCount > 0) {
      const timer = setTimeout(() => setClickCount(0), 3000);
      return () => clearTimeout(timer);
    }
  }, [clickCount]);

  // Handle secret click sequence (5 clicks on the logo)
  const handleLogoClick = () => {
    if (!isDevelopment) return;
    
    const newCount = clickCount + 1;
    setClickCount(newCount);
    
    // Enable debug mode after 5 clicks
    if (newCount >= 5) {
      setIsDebugMode(true);
      setClickCount(0);
    }
  };

  if (!isDevelopment) return null;

  return (
    <>
      {/* Hidden debug toggle - only visible in debug mode */}
      {isDebugMode && (
        <div className="fixed bottom-4 right-4 z-40">
          <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg">
            <div className="text-xs font-medium mb-2">Debug Tools</div>
            <div className="space-y-1">
              <button
                onClick={() => setShowTelemetryDebug(true)}
                className="s-btn s-btn--sm block w-full text-left px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded"
              >
                Telemetry Debug
              </button>
              <button
                onClick={() => setIsDebugMode(false)}
                className="s-btn s-btn--sm block w-full text-left px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded"
              >
                Hide Debug
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Ctrl+Shift+D to toggle
            </div>
          </div>
        </div>
      )}

      {/* Invisible click target for logo activation */}
      <div
        onClick={handleLogoClick}
        className="fixed top-0 left-0 w-32 h-16 z-30 cursor-default"
        style={{ background: 'transparent' }}
        title={isDevelopment ? `Debug: ${clickCount}/5 clicks` : ''}
      />

      {/* Telemetry Debug Modal */}
      <TelemetryDebug
        isVisible={showTelemetryDebug}
        onClose={() => setShowTelemetryDebug(false)}
      />
    </>
  );
}