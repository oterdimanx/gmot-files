import { useState, useEffect } from 'react';
import { Loader2, FileText, Folder as FolderIcon, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DroppedFile, Folder, getFileCategory, formatFileSize } from '@/types/file';
import FilePreviewModal from './FilePreviewModal';
import { toast } from 'sonner';

interface SharedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  text_content: string | null;
  user_id: string;
  folder_id: string | null;
  created_at: string;
  owner_email?: string;
}

interface SharedFolder {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  owner_email?: string;
}

const SharedWithMe = () => {
  const { user } = useAuth();
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<DroppedFile | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<SharedFile[]>([]);

  useEffect(() => {
    if (!user) return;
    loadSharedItems();
  }, [user]);

  const loadSharedItems = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get shares where current user is the recipient
      const { data: shares, error: sharesError } = await supabase
        .from('file_shares')
        .select('*')
        .eq('shared_with_user_id', user.id);

      if (sharesError) throw sharesError;

      const fileIds = shares?.filter(s => s.file_id).map(s => s.file_id) || [];
      const folderIds = shares?.filter(s => s.folder_id).map(s => s.folder_id) || [];

      // Get shared files with owner info
      if (fileIds.length > 0) {
        const { data: files } = await supabase
          .from('files')
          .select('*')
          .in('id', fileIds);

        if (files) {
          // Get owner emails
          const ownerIds = [...new Set(files.map(f => f.user_id))];
          const { data: profiles } = await supabase
            .from('gmot.profiles')
            .select('user_id, email, display_name')
            .in('user_id', ownerIds);

          const filesWithOwners = files.map(f => ({
            ...f,
            owner_email: profiles?.find(p => p.user_id === f.user_id)?.email || 'Unknown',
          }));
          setSharedFiles(filesWithOwners);
        }
      } else {
        setSharedFiles([]);
      }

      // Get shared folders with owner info
      if (folderIds.length > 0) {
        const { data: folders } = await supabase
          .from('folders')
          .select('*')
          .in('id', folderIds);

        if (folders) {
          const ownerIds = [...new Set(folders.map(f => f.user_id))];
          const { data: profiles } = await supabase
            .from('gmot.profiles')
            .select('user_id, email, display_name')
            .in('user_id', ownerIds);

          const foldersWithOwners = folders.map(f => ({
            ...f,
            owner_email: profiles?.find(p => p.user_id === f.user_id)?.email || 'Unknown',
          }));
          setSharedFolders(foldersWithOwners);
        }
      } else {
        setSharedFolders([]);
      }
    } catch (error) {
      console.error('Failed to load shared items:', error);
      toast.error('Failed to load shared items');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolderFiles = async (folderId: string) => {
    try {
      const { data: files } = await supabase
        .from('files')
        .select('*')
        .eq('folder_id', folderId);

      if (files) {
        const ownerIds = [...new Set(files.map(f => f.user_id))];
        const { data: profiles } = await supabase
          .from('gmot.profiles')
          .select('user_id, email')
          .in('user_id', ownerIds);

        const filesWithOwners = files.map(f => ({
          ...f,
          owner_email: profiles?.find(p => p.user_id === f.user_id)?.email || 'Unknown',
        }));
        setFolderFiles(filesWithOwners);
      }
    } catch (error) {
      console.error('Failed to load folder files:', error);
    }
  };

  const handleFolderClick = (folderId: string) => {
    if (expandedFolder === folderId) {
      setExpandedFolder(null);
      setFolderFiles([]);
    } else {
      setExpandedFolder(folderId);
      loadFolderFiles(folderId);
    }
  };

  const handlePreview = (file: SharedFile) => {
    const droppedFile: DroppedFile = {
      id: file.id,
      file: new File([], file.name, { type: file.type }),
      name: file.name,
      size: file.size,
      type: file.type,
      textContent: file.text_content || undefined,
    };
    setPreviewFile(droppedFile);
  };

  const handleDownload = async (fileId: string) => {
    const file = [...sharedFiles, ...folderFiles].find(f => f.id === fileId);
    if (!file) return;

    try {
      const { data, error } = await supabase.storage
        .from('gmot-files')
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      toast.error('Failed to download file');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const hasItems = sharedFiles.length > 0 || sharedFolders.length > 0;

  if (!hasItems) {
    return (
      <div className="text-center py-12">
        <div className="p-4 rounded-full bg-secondary/50 w-fit mx-auto mb-4">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">
          No files or folders have been shared with you yet
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          When someone shares a file with you, it will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shared Folders */}
      {sharedFolders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Shared Folders</h3>
          <div className="space-y-2">
            {sharedFolders.map((folder) => (
              <div key={folder.id}>
                <div
                  onClick={() => handleFolderClick(folder.id)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `hsl(${folder.color} / 0.15)` }}
                  >
                    <FolderIcon 
                      className="w-5 h-5" 
                      style={{ color: `hsl(${folder.color})` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Shared by {folder.owner_email}
                    </p>
                  </div>
                </div>
                
                {/* Expanded folder files */}
                {expandedFolder === folder.id && (
                  <div className="ml-6 mt-2 space-y-1 border-l-2 border-border pl-4">
                    {folderFiles.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Folder is empty</p>
                    ) : (
                      folderFiles.map((file) => (
                        <div
                          key={file.id}
                          onClick={() => handlePreview(file)}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Files */}
      {sharedFiles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Shared Files</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sharedFiles.map((file) => {
              const category = getFileCategory(file.type);
              return (
                <div
                  key={file.id}
                  onClick={() => handlePreview(file)}
                  className="flex items-center gap-3 p-3 rounded-lg bg-card hover:bg-secondary/50 cursor-pointer transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • Shared by {file.owner_email}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10">
                    {category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default SharedWithMe;
