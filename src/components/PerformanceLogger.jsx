/**
 * PerformanceLogger
 *
 * Shown after a session is marked complete. Lets the user log weight/reps
 * for each main exercise. Data is stored to localStorage and synced to
 * Supabase (performance_log table) for Optimizer persona insights.
 *
 * Props:
 *   exercises    - array of { name, sets } from parseExercises()
 *   sessionId    - session ID string
 *   date         - YYYY-MM-DD
 *   userId       - Supabase user ID (null if anonymous)
 *   onSave       - called after save (or skip)
 */

import { useState } from 'react';
import { useThemeColors } from '../hooks/useTheme';
import { logPerformanceToSupabase } from '../utils/supabaseSync';
import { calculateSessionCalories } from '../utils/calorieEngine';

export default function PerformanceLogger({ exercises, sessionId, date, userId, onSave }) {
  const C = useThemeColors();
  const [logs, setLogs] = useState(() =>
    exercises.map(e => ({ exercise_name: e.name, sets: '', reps: '', weight_kg: '', rpe: '' }))
  );
  const [durationMinutes, setDurationMinutes] = useState('');
  const [bodyWeightKg, setBodyWeightKg] = useState('');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

    const duration = durationMinutes ? parseInt(durationMinutes) : 45;
    const bodyWeight = bodyWeightKg ? parseFloat(bodyWeightKg) : 75;
    const calorieData = calculateSessionCalories(filled, bodyWeight, duration);

    if (userId && filled.length) {
      await logPerformanceToSupabase(userId, sessionId, date, filled).catch(() => {});
    }
    setSaving(false);
    onSave({ ...calorieData, duration_minutes: duration, body_weight_kg: bodyWeight });
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
          onClick={() => onSave(null)}
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

      {/* Session meta: duration + body weight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Duration (min)', value: durationMinutes, setter: setDurationMinutes, placeholder: '45' },
          { label: 'Body weight (kg)', value: bodyWeightKg, setter: setBodyWeightKg, placeholder: '75' },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, margin: '0 0 4px' }}>{label}</p>
            <input
              type="number"
              inputMode="decimal"
              placeholder={placeholder}
              value={value}
              onChange={e => setter(e.target.value)}
              style={{ padding: '8px 10px', borderRadius: '6px', border: `1px solid ${C.border}`, background: C.container, color: C.text, fontSize: '0.85rem', width: '100%', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {/* Header row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 70px 80px 50px', gap: '6px', paddingBottom: '4px', borderBottom: `1px solid ${C.separator}` }}>
          {['Exercise', 'Sets', 'Reps', 'kg', 'RPE'].map(h => (
            <p key={h} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, margin: 0 }}>{h}</p>
          ))}
        </div>

        {/* Exercise rows */}
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
                placeholder={field === 'rpe' ? '1–10' : '-'}
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
      <button
        onClick={() => onSave(null)}
        style={{ marginTop: '8px', width: '100%', padding: '8px', borderRadius: '10px', background: 'none', color: C.faint, fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
      >
        Skip
      </button>
    </div>
  );
}
