import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  X,
} from 'lucide-react';
import { FileTreeNode } from '../types/index.ts';
import { useLayout } from '../context/LayoutContext.tsx';

interface FileTreeProps {
  tree: FileTreeNode[];
  activeFile: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onClose?: () => void;
  isOverlay?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({
  tree,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onClose,
  isOverlay = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState('');

  const toggleDir = (path: string) => {
    setCollapsedDirs(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim()) return;
    onCreateFile(newFilePath.trim());
    setNewFilePath('');
    setIsCreatingFile(false);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    onCreateFolder(newFolderPath.trim());
    setNewFolderPath('');
    setIsCreatingFolder(false);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.tsx') || fileName.endsWith('.ts') || fileName.endsWith('.jsx') || fileName.endsWith('.js')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
    if (fileName.endsWith('.json')) {
      return <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (fileName.endsWith('.md')) {
      return <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
    return <FileCode className="w-3.5 h-3.5 text-[#8b949e] shrink-0" />;
  };

  const renderNode = (node: FileTreeNode, depth: number = 0) => {
    const isDir = node.type === 'directory';
    const isCollapsed = !!collapsedDirs[node.path];
    const isSelected = activeFile === node.path;

    // Search filter
    if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      if (isDir && node.children?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))) {
        // pass
      } else if (!isDir) {
        return null;
      }
    }

    return (
      <div key={node.path} className="select-none">
        <div
          onClick={() => {
            if (isDir) {
              toggleDir(node.path);
            } else {
              onSelectFile(node.path);
              if (isOverlay && onClose) onClose();
            }
          }}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          className={`group flex items-center justify-between pr-2 py-1 text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-[#21262d] text-white font-medium border-l-2 border-[#e11d48]'
              : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            {isDir ? (
              <>
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-[#8b949e] shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-[#8b949e] shrink-0" />
                )}
                {isCollapsed ? (
                  <Folder className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                )}
              </>
            ) : (
              <>
                <span className="w-3" />
                {getFileIcon(node.name)}
              </>
            )}
            <span className="truncate">{node.name}</span>
          </div>

          {!isDir && (
            <button
              onClick={e => {
                e.stopPropagation();
                if (confirm(`Delete ${node.name}?`)) onDeleteFile(node.path);
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#e11d48] transition-opacity"
              title="Delete File"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isDir && !isCollapsed && node.children && (
          <div>{node.children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const { fileTreeWidth, isDraggingSplitter } = useLayout();

  return (
    <aside
      style={
        isOverlay
          ? undefined
          : {
              width: `${fileTreeWidth}px`,
              transition: isDraggingSplitter ? 'none' : 'width 0.18s ease-out',
            }
      }
      className={`${
        isOverlay ? 'w-full h-full' : 'border-r border-[#21262d]'
      } bg-[#0e1015] flex flex-col h-full shrink-0 select-none overflow-hidden`}
    >
      {/* Search & Actions Header */}
      <div className="p-2.5 border-b border-[#21262d] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-[#8b949e] px-1 uppercase tracking-wider">
          <span>Files</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setIsCreatingFile(true);
                setIsCreatingFolder(false);
              }}
              className="p-1 rounded hover:bg-[#21262d] hover:text-white transition-colors"
              title="Create File"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsCreatingFolder(true);
                setIsCreatingFile(false);
              }}
              className="p-1 rounded hover:bg-[#21262d] hover:text-white transition-colors"
              title="Create Directory"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            {isOverlay && onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-white transition-colors ml-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3 h-3 text-[#8b949e] absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b22] text-xs pl-7 pr-2 py-1 rounded text-[#c9d1d9] border border-[#21262d] focus:outline-none focus:border-[#e11d48]/50 placeholder-[#8b949e]"
          />
        </div>
      </div>

      {/* Creation inputs */}
      {isCreatingFile && (
        <form onSubmit={handleCreateFileSubmit} className="p-2 bg-[#161b22] border-b border-[#21262d]">
          <input
            autoFocus
            type="text"
            placeholder="src/components/MyComponent.tsx"
            value={newFilePath}
            onChange={e => setNewFilePath(e.target.value)}
            onBlur={() => !newFilePath && setIsCreatingFile(false)}
            className="w-full bg-[#0d1117] text-xs px-2 py-1 rounded text-white border border-[#30363d] focus:outline-none focus:border-[#e11d48]/80 font-mono"
          />
        </form>
      )}

      {isCreatingFolder && (
        <form onSubmit={handleCreateFolderSubmit} className="p-2 bg-[#161b22] border-b border-[#21262d]">
          <input
            autoFocus
            type="text"
            placeholder="src/components"
            value={newFolderPath}
            onChange={e => setNewFolderPath(e.target.value)}
            onBlur={() => !newFolderPath && setIsCreatingFolder(false)}
            className="w-full bg-[#0d1117] text-xs px-2 py-1 rounded text-white border border-[#30363d] focus:outline-none focus:border-[#e11d48]/80 font-mono"
          />
        </form>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto py-1">
        {tree.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8b949e]">
            Empty project
          </div>
        ) : (
          tree.map(node => renderNode(node))
        )}
      </div>
    </aside>
  );
};
