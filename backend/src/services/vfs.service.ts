import { prisma } from '../config/db.js';
import { AppError } from '../middleware/error.middleware.js';

export interface CreateNodeDTO {
  name: string;
  type: 'FILE' | 'FOLDER';
  parentId?: string | null;
  content?: string;
  mimeType?: string;
}

export interface UpdateNodeDTO {
  name?: string;
  parentId?: string | null;
  content?: string;
}

export class VfsService {
  /**
   * Initializes standard home folder structure for a user if not present
   */
  async ensureUserHome(userId: string, username: string) {
    const existingHome = await prisma.vfsNode.findFirst({
      where: {
        userId,
        parentId: null,
        name: 'home',
        isTrash: false,
      },
    });

    if (existingHome) {
      return existingHome;
    }

    // Create /home
    const home = await prisma.vfsNode.create({
      data: {
        name: 'home',
        type: 'FOLDER',
        userId,
        parentId: null,
      },
    });

    // Create /home/{username}
    const userFolder = await prisma.vfsNode.create({
      data: {
        name: username,
        type: 'FOLDER',
        userId,
        parentId: home.id,
      },
    });

    // Create Desktop folder (synced with desktop surface)
    const desktop = await prisma.vfsNode.create({
      data: {
        name: 'Desktop',
        type: 'FOLDER',
        userId,
        parentId: userFolder.id,
      },
    });

    // Create Documents, Downloads, Projects
    const documents = await prisma.vfsNode.create({
      data: {
        name: 'Documents',
        type: 'FOLDER',
        userId,
        parentId: userFolder.id,
      },
    });

    await prisma.vfsNode.create({
      data: {
        name: 'Downloads',
        type: 'FOLDER',
        userId,
        parentId: userFolder.id,
      },
    });

    const projects = await prisma.vfsNode.create({
      data: {
        name: 'Projects',
        type: 'FOLDER',
        userId,
        parentId: userFolder.id,
      },
    });

    // Create starter files
    const welcomeText = `Welcome to BrowserOS!

This file is stored in your PostgreSQL virtual filesystem and synced in real-time with your desktop wallpaper.

Features:
- Full folder hierarchy
- File upload and download to your real PC
- Recycle Bin / Trash with restore support
- Instant desktop sync
`;
    await prisma.vfsNode.create({
      data: {
        name: 'welcome.txt',
        type: 'FILE',
        mimeType: 'text/plain',
        size: Buffer.byteLength(welcomeText, 'utf8'),
        content: welcomeText,
        userId,
        parentId: desktop.id,
      },
    });

    const guideText = `# BrowserOS Guide

BrowserOS provides a browser-based operating system desktop environment.

### Storage
Your virtual files are stored safely in PostgreSQL. You can upload files from your local computer or download virtual files to your host machine anytime.
`;
    await prisma.vfsNode.create({
      data: {
        name: 'guide.md',
        type: 'FILE',
        mimeType: 'text/markdown',
        size: Buffer.byteLength(guideText, 'utf8'),
        content: guideText,
        userId,
        parentId: documents.id,
      },
    });

    const sampleCode = `// Sample TypeScript file in BrowserOS
export function greet(name: string): string {
  return \`Hello, \${name}! Welcome to BrowserOS.\`;
}

console.log(greet('User'));
`;
    await prisma.vfsNode.create({
      data: {
        name: 'index.ts',
        type: 'FILE',
        mimeType: 'text/typescript',
        size: Buffer.byteLength(sampleCode, 'utf8'),
        content: sampleCode,
        userId,
        parentId: projects.id,
      },
    });

    return userFolder;
  }

  /**
   * Retrieves nodes in a directory with breadcrumbs trail
   */
  async getDirectoryContents(userId: string, parentId?: string | null) {
    let resolvedParentId = parentId;

    // If no parent specified, resolve to user's home folder
    if (!resolvedParentId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const homeNode = await this.ensureUserHome(userId, user.username);
        resolvedParentId = homeNode.id;
      }
    }

