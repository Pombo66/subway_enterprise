'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus, RefreshCw } from 'lucide-react';
import { ModifierGroup } from '../../../lib/types';
import { bff } from '../../../lib/api';
import { useToast } from '../../components/ToastProvider';

interface ItemModifiersDrawerProps {
  itemId: string;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ModifierGroupState {
  available: ModifierGroup[];
  attached: ModifierGroup[];
  loading: boolean;
  error?: string;
  operationInProgress?: string; // Track which operation is in progress
}

export default function ItemModifiersDrawer({ 
  itemId, 
  itemName, 
  isOpen, 
  onClose 
}: ItemModifiersDrawerProps) {
  const { showSuccess, showError } = useToast();
  const [state, setState] = useState<ModifierGroupState>({
    available: [],
    attached: [],
    loading: false,
  });

  // ESC key handler and focus management
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
      
      // Load data when drawer opens
      loadModifierData();
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, itemId]);

  const loadModifierData = async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      // Load both available modifier groups and attached ones in parallel
      const [allGroupsResponse, attachedGroupsResponse] = await Promise.all([
        bff<{ success: boolean; data: ModifierGroup[]; error?: string }>('/menu/modifier-groups'),
        bff<{ success: boolean; data: ModifierGroup[]; error?: string }>(`/menu/items/${itemId}/modifiers`)
      ]);

      if (!allGroupsResponse.success) {
        throw new Error(allGroupsResponse.error || 'Failed to load modifier groups');
      }

      if (!attachedGroupsResponse.success) {
        throw new Error(attachedGroupsResponse.error || 'Failed to load attached modifiers');
      }

      const allGroups = allGroupsResponse.data || [];
      const attachedGroups = attachedGroupsResponse.data || [];
      const attachedIds = new Set(attachedGroups.map(g => g.id));
      const availableGroups = allGroups.filter(g => !attachedIds.has(g.id));

      setState(prev => ({
        ...prev,
        available: availableGroups,
        attached: attachedGroups,
        loading: false,
        error: undefined
      }));
    } catch (error) {
      console.error('Failed to load modifier data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load modifier data'
      }));
    }
  };

  const attachModifier = async (modifierGroup: ModifierGroup) => {
    setState(prev => ({ ...prev, operationInProgress: `attach-${modifierGroup.id}` }));

    // Optimistic update
    const originalState = { ...state };
    setState(prev => ({
      ...prev,
      available: prev.available.filter(g => g.id !== modifierGroup.id),
      attached: [...prev.attached, modifierGroup].sort((a, b) => a.name.localeCompare(b.name))
    }));

    try {
      const response = await bff<{ success: boolean; error?: string }>(`/menu/items/${itemId}/modifiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifierGroupId: modifierGroup.id })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to attach modifier');
      }

      // Show success toast
      showSuccess(`${modifierGroup.name} modifier attached successfully`);
    } catch (error) {
      console.error('Failed to attach modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to attach modifier';
      
      // Show error toast
      showError(errorMessage);
      
      // Rollback optimistic update
      setState(prev => ({
        ...originalState,
        error: errorMessage,
        operationInProgress: undefined
      }));
      return;
    }

    setState(prev => ({ ...prev, operationInProgress: undefined, error: undefined }));
  };

  const detachModifier = async (modifierGroup: ModifierGroup) => {
    setState(prev => ({ ...prev, operationInProgress: `detach-${modifierGroup.id}` }));

    // Optimistic update
    const originalState = { ...state };
    setState(prev => ({
      ...prev,
      attached: prev.attached.filter(g => g.id !== modifierGroup.id),
      available: [...prev.available, modifierGroup].sort((a, b) => a.name.localeCompare(b.name))
    }));

    try {
      const response = await bff<{ success: boolean; error?: string }>(`/menu/items/${itemId}/modifiers/${modifierGroup.id}`, {
        method: 'DELETE'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to detach modifier');
      }

      // Show success toast
      showSuccess(`${modifierGroup.name} modifier detached successfully`);
    } catch (error) {
      console.error('Failed to detach modifier:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to detach modifier';
      
      // Show error toast
      showError(errorMessage);
      
      // Rollback optimistic update
      setState(prev => ({
        ...originalState,
        error: errorMessage,
        operationInProgress: undefined
      }));
      return;
    }

    setState(prev => ({ ...prev, operationInProgress: undefined, error: undefined }));
  };

  const handleRefresh = () => {
    loadModifierData();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer - slides from right */}
      <div 
        className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modifiers-drawer-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
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
                className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
                aria-label="Refresh modifier data"
              >
                <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <p className="text-red-600 text-sm">{state.error}</p>
                  <button
                    onClick={handleRefresh}
                    className="text-red-600 hover:text-red-800 text-sm underline"
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
                {/* Available Modifiers */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Available Modifiers ({state.available.length})
                  </h3>
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden" data-testid="available-modifiers">
                    {state.available.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No available modifiers
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 max-h-full overflow-y-auto">
                        {state.available.map((group) => (
                          <div key={group.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {group.name}
                                </h4>
                                {group.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => attachModifier(group)}
                                disabled={state.operationInProgress === `attach-${group.id}`}
                                className="ml-2 p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded disabled:opacity-50"
                                aria-label={`Attach ${group.name} modifier`}
                              >
                                {state.operationInProgress === `attach-${group.id}` ? (
                                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Attached Modifiers */}
                <div className="flex flex-col">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Attached Modifiers ({state.attached.length})
                  </h3>
                  <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden" data-testid="attached-modifiers">
                    {state.attached.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        No attached modifiers
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 max-h-full overflow-y-auto">
                        {state.attached.map((group) => (
                          <div key={group.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {group.name}
                                </h4>
                                {group.description && (
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {group.description}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => detachModifier(group)}
                                disabled={state.operationInProgress === `detach-${group.id}`}
                                className="ml-2 p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                                aria-label={`Detach ${group.name} modifier`}
                              >
                                {state.operationInProgress === `detach-${group.id}` ? (
                                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                                ) : (
                                  <Minus className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t p-6">
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
          </div>
        </div>
      </div>
    </>
  );
}