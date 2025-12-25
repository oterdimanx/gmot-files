import { DroppedFile, Folder } from '@/types/file';
import FileCard from './FileCard';
import FolderCard from './FolderCard';
import { ShareFileDialog } from '@/components/sharing/ShareFileDialog';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

interface FileGridProps {
  files: DroppedFile[];
  folders: Folder[];
  onRemoveFile: (id: string) => void;
  onOpenFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onMoveFileToFolder: (folderId: string, fileId: string) => void;
  onMoveFileToRoot: (fileId: string) => void;
  currentFolderId?: string | null;
}

const FileGrid = ({ 
  files, 
  folders,
  onRemoveFile, 
  onOpenFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveFileToFolder,
  onMoveFileToRoot,
  currentFolderId 
}: FileGridProps) => {
  // Filter files - show only files in current folder (or root if currentFolderId is null)
  const visibleFiles = files.filter(f => 
    currentFolderId ? f.folderId === currentFolderId : !f.folderId
  );

  // Only show folders at root level
  const showFolders = !currentFolderId;

  if (visibleFiles.length === 0 && (!showFolders || folders.length === 0)) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {/* Render folders first (only at root) */}
      {showFolders && folders.map((folder, index) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          fileCount={files.filter(f => f.folderId === folder.id).length}
          onOpen={onOpenFolder}
          onDelete={onDeleteFolder}
          onRename={onRenameFolder}
          onFileDrop={onMoveFileToFolder}
          index={index}
        />
      ))}
      
      {/* Render files */}
      {visibleFiles.map((file, index) => (
        <div key={file.id} className="relative group">
          <FileCard
            file={file}
            onRemove={onRemoveFile}
            onMoveToRoot={currentFolderId ? onMoveFileToRoot : undefined}
            index={showFolders ? folders.length + index : index}
            draggable={!currentFolderId}
            isInFolder={!!currentFolderId}
          />
          
          {/* Share button overlay - appears on hover */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ShareFileDialog fileId={file.id} fileName={file.name}>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </ShareFileDialog>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileGrid;