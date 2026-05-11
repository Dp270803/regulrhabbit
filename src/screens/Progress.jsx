import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getData } from '../utils/storage';
import { getToday } from '../utils/dateUtils';
import { trackPageView } from '../utils/analytics';
import { useThemeColors } from '../hooks/useTheme';

// ── e1RM: Epley formula weight × (1 + reps/30) ──────────────────────────────
function calcE1RM(weight, reps) {
  const r = parseInt(String(reps).split('-')[0]) || 0;
  if (!weight || !r) return null;
  return Math.round(weight * (1 + r / 30));
}

// ── Simple SVG line chart ─────────────────────────────────────────────────────
function LineChart({ data, color, width = '100%', height = 80, unit = '' }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#666', fontStyle: 'italic' }}>Not enough data yet</span>
      </div>
    );
  }
  const vals = data.map(d => d.y);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const PAD = 4;
  const W = 400; // internal viewBox width
  const H = height;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = data.map(d => PAD + (1 - (d.y - min) / range) * (H - PAD * 2));
  const pathD = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width, height, overflow: 'visible', display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" fill={color} />
      {/* First + last labels */}
      <text x={xs[0]} y={H - 2} fill={color} fontSize="10" opacity="0.6" textAnchor="middle">
        {data[0].label}
      </text>
      <text x={xs[xs.length - 1]} y={H - 2} fill={color} fontSize="10" opacity="0.6" textAnchor="middle">
        {data[data.length - 1].label}
      </text>
    </svg>
  );
}

