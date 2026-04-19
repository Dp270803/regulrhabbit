import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';
import PerformanceLogger from './PerformanceLogger';
import { useAuth } from '../hooks/useAuth';

function YtIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
    </svg>
  );
}
import { sanityImageUrl } from '../utils/sanityClient';

// Muscle/movement group tags per exercise name
const EXERCISE_TAGS = {
  'Barbell Back Squat': ['LEGS', 'POWER'], 'Romanian Deadlift': ['LEGS', 'PULL'],
  'Leg Press': ['LEGS', 'PUSH'], 'Walking Lunges': ['LEGS', 'UNI'], 'Dumbbell Lunges': ['LEGS', 'UNI'],
  'Calf Raises': ['CALVES', 'PUSH'], 'Bulgarian Split Squat': ['LEGS', 'UNI'],
  'Flat Bench Press': ['CHEST', 'PUSH'], 'Dumbbell Bench Press': ['CHEST', 'PUSH'],
  'Incline Dumbbell Press': ['CHEST', 'PUSH'], 'Incline Barbell Press': ['CHEST', 'PUSH'],
  'Overhead Press': ['SHOULDERS', 'PUSH'], 'Dumbbell Shoulder Press': ['SHOULDERS', 'PUSH'],
  'Dumbbell Lateral Raise': ['SHOULDERS', 'ISO'], 'Tricep Rope Pushdown': ['TRICEPS', 'PUSH'],
  'Bent-Over Barbell Row': ['BACK', 'PULL'], 'Barbell Row': ['BACK', 'PULL'],
  'Barbell Deadlift': ['BACK', 'POWER'], 'Deadlift': ['BACK', 'POWER'],
  'Lat Pulldown': ['BACK', 'PULL'], 'Seated Rows': ['BACK', 'PULL'],
  'Neutral Grip Pull-ups': ['BACK', 'PULL'], 'Pull Ups': ['BACK', 'PULL'],
  'Face Pulls': ['REAR DELTS', 'PULL'], 'Dumbbell Bicep Curl': ['BICEPS', 'ISO'],
  'Barbell Curl': ['BICEPS', 'ISO'], 'Hammer Curl': ['BICEPS', 'ISO'],
};

function parseExercises(detail) {
  if (!detail) return [];
  return detail
    .split(/\s*\|\s*|\s*,\s*/)
    .map(s => s.trim())
    .filter(Boolean)
    .flatMap(item => {
      const clean = item.replace(/^Superset\s+\d+:\s*/i, '').trim();
      return clean.includes(' + ') ? clean.split(' + ').map(s => s.trim()) : [clean];
    })
    .map(item => {
      const match = item.match(/^(.+?)\s+(\d+[x×]\d+(?:-\d+)?)(\s+.*)?$/);
      if (match) {
        return { name: match[1].trim(), sets: match[2].replace('×', 'x'), note: match[3]?.trim() || '' };
      }
      return { name: item, sets: '-', note: '' };
    })
    .filter(e => e.name.length > 1);
}

function formatSets(sets) {
  if (!sets || sets === '-') return null;
  const m = sets.match(/^(\d+)x(\d+(?:-\d+)?)$/);
  if (!m) return sets;
  return `${m[1]} Sets × ${m[2]} Reps`;
}

function shortAlt(str) {
  if (!str) return '';
  const clean = str.replace(/\s*\(.*?\)/g, '').trim();
  return clean.length > 32 ? clean.slice(0, 30) + '…' : clean;
}

function CollapsibleBlock({ label, duration, text }) {
  const C = useThemeColors();
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: `1px solid ${C.separator}` }}>
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

