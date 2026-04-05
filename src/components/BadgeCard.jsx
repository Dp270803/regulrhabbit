import { Lock } from 'lucide-react';

export default function BadgeCard({ badge, onClick }) {
  if (!badge) return null;

  const isEarned = badge.earned;
  const isHidden = !isEarned && badge.hidden;

  if (isHidden) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-2 text-center select-none"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          opacity: 0.45,
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--color-border-strong)' }}
        >
          <Lock size={14} style={{ color: 'var(--color-text-3)' }} />
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--color-text-3)' }}>???</p>
          <p className="text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: 'var(--color-text-3)' }}>Hidden</p>
        </div>
      </div>
    );
  }

  if (!isEarned) {
    return (
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-2 text-center select-none"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          opacity: 0.45,
        }}
      >
        <div className="text-2xl grayscale opacity-50">{badge.icon || '🏆'}</div>
        <div>
          <p className="text-xs font-medium leading-tight" style={{ color: 'var(--color-text-3)' }}>
            {badge.name}
          </p>
          {badge.description && (
            <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--color-text-3)' }}>
              {badge.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-4 flex flex-col items-center gap-2 text-center transition-all duration-200 animate-fade-in${
        onClick ? ' cursor-pointer hover:scale-[1.03] active:scale-[0.98]' : ''
      }`}
      style={{
        background: 'rgba(232,193,98,0.06)',
        border: '1px solid rgba(232,193,98,0.28)',
        boxShadow: '0 0 18px rgba(232,193,98,0.07), inset 0 1px 0 rgba(232,193,98,0.08)',
      }}
    >
      <div
        className="text-2xl w-11 h-11 rounded-xl flex items-center justify-center"
        style={{
          background: 'rgba(232,193,98,0.08)',
          border: '1px solid rgba(232,193,98,0.18)',
        }}
      >
        {badge.icon || '🏆'}
      </div>
      <div>
        <p className="text-xs font-medium leading-tight" style={{ color: 'var(--color-text-1)' }}>
          {badge.name}
        </p>
        {badge.earned_at && (
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-gold)', opacity: 0.7 }}>
            ✓{' '}
            {new Date(badge.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        )}
      </div>
    </div>
  );
}
