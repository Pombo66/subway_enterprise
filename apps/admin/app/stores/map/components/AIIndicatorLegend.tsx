import { useState } from 'react';

interface AIIndicatorLegendProps {
  totalCandidates: number;
  aiCandidates: number;
  estimatedSavings: number;
}

export default function AIIndicatorLegend({ 
  totalCandidates, 
  aiCandidates, 
  estimatedSavings 
}: AIIndicatorLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (totalCandidates === 0) return null;

  const percentageWithAI = (aiCandidates / totalCandidates) * 100;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-800">AI Analysis Legend</h4>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Legend Items */}
      <div className="space-y-3">
        {/* High Confidence Marker */}
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* Main Marker */}
            <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white relative">
              {/* Sparkle Badge */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border border-white flex items-center justify-center text-xs">
                ✨
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">High Confidence (&gt;75%)</div>
            <div className="text-xs text-gray-600">Strong expansion candidates with high viability scores</div>
          </div>
        </div>

        {/* Standard Marker */}
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-purple-500 rounded-full border-2 border-white"></div>
          <div>
            <div className="text-sm font-medium text-gray-800">Standard Confidence</div>
            <div className="text-xs text-gray-600">Viable expansion candidates (≤75% confidence)</div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-medium text-gray-700">Total Candidates</div>
              <div className="text-lg font-bold text-gray-900">{totalCandidates}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">AI Enhanced</div>
              <div className="text-lg font-bold text-amber-600">{aiCandidates}</div>
            </div>
          </div>
          
          <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
            <div className="text-xs text-green-800">
              <div className="font-medium">Cost Savings</div>
              <div>Saved £{estimatedSavings.toFixed(4)} by limiting AI to top candidates</div>
              <div className="mt-1 opacity-75">
                {totalCandidates - aiCandidates} candidates use efficient algorithmic analysis
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}