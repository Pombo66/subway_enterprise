'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastStyles = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-400'
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: AlertCircle,
    iconColor: 'text-red-400'
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: Info,
    iconColor: 'text-blue-400'
  }
};

export default function Toast({ id, type, message, duration = 5000, onClose }: ToastProps) {
  const style = toastStyles[type];
  const IconComponent = style.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={`
        flex items-start gap-3 p-4 border rounded-lg shadow-lg max-w-md w-full
        transform transition-all duration-300 ease-in-out
        ${style.container}
      `}
      role="alert"
      aria-live="polite"
    >
      <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words">{message}</p>
      </div>
      
      <button 
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}