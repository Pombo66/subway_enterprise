interface JobStatusIndicatorProps {
  isLoading: boolean;
  jobId?: string;
  estimate?: {
    tokens: number;
    cost: number;
  };
}

export default function JobStatusIndicator({ isLoading, jobId, estimate }: JobStatusIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <div>
          <p className="text-sm font-medium text-blue-800">Generating Expansion</p>
          <p className="text-xs text-blue-700">
            Job continues in background if connection drops
          </p>
          {jobId && (
            <p className="text-xs text-blue-600 font-mono mt-1">
              ID: {jobId.slice(0, 8)}...
            </p>
          )}
          {estimate && (
            <p className="text-xs text-blue-600 mt-1">
              Est. cost: £{estimate.cost.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}