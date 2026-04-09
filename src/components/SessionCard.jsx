import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';

const CARD = {
  background: 'linear-gradient(145deg, #1c1c1c 0%, #121212 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '20px',
  boxShadow: '0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
};

/* Parse "Exercise 3x8, Exercise 2x10 each leg, …" into rows */
function parseExercises(detail) {
  return detail
    .split(',')
    .map(s => s.trim())
    .map(item => {
      const match = item.match(/^(.+?)\s+(\d+x\d+)(\s+.*)?$/);
      if (match) {
        return {
          name: match[1].trim(),
          sets: match[2],
          note: match[3]?.trim() || '',
        };
      }
      return { name: item, sets: '-', note: '' };
    })
    .filter(e => e.name.length > 1);
}

/* Shorten long alternative strings for table display */
function shortAlt(str) {
  if (!str) return '';
  const clean = str.replace(/\s*\(.*?\)/g, '').trim();
  return clean.length > 32 ? clean.slice(0, 30) + '…' : clean;
}

export default function SessionCard({ session, onComplete, isCompleted, isRestDay, equipment }) {
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [cooldownOpen, setCooldownOpen] = useState(false);
  const [alts, setAlts] = useState({});

  /* Load bodyweight alternatives */
  useEffect(() => {
    import('../data/templates/gym.json').then(mod => {
      const data = mod.default || mod;
      const bwSubs = data.equipment_variants?.bodyweight?.substitutions || {};
      const dbSubs = data.equipment_variants?.home_dumbbells?.substitutions || {};
      // For full_gym users → show bodyweight as alt
      // For home_dumbbells → show bodyweight as alt
      // For bodyweight → no alts needed
      if (equipment === 'bodyweight') {
        setAlts({});
      } else if (equipment === 'home_dumbbells') {
        setAlts(bwSubs);
      } else {
        // full_gym: show dumbbell variant as primary alt, bodyweight as secondary
        setAlts(dbSubs);
      }
    }).catch(() => {});
  }, [equipment]);

  if (isRestDay) {
    return (
      <div style={{ ...CARD, padding: '32px' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '16px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2rem', color: 'var(--color-text-1)', marginBottom: '10px' }}>Rest Day</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: 1.6 }}>
          Recovery is where growth happens. Rest days build what training breaks down.
        </p>
        <p style={{ marginTop: '20px', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--color-text-3)', textTransform: 'uppercase' }}>
          Tomorrow you rise again
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...CARD, padding: '32px' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '16px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2rem', color: 'var(--color-text-1)', marginBottom: '8px' }}>No Session Today</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)' }}>Enjoy your day.</p>
      </div>
    );
  }

  const warmup = session.blocks?.find(b => b.type === 'warmup');
  const mainBlock = session.blocks?.find(b => b.type === 'main');
  const cooldown = session.blocks?.find(b => b.type === 'cooldown');
  const exercises = mainBlock ? parseExercises(mainBlock.detail) : [];
  const showAlts = Object.keys(alts).length > 0;

  return (
    <div
      style={{
        ...CARD,
        background: isCompleted
          ? 'linear-gradient(145deg, rgba(74,222,128,0.07) 0%, #121212 60%)'
          : CARD.background,
        border: isCompleted ? '1px solid rgba(74,222,128,0.2)' : CARD.border,
      }}
    >
      {/* ── Header ── */}
      <div style={{ padding: '28px 28px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '8px' }}>Today</p>
          <h3 className="font-display" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: 'var(--color-text-1)', lineHeight: 1.1, marginBottom: '8px' }}>
            {session.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-3)' }}>
            <Clock size={12} strokeWidth={1.8} />
            <span className="font-mono" style={{ fontSize: '0.75rem' }}>{session.duration_minutes} min</span>
          </div>
        </div>
        {isCompleted && (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)' }}>
            <Check size={18} strokeWidth={2.5} style={{ color: 'var(--color-green)' }} />
          </div>
        )}
      </div>

      {/* ── Warm Up (collapsible) ── */}
      {warmup && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setWarmupOpen(v => !v)}
            style={{ width: '100%', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Warm Up</span>
              <span className="font-mono" style={{ fontSize: '0.65rem' }}>· {warmup.duration_minutes}m</span>
            </div>
            <ChevronDown size={14} style={{ transform: warmupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {warmupOpen && (
            <div style={{ padding: '0 28px 16px' }}>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--color-text-2)' }}>{warmup.detail}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Main Exercises Table ── */}
      {exercises.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ padding: '16px 28px 0' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '12px' }}>
              Main Work {mainBlock?.duration_minutes ? `· ${mainBlock.duration_minutes}m` : ''}
            </p>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: showAlts ? '1fr 88px 1fr' : '1fr 88px', gap: '0', padding: '0 28px', marginBottom: '4px' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>Exercise</p>
            <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-3)', textAlign: 'center' }}>Sets</p>
            {showAlts && (
              <p style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-3)', paddingLeft: '12px' }}>
                {equipment === 'home_dumbbells' ? 'Bodyweight Alt' : 'Dumbbell Alt'}
              </p>
            )}
          </div>

          {/* Table rows */}
          <div style={{ padding: '0 28px 20px' }}>
            {exercises.map((ex, i) => {
              const alt = alts[ex.name];
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showAlts ? '1fr 88px 1fr' : '1fr 88px',
                    gap: '0',
                    padding: '10px 0',
                    borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-1)', fontWeight: 500, lineHeight: 1.3 }}>{ex.name}</p>
                    {ex.note && <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)', marginTop: '2px' }}>{ex.note}</p>}
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 600 }}>{ex.sets}</span>
                  </div>
                  {showAlts && (
                    <div style={{ paddingLeft: '12px' }}>
                      {alt ? (
                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-3)', lineHeight: 1.4 }}>{shortAlt(alt)}</p>
                      ) : (
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.15)' }}>—</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Cool Down (collapsible) ── */}
      {cooldown && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setCooldownOpen(v => !v)}
            style={{ width: '100%', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Cool Down</span>
              <span className="font-mono" style={{ fontSize: '0.65rem' }}>· {cooldown.duration_minutes}m</span>
            </div>
            <ChevronDown size={14} style={{ transform: cooldownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {cooldownOpen && (
            <div style={{ padding: '0 28px 16px' }}>
              <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--color-text-2)' }}>{cooldown.detail}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Complete button ── */}
      {!isCompleted && (
        <div style={{ padding: '0 28px 28px', borderTop: exercises.length > 0 || warmup || cooldown ? 'none' : undefined }}>
          <button
            onClick={onComplete}
            style={{
              width: '100%', padding: '16px',
              background: 'var(--color-text-1)', color: 'var(--color-bg)',
              border: 'none', borderRadius: '12px',
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.02em', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Mark Complete
          </button>
        </div>
      )}
    </div>
  );
}
