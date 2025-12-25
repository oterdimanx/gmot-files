import { DroppedFile, Folder, formatFileSize } from '@/types/file';
import { FileText, Image, FolderIcon, MoreVertical, Move, Trash2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';

interface FileListProps {
  files: DroppedFile[];
  folders: Folder[];
  onFileDelete: (id: string) => void;
  onFileMove: (fileId: string, folderId: string | null) => void;
}

export const FileList: React.FC<FileListProps> = ({ files, folders, onFileDelete, onFileMove }) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Clean up preview URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview && file.preview.startsWith('blob:')) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('text/')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const handleMoveToFolder = (fileId: string, folderId: string | null) => {
    onFileMove(fileId, folderId);
    setSelectedFileId(null);
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border rounded-lg">
        <p className="text-muted-foreground">No files yet. Upload some files to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="group border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all bg-card"
          >
            {/* File header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-secondary">
                  {getFileIcon(file.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedFileId(file.id);
                    }}
                  >
                    <Move className="w-4 h-4 mr-2" />
                    Move to folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onFileDelete(file.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* File preview/thumbnail */}
            {file.preview && file.type.startsWith('image/') ? (
              <div className="aspect-square rounded-md overflow-hidden mb-3 bg-secondary/30">
                <img
                  src={file.preview}
                  alt={file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="aspect-square rounded-md overflow-hidden mb-3 bg-secondary/30 flex items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground/50" />
              </div>
            )}

            {/* Move to folder selector (appears when clicked) */}
            {selectedFileId === file.id && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs font-medium mb-2 text-foreground">Move to:</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMoveToFolder(file.id, null)}
                    className="text-xs h-7"
                  >
                    <FolderIcon className="w-3 h-3 mr-1" />
                    Root
                  </Button>
                  {folders.map((folder) => (
                    <Button
                      key={folder.id}
                      size="sm"
                      variant="outline"
                      onClick={() => handleMoveToFolder(file.id, folder.id)}
                      className="text-xs h-7"
                    >
                      <div
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: `hsl(${folder.color})` }}
                      />
                      {folder.name}
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedFileId(null)}
                  className="w-full mt-2 text-xs h-7"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* File info footer */}
            <div className="text-xs text-muted-foreground flex justify-between items-center">
              <span className="truncate">{file.type}</span>
              <span>{new Date(file.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileList;