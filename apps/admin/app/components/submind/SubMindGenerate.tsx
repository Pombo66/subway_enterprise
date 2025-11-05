'use client';

import { useState, useCallback } from 'react';
import { querySubMind, getCurrentPageContext, type SubMindQuery, type SubMindResponse } from '@/lib/apiSubMind';
import { useToast } from '../ToastProvider';
import { TelemetryHelpers } from '@/lib/telemetry';

interface GenerationState {
  loading: boolean;
  type: 'csv' | 'checklist' | null;
  response: SubMindResponse | null;
  error: string | null;
  csvData: string[][] | null;
}

export function SubMindGenerate() {
  const [generationState, setGenerationState] = useState<GenerationState>({
    loading: false,
    type: null,
    response: null,
    error: null,
    csvData: null,
  });
  
  const { showError, showSuccess } = useToast();

  const generateCSV = useCallback(async () => {
    setGenerationState({ loading: true, type: 'csv', response: null, error: null, csvData: null });

    // Emit telemetry for CSV generation
    TelemetryHelpers.trackUserAction('submind_generate_csv', 'SubMindGenerate', undefined, {
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    try {
      const pageContext = getCurrentPageContext();
      
      const prompt = `Generate an executive summary in CSV format based on the current screen data. 
      
      Create a table with exactly these columns: Metric, Value, Change, Note
      
      Include key performance indicators, trends, and insights relevant to restaurant management. 
      Focus on actionable metrics that executives would need for decision-making.
      
      Format the response as a proper CSV with headers, using realistic data based on the current context.
      Make sure each row represents a meaningful business metric.`;

      const query: SubMindQuery = {
        prompt,
        context: pageContext,
      };

      const result = await querySubMind(query);

      if (result.success) {
        // Parse CSV data from response
        const csvData = parseCSVFromResponse(result.data.message);
        
        setGenerationState({
          loading: false,
          type: 'csv',
          response: result.data,
          error: null,
          csvData,
        });
      } else {
        handleGenerationError(result.error, result.code, result.retryAfter);
      }
    } catch (error) {
      handleGenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  }, [showError]);

  const generateChecklist = useCallback(async () => {
    setGenerationState({ loading: true, type: 'checklist', response: null, error: null, csvData: null });

    // Emit telemetry for checklist generation
    TelemetryHelpers.trackUserAction('submind_generate_checklist', 'SubMindGenerate', undefined, {
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    try {
      const pageContext = getCurrentPageContext();
      
      const prompt = `Generate a numbered action checklist based on the current screen data and context.
      
      Create a prioritized list of 5-10 specific, actionable next steps that restaurant managers should take based on the visible data and metrics.
      
      Each action should be:
      - Specific and actionable
      - Based on the current data context
      - Prioritized by impact and urgency
      - Realistic and achievable
      
      Format as a numbered list with clear, concise action items.`;

      const query: SubMindQuery = {
        prompt,
        context: pageContext,
      };

      const result = await querySubMind(query);

      if (result.success) {
        setGenerationState({
          loading: false,
          type: 'checklist',
          response: result.data,
          error: null,
          csvData: null,
        });
      } else {
        handleGenerationError(result.error, result.code, result.retryAfter);
      }
    } catch (error) {
      handleGenerationError(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  }, [showError]);

  const handleGenerationError = (error: string, code?: string, retryAfter?: number) => {
    let errorMessage = error;
    
    if (code === 'RATE_LIMITED') {
      errorMessage = `Rate limit exceeded. Please try again in ${retryAfter || 60} seconds.`;
    } else if (code === 'AI_DISABLED') {
      errorMessage = 'AI service is currently unavailable. Please check the setup documentation.';
    }

    setGenerationState({
      loading: false,
      type: null,
      response: null,
      error: errorMessage,
      csvData: null,
    });
    
    showError(errorMessage);
  };

  const downloadCSV = useCallback(() => {
    if (!generationState.csvData) return;

    try {
      // Convert CSV data to string
      const csvContent = generationState.csvData
        .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `subway-executive-summary-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showSuccess('CSV file downloaded successfully');
      
      // Emit telemetry for CSV download
      TelemetryHelpers.trackUserAction('submind_csv_downloaded', 'SubMindGenerate', undefined, {
        rows: generationState.csvData.length,
      });
    } catch (error) {
      showError('Failed to download CSV file');
    }
  }, [generationState.csvData, showSuccess, showError]);

  const copyChecklist = useCallback(() => {
    if (generationState.response?.message) {
      navigator.clipboard.writeText(generationState.response.message);
      showSuccess('Checklist copied to clipboard');
    }
  }, [generationState.response, showSuccess]);

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="text-sm text-gray-600 mb-4">
        Generate actionable artifacts based on your current data and context.
      </div>
      
      {/* Generation Options */}
      <div className="space-y-4 mb-6">
        {/* Executive Summary CSV */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Executive Summary (CSV)</h3>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Generate a CSV with key metrics: Metric, Value, Change, Note
          </p>
          <button 
            className="w-full s-btn s-btn--primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={generateCSV}
            disabled={generationState.loading}
          >
            {generationState.loading && generationState.type === 'csv' ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating CSV...
              </span>
            ) : (
              'Generate CSV Summary'
            )}
          </button>
        </div>

        {/* Action Checklist */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900">Action Checklist</h3>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-xs text-gray-600 mb-3">
            Create a numbered list of next actions based on current data
          </p>
          <button 
            className="w-full s-btn s-btn--secondary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={generateChecklist}
            disabled={generationState.loading}
          >
            {generationState.loading && generationState.type === 'checklist' ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating List...
              </span>
            ) : (
              'Generate Action List'
            )}
          </button>
        </div>
      </div>

      {/* Generated Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="border border-gray-200 rounded-md p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Generated Content</div>
          
          {/* CSV Table Display */}
          {generationState.type === 'csv' && generationState.csvData && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    {generationState.csvData[0]?.map((header, index) => (
                      <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border-b">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generationState.csvData.slice(1).map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-2 py-1 text-gray-600">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Checklist Display */}
          {generationState.type === 'checklist' && generationState.response && (
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {generationState.response.message}
              </pre>
            </div>
          )}

          {/* Error Display */}
          {generationState.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {generationState.error}
            </div>
          )}

          {/* Placeholder */}
          {!generationState.response && !generationState.error && !generationState.loading && (
            <div className="text-sm text-gray-500 italic">
              Generated artifacts will appear here...
            </div>
          )}
        </div>
      </div>

      {/* Download/Action buttons */}
      <div className="flex gap-2 mt-4">
        <button 
          className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={downloadCSV}
          disabled={!generationState.csvData}
        >
          Download CSV
        </button>
        <button 
          className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={copyChecklist}
          disabled={generationState.type !== 'checklist' || !generationState.response}
        >
          Copy Checklist
        </button>
      </div>
    </div>
  );
}

// Helper function to parse CSV data from AI response
function parseCSVFromResponse(response: string): string[][] | null {
  try {
    // Look for CSV-like content in the response
    const lines = response.split('\n').filter(line => line.trim());
    
    // Find lines that look like CSV (contain commas and are structured)
    const csvLines = lines.filter(line => 
      line.includes(',') && 
      !line.startsWith('#') && 
      !line.startsWith('*') &&
      line.split(',').length >= 3
    );

    if (csvLines.length === 0) {
      // If no CSV found, create a simple structure from the response
      return [
        ['Metric', 'Value', 'Change', 'Note'],
        ['AI Response', 'Generated', 'N/A', response.substring(0, 100) + '...']
      ];
    }

    // Parse CSV lines
    const parsedData = csvLines.map(line => {
      // Simple CSV parsing (doesn't handle quoted commas perfectly, but good enough for this use case)
      return line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
    });

    // Ensure we have headers
    if (parsedData.length > 0 && !parsedData[0].some(cell => 
      cell.toLowerCase().includes('metric') || 
      cell.toLowerCase().includes('value')
    )) {
      // Add default headers if not present
      parsedData.unshift(['Metric', 'Value', 'Change', 'Note']);
    }

    return parsedData;
  } catch (error) {
    console.error('Error parsing CSV from response:', error);
    return null;
  }
}