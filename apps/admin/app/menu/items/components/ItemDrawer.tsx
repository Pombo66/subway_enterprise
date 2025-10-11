interface ItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated?: () => void;
}

export default function ItemDrawer({ isOpen, onClose }: ItemDrawerProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Add Menu Item</h2>
        <p className="text-gray-600 mb-4">This feature is temporarily disabled due to technical issues.</p>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}