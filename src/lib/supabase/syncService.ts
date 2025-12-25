import { DroppedFile, Folder } from '@/types/file'
import { fileService } from './fileService'

export class SupabaseSyncService {
  // Map to track what's already synced
  private syncedFileIds = new Set<string>()
  private syncedFolderIds = new Set<string>()

  async syncFilesToSupabase(localFiles: DroppedFile[], localFolders: Folder[]) {
    console.log('Syncing:', localFiles.length, 'files,', localFolders.length, 'folders')
    
    try {
      // 1. Sync folders
      for (const folder of localFolders) {
        if (!this.syncedFolderIds.has(folder.id)) {
          try {
            await fileService.createFolder(folder.name, folder.color)
            this.syncedFolderIds.add(folder.id)
            console.log('Synced folder:', folder.name)
          } catch (error) {
            // Folder might already exist in Supabase
            console.log('Folder sync skipped:', folder.name)
          }
        }
      }

      // 2. Sync files
      for (const file of localFiles) {
        if (!this.syncedFileIds.has(file.id)) {
          try {
            await fileService.uploadFile(file.file, file.folderId || undefined)
            this.syncedFileIds.add(file.id)
            console.log('Synced file:', file.name)
          } catch (error) {
            console.log('File sync skipped:', file.name)
          }
        }
      }

      // 3. Clean up deleted items (optional - more advanced)
      // You could track deletions separately
      
    } catch (error) {
      console.error('Sync error:', error)
      throw error
    }
  }

  // Clear sync cache (useful on logout)
  clearCache() {
    this.syncedFileIds.clear()
    this.syncedFolderIds.clear()
  }
}

export const syncService = new SupabaseSyncService()