'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { UI_CONSTANTS } from '../../../lib/constants/ui';
import { useMenuItemForm } from '../../../lib/hooks/useMenuItemForm';

interface ItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ItemDrawer({ isOpen, onClose, onSuccess }: ItemDrawerProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  
  const {
    formData,
    errors,
    formState,
    submitForm,
    handleInputChange,
    isLoading
  } = useMenuItemForm(onSuccess, onClose);

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
      
      // Auto-focus name field after drawer animation
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, UI_CONSTANTS.FORM.AUTO_FOCUS_DELAY);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Simplified form submission handlers
  const handleSubmit = async (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    await submitForm(createAnother, nameInputRef);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className={`fixed inset-0 bg-black bg-opacity-50 ${UI_CONSTANTS.DRAWER.Z_INDEX_BACKDROP}`}
          onClick={onClose}
        />
      )}

      {/* Drawer - slides from right without pushing content */}
      <div 
        className={`fixed top-0 right-0 h-full ${UI_CONSTANTS.DRAWER.WIDTH} bg-white shadow-xl ${UI_CONSTANTS.DRAWER.Z_INDEX_DRAWER} transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 id="drawer-title" className="text-lg font-semibold text-gray-900">Create Menu Item</h2>
            <button 
              onClick={onClose}
              className="s-btn s-btn--md p-2 hover:bg-gray-100 rounded-full"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="flex-1 p-6">
            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{errors.general}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  ref={nameInputRef}
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={`s-input w-full ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="Enter item name"
                  aria-describedby={errors.name ? 'name-error' : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($) *
                </label>
                <input
                  type="text"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                  pattern="^\d+(\.\d{1,2})?$"
                  className={`s-input w-full ${errors.price ? 'border-red-500 focus:border-red-500' : ''}`}
                  placeholder="0.00"
                  aria-describedby={errors.price ? 'price-error' : undefined}
                />
                {errors.price && (
                  <p id="price-error" className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              <div>
                <label htmlFor="storeId" className="block text-sm font-medium text-gray-700 mb-2">
                  Store *
                </label>
                <select
                  id="storeId"
                  name="storeId"
                  value={formData.storeId}
                  onChange={handleInputChange}
                  required
                  className={`s-select w-full ${errors.storeId ? 'border-red-500 focus:border-red-500' : ''}`}
                  aria-describedby={errors.storeId ? 'store-error' : undefined}
                >
                  <option value="">Select a store</option>
                  <option value="store-1">Downtown Store</option>
                  <option value="store-2">Mall Store</option>
                  <option value="store-3">Airport Store</option>
                </select>
                {errors.storeId && (
                  <p id="store-error" className="text-red-500 text-sm mt-1">{errors.storeId}</p>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
         <input 
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleInputChange}
                    className={s-input rounded border-gray-300 text-blue-600 focus:ring-blue-500}
                  />t-gray-700">Active</span>
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  <button
         <button 
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="s-btn s-btn--md flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >    Cancel
                  </button>
                  <button
                    type="<button className="s-btn s-btn--md" type="submit"
                    disabled={isLoading}
                    onClick={(e) =>           className="flex-1 s-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating...' : 'Create Item'}
                  </button>
                </div>
                <button
                  type="button"
  <button className="s-btn s-btn--md" type="button"
                  disabled={isLoading}
                  onClick={(e) =>className="w-full px-4 py-2 border border-blue-300 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create & Add Another'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}