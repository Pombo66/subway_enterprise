'use client';

import { useState, useEffect, useCallback } from 'react';
import { querySubMind, getCurrentPageContext, formatMarkdown, type SubMindQuery, type SubMindResponse } from '@/lib/apiSubMind';
import { useToast } from '../ToastProvider';
import { TelemetryHelpers } from '@/lib/telemetry';

interface QueryState {
  loading: boolean;
  response: SubMindResponse | null;
  error: string | null;
}

interface ScreenPromptTemplate {
  screen: string;
  title: string;
  prompt: string;
}

const SCREEN_TEMPLATES: ScreenPromptTemplate[] = [
  {
    screen: 'dashboard',
    title: 'Dashboard Overview',
    prompt: 'Explain the key performance indicators and trends visible on the current dashboard screen. Focus on weekly performance metrics, regional comparisons, and any notable patterns or anomalies in the data. Highlight the most important insights for restaurant management decision-making.',
  },
  {
    screen: 'stores_map',
    title: 'Store Distribution Map',
    prompt: 'Analyze the geographic distribution of stores shown on the map. Explain any patterns in store density, regional clustering, and potential market opportunities or gaps. Comment on the geographic strategy and any notable concentrations or sparse areas.',
  },
  {
    screen: 'stores',
    title: 'Store Management',
    prompt: 'Provide insights about the store performance data currently displayed. Explain trends in store metrics, identify top and underperforming locations, and suggest operational improvements based on the visible data patterns.',
  },
  {
    screen: 'orders',
    title: 'Order Analytics',
    prompt: 'Analyze the order data and trends shown on this screen. Explain patterns in order volume, timing, popular items, and any seasonal or operational insights that could help optimize restaurant operations and customer satisfaction.',
  },
  {
    screen: 'menu',
    title: 'Menu Management',
    prompt: 'Explain the menu structure, pricing strategies, and item performance visible on this screen. Identify popular items, pricing patterns, and suggest menu optimization opportunities based on the current data.',
  },
  {
    screen: 'analytics',
    title: 'Analytics Dashboard',
    prompt: 'Provide a comprehensive analysis of the analytics data currently displayed. Explain key trends, performance metrics, and actionable insights that can drive business decisions and operational improvements.',
  },
  {
    screen: 'settings',
    title: 'System Settings',
    prompt: 'Explain the current system configuration and settings visible on this screen. Highlight important configurations, security settings, and operational parameters that impact restaurant management.',
  },
];

export function SubMindExplain() {
  const [prompt, setPrompt] = useState('');
  const [currentContext, setCurrentContext] = useState<any>(null);
  const [queryState, setQueryState] = useState<QueryState>({
    loading: false,
    response: null,
    error: null,
  });
  
  const { showError, showSuccess } = useToast();

  // Auto-generate prompt based on current screen
  useEffect(() => {
    const pageContext = getCurrentPageContext();
    setCurrentContext(pageContext);

    // Find matching template for current screen
    const template = SCREEN_TEMPLATES.find(t => t.screen === pageContext.screen);
    
    if (template) {
      setPrompt(template.prompt);
    } else {
      // Default prompt for unknown screens
      setPrompt('Explain the data and functionality visible on the current screen. Provide insights about the information displayed and suggest how it can be used to improve restaurant operations.');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      showError('Please enter a prompt');
      return;
    }

    setQueryState({ loading: true, response: null, error: null });

    // Emit telemetry for explain query
    TelemetryHelpers.trackUserAction('submind_explain_asked', 'SubMindExplain', undefined, {
      screen: currentContext?.screen || 'unknown',
      has_scope: !!(currentContext?.scope),
      prompt_modified: prompt !== (SCREEN_TEMPLATES.find(t => t.screen === currentContext?.screen)?.prompt || ''),
    });

    try {
      // Build query with current context
      const query: SubMindQuery = {
        prompt: prompt.trim(),
        context: currentContext,
      };

      const result = await querySubMind(query);

      if (result.success) {
        setQueryState({
          loading: false,
          response: result.data,
          error: null,
        });
      } else {
        let errorMessage = result.error;
        
        if (result.code === 'RATE_LIMITED') {
          errorMessage = `Rate limit exceeded. Please try again in ${result.retryAfter || 60} seconds.`;
        } else if (result.code === 'AI_DISABLED') {
          errorMessage = 'AI service is currently unavailable. Please check the setup documentation.';
        }

        setQueryState({
          loading: false,
          response: null,
          error: errorMessage,
        });
        
        showError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setQueryState({
        loading: false,
        response: null,
        error: errorMessage,
      });
      showError(errorMessage);
    }
  }, [prompt, currentContext, showError]);

  const handleCopy = useCallback(() => {
    if (queryState.response?.message) {
      navigator.clipboard.writeText(queryState.response.message);
      showSuccess('Explanation copied to clipboard');
    }
  }, [queryState.response, showSuccess]);

  const handleCreateTask = useCallback(() => {
    // Placeholder for task creation functionality
    showSuccess('Task creation feature coming soon');
  }, [showSuccess]);

  // Get current screen info for display
  const currentTemplate = SCREEN_TEMPLATES.find(t => t.screen === currentContext?.screen);
  const screenTitle = currentTemplate?.title || 'Current Screen';

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="text-sm mb-4" style={{ color: '#9ca3af' }}>
        Get AI-powered explanations of your current screen&apos;s data and metrics.
      </div>
      
      {/* Current context info */}
      <div className="mb-4 p-3 rounded-md" style={{ background: '#1f2937', border: '1px solid #374151' }}>
        <div className="text-xs font-semibold mb-1" style={{ color: '#60a5fa' }}>Current Context</div>
        <div className="text-xs" style={{ color: '#9ca3af' }}>
          Screen: {screenTitle}
          {currentContext?.scope?.region && ` • Region: ${currentContext.scope.region}`}
          {currentContext?.scope?.country && ` • Country: ${currentContext.scope.country}`}
          {currentContext?.scope?.storeId && ` • Store: ${currentContext.scope.storeId}`}
          {!currentContext?.scope && ' • No filters applied'}
        </div>
      </div>

      {/* Auto-generated prompt preview */}
      <div className="mb-4">
        <label className="block text-xs font-semibold mb-2" style={{ color: '#e6edf3' }}>Generated Prompt (Editable)</label>
        <textarea
          className="w-full rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{ background: '#1f2937', color: '#e6edf3', border: '1px solid #374151' }}
          rows={4}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={queryState.loading}
        />
      </div>

      {/* Action */}
      <button 
        className="w-full s-btn s-btn--primary py-2 text-sm mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSubmit}
        disabled={queryState.loading || !prompt.trim()}
      >
        {queryState.loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Analyzing Screen...
          </span>
        ) : (
          'Explain Current Screen'
        )}
      </button>

      {/* Response area */}
      <div className="flex-1 overflow-y-auto">
        {queryState.response && (
          <div className="p-3 bg-gray-50 rounded-md text-sm">
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {queryState.error}
          </div>
        )}

        {/* Placeholder when no response */}
        {!queryState.response && !queryState.error && !queryState.loading && (
          <div className="p-3 rounded-md text-sm italic" style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151' }}>
            Screen explanation will appear here after you click &quot;Explain Current Screen&quot;...
          </div>
        )}
      </div>

      {/* Action buttons */}
      {queryState.response && (
        <div className="flex gap-2 mt-4">
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
  );
}