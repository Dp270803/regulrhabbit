import { getWeekDates, getDayName, getToday } from '../utils/dateUtils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyGrid({ plan, checkIns }) {
  const today = getToday();
  const weekDates = getWeekDates(today);
  const scheduledDays = plan?.scheduled_days || [];

  const getCellState = (date, dayName) => {
    const isToday = date === today;
    const isScheduled = scheduledDays.includes(dayName);
    const isCompleted = checkIns?.some(c => c.date === date && c.completed);
    const isPast = date < today;

    if (isCompleted) return 'completed';
    if (isScheduled && isPast) return 'missed';
    if (isScheduled && isToday) return 'today';
    if (isScheduled) return 'upcoming';
    return 'rest';
  };

  const cellStyles = {
    completed: 'bg-[var(--color-complete)] border-[var(--color-complete)]',
    missed: 'border-[var(--color-missed)] border-2 bg-transparent',
    today: 'border-[var(--color-text-primary)] border-2 bg-transparent',
    upcoming: 'border-[var(--color-border)] border bg-transparent',
    rest: 'bg-[var(--color-border)]/30 border-transparent',
  };

  const completedCount = weekDates.filter((date) => {
    return checkIns?.some(c => c.date === date && c.completed);
  }).length;

  const scheduledCount = weekDates.filter((date) => {
    const dayName = getDayName(date);
    return scheduledDays.includes(dayName);
  }).length;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, i) => (
          <div key={label} className="text-center">
            <p className="text-[10px] text-[var(--color-text-muted)] mb-2">{label}</p>
            <div
              className={`w-8 h-8 mx-auto rounded-lg border ${cellStyles[getCellState(weekDates[i], getDayName(weekDates[i]))]}`}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mt-3 text-center">
        This week: {completedCount}/{scheduledCount} sessions done
      </p>
    </div>
  );
}
