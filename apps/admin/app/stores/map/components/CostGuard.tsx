import { useState } from 'react';

interface CostGuardProps {
  estimate: {
    tokens: number;
    cost: number;
  };
  onConfirm: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

export default function CostGuard({ estimate, onConfirm, onCancel, isVisible }: CostGuardProps) {
  if (!isVisible) return null;

  const isHighCost = estimate.cost > 1.0; // £1.00 threshold

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <div className="flex items-center mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
            isHighCost ? 'bg-red-100' : 'bg-yellow-100'
          }`}>
            {isHighCost ? '⚠️' : '💰'}
          </div>
          <h3 className="text-lg font-semibold">
            {isHighCost ? 'High Cost Warning' : 'Cost Confirmation'}
          </h3>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-3">
            This expansion generation will use AI features and may incur costs:
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated tokens:</span>
              <span className="font-mono text-sm">{estimate.tokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated cost:</span>
              <span className={`font-mono text-sm font-semibold ${
                isHighCost ? 'text-red-600' : 'text-green-600'
              }`}>
                £{estimate.cost.toFixed(2)}
              </span>
            </div>
          </div>
          
          {isHighCost && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                This is a high-cost operation. Consider reducing the aggression level 
                or disabling AI features to lower costs.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors ${
              isHighCost 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isHighCost ? 'Proceed Anyway' : 'Confirm & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}