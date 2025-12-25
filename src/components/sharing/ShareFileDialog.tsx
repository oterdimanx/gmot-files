import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, X, Search, Send } from 'lucide-react';
import { fileService } from '@/lib/supabase/fileService';
import { toast } from 'sonner';

interface ShareFileDialogProps {
  fileId: string;
  fileName: string;
  children: React.ReactNode;
  onShareSuccess?: () => void;
}

export const ShareFileDialog: React.FC<ShareFileDialogProps> = ({
  fileId,
  fileName,
  children,
  onShareSuccess,
}) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit' | 'admin'>('view');
  const [sharedWith, setSharedWith] = useState<Array<{ id: string; email: string; permission: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string }>>([]);

  useEffect(() => {
    if (open) {
      loadSharedUsers();
    }
  }, [open]);

  const loadSharedUsers = async () => {
    try {
      const shared = await fileService.getFileShares(fileId);
      setSharedWith(shared);
    } catch (error) {
      console.error('Error loading shared users:', error);
    }
  };

  const searchUsers = async (searchEmail: string) => {
    if (!searchEmail.includes('@')) return;
    
    try {
      const users = await fileService.searchUsers(searchEmail);
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleShare = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await fileService.shareFile(fileId, email, permission);
      toast.success(`File shared with ${email}`);
      setEmail('');
      loadSharedUsers();
      onShareSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    try {
      await fileService.removeFileShare(fileId, userId);
      toast.success('Access removed');
      loadSharedUsers();
    } catch (error) {
      toast.error('Failed to remove access');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share "{fileName}"</DialogTitle>
          <DialogDescription>
            Share this file with other users. They'll be able to access it based on the permissions you set.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current shares */}
          {sharedWith.length > 0 && (
            <div className="space-y-2">
              <Label>Shared with</Label>
              <div className="flex flex-wrap gap-2">
                {sharedWith.map((user) => (
                  <Badge key={user.id} variant="secondary" className="gap-2">
                    <User className="w-3 h-3" />
                    {user.email}
                    <span className="text-xs opacity-75">({user.permission})</span>
                    <button
                      onClick={() => handleRemoveShare(user.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Share form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">User email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    searchUsers(e.target.value);
                  }}
                />
                <Button type="button" onClick={handleShare} disabled={isLoading}>
                  <Send className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
              
              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-accent rounded cursor-pointer"
                      onClick={() => setEmail(user.email)}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setEmail(user.email)}>
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Permission selection */}
            <div className="space-y-2">
              <Label>Permission level</Label>
              <div className="flex gap-2">
                {(['view', 'edit', 'admin'] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={permission === level ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPermission(level)}
                    className="capitalize"
                  >
                    {level}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {permission === 'view' && 'Can view file only'}
                {permission === 'edit' && 'Can view and edit file'}
                {permission === 'admin' && 'Can view, edit, and share with others'}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};