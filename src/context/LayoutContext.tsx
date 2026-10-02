import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface LayoutContextType {
  // Breakpoints
  windowWidth: number;
  windowHeight: number;
  breakpoint: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;

  // Workspace Proportions
  fileTreeWidth: number;
  setFileTreeWidth: (width: number) => void;
  qwenPanelWidth: number;
  setQwenPanelWidth: (width: number) => void;
  bottomPanelHeight: number;
  setBottomPanelHeight: (height: number) => void;
  editorSplitRatio: number; // percentage 20 to 80
  setEditorSplitRatio: (ratio: number) => void;
  resetLayoutProportions: () => void;

  // Dragging State
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: (dragging: boolean) => void;

  // Panels visibility
  showLeftPanel: boolean;
  setShowLeftPanel: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLeftPanel: () => void;
  showRightPanel: boolean;
  setShowRightPanel: React.Dispatch<React.SetStateAction<boolean>>;
  toggleRightPanel: () => void;

  // Views
  centerView: 'split' | 'code' | 'preview';
  setCenterView: (view: 'split' | 'code' | 'preview') => void;
  mobileTab: 'editor' | 'preview' | 'qwen' | 'files' | 'terminal';
  setMobileTab: (tab: 'editor' | 'preview' | 'qwen' | 'files' | 'terminal') => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

const DEFAULT_FILE_TREE_WIDTH = 240;
const DEFAULT_QWEN_PANEL_WIDTH = 380;
const DEFAULT_BOTTOM_PANEL_HEIGHT = 240;
const DEFAULT_EDITOR_SPLIT_RATIO = 50;

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Screen Dimensions
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  // Proportions
  const [fileTreeWidth, setFileTreeWidthState] = useState(DEFAULT_FILE_TREE_WIDTH);
  const [qwenPanelWidth, setQwenPanelWidthState] = useState(DEFAULT_QWEN_PANEL_WIDTH);
  const [bottomPanelHeight, setBottomPanelHeightState] = useState(DEFAULT_BOTTOM_PANEL_HEIGHT);
  const [editorSplitRatio, setEditorSplitRatioState] = useState(DEFAULT_EDITOR_SPLIT_RATIO);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // Panel Toggles
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Views
  const [centerView, setCenterView] = useState<'split' | 'code' | 'preview'>('split');
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview' | 'qwen' | 'files' | 'terminal'>('editor');

  // Compute Breakpoint
  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width >= 768 && dimensions.width < 1200;
  const isDesktop = dimensions.width >= 1200;
  const breakpoint: Breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  // Responsive synchronization on resize
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setDimensions({ width: w, height: h });

      if (w < 768) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
      } else if (w < 1200) {
        setShowLeftPanel(false);
        setShowRightPanel(false);
        setCenterView(prev => (prev === 'split' ? 'code' : prev));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safe setter with constraints
  const setFileTreeWidth = useCallback((w: number) => {
    setFileTreeWidthState(Math.min(420, Math.max(160, Math.round(w))));
  }, []);

  const setQwenPanelWidth = useCallback((w: number) => {
    setQwenPanelWidthState(Math.min(600, Math.max(260, Math.round(w))));
  }, []);

  const setBottomPanelHeight = useCallback((h: number) => {
    setBottomPanelHeightState(Math.min(550, Math.max(90, Math.round(h))));
  }, []);

  const setEditorSplitRatio = useCallback((r: number) => {
    setEditorSplitRatioState(Math.min(80, Math.max(20, Math.round(r))));
  }, []);

  const resetLayoutProportions = useCallback(() => {
    setFileTreeWidthState(DEFAULT_FILE_TREE_WIDTH);
    setQwenPanelWidthState(DEFAULT_QWEN_PANEL_WIDTH);
    setBottomPanelHeightState(DEFAULT_BOTTOM_PANEL_HEIGHT);
    setEditorSplitRatioState(DEFAULT_EDITOR_SPLIT_RATIO);
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setShowLeftPanel(prev => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setShowRightPanel(prev => !prev);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        windowWidth: dimensions.width,
        windowHeight: dimensions.height,
        breakpoint,
        isMobile,
        isTablet,
        isDesktop,
        fileTreeWidth,
        setFileTreeWidth,
        qwenPanelWidth,
        setQwenPanelWidth,
        bottomPanelHeight,
        setBottomPanelHeight,
        editorSplitRatio,
        setEditorSplitRatio,
        resetLayoutProportions,
        isDraggingSplitter,
        setIsDraggingSplitter,
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
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
