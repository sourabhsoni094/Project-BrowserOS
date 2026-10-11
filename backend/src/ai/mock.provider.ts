import { AIProvider, ChatCompletionOptions } from './provider.interface.js';

export class MockProvider implements AIProvider {
  name = 'mock';

  async listModels(): Promise<string[]> {
    return ['browseros-assistant-v1', 'code-helper-fast'];
  }

  async chat(options: ChatCompletionOptions): Promise<string> {
    const lastUserMessage = options.messages.filter((m) => m.role === 'user').pop();
    const prompt = lastUserMessage?.content || '';
    const lower = prompt.toLowerCase();

    // Check if a virtual file was attached
    if (lower.includes('[context file:')) {
      const fileNameMatch = prompt.match(/\[Context File: "([^"]+)"\]/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'attached file';
      return `### 📄 Analysis of \`${fileName}\`

I have inspected the contents of **${fileName}** attached from your PostgreSQL virtual workspace.

**File Summary**:
- **Source**: Virtual Filesystem (VFS)
- **Status**: Securely isolated in BrowserOS sandbox.

**Recommendation / Implementation**:
\`\`\`typescript
// Quick enhancement or verification for ${fileName}
export function verifyWorkspaceFile() {
  console.log('Successfully processed ${fileName}');
  return true;
}
\`\`\`

You can ask me to debug specific lines, rewrite functions, or suggest terminal commands to manipulate this file!`;
    }

    if (lower.includes('terminal') || lower.includes('command') || lower.includes('shell')) {
      return `Here are the core **BrowserOS Virtual Terminal** commands:
- \`ls -la\` : List all virtual files with permissions and sizes
- \`cd <dir>\` : Change directory (supports \`~\`, \`..\`)
- \`cat <file>\` : Read virtual file contents
- \`echo "text" > <file>\` : Write text directly to a file
- \`mkdir -p <dir>\` : Create directory
- \`rm <file>\` : Remove file
- \`neofetch\` : Display the BrowserOS system specs banner
- \`help\` : View complete command list`;
    }

    if (lower.includes('file') || lower.includes('vfs') || lower.includes('storage')) {
      return `**BrowserOS Virtual Filesystem Overview**:
Your virtual files are stored safely in PostgreSQL. Key features:
1. **Files App**: Browse, upload files from your real PC, download files to PC.
2. **Code Editor**: Edit code with syntax highlighting and tabs (<kbd>Ctrl+S</kbd> to save).
3. **Desktop Surface**: Files in \`/home/admin/Desktop\` sync automatically onto your wallpaper.
4. **Recycle Bin**: Soft-delete and restore files.`;
    }

    if (lower.includes('code') || lower.includes('function') || lower.includes('typescript') || lower.includes('javascript') || lower.includes('react')) {
      return `Here is a production-quality TypeScript utility function for BrowserOS:

\`\`\`typescript
/**
 * Formats byte size into human-readable format.
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Example usage:
console.log(formatBytes(1048576)); // "1.00 MB"
\`\`\`

Would you like me to adapt this for your specific use case?`;
    }

    if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
      return `Hello! 👋 I am your native **BrowserOS AI Assistant**.

I am ready to help you:
- Write and debug code in the **Code Editor**
- Provide commands for the **Terminal**
- Analyze workspace files (click the 📎 paperclip icon below to attach a file)
- Guide you through your BrowserOS desktop!

*(Tip: You can connect a local Ollama LLM like \`llama3\` in **Settings** anytime!)*`;
    }

    return `I am your **BrowserOS AI Companion**! 

I can assist with:
- **Code Generation & Debugging**: TypeScript, JavaScript, CSS, HTML, Python, etc.
- **Terminal Operations**: Sandbox commands, piping, and script execution.
- **Workspace Analysis**: Attach files directly using the paperclip icon for instant review.

If you have a local **Ollama** runtime running (\`ollama run llama3\`), you can also connect it in **Settings**!`;
  }
}

export const mockProvider = new MockProvider();
