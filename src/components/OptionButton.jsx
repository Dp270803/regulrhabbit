export default function OptionButton({ label, onClick, selected }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer"
      style={{
        background: selected ? 'var(--color-text-1)' : 'transparent',
        color: selected ? 'var(--color-bg)' : 'var(--color-text-1)',
        border: `1px solid ${selected ? 'var(--color-text-1)' : 'var(--color-border-strong)'}`,
      }}
    >
      {label}
    </button>
  );
}
