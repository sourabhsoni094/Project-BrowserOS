# 🌐 BrowserOS

> **A modular, extensible, web-based desktop operating system environment running entirely in the browser.**  
> Powered by **React 18**, **TypeScript**, **Tailwind CSS**, **Node.js + Express**, **Prisma ORM**, and **PostgreSQL**.

---

```
                                  BrowserOS Architecture
   ┌───────────────────────────────────────────────────────────────────────────────────┐
   │                                  BROWSER CLIENT                                    │
   │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
   │  │                              Top Status Bar                                 │  │
   │  ├─────────────────────────────────────────────────────────────────────────────┤  │
   │  │  Desktop Surface  │  Synced Desktop Files  │  Context Menus  │  Watermark   │  │
   │  │  ─────────────────────────────────────────────────────────────────────────  │  │
   │  │                   Multi-Window Manager Engine (z-index, drag, resize)       │  │
   │  │  ┌───────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌────────────┐  │  │
   │  │  │ Terminal  │ │ File Manager│ │ Code Editor │ │    AI    │ │  Settings  │  │  │
   │  │  │  (bash)   │ │  (Dual-Pane)│ │ (Highlight) │ │ (Ollama) │ │ & Monitor  │  │  │
   │  │  └───────────┘ └─────────────┘ └─────────────┘ └──────────┘ └────────────┘  │  │
   │  ├─────────────────────────────────────────────────────────────────────────────┤  │
   │  │        Bottom Taskbar / Dock  •  Alt+Tab Switcher  •  Start Launcher        │  │
   │  └─────────────────────────────────────────────────────────────────────────────┘  │
   └────────────────────────────────────────┬──────────────────────────────────────────┘
                                            │ HTTP / REST API (JWT Authenticated)
   ┌────────────────────────────────────────▼──────────────────────────────────────────┐
   │                           EXPRESS + TYPESCRIPT BACKEND                             │
   │  ┌─────────────────────────────────────────────────────────────────────────────┐  │
   │  │ Security Layer: Helmet, CORS, Brute-Force Rate Limiting, Path Sanitizer     │  │
   │  ├───────────────────────┬──────────────────────────┬──────────────────────────┤  │
   │  │   Auth Controller     │     VFS Controller       │   Terminal Controller    │  │
   │  │   (JWT + Bcrypt)      │  (Tree CRUD, Duplication)│   (Sandboxed Shell Ops)  │  │
   │  ├───────────────────────┼──────────────────────────┼──────────────────────────┤  │
   │  │   AI Controller       │     Notes Controller     │   Settings Controller    │  │
   │  │ (Ollama + Mock Fallback) (Autosave, Categories)  │ (Wallpapers, Preferences)│  │
   │  └───────────────────────┴──────────────────────────┴──────────────────────────┘  │
   └───────────────────────┬────────────────────────────────────┬──────────────────────┘
                           │ Prisma ORM                         │ HTTP API (:11434)
   ┌───────────────────────▼───────────────┐   ┌────────────────▼──────────────────────┐
   │     POSTGRESQL DATABASE (browseros)   │   │         LOCAL OLLAMA RUNTIME          │
   │  • users            • user_preferences│   │  • llama3        • mistral            │
   │  • vfs_nodes (Tree) • notes           │   │  • codellama     • deepseek-coder     │
   │  • conversations    • messages        │   │  (Safe isolated local inference)      │
   └───────────────────────────────────────┘   └───────────────────────────────────────┘
```

---

## 🚀 10-Phase Roadmap Status

- [x] **Phase 1: Project Foundation, Auth & Initial Desktop Shell**
- [x] **Phase 2: Window Manager Engine, Taskbar/Dock & Start Launcher**
- [x] **Phase 3: Virtual Filesystem (VFS), File Manager, Upload/Download, Trash & Desktop Sync**
- [x] **Phase 4: Safe Virtual Terminal & Multi-Tab Shell Environment**
- [x] **Phase 5: VS-Code-like Lightweight Code & Text Editor**
- [x] **Phase 6: AI Assistant with Ollama & Virtual File Context Ingestion**
- [x] **Phase 7: Productivity Suite (Notes, Settings, System Monitor & Task Manager)**
- [x] **Phase 8: Inter-App Synergy, Notifications & Desktop Shortcuts**
- [x] **Phase 9: Security Hardening, Automated Tests & Performance Optimization**
- [x] **Phase 10: Production Dockerization, Deployment & Documentation**

---

## 🧰 Native Applications Suite

