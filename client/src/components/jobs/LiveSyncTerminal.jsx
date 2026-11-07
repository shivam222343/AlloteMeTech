import { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LiveSyncTerminal({
  isOpen,
  onClose,
  syncState,
  syncLogs,
  syncing,
  onStopSync,
  stoppingSync,
  title = 'ats-scraper@alloteme:~',
  statCards,
  badgeText,
}) {
  const terminalEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [syncLogs, autoScroll]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    const text = (syncLogs || []).map((l) => `[${l.time}] ${l.message}`).join('\n');
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Terminal logs copied to clipboard!'))
      .catch(() => toast.error('Failed to copy logs'));
  };

  const statusColor = {
    running: 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
    completed: 'bg-accent-green/20 text-accent-green border-accent-green/30',
    stopped: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
    failed: 'bg-accent-red/20 text-accent-red border-accent-red/30',
    idle: 'bg-bg-secondary text-text-muted border-border',
  }[syncState?.status || (syncing ? 'running' : 'idle')];

  const logs = Array.isArray(syncLogs) ? syncLogs : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0f141c] border border-border/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-text-primary">
        {/* Terminal Window Titlebar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#161b24] border-b border-border/60 flex-shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
            {/* Mac style dots */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition-opacity cursor-pointer"
                title="Close terminal"
              />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <Terminal className="w-3.5 h-3.5 text-accent-blue flex-shrink-0" />
              <span className="font-mono text-xs font-bold text-text-primary truncate">
                {title}
              </span>
            </div>

            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-bold border flex-shrink-0 ${statusColor}`}>
              {syncState?.status || (syncing ? 'RUNNING' : 'IDLE')}
            </span>

            {/* Mobile-only Close button */}
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden btn-icon btn-ghost text-text-primary hover:bg-white/10 w-7 h-7 flex-shrink-0 ml-auto border border-border/40 rounded-lg flex items-center justify-center"
              title="Close terminal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
            {badgeText && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 bg-indigo-500/20 text-indigo-300 border-indigo-500/40">
                {badgeText}
              </span>
            )}
            {!badgeText && syncState?.category && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                syncState.category === 'Non-Tech'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-accent-blue/20 text-accent-blue border-accent-blue/40'
              }`}>
                {syncState.category === 'Non-Tech' ? '💼 Non-Tech' : '💻 Tech'}
              </span>
            )}

            <button
              type="button"
              onClick={handleCopyLogs}
              className="btn btn-ghost btn-sm text-[11px] font-mono text-text-muted hover:text-text-primary py-1 px-2.5 border border-border/50 rounded-lg flex items-center gap-1.5 cursor-pointer"
              title="Copy all logs"
            >
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </button>

            {/* Desktop Close button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:flex btn btn-ghost btn-sm text-xs font-mono text-text-primary hover:bg-white/10 py-1 px-2.5 border border-border/50 rounded-lg items-center gap-1 cursor-pointer"
              title="Close terminal"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-[#111620] border-b border-border/40 text-xs font-mono">
          {Array.isArray(statCards) && statCards.length > 0 ? (
            statCards.map((sc, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">{sc.label}</div>
                <div className={`text-sm font-bold mt-0.5 ${sc.color || 'text-text-primary'}`}>
                  {sc.value ?? 0}
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">Companies / Target</div>
                <div className="text-sm font-bold text-text-primary mt-0.5">
                  {syncState?.totalToScrape || 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">Processed</div>
                <div className="text-sm font-bold text-accent-blue mt-0.5">
                  {syncState?.processedCount || 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">Jobs Saved</div>
                <div className="text-sm font-bold text-accent-green mt-0.5">
                  {syncState?.savedCount || 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">Duplicates Skipped</div>
                <div className="text-sm font-bold text-accent-yellow mt-0.5">
                  {syncState?.duplicateCount || 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[#18202d] border border-border/40">
                <div className="text-[10px] text-text-faint uppercase">Errors / Unreachable</div>
                <div className="text-sm font-bold text-accent-red mt-0.5">
                  {syncState?.errorsCount || 0}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Current status banner */}
        {(syncState?.currentStep || syncState?.currentCompany) && (
          <div className="px-4 py-2 bg-[#141b26] border-b border-border/40 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 truncate text-accent-blue">
              <span className="w-2 h-2 rounded-full bg-accent-blue animate-ping" />
              <span className="truncate">
                {syncState.currentStep || `Processing "${syncState.currentCompany}"...`}
              </span>
            </div>
            {syncing && onStopSync && (
              <button
                type="button"
                onClick={onStopSync}
                disabled={stoppingSync}
                className="btn btn-sm py-1 px-3 bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 flex-shrink-0 shadow-sm cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                {stoppingSync ? 'Stopping...' : 'Stop Scraper'}
              </button>
            )}
          </div>
        )}

        {/* Terminal Screen with Monospace logs */}
        <div className="flex-1 p-4 font-mono text-xs overflow-y-auto bg-[#0a0d14] space-y-1.5 min-h-[300px] max-h-[500px]">
          {logs.length === 0 ? (
            <div className="text-text-faint py-8 text-center italic">
              Terminal idle. Start a scrape or wait for live output...
            </div>
          ) : (
            logs.map((log) => {
              const colorClass = {
                step: 'text-cyan-400 font-bold',
                success: 'text-emerald-400 font-semibold',
                warn: 'text-amber-400',
                error: 'text-red-400 font-bold',
                info: 'text-slate-300',
              }[log.type] || 'text-slate-300';

              return (
                <div key={log.id} className="flex items-start gap-2.5 leading-relaxed hover:bg-white/[0.02] px-1 py-0.5 rounded">
                  <span className="text-slate-500 flex-shrink-0 select-none">[{log.time}]</span>
                  <span className="text-slate-600 select-none">&gt;</span>
                  <span className={`break-all ${colorClass}`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalEndRef} />
        </div>

        {/* Footer controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-[#161b24] border-t border-border/60 text-xs font-mono flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-text-muted hover:text-text-primary select-none">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-border"
            />
            <span>Auto-scroll</span>
          </label>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-text-faint hidden sm:inline">
              {logs.length} entries recorded
            </span>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm text-xs font-mono py-1 px-3 border border-border/50 text-text-primary hover:bg-white/10 rounded-lg cursor-pointer"
            >
              Close Terminal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

