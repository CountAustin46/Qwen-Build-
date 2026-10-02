import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  Play,
  Columns,
  Terminal,
  FolderTree,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';

import {
  Project,
  ProjectFile,
  FileTreeNode,
  Message,
  ToolCallRecord,
  Build,
  ProjectChange,
  RepairStep,
  QwenSettings,
} from './types/index.ts';

import { LayoutProvider, useLayout } from './context/LayoutContext.tsx';
import { VerticalSplitter, HorizontalSplitter } from './components/Splitter.tsx';
import { TopNav } from './components/TopNav.tsx';
import { FileTree } from './components/FileTree.tsx';
import { CodeEditor } from './components/CodeEditor.tsx';
import { LivePreview } from './components/LivePreview.tsx';
import { QwenChatPanel } from './components/QwenChatPanel.tsx';
import { BottomUtilityPanel } from './components/BottomUtilityPanel.tsx';
import { FirstExperience } from './components/FirstExperience.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';

function MainWorkspace() {
  // Context layout state
  const {
    isMobile,
    isTablet,
    isDesktop,
    fileTreeWidth,
    qwenPanelWidth,
    editorSplitRatio,
    isDraggingSplitter,
    showLeftPanel,
    setShowLeftPanel,
    toggleLeftPanel,
    showRightPanel,
    setShowRightPanel,
    toggleRightPanel,
    centerView,
    setCenterView,
    mobileTab,
    setMobileTab,
    resetLayoutProportions,
  } = useLayout();

  // Projects & Files state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>(['src/App.tsx']);
  const [activeFile, setActiveFile] = useState<string | null>('src/App.tsx');
  const [latestBuild, setLatestBuild] = useState<Build | undefined>(undefined);
  const [changes, setChanges] = useState<ProjectChange[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Split container ref for calculating percentage-based split drag
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Streaming & Repair state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingThought, setStreamingThought] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallRecord[]>([]);

  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSteps, setRepairSteps] = useState<RepairStep[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);

  // Preview reload key
  const [previewKey, setPreviewKey] = useState(Date.now());

  // Modals & First Experience
  const [showFirstExperience, setShowFirstExperience] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initial Load
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        setProjects(data.projects);
        selectProject(data.projects[0].id);
      } else {
        setShowFirstExperience(true);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setShowFirstExperience(true);
    }
  };

  const selectProject = async (projectId: string) => {
    try {
      const projRes = await fetch(`/api/projects/${projectId}`);
      const projData = await projRes.json();
      if (projData.project) {
        setCurrentProject(projData.project);
        setShowFirstExperience(false);
      }

      await loadFiles(projectId);

      const buildRes = await fetch(`/api/projects/${projectId}/build/status`);
      const buildData = await buildRes.json();
      if (buildData.build) {
        setLatestBuild(buildData.build);
      }

      const changesRes = await fetch(`/api/projects/${projectId}/changes`);
      const changesData = await changesRes.json();
      if (changesData.changes) {
        setChanges(changesData.changes);
      }

      const msgsRes = await fetch(`/api/projects/${projectId}/messages`);
      const msgsData = await msgsRes.json();
      if (msgsData.messages) {
        setMessages(msgsData.messages);
      }

      setPreviewKey(Date.now());
    } catch (err) {
      console.error('Error selecting project:', err);
    }
  };

  const loadFiles = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
        setFileTree(data.tree || []);
        if (!activeFile || !data.files.some((f: ProjectFile) => f.path === activeFile)) {
          const defaultFile = data.files.find((f: ProjectFile) => f.path === 'src/App.tsx') || data.files[0];
          if (defaultFile) {
            setActiveFile(defaultFile.path);
            if (!openFiles.includes(defaultFile.path)) {
              setOpenFiles([defaultFile.path]);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  // Create Project
  const handleCreateProject = async (prompt: string, presetName?: string) => {
    setIsCreatingProject(true);
    try {
      const name = presetName || (prompt.slice(0, 24).trim() + ' App');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: prompt,
          framework: 'react-ts',
        }),
      });
      const data = await res.json();
      if (data.success && data.project) {
        setProjects(prev => [data.project, ...prev]);
        await selectProject(data.project.id);
        setShowFirstExperience(false);
        handleSendMessage(prompt, data.project.id);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreatingProject(false);
    }
  };

  // Run Build
  const handleRunBuild = async () => {
    if (!currentProject || isBuilding) return;
    setIsBuilding(true);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'manual' }),
      });
      const data = await res.json();
      if (data.build) {
        setLatestBuild(data.build);
        setCurrentProject(prev => (prev ? { ...prev, status: data.build.status } : null));
        setPreviewKey(Date.now());
      }
    } catch (err) {
      console.error('Build error:', err);
    } finally {
      setIsBuilding(false);
    }
  };

  // Qwen Error Repair Loop
  const handleTriggerRepair = () => {
    if (!currentProject || isRepairing) return;
    setIsRepairing(true);
    setRepairSteps([]);

    if (isMobile) {
      setMobileTab('qwen');
    } else if (isTablet) {
      setShowRightPanel(true);
    }

    fetch(`/api/projects/${currentProject.id}/repair`, {
      method: 'POST',
    })
      .then(response => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processText = ({ done, value }: ReadableStreamReadResult<Uint8Array>): any => {
          if (done) {
            setIsRepairing(false);
            loadFiles(currentProject.id);
            fetchBuildStatus(currentProject.id);
            fetchChanges(currentProject.id);
            setPreviewKey(Date.now());
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: step')) {
              const dataLine = line.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                try {
                  const data = JSON.parse(dataLine.slice(6));
                  if (data.step) {
                    setRepairSteps(prev => [...prev, data.step]);
                  }
                } catch (e) {}
              }
            } else if (line.startsWith('event: complete')) {
              setIsRepairing(false);
            }
          }

          return reader?.read().then(processText);
        };

        return reader?.read().then(processText);
      })
      .catch(err => {
        console.error('Repair loop error:', err);
        setIsRepairing(false);
      });
  };

  const fetchBuildStatus = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/build/status`);
    const data = await res.json();
    if (data.build) {
      setLatestBuild(data.build);
      setCurrentProject(prev => (prev ? { ...prev, status: data.build.status } : null));
    }
  };

  const fetchChanges = async (projectId: string) => {
    const res = await fetch(`/api/projects/${projectId}/changes`);
    const data = await res.json();
    if (data.changes) setChanges(data.changes);
  };

  const handleInjectError = async () => {
    if (!currentProject) return;
    await fetch(`/api/projects/${currentProject.id}/inject-error`, { method: 'POST' });
    await loadFiles(currentProject.id);
    await fetchBuildStatus(currentProject.id);
    setPreviewKey(Date.now());
  };

  // Send instruction to Qwen
  const handleSendMessage = (prompt: string, targetProjectId?: string) => {
    const pId = targetProjectId || currentProject?.id;
    if (!pId || isStreaming) return;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      conversationId: 'temp',
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    setIsStreaming(true);
    setStreamingThought('');
    setStreamingContent('');
    setActiveToolCalls([]);

    if (isMobile) {
      setMobileTab('qwen');
    } else if (isTablet) {
      setShowRightPanel(true);
    }

    fetch(`/api/projects/${pId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
      .then(response => {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processText = ({ done, value }: ReadableStreamReadResult<Uint8Array>): any => {
          if (done) {
            setIsStreaming(false);
            loadFiles(pId);
            fetchBuildStatus(pId);
            fetchChanges(pId);
            setPreviewKey(Date.now());
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('event: thought')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                const data = JSON.parse(dataLine.slice(6));
                setStreamingThought(prev => prev + data.chunk);
              }
            } else if (part.startsWith('event: content')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                const data = JSON.parse(dataLine.slice(6));
                setStreamingContent(prev => prev + data.chunk);
              }
            } else if (part.startsWith('event: tool_call')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                const data = JSON.parse(dataLine.slice(6));
                setActiveToolCalls(prev => [...prev, data.toolCall]);
              }
            } else if (part.startsWith('event: done')) {
              const dataLine = part.split('\n').find(l => l.startsWith('data: '));
              if (dataLine) {
                const data = JSON.parse(dataLine.slice(6));
                setMessages(prev => [...prev, data.message]);
                setStreamingContent('');
                setStreamingThought('');
                setActiveToolCalls([]);
              }
            }
          }

          return reader?.read().then(processText);
        };

        return reader?.read().then(processText);
      })
      .catch(err => {
        console.error('Chat stream error:', err);
        setIsStreaming(false);
      });
  };

  // File Actions
  const handleSelectFile = (path: string) => {
    if (!openFiles.includes(path)) {
      setOpenFiles(prev => [...prev, path]);
    }
    setActiveFile(path);
    if (isMobile) {
      setMobileTab('editor');
    }
  };

  const handleCloseFile = (path: string) => {
    const nextOpen = openFiles.filter(p => p !== path);
    setOpenFiles(nextOpen);
    if (activeFile === path) {
      setActiveFile(nextOpen[nextOpen.length - 1] || null);
    }
  };

  const handleSaveFile = async (path: string, content: string) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content }),
      });
      const data = await res.json();
      if (data.file) {
        setFiles(prev => prev.map(f => (f.path === path ? data.file : f)));
        handleRunBuild();
        fetchChanges(currentProject.id);
      }
    } catch (err) {
      console.error('Failed saving file:', err);
    }
  };

  const handleCreateFile = async (path: string) => {
    if (!currentProject) return;
    await fetch(`/api/projects/${currentProject.id}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content: '// Created in Qwen Build\n' }),
    });
    await loadFiles(currentProject.id);
    handleSelectFile(path);
  };

  const handleCreateFolder = async (dirPath: string) => {
    if (!currentProject) return;
    await fetch(`/api/projects/${currentProject.id}/tools/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolName: 'create_directory',
        input: { path: dirPath },
      }),
    });
    await loadFiles(currentProject.id);
  };

  const handleDeleteFile = async (path: string) => {
    if (!currentProject) return;
    await fetch(`/api/projects/${currentProject.id}/files?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
    handleCloseFile(path);
    await loadFiles(currentProject.id);
  };

  const handleRevertChange = async (changeId: string) => {
    if (!currentProject) return;
    await fetch(`/api/projects/${currentProject.id}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeId }),
    });
    await loadFiles(currentProject.id);
    await fetchBuildStatus(currentProject.id);
    await fetchChanges(currentProject.id);
    setPreviewKey(Date.now());
  };

  const handleExecuteCommand = async (command: string): Promise<string> => {
    if (!currentProject) return 'No active project';
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.result) {
        if (command === 'npm run build') {
          fetchBuildStatus(currentProject.id);
          setPreviewKey(Date.now());
        }
        return data.result.stdout || data.result.stderr || `Exit code: ${data.result.exitCode}`;
      }
      return 'Execution error';
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  };

  const handleSaveSettings = async (settings: Partial<QwenSettings>) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  };

  if (showFirstExperience || !currentProject) {
    return (
      <FirstExperience
        onCreateProject={handleCreateProject}
        isCreating={isCreatingProject}
      />
    );
  }

  const errorsCount = latestBuild?.errors.length || 0;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090b0e] text-[#e6edf3] overflow-hidden font-sans select-none box-border">
      {/* 1. Top Navigation */}
      <TopNav
        project={currentProject}
        projects={projects}
        latestBuild={latestBuild}
        isBuilding={isBuilding}
        isRepairing={isRepairing}
        onSelectProject={selectProject}
        onNewProject={() => setShowFirstExperience(true)}
        onRunBuild={handleRunBuild}
        onAutoRepair={handleTriggerRepair}
        onInjectError={handleInjectError}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* 2. MOBILE VIEW (<768px): Dedicated Single-Pane Workspace */}
      {isMobile ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-hidden flex flex-col">
            {mobileTab === 'editor' && (
              <CodeEditor
                openFiles={openFiles}
                activeFile={activeFile}
                files={files}
                onSelectFile={setActiveFile}
                onCloseFile={handleCloseFile}
                onSaveFile={handleSaveFile}
              />
            )}

            {mobileTab === 'preview' && (
              <LivePreview
                projectId={currentProject.id}
                isBuilding={isBuilding}
                refreshKey={previewKey}
                onRefresh={() => setPreviewKey(Date.now())}
              />
            )}

            {mobileTab === 'qwen' && (
              <QwenChatPanel
                messages={messages}
                latestBuild={latestBuild}
                isStreaming={isStreaming}
                streamingThought={streamingThought}
                streamingContent={streamingContent}
                activeToolCalls={activeToolCalls}
                isRepairing={isRepairing}
                repairSteps={repairSteps}
                onSendMessage={handleSendMessage}
                onTriggerRepair={handleTriggerRepair}
                isOverlay
              />
            )}

            {mobileTab === 'files' && (
              <FileTree
                tree={fileTree}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDeleteFile={handleDeleteFile}
                isOverlay
                onClose={() => setMobileTab('editor')}
              />
            )}

            {mobileTab === 'terminal' && (
              <div className="flex-1 flex flex-col bg-[#0e1015]">
                <BottomUtilityPanel
                  projectId={currentProject.id}
                  latestBuild={latestBuild}
                  changes={changes}
                  onRevertChange={handleRevertChange}
                  onSelectFileAndLine={(file, line) => {
                    handleSelectFile(file);
                    setMobileTab('editor');
                  }}
                  onTriggerRepair={handleTriggerRepair}
                  onExecuteCommand={handleExecuteCommand}
                  isMaximized
                />
              </div>
            )}
          </div>

          {/* Clean Mobile Bottom Navigation Bar */}
          <nav className="h-12 bg-[#0e1015] border-t border-[#21262d] flex items-center justify-around px-2 select-none shrink-0 z-30">
            <button
              onClick={() => setMobileTab('editor')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mobileTab === 'editor' ? 'text-[#e11d48]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Editor</span>
            </button>

            <button
              onClick={() => setMobileTab('preview')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mobileTab === 'preview' ? 'text-[#e11d48]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => setMobileTab('qwen')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer relative ${
                mobileTab === 'qwen' ? 'text-[#e11d48]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Qwen</span>
              {(isStreaming || isRepairing) && (
                <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-ping absolute top-0.5 right-2"></span>
              )}
            </button>

            <button
              onClick={() => setMobileTab('files')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                mobileTab === 'files' ? 'text-[#e11d48]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Files</span>
            </button>

            <button
              onClick={() => setMobileTab('terminal')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded text-[11px] font-medium transition-colors cursor-pointer relative ${
                mobileTab === 'terminal' ? 'text-[#e11d48]' : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Shell</span>
              {errorsCount > 0 && (
                <span className="w-3.5 h-3.5 rounded-full bg-[#e11d48] text-white text-[9px] flex items-center justify-center font-bold absolute top-0.5 right-2">
                  {errorsCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      ) : (
        /* 3. TABLET & DESKTOP WORKSPACE (≥768px) */
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
          {/* Left Project Panel (File Tree) */}
          {showLeftPanel && (
            <>
              {isTablet ? (
                <>
                  {/* Backdrop for tablet flyout */}
                  <div
                    onClick={() => setShowLeftPanel(false)}
                    className="fixed inset-0 bg-black/60 z-30 transition-opacity"
                  />
                  <div className="absolute inset-y-0 left-0 z-40 w-72 shadow-2xl bg-[#0e1015] border-r border-[#21262d]">
                    <FileTree
                      tree={fileTree}
                      activeFile={activeFile}
                      onSelectFile={handleSelectFile}
                      onCreateFile={handleCreateFile}
                      onCreateFolder={handleCreateFolder}
                      onDeleteFile={handleDeleteFile}
                      isOverlay
                      onClose={() => setShowLeftPanel(false)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <FileTree
                    tree={fileTree}
                    activeFile={activeFile}
                    onSelectFile={handleSelectFile}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onDeleteFile={handleDeleteFile}
                  />
                  {/* Vertical splitter between FileTree and Workspace */}
                  <VerticalSplitter type="fileTree" />
                </>
              )}
            </>
          )}

          {/* Central Workspace (Toolbar + Editor / Preview + Bottom Utility Dock) */}
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0d1117] relative">
            {/* Subheader Toolbar */}
            <div className="h-8 bg-[#0e1015] border-b border-[#21262d] px-3 flex items-center justify-between text-xs select-none shrink-0 gap-2">
              {/* View Mode Segmented Control */}
              <div className="flex items-center gap-1 bg-[#161b22] p-0.5 rounded border border-[#21262d] shrink-0">
                {!isTablet && (
                  <button
                    onClick={() => setCenterView('split')}
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      centerView === 'split'
                        ? 'bg-[#21262d] text-white shadow-xs'
                        : 'text-[#8b949e] hover:text-[#c9d1d9]'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>Split View</span>
                  </button>
                )}

                <button
                  onClick={() => setCenterView('code')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    centerView === 'code'
                      ? 'bg-[#21262d] text-white shadow-xs'
                      : 'text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  <span>Code</span>
                </button>

                <button
                  onClick={() => setCenterView('preview')}
                  className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                    centerView === 'preview'
                      ? 'bg-[#21262d] text-white shadow-xs'
                      : 'text-[#8b949e] hover:text-[#c9d1d9]'
                  }`}
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span>Live Preview</span>
                </button>
              </div>

              {/* Panel toggle shortcuts & Layout reset */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={resetLayoutProportions}
                  className="px-2 py-0.5 rounded text-[10px] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#161b22] border border-transparent hover:border-[#21262d] transition-colors cursor-pointer hidden xl:flex items-center gap-1"
                  title="Reset splitters to default proportions"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Reset Proportions</span>
                </button>

                <button
                  onClick={toggleLeftPanel}
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    showLeftPanel ? 'text-white bg-[#161b22]' : 'text-[#8b949e] hover:text-white'
                  }`}
                  title="Toggle File Tree"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleRightPanel}
                  className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                    showRightPanel ? 'text-white bg-[#161b22]' : 'text-[#8b949e] hover:text-white'
                  }`}
                  title="Toggle Qwen Panel"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Central Editor / Preview Area with Draggable Splitter */}
            <div
              ref={splitContainerRef}
              className="flex-1 flex overflow-hidden min-h-0 relative"
            >
              {centerView === 'split' && !isTablet && (
                <>
                  <div
                    style={{
                      width: `${editorSplitRatio}%`,
                      transition: isDraggingSplitter ? 'none' : 'width 0.18s ease-out',
                    }}
                    className="h-full flex flex-col overflow-hidden min-w-[200px]"
                  >
                    <CodeEditor
                      openFiles={openFiles}
                      activeFile={activeFile}
                      files={files}
                      onSelectFile={setActiveFile}
                      onCloseFile={handleCloseFile}
                      onSaveFile={handleSaveFile}
                    />
                  </div>

                  <VerticalSplitter
                    type="editorPreview"
                    containerRef={splitContainerRef}
                  />

                  <div
                    style={{
                      width: `${100 - editorSplitRatio}%`,
                      transition: isDraggingSplitter ? 'none' : 'width 0.18s ease-out',
                    }}
                    className="h-full flex flex-col overflow-hidden min-w-[200px]"
                  >
                    <LivePreview
                      projectId={currentProject.id}
                      isBuilding={isBuilding}
                      refreshKey={previewKey}
                      onRefresh={() => setPreviewKey(Date.now())}
                    />
                  </div>
                </>
              )}

              {centerView === 'code' && (
                <div className="h-full w-full flex flex-col overflow-hidden min-w-0">
                  <CodeEditor
                    openFiles={openFiles}
                    activeFile={activeFile}
                    files={files}
                    onSelectFile={setActiveFile}
                    onCloseFile={handleCloseFile}
                    onSaveFile={handleSaveFile}
                  />
                </div>
              )}

              {centerView === 'preview' && (
                <div className="h-full w-full flex flex-col overflow-hidden min-w-0">
                  <LivePreview
                    projectId={currentProject.id}
                    isBuilding={isBuilding}
                    refreshKey={previewKey}
                    onRefresh={() => setPreviewKey(Date.now())}
                  />
                </div>
              )}
            </div>

            {/* Draggable Horizontal Splitter between Center Canvas and Bottom Panel */}
            <HorizontalSplitter />

            {/* Bottom Utility Dock */}
            <BottomUtilityPanel
              projectId={currentProject.id}
              latestBuild={latestBuild}
              changes={changes}
              onRevertChange={handleRevertChange}
              onSelectFileAndLine={(file, line) => {
                handleSelectFile(file);
                if (centerView === 'preview') setCenterView('code');
              }}
              onTriggerRepair={handleTriggerRepair}
              onExecuteCommand={handleExecuteCommand}
            />
          </div>

          {/* Right Qwen Panel */}
          {showRightPanel && (
            <>
              {isTablet ? (
                <>
                  {/* Backdrop for tablet flyout */}
                  <div
                    onClick={() => setShowRightPanel(false)}
                    className="fixed inset-0 bg-black/60 z-30 transition-opacity"
                  />
                  <div className="absolute inset-y-0 right-0 z-40 w-88 md:w-96 shadow-2xl bg-[#0e1015] border-l border-[#21262d]">
                    <QwenChatPanel
                      messages={messages}
                      latestBuild={latestBuild}
                      isStreaming={isStreaming}
                      streamingThought={streamingThought}
                      streamingContent={streamingContent}
                      activeToolCalls={activeToolCalls}
                      isRepairing={isRepairing}
                      repairSteps={repairSteps}
                      onSendMessage={handleSendMessage}
                      onTriggerRepair={handleTriggerRepair}
                      isOverlay
                      onClose={() => setShowRightPanel(false)}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Vertical splitter between Workspace and Qwen Panel */}
                  <VerticalSplitter type="qwenPanel" />
                  <QwenChatPanel
                    messages={messages}
                    latestBuild={latestBuild}
                    isStreaming={isStreaming}
                    streamingThought={streamingThought}
                    streamingContent={streamingContent}
                    activeToolCalls={activeToolCalls}
                    isRepairing={isRepairing}
                    repairSteps={repairSteps}
                    onSendMessage={handleSendMessage}
                    onTriggerRepair={handleTriggerRepair}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default function App() {
  return (
    <LayoutProvider>
      <MainWorkspace />
    </LayoutProvider>
  );
}
