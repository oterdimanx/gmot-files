import { Folder } from '@/types/file';
import { FolderIcon, Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import CreateFolderDialog from '@/components/CreateFolderDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FolderListProps {
  folders: Folder[];
  selectedFolder: string;
  onSelectFolder: (folderId: string) => void;
  onCreateFolder: (name: string, color: string) => void;
  onDeleteFolder: (folderId: string) => void;
}

export const FolderList: React.FC<FolderListProps> = ({
  folders,
  selectedFolder,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
}) => {
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleEditStart = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditName(folder.name);
  };

  const handleEditSave = (folderId: string) => {
    if (editName.trim()) {
      // You'll need to implement an updateFolder function in your Supabase service
      // For now, we'll just close the edit mode
      setEditingFolderId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Folders</h3>
        <CreateFolderDialog onCreateFolder={onCreateFolder} />
      </div>

      {folders.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <FolderIcon className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No folders yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border transition-all
                ${selectedFolder === folder.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-accent'
                }
              `}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `hsl(${folder.color})` }}
                />
                
                {editingFolderId === folder.id ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleEditSave(folder.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave(folder.id);
                      if (e.key === 'Escape') setEditingFolderId(null);
                    }}
                    className="flex-1 bg-transparent border-b border-primary focus:outline-none text-sm"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => onSelectFolder(folder.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="font-medium text-sm truncate text-foreground">{folder.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(folder.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {editingFolderId !== folder.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditStart(folder)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete folder</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{folder.name}"? This will also remove all files inside it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDeleteFolder(folder.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FolderList;