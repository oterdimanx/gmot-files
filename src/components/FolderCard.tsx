import { useState, DragEvent, useRef, useEffect } from 'react';
import { Folder as FolderIcon, ChevronRight, X, MoreHorizontal } from 'lucide-react';
import { Folder, DroppedFile } from '@/types/file';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderCardProps {
  folder: Folder;
  fileCount: number;
  onOpen: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onFileDrop: (folderId: string, fileId: string) => void;
  index: number;
}

const FolderCard = ({ folder, fileCount, onOpen, onDelete, onRename, onFileDrop, index }: FolderCardProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(folder.name);
    setIsEditing(true);
  };

  const handleSubmitRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(folder.name);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/file-id')) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const fileId = e.dataTransfer.getData('application/file-id');
    if (fileId) {
      onFileDrop(folder.id, fileId);
    }
  };

  return (
    <div
      className="animate-drop-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        onClick={() => !isEditing && onOpen(folder.id)}
        onDoubleClick={handleDoubleClick}
        className={`
          relative bg-card rounded-xl overflow-hidden transition-all duration-300 ease-out cursor-pointer
          file-card-shadow hover:file-card-shadow-hover hover:-translate-y-1
          ${isDragOver ? 'ring-2 ring-primary scale-105' : ''}
        `}
      >
        {/* Folder header with color */}
        <div 
          className="h-3 w-full"
          style={{ backgroundColor: `hsl(${folder.color})` }}
        />

        {/* Delete/options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.stopPropagation()}
            className="absolute top-5 right-2 z-20 p-1.5 rounded-full bg-secondary/80 hover:bg-secondary transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder.id);
              }}
              className="text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Delete folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Folder content */}
        <div className="p-4 pt-3">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: `hsl(${folder.color} / 0.15)` }}
            >
              <FolderIcon 
                className="w-6 h-6" 
                style={{ color: `hsl(${folder.color})` }}
              />
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleSubmitRename}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className="font-medium text-sm text-card-foreground bg-transparent border-b border-primary outline-none w-full"
                />
              ) : (
                <p className="font-medium text-sm text-card-foreground truncate">
                  {folder.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {fileCount} {fileCount === 1 ? 'file' : 'files'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderCard;
