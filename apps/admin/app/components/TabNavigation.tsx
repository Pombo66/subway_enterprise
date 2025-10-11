'use client';

import { ReactNode, KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface TabItem {
  key: string;
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab?: string;
  className?: string;
}

export default function TabNavigation({ tabs, activeTab, className = '' }: TabNavigationProps) {
  const pathname = usePathname();
  
  // Determine active tab based on current pathname if not explicitly provided
  const currentActiveTab = activeTab || tabs.find(tab => pathname === tab.href)?.key || tabs[0]?.key;

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, tabKey: string) => {
    const currentIndex = tabs.findIndex(tab => tab.key === tabKey);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        event.preventDefault();
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        event.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    // Focus the next tab
    const nextTab = document.querySelector(`[data-tab-key="${tabs[nextIndex].key}"]`) as HTMLAnchorElement;
    nextTab?.focus();
  };

  return (
    <nav 
      className={`tab-navigation ${className}`}
      role="tablist"
      aria-label="Section navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === currentActiveTab;
        
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`tab-link ${isActive ? 'active' : ''}`}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.key}`}
            tabIndex={isActive ? 0 : -1}
            data-tab-key={tab.key}
            onKeyDown={(e) => handleKeyDown(e, tab.key)}
          >
            {tab.icon && (
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
            )}
            <span className="tab-label">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}