'use client';

import React, { useState } from 'react';
import { 
  Inbox, 
  Clock, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Download, 
  Trash2, 
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import usePipelineIntegration from '../../hooks/usePipelineIntegration';

interface PipelinePanelProps {
  className?: string;
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  const {
    pipelineItems,
    pipelineStats,
    removeFromPipeline,
    updateItemStatus,
    clearPipeline,
    exportPipeline,
    hasPipelineItems
  } = usePipelineIntegration();

  // Filter items by status
  const filteredItems = selectedStatus === 'all' 
    ? pipelineItems 
    : pipelineItems.filter(item => item.status === selectedStatus);

  // Status icons and colors
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'reviewing':
        return { icon: Eye, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  if (!hasPipelineItems && !isExpanded) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-3 ${className}`} data-design-guard="off">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Pipeline Empty</span>
          </div>
          <span className="text-xs text-gray-500">0 items</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`} data-design-guard="off">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-gray-900">Expansion Pipeline</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {pipelineStats.total} items
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Stats */}
          <div className="px-3 pb-3 border-b border-gray-100">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-yellow-600">{pipelineStats.pending}</div>
                <div className="text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{pipelineStats.reviewing}</div>
                <div className="text-gray-500">Review</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{pipelineStats.approved}</div>
                <div className="text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-red-600">{pipelineStats.rejected}</div>
                <div className="text-gray-500">Rejected</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Items</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Reviewing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <div className="flex gap-1">
                <button
                  onClick={exportPipeline}
                  className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                  title="Export pipeline"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={clearPipeline}
                  className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                  title="Clear pipeline"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-500">
                No items match the selected filter
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredItems.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900 truncate">
                            {item.suggestion.lat.toFixed(3)}°, {item.suggestion.lng.toFixed(3)}°
                          </div>
                          <div className="text-xs text-gray-500">
                            Score: {Math.round(item.suggestion.finalScore * 100)}%
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded-full ${statusInfo.bg}`}>
                          <StatusIcon className={`w-3 h-3 ${statusInfo.color}`} />
                        </div>
                        
                        <select
                          value={item.status}
                          onChange={(e) => updateItemStatus(item.id, e.target.value as any)}
                          className="text-xs border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        <button
                          onClick={() => removeFromPipeline(item.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove from pipeline"
                        >
                          <XCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Capacity Indicator */}
          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Capacity</span>
              <span className="text-gray-900">
                {pipelineStats.total} / {pipelineStats.capacity}
              </span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(pipelineStats.total / pipelineStats.capacity) * 100}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PipelinePanel;