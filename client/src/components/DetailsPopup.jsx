import { useEffect, useState } from 'react';

export const formatSize = (bytes = 0) => {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;

  if (bytes < KB) return `${bytes} Bytes`;
  if (bytes < MB) return `${(bytes / KB).toFixed(2)} KB`;
  if (bytes < GB) return `${(bytes / MB).toFixed(2)} MB`;
  return `${(bytes / GB).toFixed(2)} GB`;
};

function DetailsPopup({ item, onClose }) {
  if (!item) return null;

  console.log('details', item);

  const {
    id,
    name,
    isDirectory,
    createdAt,
    updatedAt,
    size,
    path,
    totalFiles,
    totalFolders,
    totalItems,
  } = item;

  const pathArray = path.split('/');
  if (pathArray[1]?.startsWith('root-')) {
    pathArray[1] = 'My Drive';
  }
  const fullCleanPath = pathArray.join('/');
 
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-lg shadow-md w-[90%] max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Details</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold">Name:</span> {name}
          </div>
          <div>
            <span className="font-semibold">Path:</span> {fullCleanPath}
          </div>
          <div>
            <span className="font-semibold">Size:</span> {formatSize(size)}
          </div>
          <div>
            <span className="font-semibold">Created At:</span>{' '}
            {new Date(createdAt).toLocaleString()}
          </div>
          <div>
            <span className="font-semibold">Updated At:</span>{' '}
            {new Date(updatedAt).toLocaleString()}
          </div>
          {isDirectory && (
            <>
              <div>
                <span className="font-semibold">Files:</span> {totalFiles}
              </div>
              <div>
                <span className="font-semibold">Folders:</span> {totalFolders}
              </div>
              <div>
                <span className="font-semibold">Total Items:</span> {totalItems}
              </div>
            </>
          )}
        </div>
        <div className="flex justify-end mt-2">
          <button
            className="bg-gray-300 text-black px-4 py-2 rounded cursor-pointer hover:bg-gray-400"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default DetailsPopup;