export default function SessionCard({ session, onComplete, onPerformanceLogged, isCompleted, isCooldown, isRestDay, equipment, isNextSession, nextLabel, heroImg, cms }) {
  const C = useThemeColors();
  const [checked, setChecked] = useState({});
  const [alts, setAlts] = useState({});
  const [showLogger, setShowLogger] = useState(false);
  const { user: authUser } = useAuth();

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
    boxShadow: C.cardShadow,
  };

  if (isRestDay) {
    return (
      <div style={{ ...cardStyle, padding: '36px 28px' }}>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Today</p>
        <h3 className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: C.text, marginBottom: '12px' }}>{cms?.restDayTitle || 'Rest Day'}</h3>
        <p style={{ fontSize: '1rem', color: C.muted, lineHeight: 1.7 }}>{cms?.restDayBody || 'Recovery is where growth happens. Rest days build what training breaks down.'}</p>
        <p style={{ marginTop: '20px', fontSize: '0.72rem', letterSpacing: '0.1em', color: C.faint, textTransform: 'uppercase' }}>{cms?.restDayFootnote || 'Tomorrow you rise again'}</p>
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

  const heroImgUrl = heroImg ? sanityImageUrl(heroImg.image, { width: 900 }) : null;

  return (
    <div style={{
      ...cardStyle,
      background: isCompleted ? `linear-gradient(145deg, rgba(47,248,1,0.06) 0%, ${C.low} 60%)` : C.low,
      outline: isCompleted ? `1px solid rgba(47,248,1,0.18)` : 'none',
    }}>
      {/* ── Hero Image Header ── */}
      {heroImgUrl ? (
        <div style={{ position: 'relative', height: 'clamp(220px, 28vw, 380px)', overflow: 'hidden' }}>
          <img
            src={heroImgUrl}
            alt={heroImg.alt || 'Training session'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(19,19,19,0.15) 0%, rgba(28,27,27,0.97) 100%)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 28px 24px' }}>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: isNextSession ? C.primary : 'rgba(255,255,255,0.55)', marginBottom: '6px' }}>
              {nextLabel || cms?.todaySessionLabel || "Today's Session"}
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '12px' }}>
              <h3 className="font-headline" style={{ fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', lineHeight: 1.1, textTransform: 'uppercase' }}>
                {session.title}
              </h3>
              {isCompleted && (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0, background: `rgba(47,248,1,0.12)`, border: `1px solid rgba(47,248,1,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={17} strokeWidth={2.5} style={{ color: C.green }} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>
              <Clock size={12} strokeWidth={1.8} />
              <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.82rem' }}>{session.duration_minutes} min</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Text Header (fallback when no hero image) ── */
        <div style={{ padding: '28px 28px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: isNextSession ? C.primary : C.faint, marginBottom: '8px' }}>
              {nextLabel || cms?.todaySessionLabel || "Today's Session"}
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
      )}

      {/* ── Warm Up ── */}
      {warmup && <CollapsibleBlock label="Warm Up" duration={warmup.duration_minutes} text={warmup.detail} />}

      {/* ── Exercise Table ── */}
      {exercises.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.separator}` }}>
          {/* Section label + progress */}
          <div style={{ padding: '18px clamp(16px,5vw,28px) 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted }}>
              Core Movements{mainBlock?.duration_minutes ? ` · ${mainBlock.duration_minutes}m` : ''}
            </p>
            {doneCount > 0 && (
              <p style={{ fontFamily: 'Inter, monospace', fontSize: '0.78rem', fontWeight: 700, color: doneCount === exercises.length ? C.green : C.primary }}>
                {doneCount}/{exercises.length} done
              </p>
            )}
          </div>

          {/* Exercise rows */}
          <div style={{ padding: `8px clamp(16px,5vw,28px) 20px` }}>
            {exercises.map((ex, i) => {
              const isDone = checked[ex.name];
              const alt = alts[ex.name];
              const tags = EXERCISE_TAGS[ex.name] || [];
              const setsLabel = formatSets(ex.sets);
              return (
                <div
                  key={i}
                  onClick={() => !isCompleted && toggle(ex.name)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px 0',
                    borderBottom: i < exercises.length - 1 ? `1px solid ${C.separator}` : 'none',
                    cursor: isCompleted ? 'default' : 'pointer',
                    transition: 'opacity 0.15s', opacity: isDone ? 0.42 : 1,
                  }}
                  onMouseEnter={e => { if (!isCompleted) e.currentTarget.style.opacity = isDone ? '0.32' : '0.78'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = isDone ? '0.42' : '1'; }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '3px',
                    border: isDone ? 'none' : `1.5px solid ${C.border}`,
                    background: isDone ? C.green : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isDone && <Check size={12} strokeWidth={3} style={{ color: C.onPrimary }} />}
                  </div>

                  {/* Content: name + sets + links */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row with inline YouTube icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <p className="font-headline" style={{
                        fontSize: '1rem', fontWeight: 700, color: isDone ? C.faint : C.text,
                        lineHeight: 1.25, textDecoration: isDone ? 'line-through' : 'none',
                        letterSpacing: '-0.01em',
                      }}>{ex.name}</p>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form tutorial')}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        title={`How to: ${ex.name}`}
                        style={{ color: C.faint, display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FF0000'}
                        onMouseLeave={e => e.currentTarget.style.color = C.faint}
                      >
                        <YtIcon size={13} />
                      </a>
                    </div>
                    {setsLabel && (
                      <p style={{ fontFamily: 'Inter, monospace', fontSize: '0.75rem', fontWeight: 600, color: isDone ? C.faint : C.primary, marginTop: '3px' }}>
                        {setsLabel}
                      </p>
                    )}
                    {ex.note && <p style={{ fontSize: '0.72rem', color: C.faint, marginTop: '2px' }}>{ex.note}</p>}
                    {/* Home alt link (only when equipment variant applies) */}
                    {alt && (
                      <div style={{ marginTop: '5px' }}>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(alt + ' exercise')}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, textDecoration: 'none', transition: 'color 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.color = C.primary}
                          onMouseLeave={e => e.currentTarget.style.color = C.faint}
                        >
                          ⌂ Home Alt
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Muscle tags — hidden on mobile to prevent overflow */}
                  {tags.length > 0 && (
                    <div className="session-exercise-tags" style={{ display: 'flex', gap: '4px', flexShrink: 0, paddingTop: '2px' }}>
                      {tags.map(tag => (
                        <span key={tag} style={{
                          fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em',
                          textTransform: 'uppercase', padding: '3px 7px', borderRadius: '4px',
                          background: C.highest, color: C.faint,
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          {doneCount > 0 && (
            <div style={{ padding: `0 clamp(16px,5vw,28px) 18px` }}>
              <div style={{ height: '2px', background: C.separator, borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '2px',
                  background: allDone ? C.green : C.primary,
                  width: `${(doneCount / exercises.length) * 100}%`,
                  transition: 'width 0.3s ease, background 0.3s ease',
                  boxShadow: allDone ? `0 0 8px rgba(47,248,1,0.5)` : `0 0 8px rgba(${C.primaryRgb},0.4)`,
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
        <div style={{ padding: '20px 28px 28px', borderTop: `1px solid ${C.separator}` }}>
          {isCooldown ? (
            <div style={{ padding: '16px', borderRadius: '10px', background: C.separator, textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: C.faint, letterSpacing: '0.02em' }}>
                {cms?.sessionDoneLabel || 'Session logged — come back tomorrow'}
              </p>
            </div>
          ) : (
            <button
              onClick={() => { onComplete(); setShowLogger(true); }}
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
                ? `✓ All done — ${cms?.markCompleteLabel || 'Mark Complete'}`
                : doneCount > 0
                ? `${cms?.markCompleteLabel || 'Mark Complete'} (${doneCount}/${exercises.length} done)`
                : cms?.markCompleteLabel || 'Mark Complete'}
            </button>
          )}
        </div>
      )}

      {/* ── Performance logger (shown after session completion) ── */}
      {isCompleted && showLogger && (
        <PerformanceLogger
          exercises={exercises}
          sessionId={session.id}
          date={session.date}
          userId={authUser?.id || null}
          onSave={(calorieData) => {
            setShowLogger(false);
            onPerformanceLogged?.(calorieData);
          }}
        />
      )}
    </div>
  );
}
