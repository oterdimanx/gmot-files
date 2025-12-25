// IndexedDB for file binary data storage
const DB_NAME = 'filehub_db';
const DB_VERSION = 1;
const FILES_STORE = 'files';

// localStorage key for folders
const FOLDERS_KEY = 'filehub_folders';

export interface StoredFileData {
  id: string;
  name: string;
  size: number;
  type: string;
  folderId?: string | null;
  textContent?: string;
  fileData: ArrayBuffer;
}

interface StoredFolder {
  id: string;
  name: string;
  color: string;
  createdAt: string; // ISO string for JSON serialization
}

// Initialize IndexedDB
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Save file to IndexedDB
export const saveFileToDB = async (file: StoredFileData): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.put(file);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Get all files from IndexedDB
export const getFilesFromDB = async (): Promise<StoredFileData[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
};

// Delete file from IndexedDB
export const deleteFileFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Clear all files from IndexedDB
export const clearAllFilesFromDB = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

// Save folders to localStorage
export const saveFolders = (folders: { id: string; name: string; color: string; createdAt: Date }[]): void => {
  const storedFolders: StoredFolder[] = folders.map(f => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(storedFolders));
};

// Load folders from localStorage
export const loadFolders = (): { id: string; name: string; color: string; createdAt: Date }[] => {
  const stored = localStorage.getItem(FOLDERS_KEY);
  if (!stored) return [];
  
  try {
    const parsed: StoredFolder[] = JSON.parse(stored);
    return parsed.map(f => ({
      ...f,
      createdAt: new Date(f.createdAt),
    }));
  } catch {
    return [];
  }
};

// Clear folders from localStorage
export const clearFolders = (): void => {
  localStorage.removeItem(FOLDERS_KEY);
};

// Get storage usage statistics
export const getStorageUsage = async (): Promise<{ used: number; quota: number | null }> => {
  let used = 0;

  // Calculate IndexedDB usage
  try {
    const files = await getFilesFromDB();
    used = files.reduce((acc, file) => acc + (file.fileData?.byteLength || 0) + file.name.length, 0);
  } catch {
    // Ignore errors
  }

  // Add localStorage usage
  const foldersData = localStorage.getItem(FOLDERS_KEY);
  if (foldersData) {
    used += new Blob([foldersData]).size;
  }

  // Try to get quota from Storage API if available
  let quota: number | null = null;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      quota = estimate.quota || null;
    } catch {
      // Ignore errors
    }
  }

  return { used, quota };
};
