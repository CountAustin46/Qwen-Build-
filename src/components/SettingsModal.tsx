import React, { useState, useEffect } from 'react';
import { X, Key, Cpu, ShieldCheck, Check, Save, Wrench } from 'lucide-react';
import { QwenSettings } from '../types/index.ts';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: Partial<QwenSettings>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [model, setModel] = useState<QwenSettings['model']>('qwen-2.5-coder-32b-instruct');
  const [autoRepair, setAutoRepair] = useState(true);
  const [maxRepairAttempts, setMaxRepairAttempts] = useState(3);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
          if (data.settings) {
            setModel(data.settings.model || 'qwen-2.5-coder-32b-instruct');
            setApiEndpoint(data.settings.apiEndpoint || '');
            setAutoRepair(data.settings.autoRepair !== false);
            setMaxRepairAttempts(data.settings.maxRepairAttempts || 3);
          }
        })
        .catch(err => console.error('Failed loading settings', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Partial<QwenSettings> = {
      model,
      autoRepair,
      maxRepairAttempts,
    };
    if (apiKey.trim()) updates.apiKey = apiKey.trim();
    if (apiEndpoint.trim()) updates.apiEndpoint = apiEndpoint.trim();

    onSave(updates);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#12161f] border border-[#30363d] rounded-xl max-w-md w-full shadow-2xl overflow-hidden font-sans select-none">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#21262d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#e11d48]" />
            <h2 className="text-sm font-semibold text-white">Qwen Engine Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          {/* Model selection */}
          <div className="space-y-1.5">
            <label className="text-white font-medium">Model Designation</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value as any)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-white focus:outline-none focus:border-[#e11d48]/80 font-mono text-xs cursor-pointer"
            >
              <option value="qwen-2.5-coder-32b-instruct">qwen-2.5-coder-32b-instruct (Recommended)</option>
              <option value="qwen-2.5-72b-instruct">qwen-2.5-72b-instruct (Maximum Reasoning)</option>
              <option value="qwen-2.5-coder-7b-instruct">qwen-2.5-coder-7b-instruct (Fastest Latency)</option>
            </select>
            <p className="text-[11px] text-[#8b949e]">
              Qwen is the only LLM utilized for code generation and repairs.
            </p>
          </div>

          {/* Secure API Key */}
          <div className="space-y-1.5">
            <label className="text-white font-medium flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-[#e11d48]" />
              <span>Qwen API Key (DashScope / OpenAI-Compatible)</span>
            </label>
            <input
              type="password"
              placeholder="sk-... (Saved securely on backend, never exposed to client)"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-white placeholder-[#8b949e] focus:outline-none focus:border-[#e11d48]/80 font-mono text-xs"
            />
            <p className="text-[11px] text-[#8b949e]">
              Optional. If not provided, Qwen Build runs using its autonomous local developer engine.
            </p>
          </div>

          {/* Custom Endpoint */}
          <div className="space-y-1.5">
            <label className="text-white font-medium">Custom API Endpoint URL</label>
            <input
              type="text"
              placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
              value={apiEndpoint}
              onChange={e => setApiEndpoint(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-white placeholder-[#8b949e] focus:outline-none focus:border-[#e11d48]/80 font-mono text-xs"
            />
          </div>

          {/* Error Repair Settings */}
          <div className="pt-2 border-t border-[#21262d] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-[#e11d48]" />
                  <span>Autonomous Error Repair</span>
                </div>
                <p className="text-[11px] text-[#8b949e]">
                  Automatically detect build diagnostics and trigger Qwen repair loop.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoRepair}
                onChange={e => setAutoRepair(e.target.checked)}
                className="w-4 h-4 accent-[#e11d48] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Max Repair Iterations</div>
                <p className="text-[11px] text-[#8b949e]">
                  Bounded limit to prevent infinite repair loops.
                </p>
              </div>
              <input
                type="number"
                min={1}
                max={5}
                value={maxRepairAttempts}
                onChange={e => setMaxRepairAttempts(Number(e.target.value))}
                className="w-16 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-white font-mono text-right text-xs"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-[#21262d] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#161b22] hover:bg-[#21262d] text-[#c9d1d9] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#e11d48] hover:bg-[#e11d48]/90 text-white font-medium transition-colors cursor-pointer shadow-sm"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
