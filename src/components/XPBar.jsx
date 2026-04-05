import { getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';
import { useState, useEffect } from 'react';

export default function XPBar({ totalXP, recentXP }) {
  const level = getLevelFromXP(totalXP);
  const { current, needed, percentage, progress } = getXPToNextLevel(totalXP);
  const [flash, setFlash] = useState(false);

  // Support both {current, needed, percentage} and {progress, nextLevel} API shapes
  const xpCurrent = current ?? 0;
  const xpNeeded = needed ?? (level?.nextLevel?.xp_required ?? 0);
  const xpPct = percentage ?? (progress != null ? progress * 100 : 0);

  useEffect(() => {
    if (recentXP > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [recentXP]);

  return (
    <div
      className="rounded-2xl p-6 animate-fade-in"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        {/* Level + title */}
        <div>
          <p
            className="text-[10px] font-medium tracking-[0.18em] uppercase mb-1.5"
            style={{ color: 'var(--color-text-3)' }}
          >
            Level {level.level}
          </p>
          <p
            className="font-display text-xl leading-tight"
            style={{ color: 'var(--color-text-1)' }}
          >
            {level.title}
          </p>
        </div>

        {/* Total XP + flash */}
        <div className="text-right relative">
          <p
            className="font-mono text-2xl font-semibold leading-none"
            style={{ color: 'var(--color-gold)' }}
          >
            {totalXP.toLocaleString()}
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ color: 'var(--color-text-3)' }}
          >
            XP total
          </p>

          {/* Gain flash */}
          {flash && recentXP > 0 && (
            <span
              className="absolute -top-6 right-0 font-mono text-sm font-bold animate-fade-in-up"
              style={{ color: 'var(--color-gold)' }}
            >
              +{recentXP}
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--color-border-strong)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(xpPct, 100)}%`,
            background: 'linear-gradient(90deg, var(--color-gold) 0%, #F0D070 100%)',
            boxShadow: '0 0 8px rgba(232,193,98,0.4)',
          }}
        />
      </div>

      {/* Sub-row */}
      <div className="flex items-center justify-between mt-2.5">
        <p className="font-mono text-[10px]" style={{ color: 'var(--color-text-3)' }}>
          {xpCurrent.toLocaleString()}
          <span style={{ color: 'var(--color-border-strong)' }}> / </span>
          {xpNeeded.toLocaleString()} XP
        </p>
        <p className="text-[10px]" style={{ color: 'var(--color-text-3)' }}>
          to Level {level.level + 1}
        </p>
      </div>
    </div>
  );
}
