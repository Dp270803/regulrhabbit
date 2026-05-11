import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../hooks/useTheme';
import { getData, updateData } from '../utils/storage';
import { recordAccepted, recordRejected } from '../utils/aiMemory';
import ConfettiEffect from '../components/ConfettiEffect';

const W = { maxWidth: '680px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 32px)' };

const SEVERITY_COLORS = {
  high:   { bg: 'rgba(255,80,80,0.1)',   text: '#ff5050', label: 'High'   },
  medium: { bg: 'rgba(255,190,0,0.12)',  text: '#ffbe00', label: 'Medium' },
  low:    { bg: 'rgba(120,120,160,0.1)', text: '#9999bb', label: 'Low'    },
};

const CHANGE_LABELS = {
  add:            'Add exercise',
  remove:         'Remove exercise',
  swap:           'Swap exercise',
  adjust_volume:  'Adjust volume',
};

function parseExerciseStr(str) {
  if (!str) return [];
  return str.split(' | ').map(part => {
    const m = part.trim().match(/^(.+?)\s+(\d+x[\d-]+(?:\s+\d+kg)?)$/);
    return m ? { name: m[1].trim(), sets: m[2].trim() } : { name: part.trim(), sets: '' };
  }).filter(e => e.name);
}

function exerciseStrFromArr(arr) {
  return arr.map(e => e.sets ? `${e.name} ${e.sets}` : e.name).join(' | ');
}

function applyEditToPlan(plan, edit) {
  const p = JSON.parse(JSON.stringify(plan));
  const dayMatch = edit.session_day ? edit.session_day.toLowerCase() : null;

  for (const week of p.weeks) {
    for (const session of week.sessions) {
      if (dayMatch && session.day.toLowerCase() !== dayMatch) continue;
      const mainBlock = session.blocks?.find(b => b.type === 'main');
      if (!mainBlock) continue;

      let exList = parseExerciseStr(mainBlock.detail);

      switch (edit.change_type) {
        case 'add':
          if (edit.to) exList.push({ name: edit.to, sets: '' });
          break;
        case 'remove': {
          const target = (edit.exercise || edit.from || '').toLowerCase();
          exList = exList.filter(e => !e.name.toLowerCase().includes(target));
          break;
        }
        case 'swap': {
          const fromName = (edit.from || edit.exercise || '').toLowerCase();
          exList = exList.map(e =>
            e.name.toLowerCase().includes(fromName) ? { ...e, name: edit.to || e.name } : e
          );
          break;
        }
        case 'adjust_volume': {
          const exName = (edit.exercise || '').toLowerCase();
          exList = exList.map(e =>
            e.name.toLowerCase().includes(exName) ? { ...e, sets: edit.to || e.sets } : e
          );
          break;
        }
        default:
          break;
      }

      mainBlock.detail = exerciseStrFromArr(exList);
    }
  }
  return p;
}

function ScoreRing({ score, C }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 85 ? C.green : score >= 70 ? C.primary : '#ffbe00';

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx="68" cy="68" r={r} fill="none" stroke={C.separator} strokeWidth="10" />
      <circle
        cx="68" cy="68" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 68 68)"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x="68" y="62" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="28" fill={color}>{score}</text>
      <text x="68" y="80" textAnchor="middle" fontFamily="Inter, sans-serif" fontWeight="600" fontSize="11" fill={C.faint}>/100</text>
    </svg>
  );
}

