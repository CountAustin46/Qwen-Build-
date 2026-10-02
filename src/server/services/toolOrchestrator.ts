import { store } from '../db/store.ts';
import { fileService } from './fileService.ts';
import { executionService } from './executionService.ts';
import { buildService } from './buildService.ts';
import { ToolCallRecord } from '../../types/index.ts';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

export const QWEN_TOOLS: ToolDefinition[] = [
  {
    name: 'list_files',
    description: 'Lists all files in the project workspace or within a given sub-directory.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path to list (defaults to project root ".")' },
      },
      required: [],
    },
  },
  {
    name: 'read_file',
    description: 'Reads the complete text content of a file in the workspace.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative file path (e.g. "src/App.tsx")' },
        start_line: { type: 'integer', description: 'Optional 1-indexed start line' },
        end_line: { type: 'integer', description: 'Optional 1-indexed end line' },
      },
      required: ['path'],
    },
  },
  {
    name: 'write_file',
    description: 'Creates a new file or completely replaces an existing file with given content.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Target file path (e.g. "src/components/Header.tsx")' },
        content: { type: 'string', description: 'Exact file contents' },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'edit_file',
    description: 'Replaces an exact snippet in an existing file with replacement code.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Target file path' },
        target_content: { type: 'string', description: 'Exact text segment to be replaced' },
        replacement_content: { type: 'string', description: 'New replacement text' },
      },
      required: ['path', 'target_content', 'replacement_content'],
    },
  },
  {
    name: 'create_directory',
    description: 'Creates a new directory in the project structure.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path to create (e.g. "src/components")' },
      },
      required: ['path'],
    },
  },
  {
    name: 'run_command',
    description: 'Executes a sandboxed shell command (e.g. "npm run build", "git status", "ls").',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
      },
      required: ['command'],
    },
  },
  {
    name: 'get_build_errors',
    description: 'Retrieves current compiler and build errors from the most recent build.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'run_tests',
    description: 'Runs project unit tests and test suites in the isolated test sandbox.',
    parameters: {
      type: 'object',
      properties: {
        test_path: { type: 'string', description: 'Optional specific test file path' },
      },
      required: [],
    },
  },
];

export class ToolOrchestrator {
  public getToolDefinitions(): ToolDefinition[] {
    return QWEN_TOOLS;
  }

  public async executeTool(
    projectId: string,
    toolName: string,
    input: Record<string, any>
  ): Promise<ToolCallRecord> {
    const startTime = Date.now();
    const id = 'tc_' + Math.random().toString(36).substring(2, 9);

    try {
      let output: Record<string, any> = {};

      switch (toolName) {
        case 'list_files': {
          const files = fileService.listFiles(projectId);
          const filterPath = input.path && input.path !== '.' ? input.path : '';
          const matched = filterPath
            ? files.filter(f => f.path.startsWith(filterPath)).map(f => f.path)
            : files.map(f => f.path);
          output = { files: matched, total: matched.length };
          break;
        }

        case 'read_file': {
          const path = input.path;
          if (!path) throw new Error("Missing required parameter: 'path'");
          const file = fileService.readFile(projectId, path);
          if (!file) throw new Error(`File not found: '${path}'`);

          let content = file.content;
          const lines = content.split('\n');
          if (input.start_line || input.end_line) {
            const start = Math.max(1, input.start_line || 1) - 1;
            const end = Math.min(lines.length, input.end_line || lines.length);
            content = lines.slice(start, end).join('\n');
          }
          output = { path, content, total_lines: lines.length };
          break;
        }

        case 'write_file': {
          const path = input.path;
          const content = input.content;
          if (!path || content === undefined) throw new Error("Missing 'path' or 'content'");

          const existing = fileService.readFile(projectId, path);
          const oldContent = existing?.content || '';
          
          fileService.writeFile(projectId, path, content);

          // Record snapshot & change
          store.recordChange(
            projectId,
            `Modified ${path}`,
            [path],
            `Updated ${path} (${content.length} bytes)`,
            { [path]: oldContent }
          );

          output = { path, bytes_written: content.length, success: true };
          break;
        }

        case 'edit_file': {
          const { path, target_content, replacement_content } = input;
          if (!path || target_content === undefined || replacement_content === undefined) {
            throw new Error("Missing 'path', 'target_content', or 'replacement_content'");
          }

          const existing = fileService.readFile(projectId, path);
          if (!existing) throw new Error(`File '${path}' does not exist.`);

          const oldContent = existing.content;
          const res = fileService.editFile(projectId, path, target_content, replacement_content);
          if (!res.success) {
            throw new Error(res.error || 'Edit operation failed.');
          }

          // Record change
          store.recordChange(
            projectId,
            `Targeted edit in ${path}`,
            [path],
            `- ${target_content.length} chars, + ${replacement_content.length} chars`,
            { [path]: oldContent }
          );

          output = { path, success: true, diff_summary: `Replaced ${target_content.length} chars` };
          break;
        }

        case 'create_directory': {
          const path = input.path;
          if (!path) throw new Error("Missing 'path'");
          fileService.createDirectory(projectId, path);
          output = { path, success: true };
          break;
        }

        case 'run_command': {
          const command = input.command;
          if (!command) throw new Error("Missing 'command'");
          const execRes = await executionService.executeCommand(projectId, command);
          output = {
            command: execRes.command,
            exit_code: execRes.exitCode,
            stdout: execRes.stdout,
            stderr: execRes.stderr,
          };
          break;
        }

        case 'get_build_errors': {
          const latestBuild = store.getLatestBuild(projectId);
          if (!latestBuild) {
            // Trigger a build
            const build = await buildService.runBuild(projectId, 'qwen_diagnostic');
            output = {
              status: build.status,
              error_count: build.errors.length,
              errors: build.errors,
              logs: build.logs.slice(-5).map(l => l.message),
            };
          } else {
            output = {
              status: latestBuild.status,
              error_count: latestBuild.errors.length,
              errors: latestBuild.errors,
              logs: latestBuild.logs.slice(-5).map(l => l.message),
            };
          }
          break;
        }

        case 'run_tests': {
          const testRes = await executionService.executeCommand(projectId, 'npm test');
          output = {
            passed: testRes.exitCode === 0,
            stdout: testRes.stdout,
            stderr: testRes.stderr,
          };
          break;
        }

        default:
          throw new Error(`Unknown tool: '${toolName}'`);
      }

      return {
        id,
        toolName,
        input,
        output,
        status: 'success',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        id,
        toolName,
        input,
        error: err.message || 'Execution error',
        status: 'failed',
        durationMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const toolOrchestrator = new ToolOrchestrator();
