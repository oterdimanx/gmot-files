import { useState, useEffect, useCallback } from 'react'
import { useFileStorage } from './useFileStorage'
import { syncService } from '@/lib/supabase/syncService'
import type { DroppedFile, Folder } from '@/types/file'

export const useHybridStorage = () => {
  // Get ALL methods from your existing hook
  const {
    files: localFiles,
    folders: localFolders,
    addFiles: localAddFiles,
    removeFile: localRemoveFile,
    clearAll: localClearAll,
    createFolder: localCreateFolder,
    deleteFolder: localDeleteFolder,
    renameFolder: localRenameFolder,
    moveFileToFolder: localMoveFileToFolder,
    moveFileToRoot: localMoveFileToRoot,
  } = useFileStorage()
  
  const localLoading = false
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Sync to Supabase in background
  const syncToSupabase = useCallback(async () => {
    setIsSyncing(true)
    try {
      await syncService.syncFilesToSupabase(localFiles, localFolders)
      console.log('Background sync completed')
    } catch (error) {
      console.error('Background sync failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }, [localFiles, localFolders])

  // Auto-sync when data changes
  useEffect(() => {
    const timer = setTimeout(syncToSupabase, 1000) // 1-second debounce
    return () => clearTimeout(timer)
  }, [syncToSupabase])

  // Wrap all methods to include sync
  const addFiles = useCallback(async (files: DroppedFile[]) => {
    await localAddFiles(files)
    syncToSupabase()
  }, [localAddFiles, syncToSupabase])

  const removeFile = useCallback(async (id: string) => {
    await localRemoveFile(id)
    syncToSupabase()
  }, [localRemoveFile, syncToSupabase])

  const clearAll = useCallback(async () => {
    await localClearAll()
    syncToSupabase()
  }, [localClearAll, syncToSupabase])

  const createFolder = useCallback(async (name: string, color: string) => {
    const folder = await localCreateFolder(name, color)
    syncToSupabase()
    return folder
  }, [localCreateFolder, syncToSupabase])

  const deleteFolder = useCallback(async (id: string) => {
    await localDeleteFolder(id)
    syncToSupabase()
  }, [localDeleteFolder, syncToSupabase])

  const renameFolder = useCallback(async (id: string, name: string) => {
    await localRenameFolder(id, name)
    syncToSupabase()
  }, [localRenameFolder, syncToSupabase])

  const moveFileToFolder = useCallback(async (fileId: string, folderId: string) => {
    await localMoveFileToFolder(fileId, folderId)
    syncToSupabase()
  }, [localMoveFileToFolder, syncToSupabase])

  const moveFileToRoot = useCallback(async (fileId: string) => {
    await localMoveFileToRoot(fileId)
    syncToSupabase()
  }, [localMoveFileToRoot, syncToSupabase])

  return {
    // Data
    files: localFiles,
    folders: localFolders,
    
    // Loading states
    isLoading: localLoading || isSyncing,
    isSyncing,
    
    // File operations
    addFiles,
    removeFile,
    clearAll,
    
    // Folder operations  
    createFolder,
    deleteFolder,
    renameFolder,
    
    // Move operations
    moveFileToFolder,
    moveFileToRoot,
    
    // Sync control
    forceSync: syncToSupabase,
  }
}