'use client';
import { useState, useEffect } from 'react';

interface JobStatusIndicatorProps {
  isLoading: boolean;
  jobId?: string;
  estimate?: {
    tokens: number;
    cost: number;
  };
}

export default function JobStatusIndicator({ isLoading, estimate }: JobStatusIndicatorProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading]);

  if (!isLoading) return null;

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeDisplay = minutes > 0 
    ? `${minutes}m ${seconds}s` 
    : `${seconds}s`;

  // Show different messages based on elapsed time
  let message = 'Generating expansion suggestions...';
  if (elapsedSeconds > 300) { // 5 minutes
    message = 'Large area detected - this may take 10-15 minutes...';
  } else if (elapsedSeconds > 120) { // 2 minutes
    message = 'Processing country-wide expansion...';
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-start">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3 mt-0.5 flex-shrink-0"></div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">{message}</p>
          <p className="text-xs text-blue-600 mt-1">Elapsed: {timeDisplay}</p>
        </div>
      </div>
    </div>
  );
}