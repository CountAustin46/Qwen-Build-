import React, { useState, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  ExternalLink,
} from 'lucide-react';

interface LivePreviewProps {
  projectId: string;
  isBuilding: boolean;
  refreshKey: number;
  onRefresh: () => void;
}

export const LivePreview: React.FC<LivePreviewProps> = ({
  projectId,
  isBuilding,
  refreshKey,
  onRefresh,
}) => {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = `/api/projects/${projectId}/preview?t=${refreshKey}`;

  const getViewportClasses = () => {
    switch (viewport) {
      case 'mobile':
        return 'w-[375px] max-w-full h-[667px] max-h-full shadow-2xl rounded-2xl border-4 border-[#30363d]';
      case 'tablet':
        return 'w-[768px] max-w-full h-[1024px] max-h-full shadow-2xl rounded-xl border-4 border-[#30363d]';
      case 'desktop':
      default:
        return 'w-full h-full';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] h-full overflow-hidden w-full">
      {/* Live Preview Header Toolbar */}
      <div className="h-9 bg-[#0e1015] border-b border-[#21262d] flex items-center justify-between px-3 select-none shrink-0 gap-2">
        <div className="flex items-center gap-2 text-xs text-[#8b949e] shrink-0">
          <span className="font-semibold text-white">Live Preview</span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Virtual Sandbox</span>
          </div>
        </div>

        {/* Viewport Toggles & Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Viewport Selector */}
          <div className="hidden sm:flex items-center gap-0.5 bg-[#161b22] p-0.5 rounded border border-[#21262d]">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-[#21262d] text-white shadow-xs'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewport === 'tablet'
                  ? 'bg-[#21262d] text-white shadow-xs'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                viewport === 'mobile'
                  ? 'bg-[#21262d] text-white shadow-xs'
                  : 'text-[#8b949e] hover:text-[#c9d1d9]'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors cursor-pointer"
            title="Refresh Sandbox Preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* External window */}
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded text-[#8b949e] hover:text-white hover:bg-[#161b22] transition-colors cursor-pointer"
            title="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Preview Viewport Canvas */}
      <div className="flex-1 bg-[#090b0e] flex items-center justify-center p-1 sm:p-2 overflow-auto relative">
        <div className={`transition-all duration-200 overflow-hidden bg-[#0d1117] ${getViewportClasses()}`}>
          <iframe
            ref={iframeRef}
            key={refreshKey}
            src={previewUrl}
            title="Qwen Live Sandbox Preview"
            className="w-full h-full border-0 bg-transparent"
            sandbox="allow-scripts allow-forms allow-same-origin allow-modals"
            onLoad={() => setIframeLoaded(true)}
          />
        </div>
      </div>
    </div>
  );
};
