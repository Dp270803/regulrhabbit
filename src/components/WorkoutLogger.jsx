import { useState, useRef, useEffect } from 'react';
import { useThemeColors } from '../hooks/useTheme';
import { logPerformanceToSupabase } from '../utils/supabaseSync';
import { getData, updateData } from '../utils/storage';
import { estimateSessionCalories } from '../utils/calorieCalculator';

export default function WorkoutLogger({ exercises, session, userId, onSave, onAnalysisResult }) {
  const C = useThemeColors();
  const [logs, setLogs] = useState(() =>
    exercises.map(e => ({ exercise_name: e.name, sets: '', reps: '', weight_kg: '', rpe: '' }))
  );
  const [saving, setSaving] = useState(false);
  const [analysisState, setAnalysisState] = useState('idle'); // 'idle' | 'loading' | 'done'
  const [expanded, setExpanded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function updateLog(index, field, value) {
    setLogs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);

    const filled = logs
      .map(l => ({
        ...l,
        sets: l.sets ? parseInt(l.sets) : null,
        reps: l.reps || null,
        weight_kg: l.weight_kg ? parseFloat(l.weight_kg) : null,
        rpe: l.rpe ? parseInt(l.rpe) : null,
      }))
      .filter(l => l.sets || l.reps || l.weight_kg);

    // Step 1: local calorie estimate
    const data = getData();
    const { base_calories, adjusted_calories, workout_classification } = estimateSessionCalories({
      duration_minutes: session.duration_minutes || null,
      body_weight_kg: data.user?.body_weight_kg || null,
      exercises: filled,
    });

    // Step 2: Supabase sync (fire and forget)
    if (userId && filled.length) {
      logPerformanceToSupabase(userId, session.id, session.date, filled).catch(() => {});
    }

    // Step 3: write workout_log entry
    const logEntry = {
      id: crypto.randomUUID(),
      session_id: session.id || null,
      session_title: session.title || '',
      date: session.date || new Date().toISOString().split('T')[0],
      logged_at: new Date().toISOString(),
      duration_minutes: session.duration_minutes || null,
      exercises: filled,
      body_weight_kg: data.user?.body_weight_kg || null,
      base_calories,
      adjusted_calories,
      final_calories: adjusted_calories,
      calorie_reasoning: null,
    };

    let logEntryId = logEntry.id;
    updateData(d => {
      if (!Array.isArray(d.workout_logs)) d.workout_logs = [];
      d.workout_logs.push(logEntry);
      return d;
    });

    setSaving(false);
    onSave();

    // Step 4: async AI refinement (non-blocking)
    if (adjusted_calories !== null) {
      setAnalysisState('loading');
      try {
        const historyCount = (getData().workout_logs || []).length;
        const res = await fetch('/.netlify/functions/ai-workout-analysis', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            session: {
              title: session.title,
              duration_minutes: session.duration_minutes,
              exercises: filled.slice(0, 10),
              workout_classification,
            },
            calories: { base_calories, adjusted_calories },
            user: {
              body_weight_kg: data.user?.body_weight_kg,
              level: data.user?.level ? `Level ${data.user.level}` : 'Intermediate',
              goal: data.user?.goal,
            },
            context: {
              name: data.user?.name,
              streak: data.streaks?.current || 0,
              user_type: data.user?.user_type || 'guided',
              history_count: historyCount,
            },
          }),
        });

        if (!res.ok) throw new Error('AI function error');
        const result = await res.json();

        if (!mounted.current) return;

        const factor = result.adjustment_factor ?? 1.0;
        const final_calories = Math.round((adjusted_calories ?? 0) * factor);

        // Update the stored workout_log entry with final values
        updateData(d => {
          if (!Array.isArray(d.workout_logs)) return d;
          const idx = d.workout_logs.findIndex(l => l.id === logEntryId);
          if (idx !== -1) {
            d.workout_logs[idx].final_calories = final_calories;
            d.workout_logs[idx].calorie_reasoning = result.reasoning || null;
          }
          // Push to ai_insights
          if (!Array.isArray(d.ai_insights)) d.ai_insights = [];
          d.ai_insights.push({
            id: crypto.randomUUID(),
            logged_at: new Date().toISOString(),
            session_title: session.title || '',
            final_calories,
            calorie_reasoning: result.reasoning || null,
            suggestions: result.suggestions || [],
          });
          return d;
        });

        setAnalysisState('done');
        if (mounted.current) onAnalysisResult(result);
      } catch {
        setAnalysisState('done');
        if (mounted.current) onAnalysisResult(null);
      }
    }
  }

  if (!expanded) {
    return (
      <div style={{ padding: '0 28px 20px' }}>
        <button
          onClick={() => setExpanded(true)}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', background: C.container, color: C.muted, fontWeight: 600, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.02em' }}
        >
          + Log weights & reps (optional)
        </button>
        <button
          onClick={onSave}
          style={{ marginTop: '8px', width: '100%', padding: '10px', borderRadius: '10px', background: 'none', color: C.faint, fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
        >
          Skip
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 28px 24px' }}>
      <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: '14px' }}>
        Log Performance
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 80px 50px', gap: '6px', paddingBottom: '4px', borderBottom: `1px solid ${C.separator}` }}>
          {['Exercise', 'Sets', 'Reps', 'kg', 'RPE'].map(h => (
            <p key={h} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, margin: 0 }}>{h}</p>
          ))}
        </div>

        {logs.map((log, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 80px 50px', gap: '6px', alignItems: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: C.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.exercise_name}>
              {log.exercise_name}
            </p>
            {['sets', 'reps', 'weight_kg', 'rpe'].map(field => (
              <input
                key={field}
                type={field === 'reps' ? 'text' : 'number'}
                inputMode={field === 'reps' ? 'text' : 'decimal'}
                placeholder={field === 'rpe' ? '1–10' : '—'}
                value={log[field]}
                onChange={e => updateLog(i, field, e.target.value)}
                style={{
                  padding: '6px 8px', borderRadius: '6px',
                  border: `1px solid ${C.border}`, background: C.container,
                  color: C.text, fontSize: '0.82rem', width: '100%',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ width: '100%', padding: '12px', borderRadius: '10px', background: C.primary, color: C.onPrimary, fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', opacity: saving ? 0.7 : 1 }}
      >
        {saving ? 'Saving…' : 'Save & Continue'}
      </button>

      {analysisState === 'loading' && (
        <p style={{ marginTop: '8px', textAlign: 'center', fontSize: '0.78rem', color: C.faint }}>
          Analysing session…
        </p>
      )}

      <button
        onClick={onSave}
        style={{ marginTop: '8px', width: '100%', padding: '8px', borderRadius: '10px', background: 'none', color: C.faint, fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
      >
        Skip
      </button>
    </div>
  );
}
