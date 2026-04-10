import { getWeekDates, getToday } from '../utils/dateUtils';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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
    <div style={{
      background: 'linear-gradient(145deg, #1a1a1a 0%, #111111 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '20px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
      padding: '22px 24px 20px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>
          This Week
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{completedCount}</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{scheduledCount} sessions</span>
        </div>
      </div>

      {/* Day columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
        {weekDates.map((date, i) => {
          const dayKey = DAY_KEYS[i];
          const isToday = date === today;
          const isScheduled = scheduledDays.includes(dayKey);
          const checkIn = checkIns?.find(c => c.date === date);
          const isCompleted = checkIn?.completed;
          const isPast = date < today;
          const isMissed = isPast && isScheduled && !isCompleted;
          const isFuture = !isPast && !isToday;
          const dayNum = new Date(date + 'T00:00:00').getDate();

          // Status-based styling
          let bg, border, numColor, labelColor, shadow;

          if (isCompleted) {
            bg = 'rgba(74,222,128,0.13)';
            border = 'rgba(74,222,128,0.4)';
            numColor = '#4ADE80';
            labelColor = 'rgba(74,222,128,0.6)';
            shadow = '0 0 10px rgba(74,222,128,0.12)';
          } else if (isToday) {
            bg = 'rgba(255,255,255,0.06)';
            border = 'rgba(255,255,255,0.55)';
            numColor = '#ffffff';
            labelColor = 'rgba(255,255,255,0.5)';
            shadow = '0 0 0 2px rgba(255,255,255,0.05)';
          } else if (isMissed) {
            bg = 'rgba(248,113,113,0.05)';
            border = 'rgba(248,113,113,0.2)';
            numColor = 'rgba(248,113,113,0.5)';
            labelColor = 'rgba(248,113,113,0.3)';
            shadow = 'none';
          } else if (isScheduled && isFuture) {
            bg = 'rgba(232,193,98,0.04)';
            border = 'rgba(232,193,98,0.25)';
            numColor = 'rgba(232,193,98,0.6)';
            labelColor = 'rgba(232,193,98,0.4)';
            shadow = 'none';
          } else {
            bg = 'transparent';
            border = 'rgba(255,255,255,0.06)';
            numColor = 'rgba(255,255,255,0.18)';
            labelColor = 'rgba(255,255,255,0.15)';
            shadow = 'none';
          }

          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {/* Day label */}
              <span style={{ fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: labelColor }}>
                {DAY_LABELS[i]}
              </span>

              {/* Cell — FIXED height, never scales with container width */}
              <div style={{
                width: '100%',
                height: '42px',
                borderRadius: '10px',
                background: bg,
                border: `1px solid ${border}`,
                boxShadow: shadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
                <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', fontWeight: 700, color: numColor, lineHeight: 1 }}>
                  {isCompleted ? '✓' : dayNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {[
          { color: '#4ADE80', label: 'Done' },
          { color: 'rgba(232,193,98,0.7)', label: 'Planned' },
          { color: 'rgba(248,113,113,0.5)', label: 'Missed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
