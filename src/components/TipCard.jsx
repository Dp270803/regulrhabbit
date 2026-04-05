import { Lightbulb } from 'lucide-react';

export default function TipCard({ tip, onSeeMore }) {
  if (!tip) return null;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-[var(--color-streak)]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb size={14} className="text-[var(--color-streak)]" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)] mb-1">
            Tip of the day
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {tip.text}
          </p>
          {onSeeMore && (
            <button
              onClick={onSeeMore}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mt-2 cursor-pointer"
            >
              See more tips &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