export default function PlanCritique() {
  const C = useThemeColors();
  const navigate = useNavigate();

  const [pendingPlan, setPendingPlan] = useState(null);
  const [critique, setCritique] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editStates, setEditStates] = useState({}); // index → 'accepted'|'dismissed'
  const [modifiedPlan, setModifiedPlan] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem('pending_plan');
    if (!raw) { navigate('/onboarding'); return; }
    try {
      const p = JSON.parse(raw);
      setPendingPlan(p);
      setModifiedPlan(p);
    } catch {
      navigate('/onboarding');
    }
  }, [navigate]);

  async function handleAnalyze() {
    if (!pendingPlan) return;
    setLoading(true);
    setError(null);
    try {
      const user = getData()?.user || {};
      const res = await fetch('/.netlify/functions/plan-critique', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: pendingPlan, user }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      setCritique(data);
      setEditStates(
        Object.fromEntries((data.proposed_edits || []).map((_, i) => [i, 'pending']))
      );
    } catch {
      setError('Analysis failed. You can still save your plan.');
    } finally {
      setLoading(false);
    }
  }

  function handleAcceptEdit(index) {
    const edit = critique.proposed_edits[index];
    if (!edit) return;
    const newPlan = applyEditToPlan(modifiedPlan, edit);
    setModifiedPlan(newPlan);
    setEditStates(prev => ({ ...prev, [index]: 'accepted' }));
    recordAccepted({
      text: `${edit.change_type}: ${edit.exercise || edit.to} — ${edit.rationale || ''}`.trim(),
      category: 'critique_edit',
    });
  }

  function handleDismissEdit(index) {
    const edit = critique.proposed_edits[index];
    setEditStates(prev => ({ ...prev, [index]: 'dismissed' }));
    if (edit) {
      recordRejected({
        text: `${edit.change_type}: ${edit.exercise || edit.to} — ${edit.rationale || ''}`.trim(),
        category: 'critique_edit',
      });
    }
  }

  function handleSavePlan() {
    if (!modifiedPlan) return;
    const user = getData()?.user || {};
    updateData(d => {
      d.onboarding_complete = true;
      d.user.user_type = 'validated';
      if (!d.user.name && user.name) d.user.name = user.name;
      d.plans = d.plans.map(p => ({ ...p, status: 'archived' }));
      d.plans.push(modifiedPlan);
      return d;
    });
    sessionStorage.removeItem('pending_plan');
    setShowConfetti(true);
    setTimeout(() => navigate('/dashboard'), 1800);
  }

  if (!pendingPlan) return null;

  const week1Sessions = pendingPlan.weeks?.[0]?.sessions || [];

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <ConfettiEffect trigger={showConfetti} />

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: C.navBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${C.separator}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', maxWidth: '680px', margin: '0 auto' }}>
          <span className="font-headline" style={{ fontSize: '1.3rem', fontWeight: 800, color: C.primary, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>Regulr</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint }}>Plan Critique</span>
        </div>
      </header>

      <main style={{ ...W, flex: 1, paddingTop: '7rem', paddingBottom: '10rem', width: '100%' }}>

        {/* Title */}
        <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '10px' }}>
          AI Review
        </p>
        <h2 className="font-headline" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.6rem', lineHeight: 1.1 }}>
          Your plan critique
        </h2>
        <p style={{ fontSize: '0.9rem', color: C.faint, marginBottom: '2rem', lineHeight: 1.6 }}>
          Evidence-based feedback before you commit to your program.
        </p>

        {/* Plan preview card */}
        <div style={{ background: C.low, borderRadius: '14px', padding: '20px', marginBottom: '2rem', border: `1px solid ${C.border}` }}>
          <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '12px' }}>
            Your plan — {week1Sessions.length} training day{week1Sessions.length !== 1 ? 's' : ''}/week
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {week1Sessions.map((s, i) => {
              const exercises = parseExerciseStr(s.blocks?.find(b => b.type === 'main')?.detail || '');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < week1Sessions.length - 1 ? `1px solid ${C.separator}` : 'none' }}>
                  <div>
                    <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.primary, marginBottom: '2px' }}>{s.day}</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text }}>{s.title}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: C.faint }}>{exercises.length} exercises</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Analyze button */}
        {!critique && !loading && (
          <button
            onClick={handleAnalyze}
            style={{
              width: '100%', padding: '1.1rem', borderRadius: '100px',
              background: C.text, color: C.bg, border: 'none',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              marginBottom: error ? '1rem' : 0,
            }}
          >
            Analyse my plan →
          </button>
        )}

        {error && (
          <p style={{ fontSize: '0.85rem', color: '#ff6b6b', marginBottom: '1rem' }}>{error}</p>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '3rem 0' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: C.primary, opacity: 0.8,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
            <p style={{ fontSize: '0.85rem', color: C.faint }}>Analysing your program…</p>
            <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0.6)} 40%{transform:scale(1)} }`}</style>
          </div>
        )}

        {/* Results */}
        {critique && (
          <div>
            {/* Score + Verdict */}
            <div style={{
              background: C.low, borderRadius: '16px', padding: '28px 24px',
              border: `1px solid ${C.border}`, marginBottom: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px',
            }}>
              <ScoreRing score={critique.overall_score} C={C} />
              <p style={{ fontSize: '0.95rem', color: C.muted, lineHeight: 1.65, maxWidth: '480px' }}>
                {critique.verdict}
              </p>
            </div>

            {/* Strengths */}
            {critique.strengths?.length > 0 && (
              <div style={{ background: C.low, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.green, marginBottom: '14px' }}>Strengths</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {critique.strengths.map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ color: C.green, fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, margin: '0 0 2px' }}>{s.observation}</p>
                        <p style={{ fontSize: '0.78rem', color: C.faint, margin: 0, lineHeight: 1.5 }}>{s.principle}</p>
                        {s.book_reference && (
                          <p style={{ fontSize: '0.68rem', color: C.faint, margin: '4px 0 0', fontStyle: 'italic' }}>— {s.book_reference}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Issues */}
            {critique.issues?.length > 0 && (
              <div style={{ background: C.low, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, marginBottom: '12px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '14px' }}>Issues found</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {critique.issues.map((issue, i) => {
                    const sev = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.low;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: sev.bg, color: sev.text }}>
                            {sev.label}
                          </span>
                          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, margin: 0 }}>{issue.issue}</p>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: C.faint, margin: 0, lineHeight: 1.5, paddingLeft: '2px' }}>{issue.explanation}</p>
                        {issue.book_reference && (
                          <p style={{ fontSize: '0.68rem', color: C.faint, margin: '4px 0 0', paddingLeft: '2px', fontStyle: 'italic' }}>— {issue.book_reference}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Proposed edits */}
            {critique.proposed_edits?.length > 0 && (
              <div style={{ background: C.low, borderRadius: '16px', padding: '22px 24px', border: `1px solid ${C.border}`, marginBottom: '24px' }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: '6px' }}>Proposed edits</p>
                <p style={{ fontSize: '0.78rem', color: C.faint, marginBottom: '16px', lineHeight: 1.5 }}>Accept edits to apply them to your plan before saving.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {critique.proposed_edits.map((edit, i) => {
                    const state = editStates[i] || 'pending';
                    const isAccepted = state === 'accepted';
                    const isDismissed = state === 'dismissed';
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '14px', borderRadius: '10px',
                          border: `1px solid ${isAccepted ? `rgba(${C.primaryRgb},0.4)` : isDismissed ? C.separator : C.border}`,
                          background: isAccepted ? `rgba(${C.primaryRgb},0.06)` : isDismissed ? 'transparent' : C.lowest,
                          opacity: isDismissed ? 0.45 : 1,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            padding: '3px 8px', borderRadius: '6px',
                            background: `rgba(${C.primaryRgb},0.1)`, color: C.primary,
                          }}>
                            {CHANGE_LABELS[edit.change_type] || edit.change_type}
                          </span>
                          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text, margin: 0 }}>
                            {edit.change_type === 'swap' && edit.from
                              ? `${edit.from} → ${edit.to}`
                              : edit.change_type === 'add'
                              ? edit.to
                              : edit.change_type === 'adjust_volume'
                              ? `${edit.exercise}: ${edit.from || '?'} → ${edit.to}`
                              : edit.exercise}
                          </p>
                        </div>
                        <p style={{ fontSize: '0.78rem', color: C.faint, margin: '0 0 4px', lineHeight: 1.5 }}>{edit.rationale}</p>
                        {edit.book_reference && (
                          <p style={{ fontSize: '0.68rem', color: C.faint, margin: '0 0 10px', fontStyle: 'italic' }}>— {edit.book_reference}</p>
                        )}
                        {!isAccepted && !isDismissed && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleAcceptEdit(i)}
                              style={{
                                padding: '6px 16px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700,
                                background: C.text, color: C.bg, border: 'none', cursor: 'pointer',
                              }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDismissEdit(i)}
                              style={{
                                padding: '6px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 600,
                                background: 'transparent', color: C.faint, border: `1px solid ${C.border}`, cursor: 'pointer',
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        {isAccepted && (
                          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: C.primary, margin: 0 }}>Applied to plan ✓</p>
                        )}
                        {isDismissed && (
                          <p style={{ fontSize: '0.72rem', color: C.faint, margin: 0 }}>Dismissed</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save plan */}
            <button
              onClick={handleSavePlan}
              style={{
                width: '100%', padding: '1.1rem', borderRadius: '100px',
                background: C.text, color: C.bg, border: 'none',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              Save plan and start training →
            </button>
          </div>
        )}

        {/* Save without critique */}
        {!critique && !loading && (
          <button
            onClick={handleSavePlan}
            style={{
              width: '100%', padding: '0.875rem', borderRadius: '100px', marginTop: '12px',
              background: 'transparent', color: C.faint, border: `1px solid ${C.border}`,
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Skip analysis — save plan as-is
          </button>
        )}

      </main>
    </div>
  );
}
