import type {
  Project,
  ProjectFile,
  Conversation,
  Message,
  ToolCallRecord,
  Build,
  BuildLog,
  BuildError,
  ProjectChange,
  QwenSettings,
} from '../../types/index.ts';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export class DataStore {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private files: Map<string, Map<string, ProjectFile>> = new Map(); // projectId -> path -> ProjectFile
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, Message[]> = new Map(); // conversationId -> Message[]
  private builds: Map<string, Build[]> = new Map(); // projectId -> Build[]
  private changes: Map<string, ProjectChange[]> = new Map(); // projectId -> ProjectChange[]
  private settings: QwenSettings = {
    model: 'qwen-2.5-coder-32b-instruct',
    autoRepair: true,
    maxRepairAttempts: 3,
  };

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    // Default user
    const defaultUser: User = {
      id: 'usr_default_dev',
      email: 'engineer@qwenbuild.dev',
      name: 'Qwen Lead Engineer',
      role: 'developer',
    };
    this.users.set(defaultUser.id, defaultUser);

    // Initial Starter Project
    const projectId = 'proj_pulse_metrics';
    const initialProject: Project = {
      id: projectId,
      name: 'Pulse - API & Service Monitor',
      description: 'Production observability console with latency tracking, error budget monitors, and endpoint health checks.',
      framework: 'react-ts',
      status: 'idle',
      currentBuildId: 'build_init_001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(projectId, initialProject);

    // Initial files for this starter project
    const projectFilesMap = new Map<string, ProjectFile>();

    const packageJsonContent = JSON.stringify(
      {
        name: 'pulse-monitor',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
          test: 'vitest run',
        },
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'lucide-react': '^0.546.0',
        },
      },
      null,
      2
    );

    const appTsxContent = `import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, AlertTriangle, RefreshCw, Cpu, Server, Clock, Database, Globe } from 'lucide-react';

interface ServiceEndpoint {
  id: string;
  name: string;
  endpoint: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  uptime: number;
  errorRate: number;
}

export default function App() {
  const [filter, setFilter] = useState<'all' | 'operational' | 'issues'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());

  const [endpoints, setEndpoints] = useState<ServiceEndpoint[]>([
    { id: '1', name: 'Auth Gateway (v2)', endpoint: 'https://api.gateway.internal/v2/auth', status: 'operational', latency: 42, uptime: 99.98, errorRate: 0.02 },
    { id: '2', name: 'Vector Query Engine', endpoint: 'https://vector.db.internal/v1/search', status: 'operational', latency: 128, uptime: 99.91, errorRate: 0.08 },
    { id: '3', name: 'Billing Webhook Ingestion', endpoint: 'https://pay.service.internal/hooks', status: 'degraded', latency: 340, uptime: 98.45, errorRate: 1.84 },
    { id: '4', name: 'Streaming Event Bus', endpoint: 'wss://stream.cluster.internal/feed', status: 'operational', latency: 19, uptime: 99.99, errorRate: 0.01 },
    { id: '5', name: 'Storage Blob Sync', endpoint: 'https://s3.backup.internal/sync', status: 'operational', latency: 85, uptime: 99.95, errorRate: 0.04 },
  ]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setEndpoints(prev => prev.map(ep => ({
        ...ep,
        latency: Math.max(12, Math.floor(ep.latency + (Math.random() * 20 - 10))),
      })));
      setLastUpdated(new Date().toLocaleTimeString());
      setIsRefreshing(false);
    }, 600);
  };

  const filtered = endpoints.filter(ep => {
    if (filter === 'operational') return ep.status === 'operational';
    if (filter === 'issues') return ep.status !== 'operational';
    return true;
  });

  const avgLatency = Math.round(endpoints.reduce((acc, curr) => acc + curr.latency, 0) / endpoints.length);
  const totalErrors = endpoints.filter(ep => ep.status !== 'operational').length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans antialiased p-6 md:p-8">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[#30363d] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#e11d48]/10 border border-[#e11d48]/30 flex items-center justify-center text-[#e11d48]">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Pulse Observability</h1>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#8b949e]">
            <span>Cluster: us-west-prod-01</span>
            <span aria-hidden="true">·</span>
            <span>Sync: {lastUpdated}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] transition-colors cursor-pointer"
          >
            <RefreshCw className={\`w-3.5 h-3.5 \${isRefreshing ? 'animate-spin' : ''}\`} />
            <span>Refresh Metrics</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Active</span>
          </div>
        </div>
      </header>

      {/* Main Metrics Overview */}
      <main className="max-w-6xl mx-auto space-y-8">
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-medium mb-2">
              <span>Average Response Time</span>
              <Clock className="w-4 h-4 text-[#8b949e]" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{avgLatency} ms</div>
            <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
              <span>Nominal latency bounds (&lt;150ms)</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-medium mb-2">
              <span>Operational Fleet</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{endpoints.length - totalErrors} / {endpoints.length}</div>
            <div className="mt-2 text-xs text-[#8b949e]">
              <span>99.94% fleet availability</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#161b22] border border-[#30363d]">
            <div className="flex items-center justify-between text-[#8b949e] text-xs font-medium mb-2">
              <span>Active Degradations</span>
              <AlertTriangle className={\`w-4 h-4 \${totalErrors > 0 ? 'text-amber-400' : 'text-[#8b949e]'}\`} />
            </div>
            <div className="text-2xl font-bold text-white font-mono tabular-nums">{totalErrors}</div>
            <div className="mt-2 text-xs text-amber-400">
              <span>{totalErrors > 0 ? 'High latency on billing webhook' : 'Zero service alerts'}</span>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-[#161b22] p-1 rounded-md border border-[#30363d]">
            <button
              onClick={() => setFilter('all')}
              className={\`px-3 py-1 text-xs font-medium rounded transition-colors \${filter === 'all' ? 'bg-[#21262d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}\`}
            >
              All Endpoints ({endpoints.length})
            </button>
            <button
              onClick={() => setFilter('operational')}
              className={\`px-3 py-1 text-xs font-medium rounded transition-colors \${filter === 'operational' ? 'bg-[#21262d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}\`}
            >
              Operational
            </button>
            <button
              onClick={() => setFilter('issues')}
              className={\`px-3 py-1 text-xs font-medium rounded transition-colors \${filter === 'issues' ? 'bg-[#21262d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}\`}
            >
              Issues ({totalErrors})
            </button>
          </div>
          <span className="text-xs text-[#8b949e] font-mono">Showing {filtered.length} nodes</span>
        </section>

        {/* Endpoint List Table */}
        <section className="bg-[#161b22] rounded-lg border border-[#30363d] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#8b949e]">
              <thead className="bg-[#0d1117] text-[#8b949e] border-b border-[#30363d]">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">Service Name</th>
                  <th scope="col" className="px-5 py-3 font-medium">Endpoint URL</th>
                  <th scope="col" className="px-5 py-3 font-medium">Latency</th>
                  <th scope="col" className="px-5 py-3 font-medium">30d Uptime</th>
                  <th scope="col" className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {filtered.map(ep => (
                  <tr key={ep.id} className="hover:bg-[#21262d]/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-white flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-[#8b949e]" />
                      <span>{ep.name}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-[#8b949e] truncate max-w-xs">{ep.endpoint}</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-white">{ep.latency}ms</td>
                    <td className="px-5 py-3.5 font-mono tabular-nums text-white">{ep.uptime}%</td>
                    <td className="px-5 py-3.5">
                      {ep.status === 'operational' ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Operational
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          Degraded
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
`;

    const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pulse Monitor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

    const mainTsxContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;

    const readmeContent = `# Pulse - API & Service Observability

Built with **Qwen Build**.

## Overview
Pulse monitors API endpoints, tracks real-time response latency, and alerts on SLA degradations.

## Architecture
- React 19 + TypeScript
- Lucide React iconography
- Modular service architecture
`;

    const initialFiles = [
      { path: 'package.json', content: packageJsonContent },
      { path: 'index.html', content: indexHtmlContent },
      { path: 'src/main.tsx', content: mainTsxContent },
      { path: 'src/App.tsx', content: appTsxContent },
      { path: 'README.md', content: readmeContent },
    ];

    for (const f of initialFiles) {
      projectFilesMap.set(f.path, {
        id: 'file_' + Math.random().toString(36).substring(2, 9),
        projectId,
        path: f.path,
        content: f.content,
        size: f.content.length,
        updatedAt: new Date().toISOString(),
      });
    }

    this.files.set(projectId, projectFilesMap);

    // Initial conversation
    const convId = 'conv_init_001';
    this.conversations.set(convId, {
      id: convId,
      projectId,
      title: 'Initial Build & Project Inspection',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const initialMsgs: Message[] = [
      {
        id: 'msg_001',
        conversationId: convId,
        role: 'user',
        content: 'Create a production-grade API observability and latency monitoring console with clean metrics cards and live refresh.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'msg_002',
        conversationId: convId,
        role: 'assistant',
        thought: 'I need to design a clean, developer-focused service health dashboard with real-time latency indicators, status breakdowns, and resilient tabular figures.',
        content: "I have initialized the Pulse Observability workspace. The project structure is set up with React, TypeScript, and clean metrics components. Running initial build...",
        toolCalls: [
          {
            id: 'tc_001',
            toolName: 'list_files',
            input: { directory: '.' },
            output: { files: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'README.md'] },
            status: 'success',
            durationMs: 45,
            timestamp: new Date(Date.now() - 3590000).toISOString(),
          },
          {
            id: 'tc_002',
            toolName: 'write_file',
            input: { path: 'src/App.tsx', lines: 180 },
            output: { bytesWritten: appTsxContent.length, status: 'ok' },
            status: 'success',
            durationMs: 120,
            timestamp: new Date(Date.now() - 3580000).toISOString(),
          },
          {
            id: 'tc_003',
            toolName: 'run_command',
            input: { command: 'npm run build' },
            output: { exitCode: 0, stdout: 'vite v8.3.0 building for production...\n✓ built in 142ms' },
            status: 'success',
            durationMs: 310,
            timestamp: new Date(Date.now() - 3570000).toISOString(),
          },
        ],
        createdAt: new Date(Date.now() - 3560000).toISOString(),
      },
    ];
    this.messages.set(convId, initialMsgs);

    // Initial build record
    const initBuild: Build = {
      id: 'build_init_001',
      projectId,
      status: 'success',
      errors: [],
      warnings: [],
      logs: [
        { id: 'bl_1', buildId: 'build_init_001', level: 'info', message: 'Starting virtual TypeScript compilation...', timestamp: new Date().toISOString() },
        { id: 'bl_2', buildId: 'build_init_001', level: 'info', message: 'Resolving import graph: src/main.tsx -> src/App.tsx', timestamp: new Date().toISOString() },
        { id: 'bl_3', buildId: 'build_init_001', level: 'success', message: 'Build completed cleanly in 142ms. Zero diagnostic errors.', timestamp: new Date().toISOString() },
      ],
      startedAt: new Date(Date.now() - 3575000).toISOString(),
      completedAt: new Date(Date.now() - 3570000).toISOString(),
      commitHash: 'c7f91a2',
    };
    this.builds.set(projectId, [initBuild]);

    // Initial change record
    this.changes.set(projectId, [
      {
        id: 'chg_init_001',
        projectId,
        buildId: 'build_init_001',
        description: 'Initialize Pulse API Observability Console with React 19 & Lucide icons',
        filesChanged: ['package.json', 'index.html', 'src/main.tsx', 'src/App.tsx', 'README.md'],
        diffSummary: '+284 lines across 5 files',
        canRevert: true,
        createdAt: new Date().toISOString(),
        snapshot: Object.fromEntries(initialFiles.map(f => [f.path, f.content])),
      },
    ]);
  }

  // Projects
  public getProjects(): Project[] {
    return Array.from(this.projects.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  public getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  public createProject(name: string, description: string, framework: Project['framework'] = 'react-ts'): Project {
    const id = 'proj_' + Math.random().toString(36).substring(2, 9);
    const newProject: Project = {
      id,
      name,
      description,
      framework,
      status: 'idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, newProject);
    this.files.set(id, new Map());
    this.builds.set(id, []);
    this.changes.set(id, []);

    // Create default conversation
    const convId = 'conv_' + Math.random().toString(36).substring(2, 9);
    this.conversations.set(convId, {
      id: convId,
      projectId: id,
      title: 'Initial Setup',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return newProject;
  }

  public updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const project = this.projects.get(id);
    if (!project) return undefined;
    const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
    this.projects.set(id, updated);
    return updated;
  }

  public deleteProject(id: string): boolean {
    this.files.delete(id);
    this.builds.delete(id);
    this.changes.delete(id);
    return this.projects.delete(id);
  }

  // Files
  public getFiles(projectId: string): ProjectFile[] {
    const projectFiles = this.files.get(projectId);
    if (!projectFiles) return [];
    return Array.from(projectFiles.values());
  }

  public getFile(projectId: string, filePath: string): ProjectFile | undefined {
    const projectFiles = this.files.get(projectId);
    if (!projectFiles) return undefined;
    // Normalize path
    const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    return projectFiles.get(normalized);
  }

  public saveFile(projectId: string, filePath: string, content: string): ProjectFile {
    let projectFiles = this.files.get(projectId);
    if (!projectFiles) {
      projectFiles = new Map();
      this.files.set(projectId, projectFiles);
    }
    const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const existing = projectFiles.get(normalized);

    const file: ProjectFile = {
      id: existing?.id || 'file_' + Math.random().toString(36).substring(2, 9),
      projectId,
      path: normalized,
      content,
      size: content.length,
      updatedAt: new Date().toISOString(),
    };
    projectFiles.set(normalized, file);
    return file;
  }

  public deleteFile(projectId: string, filePath: string): boolean {
    const projectFiles = this.files.get(projectId);
    if (!projectFiles) return false;
    const normalized = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    return projectFiles.delete(normalized);
  }

  public createDirectory(projectId: string, dirPath: string): boolean {
    // In our virtual FS, directories exist implicitly via file paths, or with a .gitkeep
    const normalized = dirPath.endsWith('/') ? dirPath : dirPath + '/';
    this.saveFile(projectId, `${normalized}.gitkeep`, '');
    return true;
  }

  // Conversations & Messages
  public getConversations(projectId: string): Conversation[] {
    return Array.from(this.conversations.values()).filter(c => c.projectId === projectId);
  }

  public getMessages(projectId: string): Message[] {
    const convs = this.getConversations(projectId);
    if (convs.length === 0) return [];
    const allMessages: Message[] = [];
    for (const c of convs) {
      const msgs = this.messages.get(c.id) || [];
      allMessages.push(...msgs);
    }
    return allMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addMessage(projectId: string, role: Message['role'], content: string, thought?: string, toolCalls?: ToolCallRecord[]): Message {
    let convs = this.getConversations(projectId);
    let conv = convs[0];
    if (!conv) {
      const convId = 'conv_' + Math.random().toString(36).substring(2, 9);
      conv = {
        id: convId,
        projectId,
        title: 'Development Session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.conversations.set(convId, conv);
    }

    const message: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      conversationId: conv.id,
      role,
      content,
      thought,
      toolCalls,
      createdAt: new Date().toISOString(),
    };

    const existingMsgs = this.messages.get(conv.id) || [];
    existingMsgs.push(message);
    this.messages.set(conv.id, existingMsgs);
    return message;
  }

  // Builds & Logs
  public getBuilds(projectId: string): Build[] {
    return this.builds.get(projectId) || [];
  }

  public getLatestBuild(projectId: string): Build | undefined {
    const list = this.builds.get(projectId) || [];
    return list[list.length - 1];
  }

  public addBuild(projectId: string, build: Build): Build {
    const list = this.builds.get(projectId) || [];
    list.push(build);
    this.builds.set(projectId, list);
    this.updateProject(projectId, { currentBuildId: build.id, status: build.status });
    return build;
  }

  public updateBuild(projectId: string, buildId: string, updates: Partial<Build>): Build | undefined {
    const list = this.builds.get(projectId) || [];
    const idx = list.findIndex(b => b.id === buildId);
    if (idx === -1) return undefined;
    list[idx] = { ...list[idx], ...updates };
    this.builds.set(projectId, list);
    if (updates.status) {
      this.updateProject(projectId, { status: updates.status });
    }
    return list[idx];
  }

  // Changes
  public getChanges(projectId: string): ProjectChange[] {
    return (this.changes.get(projectId) || []).slice().reverse();
  }

  public recordChange(projectId: string, description: string, filesChanged: string[], diffSummary: string, snapshot?: Record<string, string>): ProjectChange {
    const list = this.changes.get(projectId) || [];
    const change: ProjectChange = {
      id: 'chg_' + Math.random().toString(36).substring(2, 9),
      projectId,
      description,
      filesChanged,
      diffSummary,
      canRevert: true,
      createdAt: new Date().toISOString(),
      snapshot,
    };
    list.push(change);
    this.changes.set(projectId, list);
    return change;
  }

  public revertChange(projectId: string, changeId: string): boolean {
    const list = this.changes.get(projectId) || [];
    const change = list.find(c => c.id === changeId);
    if (!change || !change.snapshot) return false;

    // Restore files from snapshot
    const projectFiles = this.files.get(projectId);
    if (!projectFiles) return false;

    for (const [path, content] of Object.entries(change.snapshot)) {
      this.saveFile(projectId, path, content);
    }

    // Mark as reverted
    change.canRevert = false;
    return true;
  }

  // Settings
  public getSettings(): QwenSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<QwenSettings>): QwenSettings {
    this.settings = { ...this.settings, ...newSettings };
    return { ...this.settings };
  }
}

export const store = new DataStore();
