import React, { useState } from 'react';
import { ArrowRight, Activity, Kanban, ShieldCheck, Database, Loader2 } from 'lucide-react';

interface FirstExperienceProps {
  onCreateProject: (prompt: string, presetName?: string) => void;
  isCreating: boolean;
}

export const FirstExperience: React.FC<FirstExperienceProps> = ({
  onCreateProject,
  isCreating,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isCreating) return;
    onCreateProject(prompt.trim());
  };

  const starterPresets = [
    {
      title: 'DevPulse Observability Console',
      desc: 'API latency telemetry, operational fleet counters, error degradation tables, and instant metrics refresh.',
      prompt: 'Build a production API latency and cluster health observability dashboard with live refresh and status metrics.',
      icon: Activity,
    },
    {
      title: 'Sprint Kanban Flow Board',
      desc: 'Interactive task columns, tag filtering, priority management, and state transitions.',
      prompt: 'Build a collaborative sprint Kanban board with draggable status cards, tags, and quick task creation.',
      icon: Kanban,
    },
    {
      title: 'API Rate Limiter & Token Bucket',
      desc: 'Visual token bucket simulation, request throttler, client IP quotas, and response codes.',
      prompt: 'Build an interactive API rate limiter simulation with token bucket algorithm visualization and request sliders.',
      icon: ShieldCheck,
    },
    {
      title: 'Engineering Knowledge Vault',
      desc: 'Hierarchical markdown notes, search index, tag categorization, and dual-pane editor.',
      prompt: 'Build a technical engineering documentation wiki with instant search, tags, and split preview.',
      icon: Database,
    },
  ];

  return (
    <div className="min-h-screen bg-[#090b0e] text-[#e6edf3] flex flex-col font-sans select-none">
      {/* Minimal Top Brand Bar */}
      <header className="h-12 sm:h-14 border-b border-[#21262d] px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-[#e11d48] flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs">
            Q
          </div>
          <span className="font-semibold text-white tracking-tight text-sm">
            Qwen Build
          </span>
        </div>
        <div className="text-[11px] sm:text-xs text-[#8b949e] font-mono">
          Powered exclusively by Qwen
        </div>
      </header>

      {/* Hero Workspace Center */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-6 sm:space-y-8 my-auto">
        <div className="text-center space-y-2 sm:space-y-3">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Qwen Build
          </h1>
          <p className="text-lg sm:text-xl text-[#8b949e] font-medium">
            What do you want to build?
          </p>
        </div>

        {/* Large Prompt Input Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative rounded-xl bg-[#12161f] border border-[#30363d] focus-within:border-[#e11d48] shadow-2xl transition-all">
            <textarea
              autoFocus
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isCreating}
              placeholder="Describe your application (e.g., 'A real-time service health console with latency charts and SLA error trackers')..."
              rows={3}
              className="w-full bg-transparent p-3.5 sm:p-4 text-xs sm:text-sm text-white placeholder-[#8b949e] focus:outline-none resize-none leading-relaxed"
            />

            <div className="flex items-center justify-between p-2.5 sm:p-3 border-t border-[#21262d] bg-[#0e1015]/60 rounded-b-xl gap-2">
              <span className="text-[11px] sm:text-xs text-[#8b949e] truncate">
                Autonomous inspect → build → test → auto-repair cycle
              </span>
              <button
                type="submit"
                disabled={!prompt.trim() || isCreating}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-1.5 sm:py-2 rounded-lg bg-[#e11d48] hover:bg-[#e11d48]/90 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shrink-0"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Bootstrapping...</span>
                  </>
                ) : (
                  <>
                    <span>Build</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Starter Presets */}
        <div className="w-full space-y-2.5 pt-2 sm:pt-4">
          <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            Or start with an engineered foundation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {starterPresets.map(preset => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.title}
                  onClick={() => onCreateProject(preset.prompt, preset.title)}
                  disabled={isCreating}
                  className="text-left p-3 sm:p-3.5 rounded-lg bg-[#12161f] border border-[#21262d] hover:border-[#e11d48]/60 hover:bg-[#161b22] transition-all group cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#e11d48] shrink-0" />
                      <span className="text-xs font-semibold text-white group-hover:text-[#ff6b81] transition-colors">
                        {preset.title}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8b949e] group-hover:text-white transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#8b949e] line-clamp-2 leading-relaxed">
                    {preset.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="h-10 sm:h-12 border-t border-[#21262d] px-4 sm:px-6 flex items-center justify-between text-[11px] sm:text-xs text-[#8b949e] shrink-0">
        <span>Build software with Qwen.</span>
        <span>Developer-grade execution sandbox</span>
      </footer>
    </div>
  );
};
