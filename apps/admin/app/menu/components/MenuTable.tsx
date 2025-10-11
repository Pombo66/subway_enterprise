import { MenuItem } from '../../../lib/types';

interface MenuTableProps {
  items: MenuItem[];
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
  onEditModifiers?: (itemId: string, itemName: string) => void;
}

export default function MenuTable({ items, loading, error, onRefresh, onEditModifiers }: MenuTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading menu items...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium">Error loading menu items</p>
          </div>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button 
            onClick={onRefresh}
            className="s-btn s-btn--md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 text-center">
          <p className="text-gray-600">No menu items found</p>
          <button
   <button 
            onClick={onRefresh}
            className="s-btn s-btn--md mt-2 text-blue-600 hover:text-blue-800"
          >  Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden" data-testid="menu-table">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {/* First column: left-aligned */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            {/* All other columns: center-aligned */}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Price
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Store
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Modifiers
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              {/* First column: left-aligned */}
              <td className="px-6 py-4 whitespace-nowrap text-left">
                <div className="text-sm font-medium text-gray-900">{item.name}</div>
              </td>
              {/* All other columns: center-aligned */}
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900">
                  ${typeof item.price === 'number' ? item.price.toFixed(2) : item.price.toString()}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="text-sm text-gray-900">{item.Store.name}</div>
                {item.Store.region && (
                  <div className="text-xs text-gray-500">{item.Store.region}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="text-sm text-gray-600">
                  {item.modifiers?.length || 0} groups
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {item.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex justify-center space-x-2">
                  {onEditModifiers && (
                    <button 
                   <button className="s-btn s-btn--md" onClick={() =>em.name)}
                      className="text-purple-600 hover:text-purple-900 text-sm"
                      data-testid="modifiers-button"
                    >
                      Modifiers
                    </button>
                  )}
                  <button className="text-blue-600 <button  className="s-btn s-btn--md text-blue-600 hover:text-blue-900 text-sm">           </button>
                  <button className="text-red-600 hover:text-red-900<button  className="s-btn s-btn--md text-red-600 hover:text-red-900 text-sm">tton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}