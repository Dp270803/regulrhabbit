import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData } from '../utils/storage';
import { formatDate } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';
import { fetchPlanPage } from '../utils/sanityClient';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
  red: '#ffb4ab',
};

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
  return detail.split(',').map(s => s.trim()).map(item => {
    const match = item.match(/^(.+?)\s+(\d+x\d+(?:-\d+)?)(\s+.*)?$/);
    if (match) return { name: match[1].trim(), sets: match[2] };
    return { name: item, sets: '' };
  }).filter(e => e.name.length > 1);
}

export default function PlanView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);
  const [cms, setCms] = useState(null);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.primary, background: `rgba(233,195,73,0.1)`,
              padding: '5px 12px', borderRadius: '100px',
            }}>
              {d(cms, 'phaseLabel')}
            </span>
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.faint, background: `rgba(255,255,255,0.05)`,
              padding: '5px 12px', borderRadius: '100px',
            }}>
              {d(cms, 'durationLabel')}
            </span>
          </div>
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
                  background: C.low, borderRadius: '16px', overflow: 'hidden',
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
                  onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = `rgba(255,255,255,0.03)`; }}
                  onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span
                      className="font-headline"
                      style={{
                        fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800,
                        color: isExpanded ? `rgba(233,195,73,0.25)` : `rgba(255,255,255,0.08)`,
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
                        <div key={session.id} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                          {/* Session row */}
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'clamp(100px,15%,160px) 1fr auto',
                              gap: '12px',
                              padding: '18px 28px',
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
                                  border: `1px solid ${isSessionExpanded ? `rgba(233,195,73,0.35)` : `rgba(255,255,255,0.14)`}`,
                                  background: isSessionExpanded ? `rgba(233,195,73,0.08)` : 'transparent',
                                  color: isSessionExpanded ? C.primary : C.faint,
                                  fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em',
                                  textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap',
                                  transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `rgba(233,195,73,0.35)`; e.currentTarget.style.color = C.primary; }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.borderColor = isSessionExpanded ? `rgba(233,195,73,0.35)` : `rgba(255,255,255,0.14)`;
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
                                <div style={{ marginBottom: '16px', padding: '12px 0', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
                                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '4px' }}>Warm Up</p>
                                  <p style={{ fontSize: '0.83rem', color: C.muted, lineHeight: 1.6 }}>{warmup.detail}</p>
                                </div>
                              )}
                              {exercises.length > 0 && (
                                <div style={{ borderTop: `1px solid rgba(255,255,255,0.05)`, paddingTop: '12px' }}>
                                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>Exercises</p>
                                  <div>
                                    {exercises.map((ex, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                          padding: '10px 0',
                                          borderBottom: i < exercises.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none',
                                        }}
                                      >
                                        <p style={{ fontSize: '0.9rem', color: C.text }}>{ex.name}</p>
                                        <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.85rem', fontWeight: 700, color: C.primary }}>{ex.sets || '—'}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {cooldown && (
                                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid rgba(255,255,255,0.05)` }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '20px' }}>
          {/* Completed Days */}
          <div style={{
            background: C.lowest, borderRadius: '16px', padding: '28px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            minHeight: '160px', border: `1px solid rgba(68,71,72,0.12)`,
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
            minHeight: '160px', border: `1px solid rgba(68,71,72,0.12)`,
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
            minHeight: '160px', border: `1px solid rgba(68,71,72,0.12)`,
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
              border: `1px solid rgba(255,255,255,0.1)`,
              background: 'transparent', color: C.faint,
              fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = C.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = C.faint; }}
          >
            Start New Plan
          </button>
        </div>

      </div>
    </div>
  );
}
