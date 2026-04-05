const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function getToday() {
  return new Date().toISOString().split('T')[0];
}

export function getTodayDayName() {
  return DAY_NAMES[new Date().getDay()];
}

export function getDayName(dateStr) {
  return DAY_NAMES[new Date(dateStr + 'T12:00:00').getDay()];
}

export function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function getWeekDates(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    dates.push(day.toISOString().split('T')[0]);
  }
  return dates;
}

export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'early_morning';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getWeekNumber(startDate, currentDate) {
  const days = daysBetween(startDate, currentDate);
  return Math.floor(days / 7) + 1;
}

export function isScheduledDay(dayName, scheduledDays) {
  return scheduledDays.includes(dayName);
}
