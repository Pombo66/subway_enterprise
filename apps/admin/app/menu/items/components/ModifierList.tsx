import { Plus, Minus } from 'lucide-react';
import { ModifierGroup } from '../../../../lib/types';

interface ModifierListProps {
  title: string;
  groups: ModifierGroup[];
  emptyMessage: string;
  actionType: 'attach' | 'detach';
  onAction: (group: ModifierGroup) => void;
  operationInProgress?: string;
  testId: string;
}

export default function ModifierList({
  title,
  groups,
  emptyMessage,
  actionType,
  onAction,
  operationInProgress,
  testId
}: ModifierListProps) {
  const isAttachAction = actionType === 'attach';
  const ActionIcon = isAttachAction ? Plus : Minus;
  const actionColor = isAttachAction ? 'green' : 'red';

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        {title} ({groups.length})
      </h3>
      <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden" data-testid={testId}>
        {groups.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 max-h-full overflow-y-auto">
            {groups.map((group) => {
              const isOperationInProgress = operationInProgress === `${actionType}-${group.id}`;
              
              return (
                <div key={group.id} className="p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {group.name}
                      </h4>
                      {group.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={() => onAction(group)}
                      disabled={isOperationInProgress}
                      className={`ml-2 p-1 text-${actionColor}-600 hover:text-${actionColor}-800 hover:bg-${actionColor}-50 rounded disabled:opacity-50`}
                      aria-label={`${actionType} ${group.name} modifier`}
                    >
                      {isOperationInProgress ? (
                        <div className={`w-4 h-4 animate-spin rounded-full border-2 border-${actionColor}-600 border-t-transparent`}></div>
                      ) : (
                        <ActionIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}