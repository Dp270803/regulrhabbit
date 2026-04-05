export default function OptionButton({ label, onClick, selected, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-5 py-2.5 rounded-full border text-sm font-medium
        transition-all duration-200 ease-out
        ${selected
          ? 'bg-[var(--color-text-primary)] text-[var(--color-surface)] border-[var(--color-text-primary)]'
          : 'bg-transparent text-[var(--color-text-primary)] border-[var(--color-text-primary)] hover:bg-[var(--color-text-primary)] hover:text-[var(--color-surface)]'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
    >
      {label}
    </button>
  );
}
