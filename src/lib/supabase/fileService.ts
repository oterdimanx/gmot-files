import { createClientWithSchema } from '@/lib/supabase/client'
import type { DroppedFile, Folder } from '@/types/file'

const MAX_LOCAL_FILE_SIZE = 5 * 1024 * 1024 // 5MB limit for local storage

export class FileService {
  private supabase = createClientWithSchema()

  // Authentication methods
  async signUp(email: string, password: string, username?: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    })

    if (error) throw error
    if (data.user) {
      // Create user profile in gmot schema
      await this.supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        username: username || data.user.email?.split('@')[0]
      })
    }
    return data
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser()
    return user
  }

  async getSession() {
    const { data: { session } } = await this.supabase.auth.getSession()
    return session
  }

  // Folder operations
  async getFolders(): Promise<Folder[]> {
    const { data, error } = await this.supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data.map(folder => ({
      ...folder,
      createdAt: new Date(folder.created_at),
      updatedAt: new Date(folder.updated_at)
    }))
  }

  async createFolder(name: string, color: string = '#3b82f6'): Promise<Folder> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('folders')
      .insert({
        name,
        color,
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  async updateFolder(id: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>): Promise<Folder> {
    const { data, error } = await this.supabase
      .from('folders')
      .update({
        name: updates.name,
        color: updates.color,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return {
      ...data,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  async deleteFolder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('folders')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // File operations
  async uploadFile(file: File, folderId?: string): Promise<DroppedFile> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    let filePath = ''
    let textContent = ''

    // Read text content if it's a text file
    if (file.type.startsWith('text/')) {
      textContent = await file.text()
    }

    // Store small files locally, larger files in Supabase Storage
    if (file.size <= MAX_LOCAL_FILE_SIZE) {
      // Store locally in public/files folder
      filePath = await this.storeFileLocally(file, user.id)
    } else {
      // Upload to Supabase Storage
      filePath = await this.uploadToSupabaseStorage(file, user.id)
    }

    // Save file metadata to database
    const { data, error } = await this.supabase
      .from('files')
      .insert({
        name: file.name,
        size: file.size,
        type: file.type,
        folder_id: folderId || null,
        user_id: user.id,
        file_path: filePath,
        text_content: textContent
      })
      .select()
      .single()

    if (error) throw error

    // Create preview URL
    let preview = ''
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file)
    }

    return {
      id: data.id,
      file,
      name: data.name,
      size: data.size,
      type: data.type,
      preview,
      textContent: textContent || data.text_content || '',
      folderId: data.folder_id || '',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }

  async getFiles(folderId?: string): Promise<DroppedFile[]> {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    let query = this.supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (folderId) {
      query = query.eq('folder_id', folderId)
    }

    const { data, error } = await query

    if (error) throw error

    // Convert database records to DroppedFile objects
    const files: DroppedFile[] = []
    for (const fileData of data) {
      let file: File
      let preview = ''

      if (fileData.file_path.startsWith('http')) {
        // File is in Supabase Storage
        const { data: blob } = await this.supabase.storage
          .from('gmot-files')
          .download(fileData.file_path)

        if (!blob) continue

        file = new File([blob], fileData.name, { type: fileData.type })
        
        if (fileData.type.startsWith('image/')) {
          preview = URL.createObjectURL(blob)
        }
      } else {
        // File is stored locally
        const response = await fetch(fileData.file_path)
        const blob = await response.blob()
        file = new File([blob], fileData.name, { type: fileData.type })
        
        if (fileData.type.startsWith('image/')) {
          preview = URL.createObjectURL(blob)
        }
      }

      files.push({
        id: fileData.id,
        file,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        preview,
        textContent: fileData.text_content || '',
        folderId: fileData.folder_id || '',
        createdAt: new Date(fileData.created_at),
        updatedAt: new Date(fileData.updated_at)
      })
    }

    return files
  }

  async deleteFile(id: string): Promise<void> {
    // Get file info first to delete from storage if needed
    const { data: fileData } = await this.supabase
      .from('files')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fileData?.file_path) {
      if (fileData.file_path.startsWith('http')) {
        // Delete from Supabase Storage
        const pathParts = fileData.file_path.split('/')
        const fileName = pathParts[pathParts.length - 1]
        const user = await this.getCurrentUser()
        
        await this.supabase.storage
          .from('gmot-files')
          .remove([`${user?.id}/${fileName}`])
      }
      // Local files are just static assets, no need to delete
    }

    // Delete from database
    const { error } = await this.supabase
      .from('files')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  async moveFile(fileId: string, folderId: string | null): Promise<void> {
    const { error } = await this.supabase
      .from('files')
      .update({ folder_id: folderId, updated_at: new Date().toISOString() })
      .eq('id', fileId)

    if (error) throw error
  }

  // Sharing methods
  async shareFile(fileId: string, userEmail: string, permission: 'view' | 'edit' | 'admin' = 'view') {
    // 1. Find user by email
    const { data: users, error: searchError } = await this.supabase
      .from('users')
      .select('id, email')
      .ilike('email', userEmail)
      .limit(1);

    if (searchError || !users?.[0]) {
      throw new Error('User not found');
    }

    const sharedWithUser = users[0];

    // 2. Get current user
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // 3. Check if user owns the file
    const { data: file } = await this.supabase
      .from('files')
      .select('user_id, shared_with')
      .eq('id', fileId)
      .single();

    if (!file || file.user_id !== user.id) {
      throw new Error('You can only share files you own');
    }

    // 4. Add to shared_with array
    const currentShared = file.shared_with || [];
    if (currentShared.includes(sharedWithUser.id)) {
      throw new Error('File is already shared with this user');
    }

    const { error: updateError } = await this.supabase
      .from('files')
      .update({
        shared_with: [...currentShared, sharedWithUser.id],
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (updateError) throw updateError;

    // 5. Create entry in file_shares table
    const { error: shareError } = await this.supabase
      .from('file_shares')
      .insert({
        file_id: fileId,
        owner_id: user.id,
        shared_with_id: sharedWithUser.id,
        permission_level: permission
      });

    if (shareError) throw shareError;

    return { success: true, userId: sharedWithUser.id };
  }

  async removeFileShare(fileId: string, userId: string) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get current shared_with array
    const { data: file } = await this.supabase
      .from('files')
      .select('shared_with, user_id')
      .eq('id', fileId)
      .single();

    if (!file || file.user_id !== user.id) {
      throw new Error('You can only remove shares from files you own');
    }

    // Remove user from array
    const currentShared = file.shared_with || [];
    const newShared = currentShared.filter(id => id !== userId);

    const { error: updateError } = await this.supabase
      .from('files')
      .update({
        shared_with: newShared,
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (updateError) throw updateError;

    // Remove from file_shares table
    const { error: deleteError } = await this.supabase
      .from('file_shares')
      .delete()
      .eq('file_id', fileId)
      .eq('shared_with_id', userId);

    if (deleteError) throw deleteError;

    return { success: true };
  }

async getFileShares(fileId: string) {
  // First, get all shares for this file
  const { data: shares, error } = await this.supabase
    .from('file_shares')
    .select('shared_with_id, permission_level')
    .eq('file_id', fileId);

  if (error) throw error;
  if (!shares || shares.length === 0) return [];

  // Get user emails for each shared_with_id
  const userIds = shares.map(share => share.shared_with_id);
  const { data: users, error: usersError } = await this.supabase
    .from('users')
    .select('id, email')
    .in('id', userIds);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    // Return shares without emails
    return shares.map(share => ({
      id: share.shared_with_id,
      email: 'Unknown',
      permission: share.permission_level
    }));
  }

  // Create a map of user id -> email
  const userMap = new Map();
  (users || []).forEach(user => {
    userMap.set(user.id, user.email);
  });

  // Combine the data
  return shares.map(share => ({
    id: share.shared_with_id,
    email: userMap.get(share.shared_with_id) || 'Unknown',
    permission: share.permission_level
  }));
}

  async getSharedFiles() {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // Get files where user is in shared_with array
    const { data, error } = await this.supabase
      .from('files')
      .select('*')
      .contains('shared_with', [user.id]);

    if (error) throw error;

    // Convert to DroppedFile format
    const files: DroppedFile[] = [];
    for (const fileData of data) {
      // Download file from storage
      let file: File;
      let preview = '';

      if (fileData.file_path.startsWith('http')) {
        const { data: blob } = await this.supabase.storage
          .from('gmot-files')
          .download(fileData.file_path);

        if (blob) {
          file = new File([blob], fileData.name, { type: fileData.type });
          
          if (fileData.type.startsWith('image/')) {
            preview = URL.createObjectURL(blob);
          }
        } else {
          continue; // Skip if can't download
        }
      } else {
        // Handle locally stored files (if any)
        continue;
      }

      files.push({
        id: fileData.id,
        file,
        name: fileData.name,
        size: fileData.size,
        type: fileData.type,
        preview,
        textContent: fileData.text_content || '',
        folderId: fileData.folder_id || '',
        createdAt: new Date(fileData.created_at),
        updatedAt: new Date(fileData.updated_at)
      });
    }

    return files;
  }

  async downloadSharedFile(fileId: string) {
    const { data: file } = await this.supabase
      .from('files')
      .select('file_path, name')
      .eq('id', fileId)
      .single();

    if (!file) throw new Error('File not found');

    const { data: blob, error } = await this.supabase.storage
      .from('gmot-files')
      .download(file.file_path);

    if (error || !blob) throw new Error('Failed to download file');

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async searchUsers(searchTerm: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('id, email')
      .ilike('email', `%${searchTerm}%`)
      .limit(10);

    if (error) throw error;
    return data || [];
  }

public async ensureUserProfile(userId: string, email?: string) {
  try {
    // Check if user exists in gmot.users
    const { data: existingUser, error: checkError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();
    
    // If user doesn't exist, create them
    if (checkError?.code === 'PGRST116' || !existingUser) {
      console.log('Creating user profile for:', userId);
      
      const { error: createError } = await this.supabase
        .from('users')
        .insert({
          id: userId,
          email: email || 'user@example.com',
          username: email?.split('@')[0] || 'user'
        });
      
      if (createError && createError.code !== '23505') { // Ignore duplicate key errors
        console.error('Failed to create user profile:', createError);
        throw createError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
}

  // Private helper methods
private async storeFileLocally(file: File, userId: string): Promise<string> {
  // Check file size before trying localStorage
  if (file.size > 1 * 1024 * 1024) { // 1MB limit for localStorage
    console.log('File too large for localStorage, uploading to Supabase Storage');
    return await this.uploadToSupabaseStorage(file, userId);
  }
  
  try {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomString}_${file.name}`;
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        try {
          const key = `local_file_${userId}_${fileName}`;
          
          // Check if we have enough space
          const data = reader.result as string;
          if (data.length > 4 * 1024 * 1024) { // 4MB safety margin
            console.log('File data too large, using Supabase Storage');
            // Fall back to Supabase Storage
            this.uploadToSupabaseStorage(file, userId)
              .then(resolve)
              .catch(reject);
            return;
          }
          
          localStorage.setItem(key, data);
          resolve(`local:${key}`);
        } catch (error) {
          // If localStorage fails, use Supabase Storage
          console.log('LocalStorage failed, falling back to Supabase:', error.message);
          this.uploadToSupabaseStorage(file, userId)
            .then(resolve)
            .catch(reject);
        }
      };
      
      reader.onerror = () => {
        console.log('FileReader error, using Supabase Storage');
        this.uploadToSupabaseStorage(file, userId)
          .then(resolve)
          .catch(reject);
      };
      
      reader.readAsDataURL(file);
    });
  } catch (error) {
    // Fall back to Supabase Storage on any error
    console.log('storeFileLocally error, using Supabase:', error);
    return await this.uploadToSupabaseStorage(file, userId);
  }
}

  private async uploadToSupabaseStorage(file: File, userId: string): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error } = await this.supabase.storage
      .from('gmot-files')
      .upload(filePath, file)

    if (error) throw error

    // Get public URL
    const { data } = this.supabase.storage
      .from('gmot-files')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  // Clean up local files (call this on logout)
  async cleanupLocalFiles(userId: string): Promise<void> {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`local_file_${userId}_`)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

export const fileService = new FileService()