import { getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';

export default function XPBar({ totalXP, recentXP }) {
  const level = getLevelFromXP(totalXP);
  const { progress, nextLevel } = getXPToNextLevel(totalXP);

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">
          Level {level.level} — {level.title}
        </p>
        <p className="font-mono text-xs text-[var(--color-text-muted)]">
          {totalXP} XP
        </p>
      </div>

      <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-xp)] rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-1.5">
        {nextLevel ? (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            {nextLevel.xp_required - totalXP} XP to Level {nextLevel.level}
          </p>
        ) : (
          <p className="text-[10px] text-[var(--color-streak)]">Max Level</p>
        )}
        {recentXP > 0 && (
          <p className="text-[10px] text-[var(--color-streak)] font-mono animate-fade-in">
            +{recentXP} XP
          </p>
        )}
      </div>
    </div>
  );
}
