'use client';

import { createContext, useContext } from 'react';

export type SubMindTab = 'ask' | 'explain' | 'generate';

export interface SubMindContextType {
  isOpen: boolean;
  activeTab: SubMindTab;
  openDrawer: () => void;
  closeDrawer: () => void;
  setActiveTab: (tab: SubMindTab) => void;
  isEnabled: boolean;
}

export const SubMindContext = createContext<SubMindContextType | undefined>(undefined);

export function useSubMind(): SubMindContextType {
  const context = useContext(SubMindContext);
  if (context === undefined) {
    throw new Error('useSubMind must be used within a SubMindProvider');
  }
  return context;
}