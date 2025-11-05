import { useState } from 'react';

interface AICostSavingsProps {
  totalCandidates: number;
  aiCandidates: number;
  estimatedSavings: number;
  aggressionLevel: number;
}

export default function AICostSavingsIndicator({ 
  totalCandidates, 
  aiCandidates, 
  estimatedSavings, 
  aggressionLevel 
}: AICostSavingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (totalCandidates === 0) return null;

  const percentageWithAI = (aiCandidates / totalCandidates) * 100;
  const candidatesSkipped = totalCandidates - aiCandidates;

  return (
    <div className="fixed bottom-20 right-4 z-40 bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded-lg shadow-lg max-w-sm">
      <div className="flex items-center">
        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
        <span className="text-sm font-medium">AI Cost Savings</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 text-green-600 hover:text-green-800"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-2 text-xs space-y-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-medium">Aggression: {aggressionLevel}</p>
              <p>Total candidates: {totalCandidates}</p>
              <p>AI processing: {aiCandidates}</p>
              <p>Skipped: {candidatesSkipped}</p>
            </div>
            <div>
              <p className="font-medium">Cost Savings</p>
              <p>AI coverage: {percentageWithAI.toFixed(0)}%</p>
              <p className="text-green-800 font-bold">
                Saved: £{estimatedSavings.toFixed(4)}
              </p>
            </div>
          </div>
          
          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
            <p className="text-green-800 text-xs">
              💡 Only the top {percentageWithAI.toFixed(0)}% of candidates get AI rationales, 
              significantly reducing costs while maintaining quality insights for the best locations.
            </p>
          </div>
          
          <div className="mt-1 text-xs text-green-600">
            Configure: AI_CANDIDATE_PERCENTAGE in .env.local
          </div>
        </div>
      )}
    </div>
  );
}