import { getWeekDates, getDayName, getToday } from '../utils/dateUtils';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function WeeklyGrid({ plan, checkIns }) {
  const today = getToday();
  const weekDates = getWeekDates(today);
  const scheduledDays = plan?.scheduled_days || [];

  const completedCount = weekDates.filter(date =>
    checkIns?.some(c => c.date === date && c.completed)
  ).length;

  const scheduledCount = weekDates.filter((_, i) =>
    scheduledDays.includes(DAY_KEYS[i])
  ).length;

  return (
    <div
      className="animate-fade-in"
      style={{
        background: 'linear-gradient(145deg, #1c1c1c 0%, #121212 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
        padding: '24px',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <p
          className="text-[10px] font-medium tracking-[0.18em] uppercase"
          style={{ color: 'var(--color-text-3)' }}
        >
          This Week
        </p>
        <p
          className="font-mono text-[10px]"
          style={{ color: 'var(--color-text-3)' }}
        >
          {completedCount}
          <span style={{ color: 'var(--color-border-strong)' }}>/</span>
          {scheduledCount}
        </p>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekDates.map((date, i) => {
          const dayKey = DAY_KEYS[i];
          const isToday = date === today;
          const isScheduled = scheduledDays.includes(dayKey);
          const checkIn = checkIns?.find(c => c.date === date);
          const isCompleted = checkIn?.completed;
          const isPast = date < today;
          const isMissed = isPast && isScheduled && !isCompleted;
          const dayNum = new Date(date + 'T00:00:00').getDate();

          // Derive cell styles
          let bg = 'transparent';
          let border = 'var(--color-border)';
          let textColor = 'var(--color-text-3)';
          let labelColor = 'var(--color-text-3)';

          if (isCompleted) {
            bg = 'rgba(74,222,128,0.12)';
            border = 'rgba(74,222,128,0.35)';
            textColor = 'var(--color-green)';
          } else if (isMissed) {
            bg = 'rgba(248,113,113,0.08)';
            border = 'rgba(248,113,113,0.28)';
            textColor = 'var(--color-red)';
          } else if (isToday) {
            border = 'var(--color-text-1)';
            textColor = 'var(--color-text-1)';
            labelColor = 'var(--color-text-2)';
          } else if (isScheduled && !isPast) {
            border = 'var(--color-border-strong)';
            textColor = 'var(--color-text-2)';
            labelColor = 'var(--color-text-2)';
          }

          return (
            <div key={date} className="flex flex-col items-center gap-1.5">
              {/* Day letter */}
              <span
                className="text-[9px] font-medium uppercase"
                style={{ color: labelColor }}
              >
                {DAY_LABELS[i]}
              </span>

              {/* Cell */}
              <div
                className="w-full aspect-square rounded-lg flex items-center justify-center transition-all duration-300"
                style={{
                  background: bg,
                  border: `1px solid ${border}`,
                  boxShadow:
                    isToday
                      ? '0 0 0 2px rgba(255,255,255,0.06)'
                      : isCompleted
                      ? '0 0 12px rgba(74,222,128,0.1)'
                      : 'none',
                }}
              >
                <span
                  className="font-mono text-[9px] font-semibold leading-none"
                  style={{ color: textColor }}
                >
                  {isCompleted ? '✓' : dayNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
