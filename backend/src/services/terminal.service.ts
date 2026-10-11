import { prisma } from '../config/db.js';
import { vfsService } from './vfs.service.js';
import { AppError } from '../middleware/error.middleware.js';

export interface TerminalExecutionRequest {
  command: string;
  cwdId?: string | null;
}

export interface TerminalLineOutput {
  text: string;
  type?: 'default' | 'error' | 'success' | 'info' | 'warning' | 'dir' | 'prompt';
}

export interface TerminalExecutionResult {
  lines: TerminalLineOutput[];
  newCwd?: {
    id: string;
    path: string;
  };
  exitCode: number;
}

export class TerminalService {
  /**
   * Resolves a path string (relative, absolute, or home-relative ~) to a VfsNode
   */
  async resolvePath(
    userId: string,
    pathStr: string,
    currentFolderId: string | null
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const userHome = await vfsService.ensureUserHome(userId, user.username);

    const trimmed = pathStr.trim();

    // Home shortcuts
    if (trimmed === '~' || trimmed === '') {
      return userHome;
    }

    let startNodeId: string | null = currentFolderId;

    let cleanPath = trimmed;
    if (cleanPath.startsWith('~/')) {
      startNodeId = userHome.id;
      cleanPath = cleanPath.slice(2);
    } else if (cleanPath.startsWith('/')) {
      // Find root /home
      const rootHome = await prisma.vfsNode.findFirst({
        where: { userId, parentId: null, name: 'home', isTrash: false },
      });
      startNodeId = rootHome ? rootHome.id : null;
      cleanPath = cleanPath.replace(/^\/+/, '');
    }

    const segments = cleanPath.split('/').filter((s) => s.length > 0 && s !== '.');

    let currentNodeId = startNodeId;

    for (const segment of segments) {
      if (segment === '..') {
        if (!currentNodeId) continue;
        const current = await prisma.vfsNode.findUnique({ where: { id: currentNodeId } });
        if (current && current.parentId) {
          currentNodeId = current.parentId;
        }
      } else {
        const child = await prisma.vfsNode.findFirst({
          where: {
            userId,
            parentId: currentNodeId,
            name: segment,
            isTrash: false,
          },
        });
        if (!child) {
          return null;
        }
        currentNodeId = child.id;
      }
    }

    if (!currentNodeId) return null;
    return prisma.vfsNode.findUnique({ where: { id: currentNodeId } });
  }

  /**
   * Computes the display path string (e.g. ~/Projects or /home/admin/Desktop)
   */
  async computeDisplayPath(userId: string, folderId: string | null, username: string): Promise<string> {
    if (!folderId) return '/';

    const breadcrumbs: string[] = [];
    let curId: string | null = folderId;

    while (curId) {
      const node: { id: string; name: string; parentId: string | null } | null =
        await prisma.vfsNode.findUnique({
          where: { id: curId },
          select: { id: true, name: true, parentId: true },
        });
      if (!node) break;
      breadcrumbs.unshift(node.name);
      curId = node.parentId;
    }

    const fullPath = '/' + breadcrumbs.join('/');
    const userHomePrefix = `/home/${username}`;

    if (fullPath === userHomePrefix) {
      return '~';
    } else if (fullPath.startsWith(userHomePrefix + '/')) {
      return '~' + fullPath.slice(userHomePrefix.length);
    }

    return fullPath;
  }

  /**
   * Main safe command execution dispatcher
   */
  async execute(userId: string, req: TerminalExecutionRequest): Promise<TerminalExecutionResult> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const userHome = await vfsService.ensureUserHome(userId, user.username);
    const effectiveCwdId = req.cwdId || userHome.id;

    const trimmedRaw = req.command.trim();
    if (!trimmedRaw) {
      return { lines: [], exitCode: 0 };
    }

    // Check for output redirection: command > filename or command >> filename
    let isAppend = false;
    let redirectFile: string | null = null;
    let commandToRun = trimmedRaw;

    if (trimmedRaw.includes('>>')) {
      const parts = trimmedRaw.split('>>');
      commandToRun = parts[0].trim();
      redirectFile = parts[1].trim();
      isAppend = true;
    } else if (trimmedRaw.includes('>')) {
      const parts = trimmedRaw.split('>');
      commandToRun = parts[0].trim();
      redirectFile = parts[1].trim();
      isAppend = false;
    }

