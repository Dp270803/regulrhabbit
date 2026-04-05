import BadgeCard from './BadgeCard';

export default function BadgeGrid({ badges, onBadgeClick }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {badges.map(badge => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          onClick={() => onBadgeClick?.(badge)}
        />
      ))}
    </div>
  );
}
