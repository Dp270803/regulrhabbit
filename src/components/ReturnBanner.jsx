import { X } from 'lucide-react';

const STATE_CONFIG = {
  1: {
    bg: 'rgba(74,222,128,0.07)',
    border: 'rgba(74,222,128,0.18)',
    accent: 'var(--color-green)',
    dot: 'rgba(74,222,128,0.8)',
  },
  2: {
    bg: 'rgba(232,193,98,0.06)',
    border: 'rgba(232,193,98,0.18)',
    accent: 'var(--color-gold)',
    dot: 'rgba(232,193,98,0.8)',
  },
  3: {
    bg: 'rgba(232,193,98,0.08)',
    border: 'rgba(232,193,98,0.22)',
    accent: 'var(--color-gold)',
    dot: 'rgba(232,193,98,0.9)',
  },
  4: {
    bg: 'rgba(248,113,113,0.07)',
    border: 'rgba(248,113,113,0.2)',
    accent: 'var(--color-red)',
    dot: 'rgba(248,113,113,0.85)',
  },
  5: {
    bg: 'rgba(248,113,113,0.1)',
    border: 'rgba(248,113,113,0.26)',
    accent: 'var(--color-red)',
    dot: 'rgba(248,113,113,1)',
  },
};

export default function ReturnBanner({ message, state, timeMessage, onDismiss }) {
  if (!message) return null;
  const cfg = STATE_CONFIG[state] || STATE_CONFIG[2];

  return (
    <div
      className="animate-slide-up"
      style={{
        background: cfg.bg,
        borderBottom: `1px solid ${cfg.border}`,
      }}
    >
      <div className="max-w-[480px] mx-auto px-4 py-3 flex items-start gap-3">
        <div
          className="mt-[5px] shrink-0 rounded-full"
          style={{ width: 6, height: 6, background: cfg.dot }}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-text-1)' }}
          >
            {message}
          </p>
          {timeMessage && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-3)' }}>
              {timeMessage}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 p-1.5 rounded-lg transition-opacity hover:opacity-60 cursor-pointer mt-0.5"
            style={{ color: 'var(--color-text-3)' }}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
