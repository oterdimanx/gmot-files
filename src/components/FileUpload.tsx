import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) {
      toast.warning('Uploads are currently disabled');
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    setIsUploading(true);
    try {
      // Pass the raw File objects to the parent for upload
      onFilesAdded(droppedFiles);
      toast.success(`Processing ${droppedFiles.length} file(s)...`);
    } catch (error) {
      toast.error('Failed to process dropped files');
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, onFilesAdded]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isUploading) return;
    
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      onFilesAdded(selectedFiles);
      toast.success(`Processing ${selectedFiles.length} file(s)...`);
    } catch (error) {
      toast.error('Failed to process selected files');
    } finally {
      setIsUploading(false);
      // Clear the input
      e.target.value = '';
    }
  }, [disabled, isUploading, onFilesAdded]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
        ${isDragging 
          ? 'border-primary bg-primary/5 scale-[1.02]' 
          : 'border-border bg-card/50 hover:bg-card/80'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex flex-col items-center gap-3">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-secondary'}`}>
          <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {isDragging ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            or <label className="text-primary hover:underline cursor-pointer">
              browse
              <input
                type="file"
                multiple
                onChange={handleFileInput}
                disabled={disabled || isUploading}
                className="hidden"
              />
            </label> to upload
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Supports images, documents, and other file types
          </p>
        </div>
      </div>
      
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;