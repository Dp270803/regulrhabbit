import { getLevelFromXP, getXPToNextLevel } from '../utils/xpCalculator';
import { useState, useEffect } from 'react';
import levelsData from '../data/levels.json';
import { useThemeColors, useTheme } from '../hooks/useTheme';

const ALL_LEVELS = levelsData.levels;

export default function XPBar({ totalXP, recentXP }) {
  const C = useThemeColors();
  const { isDark } = useTheme();
  const primaryMuted   = isDark ? 'rgba(233,195,73,0.25)' : 'rgba(0,92,171,0.2)';
  const primaryMid     = isDark ? 'rgba(233,195,73,0.35)' : 'rgba(0,92,171,0.3)';
  const primaryGlow    = isDark ? 'rgba(233,195,73,0.5)'  : 'rgba(0,92,171,0.4)';
  const primaryShadow  = isDark ? 'rgba(233,195,73,0.3)'  : 'rgba(0,92,171,0.25)';
  const subtleWhite    = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.06)';
  const subtleWhiteMid = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)';
  const level = getLevelFromXP(totalXP);
  const { needed, progress, nextLevel } = getXPToNextLevel(totalXP);
  const [flash, setFlash] = useState(false);

  const xpPct = Math.min((progress || 0) * 100, 100);

  useEffect(() => {
    if (recentXP > 0) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 2000);
      return () => clearTimeout(t);
    }
  }, [recentXP]);

  return (
    <div style={{ background: C.low, borderRadius: '12px', padding: '20px' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '18px' }}>
        <div>
          <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '5px' }}>
            Your Progress
          </p>
          <p className="font-headline" style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.01em', color: C.text, lineHeight: 1.1 }}>
            {level.title}
          </p>
          <p style={{ fontSize: '0.68rem', color: C.faint, marginTop: '2px' }}>
            Level {level.level} of {ALL_LEVELS.length}
          </p>
        </div>
        <div style={{ textAlign: 'right', position: 'relative' }}>
          <p className="font-headline" style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1, color: C.primary }}>
            {totalXP.toLocaleString()}
          </p>
          <p style={{ fontSize: '0.62rem', color: C.faint, marginTop: '2px' }}>XP total</p>
          {flash && recentXP > 0 && (
            <span className="animate-fade-in-up" style={{ position: 'absolute', top: '-20px', right: 0, fontFamily: 'Inter, monospace', fontSize: '0.88rem', fontWeight: 700, color: C.primary }}>
              +{recentXP}
            </span>
          )}
        </div>
      </div>

      {/* Level dot track */}
      <div style={{ position: 'relative', marginBottom: '18px', paddingTop: '4px' }}>
        <div style={{ position: 'absolute', top: '18px', left: '7px', right: '7px', height: '2px', background: C.highest, borderRadius: '2px' }}>
          <div style={{
            height: '100%', borderRadius: '2px',
            background: C.primary,
            width: `${Math.max(0, ((level.level - 1) / (ALL_LEVELS.length - 1)) * 100)}%`,
            transition: 'width 0.8s ease',
            boxShadow: `0 0 6px ${primaryShadow}`,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          {ALL_LEVELS.map(l => {
            const isReached = totalXP >= l.xp_required;
            const isCurrent = l.level === level.level;
            return (
              <div key={l.level} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div title={`Level ${l.level}: ${l.title} (${l.xp_required} XP)`} style={{
                  width: isCurrent ? '28px' : '12px',
                  height: isCurrent ? '28px' : '12px',
                  borderRadius: '50%',
                  background: isCurrent ? C.primary : isReached ? primaryMuted : C.highest,
                  border: isCurrent ? `2px solid ${primaryMid}` : isReached ? `1.5px solid ${primaryMid}` : `1.5px solid ${subtleWhite}`,
                  boxShadow: isCurrent ? `0 0 14px ${primaryGlow}` : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.3s ease',
                }}>
                  {isCurrent && (
                    <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.55rem', fontWeight: 800, color: C.lowest, lineHeight: 1 }}>
                      {l.level}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '0.48rem', fontFamily: 'Inter, monospace',
                  color: isCurrent ? C.primary : isReached ? primaryMuted : subtleWhite,
                  fontWeight: isCurrent ? 700 : 400, lineHeight: 1,
                }}>
                  {l.level}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress to next level */}
      {level.level < ALL_LEVELS.length && (
        <>
          <div style={{ height: '2px', background: C.highest, borderRadius: '2px', overflow: 'hidden', marginBottom: '7px' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: C.primary,
              width: `${xpPct}%`,
              boxShadow: `0 0 6px ${primaryShadow}`,
              transition: 'width 0.7s ease',
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'Inter, monospace', fontSize: '0.65rem', color: subtleWhiteMid }}>
              {needed?.toLocaleString()} XP to next level
            </p>
            <p style={{ fontSize: '0.65rem', color: subtleWhiteMid }}>
              {nextLevel?.title}
            </p>
          </div>
        </>
      )}
      {level.level === ALL_LEVELS.length && (
        <p style={{ fontSize: '0.75rem', color: C.primary, textAlign: 'center', letterSpacing: '0.06em', fontWeight: 700 }}>
          Max level - Legend
        </p>
      )}
    </div>
  );
}
