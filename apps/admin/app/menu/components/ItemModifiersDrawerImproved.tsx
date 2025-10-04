'use client';

import { useEffect, useCallback, memo } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { useToast } from '../../components/ToastProvider';
import { useModifierGroups } from '../hooks/useModifierGroups';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import ModifierList from './ModifierList';
import { ModifierGroup } from '../../../lib/types';

interface ItemModifiersDrawerProps {
  itemId: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ItemModifiersDrawer = memo(function ItemModifiersDrawer({
  itemId,
  itemName,
  isOpen,
  onClose
}: ItemModifiersDrawerProps) {
  const { showSuccess, showError } = useToast();
  const { state, actions } = useModifierGroups(itemId);

  useKeyboardShortcuts({ isOpen, onClose });

  // Load data when drawer opens
  useEffect(() => {
    if (isOpen) {
      actions.loadModifierData();
    }
  }, [isOpen, actions]);

  const handleAttachModifier = useCallback(async (group: ModifierGroup) => {
    try {
      await actions.attachModifier(group);
      showSuccess(`${group.name} modifier attached successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to attach modifier';
      showError(message);
    }
  }, [actions, showSuccess, showError]);

  const handleDetachModifier = useCallback(async (group: ModifierGroup) => {
    try {
      await actions.detachModifier(group);
      showSuccess(`${group.name} modifier detached successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to detach modifier';
      showError(message);
    }
  }, [actions, showSuccess, showError]);

  const handleRefresh = useCallback(() => {
    actions.loadModifierData();
  }, [actions]);

  if (!isOpen) return null;

  return (
    <ErrorBoundary>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modifiers-drawer-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 id="modifiers-drawer-title" className="text-lg font-semibold text-gray-900">
                Manage Modifiers
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {itemName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={state.loading}
                className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors"
                aria-label="Refresh modifier data"
              >
                <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6">
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-red-600 text-sm">{state.error}</p>
                  <button
                    onClick={handleRefresh}
                    className="text-red-600 hover:text-red-800 text-sm underline transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {state.loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="ml-3 text-gray-600">Loading modifiers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6 h-full">
                <ModifierList
                  title="Available Modifiers"
                  groups={state.available}
                  emptyMessage="No available modifiers"
                  actionType="attach"
                  onAction={handleAttachModifier}
                  operationInProgress={state.operationInProgress}
                  testId="available-modifiers"
                />

                <ModifierList
                  title="Attached Modifiers"
                  groups={state.attached}
                  emptyMessage="No attached modifiers"
                  actionType="detach"
                  onAction={handleDetachModifier}
                  operationInProgress={state.operationInProgress}
                  testId="attached-modifiers"
                />
              </div>
            )}
          </main>

          {/* Footer */}
          <footer className="border-t p-6">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>
                {state.attached.length} modifier{state.attached.length !== 1 ? 's' : ''} attached
              </span>
              <button
                onClick={onClose}
                className="s-btn"
              >
                Done
              </button>
            </div>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
});

export default ItemModifiersDrawer;