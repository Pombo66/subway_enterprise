/**
 * Hook for menu item operations using repository pattern
 */

import { useCallback, useMemo } from 'react';
import { ApiMenuItemRepository, MenuItemRepository, MenuItem, MenuItemQuery } from '../repositories/menu-item.repository';
import { CreateMenuItemData } from '../types';
import { ErrorHandler } from '../errors';

export const useMenuItems = (repository?: MenuItemRepository) => {
  const repo = useMemo(() => repository || new ApiMenuItemRepository(), [repository]);

  const createMenuItem = useCallback(async (data: CreateMenuItemData): Promise<MenuItem> => {
    return ErrorHandler.withErrorHandling(
      () => repo.create(data),
      'Menu item creation'
    );
  }, [repo]);

  const getMenuItems = useCallback(async (query?: MenuItemQuery): Promise<MenuItem[]> => {
    return ErrorHandler.withErrorHandling(
      () => repo.findMany(query),
      'Menu items fetch',
      () => [] // Return empty array on error
    );
  }, [repo]);

  const getMenuItem = useCallback(async (id: string): Promise<MenuItem | null> => {
    return ErrorHandler.withErrorHandling(
      () => repo.findById(id),
      'Menu item fetch',
      () => null // Return null on error
    );
  }, [repo]);

  const updateMenuItem = useCallback(async (id: string, data: Partial<MenuItem>): Promise<MenuItem> => {
    return ErrorHandler.withErrorHandling(
      () => repo.update(id, data),
      'Menu item update'
    );
  }, [repo]);

  const deleteMenuItem = useCallback(async (id: string): Promise<void> => {
    return ErrorHandler.withErrorHandling(
      () => repo.delete(id),
      'Menu item deletion'
    );
  }, [repo]);

  return {
    createMenuItem,
    getMenuItems,
    getMenuItem,
    updateMenuItem,
    deleteMenuItem
  };
};