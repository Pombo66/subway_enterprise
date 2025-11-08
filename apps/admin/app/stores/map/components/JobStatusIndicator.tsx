interface JobStatusIndicatorProps {
  isLoading: boolean;
  jobId?: string;
  estimate?: {
    tokens: number;
    cost: number;
  };
}

export default function JobStatusIndicator({ isLoading }: JobStatusIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-100 border border-blue-300 rounded-lg p-4 shadow-lg">
      <div className="flex items-center">
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
        <p className="text-sm font-medium text-blue-800">Generating Expansion</p>
      </div>
    </div>
  );
}