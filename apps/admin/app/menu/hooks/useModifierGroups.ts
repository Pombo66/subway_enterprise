import { useState, useCallback } from 'react';
import { ModifierGroup } from '../../../lib/types';
import { bff } from '../../../lib/api';

interface UseModifierGroupsReturn {
  state: ModifierGroupState;
  actions: {
    loadModifierData: () => Promise<void>;
    attachModifier: (group: ModifierGroup) => Promise<void>;
    detachModifier: (group: ModifierGroup) => Promise<void>;
  };
}

interface ModifierGroupState {
  available: ModifierGroup[];
  attached: ModifierGroup[];
  loading: boolean;
  error?: string;
  operationInProgress?: string;
}

export function useModifierGroups(itemId: string): UseModifierGroupsReturn {
  const [state, setState] = useState<ModifierGroupState>({
    available: [],
    attached: [],
    loading: false,
  });

  const loadModifierData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
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
  }, [itemId]);

  const attachModifier = useCallback(async (modifierGroup: ModifierGroup) => {
    setState(prev => ({ ...prev, operationInProgress: `attach-${modifierGroup.id}` }));

    // Optimistic update
    const currentState = state;
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

      setState(prev => ({ ...prev, operationInProgress: undefined, error: undefined }));
    } catch (error) {
      console.error('Failed to attach modifier:', error);
      
      // Rollback optimistic update
      setState({
        ...currentState,
        error: error instanceof Error ? error.message : 'Failed to attach modifier',
        operationInProgress: undefined
      });
    }
  }, [itemId, state]);

  const detachModifier = useCallback(async (modifierGroup: ModifierGroup) => {
    setState(prev => ({ ...prev, operationInProgress: `detach-${modifierGroup.id}` }));

    // Optimistic update
    const currentState = state;
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

      setState(prev => ({ ...prev, operationInProgress: undefined, error: undefined }));
    } catch (error) {
      console.error('Failed to detach modifier:', error);
      
      // Rollback optimistic update
      setState({
        ...currentState,
        error: error instanceof Error ? error.message : 'Failed to detach modifier',
        operationInProgress: undefined
      });
    }
  }, [itemId, state]);

  return {
    state,
    actions: {
      loadModifierData,
      attachModifier,
      detachModifier,
    }
  };
}