import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUser, logoutUser, logoutAllSessions } from '../api/userApi';
import { FaFolderPlus, FaUpload, FaUser, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import { formatSize } from './DetailsPopup';

function DirectoryHeader({
  directoryName,
  onCreateFolderClick,
  onUploadFilesClick,
  fileInputRef,
  handleFileSelect,
  disabled = false,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Guest User');
  const [userEmail, setUserEmail] = useState('guest@example.com');
  const [userPicture, setUserPicture] = useState('');
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit, setStorageLimit] = useState(5368709120);

  const userMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      try {
        const data = await fetchUser();
        setUserName(data.name);
        setUserEmail(data.email);
        setStorageUsed(data.storageUsed);
        setStorageLimit(data.storageLimit);
        setLoggedIn(true);
      } catch (err) {
        setLoggedIn(false);
        setUserName('Guest User');
        setUserEmail('guest@example.com');
      }
    }
    loadUser();
  }, []);

  const handleUserIconClick = () => {
    setShowUserMenu((prev) => !prev);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setLoggedIn(false);
      setUserName('Guest User');
      setUserEmail('guest@example.com');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setShowUserMenu(false);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllSessions();
      setLoggedIn(false);
      setUserName('Guest User');
      setUserEmail('guest@example.com');
      navigate('/login');
    } catch (err) {
      console.error('Logout all error:', err);
    } finally {
      setShowUserMenu(false);
    }
  };

  useEffect(() => {
    function handleDocumentClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-gray-300 py-2 mb-4">
      <h1 className="text-xl font-semibold">
        {directoryName.startsWith('root-') ? 'My Drive' : directoryName}
      </h1>
      <div className="flex gap-4 items-end">
        <button
          className="text-blue-500 hover:text-blue-700 text-xl -mb-0.5 mr-0.5 disabled:text-blue-300 disabled:cursor-not-allowed cursor-pointer"
          title="Create Folder"
          onClick={onCreateFolderClick}
          disabled={disabled}
        >
          <FaFolderPlus />
        </button>
        <button
          className="text-blue-500 hover:text-blue-700 text-xl disabled:text-blue-300 disabled:cursor-not-allowed cursor-pointer"
          title="Upload Files"
          onClick={onUploadFilesClick}
          disabled={disabled}
        >
          <FaUpload />
        </button>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          onChange={handleFileSelect}
        />
        <div className="relative flex" ref={userMenuRef}>
          <button
            className="text-blue-500 hover:text-blue-700 text-xl cursor-pointer"
            title="User Menu"
            onClick={handleUserIconClick}
          >
            {userPicture ? (
              <img className="w-8 h-8 rounded-full object-cover" src={userPicture} alt={userName} />
            ) : (
              <FaUser />
            )}
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-4 mt-2 w-48 bg-white rounded-md shadow-md z-10 border border-gray-300 overflow-hidden">
              {loggedIn ? (
                <>
                  <div className="px-3 py-2 text-sm text-gray-800">
                    <div className="font-semibold">{userName}</div>
                    <div className="text-xs text-gray-500">{userEmail}</div>
                    <div className="flex flex-col text-xs mr-2 mt-2">
                      <div className="w-40 h-1 bg-gray-300 rounded-full overflow-hidden mb-1">
                        <div
                          className="bg-blue-500 rounded-full h-full"
                          style={{ width: `${((storageUsed / storageLimit) * 100).toFixed(2)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs">
                        <strong> {formatSize(storageUsed)}</strong> used of
                        <strong> {parseInt(formatSize(storageLimit))} GB</strong> (
                        {`${((storageUsed / storageLimit) * 100).toFixed(2)}%`})
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div
                    className="flex items-center gap-2 text-gray-700 cursor-pointer hover:bg-gray-200 px-4 py-2"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="text-blue-600" /> Logout
                  </div>
                  <div
                    className="flex items-center gap-2 text-gray-700 cursor-pointer hover:bg-gray-200 px-4 py-2"
                    onClick={handleLogoutAll}
                  >
                    <FaSignOutAlt className="text-blue-600" /> Logout All
                  </div>
                </>
              ) : (
                <div
                  className="flex items-center gap-2 text-gray-700 cursor-pointer hover:bg-gray-200 px-4 py-2"
                  onClick={() => {
                    navigate('/login');
                    setShowUserMenu(false);
                  }}
                >
                  <FaSignInAlt className="text-blue-600" /> Login
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DirectoryHeader;
