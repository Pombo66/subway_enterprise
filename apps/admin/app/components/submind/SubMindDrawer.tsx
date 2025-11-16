'use client';

import { SubMindTab } from './useSubMind';
import { SubMindAsk } from './SubMindAsk';
import { SubMindExplain } from './SubMindExplain';
import { SubMindGenerate } from './SubMindGenerate';

interface SubMindDrawerProps {
  onClose: () => void;
  activeTab: SubMindTab;
  onTabChange: (tab: SubMindTab) => void;
}

export function SubMindDrawer({ onClose, activeTab, onTabChange }: SubMindDrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 shadow-xl z-50 transform transition-transform duration-300 ease-in-out" style={{ background: '#0f1724', color: '#e6edf3' }}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid #1f2937' }}>
            <h2 className="text-lg font-semibold" style={{ color: '#e6edf3' }}>SubMind Command Center</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-colors"
              style={{ color: '#e6edf3' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#1f2937'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              aria-label="Close SubMind"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex" style={{ borderBottom: '1px solid #1f2937' }}>
            {(['ask', 'explain', 'generate'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors"
                style={{
                  color: activeTab === tab ? '#60a5fa' : '#9ca3af',
                  borderBottom: activeTab === tab ? '2px solid #60a5fa' : 'none',
                  background: activeTab === tab ? '#1f2937' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = '#d1d5db';
                    e.currentTarget.style.background = '#1f2937';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab) {
                    e.currentTarget.style.color = '#9ca3af';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'ask' && <SubMindAsk />}
            {activeTab === 'explain' && <SubMindExplain />}
            {activeTab === 'generate' && <SubMindGenerate />}
          </div>
        </div>
      </div>
    </>
  );
}