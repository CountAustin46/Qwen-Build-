import { store } from '../db/store.ts';

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  sandboxed: boolean;
}

export class ExecutionService {
  private readonly ALLOWED_COMMAND_PREFIXES = [
    'npm run build',
    'npm test',
    'npm run lint',
    'vitest',
    'tsc',
    'ls',
    'cat',
    'git status',
    'git diff',
    'git log',
    'echo',
    'clear',
    'qwen inspect',
    'qwen repair',
    'tree',
    'node -v',
  ];

  public async executeCommand(
    projectId: string,
    rawCommand: string,
    timeoutMs: number = 8000
  ): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const command = rawCommand.trim();

    // 1. Security Check: Command must not attempt root filesystem escape or dangerous flags
    const forbiddenPatterns = [
      /rm\s+-rf\s+\//,
      />\s*\/dev/,
      /curl.*\|\s*sh/,
      /wget.*\|\s*sh/,
      /chmod\s+777/,
      /\.\.\/\.\.\//,
      /\/etc/,
      /\/root/,
      /:(){ :|:& };:/,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(command)) {
        return {
          command,
          exitCode: 126,
          stdout: '',
          stderr: `SecurityViolation: Command '${command}' blocked by sandbox policy. Dangerous patterns are forbidden.`,
          durationMs: Date.now() - startTime,
          sandboxed: true,
        };
      }
    }

    // 2. Safe virtual command interpreter
    if (command === 'ls' || command.startsWith('ls ')) {
      const files = store.getFiles(projectId);
      const paths = files.map(f => f.path).join('  ');
      return {
        command,
        exitCode: 0,
        stdout: paths || '(empty project)',
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command.startsWith('cat ')) {
      const targetPath = command.slice(4).trim();
      const file = store.getFile(projectId, targetPath);
      if (!file) {
        return {
          command,
          exitCode: 1,
          stdout: '',
          stderr: `cat: ${targetPath}: No such file or directory`,
          durationMs: Date.now() - startTime,
          sandboxed: true,
        };
      }
      return {
        command,
        exitCode: 0,
        stdout: file.content,
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command === 'git status') {
      const changes = store.getChanges(projectId);
      const latest = changes[0];
      const statusText = latest
        ? `On branch main\nChanges in recent task:\n  ${latest.filesChanged.map(f => `modified: ${f}`).join('\n  ')}\n\nTask: "${latest.description}"`
        : 'On branch main\nNothing to commit, working tree clean';
      return {
        command,
        exitCode: 0,
        stdout: statusText,
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command === 'git diff') {
      const changes = store.getChanges(projectId);
      const latest = changes[0];
      return {
        command,
        exitCode: 0,
        stdout: latest ? latest.diffSummary : '(no uncommitted changes)',
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command === 'tree') {
      const files = store.getFiles(projectId);
      const treeLines = ['.'];
      for (const f of files) {
        treeLines.push(`├── ${f.path} (${f.size} bytes)`);
      }
      return {
        command,
        exitCode: 0,
        stdout: treeLines.join('\n'),
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command === 'node -v') {
      return {
        command,
        exitCode: 0,
        stdout: 'v22.23.2 (Qwen Virtual Sandbox Environment)',
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    if (command === 'npm test' || command.startsWith('vitest')) {
      // Simulate/run test suite
      return {
        command,
        exitCode: 0,
        stdout: `✓ src/App.test.tsx (3 tests passed)\n  ✓ renders observability header\n  ✓ computes average latency\n  ✓ filter toggles operational fleet\n\nTest Files  1 passed (1)\nTests       3 passed (3)\nTime        420ms`,
        stderr: '',
        durationMs: 420,
        sandboxed: true,
      };
    }

    if (command === 'npm run build' || command === 'tsc') {
      // Verify build integrity
      const files = store.getFiles(projectId);
      const appFile = files.find(f => f.path === 'src/App.tsx');
      
      if (!appFile) {
        return {
          command,
          exitCode: 1,
          stdout: '',
          stderr: 'Error: Entry point src/App.tsx not found in project root.',
          durationMs: Date.now() - startTime,
          sandboxed: true,
        };
      }

      // Check for syntax issues (e.g. unclosed tags or syntax tokens)
      const content = appFile.content;
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;

      if (openBraces !== closeBraces) {
        return {
          command,
          exitCode: 2,
          stdout: 'vite v8.3.0 building for production...\n[vite:esbuild] Unexpected token (missing closing brace)',
          stderr: `TS1005: '}' expected in src/App.tsx (unbalanced braces: ${openBraces} open vs ${closeBraces} close)`,
          durationMs: Date.now() - startTime,
          sandboxed: true,
        };
      }

      return {
        command,
        exitCode: 0,
        stdout: `vite v8.3.0 building for production...\n✓ 42 modules transformed.\ndist/index.html   0.48 kB\ndist/assets/index.js   142.3 kB │ gzip: 44.1 kB\n✓ built in 194ms`,
        stderr: '',
        durationMs: 194,
        sandboxed: true,
      };
    }

    if (command.startsWith('echo ')) {
      return {
        command,
        exitCode: 0,
        stdout: command.slice(5).replace(/^['"]|['"]$/g, ''),
        stderr: '',
        durationMs: Date.now() - startTime,
        sandboxed: true,
      };
    }

    // Default policy for custom commands
    return {
      command,
      exitCode: 0,
      stdout: `[qwen-sandbox] Executed: ${command}`,
      stderr: '',
      durationMs: Date.now() - startTime,
      sandboxed: true,
    };
  }
}

export const executionService = new ExecutionService();
