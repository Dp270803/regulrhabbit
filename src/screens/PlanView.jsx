import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData, updateData } from '../utils/storage';
import { formatDate } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';
import { fetchPlanPage } from '../utils/sanityClient';
import { useThemeColors, useTheme } from '../hooks/useTheme';
import exercisesData from '../data/exercises.json';
import { replaceExercise } from '../utils/adaptationEngine';
import { recordAccepted, recordRejected } from '../utils/aiMemory';

const W = { maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 64px)' };

const DEFAULTS = {
  pageTitle:          'Training Plan',
  phaseLabel:         'Phase 01: Foundation',
  durationLabel:      '28 Days Duration',
  weekEntries: [
    { name: 'One',   theme: 'Activation', description: 'Focus on neural recruitment and technique.'        },
    { name: 'Two',   theme: 'Intensity',  description: 'Increasing load and decreasing rest intervals.'    },
    { name: 'Three', theme: 'Volume',     description: 'Maximum sets per muscle group.'                    },
    { name: 'Four',  theme: 'Deload',     description: 'Central nervous system recovery and joint health.' },
  ],
  statCompletedLabel: 'Completed Days',
  statBurnLabel:      'Projected Burn',
  statFocusLabel:     'Focus Metric',
  focusMetric:        'Hypertrophy',
};

function d(cms, key) {
  return (cms?.[key] != null && cms[key] !== '') ? cms[key] : DEFAULTS[key];
}

function getWeekMeta(cms, index) {
  const entries = cms?.weekEntries?.length ? cms.weekEntries : DEFAULTS.weekEntries;
  return entries[index] || { name: `${index + 1}`, theme: `Week ${index + 1}`, description: '' };
}

function parseExercises(detail) {
  if (!detail) return [];
  // Split on | or , (supports both old comma format and new pipe format)
  const parts = detail.split(/\s*\|\s*|\s*,\s*/).map(s => s.trim()).filter(Boolean);
  return parts
    .flatMap(item => {
      // Strip "Superset N: " prefix
      const clean = item.replace(/^Superset\s+\d+:\s*/i, '').trim();
      // Expand "A + B" supersets into individual items
      return clean.includes(' + ') ? clean.split(' + ').map(s => s.trim()) : [clean];
    })
    .map(item => {
      // Match "Exercise Name NxN" or "Exercise Name N×N"
      const match = item.match(/^(.+?)\s+(\d+[x×]\d+(?:-\d+)?)(\s+.*)?$/);
      if (match) return { name: match[1].trim(), sets: match[2].replace('×', 'x') };
      return { name: item, sets: '' };
    })
    .filter(e => e.name.length > 1);
}