    // Tokenize arguments safely
    const tokens = this.tokenize(commandToRun);
    const cmd = tokens[0]?.toLowerCase();
    const args = tokens.slice(1);

    let result: TerminalExecutionResult;

    switch (cmd) {
      case 'help':
        result = this.cmdHelp();
        break;
      case 'whoami':
        result = { lines: [{ text: user.username, type: 'info' }], exitCode: 0 };
        break;
      case 'date':
        result = { lines: [{ text: new Date().toString(), type: 'default' }], exitCode: 0 };
        break;
      case 'pwd':
        result = await this.cmdPwd(userId, effectiveCwdId, user.username);
        break;
      case 'cd':
        result = await this.cmdCd(userId, effectiveCwdId, args, user.username);
        break;
      case 'ls':
      case 'dir':
        result = await this.cmdLs(userId, effectiveCwdId, args);
        break;
      case 'cat':
        result = await this.cmdCat(userId, effectiveCwdId, args);
        break;
      case 'echo':
        result = this.cmdEcho(args);
        break;
      case 'touch':
        result = await this.cmdTouch(userId, effectiveCwdId, args);
        break;
      case 'mkdir':
        result = await this.cmdMkdir(userId, effectiveCwdId, args);
        break;
      case 'rm':
        result = await this.cmdRm(userId, effectiveCwdId, args);
        break;
      case 'cp':
        result = await this.cmdCp(userId, effectiveCwdId, args);
        break;
      case 'mv':
        result = await this.cmdMv(userId, effectiveCwdId, args);
        break;
      case 'neofetch':
      case 'uname':
        result = this.cmdNeofetch(user.username);
        break;
      default:
        result = {
          lines: [
            {
              text: `bash: command not found: ${cmd}. Type 'help' for a list of available commands.`,
              type: 'error',
            },
          ],
          exitCode: 127,
        };
        break;
    }

    // Handle redirection if specified and command succeeded
    if (redirectFile && result.exitCode === 0 && result.lines.length > 0) {
      const outputText = result.lines.map((l) => l.text).join('\n') + '\n';
      await this.handleRedirection(userId, effectiveCwdId, redirectFile, outputText, isAppend);
      // Suppress printed stdout when redirected
      return { lines: [], newCwd: result.newCwd, exitCode: 0 };
    }

