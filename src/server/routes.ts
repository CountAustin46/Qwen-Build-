import { Router, Request, Response } from 'express';
import { store } from './db/store.ts';
import { fileService } from './services/fileService.ts';
import { buildService } from './services/buildService.ts';
import { qwenGateway } from './services/qwenGateway.ts';
import { toolOrchestrator } from './services/toolOrchestrator.ts';
import { executionService } from './services/executionService.ts';
import { repairService } from './services/repairService.ts';
import { changeService } from './services/changeService.ts';
import { authService } from './services/authService.ts';
import { usageService } from './services/usageService.ts';

const router = Router();

// Middleware: simulate user authentication & ownership verification
router.use((req, res, next) => {
  const user = authService.getCurrentUser();
  (req as any).user = user;
  next();
});

// --- Projects ---
router.get('/projects', (req: Request, res: Response) => {
  const projects = store.getProjects();
  res.json({ success: true, projects });
});

router.post('/projects', (req: Request, res: Response) => {
  const { name, description, framework } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, error: 'Project name is required' });
  }

  const project = store.createProject(name, description || '', framework || 'react-ts');

  // Populate starter files
  fileService.writeFile(
    project.id,
    'package.json',
    JSON.stringify(
      {
        name: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version: '1.0.0',
        private: true,
        dependencies: {
          react: '^19.0.0',
          'react-dom': '^19.0.0',
          'lucide-react': '^0.546.0',
        },
      },
      null,
      2
    )
  );

  fileService.writeFile(
    project.id,
    'src/App.tsx',
    `import React, { useState } from 'react';
import { Sparkles, Layers, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between pb-6 border-b border-[#30363d]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#e11d48]/10 border border-[#e11d48]/30 flex items-center justify-center text-[#e11d48]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">${name}</h1>
              <p className="text-xs text-[#8b949e]">${description || 'Generated with Qwen Build'}</p>
            </div>
          </div>
        </header>

        <main className="p-6 rounded-lg bg-[#161b22] border border-[#30363d] space-y-4">
          <p className="text-sm text-[#8b949e]">
            Your new application is online. Instruct Qwen in the right panel to build custom views, database logic, or interactive features.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setCount(c => c + 1)}
              className="px-4 py-2 rounded-md bg-[#e11d48] text-white text-xs font-medium hover:bg-[#e11d48]/90 transition-colors"
            >
              Interactive Counter: {count}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
`
  );

  // Initial build
  buildService.runBuild(project.id, 'init');

  res.json({ success: true, project });
});

router.get('/projects/:id', (req: Request, res: Response) => {
  const project = store.getProject(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
  res.json({ success: true, project });
});

router.delete('/projects/:id', (req: Request, res: Response) => {
  const success = store.deleteProject(req.params.id);
  res.json({ success });
});

// --- Files ---
router.get('/projects/:id/files', (req: Request, res: Response) => {
  const files = fileService.listFiles(req.params.id);
  const tree = fileService.buildTree(files);
  res.json({ success: true, files, tree });
});

router.get('/projects/:id/files/content', (req: Request, res: Response) => {
  const path = req.query.path as string;
  if (!path) return res.status(400).json({ success: false, error: 'Query parameter path required' });
  const file = fileService.readFile(req.params.id, path);
  if (!file) return res.status(404).json({ success: false, error: 'File not found' });
  res.json({ success: true, file });
});

router.post('/projects/:id/files', (req: Request, res: Response) => {
  const { path, content, target_content, replacement_content } = req.body;
  if (!path) return res.status(400).json({ success: false, error: 'Path is required' });

  if (target_content !== undefined && replacement_content !== undefined) {
    const editRes = fileService.editFile(req.params.id, path, target_content, replacement_content);
    if (!editRes.success) return res.status(400).json(editRes);
    return res.json({ success: true, file: editRes.file });
  }

  if (content === undefined) return res.status(400).json({ success: false, error: 'Content required' });
  const file = fileService.writeFile(req.params.id, path, content);
  res.json({ success: true, file });
});

router.delete('/projects/:id/files', (req: Request, res: Response) => {
  const path = req.query.path as string;
  if (!path) return res.status(400).json({ success: false, error: 'Path required' });
  const deleted = fileService.deleteFile(req.params.id, path);
  res.json({ success: deleted });
});

// --- Qwen Chat & Instruction ---
router.get('/projects/:id/messages', (req: Request, res: Response) => {
  const messages = store.getMessages(req.params.id);
  res.json({ success: true, messages });
});

router.post('/projects/:id/chat', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ success: false, error: 'Prompt is required' });

  const projectId = req.params.id;

  // Add user message to store
  store.addMessage(projectId, 'user', prompt);

  // Set up SSE streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await qwenGateway.processInstruction(projectId, prompt, {
      onThought: thoughtChunk => {
        sendEvent('thought', { chunk: thoughtChunk });
      },
      onContent: contentChunk => {
        sendEvent('content', { chunk: contentChunk });
      },
      onToolCall: toolCall => {
        sendEvent('tool_call', { toolCall });
      },
      onDone: fullMessage => {
        sendEvent('done', { message: fullMessage });
        res.end();
      },
      onError: err => {
        sendEvent('error', { error: err.message });
        res.end();
      },
    });
  } catch (err: any) {
    sendEvent('error', { error: err.message || 'Processing failed' });
    res.end();
  }
});

