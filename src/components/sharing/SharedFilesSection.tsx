import React, { useState, useEffect } from 'react';
import { Users, Download, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fileService } from '@/lib/supabase/fileService';
import { DroppedFile } from '@/types/file';
import { formatFileSize } from '@/types/file';

export const SharedFilesSection: React.FC = () => {
  const [sharedFiles, setSharedFiles] = useState<DroppedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSharedFiles();
  }, []);

  const loadSharedFiles = async () => {
    try {
      const files = await fileService.getSharedFiles();
      setSharedFiles(files);
    } catch (error) {
      console.error('Error loading shared files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: DroppedFile) => {
    try {
      await fileService.downloadSharedFile(file.id);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared with me
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading shared files...</p>
        </CardContent>
      </Card>
    );
  }

  if (sharedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Shared with me
          </CardTitle>
          <CardDescription>
            Files shared with you by other users will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No files have been shared with you yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Shared with me ({sharedFiles.length})
        </CardTitle>
        <CardDescription>
          Files shared with you by other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sharedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-secondary">
                  {file.type.startsWith('image/') ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <Edit className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{file.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      Shared
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};