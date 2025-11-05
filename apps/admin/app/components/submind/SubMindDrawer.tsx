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
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">SubMind Command Center</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
          <div className="flex border-b">
            {(['ask', 'explain', 'generate'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`flex-1 py-3 px-4 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
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