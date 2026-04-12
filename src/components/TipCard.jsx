import { Lightbulb, ArrowRight } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';

export default function TipCard({ tip, onSeeMore }) {
  const C = useThemeColors();
  if (!tip) return null;

  return (
    <div
      className="animate-fade-in"
      style={{
        background: `linear-gradient(145deg, rgba(${C.primaryRgb},0.05) 0%, ${C.lowest} 55%)`,
        border: `1px solid ${C.primaryBorder}`,
        borderRadius: '20px',
        boxShadow: C.cardShadow || `0 4px 24px rgba(0,0,0,0.15)`,
        padding: '24px',
      }}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `rgba(${C.primaryRgb},0.1)`,
            border: `1px solid ${C.primaryBorder}`,
          }}
        >
          <Lightbulb size={11} strokeWidth={2} style={{ color: C.primary }} />
        </div>
        <p
          className="text-[9px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: C.primary }}
        >
          {tip.category || 'Expert Tip'}
        </p>
      </div>

      {/* Tip text */}
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-2)' }}
      >
        {tip.text || tip.tip}
      </p>

      {/* See more */}
      {onSeeMore && (
        <button
          onClick={onSeeMore}
          className="mt-5 flex items-center gap-1.5 text-xs font-medium transition-all duration-200 cursor-pointer group"
          style={{ color: C.primary }}
          onMouseEnter={e => {
            e.currentTarget.style.gap = '10px';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.gap = '6px';
          }}
        >
          More tips
          <ArrowRight size={11} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
