export type VfsNodeType = 'FILE' | 'FOLDER';

export interface VfsNode {
  id: string;
  name: string;
  type: VfsNodeType;
  size: number;
  mimeType?: string | null;
  content?: string | null;
  parentId?: string | null;
  userId: string;
  isTrash: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface DirectoryResponse {
  currentFolder: VfsNode | null;
  breadcrumbs: BreadcrumbItem[];
  items: VfsNode[];
}

export interface StorageStats {
  totalBytes: number;
  fileCount: number;
  folderCount: number;
  trashBytes: number;
  limitBytes: number;
}
