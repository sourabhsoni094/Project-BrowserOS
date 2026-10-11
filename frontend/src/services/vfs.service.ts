import { api } from './api';
import { VfsNode, DirectoryResponse, StorageStats, VfsNodeType } from '../types/vfs.types';

export const vfsService = {
  async listDirectory(parentId?: string | null): Promise<DirectoryResponse> {
    const url = parentId ? `/files?parentId=${parentId}` : '/files';
    const res = await api.get<{ success: boolean; data: DirectoryResponse }>(url);
    return res.data;
  },

  async getDesktopNodes(): Promise<VfsNode[]> {
    const res = await api.get<{ success: boolean; data: VfsNode[] }>('/files/desktop');
    return res.data;
  },

  async getTrashNodes(): Promise<VfsNode[]> {
    const res = await api.get<{ success: boolean; data: VfsNode[] }>('/files/trash');
    return res.data;
  },

  async getNode(id: string): Promise<VfsNode> {
    const res = await api.get<{ success: boolean; data: VfsNode }>(`/files/${id}`);
    return res.data;
  },

  async createNode(
    name: string,
    type: VfsNodeType,
    parentId?: string | null,
    content?: string
  ): Promise<VfsNode> {
    const res = await api.post<{ success: boolean; data: VfsNode }>('/files', {
      name,
      type,
      parentId: parentId || null,
      content,
    });
    return res.data;
  },

  async uploadFile(file: File, parentId?: string | null): Promise<VfsNode> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const content = reader.result as string;
          const res = await api.post<{ success: boolean; data: VfsNode }>('/files/upload', {
            name: file.name,
            parentId: parentId || null,
            content,
            mimeType: file.type || 'text/plain',
          });
          resolve(res.data);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file from host.'));

      // If it's a text/code file read as text, otherwise read as data URL
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.ts') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.json') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.css')
      ) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  },

  downloadToHost(node: VfsNode): void {
    if (node.type !== 'FILE') return;

    const content = node.content || '';
    let blob: Blob;

    if (content.startsWith('data:')) {
      // Decode base64 data URL
      const parts = content.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      blob = new Blob([uInt8Array], { type: contentType });
    } else {
      blob = new Blob([content], { type: node.mimeType || 'text/plain' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = node.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async updateNode(
    id: string,
    updates: { name?: string; content?: string; parentId?: string | null }
  ): Promise<VfsNode> {
    const res = await api.patch<{ success: boolean; data: VfsNode }>(`/files/${id}`, updates);
    return res.data;
  },

  async moveToTrash(id: string): Promise<VfsNode> {
    const res = await api.post<{ success: boolean; data: VfsNode }>(`/files/${id}/trash`);
    return res.data;
  },

  async restoreFromTrash(id: string): Promise<VfsNode> {
    const res = await api.post<{ success: boolean; data: VfsNode }>(`/files/${id}/restore`);
    return res.data;
  },

  async duplicateNode(id: string): Promise<VfsNode> {
    const res = await api.post<{ success: boolean; data: VfsNode }>(`/files/${id}/copy`);
    return res.data;
  },

  async deletePermanently(id: string): Promise<void> {
    await api.delete(`/files/${id}`);
  },

  async emptyTrash(): Promise<void> {
    await api.delete('/files/trash');
  },

  async searchNodes(query: string): Promise<VfsNode[]> {
    const res = await api.get<{ success: boolean; data: VfsNode[] }>(
      `/files/search?q=${encodeURIComponent(query)}`
    );
    return res.data;
  },

  async getStorage(): Promise<StorageStats> {
    const res = await api.get<{ success: boolean; data: StorageStats }>('/files/storage');
    return res.data;
  },
};
