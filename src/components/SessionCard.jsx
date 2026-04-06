import { useState } from 'react';
import { Clock, ChevronDown, Check, Zap } from 'lucide-react';

const BLOCK_LABELS = {
  warmup: { label: 'Warm Up', color: 'var(--color-text-3)' },
  main: { label: 'Main Work', color: 'var(--color-text-1)' },
  cooldown: { label: 'Cool Down', color: 'var(--color-text-3)' },
};

export default function SessionCard({ session, onComplete, isCompleted, isRestDay }) {
  const [expanded, setExpanded] = useState(!isCompleted);

  if (isRestDay) {
    return (
      <div
        className="rounded-2xl p-7 animate-fade-in-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          className="text-[10px] font-medium tracking-[0.18em] uppercase mb-4"
          style={{ color: 'var(--color-text-3)' }}
        >
          Today
        </p>
        <h3
          className="font-display text-3xl leading-tight mb-3"
          style={{ color: 'var(--color-text-1)' }}
        >
          Rest Day
        </h3>
        <p
          className="text-sm leading-relaxed max-w-xs"
          style={{ color: 'var(--color-text-2)' }}
        >
          Recovery is where growth happens. Rest days build what training breaks down.
        </p>
        <div
          className="mt-6 pt-5"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="text-[10px] tracking-[0.14em] uppercase"
            style={{ color: 'var(--color-text-3)' }}
          >
            Tomorrow you rise again
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div
        className="rounded-2xl p-7 animate-fade-in-up"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <p
          className="text-[10px] font-medium tracking-[0.18em] uppercase mb-4"
          style={{ color: 'var(--color-text-3)' }}
        >
          Today
        </p>
        <h3
          className="font-display text-3xl leading-tight"
          style={{ color: 'var(--color-text-1)' }}
        >
          No Session Today
        </h3>
        <p className="mt-3 text-sm" style={{ color: 'var(--color-text-2)' }}>
          Enjoy your day.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-500 animate-fade-in-up"
      style={{
        background: isCompleted
          ? 'linear-gradient(135deg, rgba(74,222,128,0.07) 0%, var(--color-surface) 60%)'
          : 'var(--color-surface)',
        border: `1px solid ${isCompleted ? 'rgba(74,222,128,0.28)' : 'var(--color-border)'}`,
        boxShadow: isCompleted
          ? '0 0 40px rgba(74,222,128,0.05)'
          : 'none',
      }}
    >
      {/* Header */}
      <div className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p
              className="text-[10px] font-medium tracking-[0.18em] uppercase mb-3"
              style={{ color: 'var(--color-text-3)' }}
            >
              Today
            </p>
            <h3
              className="font-display text-3xl leading-tight"
              style={{ color: 'var(--color-text-1)' }}
            >
              {session.title}
            </h3>
            <div
              className="flex items-center gap-1.5 mt-3"
              style={{ color: 'var(--color-text-3)' }}
            >
              <Clock size={12} strokeWidth={1.8} />
              <span className="font-mono text-xs tracking-wider">
                {session.duration_minutes} min
              </span>
            </div>
          </div>

          {isCompleted ? (
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 animate-scale-in"
              style={{
                background: 'rgba(74,222,128,0.15)',
                border: '1px solid rgba(74,222,128,0.4)',
              }}
            >
              <Check size={18} strokeWidth={2.5} style={{ color: 'var(--color-green)' }} />
            </div>
          ) : (
            <div
              className="w-11 h-11 rounded-full shrink-0 transition-all duration-200"
              style={{
                border: '1px solid var(--color-border-strong)',
                background: 'transparent',
              }}
            />
          )}
        </div>

        {session.reduced && (
          <div
            className="mt-4 flex items-center gap-2 text-xs px-3.5 py-2.5 rounded-xl"
            style={{
              background: 'rgba(232,193,98,0.08)',
              border: '1px solid rgba(232,193,98,0.18)',
              color: 'var(--color-gold)',
            }}
          >
            <Zap size={11} strokeWidth={2} />
            <span>{session.reduction_note}</span>
          </div>
        )}

        {session.restarter_note && (
          <p
            className="mt-3 text-xs italic leading-relaxed"
            style={{ color: 'var(--color-text-3)' }}
          >
            {session.restarter_note}
          </p>
        )}

        {session.blocks && session.blocks.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-5 flex items-center gap-2 text-xs font-medium transition-all duration-200 cursor-pointer group"
            style={{ color: 'var(--color-text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-3)')}
          >
            <ChevronDown
              size={14}
              strokeWidth={1.8}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            {expanded ? 'Hide details' : 'View session details'}
          </button>
        )}
      </div>

      {/* Expanded blocks */}
      {expanded && session.blocks && (
        <div
          className="animate-fade-in"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {session.blocks.map((block, i) => {
            const meta = BLOCK_LABELS[block.type] || {
              label: block.type,
              color: 'var(--color-text-3)',
            };
            return (
              <div
                key={i}
                className="px-7 py-5"
                style={{
                  borderBottom:
                    i < session.blocks.length - 1
                      ? '1px solid var(--color-border)'
                      : 'none',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: 'var(--color-text-3)' }}
                  >
                    {block.duration_minutes}m
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--color-text-2)' }}
                >
                  {block.detail}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Complete button */}
      {!isCompleted && (
        <div
          className="px-7 pb-7"
          style={{
            paddingTop: expanded ? '0' : undefined,
          }}
        >
          <button
            onClick={onComplete}
            className="w-full py-4 rounded-xl font-medium text-sm tracking-wide transition-all duration-200 cursor-pointer hover:opacity-90 active:scale-[0.985]"
            style={{
              background: 'var(--color-text-1)',
              color: 'var(--color-bg)',
              letterSpacing: '0.02em',
            }}
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}
