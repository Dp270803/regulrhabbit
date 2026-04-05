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
    const isToday = date === today;

    let state = 'empty';
    if (isScheduled && isCompleted) state = 'completed';
    else if (isScheduled && isPast && !isToday) state = 'missed';
    else if (!isScheduled && isPast) state = 'rest';

    days.push({ date, state, isToday });
  }

  const grid = [];
  for (let w = 0; w < weeks; w++) {
    grid.push(days.slice(w * 7, (w + 1) * 7));
  }

  const scheduledTotal = days.filter(d => d.state === 'completed' || d.state === 'missed').length;
  const completedTotal = days.filter(d => d.state === 'completed').length;
  const rate = scheduledTotal > 0 ? Math.round((completedTotal / scheduledTotal) * 100) : 0;

  function getCellStyle(state, isToday) {
    const base = {
      width: '10px',
      height: '10px',
      borderRadius: '2px',
      flexShrink: 0,
      transition: 'background 0.15s',
    };

    if (state === 'completed') {
      return { ...base, background: 'rgba(74,222,128,0.75)', boxShadow: '0 0 4px rgba(74,222,128,0.3)' };
    }
    if (state === 'missed') {
      return { ...base, background: 'rgba(248,113,113,0.22)' };
    }
    if (state === 'rest') {
      return { ...base, background: 'var(--color-surface-2)' };
    }
    // empty / future
    return { ...base, background: isToday ? 'rgba(232,193,98,0.2)' : 'var(--color-border)' };
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      <p
        className="text-[10px] font-medium uppercase tracking-[0.18em] mb-4"
        style={{ color: 'var(--color-text-3)' }}
      >
        Activity — 12 Weeks
      </p>

      <div className="flex gap-[3px] overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {grid.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] shrink-0">
            {week.map((day, di) => (
              <div
                key={di}
                style={getCellStyle(day.state, day.isToday)}
                title={`${day.date}: ${day.state}`}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(74,222,128,0.75)', flexShrink: 0 }} />
          <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(248,113,113,0.22)', flexShrink: 0 }} />
          <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-surface-2)', flexShrink: 0 }} />
          <span className="text-[11px]" style={{ color: 'var(--color-text-3)' }}>Rest</span>
        </div>
        {scheduledTotal > 0 && (
          <span
            className="ml-auto text-[11px] tabular-nums"
            style={{ color: 'var(--color-text-3)' }}
          >
            {rate}% completion
          </span>
        )}
      </div>
    </div>
  );
}
