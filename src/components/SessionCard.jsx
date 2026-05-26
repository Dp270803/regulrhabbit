import { useState, useEffect } from 'react';
import { Clock, Check, ChevronDown } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';
import { getData, updateData } from '../utils/storage';
import { estimateSessionCalories } from '../utils/calorieCalculator';
import { analytics } from '../utils/analytics';
import { sanityImageUrl } from '../utils/sanityClient';
import { getLastPerformance, getProgressionSuggestion, suggestStartingWeight } from '../utils/performanceHistory';

function YtIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
    </svg>
  );
}

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
  return `${m[1]} Sets x ${m[2]} Reps`;
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

  const storageKey = session?.id ? `wdraft_${session.id}` : null;

  // Persist checked state across tab switches
  const [checked, setChecked] = useState(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(`${storageKey}_chk`) || '{}'); }
    catch { return {}; }
  });

  // Per-exercise log: { exerciseName: { actual_reps, weight_kg } }
  const [logs, setLogs] = useState(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(`${storageKey}_logs`) || '{}'); }
    catch { return {}; }
  });

  const [alts, setAlts] = useState({});
  const [saving, setSaving] = useState(false);

  // Snapshot of prior logs + profile for last-time / starting-weight / overload hints
  const [history] = useState(() => {
    const d = getData();
    return {
      workoutLogs: d.workout_logs || [],
      profile: {
        body_weight_kg: d.user?.body_weight_kg,
        sex: d.user?.sex || d.user?.diet_profile?.sex,
        experience_level: d.user?.training_experience || d.plans?.find(p => p.status === 'active')?.experience_level || 'Beginner',
      },
    };
  });

  useEffect(() => {
    import('../data/templates/gym.json').then(mod => {
      const data = mod.default || mod;
      const bw = data.equipment_variants?.bodyweight?.substitutions || {};
      const db = data.equipment_variants?.home_dumbbells?.substitutions || {};
      if (equipment === 'bodyweight') setAlts(bw);
      else if (equipment === 'home_dumbbells') setAlts(db);
      else setAlts({});
    }).catch(() => {});
  }, [equipment]);

  // Persist checked to localStorage whenever it changes
  useEffect(() => {
    if (!storageKey || isCompleted) return;
    try { localStorage.setItem(`${storageKey}_chk`, JSON.stringify(checked)); }
    catch {}
  }, [checked, storageKey, isCompleted]);

  // Persist logs to localStorage whenever they change
  useEffect(() => {
    if (!storageKey || isCompleted) return;
    try { localStorage.setItem(`${storageKey}_logs`, JSON.stringify(logs)); }
    catch {}
  }, [logs, storageKey, isCompleted]);

  // Clear draft when session is marked complete
  useEffect(() => {
    if (isCompleted && storageKey) {
      try {
        localStorage.removeItem(`${storageKey}_chk`);
        localStorage.removeItem(`${storageKey}_logs`);
      } catch {}
    }
  }, [isCompleted, storageKey]);

  const cardStyle = { background: C.low, borderRadius: '16px', overflow: 'hidden', boxShadow: C.cardShadow };

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

  const toggle = (name) => {
    if (isCompleted) return;
    setChecked(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const updateLog = (name, field, value) => {
    setLogs(prev => ({ ...prev, [name]: { ...prev[name], [field]: value } }));
  };

  const heroImgUrl = heroImg ? sanityImageUrl(heroImg.image, { width: 900 }) : null;

  async function handleMarkComplete() {
    if (saving) return;
    setSaving(true);

    // Build filled log from inline inputs
    const d = getData();
    const filled = exercises.map(ex => {
      const log = logs[ex.name] || {};
      const setsMatch = ex.sets?.match(/^(\d+)x(\d+(?:-\d+)?)$/);
      return {
        exercise_name: ex.name,
        sets: setsMatch ? parseInt(setsMatch[1]) : null,
        reps: log.actual_reps || (setsMatch ? setsMatch[2] : null),
        weight_kg: log.weight_kg ? parseFloat(log.weight_kg) : null,
        rir: null,
      };
    }).filter(l => l.sets || l.weight_kg || l.reps);

    const { adjusted_calories } = estimateSessionCalories({
      duration_minutes: session.duration_minutes || null,
      body_weight_kg: d.user?.body_weight_kg || null,
      exercises: filled,
    });

    if (filled.length > 0) {
      const logEntry = {
        id: crypto.randomUUID(),
        session_id: session.id || null,
        session_title: session.title || '',
        date: session.date || new Date().toISOString().split('T')[0],
        logged_at: new Date().toISOString(),
        duration_minutes: session.duration_minutes || null,
        exercises: filled,
        body_weight_kg: d.user?.body_weight_kg || null,
        adjusted_calories,
        final_calories: adjusted_calories,
        calorie_reasoning: adjusted_calories ? `~${adjusted_calories} kcal based on session volume` : null,
      };
      updateData(dd => {
        if (!Array.isArray(dd.workout_logs)) dd.workout_logs = [];
        dd.workout_logs.push(logEntry);
        return dd;
      });
      analytics.workoutLogged({
        session_day: session.day,
        exercises_count: filled.length,
        sets_logged: filled.reduce((s, l) => s + (l.sets || 0), 0),
      });
    }

    onComplete();
    onPerformanceLogged?.({ suggestions: [], plan_adjustments: [], diet_adjustments: [] });
    setSaving(false);
  }

  return (
    <div style={{
      ...cardStyle,
      background: isCompleted ? `linear-gradient(145deg, rgba(47,248,1,0.06) 0%, ${C.low} 60%)` : C.low,
      outline: isCompleted ? `1px solid rgba(47,248,1,0.18)` : 'none',
    }}>
      {/* Hero image header */}
      {heroImgUrl ? (
        <div style={{ position: 'relative', height: 'clamp(220px, 28vw, 380px)', overflow: 'hidden' }}>
          <img src={heroImgUrl} alt={heroImg.alt || 'Training session'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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

      {warmup && <CollapsibleBlock label="Warm Up" duration={warmup.duration_minutes} text={warmup.detail} />}

      {/* Exercise list with inline logging */}
      {exercises.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.separator}` }}>
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

          {/* Column headers for weight/reps - only when not completed */}
          {!isCompleted && (
            <div style={{ padding: '10px clamp(16px,5vw,28px) 4px', display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, width: '70px', textAlign: 'center' }}>Reps</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, width: '70px', textAlign: 'center' }}>Weight kg</span>
            </div>
          )}

          <div style={{ padding: `4px clamp(16px,5vw,28px) 20px` }}>
            {exercises.map((ex, i) => {
              const isDone = !!checked[ex.name];
              const alt = alts[ex.name];
              const tags = EXERCISE_TAGS[ex.name] || [];
              const setsLabel = formatSets(ex.sets);
              const log = logs[ex.name] || {};

              // Feedback loop: what did they lift last time, or where to start?
              const last = getLastPerformance(history.workoutLogs, ex.name);
              const overload = last ? getProgressionSuggestion(history.workoutLogs, ex.name, ex.sets) : null;
              const startWeight = !last ? suggestStartingWeight(ex.name, history.profile) : null;

              return (
                <div
                  key={i}
                  style={{
                    padding: '14px 0',
                    borderBottom: i < exercises.length - 1 ? `1px solid ${C.separator}` : 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '14px',
                      cursor: isCompleted ? 'default' : 'pointer',
                      transition: 'opacity 0.15s',
                    }}
                    onClick={() => toggle(ex.name)}
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

                    {/* Name + sets */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <p className="font-headline" style={{
                          fontSize: '1rem', fontWeight: 700,
                          color: isDone ? C.faint : C.text,
                          lineHeight: 1.25,
                          textDecoration: isDone ? 'line-through' : 'none',
                          letterSpacing: '-0.01em',
                        }}>{ex.name}</p>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' exercise form')}`}
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
                          {setsLabel} <span style={{ color: C.faint, fontWeight: 400, fontSize: '0.7rem' }}>(planned)</span>
                        </p>
                      )}

                      {/* Feedback loop: last time / overload nudge / starting weight */}
                      {!isCompleted && last && (
                        <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span>Last time: <strong style={{ color: C.text }}>{last.weight_kg}kg × {last.reps}</strong></span>
                          {overload && (
                            <span style={{ color: C.green, fontWeight: 700 }}>
                              ↑ try {overload.to}kg
                            </span>
                          )}
                        </p>
                      )}
                      {!isCompleted && !last && startWeight && (
                        <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: '4px' }}>
                          Suggested start: <strong style={{ color: C.text }}>~{startWeight}kg</strong>
                          <span style={{ color: C.faint }}> — adjust so the last 2 reps are hard</span>
                        </p>
                      )}

                      {ex.note && <p style={{ fontSize: '0.72rem', color: C.faint, marginTop: '2px' }}>{ex.note}</p>}
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
                            Home Alt
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Muscle tags */}
                    {tags.length > 0 && (
                      <div className="session-exercise-tags" style={{ display: 'flex', gap: '4px', flexShrink: 0, paddingTop: '2px' }}>
                        {tags.map(tag => (
                          <span key={tag} style={{ fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: '4px', background: C.highest, color: C.faint }}>{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Inline weight/reps inputs - always visible when not completed */}
                    {!isCompleted && (
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={ex.sets?.match(/x(\d+)/)?.[1] || '-'}
                          value={log.actual_reps || ''}
                          onChange={e => updateLog(ex.name, 'actual_reps', e.target.value)}
                          style={{
                            width: '70px', padding: '7px 6px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isDone ? `rgba(${C.primaryRgb},0.5)` : C.border}`,
                            background: isDone ? `rgba(${C.primaryRgb},0.06)` : C.bg,
                            color: C.text, fontSize: '0.85rem', textAlign: 'center', outline: 'none',
                            fontFamily: 'Inter, monospace', fontWeight: 600,
                          }}
                        />
                        <input
                          type="number"
                          inputMode="decimal"
                          placeholder={overload ? `${overload.to}` : last ? `${last.weight_kg}` : startWeight ? `${startWeight}` : 'kg'}
                          value={log.weight_kg || ''}
                          onChange={e => updateLog(ex.name, 'weight_kg', e.target.value)}
                          style={{
                            width: '70px', padding: '7px 6px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isDone && log.weight_kg ? `rgba(${C.primaryRgb},0.5)` : C.border}`,
                            background: isDone && log.weight_kg ? `rgba(${C.primaryRgb},0.06)` : C.bg,
                            color: C.text, fontSize: '0.85rem', textAlign: 'center', outline: 'none',
                            fontFamily: 'Inter, monospace', fontWeight: 600,
                          }}
                        />
                      </div>
                    )}
                  </div>
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

      {cooldown && <CollapsibleBlock label="Cool Down" duration={cooldown.duration_minutes} text={cooldown.detail} />}

      {/* Complete / Log button */}
      {!isCompleted && !isNextSession && (
        <div style={{ padding: '20px 28px 28px', borderTop: `1px solid ${C.separator}` }}>
          {isCooldown ? (
            <div style={{ padding: '16px', borderRadius: '10px', background: C.separator, textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: C.faint, letterSpacing: '0.02em' }}>
                {cms?.sessionDoneLabel || 'Session logged - come back tomorrow'}
              </p>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '0.72rem', color: C.faint, textAlign: 'center', marginBottom: '12px' }}>
                {doneCount === 0
                  ? 'Tick each exercise and log reps + weight as you go'
                  : allDone
                  ? 'All exercises done - ready to complete'
                  : `${exercises.length - doneCount} exercise${exercises.length - doneCount > 1 ? 's' : ''} remaining`}
              </p>
              <button
                onClick={handleMarkComplete}
                disabled={saving}
                style={{
                  width: '100%', padding: '18px',
                  background: allDone ? C.green : C.text,
                  color: allDone ? C.onPrimary : '#000',
                  border: 'none', borderRadius: '100px',
                  fontSize: '1rem', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  transition: 'all 0.25s ease',
                  boxShadow: allDone ? `0 0 28px rgba(47,248,1,0.35)` : '0 4px 24px rgba(0,0,0,0.3)',
                  fontFamily: 'Manrope, sans-serif',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving...' : allDone
                  ? `All done - ${cms?.markCompleteLabel || 'Mark Complete'}`
                  : doneCount > 0
                  ? `${cms?.markCompleteLabel || 'Mark Complete'} (${doneCount}/${exercises.length})`
                  : cms?.markCompleteLabel || 'Mark Complete'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
