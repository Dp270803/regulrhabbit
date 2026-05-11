import { useState } from 'react';
import { useThemeColors } from '../hooks/useTheme';
import { updateData } from '../utils/storage';

const CHANGE_TYPE_LABELS = {
  reduce_volume: 'Volume reduced',
  add_exercise: 'Exercise added',
  replace_exercise: 'Exercise swapped',
  adjust_frequency: 'Frequency adjusted',
  increase_load: 'Load increased',
  increase: 'Load increased',
  swap: 'Exercise swapped',
};

export default function PlanUpdatesBanner({ updates = [], onDismissAll }) {
  const C = useThemeColors();
  const [expanded, setExpanded] = useState(false);

  const unseen = updates.filter(u => !u.seen);
  if (!unseen.length) return null;

  const latest = unseen[unseen.length - 1];
  const totalChanges = unseen.reduce((s, u) => s + (u.changes?.length || 0), 0);

  function markAllSeen() {
    updateData(d => {
      if (!Array.isArray(d.plan_updates)) return d;
      d.plan_updates = d.plan_updates.map(u => ({ ...u, seen: true }));
      return d;
    });
    onDismissAll?.();
  }

  function revertChange(updateId, changeIndex) {
    updateData(d => {
      if (!Array.isArray(d.plan_updates)) return d;
      const u = d.plan_updates.find(x => x.id === updateId);
      if (u?.changes) {
        u.changes = u.changes.filter((_, i) => i !== changeIndex);
        if (!u.changes.length) u.seen = true;
      }
      return d;
    });
    onDismissAll?.();
  }

  return (
    <div style={{
      background: `rgba(${C.primaryRgb},0.06)`,
      border: `1px solid rgba(${C.primaryRgb},0.2)`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: C.text,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%', background: C.primary,
            boxShadow: `0 0 6px rgba(${C.primaryRgb},0.6)`, flexShrink: 0,
          }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>
            Your plan was updated — {totalChanges} change{totalChanges !== 1 ? 's' : ''} this week
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.primary }}>
            {expanded ? 'Close' : 'See changes'}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {unseen.map(update => (
            update.changes?.map((change, ci) => {
              const label = CHANGE_TYPE_LABELS[change.type] || change.type || 'Updated';
              const exercise = change.exercise || change.old_exercise || change.detail || '';
              const reason = change.reason || change.detail || '';
              return (
                <div
                  key={`${update.id}-${ci}`}
                  style={{
                    background: C.lowest, borderRadius: '10px', padding: '14px 16px',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: C.primary, background: `rgba(${C.primaryRgb},0.1)`,
                        padding: '2px 8px', borderRadius: '4px',
                      }}>{label}</span>
                      {exercise && (
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text }}>{exercise}</span>
                      )}
                    </div>
                    {reason && (
                      <p style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.5, margin: 0 }}>{reason}</p>
                    )}
                  </div>
                  <button
                    onClick={() => revertChange(update.id, ci)}
                    style={{
                      flexShrink: 0, padding: '5px 12px', borderRadius: '6px',
                      background: 'none', border: `1px solid ${C.border}`,
                      color: C.faint, fontSize: '0.68rem', fontWeight: 700,
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >
                    Revert
                  </button>
                </div>
              );
            })
          ))}
          <button
            onClick={markAllSeen}
            style={{
              alignSelf: 'flex-end', padding: '7px 18px', borderRadius: '8px',
              background: C.primary, color: C.onPrimary, border: 'none',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
