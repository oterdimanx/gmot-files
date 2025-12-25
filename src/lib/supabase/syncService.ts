import { DroppedFile, Folder } from '@/types/file'
import { fileService } from './fileService'

export class SupabaseSyncService {
  // Remove the synced sets as the new logic handles duplicates
  // private syncedFileIds = new Set<string>()
  // private syncedFolderIds = new Set<string>()

  async syncFilesToSupabase(localFiles: DroppedFile[], localFolders: Folder[]) {
    console.log('Syncing:', localFiles.length, 'files,', localFolders.length, 'folders')
    
    try {
      // Get current user via fileService
      const user = await fileService.getCurrentUser();
      if (!user) {
        console.log('No user, skipping sync');
        return;
      }

      // 1. Sync folders - USING fileService METHOD
      for (const folder of localFolders) {
        try {
          // Use fileService.getFolders() to check for existing folders
          const allFolders = await fileService.getFolders();
          const folderExists = allFolders.some(f => f.name === folder.name);
          
          if (!folderExists) {
            await fileService.createFolder(folder.name, folder.color);
            console.log('✅ Created folder:', folder.name);
          } else {
            console.log('⏩ Folder already exists:', folder.name);
          }
        } catch (error) {
          console.log('⚠️ Folder sync skipped:', folder.name, (error as Error).message);
        }
      }

      // 2. Sync files - USING fileService METHOD
      for (const file of localFiles) {
        try {
          // Use fileService.getFiles() to check for existing files
          const allFiles = await fileService.getFiles();
          const fileExists = allFiles.some(f => f.name === file.name);
          
          if (!fileExists) {
            await fileService.uploadFile(file.file, file.folderId || undefined);
            console.log('✅ Uploaded file:', file.name);
          } else {
            console.log('⏩ File already exists:', file.name);
          }
        } catch (error) {
          console.log('⚠️ File sync skipped:', file.name, (error as Error).message);
        }
      }

      console.log('✅ Sync completed');
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }

  clearCache() {
    // Nothing to clear in this new approach
  }
}

export const syncService = new SupabaseSyncService()