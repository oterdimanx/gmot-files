import { useState, useCallback, DragEvent } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { DroppedFile } from '@/types/file';

interface DropZoneProps {
  onFilesDropped: (files: DroppedFile[]) => void;
  hasFiles: boolean;
}

const DropZone = ({ onFilesDropped, hasFiles }: DropZoneProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const processFiles = useCallback(async (files: FileList) => {
    const droppedFiles: DroppedFile[] = [];

    for (const file of Array.from(files)) {
      const droppedFile: DroppedFile = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        droppedFile.preview = URL.createObjectURL(file);
      }

      // Read text content for text files
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        try {
          const text = await file.text();
          droppedFile.textContent = text.slice(0, 500);
        } catch {
          droppedFile.textContent = 'Unable to read file content';
        }
      }

      droppedFiles.push(droppedFile);
    }

    onFilesDropped(droppedFiles);
  }, [onFilesDropped]);

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
        ${hasFiles ? 'p-6' : 'p-12 min-h-[280px]'}
        ${isDragActive 
          ? 'border-dropzone-border bg-dropzone-active scale-[1.02]' 
          : 'border-border bg-dropzone-bg hover:border-primary/40 hover:bg-dropzone-active/50'
        }
      `}
    >
      {/* Animated background ring */}
      {isDragActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-primary/20 animate-pulse-ring" />
        </div>
      )}

      <label className="flex flex-col items-center justify-center cursor-pointer relative z-10">
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        <div className={`
          flex flex-col items-center gap-4 transition-all duration-300
          ${isDragActive ? 'scale-110' : ''}
        `}>
          <div className={`
            p-4 rounded-2xl transition-all duration-300
            ${isDragActive 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground'
            }
            ${!hasFiles ? 'animate-float' : ''}
          `}>
            {isDragActive ? (
              <FileUp className="w-8 h-8" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="text-center">
            <p className={`
              font-semibold transition-colors duration-300
              ${isDragActive ? 'text-primary' : 'text-foreground'}
              ${hasFiles ? 'text-base' : 'text-lg'}
            `}>
              {isDragActive ? 'Drop files here' : 'Drag & drop files'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or <span className="text-primary font-medium hover:underline">browse</span> to upload
            </p>
          </div>

          {!hasFiles && (
            <p className="text-xs text-muted-foreground max-w-xs text-center mt-2">
              Supports images, text files, HTML, PDFs, and more
            </p>
          )}
        </div>
      </label>
    </div>
  );
};

export default DropZone;
