import { Award, X } from 'lucide-react';

export default function BadgeModal({ badge, onClose }) {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-t-2xl sm:rounded-2xl p-8 max-w-sm w-full mx-0 sm:mx-4 text-center animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-muted)] cursor-pointer">
          <X size={20} />
        </button>

        <div className="w-16 h-16 mx-auto bg-[var(--color-streak)]/20 rounded-full flex items-center justify-center mb-4" style={{ boxShadow: '0 0 30px rgba(212, 168, 83, 0.3)' }}>
          <Award size={28} className="text-[var(--color-streak)]" />
        </div>

        <h3 className="font-display text-xl text-[var(--color-text-primary)] mb-1">
          {badge.name}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {badge.description}
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-8 py-2.5 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-full text-sm font-medium hover:scale-[1.02] transition-transform cursor-pointer"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