    const items = await prisma.vfsNode.findMany({
      where: {
        userId,
        parentId: resolvedParentId,
        isTrash: false,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }],
    });

    // Build breadcrumbs
    const breadcrumbs: { id: string; name: string }[] = [];
    let currentId: string | null = resolvedParentId || null;

    while (currentId) {
      const node = await prisma.vfsNode.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
      if (!node) break;
      breadcrumbs.unshift({ id: node.id, name: node.name });
      currentId = node.parentId;
    }

    // Current folder metadata
    let currentFolder = null;
    if (resolvedParentId) {
      currentFolder = await prisma.vfsNode.findUnique({
        where: { id: resolvedParentId },
      });
    }

    return {
      currentFolder,
      breadcrumbs,
      items,
    };
  }

  /**
   * Retrieves directory contents (alias for getDirectoryContents)
   */
  async listDirectory(userId: string, parentId?: string | null) {
    return this.getDirectoryContents(userId, parentId);
  }

  /**
   * Retrieves child files/folders of the user's Desktop directory
   */
  async getDesktopNodes(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    await this.ensureUserHome(userId, user.username);

    const desktopFolder = await prisma.vfsNode.findFirst({
      where: {
        userId,
        name: 'Desktop',
        type: 'FOLDER',
        isTrash: false,
      },
    });

    if (!desktopFolder) return [];

    return prisma.vfsNode.findMany({
      where: {
        userId,
        parentId: desktopFolder.id,
        isTrash: false,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }],
    });
  }

  /**
   * Returns all items currently in the Trash
   */
  async getTrashNodes(userId: string) {
    return prisma.vfsNode.findMany({
      where: {
        userId,
        isTrash: true,
      },
      orderBy: { trashedAt: 'desc' },
    });
  }

  /**
   * Returns single node by ID with content
   */
  async getNodeById(userId: string, nodeId: string) {
    const node = await prisma.vfsNode.findFirst({
      where: { id: nodeId, userId },
    });

    if (!node) {
      throw new AppError('File or directory not found', 404);
    }

    return node;
  }

  /**
   * Creates a new file or folder
   */
  async createNode(userId: string, dto: CreateNodeDTO) {
    const existing = await prisma.vfsNode.findFirst({
      where: {
        userId,
        parentId: dto.parentId || null,
        name: dto.name.trim(),
        isTrash: false,
      },
    });

    if (existing) {
      throw new AppError(`An item named "${dto.name}" already exists in this folder`, 409);
    }

    const content = dto.content || '';
    const size = dto.type === 'FILE' ? Buffer.byteLength(content, 'utf8') : 0;

    return prisma.vfsNode.create({
      data: {
        name: dto.name.trim(),
        type: dto.type,
        parentId: dto.parentId || null,
        userId,
        content: dto.type === 'FILE' ? content : null,
        mimeType: dto.mimeType || (dto.type === 'FOLDER' ? 'folder' : 'text/plain'),
        size,
      },
    });
  }

  /**
   * Renames, moves, or updates file content
   */
  async updateNode(userId: string, nodeId: string, dto: UpdateNodeDTO) {
    const node = await this.getNodeById(userId, nodeId);

    // If renaming or moving, check for conflicts
    if (dto.name || dto.parentId !== undefined) {
      const targetName = dto.name ? dto.name.trim() : node.name;
      const targetParentId = dto.parentId !== undefined ? dto.parentId : node.parentId;

      const conflict = await prisma.vfsNode.findFirst({
        where: {
          userId,
          parentId: targetParentId,
          name: targetName,
          isTrash: false,
          id: { not: nodeId },
        },
      });

      if (conflict) {
        throw new AppError(`An item named "${targetName}" already exists in the target location`, 409);
      }
    }

    const dataToUpdate: any = {};
    if (dto.name) dataToUpdate.name = dto.name.trim();
    if (dto.parentId !== undefined) dataToUpdate.parentId = dto.parentId;
    if (dto.content !== undefined) {
      dataToUpdate.content = dto.content;
      dataToUpdate.size = Buffer.byteLength(dto.content, 'utf8');
    }

    return prisma.vfsNode.update({
      where: { id: nodeId },
      data: dataToUpdate,
    });
  }

  /**
   * Moves a file/folder to Trash
   */
  async moveToTrash(userId: string, nodeId: string) {
    await this.getNodeById(userId, nodeId);

    return prisma.vfsNode.update({
      where: { id: nodeId },
      data: {
        isTrash: true,
        trashedAt: new Date(),
      },
    });
  }

  /**
   * Restores a file/folder from Trash
   */
  async restoreFromTrash(userId: string, nodeId: string) {
    const node = await this.getNodeById(userId, nodeId);

    // Verify parent still exists and is not trashed; if not, restore to user home
    if (node.parentId) {
      const parent = await prisma.vfsNode.findUnique({ where: { id: node.parentId } });
      if (!parent || parent.isTrash) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          const home = await this.ensureUserHome(userId, user.username);
          return prisma.vfsNode.update({
            where: { id: nodeId },
            data: {
              isTrash: false,
              trashedAt: null,
              parentId: home.id,
            },
          });
        }
      }
    }

    return prisma.vfsNode.update({
      where: { id: nodeId },
      data: {
        isTrash: false,
        trashedAt: null,
      },
    });
  }

  /**
   * Permanently deletes a single node
   */
  async deletePermanently(userId: string, nodeId: string) {
    await this.getNodeById(userId, nodeId);

    return prisma.vfsNode.delete({
      where: { id: nodeId },
    });
  }

  /**
   * Empties all items from the user's Trash
   */
  async emptyTrash(userId: string) {
    return prisma.vfsNode.deleteMany({
      where: {
        userId,
        isTrash: true,
      },
    });
  }

  /**
   * Duplicates a file or folder
   */
  async duplicateNode(userId: string, nodeId: string) {
    const node = await this.getNodeById(userId, nodeId);

    // Compute unique copy name
    const extIndex = node.name.lastIndexOf('.');
    const baseName = extIndex !== -1 && node.type === 'FILE' ? node.name.substring(0, extIndex) : node.name;
    const extension = extIndex !== -1 && node.type === 'FILE' ? node.name.substring(extIndex) : '';

    let copyName = `${baseName} - Copy${extension}`;
    let counter = 2;

    while (
      await prisma.vfsNode.findFirst({
        where: { userId, parentId: node.parentId, name: copyName, isTrash: false },
      })
    ) {
      copyName = `${baseName} - Copy (${counter})${extension}`;
      counter++;
    }

    return prisma.vfsNode.create({
      data: {
        name: copyName,
        type: node.type,
        parentId: node.parentId,
        userId,
        content: node.content,
        mimeType: node.mimeType,
        size: node.size,
      },
    });
  }

  /**
   * Searches user files and folders
   */
  async searchNodes(userId: string, query: string) {
    if (!query || query.trim().length === 0) return [];

    return prisma.vfsNode.findMany({
      where: {
        userId,
        isTrash: false,
        name: {
          contains: query.trim(),
          mode: 'insensitive',
        },
      },
      take: 50,
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Returns disk storage metrics for user
   */
  async getStorageUsage(userId: string) {
    const nodes = await prisma.vfsNode.findMany({
      where: { userId },
      select: { size: true, type: true, isTrash: true },
    });

    let totalBytes = 0;
    let fileCount = 0;
    let folderCount = 0;
    let trashBytes = 0;

    for (const node of nodes) {
      if (node.type === 'FILE') fileCount++;
      if (node.type === 'FOLDER') folderCount++;
      totalBytes += node.size;
      if (node.isTrash) trashBytes += node.size;
    }

    return {
      totalBytes,
      fileCount,
      folderCount,
      trashBytes,
      limitBytes: 100 * 1024 * 1024, // 100 MB virtual quota
    };
  }
}

export const vfsService = new VfsService();
