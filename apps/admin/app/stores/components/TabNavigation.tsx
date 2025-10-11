'use client';

import { useRouter } from 'next/navigation';

interface TabNavigationProps {
  activeTab: 'list' | 'map';
  className?: string;
}

export default function TabNavigation({ activeTab, className = '' }: TabNavigationProps) {
  const router = useRouter();

  const handleTabChange = (tab: 'list' | 'map') => {
    if (tab === 'map') {
      router.push('/stores/map');
    } else {
      router.push('/stores');
    }
  };

  return (
    <>
      <div className={`tab-navigation ${className}`}>
        <button
          className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => handleTabChange('list')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          List View
        </button>
        <button
          className={`tab-button ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => handleTabChange('map')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
          </svg>
          Map View
        </button>
      </div>
      
      {/* Tab Navigation Styles */}
      <style jsx>{`
        .tab-navigation {
          display: flex;
          gap: 0;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--s-border);
        }

        .tab-button {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          background: none;
          border: none;
          color: var(--s-muted);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
          position: relative;
        }

        .tab-button:hover {
          color: var(--s-text);
          background-color: var(--s-bg-secondary);
        }

        .tab-button.active {
          color: var(--s-primary);
          border-bottom-color: var(--s-primary);
          background-color: var(--s-bg-secondary);
        }

        .tab-button :global(svg) {
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .tab-button:hover :global(svg),
        .tab-button.active :global(svg) {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .tab-button {
            padding: 10px 16px;
            font-size: 13px;
          }
          
          .tab-button :global(svg) {
            width: 14px;
            height: 14px;
            margin-right: 6px !important;
          }
        }
      `}</style>
    </>
  );
}