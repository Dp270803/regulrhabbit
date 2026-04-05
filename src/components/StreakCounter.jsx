export default function StreakCounter({ current, best, consecutiveMisses }) {
  const getIndicatorState = () => {
    if (consecutiveMisses >= 2) return 'danger';
    if (consecutiveMisses === 1) return 'warning';
    return 'good';
  };

  const state = getIndicatorState();

  const stateColors = {
    good: 'bg-[var(--color-complete)]',
    warning: 'bg-[var(--color-streak)]',
    danger: 'bg-[var(--color-missed)]',
  };

  const stateMessages = {
    good: 'On track',
    warning: 'Missed one. No sweat. Show up next time.',
    danger: 'Two in a row. Today matters.',
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-3xl font-semibold text-[var(--color-text-primary)]">
            {current === 0 ? 'Starting fresh' : current}
          </p>
          {current > 0 && (
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">day streak</p>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">Best: {best}</p>
      </div>

      <div className="mt-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">2-Day Rule</span>
          <div className="flex gap-1.5">
            <div className={`w-3 h-3 rounded-full ${
              consecutiveMisses >= 1
                ? stateColors[state]
                : stateColors.good
            }`} />
            <div className={`w-3 h-3 rounded-full ${
              consecutiveMisses >= 2
                ? stateColors.danger
                : consecutiveMisses === 0
                ? stateColors.good
                : 'bg-[var(--color-border)]'
            }`} />
          </div>
        </div>
        <p className={`text-xs mt-1 ${
          state === 'danger' ? 'text-[var(--color-missed)]' :
          state === 'warning' ? 'text-[var(--color-streak)]' :
          'text-[var(--color-text-muted)]'
        }`}>
          {stateMessages[state]}
        </p>
      </div>
    </div>
  );
}