| Application | ID | Description |
| :--- | :--- | :--- |
| **Terminal** | `terminal` | Multi-tab safe virtual shell sandbox (`ls`, `cd`, `cat`, `echo >`, `mkdir`, `rm`, `pwd`, `neofetch`, `help`). |
| **Files** | `file-manager` | Dual-pane explorer with breadcrumbs, host upload/download, recycle bin, properties modal, and search. |
| **Code Editor** | `text-editor` | Lightweight IDE featuring VFS tree, multi-tab editing, syntax highlighting (TS/JS/JSON/MD), find/replace, and autosave. |
| **AI Assistant** | `ai-assistant` | Local LLM companion (Ollama) with markdown formatting, syntax-highlighted code blocks with Copy, and VFS file context attachment. |
| **Notes** | `notes` | Fast notepad with category tags (`General`, `Work`, `Personal`, `Code`, `Ideas`), pin to top, and debounced autosave. |
| **Settings** | `settings` | System personalization (5 desktop wallpapers, themes, font sizing), Ollama URL configuration, and system diagnostics. |
| **System Monitor**| `system-monitor` | Real-time CPU telemetry, browser JS heap memory, API latency, and Task Manager with **End Task** process termination. |

---

## ⌨️ Desktop Shortcuts

* <kbd>Alt</kbd> + <kbd>Tab</kbd>: Visual window switcher (cycles through running applications)
* <kbd>Ctrl</kbd> + <kbd>Space</kbd> or <kbd>Meta</kbd>: Toggle Start Menu / App Launcher
* <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>T</kbd>: Quick-launch **Terminal**
* <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>E</kbd>: Quick-launch **Code Editor**
* <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>N</kbd>: Quick-launch **Notes**
* <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>A</kbd>: Quick-launch **AI Assistant**

---

## 📦 Getting Started (Local Development)

### Prerequisites
* **Node.js**: v20 or higher
* **PostgreSQL**: v14+ running on `localhost:5432`
* **Ollama** *(Optional)*: For local AI inference (`http://localhost:11434`)

### 1. Database Setup
Ensure PostgreSQL is running with database `browseros`:
```bash
# PostgreSQL Default Credentials:
# Host: localhost:5432 | User: postgres | Password: admin | Database: browseros
```

### 2. Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
*Backend runs on `http://localhost:5000`*

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

### 4. Default Seed Accounts
BrowserOS automatically provisions two ready-to-use demo accounts:
* **Admin**: `admin` / `password123`
* **Demo**: `demo` / `password123`

---

## 🐳 Production Deployment with Docker Compose

Deploy the complete stack (PostgreSQL + Backend + Nginx Frontend) in one command:

```bash
docker compose up --build -d
```

* **Frontend**: Open `http://localhost`
* **Backend API**: Reverse-proxied at `http://localhost/api`
* **Database**: Persistent storage mounted to Docker volume `browseros_pgdata`

To shut down:
```bash
docker compose down
```

---

## 🧪 Automated System & Security Tests

Run the built-in end-to-end integration and security test suite:

```bash
cd backend
npm run test
```

This automated suite verifies:
1. PostgreSQL connection & user registration
2. Virtual Filesystem (VFS) tree creation and isolation
3. Path traversal attack rejection
4. Terminal sandbox command execution (`ls`, `echo >`, `cat`)
5. Notes CRUD, category filtering, and pin toggling
6. Settings and wallpaper persistence
7. AI model catalog and context prompt attachment

---

## 🔒 Security & Sandbox Guarantees

* **Strict Host Quarantine**: BrowserOS does **never** touch real host disks or execute host shell commands. All filesystem operations run against isolated PostgreSQL rows in the `vfs_nodes` table.
* **Path Traversal Protection**: Inputs containing `../`, `%2e%2e`, or null bytes are rejected by `securitySanitizer`.
* **Tenant Isolation**: Every database query explicitly checks and enforces the authenticated `userId`.
* **Brute-Force Rate Limiting**: Strict rate-limiting on `/api/auth/login` and `/api/auth/register` (max 50 attempts / 15 minutes).

---

## 🧩 Developer Guide: Adding New Apps

To add a new application to BrowserOS, create your React component and register it in `frontend/src/applications/appRegistry.tsx`:

```tsx
import { AppDefinition } from '../types/application.types';
import { Gamepad2 } from 'lucide-react';
import { MyApp } from './MyApp';

export const appRegistry: AppDefinition[] = [
  // ...existing apps
  {
    id: 'my-app',
    title: 'My Custom App',
    icon: Gamepad2,
    category: 'Utilities',
    description: 'A custom native application',
    defaultWidth: 600,
    defaultHeight: 400,
    minWidth: 350,
    minHeight: 250,
    component: MyApp,
  },
];
```

The Window Manager, Dock/Taskbar, App Launcher, and Alt+Tab switcher will automatically discover and support your application without any extra configuration!
