import { MenuItem } from '../../../../lib/types';

interface MenuTableProps {
  items: MenuItem[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onEditItem?: (item: MenuItem) => void;
  onDeleteItem?: (itemId: string) => void;
}

export default function MenuTable({ 
  items, 
  loading, 
  error, 
  onRefresh, 
  onEditItem,
  onDeleteItem 
}: MenuTableProps) {
  if (loading) {
    return (
      <div className="menu-table">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-white">Loading menu items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-table">
        <div className="p-6 text-center">
          <div className="text-red-400 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-white">Error loading menu items</p>
          </div>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button 
            onClick={onRefresh}
            className="s-btn"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="menu-table">
        <div className="p-6 text-center">
          <p className="text-gray-400">No menu items found</p>
          <button 
            onClick={onRefresh}
            className="s-btn mt-2"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-table menu-table-v2" data-testid="menu-table">
      <div className="menu-header">
        <div className="menu-cell menu-cell-left">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Name</span>
        </div>
        <div className="menu-cell menu-cell-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Price</span>
        </div>
        <div className="menu-cell menu-cell-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Modifiers</span>
        </div>
        <div className="menu-cell menu-cell-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Status</span>
        </div>
        <div className="menu-cell menu-cell-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</span>
        </div>
      </div>
      <div className="menu-body">
        {items.map((item) => (
          <div key={item.id} className="menu-row">
            <div className="menu-cell menu-cell-left">
              <div className="menu-item-name">{item.name}</div>
            </div>
            <div className="menu-cell menu-cell-center">
              <div className="menu-price">
                ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price.toString()}
              </div>
            </div>
            <div className="menu-cell menu-cell-center">
              <span className="menu-category">
                {item.modifiers?.length || 0} groups
              </span>
            </div>
            <div className="menu-cell menu-cell-center">
              <span className={`badge ${item.active ? 'badge-active' : 'badge-inactive'}`}>
                {item.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="menu-cell menu-cell-center">
              <div className="menu-actions">
                {onEditItem && (
                  <button 
                    onClick={() => onEditItem(item)}
                    className="menu-action-btn menu-edit"
                  >
                    Edit
                  </button>
                )}
                {onDeleteItem && (
                  <button 
                    onClick={() => onDeleteItem(item.id)}
                    className="menu-action-btn menu-delete"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}