// --- Direct Tool Execution ---
router.get('/tools', (req: Request, res: Response) => {
  res.json({ success: true, tools: toolOrchestrator.getToolDefinitions() });
});

router.post('/projects/:id/tools/execute', async (req: Request, res: Response) => {
  const { toolName, input } = req.body;
  if (!toolName) return res.status(400).json({ success: false, error: 'toolName is required' });

  const result = await toolOrchestrator.executeTool(req.params.id, toolName, input || {});
  res.json({ success: result.status === 'success', result });
});

// --- Builds ---
router.post('/projects/:id/build', async (req: Request, res: Response) => {
  const { trigger } = req.body;
  const build = await buildService.runBuild(req.params.id, trigger || 'manual');
  res.json({ success: true, build });
});

router.get('/projects/:id/build/status', (req: Request, res: Response) => {
  const build = store.getLatestBuild(req.params.id);
  const project = store.getProject(req.params.id);
  res.json({ success: true, build, status: project?.status || 'idle' });
});

router.get('/projects/:id/builds', (req: Request, res: Response) => {
  const builds = store.getBuilds(req.params.id);
  res.json({ success: true, builds });
});

// --- Live Preview ---
router.get('/projects/:id/preview', (req: Request, res: Response) => {
  const html = buildService.generatePreviewHtml(req.params.id);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// --- Error Repair Loop ---
router.post('/projects/:id/repair', async (req: Request, res: Response) => {
  const projectId = req.params.id;

  // Stream repair steps via SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await repairService.executeRepairLoop(projectId, step => {
      sendEvent('step', { step });
    });

    sendEvent('complete', result);
    res.end();
  } catch (err: any) {
    sendEvent('error', { error: err.message });
    res.end();
  }
});

// Inject test error endpoint (allows testing repair loop)
router.post('/projects/:id/inject-error', (req: Request, res: Response) => {
  const injected = repairService.injectTestError(req.params.id);
  res.json({ success: injected });
});

// --- Terminal ---
router.post('/projects/:id/terminal', async (req: Request, res: Response) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ success: false, error: 'Command required' });

  const result = await executionService.executeCommand(req.params.id, command);
  res.json({ success: true, result });
});

// --- Changes ---
router.get('/projects/:id/changes', (req: Request, res: Response) => {
  const changes = changeService.getChanges(req.params.id);
  res.json({ success: true, changes });
});

router.post('/projects/:id/revert', (req: Request, res: Response) => {
  const { changeId } = req.body;
  if (!changeId) return res.status(400).json({ success: false, error: 'changeId required' });

  const reverted = changeService.revertChange(req.params.id, changeId);
  // Re-run build after revert
  buildService.runBuild(req.params.id, 'revert');

  res.json({ success: reverted });
});

// --- Settings & Usage ---
router.get('/settings', (req: Request, res: Response) => {
  const settings = store.getSettings();
  // Mask API key for security
  const masked = {
    ...settings,
    apiKey: settings.apiKey ? `${settings.apiKey.slice(0, 4)}...${settings.apiKey.slice(-4)}` : undefined,
    hasServerKey: !!(process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY),
  };
  res.json({ success: true, settings: masked });
});

router.post('/settings', (req: Request, res: Response) => {
  const updated = store.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

router.get('/projects/:id/usage', (req: Request, res: Response) => {
  const usage = usageService.getProjectUsage(req.params.id);
  res.json({ success: true, usage });
});

export default router;
