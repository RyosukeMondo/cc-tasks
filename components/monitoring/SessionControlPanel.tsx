"use client";

import { useState } from "react";
import { 
  SessionControlAction, 
  SessionControlRequest, 
  SessionControlResult, 
  SessionControls,
  SessionState 
} from "@/lib/types/monitoring";

type ControlButtonProps = {
  action: SessionControlAction;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  destructive?: boolean;
};

function ControlButton({ 
  action, 
  onClick, 
  disabled = false, 
  loading = false, 
  destructive = false 
}: ControlButtonProps) {
  const getActionIcon = (action: SessionControlAction) => {
    switch (action) {
      case 'pause':
        return (
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
          </svg>
        );
      case 'resume':
        return (
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'terminate':
        return (
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'restart':
        return (
          <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
    }
  };

  const getActionLabel = (action: SessionControlAction) => {
    switch (action) {
      case 'pause':
        return 'Pause';
      case 'resume':
        return 'Resume';
      case 'terminate':
        return 'Terminate';
      case 'restart':
        return 'Restart';
    }
  };

  const baseClasses = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/20";
  
  const variantClasses = destructive
    ? "bg-red-600/20 text-red-300 hover:bg-red-600/30 hover:text-red-200 focus:bg-red-600/30"
    : "bg-slate-700/50 text-slate-200 hover:bg-slate-600/50 hover:text-white focus:bg-slate-600/50";

  const disabledClasses = "opacity-50 cursor-not-allowed hover:bg-slate-700/50 hover:text-slate-200";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${disabled ? disabledClasses : variantClasses}`}
      aria-label={`${getActionLabel(action)} session`}
    >
      {loading ? (
        <svg className="size-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        getActionIcon(action)
      )}
      {getActionLabel(action)}
    </button>
  );
}

type ConfirmationModalProps = {
  isOpen: boolean;
  action: SessionControlAction;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmationModal({ isOpen, action, onConfirm, onCancel }: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isDestructive = action === 'terminate' || action === 'restart';
  const actionName = action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div 
        className="bg-slate-900 border border-white/10 rounded-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">
          Confirm {actionName}
        </h3>
        <p className="text-slate-300 text-sm mb-4">
          {isDestructive 
            ? `Are you sure you want to ${action} this session? This action cannot be undone.`
            : `Are you sure you want to ${action} this session?`
          }
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 ${
              isDestructive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {actionName}
          </button>
        </div>
      </div>
    </div>
  );
}

type FeedbackMessageProps = {
  result: SessionControlResult | null;
  onDismiss: () => void;
  onRetry?: () => void;
};

function getErrorGuidance(result: SessionControlResult): string | null {
  if (result.success || !result.message) return null;
  
  const message = result.message.toLowerCase();
  
  if (message.includes('permission') || message.includes('access')) {
    return 'Check file permissions and ensure you have access to the session files.';
  }
  if (message.includes('not found') || message.includes('does not exist')) {
    return 'The session may have been moved or deleted. Try refreshing the monitoring data.';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'Network issue detected. Check your connection and try again.';
  }
  if (message.includes('timeout')) {
    return 'Operation timed out. The session may be unresponsive. Consider force termination.';
  }
  if (message.includes('already')) {
    return 'The session is already in the requested state. Refresh to see current status.';
  }
  if (message.includes('process')) {
    return 'Could not find or control the session process. It may have already stopped.';
  }
  
  return 'Check the session status and try again. Contact support if the issue persists.';
}

function isRetryableError(result: SessionControlResult): boolean {
  if (result.success) return false;
  
  const message = result.message?.toLowerCase() || '';
  
  // Don't retry permission, validation, or already-completed errors
  if (message.includes('permission') || 
      message.includes('access') || 
      message.includes('invalid') || 
      message.includes('already') ||
      message.includes('not found')) {
    return false;
  }
  
  // Retry network, timeout, or process errors
  return message.includes('network') || 
         message.includes('timeout') || 
         message.includes('connection') || 
         message.includes('process');
}

function FeedbackMessage({ result, onDismiss, onRetry }: FeedbackMessageProps) {
  if (!result) return null;

  const isSuccess = result.success;
  const bgColor = isSuccess ? "bg-emerald-600/20" : "bg-red-600/20";
  const textColor = isSuccess ? "text-emerald-300" : "text-red-300";
  const borderColor = isSuccess ? "border-emerald-600/30" : "border-red-600/30";
  const guidance = getErrorGuidance(result);
  const canRetry = onRetry && isRetryableError(result);

  return (
    <div className={`rounded-lg border p-3 ${bgColor} ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {isSuccess ? "Success" : "Error"}
          </p>
          {result.message && (
            <p className="text-xs text-slate-300 mt-1">
              {result.message}
            </p>
          )}
          {guidance && (
            <p className="text-xs text-slate-400 mt-2 italic">
              💡 {guidance}
            </p>
          )}
          {canRetry && (
            <button
              onClick={onRetry}
              className="text-xs text-blue-400 hover:text-blue-300 mt-2 underline"
            >
              🔄 Try Again
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className={`ml-2 ${textColor} hover:opacity-75 flex-shrink-0`}
          aria-label="Dismiss message"
        >
          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

type SessionControlPanelProps = {
  sessionId: string;
  projectId: string;
  currentState: SessionState;
  controls: SessionControls;
  onControlAction: (request: SessionControlRequest) => Promise<SessionControlResult>;
  className?: string;
};

export function SessionControlPanel({
  sessionId,
  projectId,
  currentState,
  controls,
  onControlAction,
  className = ""
}: SessionControlPanelProps) {
  const [loadingAction, setLoadingAction] = useState<SessionControlAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<SessionControlAction | null>(null);
  const [lastResult, setLastResult] = useState<SessionControlResult | null>(null);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [lastAction, setLastAction] = useState<SessionControlAction | null>(null);

  const handleActionClick = (action: SessionControlAction) => {
    // Show confirmation for destructive actions
    if (action === 'terminate' || action === 'restart') {
      setConfirmAction(action);
    } else {
      executeAction(action);
    }
  };

  const handleConfirmAction = () => {
    if (confirmAction) {
      executeAction(confirmAction);
      setConfirmAction(null);
    }
  };

  const executeAction = async (action: SessionControlAction, isRetry = false) => {
    setLoadingAction(action);
    setLastAction(action);
    if (!isRetry) {
      setLastResult(null);
      setRetryAttempts(0);
    } else {
      setRetryAttempts(prev => prev + 1);
    }

    try {
      const request: SessionControlRequest = {
        sessionId,
        projectId,
        action,
        reason: `User initiated ${action} from control panel${isRetry ? ` (retry ${retryAttempts + 1})` : ''}`,
        force: action === 'terminate' || action === 'restart'
      };

      const result = await onControlAction(request);
      setLastResult(result);
      
      // Reset retry attempts on success
      if (result.success) {
        setRetryAttempts(0);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastResult({
        sessionId,
        action,
        success: false,
        message: `${errorMessage}${isRetry ? ` (attempt ${retryAttempts + 1})` : ''}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRetry = () => {
    if (lastAction && retryAttempts < 3) {
      executeAction(lastAction, true);
    }
  };

  const getAvailableActions = (): SessionControlAction[] => {
    return controls.availableActions.filter(action => {
      switch (action) {
        case 'pause':
          return controls.canPause && (currentState === 'active' || currentState === 'idle');
        case 'resume':
          return controls.canResume && currentState === 'paused';
        case 'terminate':
          return controls.canTerminate && currentState !== 'terminated';
        case 'restart':
          return controls.canRestart;
        default:
          return false;
      }
    });
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-slate-400">
          No control actions available for current session state
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        {lastResult && (
          <FeedbackMessage
            result={lastResult}
            onDismiss={() => {
              setLastResult(null);
              setRetryAttempts(0);
            }}
            onRetry={retryAttempts < 3 ? handleRetry : undefined}
          />
        )}
        
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <ControlButton
              key={action}
              action={action}
              onClick={() => handleActionClick(action)}
              disabled={loadingAction !== null}
              loading={loadingAction === action}
              destructive={action === 'terminate' || action === 'restart'}
            />
          ))}
        </div>

        <div className="text-xs text-slate-500 space-y-1">
          <div>
            Session State: <span className="text-slate-300 capitalize">{currentState}</span>
          </div>
          {retryAttempts > 0 && (
            <div className="text-amber-400">
              Retry attempts: {retryAttempts}/3
            </div>
          )}
          {availableActions.length === 0 && (
            <div className="text-slate-400 italic">
              💡 Some actions may become available when session state changes
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmAction !== null}
        action={confirmAction!}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}