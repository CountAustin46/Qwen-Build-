import { store } from '../db/store.ts';
import { Project, ProjectFile, Build, ProjectChange, Message } from '../../types/index.ts';

export interface SelectedProjectContext {
  project: {
    id: string;
    name: string;
    description: string;
    framework: string;
    status: string;
  };
  fileTreeOverview: string[];
  relevantFiles: { path: string; content: string }[];
  recentErrors: string[];
  recentChanges: { description: string; files: string[] }[];
  recentMessages: { role: string; content: string }[];
}

export class ContextEngine {
  public selectContext(projectId: string, userQuery: string): SelectedProjectContext {
    const project = store.getProject(projectId);
    const files = store.getFiles(projectId);
    const latestBuild = store.getLatestBuild(projectId);
    const changes = store.getChanges(projectId);
    const messages = store.getMessages(projectId);

    // 1. File tree overview (names only)
    const fileTreeOverview = files.map(f => f.path);

    // 2. Intelligent file relevance selection
    // Rather than sending all files (which could be megabytes), select the files most likely relevant to query
    const relevantFiles: { path: string; content: string }[] = [];
    const queryLower = userQuery.toLowerCase();

    // Always include entry point if available and small
    const appFile = files.find(f => f.path === 'src/App.tsx' || f.path === 'App.tsx');
    if (appFile) {
      relevantFiles.push({ path: appFile.path, content: appFile.content });
    }

    // Match files explicitly mentioned in the query
    for (const f of files) {
      if (f.path === appFile?.path) continue;
      const baseName = f.path.split('/').pop()?.toLowerCase() || '';
      if (queryLower.includes(baseName) || (baseName.includes('.') && queryLower.includes(baseName.split('.')[0]))) {
        relevantFiles.push({ path: f.path, content: f.content });
      }
    }

    // If query mentions dependencies or packages, include package.json
    if (queryLower.includes('package') || queryLower.includes('dependency') || queryLower.includes('install')) {
      const pkg = files.find(f => f.path === 'package.json');
      if (pkg && !relevantFiles.some(r => r.path === 'package.json')) {
        relevantFiles.push({ path: pkg.path, content: pkg.content });
      }
    }

    // 3. Recent errors if build failed
    const recentErrors: string[] = [];
    if (latestBuild && latestBuild.errors.length > 0) {
      for (const err of latestBuild.errors) {
        recentErrors.push(`${err.file}:${err.line}:${err.column} - ${err.code || 'ERR'}: ${err.message}`);
      }
    }

    // 4. Recent changes (max 2)
    const recentChanges = changes.slice(0, 2).map(c => ({
      description: c.description,
      files: c.filesChanged,
    }));

    // 5. Recent conversation turns (max 4)
    const recentMessages = messages.slice(-4).map(m => ({
      role: m.role,
      content: m.content.slice(0, 600),
    }));

    return {
      project: {
        id: project?.id || projectId,
        name: project?.name || 'Untitled',
        description: project?.description || '',
        framework: project?.framework || 'react-ts',
        status: project?.status || 'idle',
      },
      fileTreeOverview,
      relevantFiles,
      recentErrors,
      recentChanges,
      recentMessages,
    };
  }
}

export const contextEngine = new ContextEngine();
