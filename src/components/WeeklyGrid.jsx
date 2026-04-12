import { getWeekDates, getToday } from '../utils/dateUtils';
import { useThemeColors, useTheme } from '../hooks/useTheme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function abbrev(title) {
  if (!title) return '';
  const short = title.split('—')[0].trim().split(' ').slice(0, 2).join(' ');
  return short.length > 10 ? short.slice(0, 9) + '…' : short;
}

export default function WeeklyGrid({ plan, checkIns, label }) {
  const C = useThemeColors();
  const { isDark } = useTheme();
  const today = getToday();
  const weekDates = getWeekDates(today);
  const scheduledDays = plan?.scheduled_days || [];

  const sessionByDate = {};
  if (plan?.weeks) {
    for (const week of plan.weeks) {
      for (const s of week.sessions) {
        if (s.date) sessionByDate[s.date] = s;
      }
    }
  }

  const completedCount = weekDates.filter(date =>
    checkIns?.some(c => c.date === date && c.completed)
  ).length;
  const scheduledCount = weekDates.filter((_, i) =>
    scheduledDays.includes(DAY_KEYS[i])
  ).length;
  const missedCount = weekDates.filter((date, i) => {
    const isPast = date < today;
    const isScheduled = scheduledDays.includes(DAY_KEYS[i]);
    const done = checkIns?.some(c => c.date === date && c.completed);
    return isPast && isScheduled && !done;
  }).length;
  const remainingCount = Math.max(0, scheduledCount - completedCount - missedCount);

  return (
    <div style={{
      background: C.low,
      borderRadius: '12px',
      padding: '20px 20px 16px',
      boxShadow: C.cardShadow,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint }}>
          {label || 'Training Record'}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {completedCount > 0 && <span style={{ fontSize: '0.68rem', color: C.green }}>{completedCount} done</span>}
          {missedCount > 0 && <span style={{ fontSize: '0.68rem', color: `rgba(255,180,171,0.7)` }}>{missedCount} missed</span>}
          {remainingCount > 0 && <span style={{ fontSize: '0.68rem', color: C.primary }}>{remainingCount} left</span>}
          {completedCount === 0 && missedCount === 0 && remainingCount === 0 && (
            <span style={{ fontSize: '0.68rem', color: C.faint }}>0/{scheduledCount}</span>
          )}
        </div>
      </div>

      {/* 7-day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
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
          const session = sessionByDate[date];
          const sessionName = session ? abbrev(session.title) : null;

          let cellStyle;
          let numColor;
          let labelColor;

          if (isCompleted) {
            cellStyle = {
              background: `rgba(47,248,1,0.1)`,
              border: `1px solid rgba(47,248,1,0.3)`,
              boxShadow: '0 0 8px rgba(47,248,1,0.1)',
            };
            numColor = C.green;
            labelColor = `rgba(47,248,1,0.55)`;
          } else if (isToday) {
            cellStyle = {
              background: C.container,
              border: `2px solid ${C.primary}`,
              boxShadow: `0 0 16px rgba(${C.primaryRgb},0.15)`,
            };
            numColor = C.primary;
            labelColor = C.primary;
          } else if (isMissed) {
            cellStyle = {
              background: `rgba(255,180,171,0.04)`,
              border: `1px solid rgba(255,180,171,0.18)`,
            };
            numColor = `rgba(255,180,171,0.45)`;
            labelColor = `rgba(255,180,171,0.3)`;
          } else if (isScheduled && isFuture) {
            cellStyle = {
              background: `rgba(${C.primaryRgb},0.04)`,
              border: `1px solid rgba(${C.primaryRgb},0.2)`,
            };
            numColor = C.primary;
            labelColor = `rgba(${C.primaryRgb},0.55)`;
          } else {
            cellStyle = {
              background: 'transparent',
              border: `1px solid ${C.separator}`,
            };
            numColor = C.faint;
            labelColor = C.faint;
          }

          const iconName = isCompleted ? 'check_circle'
            : isMissed ? 'cancel'
            : isToday ? 'radio_button_checked'
            : (isScheduled && isFuture) ? 'schedule'
            : null;

          return (
            <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '0.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: labelColor }}>
                {DAY_LABELS[i]}
              </span>
              <div style={{
                width: '100%', height: 'clamp(44px, 7vw, 80px)', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                ...cellStyle,
              }}>
                {iconName ? (
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 'clamp(20px, 3vw, 32px)', color: numColor, userSelect: 'none', lineHeight: 1 }}
                  >
                    {iconName}
                  </span>
                ) : (
                  <span style={{ fontFamily: 'Inter, monospace', fontSize: 'clamp(0.82rem, 1.5vw, 1.1rem)', fontWeight: 700, color: numColor, lineHeight: 1 }}>
                    {dayNum}
                  </span>
                )}
              </div>
              {sessionName && (
                <span style={{
                  fontSize: '0.52rem', color: labelColor,
                  textAlign: 'center', lineHeight: 1.2,
                  maxWidth: '100%', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%',
                }}>
                  {sessionName}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${C.separator}`, flexWrap: 'wrap' }}>
        {[
          { color: C.green, label: 'Done' },
          { color: C.primary, label: 'Planned' },
          { color: `rgba(255,180,171,0.5)`, label: 'Missed' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.58rem', color: C.faint }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
