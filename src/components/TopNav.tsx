import React from 'react';
import {
  Play,
  Wrench,
  Settings,
  Plus,
  AlertCircle,
  Loader2,
  Bug,
  FolderTree,
  MessageSquare,
} from 'lucide-react';
import { Project, Build } from '../types/index.ts';
import { useLayout } from '../context/LayoutContext.tsx';

interface TopNavProps {
  project: Project | null;
  projects: Project[];
  latestBuild?: Build;
  isBuilding: boolean;
  isRepairing: boolean;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onRunBuild: () => void;
  onAutoRepair: () => void;
  onInjectError: () => void;
  onOpenSettings: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  project,
  projects,
  latestBuild,
  isBuilding,
  isRepairing,
  onSelectProject,
  onNewProject,
  onRunBuild,
  onAutoRepair,
  onInjectError,
  onOpenSettings,
}) => {
  const {
    isMobile,
    isDesktop,
    showLeftPanel,
    toggleLeftPanel,
    showRightPanel,
    toggleRightPanel,
    mobileTab,
    setMobileTab,
  } = useLayout();

  const buildStatus = latestBuild?.status || project?.status || 'idle';

  return (
    <header className="h-12 bg-[#0e1015] border-b border-[#21262d] px-2.5 sm:px-4 flex items-center justify-between text-xs select-none shrink-0 z-30 gap-2">
      {/* Zone 1: Brand Wordmark & Project Selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
        {/* Files toggle (tablet/desktop) */}
        {!isMobile && (
          <button
            onClick={toggleLeftPanel}
            className={`p-1.5 rounded transition-colors ${
              showLeftPanel ? 'bg-[#21262d] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
            title="Toggle File Explorer"
          >
            <FolderTree className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Files toggle */}
        {isMobile && (
          <button
            onClick={() => setMobileTab(mobileTab === 'files' ? 'editor' : 'files')}
            className={`p-1.5 rounded transition-colors ${
              mobileTab === 'files' ? 'bg-[#21262d] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
            title="Toggle Files"
          >
            <FolderTree className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <div className="w-5 h-5 rounded bg-[#e11d48] flex items-center justify-center text-white font-mono font-bold text-[11px] shadow-xs">
            Q
          </div>
          <span className="font-semibold text-white tracking-tight text-sm hidden xs:inline sm:inline">
            Qwen Build
          </span>
        </div>

        {/* Project Selector */}
        {project && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#21262d] min-w-0">
            <select
              value={project.id}
              onChange={e => onSelectProject(e.target.value)}
              className="bg-[#161b22] text-[#c9d1d9] border border-[#30363d] rounded px-2 py-0.5 text-xs focus:outline-none focus:border-[#e11d48]/60 cursor-pointer max-w-[110px] sm:max-w-[170px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={onNewProject}
              title="Create New Project"
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Zone 2: Build / Diagnostic Status indicator */}
      <div className="flex items-center justify-center shrink-0">
        {project && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#161b22] border border-[#21262d] text-[11px]">
            {isBuilding || isRepairing ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                <span className="hidden sm:inline">
                  {isRepairing ? 'Qwen Auto-Repairing...' : 'Compiling...'}
                </span>
                <span className="sm:hidden">{isRepairing ? 'Repairing' : 'Building'}</span>
              </div>
            ) : buildStatus === 'success' || buildStatus === 'repaired' ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span>Passing</span>
                {latestBuild?.commitHash && (
                  <span className="hidden md:inline text-[10px] font-mono text-emerald-500">
                    ({latestBuild.commitHash})
                  </span>
                )}
              </div>
            ) : buildStatus === 'failed' || buildStatus === 'error' ? (
              <div className="flex items-center gap-1.5 text-[#e11d48] font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span className="hidden sm:inline">Build Failed ({latestBuild?.errors.length || 1} err)</span>
                <span className="sm:hidden">Failed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[#8b949e]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8b949e] shrink-0"></span>
                <span>Ready</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 3: Primary Action Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {project && (
          <>
            {/* Run Build */}
            <button
              onClick={onRunBuild}
              disabled={isBuilding || isRepairing}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-[#c9d1d9] bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] transition-colors disabled:opacity-50 font-medium shrink-0 cursor-pointer"
              title="Compile and verify project"
            >
              <Play className="w-3 h-3 text-emerald-400 fill-emerald-400/20" />
              <span className="hidden md:inline">Run Build</span>
            </button>

            {/* Qwen Repair Loop Trigger */}
            <button
              onClick={onAutoRepair}
              disabled={isBuilding || isRepairing}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded text-white transition-colors disabled:opacity-50 font-medium shrink-0 cursor-pointer ${
                buildStatus === 'failed' || buildStatus === 'error'
                  ? 'bg-[#e11d48] hover:bg-[#e11d48]/90 animate-pulse'
                  : 'bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d]'
              }`}
              title="Trigger Qwen error repair loop"
            >
              <Wrench className="w-3 h-3" />
              <span className="hidden sm:inline">Qwen Repair</span>
            </button>

            {/* Test Error Injector (for demonstration/testing) */}
            <button
              onClick={onInjectError}
              disabled={isBuilding || isRepairing}
              className="hidden xl:flex items-center gap-1 px-2 py-1 rounded text-[#8b949e] hover:text-amber-400 hover:bg-[#21262d] border border-transparent hover:border-[#30363d] transition-colors cursor-pointer"
              title="Inject a test syntax error to test Qwen error repair"
            >
              <Bug className="w-3 h-3" />
              <span>Test Error</span>
            </button>
          </>
        )}

        {/* Qwen Panel toggle (tablet/desktop) */}
        {!isMobile && (
          <button
            onClick={toggleRightPanel}
            className={`p-1.5 rounded transition-colors ${
              showRightPanel ? 'bg-[#e11d48] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
            title="Toggle Qwen Assistant"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* Mobile Qwen Panel toggle */}
        {isMobile && (
          <button
            onClick={() => setMobileTab(mobileTab === 'qwen' ? 'editor' : 'qwen')}
            className={`p-1.5 rounded transition-colors ${
              mobileTab === 'qwen' ? 'bg-[#e11d48] text-white' : 'text-[#8b949e] hover:text-white'
            }`}
            title="Toggle Qwen"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors shrink-0 cursor-pointer"
          title="Qwen Engine Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
