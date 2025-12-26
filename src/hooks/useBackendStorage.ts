import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DroppedFile, Folder } from '@/types/file';
import { toast } from 'sonner';

interface BackendFile {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  text_content: string | null;
  created_at: string;
}

interface BackendFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export const useBackendStorage = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load files and folders from backend
  const loadData = useCallback(async () => {
    if (!user) {
      setFiles([]);
      setFolders([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Load folders
      const { data: foldersData, error: foldersError } = await supabase
        .from('folders')
        .select('*')
        .order('created_at', { ascending: false });

      if (foldersError) throw foldersError;

      const loadedFolders: Folder[] = (foldersData || []).map((f: BackendFolder) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        createdAt: new Date(f.created_at),
      }));
      setFolders(loadedFolders);

      // Load files
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // Get signed URLs for files
      const loadedFiles: DroppedFile[] = await Promise.all(
        (filesData || []).map(async (f: BackendFile) => {
          let preview: string | undefined;
          
          if (f.type.startsWith('image/')) {
            const { data } = await supabase.storage
              .from('gmot-files')
              .createSignedUrl(f.storage_path, 3600);
            preview = data?.signedUrl;
          }

          // Create a placeholder File object (actual file is in storage)
          const blob = new Blob([], { type: f.type });
          const file = new File([blob], f.name, { type: f.type });

          return {
            id: f.id,
            file,
            name: f.name,
            size: f.size,
            type: f.type,
            preview,
            textContent: f.text_content || undefined,
            folderId: f.folder_id,
          };
        })
      );
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addFiles = useCallback(async (newFiles: DroppedFile[]) => {
    if (!user) return;

    for (const droppedFile of newFiles) {
      try {
        // Upload file to storage
        const storagePath = `${user.id}/${droppedFile.id}-${droppedFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('gmot-files')
          .upload(storagePath, droppedFile.file);

        if (uploadError) throw uploadError;

        // Create file record in database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            id: droppedFile.id,
            user_id: user.id,
            folder_id: droppedFile.folderId || null,
            name: droppedFile.name,
            size: droppedFile.size,
            type: droppedFile.type,
            storage_path: storagePath,
            text_content: droppedFile.textContent || null,
          });

        if (dbError) throw dbError;

        // Add to local state
        setFiles(prev => [droppedFile, ...prev]);
      } catch (error) {
        console.error('Failed to upload file:', error);
        toast.error(`Failed to upload ${droppedFile.name}`);
      }
    }
  }, [user]);

  const removeFile = useCallback(async (id: string) => {
    if (!user) return;

    const file = files.find(f => f.id === id);
    if (!file) return;

    try {
      // Get file record to find storage path
      const { data: fileRecord } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', id)
        .maybeSingle();

      if (fileRecord?.storage_path) {
        // Delete from storage
        await supabase.storage
          .from('gmot-files')
          .remove([fileRecord.storage_path]);
      }

      // Delete from database
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clean up preview URL
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }

      setFiles(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast.error('Failed to delete file');
    }
  }, [user, files]);

  const clearAll = useCallback(async () => {
    if (!user) return;

    try {
      // Get all file storage paths
      const { data: filesData } = await supabase
        .from('files')
        .select('storage_path');

      // Delete all files from storage
      if (filesData && filesData.length > 0) {
        await supabase.storage
          .from('gmot-files')
          .remove(filesData.map(f => f.storage_path));
      }

      // Delete all files from database
      await supabase.from('files').delete().eq('user_id', user.id);

      // Delete all folders
      await supabase.from('folders').delete().eq('user_id', user.id);

      // Delete all shares
      await supabase.from('file_shares').delete().eq('owner_id', user.id);

      // Clean up preview URLs
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });

      setFiles([]);
      setFolders([]);
      toast.success('All files cleared');
    } catch (error) {
      console.error('Failed to clear all:', error);
      toast.error('Failed to clear files');
    }
  }, [user, files]);

  const createFolder = useCallback(async (name: string, color: string) => {
    if (!user) return;

    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      color,
      createdAt: new Date(),
    };

    try {
      const { error } = await supabase
        .from('folders')
        .insert({
          id: newFolder.id,
          user_id: user.id,
          name,
          color,
        });

      if (error) throw error;

      setFolders(prev => [newFolder, ...prev]);
      toast.success(`Folder "${name}" created`);
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast.error('Failed to create folder');
    }
  }, [user]);

  const deleteFolder = useCallback(async (folderId: string) => {
    if (!user) return;

    const folder = folders.find(f => f.id === folderId);

    try {
      // Move files to root first
      await supabase
        .from('files')
        .update({ folder_id: null })
        .eq('folder_id', folderId);

      // Delete folder
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.folderId === folderId ? { ...f, folderId: null } : f
      ));
      setFolders(prev => prev.filter(f => f.id !== folderId));

      if (folder) {
        toast.success(`Folder "${folder.name}" deleted`);
      }
    } catch (error) {
      console.error('Failed to delete folder:', error);
      toast.error('Failed to delete folder');
    }
  }, [user, folders]);

  const renameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;

      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, name: newName } : f
      ));
      toast.success(`Folder renamed to "${newName}"`);
    } catch (error) {
      console.error('Failed to rename folder:', error);
      toast.error('Failed to rename folder');
    }
  }, [user]);

  const moveFileToFolder = useCallback(async (folderId: string, fileId: string) => {
    if (!user) return;

    const folder = folders.find(f => f.id === folderId);

    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, folderId } : f
      ));

      if (folder) {
        toast.success(`File moved to "${folder.name}"`);
      }
    } catch (error) {
      console.error('Failed to move file:', error);
      toast.error('Failed to move file');
    }
  }, [user, folders]);

  const moveFileToRoot = useCallback(async (fileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: null })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, folderId: null } : f
      ));
      toast.success('File moved to root');
    } catch (error) {
      console.error('Failed to move file:', error);
      toast.error('Failed to move file');
    }
  }, [user]);

  // Download file from storage
  const downloadFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    try {
      const { data: fileRecord } = await supabase
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .maybeSingle();

      if (!fileRecord?.storage_path) {
        throw new Error('File not found');
      }

      const { data, error } = await supabase.storage
        .from('gmot-files')
        .download(fileRecord.storage_path);

      if (error) throw error;

      // Create download link
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
  }, [files]);

  return {
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
    downloadFile,
    refresh: loadData,
  };
};
