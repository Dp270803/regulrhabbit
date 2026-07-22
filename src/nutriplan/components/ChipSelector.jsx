export default function ChipSelector({ options, selected, onSelect, multi = false }) {
  const isSelected = (val) => multi ? (selected || []).includes(val) : selected === val;

  const handleClick = (val) => {
    if (!multi) {
      onSelect(val);
      return;
    }
    if (val === 'none') {
      onSelect(['none']);
      return;
    }
    const current = (selected || []).filter(v => v !== 'none');
    if (current.includes(val)) {
      onSelect(current.filter(v => v !== val));
    } else {
      onSelect([...current, val]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleClick(opt.value)}
          className={`px-5 py-2.5 rounded-full font-label-md text-label-md transition-all duration-200 active:scale-95 ${
            isSelected(opt.value)
              ? 'bg-primary-container text-on-primary-container border-2 border-primary-container'
              : 'bg-surface-cream text-on-surface-variant border-2 border-outline-variant/30 hover:border-primary/40'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
