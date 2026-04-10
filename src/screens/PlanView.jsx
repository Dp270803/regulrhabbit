import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { getData } from '../utils/storage';
import { formatDate } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';

const W = { maxWidth: '900px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 40px)' };

function parseExercises(detail) {
  if (!detail) return [];
  return detail.split(',').map(s => s.trim()).map(item => {
    const match = item.match(/^(.+?)\s+(\d+x\d+)(\s+.*)?$/);
    if (match) return { name: match[1].trim(), sets: match[2], note: match[3]?.trim() || '' };
    return { name: item, sets: '', note: '' };
  }).filter(e => e.name.length > 1);
}

export default function PlanView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [expandedSession, setExpandedSession] = useState(null);

  useEffect(() => {
    trackPageView('plan');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }
    setData(d);
    const active = d.plans.find(p => p.status === 'active');
    if (active) { setSelectedPlan(active); setSelectedWeek(active.current_week || 1); }
  }, [navigate]);

  if (!data || !selectedPlan) {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', paddingBottom: '7rem' }}>
        <div style={{ ...W, paddingTop: '3.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: '#fff' }}>Plan</h1>
          <p style={{ marginTop: '3rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>No active plan.</p>
          <button onClick={() => navigate('/onboarding')} style={{ marginTop: '1.5rem', display: 'block', marginLeft: 'auto', marginRight: 'auto', padding: '0.75rem 2rem', borderRadius: '100px', background: '#fff', color: '#000', border: 'none', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            Create a Plan
          </button>
        </div>
      </div>
    );
  }

  const currentWeekData = selectedPlan.weeks.find(w => w.week_number === selectedWeek);
  const totalWeeks = selectedPlan.weeks.length;
  const weekProgress = ((selectedWeek - 1) / totalWeeks) * 100;

  return (
    <div style={{ minHeight: '100dvh', background: 'radial-gradient(ellipse 60% 30% at 50% 0%, rgba(232,193,98,0.04) 0%, transparent 100%), #080808', color: '#fff', paddingBottom: '7rem' }}>

      {/* ── Header ── */}
      <div style={{ ...W, paddingTop: '3rem', paddingBottom: '2rem' }}>
        <p style={{ fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '8px' }}>
          Your Plan
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', lineHeight: 1.05, letterSpacing: '-0.01em' }}>
            {selectedPlan.plan_label || selectedPlan.activity}
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)', paddingBottom: '4px' }}>
            {selectedPlan.frequency} days/week · {totalWeeks} weeks
          </p>
        </div>

        {/* Plan progress bar */}
        <div style={{ marginTop: '16px', height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#E8C162', borderRadius: '2px', width: `${weekProgress}%`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      <div style={{ ...W }}>
        {/* ── Week Tabs ── */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '20px' }}>
          {selectedPlan.weeks.map(week => {
            const completedCount = week.sessions.filter(s => s.status === 'completed').length;
            const scheduledCount = week.sessions.filter(s => !s.type || s.type === 'scheduled').length;
            const isActive = selectedWeek === week.week_number;
            return (
              <button
                key={week.week_number}
                onClick={() => setSelectedWeek(week.week_number)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '100px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: isActive ? '1px solid #fff' : '1px solid rgba(255,255,255,0.15)',
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? '#000' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Week {week.week_number}
                {completedCount > 0 && (
                  <span style={{ fontSize: '0.72rem', opacity: 0.65 }}>
                    {completedCount}/{scheduledCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Session Table ── */}
        <div style={{
          background: 'linear-gradient(145deg, #1a1a1a, #111)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 4px 28px rgba(0,0,0,0.45)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '100px 1fr 80px 70px 36px',
            gap: '0 16px',
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            alignItems: 'center',
          }}>
            {['Day', 'Session', 'Duration', 'Status', ''].map(h => (
              <p key={h} style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{h}</p>
            ))}
          </div>

          {/* Session rows */}
          {currentWeekData?.sessions.map((session, idx) => {
            const isCompleted = session.status === 'completed';
            const isMissed = session.status === 'missed';
            const isExpanded = expandedSession === session.id;
            const exercises = session.blocks?.find(b => b.type === 'main') ? parseExercises(session.blocks.find(b => b.type === 'main').detail) : [];

            return (
              <div key={session.id} style={{ borderBottom: idx < currentWeekData.sessions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                {/* Main row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr 80px 70px 36px',
                    gap: '0 16px',
                    padding: '18px 24px',
                    alignItems: 'center',
                    cursor: session.blocks ? 'pointer' : 'default',
                    background: isCompleted ? 'rgba(74,222,128,0.03)' : isMissed ? 'rgba(248,113,113,0.02)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => session.blocks && setExpandedSession(isExpanded ? null : session.id)}
                  onMouseEnter={e => { if (session.blocks && !isExpanded) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isCompleted ? 'rgba(74,222,128,0.03)' : isMissed ? 'rgba(248,113,113,0.02)' : 'transparent'; }}
                >
                  {/* Day + date */}
                  <div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>{session.day}</p>
                    {session.date && <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{formatDate(session.date)}</p>}
                  </div>

                  {/* Session title */}
                  <div>
                    <p style={{ fontSize: '0.95rem', color: isCompleted ? 'rgba(255,255,255,0.7)' : '#fff', fontWeight: 500 }}>{session.title}</p>
                    {exercises.length > 0 && (
                      <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{exercises.length} exercises</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.35)' }}>
                    <Clock size={12} strokeWidth={1.8} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>{session.duration_minutes}m</span>
                  </div>

                  {/* Status badge */}
                  <div>
                    {isCompleted && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#4ADE80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '100px', padding: '3px 8px' }}>Done</span>
                    )}
                    {isMissed && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#F87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '100px', padding: '3px 8px' }}>Missed</span>
                    )}
                    {!isCompleted && !isMissed && (
                      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '3px 8px' }}>Upcoming</span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div style={{ color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {session.blocks && (isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />)}
                  </div>
                </div>

                {/* Expanded exercise list */}
                {isExpanded && session.blocks && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {exercises.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '12px' }}>
                          Exercises
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '0 16px' }}>
                          {exercises.map((ex, i) => (
                            <div key={i} style={{ display: 'contents' }}>
                              <p style={{ fontSize: '0.88rem', color: '#fff', padding: '8px 0', borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>{ex.name}</p>
                              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#E8C162', fontWeight: 600, padding: '8px 0', borderBottom: i < exercises.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', textAlign: 'center' }}>{ex.sets || '—'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Warmup / Cooldown blocks */}
                    {session.blocks.filter(b => b.type !== 'main').map((block, i) => (
                      <div key={i} style={{ marginTop: '12px', paddingTop: '12px', borderTop: i === 0 && exercises.length > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', marginBottom: '6px' }}>
                          {block.type}
                        </p>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{block.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* New plan button */}
        <div style={{ marginTop: '24px', paddingBottom: '1rem' }}>
          <button
            onClick={() => navigate('/onboarding')}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            Start New Plan
          </button>
        </div>
      </div>
    </div>
  );
}
