import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Terminal,
  Loader2,
  Brain,
  X,
} from 'lucide-react';
import { Message, ToolCallRecord, RepairStep, Build } from '../types/index.ts';
import { useLayout } from '../context/LayoutContext.tsx';

interface QwenChatPanelProps {
  messages: Message[];
  latestBuild?: Build;
  isStreaming: boolean;
  streamingThought: string;
  streamingContent: string;
  activeToolCalls: ToolCallRecord[];
  isRepairing: boolean;
  repairSteps: RepairStep[];
  onSendMessage: (prompt: string) => void;
  onTriggerRepair: () => void;
  onClose?: () => void;
  isOverlay?: boolean;
}

export const QwenChatPanel: React.FC<QwenChatPanelProps> = ({
  messages,
  latestBuild,
  isStreaming,
  streamingThought,
  streamingContent,
  activeToolCalls,
  isRepairing,
  repairSteps,
  onSendMessage,
  onTriggerRepair,
  onClose,
  isOverlay = false,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const [showThought, setShowThought] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, streamingThought, repairSteps, isRepairing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || isStreaming || isRepairing) return;
    onSendMessage(inputPrompt.trim());
    setInputPrompt('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleTool = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleThought = (id: string) => {
    setShowThought(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { qwenPanelWidth, isDraggingSplitter } = useLayout();
  const buildHasErrors = latestBuild && latestBuild.errors.length > 0;

  return (
    <aside
      style={
        isOverlay
          ? undefined
          : {
              width: `${qwenPanelWidth}px`,
              transition: isDraggingSplitter ? 'none' : 'width 0.18s ease-out',
            }
      }
      className={`${
        isOverlay ? 'w-full h-full' : 'border-l border-[#21262d]'
      } bg-[#0e1015] flex flex-col h-full shrink-0 select-none overflow-hidden`}
    >
      {/* Qwen Panel Header */}
      <div className="h-9 px-3.5 border-b border-[#21262d] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#e11d48]"></div>
          <span className="text-xs font-semibold text-white tracking-tight">
            Qwen Workspace Engine
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[#8b949e]">qwen-2.5-coder</span>
          {isOverlay && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error & Auto-Repair Status Banner */}
      {buildHasErrors && !isRepairing && (
        <div className="m-3 p-3 rounded-lg bg-[#e11d48]/10 border border-[#e11d48]/30 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-[#ff6b81]">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#e11d48]" />
            <span>Build Failed ({latestBuild.errors.length} error)</span>
          </div>
          <p className="text-[11px] text-[#c9d1d9] leading-relaxed">
            {latestBuild.errors[0]?.message}
          </p>
          <button
            onClick={onTriggerRepair}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-[#e11d48] text-white text-xs font-medium hover:bg-[#e11d48]/90 transition-colors cursor-pointer shadow-xs"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Start Qwen Repair Loop</span>
          </button>
        </div>
      )}

      {/* Real-time Repair Loop Progress Timeline */}
      {isRepairing && (
        <div className="m-3 p-3 rounded-lg bg-[#161b22] border border-[#30363d] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-medium text-amber-400">
            <div className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Qwen Error Repair Loop Active</span>
            </div>
            <span className="text-[11px] font-mono text-[#8b949e]">bounded</span>
          </div>

          <div className="space-y-1.5 pt-1">
            {repairSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px] leading-tight">
                {step.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : step.type === 'failed' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-[#e11d48] shrink-0 mt-0.5" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-amber-400/60 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  </div>
                )}
                <div>
                  <span className={step.type === 'success' ? 'text-emerald-300 font-medium' : 'text-[#c9d1d9]'}>
                    {step.message}
                  </span>
                  {step.details && (
                    <p className="mt-0.5 text-[10px] font-mono text-[#8b949e]">{step.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages & Tool Activity Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`space-y-2 ${msg.role === 'user' ? 'pl-2 sm:pl-4' : 'pr-1 sm:pr-2'}`}
          >
            {/* Role Header */}
            <div className="flex items-center justify-between text-[11px] text-[#8b949e]">
              <span className="font-semibold text-white">
                {msg.role === 'user' ? 'Developer' : 'Qwen'}
              </span>
              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Thought trace accordion if assistant */}
            {msg.thought && (
              <div className="border border-[#21262d] rounded-md overflow-hidden bg-[#161b22]/40">
                <button
                  onClick={() => toggleThought(msg.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1 text-[11px] text-[#8b949e] hover:text-white transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Brain className="w-3 h-3 text-[#e11d48]" />
                    <span>Thought Process</span>
                  </span>
                  {showThought[msg.id] ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
                {showThought[msg.id] && (
                  <div className="px-2.5 py-2 text-[11px] text-[#8b949e] font-mono whitespace-pre-wrap border-t border-[#21262d] bg-[#0d1117]">
                    {msg.thought}
                  </div>
                )}
              </div>
            )}

            {/* Tool Calls Accordion */}
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase font-mono tracking-wider text-[#8b949e] px-0.5">
                  Tools Executed ({msg.toolCalls.length})
                </div>
                {msg.toolCalls.map(tc => {
                  const isOpen = !!expandedTools[tc.id];
                  return (
                    <div
                      key={tc.id}
                      className="border border-[#21262d] rounded bg-[#161b22] overflow-hidden"
                    >
                      <button
                        onClick={() => toggleTool(tc.id)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] text-[#c9d1d9] hover:bg-[#21262d] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Terminal className="w-3 h-3 text-[#e11d48] shrink-0" />
                          <span className="font-mono font-medium truncate">{tc.toolName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#8b949e] shrink-0">
                          {tc.durationMs && <span>{tc.durationMs}ms</span>}
                          {isOpen ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-2 border-t border-[#21262d] bg-[#0d1117] text-[10px] font-mono space-y-1.5">
                          <div>
                            <span className="text-[#8b949e]">Input:</span>
                            <pre className="text-[#c9d1d9] mt-0.5 overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(tc.input, null, 2)}
                            </pre>
                          </div>
                          {tc.output && (
                            <div className="pt-1 border-t border-[#21262d]">
                              <span className="text-[#8b949e]">Output:</span>
                              <pre className="text-emerald-400 mt-0.5 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(tc.output, null, 2)}
                              </pre>
                            </div>
                          )}
                          {tc.error && (
                            <div className="pt-1 border-t border-[#21262d] text-[#e11d48]">
                              Error: {tc.error}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Message Body */}
            <div
              className={`p-3 rounded-lg leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#161b22] text-white border border-[#30363d]'
                  : 'bg-[#12161f] text-[#c9d1d9] border border-[#21262d]'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Live Streaming State */}
        {isStreaming && (
          <div className="space-y-2 pr-2">
            <div className="flex items-center gap-2 text-[11px] text-[#8b949e]">
              <Loader2 className="w-3 h-3 animate-spin text-[#e11d48]" />
              <span className="font-semibold text-white">Qwen Reasoning...</span>
            </div>

            {streamingThought && (
              <div className="p-2.5 rounded bg-[#161b22]/50 border border-[#21262d] text-[11px] font-mono text-[#8b949e] whitespace-pre-wrap">
                {streamingThought}
              </div>
            )}

            {activeToolCalls.length > 0 && (
              <div className="space-y-1">
                {activeToolCalls.map(tc => (
                  <div
                    key={tc.id}
                    className="flex items-center justify-between px-2.5 py-1 rounded bg-[#161b22] border border-[#21262d] text-[11px]"
                  >
                    <span className="font-mono text-[#c9d1d9] flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-[#e11d48]" />
                      <span>{tc.toolName}</span>
                    </span>
                    <span className="text-[10px] text-amber-400">running...</span>
                  </div>
                ))}
              </div>
            )}

            {streamingContent && (
              <div className="p-3 rounded-lg bg-[#12161f] text-[#c9d1d9] border border-[#21262d] leading-relaxed whitespace-pre-wrap">
                {streamingContent}
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-3 pt-2 pb-1 border-t border-[#21262d] flex items-center gap-1.5 overflow-x-auto shrink-0 select-none">
        <button
          onClick={() => onSendMessage('Add live export button to export metrics as CSV')}
          className="px-2 py-1 rounded bg-[#161b22] hover:bg-[#21262d] text-[10px] text-[#8b949e] hover:text-[#c9d1d9] border border-[#21262d] whitespace-nowrap transition-colors cursor-pointer"
        >
          + Export CSV
        </button>
        <button
          onClick={() => onSendMessage('Add real-time service search input')}
          className="px-2 py-1 rounded bg-[#161b22] hover:bg-[#21262d] text-[10px] text-[#8b949e] hover:text-[#c9d1d9] border border-[#21262d] whitespace-nowrap transition-colors cursor-pointer"
        >
          + Search Bar
        </button>
        <button
          onClick={() => onSendMessage('Run project test suite')}
          className="px-2 py-1 rounded bg-[#161b22] hover:bg-[#21262d] text-[10px] text-[#8b949e] hover:text-[#c9d1d9] border border-[#21262d] whitespace-nowrap transition-colors cursor-pointer"
        >
          Run Tests
        </button>
      </div>

      {/* Natural Language Instruction Input */}
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t border-[#21262d] shrink-0 bg-[#0e1015]">
        <div className="relative rounded-lg bg-[#161b22] border border-[#30363d] focus-within:border-[#e11d48]/80 transition-colors">
          <textarea
            value={inputPrompt}
            onChange={e => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming || isRepairing}
            placeholder="Instruct Qwen: modify code, inspect, add feature..."
            rows={2}
            className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-[#8b949e] focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <span className="text-[10px] text-[#8b949e] font-mono hidden sm:inline">
              Press Enter to send, Shift+Enter for newline
            </span>
            <span className="text-[10px] text-[#8b949e] font-mono sm:hidden">
              Qwen Engine
            </span>
            <button
              type="submit"
              disabled={!inputPrompt.trim() || isStreaming || isRepairing}
              className="p-1.5 rounded bg-[#e11d48] text-white hover:bg-[#e11d48]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs ml-auto"
              title="Send to Qwen"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </form>
    </aside>
  );
};
