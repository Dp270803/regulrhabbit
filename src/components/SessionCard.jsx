import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp, Check } from 'lucide-react';

export default function SessionCard({ session, onComplete, isCompleted, isRestDay }) {
  const [expanded, setExpanded] = useState(false);

  if (isRestDay) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <p className="font-display text-xl text-[var(--color-text-primary)]">Rest Day</p>
        <p className="text-[var(--color-text-secondary)] text-sm mt-2">
          Recovery is part of the plan. Rest days build what training breaks down.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
        <p className="font-display text-xl text-[var(--color-text-primary)]">No Session Today</p>
        <p className="text-[var(--color-text-secondary)] text-sm mt-2">Enjoy your day.</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-xl p-6 transition-colors ${
      isCompleted
        ? 'bg-[var(--color-complete)]/10 border-[var(--color-complete)]'
        : 'bg-[var(--color-surface)] border-[var(--color-border)]'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display text-xl text-[var(--color-text-primary)]">
            {session.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[var(--color-text-secondary)] text-sm">
            <Clock size={14} />
            <span>{session.duration_minutes} min</span>
          </div>
        </div>
        {isCompleted && (
          <div className="w-8 h-8 bg-[var(--color-complete)] rounded-full flex items-center justify-center">
            <Check size={18} className="text-white" />
          </div>
        )}
      </div>

      {session.reduced && (
        <p className="text-xs text-[var(--color-streak)] mt-2 italic">
          {session.reduction_note}
        </p>
      )}

      {session.restarter_note && (
        <p className="text-xs text-[var(--color-text-muted)] mt-2 italic">
          {session.restarter_note}
        </p>
      )}

      {session.blocks && session.blocks.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {expanded ? 'Hide details' : 'View full session'}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 animate-fade-in">
              {session.blocks.map((block, i) => (
                <div key={i} className="pl-3 border-l-2 border-[var(--color-border)]">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                    {block.type}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {block.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isCompleted && session.status !== 'completed' && (
        <button
          onClick={onComplete}
          className="mt-5 w-full bg-[var(--color-text-primary)] text-[var(--color-surface)] py-3 rounded-full font-medium text-sm hover:scale-[1.02] transition-transform cursor-pointer"
        >
          Mark Complete
        </button>
      )}
    </div>
  );
}
