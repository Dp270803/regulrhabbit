import { getToday, daysBetween, getDayName } from './dateUtils.js';

export function updateStreak(data) {
  const today = getToday();
  const streaks = { ...data.streaks };
  const lastCheckIn = streaks.last_check_in_date;

  if (lastCheckIn === today) {
    return streaks;
  }

  if (!lastCheckIn) {
    streaks.current = 1;
    streaks.last_check_in_date = today;
    streaks.consecutive_misses = 0;
    if (streaks.current > streaks.best) {
      streaks.best = streaks.current;
    }
    return streaks;
  }

  const scheduledDays = getScheduledDaysBetween(data, lastCheckIn, today);

  if (scheduledDays.length === 0) {
    streaks.current += 1;
    streaks.last_check_in_date = today;
    streaks.consecutive_misses = 0;
  } else {
    const missedCount = scheduledDays.length;
    if (missedCount === 0) {
      streaks.current += 1;
    } else if (missedCount >= 3) {
      streaks.current = 1;
    } else {
      streaks.current += 1;
    }
    streaks.last_check_in_date = today;
    streaks.consecutive_misses = 0;
  }

  if (streaks.current > streaks.best) {
    streaks.best = streaks.current;
  }

  return streaks;
}

export function getConsecutiveMisses(data) {
  const today = getToday();
  const lastCheckIn = data.streaks.last_check_in_date;

  if (!lastCheckIn) return 0;
  if (lastCheckIn === today) return 0;

  return getScheduledDaysBetween(data, lastCheckIn, today).length;
}

function getScheduledDaysBetween(data, fromDate, toDate) {
  const activePlan = data.plans.find(p => p.status === 'active');
  if (!activePlan) return [];

  const scheduledDays = activePlan.scheduled_days;
  const missed = [];
  const days = daysBetween(fromDate, toDate);

  for (let i = 1; i < days; i++) {
    const d = new Date(fromDate + 'T12:00:00');
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = getDayName(dateStr);

    if (scheduledDays.includes(dayName)) {
      const wasCompleted = data.check_ins.some(c => c.date === dateStr && c.completed);
      if (!wasCompleted) {
        missed.push(dateStr);
      }
    }
  }

  return missed;
}

export function resetStreak(data) {
  return {
    ...data.streaks,
    current: 0,
    consecutive_misses: 0,
  };
}

export function getStreakMilestone(streakCount) {
  const milestones = [100, 60, 30, 14, 7, 3];
  return milestones.find(m => streakCount === m) || null;
}
