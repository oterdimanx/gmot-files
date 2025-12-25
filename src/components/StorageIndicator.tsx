import { useEffect, useState } from 'react';
import { HardDrive } from 'lucide-react';
import { getStorageUsage } from '@/lib/storage';
import { formatFileSize } from '@/types/file';
import { Progress } from '@/components/ui/progress';

interface StorageIndicatorProps {
  refreshTrigger?: number;
}

const StorageIndicator = ({ refreshTrigger }: StorageIndicatorProps) => {
  const [usage, setUsage] = useState<{ used: number; quota: number | null }>({ used: 0, quota: null });

  useEffect(() => {
    const fetchUsage = async () => {
      const data = await getStorageUsage();
      setUsage(data);
    };
    fetchUsage();
  }, [refreshTrigger]);

  const percentage = usage.quota ? Math.min((usage.used / usage.quota) * 100, 100) : null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <HardDrive className="w-3.5 h-3.5" />
      <span>{formatFileSize(usage.used)} used</span>
      {percentage !== null && (
        <div className="flex items-center gap-2">
          <Progress value={percentage} className="w-16 h-1.5" />
          <span>{percentage.toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
};

export default StorageIndicator;
