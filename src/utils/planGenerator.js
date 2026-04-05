import { addDays, getDayName } from './dateUtils.js';

const templateModules = {
  gym: () => import('../data/templates/gym.json'),
  swimming: () => import('../data/templates/swimming.json'),
  running: () => import('../data/templates/running.json'),
  yoga: () => import('../data/templates/yoga.json'),
  dance: () => import('../data/templates/dance.json'),
  singing: () => import('../data/templates/singing.json'),
  instrument: () => import('../data/templates/instrument.json'),
};

export async function generatePlan(answers) {
  const {
    activity,
    experience_level,
    frequency,
    session_duration,
    scheduled_days,
    persona,
    preferred_time,
    subcategory,
    equipment,
  } = answers;

  const loader = templateModules[activity];
  if (!loader) throw new Error(`Unknown activity: ${activity}`);

  const mod = await loader();
  const templateData = mod.default || mod;

  const freqKey = frequency >= 5 ? '4x' : `${Math.min(frequency, 4)}x`;
  const template = templateData.templates[freqKey];
  if (!template) throw new Error(`No template for frequency: ${freqKey}`);

  const modifiers = templateData.experience_modifiers?.[experience_level] || {
    sets_multiplier: 1.0,
    duration_multiplier: 1.0,
  };

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;
  const startDate = addDays(today.toISOString().split('T')[0], dayOfWeek === 1 ? 0 : daysUntilNextMonday);

  const sortedDays = sortScheduledDays(scheduled_days);
  const planWeeks = buildWeeks(template, sortedDays, startDate, modifiers, session_duration, persona);

  const planId = `plan_${Date.now()}`;

  return {
    id: planId,
    activity,
    subcategory: subcategory || equipment || null,
    experience_level,
    frequency: Math.min(frequency, sortedDays.length),
    session_duration,
    scheduled_days: sortedDays,
    template_id: `${activity}_${experience_level}_${freqKey}`,
    start_date: startDate,
    current_week: 1,
    status: 'active',
    persona,
    preferred_time,
    weeks: planWeeks,
  };
}

function sortScheduledDays(days) {
  const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return [...days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function buildWeeks(template, scheduledDays, startDate, modifiers, targetDuration, persona) {
  const weeks = [];

  for (const weekData of template.weeks) {
    const weekNum = weekData.week_number;
    const weekStartDate = addDays(startDate, (weekNum - 1) * 7);
    const sessions = [];

    for (let dayIdx = 0; dayIdx < scheduledDays.length; dayIdx++) {
      const dayName = scheduledDays[dayIdx];
      const dayOffset = getDayOffset(dayName);
      const sessionDate = addDays(weekStartDate, dayOffset);

      const templateSession = weekData.sessions[dayIdx % weekData.sessions.length];
      if (!templateSession) continue;

      const adjustedDuration = Math.round(
        (templateSession.duration_minutes || targetDuration) * modifiers.duration_multiplier
      );

      let session = {
        id: `session_w${weekNum}_${dayName.slice(0, 3)}`,
        day: dayName,
        date: sessionDate,
        title: templateSession.title,
        duration_minutes: adjustedDuration,
        type: 'scheduled',
        blocks: templateSession.blocks.map(block => ({
          ...block,
          duration_minutes: block.duration_minutes
            ? Math.round(block.duration_minutes * modifiers.duration_multiplier)
            : undefined,
        })),
        status: 'upcoming',
        completed_at: null,
      };

      if (persona === 'restarter' && weekNum === 1) {
        session.duration_minutes = Math.round(session.duration_minutes * 0.7);
        session.blocks = session.blocks.map(b => ({
          ...b,
          duration_minutes: b.duration_minutes ? Math.round(b.duration_minutes * 0.7) : undefined,
        }));
        session.restarter_note = "This is designed so you can't fail.";
      }

      sessions.push(session);
    }

    if (persona === 'restarter' && weekNum === 1 && sessions.length > 2) {
      const last = sessions[sessions.length - 1];
      last.type = 'optional';
      last.title = `${last.title} (Optional)`;
    }

    weeks.push({
      week_number: weekNum,
      sessions,
    });
  }

  return weeks;
}

function getDayOffset(dayName) {
  const offsets = {
    monday: 0,
    tuesday: 1,
    wednesday: 2,
    thursday: 3,
    friday: 4,
    saturday: 5,
    sunday: 6,
  };
  return offsets[dayName] || 0;
}

export function getTodaySession(plan) {
  if (!plan) return null;

  const today = new Date().toISOString().split('T')[0];
  const todayDay = getDayName(today);

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.date === today || session.day === todayDay) {
        if (session.date <= today && session.status !== 'completed') {
          return { session, weekNumber: week.week_number };
        }
        if (session.date === today) {
          return { session, weekNumber: week.week_number };
        }
      }
    }
  }

  return null;
}

export function isRestDay(plan) {
  if (!plan) return false;
  const todayDay = getDayName(new Date().toISOString().split('T')[0]);
  return !plan.scheduled_days.includes(todayDay);
}
