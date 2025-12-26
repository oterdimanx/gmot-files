import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Share {
  id: string;
  file_id: string | null;
  folder_id: string | null;
  owner_id: string;
  shared_with_user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
  shared_with_email?: string;
}

interface ShareWithProfile extends Share {
  profiles?: {
    email: string;
    display_name: string | null;
  };
}

export const useFileSharing = () => {
  const { user } = useAuth();
  const [isSharing, setIsSharing] = useState(false);

  const shareWithUser = useCallback(async (
    targetType: 'file' | 'folder',
    targetId: string,
    email: string,
    permission: 'view' | 'edit' = 'view'
  ) => {
    if (!user) return { error: 'Not authenticated' };

    setIsSharing(true);
    try {
      // Find user by email
      const { data: profiles, error: profileError } = await supabase
        .from('gmot.profiles')
        .select('user_id, email')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profiles) {
        return { error: 'User not found. They need to create an account first.' };
      }

      if (profiles.user_id === user.id) {
        return { error: "You can't share with yourself" };
      }

      // Create share
      const shareData = {
        owner_id: user.id,
        shared_with_user_id: profiles.user_id,
        permission,
        ...(targetType === 'file' ? { file_id: targetId } : { folder_id: targetId }),
      };

      const { error: shareError } = await supabase
        .from('file_shares')
        .insert(shareData);

      if (shareError) {
        if (shareError.code === '23505') {
          return { error: 'Already shared with this user' };
        }
        throw shareError;
      }

      toast.success(`Shared with ${email}`);
      return { error: null };
    } catch (error) {
      console.error('Failed to share:', error);
      return { error: 'Failed to share' };
    } finally {
      setIsSharing(false);
    }
  }, [user]);

  const removeShare = useCallback(async (shareId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('file_shares')
        .delete()
        .eq('id', shareId);

      if (error) throw error;
      toast.success('Share removed');
    } catch (error) {
      console.error('Failed to remove share:', error);
      toast.error('Failed to remove share');
    }
  }, [user]);

  const getSharesForItem = useCallback(async (
    targetType: 'file' | 'folder',
    targetId: string
  ): Promise<ShareWithProfile[]> => {
    if (!user) return [];

    try {
      const column = targetType === 'file' ? 'file_id' : 'folder_id';
      const { data, error } = await supabase
        .from('file_shares')
        .select('*')
        .eq(column, targetId);

      if (error) throw error;

      // Fetch profile info for each share
      const sharesWithProfiles = await Promise.all(
        (data || []).map(async (share) => {
          const { data: profile } = await supabase
            .from('gmot-profiles')
            .select('email, display_name')
            .eq('user_id', share.shared_with_user_id)
            .maybeSingle();
          
          return {
            ...share,
            profiles: profile || undefined,
          };
        })
      );

      return sharesWithProfiles as ShareWithProfile[];
    } catch (error) {
      console.error('Failed to get shares:', error);
      return [];
    }
  }, [user]);

  const getSharedWithMe = useCallback(async () => {
    if (!user) return { files: [], folders: [] };

    try {
      // Get shares where current user is the recipient
      const { data: shares, error: sharesError } = await supabase
        .from('file_shares')
        .select('*')
        .eq('shared_with_user_id', user.id);

      if (sharesError) throw sharesError;

      const fileIds = shares?.filter(s => s.file_id).map(s => s.file_id) || [];
      const folderIds = shares?.filter(s => s.folder_id).map(s => s.folder_id) || [];

      // Get shared files
      let sharedFiles: any[] = [];
      if (fileIds.length > 0) {
        const { data: files } = await supabase
          .from('files')
          .select('*')
          .in('id', fileIds);
        sharedFiles = files || [];
      }

      // Get shared folders
      let sharedFolders: any[] = [];
      if (folderIds.length > 0) {
        const { data: folders } = await supabase
          .from('folders')
          .select('*')
          .in('id', folderIds);
        sharedFolders = folders || [];
      }

      return { files: sharedFiles, folders: sharedFolders };
    } catch (error) {
      console.error('Failed to get shared items:', error);
      return { files: [], folders: [] };
    }
  }, [user]);

  return {
    isSharing,
    shareWithUser,
    removeShare,
    getSharesForItem,
    getSharedWithMe,
  };
};
