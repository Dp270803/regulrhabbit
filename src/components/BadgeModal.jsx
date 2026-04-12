import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useThemeColors } from '../hooks/useTheme';

export default function BadgeModal({ badge, onClose }) {
  const C = useThemeColors();
  useEffect(() => {
    const handle = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [onClose]);

  if (!badge) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-t-3xl pb-12 animate-slide-up overflow-hidden"
        style={{
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border-strong)',
          borderBottom: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="rounded-full"
            style={{ width: 36, height: 4, background: 'var(--color-border-strong)' }}
          />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-6 pt-3 pb-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-opacity hover:opacity-60 cursor-pointer"
            style={{
              background: 'var(--color-border-strong)',
              color: 'var(--color-text-2)',
            }}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="text-center px-8 pt-4">
          {/* Badge icon */}
          <div
            className="text-5xl w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6"
            style={{
              background: `rgba(${C.primaryRgb},0.08)`,
              border: `1px solid rgba(${C.primaryRgb},0.26)`,
              boxShadow: `0 0 28px rgba(${C.primaryRgb},0.12)`,
            }}
          >
            {badge.icon || '🏆'}
          </div>

          <h2
            className="font-display text-2xl mb-2 tracking-tight"
            style={{ color: 'var(--color-text-1)' }}
          >
            {badge.name}
          </h2>

          {badge.description && (
            <p
              className="text-sm leading-relaxed max-w-[280px] mx-auto"
              style={{ color: 'var(--color-text-2)' }}
            >
              {badge.description}
            </p>
          )}

          {badge.earned_at && (
            <p className="text-xs mt-5" style={{ color: 'var(--color-text-3)' }}>
              Earned{' '}
              {new Date(badge.earned_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}

          <button
            onClick={onClose}
            className="mt-8 px-8 py-3 rounded-xl text-sm font-medium tracking-wide transition-opacity hover:opacity-80 cursor-pointer"
            style={{
              background: `rgba(${C.primaryRgb},0.1)`,
              border: `1px solid rgba(${C.primaryRgb},0.22)`,
              color: C.primary,
            }}
          >
            Nice
          </button>
        </div>
      </div>
    </div>
  );
}
