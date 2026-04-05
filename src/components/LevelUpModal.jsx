import { X } from 'lucide-react';

export default function LevelUpModal({ level, onClose }) {
  if (!level) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in" onClick={onClose}>
      <div
        className="bg-[var(--color-surface)] rounded-2xl p-8 max-w-sm mx-4 text-center animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-muted)] cursor-pointer">
          <X size={20} />
        </button>

        <p className="font-mono text-6xl font-bold text-[var(--color-text-primary)] mb-4">
          {level.level}
        </p>
        <h2 className="font-display text-2xl text-[var(--color-text-primary)] mb-2">
          {level.title}
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
          {level.message}
        </p>

        <button
          onClick={onClose}
          className="mt-6 px-8 py-2.5 bg-[var(--color-text-primary)] text-[var(--color-surface)] rounded-full text-sm font-medium hover:scale-[1.02] transition-transform cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
