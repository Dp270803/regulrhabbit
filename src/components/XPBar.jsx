import { getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';
import { useState, useEffect } from 'react';
import levelsData from '../data/levels.json';

const ALL_LEVELS = levelsData.levels;

export default function XPBar({ totalXP, recentXP }) {
  const level = getLevelFromXP(totalXP);
  const { current, needed, percentage } = getXPToNextLevel(totalXP);
  const [flash, setFlash] = useState(false);

  const xpCurrent = current ?? 0;
  const xpNeeded = needed ?? 0;
  const xpPct = percentage ?? 0;

  useEffect(() => {
    if (recentXP > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [recentXP]);

  return (
    <div style={{
      background: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '20px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      padding: '24px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '6px' }}>
            Your Progress
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#fff', lineHeight: 1.1 }}>
            {level.title}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
            Level {level.level} of {ALL_LEVELS.length}
          </p>
        </div>
        <div style={{ textAlign: 'right', position: 'relative' }}>
          <p style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1, color: '#E8C162' }}>
            {totalXP.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>XP total</p>
          {flash && recentXP > 0 && (
            <span className="animate-fade-in-up" style={{ position: 'absolute', top: '-22px', right: 0, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: '#E8C162' }}>
              +{recentXP}
            </span>
          )}
        </div>
      </div>

      {/* Visual level track — all 10 levels as connected dots */}
      <div style={{ position: 'relative', marginBottom: '22px', paddingTop: '4px' }}>
        {/* Background line */}
        <div style={{ position: 'absolute', top: '18px', left: '7px', right: '7px', height: '2px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px' }}>
          {/* Progress fill */}
          <div style={{
            height: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #E8C162, #F0D070)',
            width: `${Math.max(0, ((level.level - 1) / (ALL_LEVELS.length - 1)) * 100)}%`,
            transition: 'width 0.8s ease',
            boxShadow: '0 0 6px rgba(232,193,98,0.3)',
          }} />
        </div>

        {/* Dots row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {ALL_LEVELS.map(l => {
            const isReached = totalXP >= l.xp_required;
            const isCurrent = l.level === level.level;
            return (
              <div key={l.level} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px' }}>
                <div title={`Level ${l.level}: ${l.title} (${l.xp_required} XP)`} style={{
                  width: isCurrent ? '30px' : '14px',
                  height: isCurrent ? '30px' : '14px',
                  borderRadius: '50%',
                  background: isCurrent ? '#E8C162' : isReached ? 'rgba(232,193,98,0.3)' : 'rgba(255,255,255,0.07)',
                  border: isCurrent ? '2px solid #F5DC88' : isReached ? '1.5px solid rgba(232,193,98,0.4)' : '1.5px solid rgba(255,255,255,0.1)',
                  boxShadow: isCurrent ? '0 0 18px rgba(232,193,98,0.55)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  cursor: 'default',
                }}>
                  {isCurrent && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', fontWeight: 800, color: '#000', lineHeight: 1 }}>
                      {l.level}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.5rem',
                  fontFamily: 'var(--font-mono)',
                  color: isCurrent ? '#E8C162' : isReached ? 'rgba(232,193,98,0.35)' : 'rgba(255,255,255,0.12)',
                  fontWeight: isCurrent ? 700 : 400,
                  lineHeight: 1,
                }}>
                  {l.level}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Level name labels — current and neighbors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)' }}>
          {ALL_LEVELS[0].title}
        </span>
        <span style={{ fontSize: '0.65rem', color: '#E8C162', fontWeight: 600 }}>
          {level.title}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)' }}>
          {ALL_LEVELS[ALL_LEVELS.length - 1].title}
        </span>
      </div>

      {/* Progress bar to next level */}
      {level.level < ALL_LEVELS.length && (
        <>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{
              height: '100%', borderRadius: '3px',
              background: 'linear-gradient(90deg, #E8C162, #F0D070)',
              width: `${Math.min(xpPct, 100)}%`,
              boxShadow: '0 0 8px rgba(232,193,98,0.35)',
              transition: 'width 0.7s ease',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>
              {xpCurrent.toLocaleString()} / {xpNeeded.toLocaleString()} XP
            </p>
            <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)' }}>
              Next: {ALL_LEVELS[level.level]?.title}
            </p>
          </div>
        </>
      )}
      {level.level === ALL_LEVELS.length && (
        <p style={{ fontSize: '0.75rem', color: '#E8C162', textAlign: 'center', letterSpacing: '0.06em', fontWeight: 600 }}>
          Max level — Legend
        </p>
      )}
    </div>
  );
}
