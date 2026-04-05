import BadgeCard from './BadgeCard';

export default function BadgeGrid({ badges, onBadgeClick }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map(badge => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          onClick={badge.earned ? () => onBadgeClick?.(badge) : undefined}
        />
      ))}
    </div>
  );
}
