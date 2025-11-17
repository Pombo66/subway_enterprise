'use client';

import { useState, useCallback, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { SubMindContext, SubMindTab } from './useSubMind';
import { SubMindDrawer } from './SubMindDrawer';
import { SubMindErrorBoundary } from './SubMindErrorBoundary';
import { config } from '@/lib/config';
import { TelemetryHelpers } from '@/lib/telemetry';

interface SubMindProviderProps {
  children: ReactNode;
}

export function SubMindProvider({ children }: SubMindProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SubMindTab>('ask');
  const [isClient, setIsClient] = useState(false);
  
  // Check if SubMind is enabled via feature flag - read directly from env
  // Bypass ConfigService since it's not working properly in client-side
  const isEnabled = process.env.NEXT_PUBLIC_FEATURE_SUBMIND === 'true';

  // Only render on client to avoid hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  const openDrawer = useCallback(() => {
    setIsOpen(true);
    
    // Emit telemetry event
    TelemetryHelpers.trackUserAction('submind_opened', 'SubMindProvider', undefined, {
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSetActiveTab = useCallback((tab: SubMindTab) => {
    const previousTab = activeTab;
    setActiveTab(tab);
    
    // Emit telemetry event for tab change
    if (previousTab !== tab) {
      TelemetryHelpers.trackUserAction('submind_tab_changed', 'SubMindProvider', undefined, {
        from_tab: previousTab,
        to_tab: tab,
        screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
    }
  }, [activeTab]);

  const contextValue = {
    isOpen,
    activeTab,
    openDrawer,
    closeDrawer,
    setActiveTab: handleSetActiveTab,
    isEnabled,
  };

  return (
    <SubMindContext.Provider value={contextValue}>
      {children}
      {isClient && isEnabled && (
        <SubMindErrorBoundary>
          {/* Floating Action Button */}
          <FloatingActionButton onClick={openDrawer} />
          
          {/* Drawer Portal */}
          {isOpen && typeof window !== 'undefined' && createPortal(
            <SubMindErrorBoundary>
              <SubMindDrawer onClose={closeDrawer} activeTab={activeTab} onTabChange={handleSetActiveTab} />
            </SubMindErrorBoundary>,
            document.body
          )}
        </SubMindErrorBoundary>
      )}
    </SubMindContext.Provider>
  );
}

// Floating Action Button Component
function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 z-50 s-btn s-btn--primary rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
      aria-label="Ask SubMind"
      title="Ask SubMind"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        <path d="M8 9h8" />
        <path d="M8 13h6" />
      </svg>
    </button>
  );
}

