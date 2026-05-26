/**
 * InsightsCard
 *
 * Displays 1–4 AI-generated suggestions categorised as exercise / diet / recovery.
 * Each suggestion can be accepted (triggers adaptation) or dismissed (recorded in memory).
 *
 * Props:
 *   suggestions  - [{ category: 'exercise'|'diet'|'recovery', text: string }]
 *   onAccept     - (suggestion) => void
 *   onDismiss    - (suggestion) => void
 */

import { useState } from 'react';
import { useThemeColors } from '../hooks/useTheme';

const CATEGORY_META = {
  exercise: { label: 'Exercise', color: '#3b82f6' },
  diet:     { label: 'Nutrition', color: '#22c55e' },
  recovery: { label: 'Recovery', color: '#a855f7' },
};

export default function InsightsCard({ suggestions = [], onAccept, onDismiss }) {
  const C = useThemeColors();
  const [dismissed, setDismissed] = useState(new Set());

  if (!suggestions.length) return null;

  const visible = suggestions.filter((_, i) => !dismissed.has(i)).slice(0, 4);
  if (!visible.length) return null;

  function handleDismiss(suggestion, originalIndex) {
    setDismissed(prev => new Set([...prev, originalIndex]));
    onDismiss?.(suggestion);
  }

  function handleAccept(suggestion, originalIndex) {
    setDismissed(prev => new Set([...prev, originalIndex]));
    onAccept?.(suggestion);
  }

  return (
    <div style={{ background: C.lowest, borderRadius: '14px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.faint, margin: 0 }}>
        AI Insights
      </p>

      {suggestions.map((suggestion, i) => {
        if (dismissed.has(i)) return null;
        const meta = CATEGORY_META[suggestion.category] || CATEGORY_META.exercise;
        return (
          <div key={i} style={{ background: C.container, borderRadius: '10px', padding: '12px 14px', border: `1px solid ${C.border}`, display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            {/* Category badge */}
            <span style={{
              fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: meta.color, background: `${meta.color}18`, padding: '3px 7px', borderRadius: '4px',
              whiteSpace: 'nowrap', flexShrink: 0, marginTop: '1px',
            }}>
              {meta.label}
            </span>

            {/* Suggestion text */}
            <p style={{ fontSize: '0.83rem', color: C.text, margin: 0, flex: 1, lineHeight: 1.45 }}>
              {suggestion.text}
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
              <button
                onClick={() => handleAccept(suggestion, i)}
                title="Apply this suggestion"
                style={{
                  padding: '4px 8px', borderRadius: '5px',
                  background: `${C.green}18`, border: `1px solid ${C.green}40`,
                  color: C.green, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Apply
              </button>
              <button
                onClick={() => handleDismiss(suggestion, i)}
                title="Dismiss"
                style={{
                  padding: '4px 8px', borderRadius: '5px',
                  background: 'none', border: `1px solid ${C.border}`,
                  color: C.faint, fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
