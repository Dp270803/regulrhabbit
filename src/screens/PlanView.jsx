import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getData } from '../utils/storage';
import { formatDate } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';

const C = {
  bg: '#131313', low: '#1c1b1b', container: '#201f1f',
  high: '#2a2a2a', highest: '#353534', lowest: '#0e0e0e',
  primary: '#e9c349', onPrimary: '#3c2f00', green: '#2ff801',
  text: '#e5e2e1', muted: '#c4c7c7', faint: '#7b7c7c',
  red: '#ffb4ab',
};

const W = { maxWidth: '900px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 48px)' };

function parseExercises(detail) {
  if (!detail) return [];
  return detail.split(',').map(s => s.trim()).map(item => {
    const match = item.match(/^(.+?)\s+(\d+x\d+)(\s+.*)?$/);
    if (match) return { name: match[1].trim(), sets: match[2], note: match[3]?.trim() || '' };
    return { name: item, sets: '', note: '' };
  }).filter(e => e.name.length > 1);
}

const WEEK_THEMES = ['Activation', 'Intensity', 'Volume', 'Deload'];

export default function PlanView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    trackPageView('plan');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }
    setData(d);
    const active = d.plans.find(p => p.status === 'active');
    if (active) {
      setSelectedPlan(active);
      setExpandedWeek(active.current_week || 1);
    }
  }, [navigate]);

  if (!data || !selectedPlan) {
    return (
      <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingBottom: '7rem' }}>
        <div style={{ ...W, paddingTop: '3.5rem' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>Your Plan</p>
          <h1 className="font-headline" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, letterSpacing: '-0.03em' }}>Training Plan</h1>
          <p style={{ marginTop: '3rem', fontSize: '0.95rem', color: C.faint, textAlign: 'center' }}>No active plan.</p>
          <button onClick={() => navigate('/onboarding')} style={{ marginTop: '1.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto', padding: '0.875rem 2rem', borderRadius: '100px', background: C.text, color: C.bg, border: 'none', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer' }}>
            Create a Plan
          </button>
        </div>
      </div>
    );
  }

  const totalWeeks = selectedPlan.weeks.length;
  const completedSessions = selectedPlan.weeks.flatMap(w => w.sessions).filter(s => s.status === 'completed').length;
  const totalSessions = selectedPlan.weeks.flatMap(w => w.sessions).filter(s => s.type !== 'rest').length;

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, color: C.text, paddingBottom: '7rem' }}>

      {/* ── Header ── */}
      <div style={{ ...W, paddingTop: '3rem', paddingBottom: '2rem' }}>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '8px' }}>
          Your Plan
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 className="font-headline" style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            Training Plan
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.primary, background: `rgba(233,195,73,0.1)`, padding: '4px 10px', borderRadius: '100px' }}>
              Phase 01: Foundation
            </span>
            <span style={{ fontSize: '0.75rem', color: C.faint }}>{selectedPlan.frequency} days/week · {totalWeeks} weeks</span>
          </div>
        </div>

        {/* Plan progress bar */}
        <div style={{ marginTop: '16px', height: '2px', background: C.highest, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: C.primary, borderRadius: '2px', width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%`, transition: 'width 0.5s ease' }} />
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '20px' }}>
          {[
            { label: 'Completed Days', value: completedSessions, total: totalSessions, color: C.green },
            { label: 'Projected Burn', value: `${(totalSessions * 320 / 1000).toFixed(1)}k`, unit: 'kcal', color: C.primary },
            { label: 'Focus Metric', value: 'Hypertrophy', color: C.text },
          ].map(({ label, value, total, unit, color }) => (
            <div key={label} style={{ background: C.lowest, borderRadius: '12px', padding: '20px', overflow: 'hidden', position: 'relative' }}>
              <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, color }}>{value}</span>
                {total !== undefined && <span style={{ fontSize: '1rem', fontWeight: 700, color: C.highest }}>/ {total}</span>}
                {unit && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: C.faint }}>{unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Week Accordions ── */}
      <div style={{ ...W, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {selectedPlan.weeks.map((week, wi) => {
          const isExpanded = expandedWeek === week.week_number;
          const completedCount = week.sessions.filter(s => s.status === 'completed').length;
          const scheduledCount = week.sessions.filter(s => s.type !== 'rest').length;
          const weekNum = String(week.week_number).padStart(2, '0');
          const theme = WEEK_THEMES[wi] || `Week ${week.week_number}`;

          return (
            <div key={week.week_number} style={{ background: C.low, borderRadius: '16px', overflow: 'hidden', opacity: isExpanded ? 1 : 0.85, transition: 'opacity 0.2s' }}>
              {/* Accordion header */}
              <button
                onClick={() => setExpandedWeek(isExpanded ? null : week.week_number)}
                style={{ width: '100%', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isExpanded ? C.container : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s', color: C.text }}
                onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = `rgba(255,255,255,0.03)`; }}
                onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <span className="font-headline" style={{ fontSize: '2.5rem', fontWeight: 800, color: isExpanded ? `rgba(233,195,73,0.25)` : `rgba(255,255,255,0.1)`, lineHeight: 1, transition: 'color 0.2s' }}>{weekNum}</span>
                  <div style={{ textAlign: 'left' }}>
                    <h2 className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>Week {week.week_number}: {theme}</h2>
                    <p style={{ fontSize: '0.78rem', color: C.faint, marginTop: '2px' }}>
                      {completedCount > 0 ? `${completedCount}/${scheduledCount} sessions done` : `${scheduledCount} sessions`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {completedCount > 0 && completedCount === scheduledCount && (
                    <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.green, background: `rgba(47,248,1,0.08)`, padding: '3px 10px', borderRadius: '100px' }}>Complete</span>
                  )}
                  {isExpanded ? <ChevronUp size={18} style={{ color: C.primary }} /> : <ChevronDown size={18} style={{ color: C.faint }} />}
                </div>
              </button>

              {/* Expanded sessions */}
              {isExpanded && (
                <div style={{ padding: '0 0 16px' }}>
                  {week.sessions.map((session, idx) => {
                    const isCompleted = session.status === 'completed';
                    const isMissed = session.status === 'missed';
                    const isSessionExpanded = expandedSession === session.id;
                    const exercises = session.blocks?.find(b => b.type === 'main')
                      ? parseExercises(session.blocks.find(b => b.type === 'main').detail) : [];

                    return (
                      <div key={session.id} style={{ borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                        {/* Session row */}
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '120px 1fr 80px 80px 32px',
                            gap: '0 12px',
                            padding: '16px 28px',
                            alignItems: 'center',
                            cursor: session.blocks ? 'pointer' : 'default',
                            background: isCompleted ? `rgba(47,248,1,0.02)` : isMissed ? `rgba(255,180,171,0.02)` : 'transparent',
                            transition: 'background 0.15s',
                          }}
                          onClick={() => session.blocks && setExpandedSession(isSessionExpanded ? null : session.id)}
                          onMouseEnter={e => { if (session.blocks && !isSessionExpanded) e.currentTarget.style.background = `rgba(255,255,255,0.015)`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = isCompleted ? `rgba(47,248,1,0.02)` : isMissed ? `rgba(255,180,171,0.02)` : 'transparent'; }}
                        >
                          <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>{session.day}</p>
                            {session.date && <p style={{ fontSize: '0.65rem', color: C.faint, marginTop: '2px' }}>{formatDate(session.date)}</p>}
                          </div>

                          <div>
                            <p style={{ fontSize: '0.95rem', fontWeight: 500, color: isCompleted ? C.faint : C.text }}>{session.title}</p>
                            {exercises.length > 0 && !isSessionExpanded && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                {exercises.slice(0, 3).map((ex, i) => (
                                  <span key={i} style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: C.highest, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    {ex.name.split(' ').slice(0, 2).join(' ')}
                                  </span>
                                ))}
                                {exercises.length > 3 && (
                                  <span style={{ fontSize: '0.62rem', color: C.faint }}>+{exercises.length - 3} more</span>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: C.faint }}>
                            <Clock size={12} strokeWidth={1.8} />
                            <span style={{ fontFamily: 'Inter, monospace', fontSize: '0.8rem' }}>{session.duration_minutes}m</span>
                          </div>

                          <div>
                            {isCompleted && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.green, background: `rgba(47,248,1,0.08)`, borderRadius: '100px', padding: '3px 8px' }}>Done</span>
                            )}
                            {isMissed && (
                              <span style={{ fontSize: '0.62rem', fontWeight: 700, color: C.red, background: `rgba(255,180,171,0.08)`, borderRadius: '100px', padding: '3px 8px' }}>Missed</span>
                            )}
                            {!isCompleted && !isMissed && (
                              <span style={{ fontSize: '0.62rem', color: C.faint, background: `rgba(255,255,255,0.04)`, borderRadius: '100px', padding: '3px 8px' }}>Upcoming</span>
                            )}
                          </div>

                          <div style={{ color: C.faint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {session.blocks && (isSessionExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                          </div>
                        </div>

                        {/* Expanded exercise list */}
                        {isSessionExpanded && session.blocks && (
                          <div style={{ padding: '0 28px 20px', borderTop: `1px solid rgba(255,255,255,0.04)` }}>
                            {exercises.length > 0 && (
                              <div style={{ marginTop: '16px' }}>
                                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>
                                  Exercises
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '0 16px' }}>
                                  {exercises.map((ex, i) => (
                                    <div key={i} style={{ display: 'contents' }}>
                                      <p style={{ fontSize: '0.9rem', color: C.text, padding: '8px 0', borderBottom: i < exercises.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>{ex.name}</p>
                                      <p style={{ fontFamily: 'Inter, monospace', fontSize: '0.88rem', fontWeight: 700, color: C.primary, padding: '8px 0', borderBottom: i < exercises.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', textAlign: 'center' }}>{ex.sets || '—'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {session.blocks.filter(b => b.type !== 'main').map((block, i) => (
                              <div key={i} style={{ marginTop: '12px', paddingTop: '12px', borderTop: i === 0 && exercises.length > 0 ? `1px solid rgba(255,255,255,0.06)` : 'none' }}>
                                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>
                                  {block.type}
                                </p>
                                <p style={{ fontSize: '0.85rem', color: C.faint, lineHeight: 1.65 }}>{block.detail}</p>
                              </div>
                            ))}
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

        {/* New plan button */}
        <div style={{ marginTop: '8px', paddingBottom: '1rem' }}>
          <button
            onClick={() => navigate('/onboarding')}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: `1px solid rgba(255,255,255,0.1)`, background: 'transparent', color: C.faint, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
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
