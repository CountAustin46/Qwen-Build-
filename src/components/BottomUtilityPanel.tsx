import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  AlertTriangle,
  ScrollText,
  GitCommit,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  Wrench,
} from 'lucide-react';
import { Build, BuildLog, BuildError, ProjectChange, TerminalLine } from '../types/index.ts';
import { useLayout } from '../context/LayoutContext.tsx';

interface BottomUtilityPanelProps {
  projectId: string;
  latestBuild?: Build;
  changes: ProjectChange[];
  onRevertChange: (changeId: string) => void;
  onSelectFileAndLine: (file: string, line: number) => void;
  onTriggerRepair: () => void;
  onExecuteCommand: (cmd: string) => Promise<string>;
  onClose?: () => void;
  isMaximized?: boolean;
}

export const BottomUtilityPanel: React.FC<BottomUtilityPanelProps> = ({
  projectId,
  latestBuild,
  changes,
  onRevertChange,
  onSelectFileAndLine,
  onTriggerRepair,
  onExecuteCommand,
}) => {
  const { bottomPanelHeight, isDraggingSplitter, isMobile } = useLayout();
  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'logs' | 'changes'>('terminal');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    {
      id: 'l1',
      type: 'system',
      text: 'Qwen Build Isolated Virtual Sandbox shell initialized.',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'l2',
      type: 'system',
      text: 'Type "help" to see available commands or "npm run build" to trigger compilation.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'terminal') {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines, activeTab]);

  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const inputLine: TerminalLine = {
      id: 'in_' + Date.now(),
      type: 'input',
      text: cmd,
      timestamp: new Date().toISOString(),
    };

    setHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setTerminalInput('');

    if (cmd === 'clear') {
      setTerminalLines([]);
      return;
    }

    if (cmd === 'help') {
      setTerminalLines(prev => [
        ...prev,
        inputLine,
        {
          id: 'out_' + Date.now(),
          type: 'output',
          text: `Qwen Build Sandbox Shell commands:\n  help            Show this reference manual\n  clear           Clear terminal output\n  npm run build   Run TypeScript virtual compiler\n  npm test        Run vitest test suites\n  ls              List files in project\n  cat <file>      Display file contents\n  git status      Check uncommitted changes\n  git diff        Show unified diff of recent changes\n  qwen repair     Trigger autonomous error repair loop\n  node -v         Show runtime version`,
          timestamp: new Date().toISOString(),
        },
      ]);
      return;
    }

    if (cmd === 'qwen repair') {
      setTerminalLines(prev => [
        ...prev,
        inputLine,
        {
          id: 'out_' + Date.now(),
          type: 'output',
          text: 'Starting Qwen Error Repair Loop...',
          timestamp: new Date().toISOString(),
        },
      ]);
      onTriggerRepair();
      return;
    }

    setTerminalLines(prev => [...prev, inputLine]);

    const output = await onExecuteCommand(cmd);
    setTerminalLines(prev => [
      ...prev,
      {
        id: 'out_' + Date.now(),
        type: 'output',
        text: output,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleTerminalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setTerminalInput(history[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setTerminalInput('');
      } else {
        setHistoryIndex(nextIndex);
        setTerminalInput(history[nextIndex]);
      }
    }
  };

  const errors = latestBuild?.errors || [];
  const logs = latestBuild?.logs || [];

  const computedHeight = isCollapsed
    ? 36
    : isMaximized
    ? Math.max(380, Math.round(window.innerHeight * 0.65))
    : isMobile
    ? Math.min(bottomPanelHeight, 260)
    : bottomPanelHeight;

  return (
    <div
      style={{
        height: `${computedHeight}px`,
        transition: isDraggingSplitter ? 'none' : 'height 0.18s ease-out',
      }}
      className="border-t border-[#21262d] bg-[#0e1015] flex flex-col shrink-0 select-none w-full relative z-10"
    >
      {/* Panel Tab Header */}
      <div className="h-9 px-2 sm:px-3 bg-[#0e1015] border-b border-[#21262d] flex items-center justify-between text-xs shrink-0 gap-2">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none py-1">
          {/* Terminal Tab */}
          <button
            onClick={() => {
              setActiveTab('terminal');
              setIsCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs transition-colors font-medium cursor-pointer shrink-0 ${
              activeTab === 'terminal' && !isCollapsed
                ? 'bg-[#161b22] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Terminal</span>
          </button>

          {/* Problems Tab */}
          <button
            onClick={() => {
              setActiveTab('problems');
              setIsCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs transition-colors font-medium cursor-pointer shrink-0 ${
              activeTab === 'problems' && !isCollapsed
                ? 'bg-[#161b22] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${errors.length > 0 ? 'text-[#e11d48]' : 'text-[#8b949e]'}`} />
            <span>Problems</span>
            {errors.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#e11d48] text-white font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                {errors.length}
              </span>
            )}
          </button>

          {/* Build Logs Tab */}
          <button
            onClick={() => {
              setActiveTab('logs');
              setIsCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs transition-colors font-medium cursor-pointer shrink-0 ${
              activeTab === 'logs' && !isCollapsed
                ? 'bg-[#161b22] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" />
            <span>Logs</span>
            {logs.length > 0 && (
              <span className="font-mono text-[10px] sm:text-[11px] text-[#8b949e]">({logs.length})</span>
            )}
          </button>

          {/* Changes Tab */}
          <button
            onClick={() => {
              setActiveTab('changes');
              setIsCollapsed(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded text-xs transition-colors font-medium cursor-pointer shrink-0 ${
              activeTab === 'changes' && !isCollapsed
                ? 'bg-[#161b22] text-white border border-[#30363d]'
                : 'text-[#8b949e] hover:text-[#c9d1d9]'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5 shrink-0" />
            <span>Changes</span>
            {changes.length > 0 && (
              <span className="font-mono text-[10px] sm:text-[11px] text-[#8b949e]">({changes.length})</span>
            )}
          </button>
        </div>

        {/* Panel Actions: Maximize & Collapse */}
        <div className="flex items-center gap-1 shrink-0">
          {!isCollapsed && (
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer hidden sm:flex"
              title={isMaximized ? 'Restore height' : 'Maximize height'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className="flex-1 bg-[#090b0e] overflow-hidden flex flex-col font-mono text-xs w-full">
          {/* TAB 1: TERMINAL EMULATOR */}
          {activeTab === 'terminal' && (
            <div className="flex-1 flex flex-col p-2 sm:p-3 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-1.5 select-text">
                {terminalLines.map(line => (
                  <div key={line.id} className="leading-relaxed">
                    {line.type === 'input' ? (
                      <div className="flex items-center gap-1.5 text-white">
                        <span className="text-[#e11d48] font-bold shrink-0">
                          <span className="hidden sm:inline">qwen@workspace:~</span>$
                        </span>
                        <span className="break-all">{line.text}</span>
                      </div>
                    ) : line.type === 'system' ? (
                      <div className="text-[#8b949e]">{line.text}</div>
                    ) : (
                      <pre className="text-[#c9d1d9] whitespace-pre-wrap font-mono break-all sm:break-normal">
                        {line.text}
                      </pre>
                    )}
                  </div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Terminal Command Line Input */}
              <form onSubmit={handleTerminalSubmit} className="pt-2 flex items-center gap-1.5 border-t border-[#21262d] shrink-0">
                <span className="text-[#e11d48] font-bold shrink-0">
                  <span className="hidden sm:inline">qwen@workspace:~</span>$
                </span>
                <input
                  type="text"
                  value={terminalInput}
                  onChange={e => setTerminalInput(e.target.value)}
                  onKeyDown={handleTerminalKeyDown}
                  placeholder="Type: ls, npm run build, qwen repair, npm test..."
                  className="flex-1 bg-transparent text-white focus:outline-none font-mono text-xs min-w-0"
                />
              </form>
            </div>
          )}

          {/* TAB 2: PROBLEMS */}
          {activeTab === 'problems' && (
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
              {errors.length === 0 ? (
                <div className="p-4 text-center text-[#8b949e]">
                  <p>Zero diagnostics detected. Project workspace is clean.</p>
                </div>
              ) : (
                errors.map((err, i) => (
                  <div
                    key={i}
                    onClick={() => onSelectFileAndLine(err.file, err.line)}
                    className="p-2 sm:p-2.5 rounded bg-[#161b22] border border-[#30363d] hover:border-[#e11d48]/50 cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-[#e11d48] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">{err.file}</span>
                          <span className="text-[#8b949e]">Line {err.line}:{err.column}</span>
                          {err.code && (
                            <span className="px-1.5 py-0.2 rounded bg-[#e11d48]/20 text-[#ff6b81] text-[10px]">
                              {err.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[#c9d1d9] mt-1 text-[11px] leading-relaxed break-words">
                          {err.message}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onTriggerRepair();
                      }}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-[#e11d48] hover:bg-[#e11d48]/90 text-white text-[11px] font-medium transition-colors cursor-pointer shrink-0 self-end sm:self-auto"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Repair with Qwen</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: BUILD LOGS */}
          {activeTab === 'logs' && (
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 select-text">
              {logs.length === 0 ? (
                <div className="p-4 text-center text-[#8b949e]">
                  No build output logged yet. Run a build to see output.
                </div>
              ) : (
                logs.map(l => (
                  <div key={l.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[#484f58] text-[10px] shrink-0">
                      {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold shrink-0 ${
                        l.level === 'error'
                          ? 'text-[#e11d48]'
                          : l.level === 'warn'
                          ? 'text-amber-400'
                          : l.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-blue-400'
                      }`}
                    >
                      [{l.level}]
                    </span>
                    <span className="text-[#c9d1d9] break-all sm:break-normal">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: CHANGES */}
          {activeTab === 'changes' && (
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2">
              {changes.length === 0 ? (
                <div className="p-4 text-center text-[#8b949e]">
                  No modifications recorded yet.
                </div>
              ) : (
                changes.map(chg => (
                  <div
                    key={chg.id}
                    className="p-2.5 rounded bg-[#161b22] border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium truncate">{chg.description}</span>
                        <span className="text-[10px] text-[#8b949e]">
                          {new Date(chg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#8b949e] flex-wrap">
                        <span className="truncate">Files: {chg.filesChanged.join(', ')}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 font-mono">{chg.diffSummary}</span>
                      </div>
                    </div>

                    {chg.canRevert && (
                      <button
                        onClick={() => onRevertChange(chg.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white border border-[#30363d] text-[11px] font-medium transition-colors shrink-0 self-end sm:self-auto cursor-pointer"
                        title="Revert these changes"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert</span>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
