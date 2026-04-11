import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown, Youtube } from 'lucide-react';

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
  return clean.length > 32 ? clean.slice(0, 30) + '…' : clean;
}

function CollapsibleBlock({ label, duration, text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-2)' }}>{label}</span>
          {duration && <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--color-text-3)' }}>· {duration}m</span>}
        </div>
        <ChevronDown size={16} strokeWidth={1.8} style={{ color: 'var(--color-text-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '4px 32px 24px' }}>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.75, color: 'var(--color-text-2)' }}>{text}</p>
        </div>
      )}
    </div>
  );
}

export default function SessionCard({ session, onComplete, isCompleted, isCooldown, isRestDay, equipment, isNextSession, nextLabel }) {
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
      <div style={{ ...CARD, padding: '36px' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '14px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2.2rem', color: 'var(--color-text-1)', marginBottom: '12px' }}>Rest Day</h3>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-2)', lineHeight: 1.7 }}>Recovery is where growth happens. Rest days build what training breaks down.</p>
        <p style={{ marginTop: '24px', fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--color-text-3)', textTransform: 'uppercase' }}>Tomorrow you rise again</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...CARD, padding: '36px' }}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-text-3)', marginBottom: '14px' }}>Today</p>
        <h3 className="font-display" style={{ fontSize: '2.2rem', color: 'var(--color-text-1)', marginBottom: '8px' }}>No Session Today</h3>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-2)' }}>Enjoy your day.</p>
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

  const showAlts = Object.keys(alts).length > 0;
  const cols = showAlts ? '28px 1fr 88px 1fr' : '28px 1fr 88px';

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
      <div style={{ padding: '32px 32px 24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: isNextSession ? 'var(--color-gold)' : 'var(--color-text-3)', marginBottom: '10px' }}>
            {nextLabel || 'Today'}
          </p>
          <h3 className="font-display" style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2.2rem)', color: 'var(--color-text-1)', lineHeight: 1.1, marginBottom: '10px' }}>
            {session.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-3)' }}>
            <Clock size={13} strokeWidth={1.8} />
            <span className="font-mono" style={{ fontSize: '0.85rem' }}>{session.duration_minutes} min</span>
          </div>
        </div>
        {isCompleted && (
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={20} strokeWidth={2.5} style={{ color: 'var(--color-green)' }} />
          </div>
        )}
      </div>

      {/* ── Warm Up ── */}
      {warmup && <CollapsibleBlock label="Warm Up" duration={warmup.duration_minutes} text={warmup.detail} />}

      {/* ── Exercise Table ── */}
      {exercises.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

          {/* Section label + progress counter */}
          <div style={{ padding: '20px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-text-2)' }}>
              Main Work{mainBlock?.duration_minutes ? ` · ${mainBlock.duration_minutes}m` : ''}
            </p>
            {doneCount > 0 && (
              <p className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: doneCount === exercises.length ? 'var(--color-green)' : 'var(--color-gold)' }}>
                {doneCount}/{exercises.length} done
              </p>
            )}
          </div>

          {/* Column headers */}
          <div style={{
            margin: '14px 32px 0',
            padding: '10px 0',
            display: 'grid',
            gridTemplateColumns: cols,
            gap: '0 16px',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div />
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Exercise</p>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>Sets</p>
            {showAlts && (
              <p style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                Alternative
              </p>
            )}
          </div>

          {/* Exercise rows */}
          <div style={{ padding: '0 32px 24px' }}>
            {exercises.map((ex, i) => {
              const isDone = checked[ex.name];
              const alt = alts[ex.name];
              return (
                <div
                  key={i}
                  onClick={() => !isCompleted && toggle(ex.name)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: cols,
                    gap: '0 16px',
                    alignItems: 'center',
                    padding: '16px 0',
                    borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    cursor: isCompleted ? 'default' : 'pointer',
                    transition: 'opacity 0.15s',
                    opacity: isDone ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.opacity = isDone ? '0.35' : '0.8'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isDone ? '0.45' : '1'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    border: isDone ? 'none' : '1.5px solid rgba(255,255,255,0.25)',
                    background: isDone ? 'var(--color-green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isDone && <Check size={12} strokeWidth={3} style={{ color: '#000' }} />}
                  </div>

                  {/* Exercise name */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p style={{
                        fontSize: '1rem', color: isDone ? 'var(--color-text-3)' : 'var(--color-text-1)',
                        fontWeight: 500, lineHeight: 1.3,
                        textDecoration: isDone ? 'line-through' : 'none',
                      }}>{ex.name}</p>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form tutorial')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`How to: ${ex.name}`}
                        style={{ color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FF0000'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                      >
                        <Youtube size={13} strokeWidth={1.8} />
                      </a>
                    </div>
                    {ex.note && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginTop: '2px' }}>{ex.note}</p>}
                  </div>

                  {/* Sets */}
                  <div style={{ textAlign: 'center' }}>
                    <span className="font-mono" style={{ fontSize: '1rem', color: isDone ? 'var(--color-text-3)' : 'var(--color-gold)', fontWeight: 700 }}>
                      {ex.sets}
                    </span>
                  </div>

                  {/* Alternative */}
                  {showAlts && (
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-3)', lineHeight: 1.4 }}>
                      {alt ? shortAlt(alt) : <span style={{ opacity: 0.25 }}>—</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {doneCount > 0 && (
            <div style={{ padding: '0 32px 20px' }}>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '3px',
                  background: allDone ? 'var(--color-green)' : 'var(--color-gold)',
                  width: `${(doneCount / exercises.length) * 100}%`,
                  transition: 'width 0.3s ease, background 0.3s ease',
                  boxShadow: allDone ? '0 0 8px rgba(74,222,128,0.5)' : '0 0 8px rgba(232,193,98,0.4)',
                }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Cool Down ── */}
      {cooldown && <CollapsibleBlock label="Cool Down" duration={cooldown.duration_minutes} text={cooldown.detail} />}

      {/* ── Complete button ── */}
      {!isCompleted && !isNextSession && (
        <div style={{ padding: '24px 32px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {isCooldown ? (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                Session logged — come back tomorrow
              </p>
            </div>
          ) : (
            <button
              onClick={onComplete}
              style={{
                width: '100%', padding: '18px',
                background: allDone
                  ? 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
                  : '#fff',
                color: allDone ? '#000' : '#000',
                border: 'none', borderRadius: '12px',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.25s ease',
                boxShadow: allDone ? '0 0 28px rgba(74,222,128,0.35)' : 'none',
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
          )}
        </div>
      )}
    </div>
  );
}