// ── Adherence bar chart (weekly bars) ────────────────────────────────────────
function AdherenceBars({ weeks }) {
  const C = useThemeColors();
  if (!weeks.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '64px' }}>
      {weeks.map((w, i) => {
        const pct = w.scheduled > 0 ? Math.min(w.completed / w.scheduled, 1) : 0;
        const isLast = i === weeks.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '100%', height: '52px', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%',
                height: `${Math.max(pct * 100, 4)}%`,
                background: isLast ? C.primary : pct >= 0.8 ? C.green : pct >= 0.4 ? `rgba(${C.primaryRgb},0.5)` : C.highest,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: '0.52rem', color: C.faint, whiteSpace: 'nowrap' }}>
              {isLast ? 'This wk' : `W${weeks.length - i}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Data helpers ──────────────────────────────────────────────────────────────
function buildWeightData(weightLog, currentWeight, days = 56) {
  const cutoff = new Date(Date.now() - days * 86400000);
  const recent = (weightLog || [])
    .filter(w => new Date(w.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!recent.length && currentWeight) {
    recent.push({ date: getToday(), weight_kg: currentWeight });
  }
  return recent.map(w => ({
    y: w.weight_kg,
    label: w.date.slice(5), // MM-DD
  }));
}

function buildE1RMData(workoutLogs, exerciseName, sessions = 10) {
  const points = [];
  for (const log of (workoutLogs || [])) {
    const ex = log.exercises?.find(e =>
      e.exercise_name?.toLowerCase() === exerciseName.toLowerCase()
    );
    if (!ex) continue;
    const e = calcE1RM(parseFloat(ex.weight_kg), ex.reps);
    if (e) points.push({ y: e, label: (log.date || '').slice(5) });
  }
  return points.slice(-sessions);
}

function buildAdherenceWeeks(checkIns, plan, weeksBack = 8) {
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const scheduledDays = plan?.scheduled_days || [];
  const weeks = [];
  for (let w = weeksBack - 1; w >= 0; w--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() - w * 7);
    let completed = 0, scheduled = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + d);
      const dateStr = day.toISOString().split('T')[0];
      const dayKey = DAY_KEYS[day.getDay()];
      if (scheduledDays.includes(dayKey) && dateStr <= getToday()) {
        scheduled++;
        if (checkIns.some(c => c.date === dateStr && c.completed)) completed++;
      }
    }
    weeks.push({ completed, scheduled });
  }
  return weeks;
}

function getTopLifts(workoutLogs, limit = 3) {
  const counts = {};
  for (const log of (workoutLogs || [])) {
    for (const ex of (log.exercises || [])) {
      if (ex.exercise_name && ex.weight_kg) {
        counts[ex.exercise_name] = (counts[ex.exercise_name] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

function getWeeklySummary(workoutLogs, checkIns) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekLogs = (workoutLogs || []).filter(l => new Date(l.date) >= weekStart);
  const thisWeekCheckIns = (checkIns || []).filter(c => new Date(c.date) >= weekStart && c.completed);
  const totalVolume = thisWeekLogs.reduce((sum, log) => {
    return sum + (log.exercises || []).reduce((s, ex) => {
      const sets = parseInt(ex.sets) || 0;
      const reps = parseInt(String(ex.reps || '0').split('-')[0]) || 0;
      const weight = parseFloat(ex.weight_kg) || 0;
      return s + sets * reps * weight;
    }, 0);
  }, 0);
  const totalCalories = thisWeekLogs.reduce((s, l) => s + (l.final_calories || l.adjusted_calories || 0), 0);
  return {
    sessions: thisWeekCheckIns.length,
    volume: Math.round(totalVolume),
    calories: totalCalories,
  };
}

// ── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children, accent }) {
  const C = useThemeColors();
  return (
    <div style={{ background: C.low, borderRadius: '16px', padding: '24px', borderTop: accent ? `2px solid ${accent}` : 'none' }}>
      <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, marginBottom: '16px' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Progress() {
  const C = useThemeColors();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [topLifts, setTopLifts] = useState([]);
  const [adherenceWeeks, setAdherenceWeeks] = useState([]);
  const [weightData, setWeightData] = useState([]);
  const [weekSummary, setWeekSummary] = useState(null);
  const [e1RMData, setE1RMData] = useState({});

  useEffect(() => {
    trackPageView('progress');
    const d = getData();
    if (!d.onboarding_complete) { navigate('/'); return; }
    setData(d);

    const activePlan = d.plans.find(p => p.status === 'active');
    const lifts = getTopLifts(d.workout_logs, 3);
    setTopLifts(lifts);

    const e1rm = {};
    for (const lift of lifts) {
      e1rm[lift] = buildE1RMData(d.workout_logs, lift);
    }
    setE1RMData(e1rm);

    setAdherenceWeeks(buildAdherenceWeeks(d.check_ins, activePlan, 8));
    setWeightData(buildWeightData(d.weight_log, d.user?.body_weight_kg, 56));
    setWeekSummary(getWeeklySummary(d.workout_logs, d.check_ins));
  }, [navigate]);

  if (!data) return null;

  const W = { maxWidth: '1200px', margin: '0 auto', padding: '0 clamp(16px, 4vw, 64px)' };
  const totalSessions = data.check_ins.filter(c => c.completed).length;

  // Adherence % last 28 days
  const last4Weeks = adherenceWeeks.slice(-4);
  const totalScheduled = last4Weeks.reduce((s, w) => s + w.scheduled, 0);
  const totalCompleted = last4Weeks.reduce((s, w) => s + w.completed, 0);
  const adherencePct = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  return (
    <div className="min-h-dvh pb-32 md:pb-12 md:pt-14" style={{ background: C.bg, color: C.text }}>
      <div style={{ ...W, paddingTop: 'clamp(28px, 4vw, 48px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.primary, marginBottom: '8px' }}>
            Your Progress
          </p>
          <h1 className="font-headline" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            Performance
          </h1>
        </div>

        {/* ── This week summary row ── */}
        {weekSummary && (
          <div className="progress-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'This Week', value: weekSummary.sessions, suffix: 'sessions', accent: C.primary },
              { label: 'Volume', value: weekSummary.volume > 0 ? `${(weekSummary.volume / 1000).toFixed(1)}k` : '—', suffix: 'kg lifted', accent: C.green },
              { label: 'Calories', value: weekSummary.calories > 0 ? weekSummary.calories.toLocaleString() : '—', suffix: 'kcal burned', accent: '#a855f7' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: C.low, borderRadius: '14px', padding: '20px',
                borderLeft: `2px solid ${stat.accent}`,
              }}>
                <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, margin: '0 0 10px' }}>{stat.label}</p>
                <p className="font-headline" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 800, color: C.text, lineHeight: 1 }}>{stat.value}</p>
                <p style={{ fontSize: '0.68rem', color: C.faint, marginTop: '4px' }}>{stat.suffix}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Adherence ── */}
        <Card title="Adherence — Last 8 Weeks" accent={C.primary}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
            <span className="font-headline" style={{ fontSize: '2.8rem', fontWeight: 800, color: adherencePct >= 80 ? C.green : adherencePct >= 50 ? C.primary : C.red, lineHeight: 1 }}>
              {adherencePct}%
            </span>
            <span style={{ fontSize: '0.75rem', color: C.faint }}>last 28 days · {totalSessions} total sessions</span>
          </div>
          <AdherenceBars weeks={adherenceWeeks} />
        </Card>

        {/* ── Body weight chart ── */}
        <Card title="Body Weight" accent={C.green}>
          {weightData.length >= 2 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
                <span className="font-headline" style={{ fontSize: '2rem', fontWeight: 800, color: C.text }}>
                  {weightData[weightData.length - 1]?.y} kg
                </span>
                {weightData.length >= 2 && (() => {
                  const delta = weightData[weightData.length - 1].y - weightData[0].y;
                  return (
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: delta < -0.5 ? C.green : delta > 0.5 ? '#f97316' : C.faint }}>
                      {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                    </span>
                  );
                })()}
              </div>
              <LineChart data={weightData} color={C.green} height={80} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '8px' }}>
                Log your weight daily using the check-in widget on the dashboard.
              </p>
              <p style={{ fontSize: '0.72rem', color: C.faint }}>Weight trend appears after 2+ entries.</p>
            </div>
          )}
        </Card>

        {/* ── Strength trends (e1RM) ── */}
        {topLifts.length > 0 ? (
          <Card title="Strength Trends — e1RM per lift" accent={C.primary}>
            <p style={{ fontSize: '0.75rem', color: C.faint, marginBottom: '20px', marginTop: '-8px' }}>
              Epley formula: weight × (1 + reps ÷ 30)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {topLifts.map(lift => {
                const points = e1RMData[lift] || [];
                const latest = points[points.length - 1]?.y;
                const first = points[0]?.y;
                const delta = latest && first ? latest - first : null;
                return (
                  <div key={lift}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text }}>{lift}</span>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                        {latest && (
                          <span className="font-headline" style={{ fontSize: '1.1rem', fontWeight: 800, color: C.primary }}>{latest} kg</span>
                        )}
                        {delta !== null && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: delta >= 0 ? C.green : '#f97316' }}>
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    </div>
                    <LineChart data={points} color={C.primary} height={60} />
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card title="Strength Trends" accent={C.primary}>
            <p style={{ fontSize: '0.85rem', color: C.muted, textAlign: 'center', padding: '16px 0' }}>
              Log weights in your sessions to see strength trends.
            </p>
          </Card>
        )}

      </div>
    </div>
  );
}
