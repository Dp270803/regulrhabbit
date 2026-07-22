export default function ProgressBar({ step, total = 5 }) {
  const pct = ((step / total) * 100) + '%';
  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-surface-cream z-50">
      <div
        className="h-full bg-clay-accent transition-all duration-700 ease-out"
        style={{ width: pct }}
      />
    </div>
  );
}
