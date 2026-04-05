import { addDays, getToday, getDayName } from '../utils/dateUtils';

export default function ContributionGrid({ plan, checkIns }) {
  const today = getToday();
  const weeks = 12;
  const totalDays = weeks * 7;
  const startDate = addDays(today, -totalDays + 1);
  const scheduledDays = plan?.scheduled_days || [];

  const days = [];
  for (let i = 0; i < totalDays; i++) {
    const date = addDays(startDate, i);
    const dayName = getDayName(date);
    const isScheduled = scheduledDays.includes(dayName);
    const isCompleted = checkIns?.some(c => c.date === date && c.completed);
    const isPast = date <= today;

    let state = 'empty';
    if (isScheduled && isCompleted) state = 'completed';
    else if (isScheduled && isPast) state = 'missed';
    else if (!isScheduled && isPast) state = 'rest';

    days.push({ date, state });
  }

  const grid = [];
  for (let w = 0; w < weeks; w++) {
    grid.push(days.slice(w * 7, (w + 1) * 7));
  }

  const colorMap = {
    completed: 'bg-[var(--color-complete)]',
    missed: 'bg-[var(--color-missed)]/30',
    rest: 'bg-[var(--color-border)]/30',
    empty: 'bg-transparent',
  };

  const scheduledTotal = days.filter(d => d.state === 'completed' || d.state === 'missed').length;
  const completedTotal = days.filter(d => d.state === 'completed').length;
  const rate = scheduledTotal > 0 ? Math.round((completedTotal / scheduledTotal) * 100) : 0;

  return (
    <div>
      <div className="flex gap-0.5 overflow-x-auto pb-2">
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map((day, di) => (
              <div
                key={di}
                className={`w-3 h-3 rounded-sm ${colorMap[day.state]}`}
                title={`${day.date}: ${day.state}`}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        {completedTotal > 0 && `You've completed ${rate}% of your scheduled sessions.`}
      </p>
    </div>
  );
}
