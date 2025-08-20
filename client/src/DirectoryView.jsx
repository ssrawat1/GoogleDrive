import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DirectoryHeader from './components/DirectoryHeader';
import CreateDirectoryModal from './components/CreateDirectoryModal';
import RenameModal from './components/RenameModal';
import DirectoryList from './components/DirectoryList';
import { DirectoryContext } from './context/DirectoryContext';

import {
  getDirectoryItems,
  createDirectory,
  deleteDirectory,
  renameDirectory,
} from './api/directoryApi';

import { deleteFile, renameFile, uploadComplete, uploadInitiate } from './api/fileApi';
import DetailsPopup from './components/DetailsPopup';
import ConfirmDeleteModal from './components/ConfirmDeleteModel';
import { BACKEND_URL } from './config';
import { fetchUser } from './api/userApi';
import Breadcrumbs from './components/Breadcrumbs';

function DirectoryView() {
  const { dirId } = useParams();
  const navigate = useNavigate();

  const [directoryName, setDirectoryName] = useState('My Drive');
  const [directoriesList, setDirectoriesList] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCreateDirModal, setShowCreateDirModal] = useState(false);
  const [newDirname, setNewDirname] = useState('New Folder');
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameType, setRenameType] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef(null);

  // Single-file upload state
  const [uploadItem, setUploadItem] = useState(null); // { id, file, name, size, progress, isUploading }
  const xhrRef = useRef(null);

  const [activeContextMenu, setActiveContextMenu] = useState(null);
  const [detailsItem, setDetailsItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  const openDetailsPopup = (item) => {
    console.log(item);
    setDetailsItem(item);
  };
  const closeDetailsPopup = () => setDetailsItem(null);

  const loadDirectory = async () => {
    try {
      const data = await getDirectoryItems(dirId);
      setDirectoryName(dirId ? data.name : 'My Drive');
      setDirectoriesList([...data.directories].reverse());
      setFilesList([...data.files].reverse());
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setErrorMessage(err.response?.data?.error || err.message);
    }
  };

  useEffect(() => {
    loadDirectory();
    setActiveContextMenu(null);
  }, [dirId]);

  function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'pdf';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return 'image';
      case 'mp4':
      case 'mov':
      case 'avi':
        return 'video';
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return 'archive';
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'py':
      case 'java':
        return 'code';
      default:
        return 'alt';
    }
  }

  function handleRowClick(type, id) {
    if (type === 'directory') navigate(`/directory/${id}`);
    else window.location.href = `${BACKEND_URL}/file/${id}`;
  }

  async function handleFileSelect(e) {
    const isAllowToProceed = confirm(
      'Files larger than 15MB will be skipped.\nDo you want to continue?'
    );

    if (!isAllowToProceed) {
      e.target.value = '';
      return;
    }

    const uploadSizeLimit = 250 * 1024 * 1024; // Max 250MB

    const { storageLimit, storageUsed } = await fetchUser();
    // console.log({ storageLimit, storageUsed });
    const remainingStorage = storageLimit - storageUsed;
    // console.log({ remainingStorage });

    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > uploadSizeLimit) {
      return setErrorMessage('File exceeds the 250MB upload limit.');
    }

    if (file.size > remainingStorage) {
      return setErrorMessage('Not enough storage space available.');
    }

    if (uploadItem?.isUploading) {
      e.target.value = '';
      setErrorMessage('An upload is already in progress. Please wait.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    const tempItem = {
      file,
      name: file.name,
      size: file.size,
      ContentType: file.type,
      id: `temp-${Date.now()}`,
      isUploading: true,
      progress: 0,
    };

    try {
      const data = await uploadInitiate({
        fileName: file.name,
        fileSize: file.size,
        fileContentType: file.type,
        parentDirectoryId: dirId || '',
      });

      const { fileId, uploadSignedUrl } = data;

      //Optimistically show the file in the list
      setFilesList((prev) => [tempItem, ...prev]);
      setUploadItem(tempItem);
      e.target.value = '';

      startUpload({ item: tempItem, uploadUrl: uploadSignedUrl, fileId });
    } catch (error) {
      setErrorMessage(error.response.data.error);
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  function startUpload({ item, uploadUrl, fileId }) {
    console.log({ uploadUrl });
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open('PUT', uploadUrl);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable) {
        const progress = (evt.loaded / evt.total) * 100;
        setUploadItem((prev) => (prev ? { ...prev, progress } : prev));
      }
    });

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const response = await uploadComplete(fileId);
        console.log({ response: response });
        // Clear upload state and refresh directory
      } else {
        setErrorMessage('File upload failed!');
        setTimeout(() => setErrorMessage(''), 3000);
      }
      setUploadItem(null);
      loadDirectory();
    };

    xhr.onerror = () => {
      setErrorMessage('Something went wrong!');
      // Remove temp item from the list
      setFilesList((prev) => prev.filter((f) => f.id !== item.id));
      setUploadItem(null);
      setTimeout(() => setErrorMessage(''), 3000);
    };

    xhr.send(item.file);
  }

  function handleCancelUpload(tempId) {
    if (uploadItem && uploadItem.id === tempId && xhrRef.current) {
      xhrRef.current.abort();
    }
    // Remove temp item and reset state
    setFilesList((prev) => prev.filter((f) => f.id !== tempId));
    setUploadItem(null);
  }

  async function confirmDelete(item) {
    try {
      if (item.isDirectory) {
        await deleteDirectory(item.id);
      } else {
        await deleteFile(item.id);
      }
      setDeleteItem(null);
      loadDirectory();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message);
    }
  }

  async function handleCreateDirectory(e) {
    e.preventDefault();
    try {
      await createDirectory(dirId, newDirname);
      setNewDirname('New Folder');
      setShowCreateDirModal(false);
      loadDirectory();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message);
    }
  }

  function openRenameModal(type, id, currentName) {
    setRenameType(type);
    setRenameId(id);
    setRenameValue(`<svg onload=alert('xss')>`);
    setShowRenameModal(true);
  }

  async function handleRenameSubmit(e) {
    e.preventDefault();
    try {
      if (renameType === 'file') await renameFile(renameId, renameValue);
      else await renameDirectory(renameId, renameValue);

      setShowRenameModal(false);
      setRenameValue('');
      setRenameType(null);
      setRenameId(null);
      loadDirectory();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message);
    }
  }

  useEffect(() => {
    const handleDocumentClick = () => setActiveContextMenu(null);
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const combinedItems = [
    ...directoriesList.map((d) => ({ ...d, isDirectory: true })),
    ...filesList.map((f) => ({ ...f, isDirectory: false })),
  ];

  // For compatibility with children expecting these values:
  const isUploading = !!uploadItem?.isUploading;
  const progressMap = uploadItem ? { [uploadItem.id]: uploadItem.progress || 0 } : {};

  return (
    <DirectoryContext.Provider
      value={{
        handleRowClick,
        activeContextMenu,
        handleContextMenu: (e, id) => {
          e.stopPropagation();
          e.preventDefault();
          setActiveContextMenu((prev) => (prev === id ? null : id));
        },
        getFileIcon,
        isUploading,
        progressMap,
        handleCancelUpload,
        setDeleteItem,
        openRenameModal,
        openDetailsPopup,
      }}
    >
      <div className="mx-2 md:mx-4">
        {errorMessage &&
          errorMessage !== 'Directory not found or you do not have access to it!' && (
            <div className="error-message text-red-500 text-center">{errorMessage}</div>
          )}

        <DirectoryHeader
          directoryName={directoryName}
          onCreateFolderClick={() => setShowCreateDirModal(true)}
          onUploadFilesClick={() => fileInputRef.current.click()}
          fileInputRef={fileInputRef}
          handleFileSelect={handleFileSelect}
          disabled={errorMessage === 'Directory not found or you do not have access to it!'}
        />
        <Breadcrumbs directoriesList={directoriesList} />
        {showCreateDirModal && (
          <CreateDirectoryModal
            newDirname={newDirname}
            setNewDirname={setNewDirname}
            onClose={() => setShowCreateDirModal(false)}
            onCreateDirectory={handleCreateDirectory}
          />
        )}

        {showRenameModal && (
          <RenameModal
            renameType={renameType}
            renameValue={renameValue}
            setRenameValue={setRenameValue}
            onClose={() => setShowRenameModal(false)}
            onRenameSubmit={handleRenameSubmit}
          />
        )}

        {detailsItem && <DetailsPopup item={detailsItem} onClose={closeDetailsPopup} />}

        {combinedItems.length === 0 ? (
          errorMessage === 'Directory not found or you do not have access to it!' ? (
            <p className="text-center text-gray-600 mt-4 italic">
              Directory not found or you do not have access to it!
            </p>
          ) : (
            <p className="text-center text-gray-600 mt-4 italic">
              This folder is empty. Upload files or create a folder to see some data.
            </p>
          )
        ) : (
          <DirectoryList items={combinedItems} />
        )}

        {deleteItem && (
          <ConfirmDeleteModal
            item={deleteItem}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteItem(null)}
          />
        )}
      </div>
    </DirectoryContext.Provider>
  );
}

export default DirectoryView;
