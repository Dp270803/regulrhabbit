import { useThemeColors } from '../hooks/useTheme';

const TYPE_LABELS = {
  progressive_overload: 'Overload',
  exercise_suggestion: 'Exercise',
  diet_tip: 'Nutrition',
  recovery: 'Recovery',
};

export default function AiInsightsCard({ insights }) {
  const C = useThemeColors();

  if (!insights || insights.length === 0) return null;

  const latest = insights[insights.length - 1];
  const hasSuggestions = Array.isArray(latest.suggestions) && latest.suggestions.length > 0;
  const hasCalories = latest.final_calories != null;

  if (!hasCalories && !hasSuggestions) return null;

  return (
    <div style={{
      background: C.low,
      borderRadius: '16px',
      padding: '1.25rem 1.5rem',
      marginBottom: '1rem',
      boxShadow: C.cardShadow,
    }}>
      <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.faint, marginBottom: '0.75rem' }}>
        AI Insights
      </p>

      {hasCalories && (
        <p style={{ fontSize: '1rem', fontWeight: 700, color: C.text, marginBottom: latest.calorie_reasoning ? '2px' : '0.75rem' }}>
          ~{latest.final_calories} kcal
        </p>
      )}
      {latest.calorie_reasoning && (
        <p style={{ fontSize: '0.82rem', color: C.faint, marginBottom: hasSuggestions ? '1rem' : 0, lineHeight: 1.5 }}>
          {latest.calorie_reasoning}
        </p>
      )}

      {hasSuggestions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {latest.suggestions.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{
                flexShrink: 0,
                padding: '2px 8px', borderRadius: '4px',
                background: `rgba(${C.primaryRgb},0.1)`,
                color: C.primary,
                fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                marginTop: '2px',
              }}>
                {TYPE_LABELS[s.type] || s.type}
              </span>
              <p style={{ fontSize: '0.85rem', color: C.text, lineHeight: 1.5, margin: 0 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
