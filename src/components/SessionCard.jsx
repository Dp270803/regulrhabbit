import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';

const CARD = {
  background: 'linear-gradient(145deg, #1c1c1c 0%, #121212 100%)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '20px',
  boxShadow: '0 4px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
};

function parseExercises(detail) {
  return detail
    .split(',')
    .map(s => s.trim())
    .map(item => {
      const match = item.match(/^(.+?)\s+(\d+x\d+)(\s+.*)?$/);
      if (match) {
        return { name: match[1].trim(), sets: match[2], note: match[3]?.trim() || '' };
      }
      return { name: item, sets: '-', note: '' };
    })
    .filter(e => e.name.length > 1);
}

function shortAlt(str) {
  if (!str) return '';
  const clean = str.replace(/\s*\(.*?\)/g, '').trim();
  return clean.length > 28 ? clean.slice(0, 26) + '…' : clean;
}

function CollapsibleBlock({ label, duration, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>{label}</span>
          {duration && <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-3)' }}>· {duration}m</span>}
        </div>
        <ChevronDown size={14} strokeWidth={1.8} style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 28px 16px' }}>
          <p style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--color-text-2)' }}>{text}</p>
        </div>
      )}
    </div>
  );
}

export default function SessionCard({ session, onComplete, isCompleted, isRestDay, equipment }) {
  const [checked, setChecked] = useState({});
  const [alts, setAlts] = useState({});

  useEffect(() => {
    import('../data/templates/gym.json').then(mod => {
      const data = mod.default || mod;
      const bw = data.equipment_variants?.bodyweight?.substitutions || {};
      const db = data.equipment_variants?.home_dumbbells?.substitutions || {};
      if (equipment === 'bodyweight') setAlts({});
      else if (equipment === 'home_dumbbells') setAlts(bw);
      else setAlts(db); // full_gym → show dumbbell alts
    }).catch(() => {});
  }, [equipment]);

  if (isRestDay) {
    return (
      <div style={{ ...CARD, padding: '32px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '14px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2rem', color: 'var(--color-text-1)', marginBottom: '10px' }}>Rest Day</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)', lineHeight: 1.6 }}>Recovery is where growth happens. Rest days build what training breaks down.</p>
        <p style={{ marginTop: '20px', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Tomorrow you rise again</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...CARD, padding: '32px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '14px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2rem', color: 'var(--color-text-1)', marginBottom: '8px' }}>No Session Today</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-2)' }}>Enjoy your day.</p>
      </div>
    );
  }

  const warmup = session.blocks?.find(b => b.type === 'warmup');
  const mainBlock = session.blocks?.find(b => b.type === 'main');
  const cooldown = session.blocks?.find(b => b.type === 'cooldown');
  const exercises = mainBlock ? parseExercises(mainBlock.detail) : [];

  const doneCount = exercises.filter(ex => checked[ex.name]).length;
  const allDone = exercises.length > 0 && doneCount === exercises.length;

  const toggle = (name) => setChecked(prev => ({ ...prev, [name]: !prev[name] }));

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
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '8px' }}>Today</p>
          <h3 className="font-display" style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', color: 'var(--color-text-1)', lineHeight: 1.1, marginBottom: '8px' }}>{session.title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-3)' }}>
            <Clock size={12} strokeWidth={1.8} />
            <span className="font-mono" style={{ fontSize: '0.75rem' }}>{session.duration_minutes} min</span>
          </div>
        </div>
        {isCompleted && (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={18} strokeWidth={2.5} style={{ color: 'var(--color-green)' }} />
          </div>
        )}
      </div>

      {/* ── Warm Up ── */}
      {warmup && <CollapsibleBlock label="Warm Up" duration={warmup.duration_minutes} text={warmup.detail} />}

      {/* ── Exercise Checklist ── */}
      {exercises.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Section header */}
          <div style={{ padding: '16px 28px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--color-text-3)' }}>
              Main Work {mainBlock?.duration_minutes ? `· ${mainBlock.duration_minutes}m` : ''}
            </p>
            {doneCount > 0 && (
              <p className="font-mono" style={{ fontSize: '0.7rem', color: doneCount === exercises.length ? 'var(--color-green)' : 'var(--color-gold)' }}>
                {doneCount}/{exercises.length}
              </p>
            )}
          </div>

          {/* Column headers */}
          <div style={{ padding: '0 28px 6px', display: 'grid', gridTemplateColumns: Object.keys(alts).length ? '24px 1fr 72px 1fr' : '24px 1fr 72px', gap: '0 8px', alignItems: 'center' }}>
            <div />
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>Exercise</p>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>Sets</p>
            {Object.keys(alts).length > 0 && (
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
                {equipment === 'home_dumbbells' ? 'Bodyweight Alt' : 'Home Alt'}
              </p>
            )}
          </div>

          {/* Exercise rows */}
          <div style={{ padding: '0 28px 20px' }}>
            {exercises.map((ex, i) => {
              const isDone = checked[ex.name];
              const alt = alts[ex.name];
              const showAlts = Object.keys(alts).length > 0;
              return (
                <div
                  key={i}
                  onClick={() => !isCompleted && toggle(ex.name)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: showAlts ? '24px 1fr 72px 1fr' : '24px 1fr 72px',
                    gap: '0 8px',
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    cursor: isCompleted ? 'default' : 'pointer',
                    transition: 'opacity 0.15s',
                    opacity: isDone ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.opacity = isDone ? '0.4' : '0.85'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isDone ? '0.5' : '1'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                    border: isDone ? 'none' : '1.5px solid rgba(255,255,255,0.22)',
                    background: isDone ? 'var(--color-green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isDone && <Check size={11} strokeWidth={3} style={{ color: '#000' }} />}
                  </div>

                  {/* Exercise name */}
                  <div>
                    <p style={{
                      fontSize: '0.875rem', color: isDone ? 'var(--color-text-3)' : 'var(--color-text-1)',
                      fontWeight: 500, lineHeight: 1.3,
                      textDecoration: isDone ? 'line-through' : 'none',
                    }}>{ex.name}</p>
                    {ex.note && <p style={{ fontSize: '0.68rem', color: 'var(--color-text-3)', marginTop: '1px' }}>{ex.note}</p>}
                  </div>

                  {/* Sets */}
                  <div style={{ textAlign: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '0.82rem', color: isDone ? 'var(--color-text-3)' : 'var(--color-gold)', fontWeight: 600 }}>
                      {ex.sets}
                    </span>
                  </div>

                  {/* Alt */}
                  {showAlts && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                      {alt ? shortAlt(alt) : <span style={{ opacity: 0.3 }}>—</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {doneCount > 0 && (
            <div style={{ padding: '0 28px 16px' }}>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: allDone ? 'var(--color-green)' : 'var(--color-gold)',
                  width: `${(doneCount / exercises.length) * 100}%`,
                  transition: 'width 0.3s ease, background 0.3s ease',
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cool Down ── */}
      {cooldown && <CollapsibleBlock label="Cool Down" duration={cooldown.duration_minutes} text={cooldown.detail} />}

      {/* ── Complete button ── */}
      {!isCompleted && (
        <div style={{ padding: '20px 28px 28px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={onComplete}
            style={{
              width: '100%', padding: '16px',
              background: allDone
                ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                : 'var(--color-text-1)',
              color: allDone ? '#000' : 'var(--color-bg)',
              border: 'none', borderRadius: '12px',
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all 0.25s ease',
              boxShadow: allDone ? '0 0 24px rgba(74,222,128,0.3)' : 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {allDone
              ? '✓ All done — Mark Complete'
              : doneCount > 0
              ? `Mark Complete (${doneCount}/${exercises.length} done)`
              : 'Mark Complete'}
          </button>
        </div>
      )}
    </div>
  );
}
