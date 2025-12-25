export interface DroppedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  textContent?: string;
  folderId?: string | null;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

export type FileCategory = 'image' | 'text' | 'html' | 'pdf' | 'video' | 'audio' | 'other';

export const getFileCategory = (type: string): FileCategory => {
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('text/') || type === 'application/json') return 'text';
  if (type === 'text/html' || type.includes('html')) return 'html';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  return 'other';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const FOLDER_COLORS = [
  { name: 'Blue', value: '220 90% 56%' },
  { name: 'Purple', value: '260 80% 60%' },
  { name: 'Green', value: '142 70% 45%' },
  { name: 'Orange', value: '25 95% 53%' },
  { name: 'Pink', value: '330 80% 60%' },
  { name: 'Teal', value: '180 70% 45%' },
];
