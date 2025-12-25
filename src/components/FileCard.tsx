import { useState, DragEvent } from 'react';
import { X, FileText, FileCode, FileImage, File, FileVideo, FileAudio, FileType, GripVertical, FolderOutput } from 'lucide-react';
import { DroppedFile, getFileCategory, formatFileSize } from '@/types/file';

interface FileCardProps {
  file: DroppedFile;
  onRemove: (id: string) => void;
  onMoveToRoot?: (id: string) => void;
  index: number;
  draggable?: boolean;
  isInFolder?: boolean;
}

const FileCard = ({ file, onRemove, onMoveToRoot, index, draggable = true, isInFolder = false }: FileCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const category = getFileCategory(file.type);

  const handleDragStart = (e: DragEvent) => {
    e.dataTransfer.setData('application/file-id', file.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const getFileIcon = () => {
    const iconClass = "w-10 h-10";
    switch (category) {
      case 'image':
        return <FileImage className={`${iconClass} text-primary`} />;
      case 'text':
        return <FileText className={`${iconClass} text-primary`} />;
      case 'html':
        return <FileCode className={`${iconClass} text-accent`} />;
      case 'pdf':
        return <FileType className={`${iconClass} text-destructive`} />;
      case 'video':
        return <FileVideo className={`${iconClass} text-primary`} />;
      case 'audio':
        return <FileAudio className={`${iconClass} text-accent`} />;
      default:
        return <File className={`${iconClass} text-muted-foreground`} />;
    }
  };

  const getExtension = (filename: string) => {
    const ext = filename.split('.').pop();
    return ext ? `.${ext}` : '';
  };

  return (
    <div
      className={`animate-drop-in group ${isDragging ? 'opacity-50' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`
        relative bg-card rounded-xl overflow-hidden transition-all duration-300 ease-out
        file-card-shadow hover:file-card-shadow-hover
        ${isHovered ? 'transform -translate-y-1' : ''}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}>
        {/* Drag handle indicator */}
        {draggable && (
          <div className={`
            absolute top-2 left-2 z-20 p-1 rounded
            bg-secondary/80 text-muted-foreground
            transition-all duration-200
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}>
            <GripVertical className="w-3 h-3" />
          </div>
        )}

        {/* Move to root button (when in folder) */}
        {isInFolder && onMoveToRoot && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveToRoot(file.id);
            }}
            className={`
              absolute top-2 left-2 z-20 p-1.5 rounded-full
              bg-primary/90 text-primary-foreground
              transition-all duration-200
              ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
              hover:bg-primary
            `}
            title="Move to root"
          >
            <FolderOutput className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(file.id);
          }}
          className={`
            absolute top-2 right-2 z-20 p-1.5 rounded-full
            bg-foreground/80 text-background
            transition-all duration-200
            ${isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
            hover:bg-destructive
          `}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Preview area */}
        <div className="relative h-36 bg-secondary/50 flex items-center justify-center overflow-hidden">
          {category === 'image' && file.preview ? (
            <img
              src={file.preview}
              alt={file.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              draggable={false}
            />
          ) : category === 'text' || category === 'html' ? (
            <div className="absolute inset-0 p-3 overflow-hidden">
              <pre className="text-[10px] leading-tight text-muted-foreground font-mono whitespace-pre-wrap break-all">
                {file.textContent || 'No preview available'}
              </pre>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-secondary/90" />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {getFileIcon()}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {getExtension(file.name).slice(1) || file.type.split('/')[1] || 'FILE'}
              </span>
            </div>
          )}
        </div>

        {/* File info */}
        <div className="p-3">
          <p className="font-medium text-sm text-card-foreground truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
            <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10">
              {category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
