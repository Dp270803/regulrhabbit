import { Lightbulb, ArrowRight } from 'lucide-react';

export default function TipCard({ tip, onSeeMore }) {
  if (!tip) return null;

  return (
    <div
      className="rounded-2xl p-6 animate-fade-in"
      style={{
        background:
          'linear-gradient(135deg, rgba(232,193,98,0.05) 0%, var(--color-surface) 55%)',
        border: '1px solid rgba(232,193,98,0.13)',
      }}
    >
      {/* Category label */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(232,193,98,0.12)',
            border: '1px solid rgba(232,193,98,0.2)',
          }}
        >
          <Lightbulb size={11} strokeWidth={2} style={{ color: 'var(--color-gold)' }} />
        </div>
        <p
          className="text-[9px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: 'var(--color-gold)' }}
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
          style={{ color: 'var(--color-gold)' }}
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
