import { X } from 'lucide-react';

export default function ReturnBanner({ message, state, onDismiss, timeMessage }) {
  if (!message || state <= 1) return null;

  const bgColors = {
    2: 'bg-[var(--color-surface)]',
    3: 'bg-[var(--color-streak)]/5',
    4: 'bg-[var(--color-streak)]/10',
    5: 'bg-[var(--color-missed)]/5',
  };

  return (
    <div className={`${bgColors[state] || bgColors[2]} border-b border-[var(--color-border)] px-4 py-4 animate-fade-in`}>
      <div className="max-w-[480px] mx-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
              {message}
            </p>
            {timeMessage && (
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{timeMessage}</p>
            )}
          </div>
          {onDismiss && (
            <button onClick={onDismiss} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
