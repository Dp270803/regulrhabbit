import { getToday, getTimeOfDay } from './dateUtils.js';
import { getConsecutiveMisses } from './streakTracker.js';

export function detectReturnState(data) {
  const today = getToday();
  const lastCheckIn = data.streaks.last_check_in_date;

  if (!lastCheckIn) return { state: 2, missedCount: 0 };

  if (lastCheckIn === today) {
    const todayCompleted = data.check_ins.some(c => c.date === today && c.completed);
    if (todayCompleted) return { state: 1, missedCount: 0 };
    return { state: 2, missedCount: 0 };
  }

  const missedCount = getConsecutiveMisses(data);

  if (missedCount === 0) return { state: 2, missedCount: 0 };
  if (missedCount === 1) return { state: 3, missedCount: 1 };
  if (missedCount === 2) return { state: 4, missedCount: 2 };
  return { state: 5, missedCount };
}

export function getReturnMessage(messages, state, context = {}) {
  const pool = messages.return_states[String(state)];
  if (!pool) return null;

  const msgs = pool.messages;
  const randomIndex = Math.floor(Math.random() * msgs.length);
  let message = msgs[randomIndex];

  if (context.duration) {
    message = message.replace(/\{duration\}/g, context.duration);
    message = message.replace(/\[X\]/g, context.duration);
    message = message.replace(/\{reduced_duration\}/g, context.reducedDuration || context.duration);
  }
  if (context.days) {
    message = message.replace(/\{days\}/g, String(context.days));
    message = message.replace(/\[X\] days/g, `${context.days} days`);
  }

  return message;
}

export function getTimeMessage(messages) {
  const tod = getTimeOfDay();
  return messages.time_of_day[tod] || null;
}

export function getReducedSession(session, state) {
  if (state < 4) return session;

  const reduction = state >= 5 ? 0.5 : 0.6;
  const reduced = {
    ...session,
    duration_minutes: Math.round(session.duration_minutes * reduction),
    blocks: session.blocks.map(block => ({
      ...block,
      duration_minutes: block.duration_minutes
        ? Math.round(block.duration_minutes * reduction)
        : undefined,
    })),
    reduced: true,
    reduction_note: 'Reduced session — getting back is more important than going hard.',
  };

  return reduced;
}

export function getCelebrationMessage(messages, context) {
  const pool = messages.celebrations.session_complete;
  const randomIndex = Math.floor(Math.random() * pool.length);
  let msg = pool[randomIndex];

  msg = msg.replace(/\{total\}/g, String(context.totalSessions || 0));
  msg = msg.replace(/\{streak\}/g, String(context.streak || 0));

  return msg;
}
