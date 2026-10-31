import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import { useTabGuard } from '../../context/TabGuardContext';

const DuplicateTabOverlay = () => {
  const { checkOwnership, claimActive } = useTabGuard();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-bg-primary/95 backdrop-blur-md">
      <div className="max-w-md w-full mx-4 p-8 card border border-border bg-bg-card/50 shadow-2xl rounded-2xl text-center space-y-6 animate-slide-down">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-accent-red/10 rounded-full text-accent-red border border-accent-red/20">
            <AlertTriangle className="w-12 h-12" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-text-primary">
            Application Already Open
          </h2>
          <p className="text-sm text-text-muted">
            This application is already open in another browser tab. To protect your account session security and ensure data consistency, it cannot be run in multiple tabs simultaneously.
          </p>
          <p className="text-xs text-text-faint">
            Please switch to the existing active tab, or close it before opening a new one.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <button
            onClick={checkOwnership}
            className="w-full py-3 px-4 rounded-lg bg-bg-secondary border border-border text-text-primary text-sm font-semibold flex items-center justify-center gap-2 hover:bg-bg-secondary/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Check
          </button>
          
          <button
            onClick={claimActive}
            className="w-full py-3 px-4 rounded-lg bg-accent-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-accent-blue/90 transition-colors shadow-lg shadow-accent-blue/20"
          >
            <LogIn className="w-4 h-4" />
            Take Control
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateTabOverlay;
