export interface Project {
  id: string;
  name: string;
  description: string;
  framework: 'react-ts' | 'vite' | 'node';
  status: 'idle' | 'building' | 'running' | 'error' | 'repaired' | 'failed' | 'success' | 'pending';
  currentBuildId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  path: string;
  content: string;
  size: number;
  isBinary?: boolean;
  updatedAt: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  size?: number;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, any>;
  output?: Record<string, any>;
  status: 'running' | 'success' | 'failed';
  error?: string;
  durationMs?: number;
  timestamp: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  toolCalls?: ToolCallRecord[];
  createdAt: string;
}

export interface BuildLog {
  id: string;
  buildId: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  step?: string;
  timestamp: string;
}

export interface BuildError {
  file: string;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface Build {
  id: string;
  projectId: string;
  status: 'pending' | 'building' | 'success' | 'failed' | 'repaired';
  errors: BuildError[];
  warnings: BuildError[];
  logs: BuildLog[];
  startedAt: string;
  completedAt?: string;
  commitHash?: string;
}

export interface ProjectChange {
  id: string;
  projectId: string;
  buildId?: string;
  description: string;
  filesChanged: string[];
  diffSummary: string;
  canRevert: boolean;
  createdAt: string;
  snapshot?: Record<string, string>;
}

export interface RepairStep {
  step: number;
  type: 'detect' | 'inspect' | 'patch' | 'rebuild' | 'success' | 'failed';
  message: string;
  targetFile?: string;
  details?: string;
  timestamp: string;
}

export interface QwenSettings {
  apiKey?: string;
  model: 'qwen-2.5-coder-32b-instruct' | 'qwen-2.5-72b-instruct' | 'qwen-2.5-coder-7b-instruct';
  apiEndpoint?: string;
  autoRepair: boolean;
  maxRepairAttempts: number;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}
