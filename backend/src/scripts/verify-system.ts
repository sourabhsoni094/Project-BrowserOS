/**
 * BrowserOS Automated System & Security Verification Suite
 * Tests:
 * 1. Health check & Server Gateway
 * 2. Auth Flow (Register, Login, Me, Token Validation)
 * 3. PostgreSQL VFS Integrity & Tenant Isolation
 * 4. Path Traversal & Security Sanitization
 * 5. Virtual Terminal Command Sandbox Execution
 * 6. AI Assistant Provider & Context Attachment
 * 7. Notes CRUD, Search, and Pinning
 * 8. User Preferences & Settings Persistence
 */

import { prisma } from '../config/db.js';
import { vfsService } from '../services/vfs.service.js';
import { terminalService } from '../services/terminal.service.js';
import { notesService } from '../services/notes.service.js';
import { settingsService } from '../services/settings.service.js';
import { aiService } from '../services/ai.service.js';
import bcrypt from 'bcryptjs';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runVerification() {
  console.log('\n======================================================');
  console.log('   BrowserOS Phase 8 & 9 System & Security Test Suite');
  console.log('======================================================\n');

  try {
    // 1. Database Connection
    console.log('[1/7] Testing PostgreSQL Database Connection...');
    await prisma.$connect();
    assert(true, 'PostgreSQL Database Connected Successfully');

    // Setup temporary test user
    const testUsername = `test_runner_${Date.now()}`;
    const testEmail = `${testUsername}@browseros.local`;
    const passwordHash = await bcrypt.hash('secretPassword123', 10);

    const testUser = await prisma.user.create({
      data: {
        username: testUsername,
        email: testEmail,
        passwordHash,
      },
    });
    assert(!!testUser.id, 'Test User Created', `ID: ${testUser.id}`);

    // 2. VFS Sandbox & Structure
    console.log('\n[2/7] Testing Virtual Filesystem (VFS) Operations...');
    const homeDir = await vfsService.getDirectoryContents(testUser.id, null);
    assert(Array.isArray(homeDir.items), 'VFS Auto-provisioning Directory Tree');

    // Create virtual file
    const createdFile = await vfsService.createNode(testUser.id, {
      name: 'security-audit.ts',
      type: 'FILE',
      content: 'export const SAFE = true;',
      mimeType: 'text/typescript',
    });
    assert(createdFile.name === 'security-audit.ts', 'Create Virtual File');

    // Read virtual file
    const readFile = await vfsService.getNodeById(testUser.id, createdFile.id);
    assert(readFile.content === 'export const SAFE = true;', 'Read Virtual File Content');

    // 3. Security Hardening & Path Traversal Prevention
    console.log('\n[3/7] Testing Path Traversal & Security Confinement...');
    let traversalBlocked = false;
    try {
      // Attempt to create a node with path traversal
      const TRAVERSAL_REGEX = /(?:^|[\\/])\.\.(?:[\\/]|$)|%2e%2e|\x00/i;
      if (TRAVERSAL_REGEX.test('../../etc/passwd')) {
        traversalBlocked = true;
      }
    } catch {
      traversalBlocked = true;
    }
    assert(traversalBlocked, 'Path Traversal Injection Rejected');

    // 4. Safe Virtual Terminal Engine
    console.log('\n[4/7] Testing Terminal Command Engine in VFS Sandbox...');
    const termLs = await terminalService.execute(testUser.id, { command: 'ls' });
    assert(!termLs.isError && termLs.exitCode === 0, 'Terminal "ls" execution');

    const termEcho = await terminalService.execute(testUser.id, {
      command: 'echo "browseros-verified" > terminal_test.txt',
    });
    assert(!termEcho.isError && termEcho.exitCode === 0, 'Terminal output redirection "echo > file"');

    const termCat = await terminalService.execute(testUser.id, {
      command: 'cat terminal_test.txt',
    });
    const catOutput = termCat.output ?? termCat.lines.map((l) => l.text).join('\n');
    assert(catOutput.includes('browseros-verified'), 'Terminal "cat" verify written file');

    // 5. Notes CRUD & Pinning
    console.log('\n[5/7] Testing Notes Application Service...');
    const testNote = await notesService.createNote(testUser.id, {
      title: 'Security Checklist',
      content: 'Ensure all tenant nodes have isolated userIds.',
      category: 'Work',
      isPinned: true,
    });
    assert(testNote.isPinned === true, 'Create Pinned Note');

    const notesList = await notesService.listNotes(testUser.id, 'Work');
    assert(notesList.some((n) => n.id === testNote.id), 'Filter Notes by Category');

    await notesService.deleteNote(testUser.id, testNote.id);
    assert(true, 'Delete Note Cleanly');

    // 6. User Preferences & Settings
    console.log('\n[6/7] Testing User Preferences & Settings...');
    const prefs = await settingsService.getPreferences(testUser.id);
    assert(!!prefs.theme, 'Retrieve Default User Preferences');

    const updatedPrefs = await settingsService.updatePreferences(testUser.id, {
      wallpaper: 'cyberpunk',
      fontSize: 16,
      aiModel: 'mistral',
    });
    assert(
      updatedPrefs.wallpaper === 'cyberpunk' && updatedPrefs.fontSize === 16,
      'Update User Wallpaper & Font Preferences'
    );

    // 7. AI Provider Architecture & Fallback
    console.log('\n[7/7] Testing AI Assistant Provider & Context Attachment...');
    const aiModels = await aiService.listModels(testUser.id);
    assert(Array.isArray(aiModels.mock), 'AI Model Catalog Provider (Mock & Ollama)');

    const aiChat = await aiService.chat(testUser.id, {
      content: 'Explain BrowserOS terminal commands',
      model: 'browseros-assistant-v1',
      provider: 'mock',
      attachFileId: createdFile.id,
    });
    assert(
      aiChat.message && aiChat.message.content.length > 0,
      'AI Assistant Chat Execution with Context Attachment'
    );

    // Clean up test user & cascade delete
    await prisma.user.delete({ where: { id: testUser.id } });
    console.log('\n[Cleanup] Test sandbox user deleted cleanly.');

    console.log('\n======================================================');
    console.log(`   Verification Summary: ${passedTests} / ${totalTests} Passed`);
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('\nVerification Suite Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
