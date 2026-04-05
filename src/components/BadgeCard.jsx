import { Award, Lock } from 'lucide-react';

export default function BadgeCard({ badge, onClick }) {
  const { name, description, earned, earned_at, hidden } = badge;

  if (!earned && hidden) {
    return (
      <div
        className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 opacity-40 text-center"
      >
        <div className="w-10 h-10 mx-auto bg-[var(--color-border)] rounded-full flex items-center justify-center mb-2">
          <Lock size={16} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-xs font-medium text-[var(--color-text-muted)]">???</p>
      </div>
    );
  }

  if (!earned) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 opacity-50 text-center">
        <div className="w-10 h-10 mx-auto bg-[var(--color-border)] rounded-full flex items-center justify-center mb-2">
          <Award size={16} className="text-[var(--color-text-muted)]" />
        </div>
        <p className="text-xs font-medium text-[var(--color-text-secondary)]">{name}</p>
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{description}</p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="bg-[var(--color-surface)] border border-[var(--color-streak)]/30 rounded-xl p-4 text-center cursor-pointer hover:border-[var(--color-streak)] transition-colors"
    >
      <div className="w-10 h-10 mx-auto bg-[var(--color-streak)]/20 rounded-full flex items-center justify-center mb-2">
        <Award size={16} className="text-[var(--color-streak)]" />
      </div>
      <p className="text-xs font-medium text-[var(--color-text-primary)]">{name}</p>
      {earned_at && (
        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
          {new Date(earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  );
}
