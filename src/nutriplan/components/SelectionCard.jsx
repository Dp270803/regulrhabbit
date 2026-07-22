export default function SelectionCard({ title, description, icon, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border bg-white rounded-lg transition-all duration-200 active:scale-[0.98] ${
        selected
          ? 'border-primary shadow-md ring-2 ring-primary/10'
          : 'border-ink-muted/20 hover:border-primary/40'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary mb-1">{title}</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
        </div>
        {icon && (
          <span
            className={`material-symbols-outlined ${selected ? 'text-primary' : 'text-primary-fixed-dim'}`}
            style={{ fontVariationSettings: selected ? "'FILL' 1" : "'FILL' 0" }}
          >
            {icon}
          </span>
        )}
      </div>
    </button>
  );
}
