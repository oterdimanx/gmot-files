import { useState, useEffect, useCallback } from 'react';
import { DroppedFile, Folder } from '@/types/file';
import {
  initDB,
  saveFileToDB,
  getFilesFromDB,
  deleteFileFromDB,
  clearAllFilesFromDB,
  saveFolders,
  loadFolders,
  clearFolders,
  StoredFileData,
} from '@/lib/storage';
import { toast } from 'sonner';

// Convert File to ArrayBuffer
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

// Convert StoredFileData to DroppedFile (recreate blob URL for preview)
const storedToDroppedFile = (stored: StoredFileData): DroppedFile => {
  const blob = new Blob([stored.fileData], { type: stored.type });
  const file = new File([blob], stored.name, { type: stored.type });
  
  let preview: string | undefined;
  if (stored.type.startsWith('image/')) {
    preview = URL.createObjectURL(blob);
  }

  return {
    id: stored.id,
    file,
    name: stored.name,
    size: stored.size,
    type: stored.type,
    preview,
    textContent: stored.textContent,
    folderId: stored.folderId,
  };
};

// Convert DroppedFile to StoredFileData
const droppedToStoredFile = async (file: DroppedFile): Promise<StoredFileData> => {
  const fileData = await fileToArrayBuffer(file.file);
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type,
    folderId: file.folderId,
    textContent: file.textContent,
    fileData,
  };
};

export const useFileStorage = () => {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await initDB();
        
        // Load folders from localStorage
        const storedFolders = loadFolders();
        setFolders(storedFolders);

        // Load files from IndexedDB
        const storedFiles = await getFilesFromDB();
        const droppedFiles = storedFiles.map(storedToDroppedFile);
        setFiles(droppedFiles);
      } catch (error) {
        console.error('Failed to load data from storage:', error);
        toast.error('Failed to load saved files');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Cleanup blob URLs on unmount
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, []);

  // Persist folders whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveFolders(folders);
    }
  }, [folders, isLoading]);

  const addFiles = useCallback(async (newFiles: DroppedFile[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    
    // Save to IndexedDB
    for (const file of newFiles) {
      try {
        const storedFile = await droppedToStoredFile(file);
        await saveFileToDB(storedFile);
      } catch (error) {
        console.error('Failed to save file to storage:', error);
      }
    }
  }, []);

  const removeFile = useCallback(async (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });

    try {
      await deleteFileFromDB(id);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    
    setFiles([]);
    setFolders([]);

    try {
      await clearAllFilesFromDB();
      clearFolders();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }, [files]);

  const createFolder = useCallback((name: string, color: string) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      createdAt: new Date(),
    };
    setFolders(prev => [...prev, newFolder]);
    toast.success(`Folder "${name}" created`);
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    
    // Move files from deleted folder to root and update storage
    setFiles(prev => {
      const updated = prev.map(f => 
        f.folderId === folderId ? { ...f, folderId: null } : f
      );
      
      // Update files in IndexedDB
      updated.filter(f => f.folderId === null && prev.find(p => p.id === f.id)?.folderId === folderId)
        .forEach(async (file) => {
          try {
            const storedFile = await droppedToStoredFile(file);
            await saveFileToDB(storedFile);
          } catch (error) {
            console.error('Failed to update file in storage:', error);
          }
        });
      
      return updated;
    });
    
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (folder) {
      toast.success(`Folder "${folder.name}" deleted`);
    }
  }, [folders]);

  const renameFolder = useCallback((folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, name: newName } : f
    ));
    toast.success(`Folder renamed to "${newName}"`);
  }, []);

  const moveFileToFolder = useCallback(async (folderId: string, fileId: string) => {
    const folder = folders.find(f => f.id === folderId);
    
    setFiles(prev => {
      const updated = prev.map(f => 
        f.id === fileId ? { ...f, folderId } : f
      );
      return updated;
    });

    // Update in IndexedDB
    const file = files.find(f => f.id === fileId);
    if (file) {
      try {
        const updatedFile = { ...file, folderId };
        const storedFile = await droppedToStoredFile(updatedFile);
        await saveFileToDB(storedFile);
      } catch (error) {
        console.error('Failed to update file in storage:', error);
      }
    }

    if (folder) {
      toast.success(`File moved to "${folder.name}"`);
    }
  }, [folders, files]);

  const moveFileToRoot = useCallback(async (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, folderId: null } : f
    ));

    // Update in IndexedDB
    const file = files.find(f => f.id === fileId);
    if (file) {
      try {
        const updatedFile = { ...file, folderId: null };
        const storedFile = await droppedToStoredFile(updatedFile);
        await saveFileToDB(storedFile);
      } catch (error) {
        console.error('Failed to update file in storage:', error);
      }
    }

    toast.success('File moved to root');
  }, [files]);

  return {
    files,
    folders,
    isLoading,
    addFiles,
    removeFile,
    clearAll,
    createFolder,
    deleteFolder,
    renameFolder,
    moveFileToFolder,
    moveFileToRoot,
  };
};
