import { useEffect } from 'react';
import { Star } from 'lucide-react';

export default function LevelUpModal({ level, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!level) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center animate-fade-in cursor-pointer"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Subtle radial glow behind number */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 40% 40% at 50% 50%, rgba(232,193,98,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative text-center px-8 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-2 mb-8">
          <Star size={12} fill="currentColor" style={{ color: 'var(--color-gold)', opacity: 0.7 }} />
          <p
            className="text-[10px] font-medium uppercase tracking-[0.28em]"
            style={{ color: 'var(--color-gold)' }}
          >
            Level Up
          </p>
          <Star size={12} fill="currentColor" style={{ color: 'var(--color-gold)', opacity: 0.7 }} />
        </div>

        <p
          className="font-mono font-bold leading-none mb-3 select-none"
          style={{
            fontSize: '7.5rem',
            color: 'var(--color-gold)',
            textShadow: '0 0 80px rgba(232,193,98,0.35), 0 0 30px rgba(232,193,98,0.2)',
            letterSpacing: '-0.04em',
          }}
        >
          {level.level}
        </p>

        <div
          className="w-16 h-px mx-auto mb-6"
          style={{ background: 'linear-gradient(to right, transparent, rgba(232,193,98,0.4), transparent)' }}
        />

        <h2
          className="font-display text-2xl mb-4 tracking-tight"
          style={{ color: 'var(--color-text-1)' }}
        >
          {level.title}
        </h2>

        {(level.message || level.identity_message) && (
          <p
            className="text-sm leading-relaxed max-w-[260px] mx-auto"
            style={{ color: 'var(--color-text-2)' }}
          >
            {level.message || level.identity_message}
          </p>
        )}

        <p
          className="text-[11px] mt-10 uppercase tracking-[0.18em]"
          style={{ color: 'var(--color-text-3)' }}
        >
          Tap to continue
        </p>
      </div>
    </div>
  );
}
