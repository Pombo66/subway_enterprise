'use client';

import React from 'react';
import { ErrorHandler, ValidationError } from '@/lib/types/error.types';

interface ErrorDisplayProps {
  error: unknown;
  className?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

/**
 * Component for displaying errors in a user-friendly way
 */
export function ErrorDisplay({ error, className = '', showRetry = false, onRetry }: ErrorDisplayProps) {
  const { message, details } = ErrorHandler.parseError(error);

  return (
    <div className={`rounded-md bg-red-50 p-4 ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {details ? 'Validation Error' : 'Error'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{message}</p>
            {details && details.length > 0 && (
              <ul className="mt-2 list-disc list-inside space-y-1">
                {details.map((detail, index) => (
                  <li key={index}>
                    <span className="font-medium">{detail.field}:</span> {detail.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {showRetry && onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="text-sm font-medium text-red-800 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FieldErrorProps {
  errors?: ValidationError[];
  fieldName: string;
  className?: string;
}

/**
 * Component for displaying field-specific validation errors
 */
export function FieldError({ errors, fieldName, className = '' }: FieldErrorProps) {
  if (!errors || !ErrorHandler.hasFieldError(errors, fieldName)) {
    return null;
  }

  const errorMessage = ErrorHandler.getFieldError(errors, fieldName);

  return (
    <p className={`text-sm text-red-600 mt-1 ${className}`}>
      {errorMessage}
    </p>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Component for displaying empty/error states
 */
export function ErrorState({ 
  title = 'Something went wrong',
  message = 'We encountered an error while loading this content.',
  action,
  className = ''
}: ErrorStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <svg 
        className="mx-auto h-12 w-12 text-gray-400" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {action && (
        <div className="mt-6">
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}