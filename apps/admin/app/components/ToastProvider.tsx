'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ToastContainer from './ToastContainer';
import { ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Move ID generation outside component to avoid recreating function
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration?: number) => {
    const id = generateId();
    const newToast: ToastData = {
      id,
      type,
      message,
      duration
    };

    setToasts(prev => [...prev, newToast]);
  }, [generateId]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast('success', message, duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast('error', message, duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast('info', message, duration);
  }, [showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showInfo,
    removeToast,
    clearAllToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}