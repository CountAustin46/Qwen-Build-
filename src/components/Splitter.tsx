import React, { useCallback } from 'react';
import { useLayout } from '../context/LayoutContext.tsx';

interface VerticalSplitterProps {
  type: 'fileTree' | 'editorPreview' | 'qwenPanel';
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

export const VerticalSplitter: React.FC<VerticalSplitterProps> = ({
  type,
  containerRef,
  className = '',
}) => {
  const {
    fileTreeWidth,
    setFileTreeWidth,
    qwenPanelWidth,
    setQwenPanelWidth,
    editorSplitRatio,
    setEditorSplitRatio,
    setIsDraggingSplitter,
  } = useLayout();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDraggingSplitter(true);
      document.body.classList.add('is-dragging-splitter');

      const startX = e.clientX;
      const initialFileTreeWidth = fileTreeWidth;
      const initialQwenPanelWidth = qwenPanelWidth;
      const initialRatio = editorSplitRatio;

      let containerWidth = 1000;
      if (type === 'editorPreview' && containerRef?.current) {
        containerWidth = containerRef.current.getBoundingClientRect().width;
      }

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;

        if (type === 'fileTree') {
          setFileTreeWidth(initialFileTreeWidth + deltaX);
        } else if (type === 'qwenPanel') {
          // Dragging left increases Qwen panel width, dragging right decreases it
          setQwenPanelWidth(initialQwenPanelWidth - deltaX);
        } else if (type === 'editorPreview') {
          const deltaPercent = (deltaX / (containerWidth || 1000)) * 100;
          setEditorSplitRatio(initialRatio + deltaPercent);
        }
      };

      const handlePointerUp = () => {
        setIsDraggingSplitter(false);
        document.body.classList.remove('is-dragging-splitter');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      type,
      fileTreeWidth,
      qwenPanelWidth,
      editorSplitRatio,
      containerRef,
      setFileTreeWidth,
      setQwenPanelWidth,
      setEditorSplitRatio,
      setIsDraggingSplitter,
    ]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`relative w-1.5 hover:w-2 -mx-0.5 z-20 group cursor-col-resize select-none shrink-0 flex items-center justify-center transition-all ${className}`}
      title="Drag to resize panel (double click to reset)"
      onDoubleClick={() => {
        if (type === 'fileTree') setFileTreeWidth(240);
        if (type === 'qwenPanel') setQwenPanelWidth(380);
        if (type === 'editorPreview') setEditorSplitRatio(50);
      }}
    >
      {/* Visual Line */}
      <div className="w-[1px] h-full bg-[#21262d] group-hover:bg-[#e11d48] group-active:bg-[#e11d48] transition-colors" />

      {/* Centered Grab Handle */}
      <div className="absolute w-3 h-7 rounded bg-[#21262d] group-hover:bg-[#e11d48] group-active:bg-[#e11d48] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 shadow-sm pointer-events-none">
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
      </div>
    </div>
  );
};

interface HorizontalSplitterProps {
  className?: string;
}

export const HorizontalSplitter: React.FC<HorizontalSplitterProps> = ({ className = '' }) => {
  const { bottomPanelHeight, setBottomPanelHeight, setIsDraggingSplitter } = useLayout();

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDraggingSplitter(true);
      document.body.classList.add('is-dragging-splitter-row');

      const startY = e.clientY;
      const initialHeight = bottomPanelHeight;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - startY;
        // Dragging upward (negative deltaY) increases bottom panel height
        setBottomPanelHeight(initialHeight - deltaY);
      };

      const handlePointerUp = () => {
        setIsDraggingSplitter(false);
        document.body.classList.remove('is-dragging-splitter-row');
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [bottomPanelHeight, setBottomPanelHeight, setIsDraggingSplitter]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`relative h-1.5 hover:h-2 -my-0.5 z-20 group cursor-row-resize select-none shrink-0 flex items-center justify-center transition-all w-full ${className}`}
      title="Drag to resize utility panel (double click to reset)"
      onDoubleClick={() => setBottomPanelHeight(240)}
    >
      {/* Visual Line */}
      <div className="h-[1px] w-full bg-[#21262d] group-hover:bg-[#e11d48] group-active:bg-[#e11d48] transition-colors" />

      {/* Centered Grab Handle */}
      <div className="absolute h-3 w-7 rounded bg-[#21262d] group-hover:bg-[#e11d48] group-active:bg-[#e11d48] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-0.5 shadow-sm pointer-events-none">
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
        <span className="w-1 h-1 rounded-full bg-white opacity-80" />
      </div>
    </div>
  );
};
