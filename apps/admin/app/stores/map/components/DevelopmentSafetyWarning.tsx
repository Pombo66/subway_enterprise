import { useState, useEffect } from 'react';

interface CostSummary {
  today: number;
  total: number;
  limit: number;
}

export default function DevelopmentSafetyWarning() {
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const openaiEnabled = process.env.NEXT_PUBLIC_ENABLE_OPENAI_CALLS === 'true';
  const jobProcessingEnabled = process.env.NEXT_PUBLIC_ENABLE_JOB_PROCESSING === 'true';

  // Debug logging
  console.log('🔍 Safety Warning Debug:', {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_ENABLE_OPENAI_CALLS: process.env.NEXT_PUBLIC_ENABLE_OPENAI_CALLS,
    NEXT_PUBLIC_ENABLE_JOB_PROCESSING: process.env.NEXT_PUBLIC_ENABLE_JOB_PROCESSING,
    isDevelopment,
    openaiEnabled,
    jobProcessingEnabled
  });

  useEffect(() => {
    if (isDevelopment && (openaiEnabled || jobProcessingEnabled)) {
      // Fetch cost summary
      fetch('/api/expansion/cost-summary')
        .then(res => res.json())
        .then(data => setCostSummary(data))
        .catch(err => console.warn('Failed to fetch cost summary:', err));
    }
  }, [isDevelopment, openaiEnabled, jobProcessingEnabled]);

  if (!isDevelopment || isHidden) return null;

  // Safe mode - show green indicator
  if (!openaiEnabled && !jobProcessingEnabled) {
    return (
      <div className="fixed top-4 left-4 z-50 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg shadow-lg">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-sm font-medium">Safe Mode</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        {isExpanded && (
          <div className="mt-2 text-xs">
            <p>✅ OpenAI calls: DISABLED</p>
            <p>✅ Job processing: DISABLED</p>
            <p className="mt-1 font-medium">No API costs will be incurred</p>
          </div>
        )}
      </div>
    );
  }

  // Danger mode - show red warning
  return (
    <div className="fixed top-4 left-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center mb-2">
        <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
        <span className="font-bold">⚠️ COST WARNING</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-auto text-red-600 hover:text-red-800"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      <p className="text-sm font-medium mb-2">
        Real API calls are ENABLED in development!
      </p>
      
      {isExpanded && (
        <div className="text-xs space-y-1">
          <p>🔥 OpenAI calls: {openaiEnabled ? 'ENABLED' : 'DISABLED'}</p>
          <p>🔥 Job processing: {jobProcessingEnabled ? 'ENABLED' : 'DISABLED'}</p>
          
          {costSummary && (
            <div className="mt-2 p-2 bg-red-50 rounded border">
              <p className="font-medium">Today&apos;s costs: £{costSummary.today.toFixed(2)}</p>
              <p>Total costs: £{costSummary.total.toFixed(2)}</p>
              <p>Daily limit: £{costSummary.limit.toFixed(2)}</p>
              {costSummary.today > costSummary.limit * 0.8 && (
                <p className="text-red-800 font-bold mt-1">⚠️ Near daily limit!</p>
              )}
            </div>
          )}
          
          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-yellow-800 text-xs mb-2">
              To disable: Remove ENABLE_OPENAI_CALLS and ENABLE_JOB_PROCESSING from environment
            </p>
            <button
              onClick={() => setIsHidden(true)}
              className="bg-yellow-200 hover:bg-yellow-300 text-yellow-800 px-2 py-1 rounded text-xs font-medium"
            >
              Hide Warning (This Session)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}