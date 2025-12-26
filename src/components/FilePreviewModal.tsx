import React, { useState, useEffect, cloneElement } from 'react';
import { X, Download, FileText, FileCode, FileImage, File, FileVideo, FileAudio, FileType, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DroppedFile, getFileCategory, formatFileSize } from '@/types/file';
import { supabase } from '@/integrations/supabase/client';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface FilePreviewModalProps {
  file: DroppedFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (id: string) => void;
}

const FilePreviewModal = ({ file, isOpen, onClose, onDownload }: FilePreviewModalProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!file || !isOpen) {
      setPreviewUrl(null);
      setTextContent(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoading(true);
      try {
        // Get the storage path from the database
        const { data: fileRecord } = await supabase
          .from('gmot-files')
          .select('storage_path')
          .eq('id', file.id)
          .maybeSingle();

        if (!fileRecord?.storage_path) {
          setIsLoading(false);
          return;
        }

        const category = getFileCategory(file.type);

        if (category === 'image') {
          // Get signed URL for image preview
          const { data } = await supabase.storage
            .from('files')
            .createSignedUrl(fileRecord.storage_path, 3600);
          if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
          }
        } else if (category === 'text' || category === 'html' || file.type === 'application/json') {
          // Download and read text content
          const { data, error } = await supabase.storage
            .from('files')
            .download(fileRecord.storage_path);
          
          if (!error && data) {
            const text = await data.text();
            setTextContent(text);
          }
        } else if (category === 'video' || category === 'audio') {
          // Get signed URL for media preview
          const { data } = await supabase.storage
            .from('files')
            .createSignedUrl(fileRecord.storage_path, 3600);
          if (data?.signedUrl) {
            setPreviewUrl(data.signedUrl);
          }
        }
      } catch (error) {
        console.error('Failed to load preview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [file, isOpen]);

  if (!file) return null;

  const category = getFileCategory(file.type);

  const getFileIcon = () => {
    const iconClass = "w-16 h-16";
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

  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (category === 'image' && previewUrl) {
      return (
        <div className="flex items-center justify-center bg-secondary/30 rounded-lg p-4">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
          />
        </div>
      );
    }

    if ((category === 'text' || category === 'html' || file.type === 'application/json') && textContent !== null) {
      return (
        <ScrollArea className="h-[60vh] rounded-lg border bg-secondary/30">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-foreground">
            {textContent}
          </pre>
        </ScrollArea>
      );
    }

    if (category === 'video' && previewUrl) {
      return (
        <div className="flex items-center justify-center bg-secondary/30 rounded-lg p-4">
          <video
            src={previewUrl}
            controls
            className="max-w-full max-h-[60vh] rounded-lg"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    if (category === 'audio' && previewUrl) {
      return (
        <div className="flex flex-col items-center justify-center bg-secondary/30 rounded-lg p-8 gap-4">
          {getFileIcon()}
          <audio src={previewUrl} controls className="w-full max-w-md">
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    }

    // Fallback for unsupported types
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        {getFileIcon()}
        <p>Preview not available for this file type</p>
        {onDownload && (
          <Button onClick={() => onDownload(file.id)} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download to view
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>File Preview: {file.name}</DialogTitle>
          <DialogDescription>Preview of {file.name}</DialogDescription>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              {cloneElement(getFileIcon(), { className: 'w-5 h-5' })}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate" title={file.name}>
                {file.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)} • {category.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button variant="outline" size="sm" onClick={() => onDownload(file.id)}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Preview content */}
        <div className="mt-4">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilePreviewModal;
