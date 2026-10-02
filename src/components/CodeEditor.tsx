import React, { useState, useEffect, useRef } from 'react';
import { X, Save, FileCode, Check, GitCommit, Split } from 'lucide-react';
import { ProjectFile } from '../types/index.ts';

interface CodeEditorProps {
  openFiles: string[];
  activeFile: string | null;
  files: ProjectFile[];
  onSelectFile: (path: string) => void;
  onCloseFile: (path: string) => void;
  onSaveFile: (path: string, content: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  openFiles,
  activeFile,
  files,
  onSelectFile,
  onCloseFile,
  onSaveFile,
}) => {
  const currentFile = files.find(f => f.path === activeFile);
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentFile) {
      setContent(currentFile.content);
      setIsDirty(false);
    }
  }, [currentFile?.path, currentFile?.updatedAt]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setIsDirty(e.target.value !== currentFile?.content);
  };

  const handleSave = () => {
    if (activeFile && isDirty) {
      onSaveFile(activeFile, content);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, content, isDirty]);

  // Support Tab key in textarea
  const handleKeyDownInEditor = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setContent(newContent);
      setIsDirty(true);
      // restore cursor
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = content.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  if (!activeFile || !currentFile) {
    return (
      <div className="flex-1 bg-[#0d1117] flex items-center justify-center text-xs text-[#8b949e]">
        <div className="text-center space-y-2">
          <FileCode className="w-8 h-8 text-[#30363d] mx-auto" />
          <p>Select a file from the left panel to inspect and edit code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] min-w-0 h-full overflow-hidden">
      {/* Editor Tabs Bar */}
      <div className="h-9 bg-[#0e1015] border-b border-[#21262d] flex items-center justify-between px-2 overflow-x-auto select-none shrink-0">
        <div className="flex items-center gap-1">
          {openFiles.map(path => {
            const fileName = path.split('/').pop() || path;
            const isActive = activeFile === path;
            return (
              <div
                key={path}
                onClick={() => onSelectFile(path)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-colors ${
                  isActive
                    ? 'bg-[#0d1117] text-white border-[#e11d48] font-medium'
                    : 'text-[#8b949e] hover:text-[#c9d1d9] border-transparent hover:bg-[#161b22]'
                }`}
              >
                <span>{fileName}</span>
                {isDirty && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48]" title="Unsaved changes" />
                )}
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onCloseFile(path);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor Actions */}
        <div className="flex items-center gap-2 pr-2">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              saveSuccess
                ? 'bg-emerald-500/20 text-emerald-400'
                : isDirty
                ? 'bg-[#e11d48] hover:bg-[#e11d48]/90 text-white font-medium'
                : 'text-[#8b949e] opacity-40 cursor-not-allowed'
            }`}
            title="Save file (Ctrl+S / Cmd+S)"
          >
            {saveSuccess ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            <span className="text-[11px]">{saveSuccess ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Editor Main Canvas with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-[12px] sm:text-[13px] leading-5 relative">
        {/* Line Numbers Gutter */}
        <div className="w-9 sm:w-12 bg-[#0e1015] border-r border-[#21262d] py-3 text-right pr-2 sm:pr-3 select-none text-[#484f58] font-mono shrink-0 overflow-hidden text-xs">
          {lineNumbers.map(n => (
            <div key={n} className="leading-5">
              {n}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDownInEditor}
          spellCheck={false}
          className="flex-1 p-2 sm:p-3 bg-transparent text-[#e6edf3] resize-none focus:outline-none font-mono selection:bg-[#e11d48]/20 selection:text-white leading-5 overflow-auto whitespace-pre tab-2"
          placeholder="Code editor..."
        />
      </div>

      {/* Bottom Editor Status Bar */}
      <div className="h-6 bg-[#0e1015] border-t border-[#21262d] px-2.5 sm:px-3 flex items-center justify-between text-[11px] text-[#8b949e] select-none font-mono shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate max-w-[140px] sm:max-w-none">{activeFile}</span>
          <span aria-hidden="true">·</span>
          <span>{lineCount}L</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{content.length} chars</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span>TSX</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">UTF-8</span>
        </div>
      </div>
    </div>
  );
};
