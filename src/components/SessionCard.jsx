import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown, PlayCircle } from 'lucide-react';

const C = {
  low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
  red: '#ffb4ab',
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
    <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', color: C.text }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>{label}</span>
          {duration && <span style={{ fontSize: '0.72rem', color: C.faint }}>· {duration}m</span>}
        </div>
        <ChevronDown size={15} strokeWidth={1.8} style={{ color: C.faint, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && (
        <div style={{ padding: '4px 28px 20px' }}>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.75, color: C.muted }}>{text}</p>
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
      else setAlts(db);
    }).catch(() => {});
  }, [equipment]);

  const cardStyle = {
    background: C.low,
    borderRadius: '16px',
    overflow: 'hidden',
  };

  if (isRestDay) {
    return (
      <div style={{ ...cardStyle, padding: '36px 28px' }}>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Today</p>
        <h3 className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, marginBottom: '12px' }}>Rest Day</h3>
        <p style={{ fontSize: '1rem', color: C.muted, lineHeight: 1.7 }}>Recovery is where growth happens. Rest days build what training breaks down.</p>
        <p style={{ marginTop: '20px', fontSize: '0.72rem', letterSpacing: '0.1em', color: C.faint, textTransform: 'uppercase' }}>Tomorrow you rise again</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ ...cardStyle, padding: '36px 28px' }}>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Today</p>
        <h3 className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, marginBottom: '8px' }}>No Session Today</h3>
        <p style={{ fontSize: '1rem', color: C.muted }}>Enjoy your day.</p>
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
  const cols = showAlts ? '24px 1fr 80px 1fr' : '24px 1fr 80px';

  return (
    <div style={{
      ...cardStyle,
      background: isCompleted ? `linear-gradient(145deg, rgba(47,248,1,0.06) 0%, ${C.low} 60%)` : C.low,
      outline: isCompleted ? `1px solid rgba(47,248,1,0.18)` : 'none',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '28px 28px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: isNextSession ? C.primary : C.faint, marginBottom: '8px' }}>
            {nextLabel || 'Today\'s Session'}
          </p>
          <h3 className="font-headline" style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, lineHeight: 1.1, marginBottom: '10px', textTransform: 'uppercase' }}>
            {session.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.faint }}>
            <Clock size={12} strokeWidth={1.8} />
            <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.82rem' }}>{session.duration_minutes} min</span>
          </div>
        </div>
        {isCompleted && (
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0, background: `rgba(47,248,1,0.1)`, border: `1px solid rgba(47,248,1,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={18} strokeWidth={2.5} style={{ color: C.green }} />
          </div>
        )}
      </div>

      {/* ── Warm Up ── */}
      {warmup && <CollapsibleBlock label="Warm Up" duration={warmup.duration_minutes} text={warmup.detail} />}

      {/* ── Exercise Table ── */}
      {exercises.length > 0 && (
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}>
          {/* Section label + progress */}
          <div style={{ padding: '18px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>
              Core Movements{mainBlock?.duration_minutes ? ` · ${mainBlock.duration_minutes}m` : ''}
            </p>
            {doneCount > 0 && (
              <p style={{ fontFamily: 'Inter, monospace', fontSize: '0.78rem', fontWeight: 700, color: doneCount === exercises.length ? C.green : C.primary }}>
                {doneCount}/{exercises.length} done
              </p>
            )}
          </div>

          {/* Column headers */}
          <div style={{ margin: '12px 28px 0', padding: '8px 0', display: 'grid', gridTemplateColumns: cols, gap: '0 14px', alignItems: 'center', borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
            <div />
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Exercise</p>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', textAlign: 'center' }}>Sets</p>
            {showAlts && <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>Alternative</p>}
          </div>

          {/* Exercise rows */}
          <div style={{ padding: '0 28px 20px' }}>
            {exercises.map((ex, i) => {
              const isDone = checked[ex.name];
              const alt = alts[ex.name];
              return (
                <div
                  key={i}
                  onClick={() => !isCompleted && toggle(ex.name)}
                  style={{
                    display: 'grid', gridTemplateColumns: cols, gap: '0 14px',
                    alignItems: 'center', padding: '16px 0',
                    borderBottom: i < exercises.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                    cursor: isCompleted ? 'default' : 'pointer',
                    transition: 'opacity 0.15s', opacity: isDone ? 0.42 : 1,
                  }}
                  onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.opacity = isDone ? '0.32' : '0.78'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isDone ? '0.42' : '1'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    border: isDone ? 'none' : `1.5px solid rgba(255,255,255,0.22)`,
                    background: isDone ? C.green : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isDone && <Check size={12} strokeWidth={3} style={{ color: C.onPrimary }} />}
                  </div>

                  {/* Exercise name + Watch link */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <p className="font-headline" style={{
                        fontSize: '1rem', fontWeight: 700, color: isDone ? C.faint : C.text,
                        lineHeight: 1.2, textDecoration: isDone ? 'line-through' : 'none',
                        letterSpacing: '-0.01em',
                      }}>{ex.name}</p>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form tutorial')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`How to: ${ex.name}`}
                        style={{ color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, transition: 'color 0.15s', textDecoration: 'none', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FF0000'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                      >
                        <PlayCircle size={12} strokeWidth={1.8} />
                      </a>
                    </div>
                    {ex.note && <p style={{ fontSize: '0.72rem', color: C.faint, marginTop: '2px' }}>{ex.note}</p>}
                  </div>

                  {/* Sets badge */}
                  <div style={{ textAlign: 'center' }}>
                    <span className="font-headline" style={{ fontSize: '1rem', fontWeight: 800, color: isDone ? C.faint : C.primary }}>
                      {ex.sets}
                    </span>
                  </div>

                  {/* Alternative */}
                  {showAlts && (
                    <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.4 }}>
                      {alt ? shortAlt(alt) : <span style={{ opacity: 0.22 }}>—</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {doneCount > 0 && (
            <div style={{ padding: '0 28px 18px' }}>
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: allDone ? C.green : C.primary,
                  width: `${(doneCount / exercises.length) * 100}%`,
                  transition: 'width 0.3s ease, background 0.3s ease',
                  boxShadow: allDone ? `0 0 8px rgba(47,248,1,0.5)` : `0 0 8px rgba(233,195,73,0.4)`,
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
        <div style={{ padding: '20px 28px 28px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
          {isCooldown ? (
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em' }}>
                Session logged — come back tomorrow
              </p>
            </div>
          ) : (
            <button
              onClick={onComplete}
              style={{
                width: '100%', padding: '18px',
                background: allDone ? C.green : C.text,
                color: allDone ? C.onPrimary : '#000',
                border: 'none', borderRadius: '100px',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                transition: 'all 0.25s ease',
                boxShadow: allDone ? `0 0 28px rgba(47,248,1,0.35)` : '0 4px 24px rgba(0,0,0,0.3)',
                fontFamily: 'Manrope, sans-serif',
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
