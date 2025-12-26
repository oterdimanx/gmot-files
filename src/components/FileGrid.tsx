import { useState } from 'react';
import { DroppedFile, Folder } from '@/types/file';
import FileCard from './FileCard';
import FolderCard from './FolderCard';
import FilePreviewModal from './FilePreviewModal';

interface FileGridProps {
  files: DroppedFile[];
  folders: Folder[];
  onRemoveFile: (id: string) => void;
  onOpenFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onMoveFileToFolder: (folderId: string, fileId: string) => void;
  onMoveFileToRoot: (fileId: string) => void;
  onDownloadFile?: (id: string) => void;
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
  onDownloadFile,
  currentFolderId 
}: FileGridProps) => {
  const [previewFile, setPreviewFile] = useState<DroppedFile | null>(null);

  const visibleFiles = files.filter(f => 
    currentFolderId ? f.folderId === currentFolderId : !f.folderId
  );
  const showFolders = !currentFolderId;

  if (visibleFiles.length === 0 && (!showFolders || folders.length === 0)) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
        {visibleFiles.map((file, index) => (
          <FileCard
            key={file.id}
            file={file}
            onRemove={onRemoveFile}
            onMoveToRoot={currentFolderId ? onMoveFileToRoot : undefined}
            onDownload={onDownloadFile}
            onPreview={() => setPreviewFile(file)}
            index={showFolders ? folders.length + index : index}
            draggable={!currentFolderId}
            isInFolder={!!currentFolderId}
          />
        ))}
      </div>

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={onDownloadFile}
      />
    </>
  );
};

export default FileGrid;