function ExerciseAddInput({ onAdd, C }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    setResults(exercisesData.filter(e => e.name.toLowerCase().includes(q)).slice(0, 6));
  }, [query]);

  function pick(name) {
    onAdd(name);
    setQuery('');
    setResults([]);
    ref.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && query.trim()) {
      if (results.length > 0) pick(results[0].name);
      else { onAdd(query.trim()); setQuery(''); setResults([]); }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Add exercise - search or type…"
        style={{
          width: '100%', padding: '9px 12px', borderRadius: '8px',
          border: `1px solid ${focused ? C.primary : C.border}`,
          background: C.bg, color: C.text, fontSize: '0.85rem',
          boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s',
        }}
      />
      {results.length > 0 && focused && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: C.low, border: `1px solid ${C.border}`, borderRadius: '8px',
          marginTop: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden',
        }}>
          {results.map(ex => (
            <button
              key={ex.name}
              onMouseDown={() => pick(ex.name)}
              style={{
                width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', background: 'none', border: 'none',
                cursor: 'pointer', color: C.text, textAlign: 'left',
                borderBottom: `1px solid ${C.separator}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.separator}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ex.name}</span>
              <span style={{ fontSize: '0.62rem', color: C.faint }}>{ex.group}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanView() {
  const C = useThemeColors();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [cms, setCms] = useState(null);
  const [editingSession, setEditingSession] = useState(null); // session.id being edited
  const [editExercises, setEditExercises] = useState([]); // [{name, sets}]
  const [personalising, setPersonalising] = useState(false);
  const [personalisation, setPersonalisation] = useState(null);
  const [personaliseError, setPersonaliseError] = useState(null);

  useEffect(() => {
    trackPageView('plan');
    const stored = getData();
    if (!stored.onboarding_complete) { navigate('/'); return; }
    setData(stored);
    const active = stored.plans.find(p => p.status === 'active');
    if (active) {
      setSelectedPlan(active);
      setExpandedWeek(active.current_week || 1);
    }
    fetchPlanPage().then(doc => { if (doc) setCms(doc); }).catch(() => {});
  }, [navigate]);

  function startEditing(session) {
    const exercises = session.blocks?.find(b => b.type === 'main')
      ? parseExercises(session.blocks.find(b => b.type === 'main').detail)
      : [];
    setEditExercises(exercises.map(e => ({ name: e.name, sets: e.sets })));
    setEditingSession(session.id);
  }

  function saveEdits(sessionTitle) {
    const detailStr = editExercises
      .filter(e => e.name)
      .map(e => e.sets ? `${e.name} ${e.sets}` : e.name)
      .join(' | ');

    const updated = updateData(d => {
      const plan = d.plans.find(p => p.status === 'active');
      if (!plan) return d;
      for (const week of plan.weeks) {
        for (const session of week.sessions) {
          if (session.title !== sessionTitle) continue;
          const mainBlock = session.blocks?.find(b => b.type === 'main');
          if (mainBlock) mainBlock.detail = detailStr;
          else if (!session.blocks) session.blocks = [{ type: 'main', detail: detailStr }];
          else session.blocks.push({ type: 'main', detail: detailStr });
        }
      }
      return d;
    });
    setData(updated);
    setSelectedPlan(updated.plans.find(p => p.status === 'active'));
    setEditingSession(null);
    setEditExercises([]);
  }

  /**
   * Extract unique exercise names across all sessions in the plan.
   */
  function collectExerciseNames(plan) {
    const set = new Set();
    for (const week of plan.weeks || []) {
      for (const session of week.sessions || []) {
        for (const block of session.blocks || []) {
          if (!block.detail) continue;
          for (const part of block.detail.split('|')) {
            const name = part.trim().split(/\s+\d/)[0].trim();
            if (name) set.add(name);
          }
        }
      }
    }
    return [...set];
  }

  async function handlePersonalise() {
    if (!selectedPlan || personalising) return;
    setPersonalising(true);
    setPersonaliseError(null);
    setPersonalisation(null);
    try {
      const res = await fetch('/.netlify/functions/personalise-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan_name: selectedPlan.name || selectedPlan.activity || 'plan',
          exercises: collectExerciseNames(selectedPlan),
          profile: {
            sex: data.user?.sex || 'male',
            goal: data.user?.goal || selectedPlan.gym_goal || 'maintenance',
            body_weight_kg: data.user?.body_weight_kg,
            height_cm: data.user?.height_cm,
            age: data.user?.age,
            experience_level: data.user?.training_experience || selectedPlan.experience_level || 'intermediate',
            injuries: data.user?.injuries || [],
            dietary_preference: data.user?.dietary_preference,
            cuisine: data.user?.cuisine,
          },
        }),
      });
      if (!res.ok) throw new Error('Network');
      const result = await res.json();
      setPersonalisation(result);
    } catch {
      setPersonaliseError('Coach is offline. Try again in a moment.');
    } finally {
      setPersonalising(false);
    }
  }

  function acceptSubstitution(sub) {
    if (!sub?.old_exercise || !sub?.new_exercise) return;
    recordAccepted({
      text: `Swap ${sub.old_exercise} → ${sub.new_exercise} (${sub.reason || ''})`,
      category: 'personalise_plan',
    });
    const updated = updateData(d => {
      const plan = d.plans.find(p => p.id === selectedPlan.id);
      if (!plan) return d;
      const newPlan = replaceExercise(plan, sub.old_exercise, {
        name: sub.new_exercise,
        sets: 3,
        reps: '8-12',
      });
      const idx = d.plans.findIndex(p => p.id === plan.id);
      if (idx >= 0) d.plans[idx] = newPlan;
      // Track in plan_updates so the user sees it on Dashboard
      d.plan_updates = d.plan_updates || [];
      d.plan_updates.push({
        id: `psub_${Date.now()}`,
        date: new Date().toISOString(),
        source: 'personalise_plan',
        seen: true,            // already accepted, not a notification
        changes: [{
          type: 'replace_exercise',
          old_exercise: sub.old_exercise,
          new_exercise: sub.new_exercise,
          exercise: sub.new_exercise,
          reason: sub.reason || '',
          book_reference: sub.book_reference || '',
        }],
      });
      return d;
    });
    setData(updated);
    setSelectedPlan(updated.plans.find(p => p.status === 'active'));
    // Remove the accepted sub from the list
    setPersonalisation(prev => prev ? {
      ...prev,
      substitutions: prev.substitutions.filter(s => s !== sub),
    } : prev);
  }

  function dismissSubstitution(sub) {
    recordRejected({
      text: `Swap ${sub.old_exercise} → ${sub.new_exercise}`,
      category: 'personalise_plan',
    });
    setPersonalisation(prev => prev ? {
      ...prev,
      substitutions: prev.substitutions.filter(s => s !== sub),
    } : prev);
  }

  if (!data || !selectedPlan) {
    return (
      <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
        <div style={{ ...W, paddingTop: 'clamp(28px, 4vw, 48px)' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Your Plan</p>
          <h1 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.03em' }}>Training Plan</h1>
          <p style={{ marginTop: '3rem', fontSize: '0.95rem', color: C.faint, textAlign: 'center' }}>No active plan.</p>
          <button
            onClick={() => navigate('/onboarding')}
            style={{ marginTop: '1.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto', padding: '0.875rem 2rem', borderRadius: '100px', background: C.text, color: C.bg, border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Create a Plan
          </button>
        </div>
      </div>
    );
  }

  const totalSessions = selectedPlan.weeks.flatMap(w => w.sessions).length;
  const completedSessions = selectedPlan.weeks.flatMap(w => w.sessions).filter(s => s.status === 'completed').length;
  const kcal = ((totalSessions * 320) / 1000).toFixed(1);

  return (
    <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '0', paddingTop: 'clamp(28px, 4vw, 48px)', paddingBottom: '4px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 className="font-headline" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1, marginBottom: '1rem' }}>
            {d(cms, 'pageTitle')}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.primary, background: `rgba(${C.primaryRgb},0.1)`,
              padding: '5px 12px', borderRadius: '100px',
            }}>
              {d(cms, 'phaseLabel')}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.faint, background: C.separator,
              padding: '5px 12px', borderRadius: '100px',
            }}>
              {d(cms, 'durationLabel')}
            </span>
            <button
              onClick={handlePersonalise}
              disabled={personalising}
              style={{
                padding: '6px 14px', borderRadius: '100px',
                background: personalising ? C.separator : C.primary,
                color: personalising ? C.faint : C.onPrimary,
                border: 'none', fontSize: '0.7rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: personalising ? 'not-allowed' : 'pointer',
              }}
            >
              {personalising ? 'Analysing…' : '✨ Personalise for me'}
            </button>
          </div>
          {personaliseError && (
            <p style={{ fontSize: '0.78rem', color: '#ff6b6b', margin: '0 0 12px' }}>{personaliseError}</p>
          )}
          {personalisation && (
            <div style={{
              background: `rgba(${C.primaryRgb},0.06)`, border: `1px solid rgba(${C.primaryRgb},0.18)`,
              borderRadius: '14px', padding: '18px 20px', marginBottom: '12px',
            }}>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primary, margin: '0 0 6px' }}>
                Coach personalisation
              </p>
              <p style={{ fontSize: '0.92rem', fontWeight: 700, color: C.text, margin: '0 0 10px' }}>
                {personalisation.summary}
              </p>
              {personalisation.notes && (
                <p style={{ fontSize: '0.82rem', color: C.muted, lineHeight: 1.55, margin: '0 0 14px' }}>
                  {personalisation.notes}
                </p>
              )}
              {personalisation.substitutions?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {personalisation.substitutions.map((sub, i) => (
                    <div key={i} style={{
                      background: C.lowest, borderRadius: '10px', padding: '12px 14px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap',
                    }}>
                      <div style={{ flex: 1, minWidth: '240px' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
                          {sub.old_exercise} <span style={{ color: C.faint, fontWeight: 500 }}>→</span> {sub.new_exercise}
                        </p>
                        <p style={{ fontSize: '0.78rem', color: C.muted, margin: '0 0 4px', lineHeight: 1.4 }}>{sub.reason}</p>
                        {sub.book_reference && (
                          <p style={{ fontSize: '0.66rem', color: C.faint, margin: 0, fontStyle: 'italic' }}>- {sub.book_reference}</p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => acceptSubstitution(sub)}
                          style={{ padding: '6px 13px', borderRadius: '8px', background: C.primary, color: C.onPrimary, border: 'none', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                          Apply
                        </button>
                        <button onClick={() => dismissSubstitution(sub)}
                          style={{ padding: '6px 13px', borderRadius: '8px', background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>
                          Skip
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.82rem', color: C.faint, margin: 0, fontStyle: 'italic' }}>
                  No substitutions needed - your plan suits your profile.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Week Accordions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {selectedPlan.weeks.map((week, wi) => {
            const isExpanded = expandedWeek === week.week_number;
            const completedCount = week.sessions.filter(s => s.status === 'completed').length;
            const totalCount = week.sessions.length;
            const weekNum = String(week.week_number).padStart(2, '0');
            const { name, theme, description } = getWeekMeta(cms, wi);
            const allDone = completedCount === totalCount && totalCount > 0;

            return (
              <div
                key={week.week_number}
                style={{
                  background: C.low, borderRadius: '16px',
                  overflow: week.sessions.some(s => s.id === editingSession) ? 'visible' : 'hidden',
                  opacity: isExpanded ? 1 : 0.85,
                  transition: 'opacity 0.2s',
                }}
              >
                {/* Accordion header */}
                <button
                  onClick={() => setExpandedWeek(isExpanded ? null : week.week_number)}
                  style={{
                    width: '100%', padding: '24px 28px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: isExpanded ? C.high : 'transparent',
                    border: 'none', cursor: 'pointer', color: C.text,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.separator; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span
                      className="font-headline"
                      style={{
                        fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800,
                        color: isExpanded ? `rgba(${C.primaryRgb},0.3)` : C.border,
                        lineHeight: 1, transition: 'color 0.2s', userSelect: 'none',
                      }}
                    >
                      {weekNum}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <h2 className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                        Week {name}: {theme}
                      </h2>
                      <p style={{ fontSize: '0.78rem', color: C.faint, marginTop: '4px' }}>{description}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {allDone && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, background: `rgba(47,248,1,0.08)`, padding: '3px 10px', borderRadius: '100px' }}>
                        Complete
                      </span>
                    )}
                    <span className="material-symbols-outlined" style={{ color: isExpanded ? C.primary : C.faint, fontSize: '20px', transition: 'color 0.2s' }}>
                      {isExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </button>

                {/* Expanded sessions */}
                {isExpanded && (
                  <div style={{ paddingBottom: '12px' }}>
                    {week.sessions.map((session, idx) => {
                      const isCompleted = session.status === 'completed';
                      const isMissed = session.status === 'missed';
                      const isSessionExpanded = expandedSession === session.id;
                      const exercises = session.blocks?.find(b => b.type === 'main')
                        ? parseExercises(session.blocks.find(b => b.type === 'main').detail)
                        : [];
                      const warmup = session.blocks?.find(b => b.type === 'warmup');
                      const cooldown = session.blocks?.find(b => b.type === 'cooldown');

                      return (
                        <div key={session.id} style={{ borderTop: `1px solid ${C.separator}` }}>
                          {/* Session row */}
                          <div
                            className="planview-session-row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'clamp(80px,15%,160px) 1fr auto',
                              gap: '12px',
                              padding: '16px clamp(16px, 4vw, 28px)',
                              alignItems: 'center',
                              background: isCompleted ? `rgba(47,248,1,0.02)` : isMissed ? `rgba(255,180,171,0.02)` : 'transparent',
                            }}
                          >
                            {/* Day + Title */}
                            <div>
                              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.primary, marginBottom: '4px' }}>
                                {session.day}
                              </p>
                              <p className="font-headline" style={{ fontSize: '1rem', fontWeight: 700, color: isCompleted ? C.faint : C.text, lineHeight: 1.2 }}>
                                {session.title}
                              </p>
                            </div>

                            {/* Exercise pills (collapsed) or rest text */}
                            <div style={{ minWidth: 0 }}>
                              {exercises.length > 0 && !isSessionExpanded ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {exercises.slice(0, 6).map((ex, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        fontSize: '0.68rem', fontWeight: 600,
                                        padding: '3px 9px', borderRadius: '6px',
                                        background: C.highest, color: C.muted,
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {ex.name}
                                    </span>
                                  ))}
                                  {exercises.length > 6 && (
                                    <span style={{ fontSize: '0.68rem', color: C.faint, padding: '3px 0' }}>+{exercises.length - 6}</span>
                                  )}
                                </div>
                              ) : exercises.length === 0 ? (
                                <p style={{ fontSize: '0.83rem', color: C.faint, fontStyle: 'italic' }}>
                                  {session.blocks?.[0]?.detail || 'Recovery day'}
                                </p>
                              ) : null}
                            </div>

                            {/* Details button */}
                            {exercises.length > 0 && (
                              <button
                                onClick={() => setExpandedSession(isSessionExpanded ? null : session.id)}
                                style={{
                                  padding: '6px 14px', borderRadius: '6px',
                                  border: `1px solid ${isSessionExpanded ? `rgba(${C.primaryRgb},0.35)` : C.border}`,
                                  background: isSessionExpanded ? `rgba(${C.primaryRgb},0.08)` : 'transparent',
                                  color: isSessionExpanded ? C.primary : C.faint,
                                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                                  textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(${C.primaryRgb},0.35)`; e.currentTarget.style.color = C.primary; }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = isSessionExpanded ? `rgba(${C.primaryRgb},0.35)` : C.border;
                                  e.currentTarget.style.color = isSessionExpanded ? C.primary : C.faint;
                                }}
                              >
                                {isSessionExpanded ? 'Close' : 'Details'}
                              </button>
                            )}
                          </div>

                          {/* Expanded exercise list */}
                          {isSessionExpanded && (
                            <div style={{ padding: '0 28px 24px' }}>
                              {warmup && (
                                <div style={{ marginBottom: '16px', padding: '12px 0', borderTop: `1px solid ${C.separator}` }}>
                                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Warm Up</p>
                                  <p style={{ fontSize: '0.83rem', color: C.muted, lineHeight: 1.6 }}>{warmup.detail}</p>
                                </div>
                              )}
                              {exercises.length > 0 && (
                                <div style={{ borderTop: `1px solid ${C.separator}`, paddingTop: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, margin: 0 }}>Exercises</p>
                                    {!isCompleted && editingSession !== session.id && (
                                      <button
                                        onClick={() => startEditing(session)}
                                        style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer', color: C.faint, fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
                                        onMouseEnter={e => { e.currentTarget.style.color = C.text; e.currentTarget.style.borderColor = C.muted; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = C.faint; e.currentTarget.style.borderColor = C.border; }}
                                      >
                                        Edit
                                      </button>
                                    )}
                                  </div>

                                  {editingSession === session.id ? (
                                    <div>
                                      {editExercises.map((ex, ei) => (
                                        <div key={ei} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 24px', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                                          <p style={{ fontSize: '0.85rem', color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ex.name}>{ex.name}</p>
                                          <input
                                            type="text"
                                            value={ex.sets}
                                            placeholder="3x8-12"
                                            onChange={e => setEditExercises(prev => prev.map((x, i) => i === ei ? { ...x, sets: e.target.value } : x))}
                                            style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.8rem', outline: 'none', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}
                                          />
                                          <button
                                            onClick={() => setEditExercises(prev => prev.filter((_, i) => i !== ei))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.faint, fontSize: '1.1rem', lineHeight: 1, padding: 0 }}
                                          >×</button>
                                        </div>
                                      ))}
                                      <div style={{ marginTop: '10px', marginBottom: '12px' }}>
                                        <ExerciseAddInput onAdd={name => setEditExercises(prev => [...prev, { name, sets: '' }])} C={C} />
                                      </div>
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                          onClick={() => saveEdits(session.title)}
                                          style={{ padding: '7px 20px', borderRadius: '8px', background: C.text, color: C.bg, border: 'none', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => { setEditingSession(null); setEditExercises([]); }}
                                          style={{ padding: '7px 14px', borderRadius: '8px', background: 'transparent', color: C.faint, border: `1px solid ${C.border}`, fontSize: '0.82rem', cursor: 'pointer' }}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      {exercises.map((ex, i) => (
                                        <div
                                          key={i}
                                          style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 0',
                                            borderBottom: i < exercises.length - 1 ? `1px solid ${C.separator}` : 'none',
                                          }}
                                        >
                                          <p style={{ fontSize: '0.9rem', color: C.text }}>{ex.name}</p>
                                          <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.85rem', fontWeight: 700, color: C.primary }}>{ex.sets || '-'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {cooldown && (
                                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${C.separator}` }}>
                                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Cool Down</p>
                                  <p style={{ fontSize: '0.83rem', color: C.muted, lineHeight: 1.6 }}>{cooldown.detail}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Progress Summary Bento ── */}
        <div className="planview-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '20px' }}>
          {/* Completed Days */}
          <div style={{
            background: C.lowest, borderRadius: '16px', padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '160px', border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint }}>
              {d(cms, 'statCompletedLabel')}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: C.green, lineHeight: 1 }}>
                {completedSessions}
              </span>
              <span className="font-headline" style={{ fontSize: '1.4rem', fontWeight: 700, color: C.faint, opacity: 0.4 }}>
                / {totalSessions}
              </span>
            </div>
          </div>

          {/* Projected Burn */}
          <div style={{
            background: C.lowest, borderRadius: '16px', padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '160px', border: `1px solid ${C.border}`,
          }}>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint }}>
              {d(cms, 'statBurnLabel')}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: C.primary, lineHeight: 1 }}>
                {kcal}k
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: C.faint }}>kcal</span>
            </div>
          </div>

          {/* Focus Metric */}
          <div style={{
            background: C.lowest, borderRadius: '16px', padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '160px', border: `1px solid ${C.border}`,
            overflow: 'hidden', position: 'relative',
          }}>
            <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, position: 'relative', zIndex: 1 }}>
              {d(cms, 'statFocusLabel')}
            </p>
            <span className="font-headline" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 800, color: C.text, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>
              {d(cms, 'focusMetric')}
            </span>
            {/* Background icon */}
            <span className="material-symbols-outlined" style={{
              position: 'absolute', bottom: '-12px', right: '-8px',
              fontSize: '100px', color: C.faint, opacity: 0.08, userSelect: 'none',
            }}>
              fitness_center
            </span>
          </div>
        </div>

        {/* ── New plan button ── */}
        <div style={{ marginTop: '8px', paddingBottom: '1rem' }}>
          <button
            onClick={() => navigate('/onboarding')}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              border: `1px solid ${C.border}`,
              background: 'transparent', color: C.faint,
              fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.muted; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.faint; }}
          >
            Start New Plan
          </button>
        </div>

      </div>
    </div>
  );
}
