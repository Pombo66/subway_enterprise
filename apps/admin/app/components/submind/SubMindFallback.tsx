'use client';

interface SubMindFallbackProps {
  error?: string;
  code?: string;
  onRetry?: () => void;
}

export function SubMindFallback({ error, code, onRetry }: SubMindFallbackProps) {
  const getErrorInfo = () => {
    switch (code) {
      case 'AI_DISABLED':
        return {
          title: 'AI Service Not Configured',
          message: 'SubMind requires an OpenAI API key to function. Please configure the service to enable AI features.',
          action: 'Setup Guide',
          actionUrl: '/docs/submind-setup.md',
          showRetry: false,
        };
      case 'SERVICE_UNAVAILABLE':
        return {
          title: 'AI Service Temporarily Unavailable',
          message: 'The AI service is currently experiencing issues. Please try again in a few moments.',
          action: 'Try Again',
          actionUrl: null,
          showRetry: true,
        };
      case 'RATE_LIMITED':
        return {
          title: 'Rate Limit Exceeded',
          message: 'Too many requests have been made. Please wait a moment before trying again.',
          action: 'Try Again',
          actionUrl: null,
          showRetry: true,
        };
      default:
        return {
          title: 'SubMind Unavailable',
          message: error || 'SubMind is currently unavailable. The rest of the application continues to work normally.',
          action: 'Try Again',
          actionUrl: null,
          showRetry: true,
        };
    }
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-center">
      {/* Icon */}
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        {errorInfo.title}
      </h3>

      {/* Message */}
      <p className="text-xs text-gray-600 mb-4 max-w-xs">
        {errorInfo.message}
      </p>

      {/* Actions */}
      <div className="space-y-2">
        {errorInfo.showRetry && onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            {errorInfo.action}
          </button>
        )}
        
        {errorInfo.actionUrl && (
          <a
            href={errorInfo.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            {errorInfo.action}
          </a>
        )}
      </div>

      {/* Additional help */}
      <div className="mt-6 pt-4 border-t border-gray-200 w-full">
        <p className="text-xs text-gray-500 mb-2">Need help?</p>
        <div className="flex gap-2 justify-center">
          <a
            href="/docs/submind-setup.md"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Setup Guide
          </a>
          <span className="text-xs text-gray-300">•</span>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}