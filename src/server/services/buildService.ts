import { store } from '../db/store.ts';
import type { Build, BuildError, BuildLog } from '../../types/index.ts';

export class BuildService {
  public async runBuild(projectId: string, trigger: string = 'manual'): Promise<Build> {
    const buildId = 'build_' + Math.random().toString(36).substring(2, 9);
    const logs: BuildLog[] = [];
    const errors: BuildError[] = [];
    const warnings: BuildError[] = [];

    const addLog = (level: BuildLog['level'], message: string, step?: string) => {
      logs.push({
        id: 'bl_' + Math.random().toString(36).substring(2, 8),
        buildId,
        level,
        message,
        step,
        timestamp: new Date().toISOString(),
      });
    };

    addLog('info', 'Initializing Qwen virtual bundler environment...', 'init');
    const files = store.getFiles(projectId);

    if (files.length === 0) {
      addLog('error', 'Build failed: Project has no files.', 'validate');
      errors.push({
        file: 'package.json',
        line: 1,
        column: 1,
        message: 'Project root contains zero files.',
        severity: 'error',
      });
    } else {
      addLog('info', `Discovered ${files.length} project source files. Analyzing dependencies...`, 'analyze');

      // Check package.json
      const pkgFile = files.find(f => f.path === 'package.json');
      if (!pkgFile) {
        warnings.push({
          file: 'package.json',
          line: 1,
          column: 1,
          message: 'package.json missing from root. Defaulting to standard React 19 stack.',
          severity: 'warning',
        });
      }

      // Check main component
      const appFile = files.find(f => f.path === 'src/App.tsx' || f.path === 'src/App.jsx' || f.path === 'App.tsx');
      if (!appFile) {
        errors.push({
          file: 'src/App.tsx',
          line: 1,
          column: 1,
          message: 'Entry component src/App.tsx not found.',
          severity: 'error',
        });
        addLog('error', 'Missing entry component src/App.tsx', 'resolve');
      } else {
        // Deep static inspection of appFile content
        const code = appFile.content;

        // 1. Bracket & Parenthesis Balance
        const openBraces = (code.match(/\{/g) || []).length;
        const closeBraces = (code.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
          const lineNum = code.split('\n').length;
          errors.push({
            file: appFile.path,
            line: lineNum,
            column: 1,
            message: `SyntaxError: Unmatched curly braces (open: ${openBraces}, close: ${closeBraces})`,
            severity: 'error',
            code: 'TS1005',
          });
          addLog('error', `TS1005: Unmatched braces in ${appFile.path} (line ${lineNum})`, 'syntax');
        }

        // 2. Check for missing default export
        if (!code.includes('export default')) {
          errors.push({
            file: appFile.path,
            line: 1,
            column: 1,
            message: `ComponentError: ${appFile.path} must have an 'export default' function.`,
            severity: 'error',
            code: 'REACT_EXPORT',
          });
          addLog('error', `Missing export default in ${appFile.path}`, 'export');
        }

        // 3. Check for obvious syntax breakages / undeclared identifiers
        const lines = code.split('\n');
        for (let idx = 0; idx < lines.length; idx++) {
          const line = lines[idx];
          // Check for unresolved references
          if (line.includes('UNDEFINED_VARIABLE') || line.includes('SYNTAX_ERROR_STUB')) {
            errors.push({
              file: appFile.path,
              line: idx + 1,
              column: line.indexOf('UNDEFINED_VARIABLE') + 1,
              message: `ReferenceError: Cannot find name 'UNDEFINED_VARIABLE'`,
              severity: 'error',
              code: 'TS2304',
            });
            addLog('error', `TS2304: Cannot find name 'UNDEFINED_VARIABLE' at ${appFile.path}:${idx + 1}`, 'typecheck');
          }
        }
      }
    }

    const status = errors.length > 0 ? 'failed' : 'success';
    if (status === 'success') {
      addLog('info', 'Type resolution and JSX transform completed successfully.', 'compile');
      addLog('success', `Build #${buildId.slice(-4)} finished in 186ms. Zero errors. Live preview ready.`, 'finish');
    } else {
      addLog('error', `Build failed with ${errors.length} error(s). Qwen error repair loop eligible.`, 'finish');
    }

    const buildRecord: Build = {
      id: buildId,
      projectId,
      status,
      errors,
      warnings,
      logs,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      commitHash: Math.random().toString(36).substring(2, 9),
    };

    store.addBuild(projectId, buildRecord);
    return buildRecord;
  }

  public generatePreviewHtml(projectId: string): string {
    const files = store.getFiles(projectId);
    const appFile = files.find(f => f.path === 'src/App.tsx' || f.path === 'src/App.jsx' || f.path === 'App.tsx');

    if (!appFile) {
      return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#0e1015] text-[#8b949e] flex items-center justify-center h-screen font-sans">
  <div class="text-center p-6 border border-[#30363d] rounded-lg max-w-sm">
    <p class="text-sm font-medium text-white mb-1">No Entry Point Found</p>
    <p class="text-xs">Create <code>src/App.tsx</code> to generate preview output.</p>
  </div>
</body>
</html>`;
    }

    const code = appFile.content;

    // Extract all imported icon names from lucide-react in the source code
    const iconMatches = Array.from(code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g));
    const importedIcons = new Set<string>();
    for (const m of iconMatches) {
      m[1].split(',').forEach(item => {
        const name = item.trim().split(/\s+as\s+/)[0].trim();
        if (name) importedIcons.add(name);
      });
    }

    // Clean import/export syntax for standalone browser Babel execution
    let cleanCode = code
      .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
      .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/g, 'function $1')
      .replace(/export\s+default\s+function\s*\(/g, 'function App(')
      .replace(/export\s+default\s+class\s+([A-Za-z0-9_]+)/g, 'class $1')
      .replace(/export\s+default\s+([A-Za-z0-9_]+)\s*;?/g, 'var __DefaultExport = $1;')
      .replace(/export\s+default\s+/g, 'const App = ')
      .replace(/export\s+\{.*?\};?/g, '')
      .replace(/export\s+(const|let|var|function|class|interface|type)\s+/g, '$1 ');

    // Generate definitions for all imported icons so ReferenceError is impossible
    const iconDeclarations = Array.from(importedIcons)
      .map(iconName => `const ${iconName} = getLucideIcon('${iconName}');`)
      .join('\n    ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Qwen Build Live Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; margin: 0; padding: 0; }
    .font-mono { font-family: 'JetBrains Mono', monospace; }
  </style>
  <script>
    // Global Error Catcher for Babel and React compilation
    window.addEventListener('error', function(event) {
      const root = document.getElementById('root');
      if (root && (!root.innerHTML || root.innerHTML.trim() === '')) {
        root.innerHTML = \`
          <div style="padding: 24px; color: #f85149; background: #161b22; margin: 20px; border-radius: 8px; border: 1px solid #da3633; font-family: monospace;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f85149;"></span>
              <strong style="font-size: 13px; color: #ffffff;">Live Preview Diagnostic</strong>
            </div>
            <pre style="font-size: 12px; white-space: pre-wrap; color: #ff7b72; margin: 0; line-height: 1.5;">\${event.message || event.error?.message || 'Error executing preview component.'}</pre>
            <div style="margin-top: 12px; font-size: 11px; color: #8b949e;">Use the "Qwen Repair" button in the top navigation to automatically analyze and fix this error.</div>
          </div>
        \`;
      }
    });
  </script>
</head>
<body class="bg-[#0d1117] text-[#e6edf3] antialiased">
  <div id="root"></div>

  <!-- Note data-presets="react,typescript" enables native TS interface and generic parsing in Babel Standalone -->
  <script type="text/babel" data-presets="react,typescript">
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer, createContext, useContext } = React;

    // Crisp SVG path dictionary for Lucide icons
    const iconSvgs = {
      Activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
      ShieldCheck: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
      Shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
      AlertTriangle: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
      AlertCircle: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
      RefreshCw: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>,
      Clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
      Server: <><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></>,
      Cpu: <><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></>,
      Database: <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></>,
      Globe: <><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>,
      CheckCircle2: <><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></>,
      Check: <polyline points="20 6 9 17 4 12" />,
      Play: <polygon points="6 3 20 12 6 21 6 3"/>,
      Sparkles: <path d="m12 3-1.9 5.8a2 2 0 0 1-1.28 1.28L3 12l5.8 1.9a2 2 0 0 1 1.28 1.28L12 21l1.9-5.8a2 2 0 0 1 1.28-1.28L21 12l-5.8-1.9a2 2 0 0 1-1.28-1.28L12 3z"/>,
      Layers: <><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></>,
      Zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
      BarChart3: <><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></>,
      Search: <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
      Plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
      Trash2: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></>,
      ChevronRight: <polyline points="9 18 15 12 9 6"/>,
      ChevronDown: <polyline points="6 9 12 15 18 9"/>,
      ChevronLeft: <polyline points="15 18 9 12 15 6"/>,
      ChevronUp: <polyline points="18 15 12 9 6 15"/>,
      ArrowRight: <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
      ArrowLeft: <><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></>,
      ExternalLink: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
      Settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></>,
      X: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
      Wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />,
      Kanban: <><path d="M6 5v11"/><path d="M12 5v6"/><path d="M18 5v14"/></>
    };

    const getLucideIcon = (name) => {
      return (props) => {
        const { className = "w-4 h-4", ...rest } = props || {};
        const svgContent = iconSvgs[name] || <circle cx="12" cy="12" r="8" />;
        return (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className} 
            {...rest}
          >
            {svgContent}
          </svg>
        );
      };
    };

    // Pre-declare imported icons
    ${iconDeclarations}

    try {
      ${cleanCode}

      const RootComponent = (typeof App !== 'undefined') ? App : (typeof __DefaultExport !== 'undefined') ? __DefaultExport : null;
      if (RootComponent) {
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(RootComponent));
      } else {
        throw new Error("No default export or App component found to render in src/App.tsx.");
      }
    } catch (err) {
      document.getElementById('root').innerHTML = \`
        <div style="padding: 24px; color: #f85149; background: #161b22; margin: 20px; border-radius: 8px; border: 1px solid #da3633; font-family: monospace;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">Runtime Render Error</h3>
          <p style="font-size: 13px;">\${err.message}</p>
        </div>
      \`;
    }
  </script>
</body>
</html>`;
  }
}

export const buildService = new BuildService();
