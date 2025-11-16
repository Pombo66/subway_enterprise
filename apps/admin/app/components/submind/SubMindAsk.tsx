'use client';

import { useState, useEffect, useCallback } from 'react';
import { querySubMind, getCurrentPageContext, formatMarkdown, type SubMindQuery, type SubMindResponse } from '@/lib/apiSubMind';
import { useToast } from '../ToastProvider';
import { SubMindFallback } from './SubMindFallback';
import { TelemetryHelpers } from '@/lib/telemetry';

interface QueryState {
  loading: boolean;
  response: SubMindResponse | null;
  error: string | null;
  errorCode?: string;
  persistentError: boolean;
}

export function SubMindAsk() {
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState({
    region: '',
    country: '',
    storeId: '',
    franchiseeId: '',
  });
  const [queryState, setQueryState] = useState<QueryState>({
    loading: false,
    response: null,
    error: null,
    errorCode: undefined,
    persistentError: false,
  });
  
  const { showError, showSuccess } = useToast();

  // Auto-populate context from current page
  useEffect(() => {
    const pageContext = getCurrentPageContext();
    if (pageContext.scope) {
      setContext(prev => ({
        ...prev,
        ...pageContext.scope,
      }));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      showError('Please enter a question');
      return;
    }

    setQueryState({ loading: true, response: null, error: null, errorCode: undefined, persistentError: false });

    // Emit telemetry for query start
    TelemetryHelpers.trackUserAction('submind_query_asked', 'SubMindAsk', undefined, {
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
      prompt_length: prompt.trim().length,
      has_context: !!(context.region || context.country || context.storeId || context.franchiseeId),
    });

    try {
      const pageContext = getCurrentPageContext();
      
      // Build query with context
      const query: SubMindQuery = {
        prompt: prompt.trim(),
        context: {
          screen: pageContext.screen,
          scope: {
            region: context.region || undefined,
            country: context.country || undefined,
            storeId: context.storeId || undefined,
            franchiseeId: context.franchiseeId || undefined,
          },
        },
      };

      const result = await querySubMind(query);

      if (result.success) {
        setQueryState({
          loading: false,
          response: result.data,
          error: null,
          errorCode: undefined,
          persistentError: false,
        });
      } else {
        let errorMessage = result.error;
        
        if (result.code === 'RATE_LIMITED') {
          errorMessage = `Rate limit exceeded. Please try again in ${result.retryAfter || 60} seconds.`;
        } else if (result.code === 'AI_DISABLED') {
          errorMessage = 'AI service is currently unavailable. Please check the setup documentation.';
        }

        const isPersistent = result.code === 'AI_DISABLED' || result.code === 'SERVICE_UNAVAILABLE';
        
        setQueryState({
          loading: false,
          response: null,
          error: errorMessage,
          errorCode: result.code,
          persistentError: isPersistent,
        });
        
        showError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setQueryState({
        loading: false,
        response: null,
        error: errorMessage,
        errorCode: 'UNKNOWN_ERROR',
        persistentError: false,
      });
      showError(errorMessage);
    }
  }, [prompt, context, showError]);

  const handleCopy = useCallback(() => {
    if (queryState.response?.message) {
      navigator.clipboard.writeText(queryState.response.message);
      showSuccess('Response copied to clipboard');
    }
  }, [queryState.response, showSuccess]);

  const handleCreateTask = useCallback(() => {
    // Placeholder for task creation functionality
    showSuccess('Task creation feature coming soon');
  }, [showSuccess]);

  const characterCount = prompt.length;
  const isOverLimit = characterCount > 4000;

  // Show fallback UI for persistent errors
  if (queryState.persistentError) {
    return (
      <SubMindFallback
        error={queryState.error || undefined}
        code={queryState.errorCode}
        onRetry={() => setQueryState({
          loading: false,
          response: null,
          error: null,
          errorCode: undefined,
          persistentError: false,
        })}
      />
    );
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="text-sm mb-4" style={{ color: '#9ca3af' }}>
        Ask SubMind anything about your restaurant operations, metrics, or data.
      </div>
      
      {/* Context Pickers */}
      <div className="mb-4 space-y-2">
        <label className="block text-xs font-medium" style={{ color: '#e6edf3' }}>Context (Optional)</label>
        <div className="grid grid-cols-2 gap-2">
          <select 
            className="text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: '#1f2937', color: '#e6edf3', border: '1px solid #374151' }}
            value={context.region}
            onChange={(e) => setContext(prev => ({ ...prev, region: e.target.value }))}
          >
            <option value="">Region</option>
            <option value="EMEA">EMEA</option>
            <option value="AMER">AMER</option>
            <option value="APAC">APAC</option>
          </select>
          <select 
            className="text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: '#1f2937', color: '#e6edf3', border: '1px solid #374151' }}
            value={context.country}
            onChange={(e) => setContext(prev => ({ ...prev, country: e.target.value }))}
          >
            <option value="">Country</option>
            <option value="US">United States</option>
            <option value="UK">United Kingdom</option>
            <option value="CA">Canada</option>
            <option value="FR">France</option>
            <option value="DE">Germany</option>
            <option value="AU">Australia</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Store ID"
            className="text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: '#1f2937', color: '#e6edf3', border: '1px solid #374151' }}
            value={context.storeId}
            onChange={(e) => setContext(prev => ({ ...prev, storeId: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Franchisee ID"
            className="text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: '#1f2937', color: '#e6edf3', border: '1px solid #374151' }}
            value={context.franchiseeId}
            onChange={(e) => setContext(prev => ({ ...prev, franchiseeId: e.target.value }))}
          />
        </div>
      </div>

      {/* Prompt Input */}
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-medium mb-2" style={{ color: '#e6edf3' }}>Your Question</label>
        <textarea
          className="flex-1 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:border-transparent"
          style={{
            background: '#1f2937',
            color: '#e6edf3',
            border: isOverLimit ? '1px solid #ef4444' : '1px solid #374151',
          }}
          placeholder="Ask about KPIs, trends, store performance, or any operational questions..."
          rows={6}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={queryState.loading}
        />
        <div className={`text-xs mt-1 ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}>
          {characterCount} / 4000 characters
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 space-y-2">
        <button 
          className="w-full s-btn s-btn--primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSubmit}
          disabled={queryState.loading || !prompt.trim() || isOverLimit}
        >
          {queryState.loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Asking SubMind...
            </span>
          ) : (
            'Ask SubMind'
          )}
        </button>
        
        {/* Response area */}
        {queryState.response && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm">
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formatMarkdown(queryState.response.message) 
              }}
            />
            
            {/* Sources */}
            {queryState.response.sources && queryState.response.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-1">Sources:</div>
                <div className="space-y-1">
                  {queryState.response.sources.map((source, index) => (
                    <div key={index} className="text-xs text-gray-600">
                      <span className="font-medium capitalize">{source.type}:</span> {source.ref}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Meta info */}
            {queryState.response.meta && (
              <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                {queryState.response.meta.tokens && (
                  <span>Tokens: {queryState.response.meta.tokens}</span>
                )}
                {queryState.response.meta.latencyMs && (
                  <span className="ml-3">Response time: {queryState.response.meta.latencyMs}ms</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {queryState.error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {queryState.error}
          </div>
        )}
        
        {/* Action buttons */}
        {queryState.response && (
          <div className="flex gap-2 mt-2">
            <button 
              className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={handleCopy}
            >
              Copy
            </button>
            <button 
              className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              onClick={handleCreateTask}
            >
              Create Task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}