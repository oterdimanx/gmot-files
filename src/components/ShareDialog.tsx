import { useState, useEffect } from 'react';
import { Share2, X, Loader2, Mail, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFileSharing } from '@/hooks/useFileSharing';
import { z } from 'zod';

interface ShareDialogProps {
  targetType: 'file' | 'folder';
  targetId: string;
  targetName: string;
}

interface ShareWithProfile {
  id: string;
  permission: 'view' | 'edit';
  profiles?: {
    email: string;
    display_name: string | null;
  };
}

const emailSchema = z.string().email('Please enter a valid email');

const ShareDialog = ({ targetType, targetId, targetName }: ShareDialogProps) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [error, setError] = useState('');
  const [shares, setShares] = useState<ShareWithProfile[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  
  const { isSharing, shareWithUser, removeShare, getSharesForItem } = useFileSharing();

  useEffect(() => {
    if (open) {
      loadShares();
    }
  }, [open, targetId]);

  const loadShares = async () => {
    setLoadingShares(true);
    const data = await getSharesForItem(targetType, targetId);
    setShares(data as ShareWithProfile[]);
    setLoadingShares(false);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    const result = await shareWithUser(targetType, targetId, email, permission);
    if (result.error) {
      setError(result.error);
    } else {
      setEmail('');
      loadShares();
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    await removeShare(shareId);
    loadShares();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{targetName}"</DialogTitle>
          <DialogDescription>
            Invite others to access this {targetType}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleShare} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="share-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="share-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="w-28 space-y-2">
              <Label>Permission</Label>
              <Select value={permission} onValueChange={(v) => setPermission(v as 'view' | 'edit')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <Button type="submit" disabled={isSharing} className="w-full">
            {isSharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
            Share
          </Button>
        </form>
        
        {/* Current shares */}
        <div className="mt-6">
          <Label className="text-sm text-muted-foreground">Shared with</Label>
          
          {loadingShares ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : shares.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Not shared with anyone yet
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {share.profiles?.display_name || share.profiles?.email}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {share.permission} access
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveShare(share.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
