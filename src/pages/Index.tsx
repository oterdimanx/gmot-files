import { useState, useCallback } from 'react';
import { Layers, Trash2, ChevronLeft, Home, Loader2 } from 'lucide-react';
import DropZone from '@/components/DropZone';
import FileGrid from '@/components/FileGrid';
import CreateFolderDialog from '@/components/CreateFolderDialog';
import StorageIndicator from '@/components/StorageIndicator';
import { DroppedFile, formatFileSize } from '@/types/file';
import { Button } from '@/components/ui/button';
import { useFileStorage } from '@/hooks/useFileStorage';

const Index = () => {
  const {
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
  } = useFileStorage();

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);

  const handleFilesDropped = useCallback((newFiles: DroppedFile[]) => {
    // Add files to current folder if we're inside one
    const filesWithFolder = newFiles.map(f => ({
      ...f,
      folderId: currentFolderId,
    }));
    addFiles(filesWithFolder);
  }, [currentFolderId, addFiles]);

  const handleClearAll = useCallback(() => {
    clearAll();
    setCurrentFolderId(null);
  }, [clearAll]);

  const handleOpenFolder = useCallback((folderId: string) => {
    setCurrentFolderId(folderId);
  }, []);

  const handleDeleteFolder = useCallback((folderId: string) => {
    deleteFolder(folderId);
    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
    }
  }, [deleteFolder, currentFolderId]);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(null);
  }, []);

  // Calculate visible files count
  const visibleFiles = files.filter(f => 
    currentFolderId ? f.folderId === currentFolderId : !f.folderId
  );
  const totalSize = visibleFiles.reduce((acc, file) => acc + file.size, 0);
  const totalItems = currentFolderId 
    ? visibleFiles.length 
    : folders.length + visibleFiles.length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">FileHub</h1>
                <p className="text-xs text-muted-foreground">Drop, preview, organize</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!currentFolderId && <CreateFolderDialog onCreateFolder={createFolder} />}
              
              {(files.length > 0 || folders.length > 0) && (
                <>
                  <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{totalItems}</span> items
                    {totalSize > 0 && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{formatFileSize(totalSize)}</span>
                      </>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear all
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb when inside folder */}
      {currentFolderId && currentFolder && (
        <div className="border-b border-border/30 bg-secondary/30">
          <div className="container max-w-6xl mx-auto px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoBack}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                <Home className="w-4 h-4" />
              </Button>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: `hsl(${currentFolder.color})` }}
                />
                <span className="font-medium text-foreground">{currentFolder.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Drop zone */}
          <DropZone onFilesDropped={handleFilesDropped} hasFiles={totalItems > 0} />

          {/* File grid */}
          {totalItems > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {currentFolderId ? 'Files in folder' : 'Your files'}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({visibleFiles.length}{!currentFolderId && folders.length > 0 ? ` + ${folders.length} folders` : ''})
                </span>
              </div>
              <FileGrid 
                files={files} 
                folders={folders}
                onRemoveFile={removeFile}
                onOpenFolder={handleOpenFolder}
                onDeleteFolder={handleDeleteFolder}
                onRenameFolder={renameFolder}
                onMoveFileToFolder={moveFileToFolder}
                onMoveFileToRoot={moveFileToRoot}
                currentFolderId={currentFolderId}
              />
            </div>
          )}

          {/* Empty state message */}
          {totalItems === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {currentFolderId 
                  ? 'This folder is empty. Drop files here to add them.'
                  : 'Your dropped files will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-auto">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Files are saved locally in your browser
            </p>
            <StorageIndicator refreshTrigger={files.length + folders.length} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
