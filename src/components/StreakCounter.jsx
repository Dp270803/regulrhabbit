import { Trophy } from 'lucide-react';

export default function StreakCounter({ current, best, consecutiveMisses }) {
  const twoDayStatus =
    consecutiveMisses === 0 ? 'safe' : consecutiveMisses === 1 ? 'warning' : 'danger';

  const statusConfig = {
    safe: {
      color: 'var(--color-green)',
      label: '2-Day Rule: Safe',
      dotActive: 'var(--color-green)',
    },
    warning: {
      color: 'var(--color-gold)',
      label: "1 miss — don't miss tomorrow",
      dotActive: 'var(--color-gold)',
    },
    danger: {
      color: 'var(--color-red)',
      label: '2 in a row — today matters',
      dotActive: 'var(--color-red)',
    },
  };

  const status = statusConfig[twoDayStatus];

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'linear-gradient(145deg, #1c1c1c 0%, #121212 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '28px',
      }}
    >
      {/* Main row: streak + best */}
      <div className="flex items-start justify-between">
        {/* Current streak */}
        <div>
          <p
            className="text-[10px] font-medium tracking-[0.18em] uppercase mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            Current Streak
          </p>
          <div className="flex items-end gap-2.5 leading-none">
            <span
              className="font-mono font-bold leading-none"
              style={{
                color: current === 0 ? 'var(--color-text-3)' : 'var(--color-gold)',
                fontSize: current === 0 ? '2.5rem' : '4rem',
                lineHeight: 1,
                textShadow:
                  current > 0
                    ? '0 0 40px rgba(232,193,98,0.25)'
                    : 'none',
              }}
            >
              {current === 0 ? '—' : current}
            </span>
            {current > 0 && (
              <span
                className="text-base mb-1.5"
                style={{ color: 'var(--color-text-3)' }}
              >
                days
              </span>
            )}
          </div>
          {current === 0 && (
            <p
              className="mt-2 text-xs"
              style={{ color: 'var(--color-text-3)' }}
            >
              Start your streak today
            </p>
          )}
        </div>

        {/* Best */}
        <div className="text-right">
          <p
            className="text-[10px] font-medium tracking-[0.18em] uppercase mb-3"
            style={{ color: 'var(--color-text-3)' }}
          >
            Best
          </p>
          <div className="flex items-center gap-2 justify-end">
            <Trophy
              size={15}
              strokeWidth={1.8}
              style={{ color: 'var(--color-gold)' }}
            />
            <span
              className="font-mono text-2xl font-semibold leading-none"
              style={{ color: 'var(--color-text-1)' }}
            >
              {best}
            </span>
          </div>
          <p
            className="text-[10px] mt-1.5"
            style={{ color: 'var(--color-text-3)' }}
          >
            days
          </p>
        </div>
      </div>

      {/* 2-Day Rule indicator */}
      <div
        className="mt-6 pt-5"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          {/* Two dots */}
          <div className="flex gap-1.5">
            <div
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{
                background:
                  consecutiveMisses === 0
                    ? 'var(--color-green)'
                    : 'var(--color-border-strong)',
              }}
            />
            <div
              className="w-2 h-2 rounded-full transition-colors duration-300"
              style={{
                background:
                  consecutiveMisses >= 1
                    ? status.dotActive
                    : 'var(--color-border-strong)',
              }}
            />
          </div>
          <p
            className="text-xs transition-colors duration-300"
            style={{ color: status.color }}
          >
            {status.label}
          </p>
        </div>
      </div>
    </div>
  );
}