    return result;
  }

  // --- Safe Command Implementations ---

  private cmdHelp(): TerminalExecutionResult {
    const commands = [
      ['help', 'Display this list of supported commands'],
      ['ls, dir [-l, -a]', 'List files and directories in current working directory'],
      ['cd [dir]', 'Change virtual working directory (supports ~, .., relative/absolute)'],
      ['pwd', 'Print current virtual working directory path'],
      ['cat <file>', 'Display contents of a file'],
      ['echo <text> [> file]', 'Print text or redirect output to write a virtual file'],
      ['touch <file>', 'Create a new empty file in current directory'],
      ['mkdir [-p] <dir>', 'Create a new directory'],
      ['rm [-r] <item>', 'Remove a file or folder (moves to Trash)'],
      ['cp <src> <dest>', 'Copy a file'],
      ['mv <src> <dest>', 'Move or rename a file'],
      ['whoami', 'Print current username'],
      ['date', 'Print current system date and time'],
      ['clear', 'Clear the terminal screen buffer'],
      ['history', 'List previous commands in this terminal session'],
      ['neofetch, uname', 'Print retro BrowserOS ASCII banner & system specifications'],
    ];

    const lines: TerminalLineOutput[] = [
      { text: 'BrowserOS Virtual Terminal v0.1.0 (Sandbox VFS Shell)', type: 'info' },
      { text: 'Commands operate strictly on the BrowserOS Virtual Filesystem.\n', type: 'default' },
    ];

    for (const [cmd, desc] of commands) {
      lines.push({ text: `  ${cmd.padEnd(22)} ${desc}`, type: 'default' });
    }

    return { lines, exitCode: 0 };
  }

  private async cmdPwd(userId: string, cwdId: string, username: string): Promise<TerminalExecutionResult> {
    const path = await this.computeDisplayPath(userId, cwdId, username);
    return {
      lines: [{ text: path === '~' ? `/home/${username}` : path, type: 'default' }],
      exitCode: 0,
    };
  }

  private async cmdCd(
    userId: string,
    cwdId: string,
    args: string[],
    username: string
  ): Promise<TerminalExecutionResult> {
    const targetPath = args[0] || '~';
    const targetNode = await this.resolvePath(userId, targetPath, cwdId);

    if (!targetNode) {
      return {
        lines: [{ text: `cd: no such file or directory: ${targetPath}`, type: 'error' }],
        exitCode: 1,
      };
    }

    if (targetNode.type !== 'FOLDER') {
      return {
        lines: [{ text: `cd: not a directory: ${targetPath}`, type: 'error' }],
        exitCode: 1,
      };
    }

    const displayPath = await this.computeDisplayPath(userId, targetNode.id, username);

    return {
      lines: [],
      newCwd: {
        id: targetNode.id,
        path: displayPath,
      },
      exitCode: 0,
    };
  }

  private async cmdLs(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    const showLong = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const pathArg = args.find((a) => !a.startsWith('-'));

    let targetFolderId = cwdId;
    if (pathArg) {
      const node = await this.resolvePath(userId, pathArg, cwdId);
      if (!node) {
        return {
          lines: [{ text: `ls: cannot access '${pathArg}': No such file or directory`, type: 'error' }],
          exitCode: 1,
        };
      }
      if (node.type === 'FILE') {
        return {
          lines: [{ text: node.name, type: 'default' }],
          exitCode: 0,
        };
      }
      targetFolderId = node.id;
    }

    const items = await prisma.vfsNode.findMany({
      where: {
        userId,
        parentId: targetFolderId,
        isTrash: false,
      },
      orderBy: [{ type: 'desc' }, { name: 'asc' }],
    });

    if (items.length === 0) {
      return { lines: [], exitCode: 0 };
    }

    const lines: TerminalLineOutput[] = [];

    if (showLong) {
      lines.push({ text: `total ${items.length}`, type: 'default' });
      for (const item of items) {
        const isDir = item.type === 'FOLDER';
        const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
        const sizeStr = item.size.toString().padStart(6);
        const dateStr = item.updatedAt.toLocaleDateString() + ' ' + item.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lines.push({
          text: `${perms} 1 user user ${sizeStr} ${dateStr} ${item.name}`,
          type: isDir ? 'dir' : 'default',
        });
      }
    } else {
      // Columnar formatted output
      const formatted = items.map((i) => (i.type === 'FOLDER' ? `${i.name}/` : i.name)).join('  ');
      lines.push({ text: formatted, type: 'default' });
    }

    return { lines, exitCode: 0 };
  }

  private async cmdCat(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    if (!args[0]) {
      return { lines: [{ text: 'cat: missing file operand', type: 'error' }], exitCode: 1 };
    }

    const node = await this.resolvePath(userId, args[0], cwdId);
    if (!node) {
      return { lines: [{ text: `cat: ${args[0]}: No such file or directory`, type: 'error' }], exitCode: 1 };
    }

    if (node.type === 'FOLDER') {
      return { lines: [{ text: `cat: ${args[0]}: Is a directory`, type: 'error' }], exitCode: 1 };
    }

    const lines: TerminalLineOutput[] = (node.content || '')
      .split('\n')
      .map((line) => ({ text: line, type: 'default' }));

    return { lines, exitCode: 0 };
  }

  private cmdEcho(args: string[]): TerminalExecutionResult {
    let text = args.join(' ');
    // Strip surrounding quotes if present
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1);
    }
    return { lines: [{ text, type: 'default' }], exitCode: 0 };
  }

  private async cmdTouch(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    if (!args[0]) {
      return { lines: [{ text: 'touch: missing file operand', type: 'error' }], exitCode: 1 };
    }

    const fileName = args[0].trim();
    const existing = await prisma.vfsNode.findFirst({
      where: { userId, parentId: cwdId, name: fileName, isTrash: false },
    });

    if (existing) {
      // Update timestamp
      await prisma.vfsNode.update({ where: { id: existing.id }, data: { updatedAt: new Date() } });
    } else {
      await vfsService.createNode(userId, {
        name: fileName,
        type: 'FILE',
        parentId: cwdId,
        content: '',
      });
    }

    return { lines: [], exitCode: 0 };
  }

  private async cmdMkdir(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    const dirName = args.find((a) => !a.startsWith('-'));
    if (!dirName) {
      return { lines: [{ text: 'mkdir: missing operand', type: 'error' }], exitCode: 1 };
    }

    const existing = await prisma.vfsNode.findFirst({
      where: { userId, parentId: cwdId, name: dirName.trim(), isTrash: false },
    });

    if (existing) {
      return { lines: [{ text: `mkdir: cannot create directory '${dirName}': File exists`, type: 'error' }], exitCode: 1 };
    }

    await vfsService.createNode(userId, {
      name: dirName.trim(),
      type: 'FOLDER',
      parentId: cwdId,
    });

    return { lines: [], exitCode: 0 };
  }

  private async cmdRm(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    const isRecursive = args.includes('-r') || args.includes('-rf') || args.includes('-R');
    const targetName = args.find((a) => !a.startsWith('-'));

    if (!targetName) {
      return { lines: [{ text: 'rm: missing operand', type: 'error' }], exitCode: 1 };
    }

    const node = await this.resolvePath(userId, targetName, cwdId);
    if (!node) {
      return { lines: [{ text: `rm: cannot remove '${targetName}': No such file or directory`, type: 'error' }], exitCode: 1 };
    }

    if (node.type === 'FOLDER' && !isRecursive) {
      return { lines: [{ text: `rm: cannot remove '${targetName}': Is a directory (use -r)`, type: 'error' }], exitCode: 1 };
    }

    await vfsService.moveToTrash(userId, node.id);
    return { lines: [], exitCode: 0 };
  }

  private async cmdCp(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    if (args.length < 2) {
      return { lines: [{ text: 'cp: missing destination file operand after source', type: 'error' }], exitCode: 1 };
    }

    const src = await this.resolvePath(userId, args[0], cwdId);
    if (!src) {
      return { lines: [{ text: `cp: cannot stat '${args[0]}': No such file or directory`, type: 'error' }], exitCode: 1 };
    }

    const destName = args[1].trim();
    await vfsService.createNode(userId, {
      name: destName,
      type: src.type,
      parentId: cwdId,
      content: src.content || '',
      mimeType: src.mimeType || 'text/plain',
    });

    return { lines: [], exitCode: 0 };
  }

  private async cmdMv(userId: string, cwdId: string, args: string[]): Promise<TerminalExecutionResult> {
    if (args.length < 2) {
      return { lines: [{ text: 'mv: missing destination file operand after source', type: 'error' }], exitCode: 1 };
    }

    const src = await this.resolvePath(userId, args[0], cwdId);
    if (!src) {
      return { lines: [{ text: `mv: cannot stat '${args[0]}': No such file or directory`, type: 'error' }], exitCode: 1 };
    }

    const destName = args[1].trim();
    await vfsService.updateNode(userId, src.id, { name: destName });

    return { lines: [], exitCode: 0 };
  }

  private cmdNeofetch(username: string): TerminalExecutionResult {
    const banner = [
      `  ____                                     ${username}@browseros`,
      ` |  _ \\                                    ------------------`,
      ` | |_) |_ __ _____      _____  ___ _ __    OS: BrowserOS v0.1.0 x86_64`,
      ` |  _ <| '__/ _ \\ \\ /\\ / / __|/ _ \\ '__|   Host: Web Browser Virtual Sandbox`,
      ` | |_) | | | (_) \\ V  V /\\__ \\  __/ |      Kernel: 6.1.0-browser-vfs`,
      ` |____/|_|  \\___/ \\_/\\_/ |___/\\___|_|      Uptime: Active session`,
      `                                           Shell: browseros-sh 1.0`,
      `                                           Storage: PostgreSQL Virtual VFS`,
      `                                           WM: BrowserOS Window Manager`,
      `                                           Theme: Dark (Slate-950)`,
    ];

    return {
      lines: banner.map((line) => ({ text: line, type: 'info' })),
      exitCode: 0,
    };
  }

  private async handleRedirection(
    userId: string,
    cwdId: string,
    fileName: string,
    content: string,
    isAppend: boolean
  ) {
    const existing = await prisma.vfsNode.findFirst({
      where: { userId, parentId: cwdId, name: fileName, isTrash: false },
    });

    if (existing) {
      const newContent = isAppend ? (existing.content || '') + content : content;
      await vfsService.updateNode(userId, existing.id, { content: newContent });
    } else {
      await vfsService.createNode(userId, {
        name: fileName,
        type: 'FILE',
        parentId: cwdId,
        content,
      });
    }
  }

  private tokenize(str: string): string[] {
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens: string[] = [];
    let match;
    while ((match = regex.exec(str)) !== null) {
      tokens.push(match[1] || match[2] || match[0]);
    }
    return tokens;
  }
}

export const terminalService = new TerminalService();
